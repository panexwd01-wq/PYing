import {
  ALL_LISTS,
  ALL_MODULES,
  DB_SHEET,
  EXPORT_MODULE,
  IMPORT_MODULE,
  LIST_SEED,
  MODULE_BY_ID,
  MODULES,
  ModuleDef,
  recordHeaders,
} from "./schema";
import { checkEnd, EndCtx } from "./endRules";
import { JobRecord, Lists, Snapshot } from "./types";
import {
  appendRows,
  batchGetRanges,
  batchWriteRanges,
  clearRange,
  ensureSheet,
  readRange,
  writeRange,
} from "./sheets";

// แปลงเลขคอลัมน์ (1-indexed) -> ตัวอักษร A1
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function lastCol(m: ModuleDef): string {
  return colLetter(recordHeaders(m).length);
}

// ===== _lists : เก็บ list แบบบล็อก (เว้น 1 คอลัมน์คั่นแต่ละ list) =====

export async function readLists(): Promise<Lists> {
  await ensureSheet(DB_SHEET);
  const rows = await readRange(`${DB_SHEET}!A1:CZ`);
  const out: Lists = {};
  if (!rows.length) return out;
  const header = rows[0] || [];
  for (let c = 0; c < header.length; c++) {
    const key = (header[c] || "").trim();
    if (!key) continue; // คอลัมน์ว่าง = ตัวคั่นบล็อก
    const values: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const v = (rows[r]?.[c] || "").trim();
      if (v) values.push(v);
    }
    out[key] = values;
  }
  for (const k of ALL_LISTS) if (!(k in out)) out[k] = [];
  return out;
}

export async function writeLists(lists: Lists): Promise<void> {
  await ensureSheet(DB_SHEET);
  const keys = ALL_LISTS;
  const cols: string[][] = [];
  keys.forEach((k, i) => {
    cols.push([k, ...(lists[k] || [])]);
    if (i < keys.length - 1) cols.push([]); // คอลัมน์คั่น
  });
  const height = Math.max(1, ...cols.map((c) => c.length));
  const matrix: string[][] = [];
  for (let r = 0; r < height; r++) {
    matrix.push(cols.map((c) => c[r] ?? ""));
  }
  await clearRange(`${DB_SHEET}!A1:CZ`);
  await writeRange(`${DB_SHEET}!A1`, matrix);
}

export async function seedListsIfEmpty(): Promise<void> {
  const current = await readLists();
  const hasAny = Object.values(current).some((v) => v.length > 0);
  if (hasAny) return;
  await writeLists(LIST_SEED);
}

// ===== _settings : เก็บค่าตั้งค่าส่วนกลาง (JSON) เช่น คอลัมน์ตอนย่อของแต่ละโมดูล =====
const SETTINGS_SHEET = "_settings";
export type CollapseConfig = Record<string, string[]>; // moduleKey → รายชื่อ field key ที่โชว์ตอนย่อ

