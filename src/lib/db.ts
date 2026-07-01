import {
  ALL_LISTS,
  DB_SHEET,
  EXPORT_MODULE,
  IMPORT_MODULE,
  LIST_SEED,
  MODULE_BY_ID,
  MODULES,
  ModuleDef,
  recordHeaders,
} from "./schema";
import { checkEnd } from "./endRules";
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

// กติกาอัตโนมัติ: ลงวันที่เมื่อ Status = End + ช่องคำนวณของ Extra
function applyAutoRules(m: ModuleDef, rec: Partial<JobRecord>): Partial<JobRecord> {
  const next = { ...rec };
  const statusKey = m.fields[0]?.key;
  const dateField = m.fields.find((f) => f.key.endsWith("status_date"));
  if (statusKey && dateField) {
    if ((next[statusKey] || "") === "End") {
      if (!next[dateField.key]) next[dateField.key] = nowStamp();
    } else {
      next[dateField.key] = "";
    }
  }
  if (m.id === "09_Extra_Service") {
    const count = numOf(next.count);
    next.cost_total = String(numOf(next.cost_unit) * count);
    next.margin_total = String((numOf(next.sell_unit) - numOf(next.cost_unit)) * count);
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
function enforceEnd(m: ModuleDef, rec: JobRecord): void {
  const statusKey = m.fields[0]?.key;
  if (!statusKey || rec[statusKey] !== "End") return;
  const reasons = checkEnd(m, rec);
  if (reasons.length) {
    const jn = rec[m.jobNoKey] || rec.__id || "";
    throw new Error(`End ไม่ได้ (${jn}): ${reasons.join(" · ")}`);
  }
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
  const dataRanges = MODULES.map((m) => `${m.id}!A1:${lastCol(m)}`);
  const all = await batchGetRanges([...dataRanges, `${DB_SHEET}!A1:CZ`]);
  const lists = parseListRows(all[MODULES.length]);

  const rawById: Record<string, JobRecord[]> = {};
  MODULES.forEach((m, i) => (rawById[m.id] = parseModuleRows(m, all[i])));

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
  for (const m of MODULES) {
    let rows = rawById[m.id] || [];
    if (moduleHasPull(m)) rows = rows.map((r) => applyPull(m, r, srcIdx));
    else if (moduleHasRPull(m)) rows = rows.map((r) => applyRPull(m, r, downIdx));
    modules[m.key] = rows;
  }
  return { modules, lists };
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
  enrich = false
): Promise<JobRecord[]> {
  if (!recs.length) return [];
  const en: (r: JobRecord) => JobRecord = enrich ? await makeEnricher(m) : (r) => r;
  const out: JobRecord[] = [];
  const values: string[][] = [];
  recs.forEach((rec, i) => {
    const withId = en({ ...rec, __id: rec.__id || genId(i + 1) } as JobRecord);
    const final = applyAutoRules(m, withId) as JobRecord;
    enforceEnd(m, final);
    out.push(final);
    values.push(recordToRow(m, final));
  });
  await appendRows(`${m.id}!A1`, values);
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
  recs: Partial<JobRecord>[]
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
  const data: { range: string; values: string[][] }[] = [];
  const out: JobRecord[] = [];
  for (const rec of recs) {
    if (!rec.__id) throw new Error("ไม่มี __id สำหรับอัปเดต");
    const rowNum = rowNumById.get(rec.__id);
    if (!rowNum) throw new Error(`ไม่พบระเบียนที่ต้องการแก้ไข (${rec.__id})`);
    const merged = { ...existingById.get(rec.__id), ...rec } as JobRecord;
    const withRules = applyAutoRules(m, merged) as JobRecord;
    enforceEnd(m, withRules);
    data.push({
      range: `${m.id}!A${rowNum}:${lastCol(m)}${rowNum}`,
      values: [recordToRow(m, withRules)],
    });
    out.push(withRules);
  }
  await batchWriteRanges(data);
  return out;
}

export async function deleteJob(m: ModuleDef, id: string): Promise<void> {
  const rowNum = await findRowNumber(m, id);
  if (!rowNum) return;
  await clearRange(`${m.id}!A${rowNum}:${lastCol(m)}${rowNum}`);
}

// Refresh: ดึงข้อมูลจาก CS ใหม่แล้วบันทึกลงชีทของโมดูล
export async function refreshModule(m: ModuleDef): Promise<number> {
  if (!moduleHasPull(m) && !moduleHasRPull(m)) return 0;
  const rows = await rawList(m);
  if (!rows.length) return 0;
  await updateJobs(m, rows);
  return rows.length;
}

// ===== Sync: Extra Split + Accounting Master Queue (Workflow Rules) =====

// โมดูลต้นทางที่มีช่อง Extra/Service + ป้ายชื่อโมดูลที่ใช้ในช่อง "Module"
const EXTRA_SOURCES: { id: string; label: string }[] = [
  { id: "04_CS_Import", label: "Import" },
  { id: "05_CS_Export", label: "Export" },
  { id: "06_Shipping", label: "Shipping" },
  { id: "07_Transportation", label: "Transportation" },
  { id: "08_Warehouse", label: "Warehouse" },
];

const splitTypes = (v: string) =>
  (v || "").split(" | ").map((s) => s.trim()).filter(Boolean);

// Re-Export: CS Import ที่ Job Type = Re-Export/* -> สร้าง record ใน CS Export (05) ให้อัตโนมัติ
async function reExportLink(): Promise<number> {
  const impRows = await rawList(IMPORT_MODULE);
  const expRows = await rawList(EXPORT_MODULE);
  const existExp = new Set(expRows.map((r) => (r.exp_job_no || "").trim()));
  const toCreate: Partial<JobRecord>[] = [];
  for (const r of impRows) {
    if (!/^Re-Export/i.test(r.job_type || "")) continue;
    const jobNo = (r.imp_job_no || "").trim();
    if (!jobNo || existExp.has(jobNo)) continue;
    existExp.add(jobNo);
    toCreate.push({
      ex_ops_status: "Open",
      exp_job_no: jobNo, // ใช้เลขงานเดียวกันเป็นตัวเชื่อม
      job_type: r.job_type,
      ex_cs: r.im_cs,
      sales_bkg_by: r.sales_bkg_by,
      co_agent_carrier: r.co_agent_carrier,
      customer: r.customer,
      exp_booking_mbl: r.imp_booking_mbl,
      exp_hbl: r.imp_hbl,
      exp_customer_ref: r.imp_customer_ref,
      pol: r.pol,
      pod: r.pod,
      cnt_4w: r.cnt_4w,
      cnt_6w: r.cnt_6w,
      cnt_10w: r.cnt_10w,
      cnt_20gp: r.cnt_20gp,
      cnt_40hq: r.cnt_40hq,
      vessel: r.vessel,
      term: r.term,
      ex_cs_remark: r.im_cs_remark,
    });
  }
  return (await createJobs(EXPORT_MODULE, toCreate)).length;
}

export async function syncAll(): Promise<{
  message: string;
  reExport: number;
  extraCreated: number;
  accCreated: number;
}> {
  const EXTRA = MODULE_BY_ID["09_Extra_Service"];
  const ACC = MODULE_BY_ID["10_Accounting"];

  // ----- 0) Re-Export link (Import -> Export) -----
  const reExport = await reExportLink();

  // ----- 1) Extra Split -> 09_Extra_Service -----
  const existingExtra = await rawList(EXTRA);
  const extraKeys = new Set(
    existingExtra.map(
      (r) => `${(r.job_no || "").trim()}||${r.module || ""}||${r.extra_req_type || ""}`
    )
  );
  const newExtra: Partial<JobRecord>[] = [];
  for (const src of EXTRA_SOURCES) {
    const m = MODULE_BY_ID[src.id];
    const rows = await rawList(m);
    for (const r of rows) {
      if ((r.extra_require || "") !== "Yes") continue;
      const jobNo = (r[m.jobNoKey] || "").trim();
      if (!jobNo) continue;
      for (const t of splitTypes(r.extra_req_type || "")) {
        const key = `${jobNo}||${src.label}||${t}`;
        if (extraKeys.has(key)) continue;
        extraKeys.add(key);
        newExtra.push({ job_no: jobNo, module: src.label, extra_req_type: t, extra_status: "Open" });
      }
    }
  }
  const extraCreated = (await createJobs(EXTRA, newExtra, true)).length;

  // ----- 2) Accounting Master Queue -> 10_Accounting -----
  // จัดกลุ่ม Extra (รวมที่เพิ่งสร้าง) ตาม Job No.
  const allExtra = await rawList(EXTRA);
  const extraByJob = new Map<string, JobRecord[]>();
  for (const e of allExtra) {
    const j = (e.job_no || "").trim();
    if (!j) continue;
    const arr = extraByJob.get(j) || [];
    arr.push(e);
    extraByJob.set(j, arr);
  }

  const existingAcc = await rawList(ACC);
  const accKeys = new Set(
    existingAcc.map(
      (r) => `${(r.job_no || "").trim()}||${r.module || ""}||${r.ap_extra_req_type || ""}`
    )
  );

  // ทุก Job จาก CS Import/Export ต้องมีใน Accounting
  const csJobs: { jobNo: string; origin: string }[] = [];
  for (const r of await rawList(IMPORT_MODULE)) {
    const j = (r.imp_job_no || "").trim();
    if (j) csJobs.push({ jobNo: j, origin: "Import" });
  }
  for (const r of await rawList(EXPORT_MODULE)) {
    const j = (r.exp_job_no || "").trim();
    if (j) csJobs.push({ jobNo: j, origin: "Export" });
  }

  const newAcc: Partial<JobRecord>[] = [];
  for (const { jobNo, origin } of csJobs) {
    const items = extraByJob.get(jobNo) || [];
    if (items.length === 0) {
      // ไม่มี Extra = 1 แถวหลัก
      const key = `${jobNo}||${origin}||`;
      if (accKeys.has(key)) continue;
      accKeys.add(key);
      newAcc.push({ job_no: jobNo, module: origin, acc_job_status: "Open" });
    } else {
      // มี Extra = แถวตาม 09 (ดึง Cost/Sell มาแสดงใน AP/AR)
      for (const it of items) {
        const mod = it.module || origin;
        const type = it.extra_req_type || "";
        const key = `${jobNo}||${mod}||${type}`;
        if (accKeys.has(key)) continue;
        accKeys.add(key);
        newAcc.push({
          job_no: jobNo,
          module: mod,
          acc_job_status: "Open",
          ap_extra_req_type: type,
          ap_root_cause: it.root_cause || "",
          ap_cost_unit: it.cost_unit || "",
          ap_cost_cur: it.cost_cur || "",
          ap_total_cost: it.cost_total || "",
          ar_sell_unit: it.sell_unit || "",
          ar_sell_cur: it.sell_cur || "",
          ar_total_sell: String(numOf(it.sell_unit) * numOf(it.count)),
        });
      }
    }
  }
  const accCreated = (await createJobs(ACC, newAcc, true)).length;

  return {
    message: `Sync เสร็จ — Re-Export ${reExport}, Extra ${extraCreated}, Accounting ${accCreated} แถว`,
    reExport,
    extraCreated,
    accCreated,
  };
}

// initialize: สร้างชีททุกโมดูล + หัวตาราง + seed dropdown
export async function initializeWorkbook(): Promise<{ message: string }> {
  for (const m of MODULES) {
    await ensureDataSheet(m);
  }
  await seedListsIfEmpty();
  return {
    message: `ตั้งค่าชีทเรียบร้อย — สร้าง ${MODULES.length} โมดูล + dropdown ตั้งต้น`,
  };
}