// อ่านแบบกันพัง: ถ้าชีท/ค่าไม่มี คืน {} (ไม่ให้ snapshot ล้ม)
export async function readCollapseConfig(): Promise<CollapseConfig> {
  try {
    const rows = await readRange(`${SETTINGS_SHEET}!A1`);
    const raw = rows?.[0]?.[0];
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export async function writeCollapseConfig(cfg: CollapseConfig): Promise<void> {
  await ensureSheet(SETTINGS_SHEET);
  await writeRange(`${SETTINGS_SHEET}!A1`, [[JSON.stringify(cfg)]]);
}

// ===== record helpers =====

function rowToRecord(headers: string[], row: string[]): JobRecord {
  const rec: Record<string, string> = {};
  headers.forEach((h, i) => (rec[h] = row[i] ?? ""));
  return rec as JobRecord;
}

function recordToRow(m: ModuleDef, rec: Partial<JobRecord>): string[] {
  return recordHeaders(m).map((h) => (rec[h] ?? "").toString());
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

const numOf = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

// push ค่าเข้า Map<string, T[]> (สร้าง array ถ้ายังไม่มี)
function pushMap<T>(map: Map<string, T[]>, k: string, v: T): void {
  const arr = map.get(k);
  if (arr) arr.push(v);
  else map.set(k, [v]);
}

// กติกาอัตโนมัติ: ลงวันที่เมื่อ Status = End + ช่องคำนวณของ Extra
const hasField = (m: ModuleDef, key: string) => m.fields.some((f) => f.key === key);

function applyAutoRules(m: ModuleDef, rec: Partial<JobRecord>): Partial<JobRecord> {
  const next = { ...rec };
  const statusKey = m.fields[0]?.key;
  const isEnd = (next[statusKey] || "") === "End";
  const dateField = m.fields.find((f) => f.key.endsWith("status_date"));
  if (statusKey && dateField) {
    if (isEnd) {
      if (!next[dateField.key]) next[dateField.key] = nowStamp();
    } else {
      next[dateField.key] = "";
    }
  }
  // ช่องระบบ: ended_at (วันปิดงาน) ตาม Status = End
  if (hasField(m, "ended_at")) {
    if (isEnd) {
      if (!next.ended_at) next.ended_at = nowStamp();
    } else {
      next.ended_at = "";
    }
  }
  // ตารางเรท: updated_at อัปเดตทุกครั้งที่บันทึก
  if (m.rate && hasField(m, "updated_at")) next.updated_at = nowStamp();

  if (m.id === "09_Extra_Service") {
    const count = numOf(next.count);
    next.cost_total = String(numOf(next.cost_unit) * count);
    next.margin_total = String((numOf(next.sell_unit) - numOf(next.cost_unit)) * count);
    // Ready Acc? = Done เมื่อ Cost/Sell Sts ครบ (auto)
    const done = (v: unknown) => ["Complete", "Completed"].includes(String(v ?? "").trim());
    next.ready_acc = done(next.cost_sts) && done(next.sell_sts) ? "Done" : "Pending";
  }
  return next;
}

// ===== cross-module pull (ดึงหัว Job จาก CS Import/Export ด้วย Job No.) =====

interface SourceIndex {
  imp: Map<string, JobRecord>;
  exp: Map<string, JobRecord>;
}

// อ่าน CS Import/Export สดทุกครั้ง (ไม่ cache ข้ามคำขอ กันค่าที่ pull มาค้าง)
async function getSourceIndex(): Promise<SourceIndex> {
  const [impRows, expRows] = await Promise.all([
    rawList(IMPORT_MODULE),
    rawList(EXPORT_MODULE),
  ]);
  const imp = new Map<string, JobRecord>();
  const exp = new Map<string, JobRecord>();
  for (const r of impRows) {
    const k = (r.imp_job_no || "").trim();
    if (k) imp.set(k, r);
  }
  for (const r of expRows) {
    const k = (r.exp_job_no || "").trim();
    if (k) exp.set(k, r);
  }
  return { imp, exp };
}

const moduleHasPull = (m: ModuleDef) => m.fields.some((f) => f.pull);
const moduleHasRPull = (m: ModuleDef) => m.fields.some((f) => f.rpull);

function applyPull(m: ModuleDef, rec: JobRecord, idx: SourceIndex): JobRecord {
  const jn = (rec.job_no || "").trim();
  if (!jn) return rec;
  let side: "imp" | "exp" | null = null;
  let src: JobRecord | undefined;
  if (idx.imp.has(jn)) {
    side = "imp";
    src = idx.imp.get(jn);
  } else if (idx.exp.has(jn)) {
    side = "exp";
    src = idx.exp.get(jn);
  }
  if (!side || !src) return rec;
  const next = { ...rec };
  for (const f of m.fields) {
    if (!f.pull) continue;
    const srcKey = f.pull[side];
    if (!srcKey) continue;
    next[f.key] = (src[srcKey] ?? "").toString();
  }
  return next;
}

// ===== reverse pull (CS Import/Export ดึงค่าจากโมดูลปลายทางด้วย Job No.) =====
type DownIndex = Record<string, Map<string, JobRecord>>;

async function getDownstreamIndex(m: ModuleDef): Promise<DownIndex> {
  const ids = Array.from(new Set(m.fields.filter((f) => f.rpull).map((f) => f.rpull!.from)));
  const out: DownIndex = {};
  await Promise.all(
    ids.map(async (id) => {
      const rows = await rawList(MODULE_BY_ID[id]);
      const map = new Map<string, JobRecord>();
      for (const r of rows) {
        const j = (r.job_no || "").trim();
        if (j) map.set(j, r);
      }
      out[id] = map;
    })
  );
  return out;
}

function applyRPull(m: ModuleDef, rec: JobRecord, dIdx: DownIndex): JobRecord {
  const jn = (rec[m.jobNoKey] || "").trim();
  if (!jn) return rec;
  const next = { ...rec };
  for (const f of m.fields) {
    if (!f.rpull) continue;
    const src = dIdx[f.rpull.from]?.get(jn);
    if (!src) continue;
    next[f.key] = (src[f.rpull.field] ?? "").toString();
  }
  return next;
}

// สร้างฟังก์ชันเติมค่า (pull เดินหน้า/ย้อนกลับ) โดยอ่าน index รอบเดียว
type Enricher = (rec: JobRecord) => JobRecord;
async function makeEnricher(m: ModuleDef): Promise<Enricher> {
  if (moduleHasPull(m)) {
    const idx = await getSourceIndex();
    return (r) => applyPull(m, r, idx);
  }
  if (moduleHasRPull(m)) {
    const d = await getDownstreamIndex(m);
    return (r) => applyRPull(m, r, d);
  }
  return (r) => r;
}

// บังคับกติกา End Lock: ถ้าจะตั้ง Status = End ต้องผ่านเงื่อนไขครบ
function enforceEnd(m: ModuleDef, rec: JobRecord, ctx?: EndCtx): void {
  const statusKey = m.fields[0]?.key;
  if (!statusKey || rec[statusKey] !== "End") return;
  const reasons = checkEnd(m, rec, ctx);
  if (reasons.length) {
    const jn = rec[m.jobNoKey] || rec.__id || "";
    throw new Error(`End ไม่ได้ (${jn}): ${reasons.join(" · ")}`);
  }
}

// สร้าง EndCtx (ข้อมูลข้ามโมดูล) เฉพาะตอน CS Import/Export จะตั้ง Status = End
async function buildEndCtx(m: ModuleDef, recs: Partial<JobRecord>[]): Promise<EndCtx | undefined> {
  if (m.id !== "04_CS_Import" && m.id !== "05_CS_Export") return undefined;
  const statusKey = m.fields[0].key;
  if (!recs.some((r) => r[statusKey] === "End")) return undefined;
  const [expRows, shipRows, transRows, whRows, accRows] = await Promise.all([
    rawList(EXPORT_MODULE),
    rawList(MODULE_BY_ID["06_Shipping"]),
    rawList(MODULE_BY_ID["07_Transportation"]),
    rawList(MODULE_BY_ID["08_Warehouse"]),
    rawList(MODULE_BY_ID[ACC_ID]),
  ]);
  const endMap = (rows: JobRecord[], sk: string) => {
    const map = new Map<string, boolean>();
    for (const r of rows) {
      const j = (r.job_no || "").trim();
      if (j) map.set(j, r[sk] === "End");
    }
    return map;
  };
  return {
    hasAcc: new Set(accRows.map((r) => (r.job_no || "").trim()).filter(Boolean)),
    hasExport: new Set(expRows.map((r) => (r.exp_job_no || "").trim()).filter(Boolean)),
    shipEnd: endMap(shipRows, "shipp_status"),
    transEnd: endMap(transRows, "trans_status"),
    whEnd: endMap(whRows, "wha_status"),
  };
}

// ===== record CRUD =====

export async function ensureDataSheet(m: ModuleDef): Promise<void> {
  await ensureSheet(m.id);
  const headers = recordHeaders(m);
  const rows = await readRange(`${m.id}!A1:${lastCol(m)}1`);
  const header = rows[0] || [];
  if (header.join("|") !== headers.join("|")) {
    await writeRange(`${m.id}!A1`, [headers]);
  }
}

// อ่านดิบ (ไม่ pull) — ใช้ภายในสร้าง source index
async function rawList(m: ModuleDef): Promise<JobRecord[]> {
  await ensureSheet(m.id);
  const rows = await readRange(`${m.id}!A1:${lastCol(m)}`);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter((r) => (r[0] || "").trim() !== "")
    .map((r) => rowToRecord(headers, r));
}

// อ่านดิบ (ไม่ enrich) — ใช้ในหน้า Dashboard/View ที่ต้องการแค่ค่าที่บันทึกไว้
export async function listJobsRaw(m: ModuleDef): Promise<JobRecord[]> {
  return rawList(m);
}

// อ่าน + เติมค่า pull/reverse-pull (สำหรับแสดงผลในตาราง)
export async function listJobs(m: ModuleDef): Promise<JobRecord[]> {
  const rows = await rawList(m);
  const enrich = await makeEnricher(m);
  return rows.map(enrich);
}

// ===== snapshot: อ่านทุกโมดูล + lists ใน request เดียว แล้ว enrich ในหน่วยความจำ =====
function parseModuleRows(m: ModuleDef, values: string[][]): JobRecord[] {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values
    .slice(1)
    .filter((r) => (r[0] || "").trim() !== "")
    .map((r) => rowToRecord(headers, r));
}

function parseListRows(values: string[][]): Lists {
  const out: Lists = {};
  const header = values?.[0] || [];
  for (let c = 0; c < header.length; c++) {
    const key = (header[c] || "").trim();
    if (!key) continue;
    const vals: string[] = [];
    for (let r = 1; r < values.length; r++) {
      const v = (values[r]?.[c] || "").trim();
      if (v) vals.push(v);
    }
    out[key] = vals;
  }
  for (const k of ALL_LISTS) if (!(k in out)) out[k] = [];
  return out;
}

export async function getSnapshot(): Promise<Snapshot> {
  const dataRanges = ALL_MODULES.map((m) => `${m.id}!A1:${lastCol(m)}`);
  const all = await batchGetRanges([...dataRanges, `${DB_SHEET}!A1:CZ`]);
  const lists = parseListRows(all[ALL_MODULES.length]);

  const rawById: Record<string, JobRecord[]> = {};
  ALL_MODULES.forEach((m, i) => (rawById[m.id] = parseModuleRows(m, all[i])));

  // สร้าง index ต้นทาง (CS) + ปลายทาง (downstream) จากข้อมูลในหน่วยความจำ (ไม่อ่านซ้ำ)
  const srcIdx: SourceIndex = { imp: new Map(), exp: new Map() };
  for (const r of rawById["04_CS_Import"] || []) {
    const k = (r.imp_job_no || "").trim();
    if (k) srcIdx.imp.set(k, r);
  }
  for (const r of rawById["05_CS_Export"] || []) {
    const k = (r.exp_job_no || "").trim();
    if (k) srcIdx.exp.set(k, r);
  }
  const downIdx: DownIndex = {};
  for (const id of ["06_Shipping", "07_Transportation", "08_Warehouse"]) {
    const map = new Map<string, JobRecord>();
    for (const r of rawById[id] || []) {
      const k = (r.job_no || "").trim();
      if (k) map.set(k, r);
    }
    downIdx[id] = map;
  }

  const modules: Record<string, JobRecord[]> = {};
  for (const m of ALL_MODULES) {
    let rows = rawById[m.id] || [];
    if (moduleHasPull(m)) rows = rows.map((r) => applyPull(m, r, srcIdx));
    else if (moduleHasRPull(m)) rows = rows.map((r) => applyRPull(m, r, downIdx));
    // Export: ช่อง Data from Import อัปเดตสด (live) จาก Import ที่อ้างถึง
    // exp_job_no ว่าง — ใช้ Job No. ที่ฝังใน readout เดิมเป็นตัว lookup
    if (m.id === "05_CS_Export") {
      rows = rows.map((r) => {
        if ((r.re_export || "") !== "Yes") return r;
        const jn = impJobNoFromReadout(r.data_from_import || "");
        const imp = jn ? srcIdx.imp.get(jn) : undefined;
        return imp ? { ...r, data_from_import: composeDataFromImport(imp) } : r;
      });
    }
    modules[m.key] = rows;
  }
  const collapse = await readCollapseConfig();
  return { modules, lists, collapse };
}

function genId(salt = 0): string {
  const d = new Date();
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  return `J${d.getTime().toString(36)}${rand}${salt ? salt.toString(36) : ""}`;
}

export async function createJob(
  m: ModuleDef,
  rec: Partial<JobRecord>
): Promise<JobRecord> {
  const [saved] = await createJobs(m, [rec]);
  return saved;
}

// สร้างหลายระเบียนในครั้งเดียว (append รอบเดียว, ไม่อ่าน sheet)
// enrich=true เฉพาะตอน sync ที่ต้องการเติมหัว Job ลงชีทจริง (ยอมอ่านเพิ่ม)
export async function createJobs(
  m: ModuleDef,
  recs: Partial<JobRecord>[],
  enrich = false,
  reconcile = true
): Promise<JobRecord[]> {
  if (!recs.length) return [];
  const en: (r: JobRecord) => JobRecord = enrich ? await makeEnricher(m) : (r) => r;
  const endCtx = await buildEndCtx(m, recs);
  const stamp = nowStamp();
  const setCreated = hasField(m, "created_at");
  const out: JobRecord[] = [];
  const values: string[][] = [];
  recs.forEach((rec, i) => {
    const withId = en({ ...rec, __id: rec.__id || genId(i + 1) } as JobRecord);
    if (setCreated && !withId.created_at) withId.created_at = stamp; // วันเปิดงาน (ครั้งเดียว)
    const final = applyAutoRules(m, withId) as JobRecord;
    enforceEnd(m, final, endCtx);
    out.push(final);
    values.push(recordToRow(m, final));
  });
  await appendRows(`${m.id}!A1`, values);
  if (reconcile) await reconcileLinks(m, out);
  return out;
}

async function findRowNumber(m: ModuleDef, id: string): Promise<number | null> {
  const rows = await readRange(`${m.id}!A1:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] || "") === id) return i + 1;
  }
  return null;
}

export async function updateJob(
  m: ModuleDef,
  rec: Partial<JobRecord>
): Promise<JobRecord> {
  const [saved] = await updateJobs(m, [rec]);
  return saved;
}

// อัปเดตหลายระเบียนในครั้งเดียว (อ่านชีทรอบเดียว + เขียน batch + merge กันเขียนทับ)
export async function updateJobs(
  m: ModuleDef,
  recs: Partial<JobRecord>[],
  reconcile = true
): Promise<JobRecord[]> {
  if (!recs.length) return [];
  const rows = await readRange(`${m.id}!A1:${lastCol(m)}`);
  const headers = rows[0] || recordHeaders(m);
  const rowNumById = new Map<string, number>();
  const existingById = new Map<string, JobRecord>();
  for (let i = 1; i < rows.length; i++) {
    const id = (rows[i]?.[0] || "").trim();
    if (!id) continue;
    rowNumById.set(id, i + 1);
    existingById.set(id, rowToRecord(headers, rows[i]));
  }

  // ไม่ enrich ตอนบันทึก (ประหยัดโควต้าอ่าน) — ค่าที่ pull ไว้เดิมถูกเก็บไว้ครบใน existing
  const merged0 = recs.map((rec) => ({ ...existingById.get(rec.__id || ""), ...rec }));
  const endCtx = await buildEndCtx(m, merged0);
  const data: { range: string; values: string[][] }[] = [];
  const out: JobRecord[] = [];
  for (const rec of recs) {
    if (!rec.__id) throw new Error("ไม่มี __id สำหรับอัปเดต");
    const rowNum = rowNumById.get(rec.__id);
    if (!rowNum) throw new Error(`ไม่พบระเบียนที่ต้องการแก้ไข (${rec.__id})`);
    const merged = { ...existingById.get(rec.__id), ...rec } as JobRecord;
    const withRules = applyAutoRules(m, merged) as JobRecord;
    enforceEnd(m, withRules, endCtx);
    data.push({
      range: `${m.id}!A${rowNum}:${lastCol(m)}${rowNum}`,
      values: [recordToRow(m, withRules)],
    });
    out.push(withRules);
  }
  await batchWriteRanges(data);
  if (reconcile) await reconcileLinks(m, out);
  return out;
}

// cascade=true → ลบ record ปลายทางที่ผูกกันด้วย (ปิดตอน reconcile เรียกเองเพื่อกัน loop)
export async function deleteJob(
  m: ModuleDef,
  id: string,
  cascade = true
): Promise<void> {
  const rec = cascade
    ? (await rawList(m)).find((r) => r.__id === id)
    : undefined;
  const rowNum = await findRowNumber(m, id);
  if (rowNum) await clearRange(`${m.id}!A${rowNum}:${lastCol(m)}${rowNum}`);
  if (rec) await cascadeDelete(m, rec);
}

// Refresh: ดึงข้อมูลจาก CS ใหม่แล้วบันทึกลงชีทของโมดูล
export async function refreshModule(m: ModuleDef): Promise<number> {
  if (!moduleHasPull(m) && !moduleHasRPull(m)) return 0;
  const rows = await rawList(m);
  if (!rows.length) return 0;
  await updateJobs(m, rows);
  return rows.length;
}

// ===== Auto-link / Sync (Workflow Rules) =====

const splitTypes = (v: string) =>
  (v || "").split(" | ").map((s) => s.trim()).filter(Boolean);

// ===== Auto-link: CS Import/Export ↔ Shipping/Transport/Warehouse/Extra =====
// flag บน CS → โมดูลปลายทางที่ผูกแบบ 1 record/Job No.
const CS_FLAG_LINKS: { flag: string; id: string }[] = [
  { flag: "shipping_flag", id: "06_Shipping" },
  { flag: "transport_flag", id: "07_Transportation" },
  { flag: "warehouse_flag", id: "08_Warehouse" },
];

// โมดูลต้นทาง → ป้าย "Module" ที่ใช้ในแถว Extra (09) / Accounting (10)
const EXTRA_MODULE_LABEL: Record<string, string> = {
  "04_CS_Import": "FREIGHT IMPORT",
  "05_CS_Export": "FREIGHT EXPORT",
  "06_Shipping": "SHIPPING",
  "07_Transportation": "TRANSPORT",
  "08_Warehouse": "WAREHOUSE",
};

const MID_MODULE_IDS = ["06_Shipping", "07_Transportation", "08_Warehouse"];
const EXTRA_ID = "09_Extra_Service";
const ACC_ID = "10_Accounting";

// Supplier + Cost PIC ของแถว Extra ตามโมดูลต้นทาง (เติมตอนสร้าง)
function extraMetaFromSource(m: ModuleDef, rec: JobRecord): { supplier: string; cost_pic: string } {
  switch (m.id) {
    case "04_CS_Import": return { supplier: "", cost_pic: rec.im_cs || "" };
    case "05_CS_Export": return { supplier: "", cost_pic: rec.ex_cs || "" };
    case "06_Shipping": return { supplier: rec.ship_outsourcing || "", cost_pic: rec.ship_pic || "" };
    case "07_Transportation":
      return { supplier: [rec.supp1, rec.supp2, rec.supp3].filter(Boolean).join(", "), cost_pic: rec.trans_pic || "" };
    case "08_Warehouse": return { supplier: rec.wh_supp1 || "", cost_pic: rec.wh_pic || "" };
    default: return { supplier: "", cost_pic: "" };
  }
}

// สรุปข้อมูลจาก CS Import สำหรับช่อง "Data from Import" ใน Export (read-only)
// แสดงตามรายการที่กำหนด: Job Type / IM/CS / Job No. / Customer Ref / Co-Agent / ETA(IMP) /
// Booking-MBL / HBL / จำนวนตู้ / Vessel / Term / CS Remark
export function composeDataFromImport(r: Partial<JobRecord>): string {
  const g = (k: string) => (r[k] ?? "").toString().trim();
  const conts = [
    ["4W", g("cnt_4w")], ["6W", g("cnt_6w")], ["10W", g("cnt_10w")],
    ["20GP", g("cnt_20gp")], ["40HQ", g("cnt_40hq")],
  ].filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" / ");
  const lines: [string, string][] = [
    ["Job Type", g("job_type")],
    ["IM/CS", g("im_cs")],
    ["Job No.", g("imp_job_no")],
    ["Customer Ref", g("imp_customer_ref")],
    ["Co-Agent / Carrier", g("co_agent_carrier")],
    ["ETA (IMP)", g("eta_imp")],
    ["Booking / MBL No.", g("imp_booking_mbl")],
    ["HBL No.", g("imp_hbl")],
    ["จำนวนตู้", conts],
    ["Vessel", g("vessel")],
    ["Term", g("term")],
    ["CS Remark", g("im_cs_remark")],
  ];
  return lines.map(([k, v]) => `${k}: ${v || "-"}`).join("\n");
}

// อ่าน Import Job No. ที่ฝังในข้อความ Data from Import ("Job No.: XXX")
// ใช้เป็นตัวเชื่อมแบบ soft (exp_job_no ปล่อยว่างตามสเปก — ไม่ลิงก์ตรง ๆ)
function impJobNoFromReadout(dfi: string): string {
  const m = /Job No\.:\s*(.+)/.exec(dfi || "");
  const v = (m?.[1] || "").trim();
  return v === "-" ? "" : v;
}

// Re-Export: CS Import re_export=Yes → สร้าง "แถวเปล่า" ใน CS Export
// ตามสเปก: กรอกแค่ EX/OPS Status=Open, Re-Export?=Yes, Data from Import, Job Create Date(auto)
// ช่องอื่นว่างหมด — exp_job_no ก็ว่าง (ไม่ลิงก์กับ Import)
function reExportSeed(r: JobRecord): Partial<JobRecord> {
  return {
    ex_ops_status: "Open",
    re_export: "Yes",
    data_from_import: composeDataFromImport(r),
  };
}

// Sync Export ตาม Re-Export? ของ Import (จับคู่ด้วย Import Job No. ที่ฝังใน Data from Import)
// - re_export=Yes → สร้างแถวเปล่าใน Export (ถ้ายังไม่มี)
// - re_export=No  → ลบแถว Export ที่สร้างอัตโนมัติทิ้ง
async function reconcileReExport(rec: JobRecord): Promise<void> {
  const jobNo = (rec.imp_job_no || "").trim();
  if (!jobNo) return;
  const expRows = await rawList(EXPORT_MODULE);
  const matches = expRows.filter(
    (r) => (r.re_export || "") === "Yes" && impJobNoFromReadout(r.data_from_import || "") === jobNo
  );
  if ((rec.re_export || "") === "Yes") {
    if (!matches.length) await createJobs(EXPORT_MODULE, [reExportSeed(rec)], false, false);
  } else {
    // Re-Export? กลับเป็น No → ลบรายการ Export ที่สร้างอัตโนมัติ
    for (const m of matches) await deleteJob(EXPORT_MODULE, m.__id!, false);
  }
}

// Accounting real-time: ทุก job ต้องมีแถวใน 10 — ไม่มี extra=1 แถว, มี extra=แถวตาม 09
// สร้างที่ขาด + อัปเดตค่า AP/AR ที่ดึงจาก extra + ลบแถวที่ไม่มี extra คู่แล้ว
async function reconcileAccounting(jobNo: string): Promise<void> {
  if (!jobNo) return;
  const ACC = MODULE_BY_ID[ACC_ID];
  const EXTRA = MODULE_BY_ID[EXTRA_ID];
  const src = await getSourceIndex();
  const origin = src.imp.has(jobNo)
    ? "FREIGHT IMPORT"
    : src.exp.has(jobNo)
    ? "FREIGHT EXPORT"
    : "";
  if (!origin) return; // job ไม่มีต้นทาง CS → ไม่ต้องมี Accounting

  const extras = (await rawList(EXTRA)).filter((e) => (e.job_no || "").trim() === jobNo);
  // desired: key = module||req_type → ค่าที่ต้องมี
  interface Want { module: string; type: string; data: Partial<JobRecord> }
  const wants: Want[] = [];
  if (extras.length === 0) {
    wants.push({ module: origin, type: "", data: { module: origin, acc_job_status: "Open" } });
  } else {
    for (const e of extras) {
      wants.push({
        module: e.module || origin,
        type: e.extra_req_type || "",
        data: {
          module: e.module || origin,
          acc_job_status: "Open",
          supplier: e.supplier || "",
          ap_extra_req_type: e.extra_req_type || "",
          ap_root_cause: e.root_cause || "",
          ap_cost_unit: e.cost_unit || "",
          ap_cost_cur: e.cost_cur || "",
          ap_total_cost: e.cost_total || "",
          ar_sell_unit: e.sell_unit || "",
          ar_sell_cur: e.sell_cur || "",
          ar_total_sell: String(numOf(e.sell_unit) * numOf(e.count)),
        },
      });
    }
  }
  const wantKeys = new Set(wants.map((w) => `${w.module}||${w.type}`));

  const existing = (await rawList(ACC)).filter((r) => (r.job_no || "").trim() === jobNo);
  const byKey = new Map<string, JobRecord>();
  for (const r of existing) byKey.set(`${r.module || ""}||${r.ap_extra_req_type || ""}`, r);

  const toCreate: Partial<JobRecord>[] = [];
  const toUpdate: Partial<JobRecord>[] = [];
  for (const w of wants) {
    const key = `${w.module}||${w.type}`;
    const cur = byKey.get(key);
    if (cur) toUpdate.push({ __id: cur.__id, ...w.data }); // refresh ค่าที่ดึงจาก extra (คงค่าที่กรอกเอง)
    else toCreate.push({ job_no: jobNo, ...w.data });
  }
  // ลบแถว Accounting ที่ไม่มี extra/base คู่แล้ว
  for (const r of existing) {
    const key = `${r.module || ""}||${r.ap_extra_req_type || ""}`;
    if (!wantKeys.has(key)) await deleteJob(ACC, r.__id!, false);
  }
  if (toCreate.length) await createJobs(ACC, toCreate, true, false);
  if (toUpdate.length) await updateJobs(ACC, toUpdate, false);
}

// ปรับ record ปลายทางให้ตรงกับ flag/req type บนต้นทาง (เรียกหลัง create/update)
// - CS Import/Export: shipping/transport/warehouse_flag → สร้าง/ลบ record ใน 06/07/08 (1 แถว/Job No.)
// - ทุกต้นทาง (04–08): extra_require + req type → สร้าง/ลบแถวใน 09 (ป้าย Module ตามต้นทาง)
async function reconcileLinks(m: ModuleDef, saved: JobRecord[]): Promise<void> {
  if (!saved.length) return;
  const isCS = m.id === "04_CS_Import" || m.id === "05_CS_Export";
  const isMid = MID_MODULE_IDS.includes(m.id);

  // Extra (09) ถูกแก้ (Cost/Sell PIC ลงค่า) → refresh Accounting ของ job นั้น
  if (m.id === EXTRA_ID) {
    const jobs = new Set(saved.map((r) => (r.job_no || "").trim()).filter(Boolean));
    for (const j of jobs) await reconcileAccounting(j);
    return;
  }
  if (!isCS && !isMid) return;

  // เก็บ Job No. ที่แตะ เพื่อ refresh Accounting ทีเดียวตอนท้าย
  const touched = new Set<string>();
  for (const rec of saved) {
    const jn = (rec[m.jobNoKey] || "").trim();
    if (jn) touched.add(jn);
  }

  // ----- 0) Re-Export (เฉพาะ CS Import): re_export=Yes → สร้าง Export -----
  if (m.id === "04_CS_Import") {
    for (const rec of saved) await reconcileReExport(rec);
  }

  // ----- 1) CS: สร้าง/ลบ record เดี่ยวใน Shipping/Transport/Warehouse ตาม flag -----
  if (isCS) {
    for (const link of CS_FLAG_LINKS) {
      const targetM = MODULE_BY_ID[link.id];
      const byJob = new Map<string, JobRecord[]>();
      for (const r of await rawList(targetM)) {
        const j = (r.job_no || "").trim();
        if (j) pushMap(byJob, j, r);
      }
      const toCreate: Partial<JobRecord>[] = [];
      for (const rec of saved) {
        const jobNo = (rec[m.jobNoKey] || "").trim();
        if (!jobNo) continue;
        const existing = byJob.get(jobNo) || [];
        if ((rec[link.flag] || "") === "Yes") {
          if (existing.length === 0)
            toCreate.push({ job_no: jobNo, [targetM.fields[0].key]: "Open" });
        } else {
          // flag→No: ลบ record ปลายทาง + cascade ลบ Extra ของโมดูลนั้นด้วย
          for (const e of existing) await deleteJob(targetM, e.__id!);
        }
      }
      if (toCreate.length) await createJobs(targetM, toCreate, true, false);
    }
  }

  // ----- 2) Extra (09): สร้าง/ลบแถวตาม extra_require + req type ที่เลือก -----
  const label = EXTRA_MODULE_LABEL[m.id];
  if (label) {
    const EXTRA = MODULE_BY_ID[EXTRA_ID];
    const mineByJob = new Map<string, JobRecord[]>();
    for (const r of await rawList(EXTRA)) {
      if ((r.module || "") !== label) continue;
      const j = (r.job_no || "").trim();
      if (j) pushMap(mineByJob, j, r);
    }
    const toCreate: Partial<JobRecord>[] = [];
    for (const rec of saved) {
      const jobNo = (rec[m.jobNoKey] || "").trim();
      if (!jobNo) continue;
      const meta = extraMetaFromSource(m, rec);
      const want =
        (rec.extra_require || "") === "Yes"
          ? new Set(splitTypes(rec.extra_req_type || ""))
          : new Set<string>();
      const have = new Set<string>();
      for (const e of mineByJob.get(jobNo) || []) {
        const t = e.extra_req_type || "";
        if (want.has(t) && !have.has(t)) have.add(t); // เก็บอันที่ยังต้องการ (กันซ้ำ)
        else await deleteJob(EXTRA, e.__id!, false); // ไม่ต้องการแล้ว / ซ้ำ → ลบ
      }
      for (const t of want) if (!have.has(t))
        toCreate.push({
          job_no: jobNo, module: label, extra_req_type: t, extra_status: "Open",
          supplier: meta.supplier, cost_pic: meta.cost_pic,
        });
    }
    if (toCreate.length) await createJobs(EXTRA, toCreate, true, false);
  }

  // ----- 3) Accounting: ทุก job ต้องมีแถว (real-time) -----
  for (const jn of touched) await reconcileAccounting(jn);
}

// cascade ลบปลายทางเมื่อลบงานต้นทาง (4 โมดูลนี้ผูกกับ CS ไม่มีชีวิตอิสระ)
async function cascadeDelete(m: ModuleDef, rec: JobRecord): Promise<void> {
  const isCS = m.id === "04_CS_Import" || m.id === "05_CS_Export";
  const isMid = MID_MODULE_IDS.includes(m.id);
  if (!isCS && !isMid) return;
  const jobNo = ((isCS ? rec[m.jobNoKey] : rec.job_no) || "").trim();
  if (!jobNo) return;

  const EXTRA = MODULE_BY_ID[EXTRA_ID];
  const ACC = MODULE_BY_ID[ACC_ID];

  if (isCS) {
    // ลบ record ใน 06/07/08 (จะ cascade ต่อไปลบ Extra ป้ายของแต่ละโมดูลเอง)
    for (const id of MID_MODULE_IDS) {
      const tm = MODULE_BY_ID[id];
      for (const r of await rawList(tm))
        if ((r.job_no || "").trim() === jobNo) await deleteJob(tm, r.__id!);
    }
    // ลบ Extra + Accounting ทั้งหมดของ job นี้
    for (const r of await rawList(EXTRA))
      if ((r.job_no || "").trim() === jobNo) await deleteJob(EXTRA, r.__id!, false);
    for (const r of await rawList(ACC))
      if ((r.job_no || "").trim() === jobNo) await deleteJob(ACC, r.__id!, false);
    return;
  }

  // isMid: ลบ Extra ป้ายของโมดูลนี้ แล้ว refresh Accounting ให้ตรง
  const label = EXTRA_MODULE_LABEL[m.id];
  for (const r of await rawList(EXTRA))
    if ((r.job_no || "").trim() === jobNo && (r.module || "") === label)
      await deleteJob(EXTRA, r.__id!, false);
  await reconcileAccounting(jobNo);
}

// Sync / Backfill: reconcile ทุกงานต้นทางใหม่
// ปกติ reconcile ทำ real-time ตอนบันทึกอยู่แล้ว — ปุ่มนี้ไว้ซ่อม/เติมย้อนหลังกรณีข้อมูลหลุด sync
export async function syncAll(): Promise<{ message: string; reconciled: number }> {
  let n = 0;
  for (const id of ["04_CS_Import", "05_CS_Export", "06_Shipping", "07_Transportation", "08_Warehouse"]) {
    const m = MODULE_BY_ID[id];
    const rows = await rawList(m);
    if (rows.length) {
      await reconcileLinks(m, rows);
      n += rows.length;
    }
  }
  return {
    message: `Sync/Backfill เสร็จ — reconcile ${n} งานต้นทาง (Re-Export/Shipping/Transport/Warehouse/Extra/Accounting)`,
    reconciled: n,
  };
}

// initialize: สร้างชีททุกโมดูล + หัวตาราง + seed dropdown
export async function initializeWorkbook(): Promise<{ message: string }> {
  for (const m of ALL_MODULES) {
    await ensureDataSheet(m);
  }
  await ensureSheet(SETTINGS_SHEET); // ชีทเก็บค่าตั้งค่าส่วนกลาง (คอลัมน์ตอนย่อ)
  await seedListsIfEmpty();
  return {
    message: `ตั้งค่าชีทเรียบร้อย — สร้าง ${ALL_MODULES.length} ชีท + dropdown ตั้งต้น`,
  };
}
