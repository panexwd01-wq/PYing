import {
  ALL_LISTS,
  ALL_MODULES,
  CARRIER_COLOR_SEED,
  DB_SHEET,
  EXPORT_MODULE,
  IMPORT_MODULE,
  LINK_CS,
  LINK_IMP,
  LINK_KEY,
  LINK_KEYS,
  LINK_SRC,
  LIST_SEED,
  MODULE_BY_ID,
  MODULES,
  ModuleDef,
  recordHeaders,
} from "./schema";
import { contLabel } from "./containers";
import { AllUserPrefs, ColorTag, parseColorTags } from "./prefs";
import { checkEnd, EndCtx } from "./endRules";
import { checkReExport } from "./reExport";
import {
  ACC_BASE_KEY,
  accExtraKey,
  accFuelKey,
  applyLegacyLinks,
  csJobNoKey,
  csLabel,
  duplicateJobNoNotes,
  linkOf,
  resolveLegacyLinks,
} from "./links";
import {
  EXTRA_MODULE_LABEL,
  INPUT_STATUS_KEYS,
  INPUT_STATUS_PENDING,
  isInputEnd,
} from "./modules/extra";
import {
  ACC_FUEL_LABEL,
  ACC_FUEL_NA,
  ACC_FUEL_NA_KEYS,
} from "./modules/accounting";
import { JobRecord, Lists, Snapshot } from "./types";
import {
  appendRows,
  batchClearRanges,
  batchWriteRanges,
  clearRange,
  ensureColumns,
  ensureSheet,
  primeReadCache,
  readRange,
  sheetExists,
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
  // list ที่ยังไม่มีคอลัมน์ในชีท (เช่นเพิ่งเพิ่มใหม่ในโค้ด) → ใช้ค่าตั้งต้นจาก schema
  // ไม่งั้น dropdown ของช่องใหม่จะว่างจนกว่าจะรัน Initialize ใหม่ (list ที่มีคอลัมน์แล้วยึดตามชีทเสมอ)
  for (const k of ALL_LISTS) if (!(k in out)) out[k] = [...(LIST_SEED[k] || [])];
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
// ค่าตั้งค่าทั้งหมดอยู่คอลัมน์ A ของชีท _settings บรรทัดละเรื่อง (อ่านทีเดียว = 1 API call)
//   A1 = คอลัมน์ตอนย่อ (ส่วนกลาง) · A2 = สีต่อรายการ dropdown · A3 = ชุดสีกลาง + ความหมาย
//   A4 = โน้ตส่วนกลางต่อ tab · A5 = ตั้งค่าคอลัมน์ต่อบัญชี
export const SETTINGS_RANGE = `${SETTINGS_SHEET}!A1:A5`;
export const SETTINGS_CELL = {
  collapse: 1,
  carrierColors: 2,
  palette: 3,
  notes: 4,
  prefs: 5,
} as const;
export type CollapseConfig = Record<string, string[]>; // moduleKey → รายชื่อ field key ที่โชว์ตอนย่อ

// อ่านแบบกันพัง: ถ้าชีทยังไม่มี คืนช่องว่าง (ไม่ให้ snapshot ล้ม)
async function readSettingsCells(): Promise<string[]> {
  try {
    const rows = await readRange(SETTINGS_RANGE);
    return [1, 2, 3, 4, 5].map((n) => rows?.[n - 1]?.[0] || "");
  } catch {
    return ["", "", "", "", ""];
  }
}

// เขียนค่าตั้งค่าทีละบรรทัด (ไม่แตะบรรทัดอื่น)
async function writeSettingsCell(row: number, value: unknown): Promise<void> {
  await ensureSheet(SETTINGS_SHEET);
  await writeRange(`${SETTINGS_SHEET}!A${row}`, [[JSON.stringify(value)]]);
}

function parseJsonObject<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function readCollapseConfig(): Promise<CollapseConfig> {
  const cells = await readSettingsCells();
  return parseJsonObject<CollapseConfig>(cells[SETTINGS_CELL.collapse - 1], {});
}

export async function writeCollapseConfig(cfg: CollapseConfig): Promise<void> {
  await writeSettingsCell(SETTINGS_CELL.collapse, cfg);
}

// สีของแต่ละค่าใน Co-Agent/Carrier (เก็บ JSON ที่ _settings!A2) → ระบายช่อง co_agent_carrier ทุก tab
export type CarrierColors = Record<string, string>; // ชื่อ carrier → สี hex

// ยังไม่เคยตั้งค่า (ชีท/ช่องว่าง) = ใช้สีตั้งต้นจาก schema; เคยบันทึกแล้วยึดค่าที่บันทึกล้วน ๆ
// (ไม่ merge กับ default ไม่งั้นสีที่ผู้ใช้ตั้งใจล้างจะเด้งกลับมา)
export async function readCarrierColors(): Promise<CarrierColors> {
  const cells = await readSettingsCells();
  return parseJsonObject<CarrierColors>(cells[SETTINGS_CELL.carrierColors - 1], { ...CARRIER_COLOR_SEED });
}

export async function writeCarrierColors(colors: CarrierColors): Promise<void> {
  await writeSettingsCell(SETTINGS_CELL.carrierColors, colors);
}

// ===== ชุดสีกลาง (A3) — สี + ความหมาย ใช้กับปุ่มเลือกสีข้างช่อง (Job No. / Booking / MBL) =====
export async function readPalette(): Promise<ColorTag[]> {
  const cells = await readSettingsCells();
  return parseColorTags(cells[SETTINGS_CELL.palette - 1]);
}

export async function writePalette(palette: ColorTag[]): Promise<void> {
  await writeSettingsCell(SETTINGS_CELL.palette, palette);
}

// ===== โน้ตส่วนกลางต่อ tab (A4) =====
export type ModuleNotes = Record<string, string>;

export async function readNotes(): Promise<ModuleNotes> {
  const cells = await readSettingsCells();
  return parseJsonObject<ModuleNotes>(cells[SETTINGS_CELL.notes - 1], {});
}

export async function writeNotes(notes: ModuleNotes): Promise<void> {
  await writeSettingsCell(SETTINGS_CELL.notes, notes);
}

// ===== ตั้งค่าคอลัมน์ต่อบัญชี (A5) — userId → moduleKey → ลำดับ/ความกว้าง/คอลัมน์ตอนย่อ =====
export async function readUserPrefs(): Promise<AllUserPrefs> {
  const cells = await readSettingsCells();
  return parseJsonObject<AllUserPrefs>(cells[SETTINGS_CELL.prefs - 1], {});
}

export async function writeUserPrefs(prefs: AllUserPrefs): Promise<void> {
  await writeSettingsCell(SETTINGS_CELL.prefs, prefs);
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

// ช่องวันที่อัตโนมัติที่ผูกกับ "สถานะย่อย" ในแถวเดียวกัน (นอกเหนือจาก *_status_date ของทั้งงาน)
// [ช่องวันที่, ช่องสถานะที่คุม, ค่าที่ถือว่าจบ] — ตรงค่า = ลงวันเวลาให้ถ้ายังว่าง, ไม่ตรง = ล้างทิ้ง
const AUTO_DATE_RULES: Record<string, [string, string, string[]][]> = {
  "06_Shipping": [
    ["clearance_end_date", "clearance_status", ["Cleared", "Completed"]],
    ["ship_close_acc_date", "ship_close_acc_status", ["Complete", "Completed"]],
  ],
  "07_Transportation": [1, 2, 3].map(
    (n) => [`supp${n}_end`, `supp${n}_sts`, ["End", "Completed"]] as [string, string, string[]]
  ),
  "08_Warehouse": [["wh_supp1_end", "wh_supp1_sts", ["End", "Completed"]]],
  "10_Accounting": [["cus_paid_date", "cus_paid", ["Done"]]],
};

// export ไว้ให้เทสเรียกได้ (ตัวเรียกจริงอยู่ใน createJobs/updateJobs)
export function applyAutoRules(m: ModuleDef, rec: Partial<JobRecord>): Partial<JobRecord> {
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
  // Check Deposit Done Date: ลงวัน+เวลาอัตโนมัติเมื่อ Check Deposit = Done
  if (hasField(m, "check_deposit_done_date")) {
    if ((next.check_deposit || "") === "Done") {
      if (!next.check_deposit_done_date) next.check_deposit_done_date = nowStamp();
    } else {
      next.check_deposit_done_date = "";
    }
  }
  // วันที่อัตโนมัติของสถานะย่อย (Supp End Date / Clearance End Date / Cus Paid Date ฯลฯ)
  for (const [dateKey, stsKey, doneVals] of AUTO_DATE_RULES[m.id] || []) {
    if (!hasField(m, dateKey)) continue;
    if (doneVals.includes(String(next[stsKey] ?? "").trim())) {
      if (!next[dateKey]) next[dateKey] = nowStamp();
    } else {
      next[dateKey] = "";
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
    // Input Status: ตั้งต้น Pending เสมอ (ทุกบรรทัดของตาราง Sell / Job Cost)
    for (const k of INPUT_STATUS_KEYS) if (!String(next[k] ?? "").trim()) next[k] = INPUT_STATUS_PENDING;
    // Total Rate = Qty. × Rate (auto) — ว่างถ้ายังไม่กรอกทั้งคู่
    const totalOf = (qty: unknown, rate: unknown) =>
      String(qty ?? "").trim() === "" && String(rate ?? "").trim() === ""
        ? ""
        : String(numOf(qty) * numOf(rate));
    next.sell_total_rate = totalOf(next.sell_qty, next.sell_unit);
    next.cost_total_rate = totalOf(next.cost_qty, next.cost_unit);
    // ยอดรวมของรายการนี้ = Total Rate (ไม่แปลงค่าเงิน — ดูช่อง CUR ประกอบ)
    next.cost_total = String(numOf(next.cost_total_rate));
    next.margin_total = String(numOf(next.sell_total_rate) - numOf(next.cost_total_rate));
    // Ready Acc? = Done เมื่อ Cost/Sell Sts ครบ (auto)
    const done = (v: unknown) => ["Complete", "Completed"].includes(String(v ?? "").trim());
    next.ready_acc = done(next.cost_sts) && done(next.sell_sts) ? "Done" : "Pending";
  }
  return next;
}

// ===== cross-module pull (ดึงหัว Job จากงาน CS แม่ — จับคู่ด้วยรหัสเชื่อม link_cs) =====

type CsSide = "imp" | "exp";
interface SourceIndex {
  byId: Map<string, { side: CsSide; rec: JobRecord }>; // __id ของงาน CS → แถว + ฝั่ง
}

function buildSourceIndex(impRows: JobRecord[], expRows: JobRecord[]): SourceIndex {
  const byId = new Map<string, { side: CsSide; rec: JobRecord }>();
  for (const rec of impRows) byId.set(rec.__id, { side: "imp", rec });
  for (const rec of expRows) byId.set(rec.__id, { side: "exp", rec });
  return { byId };
}

// อ่าน CS Import/Export สดทุกครั้ง (ไม่ cache ข้ามคำขอ กันค่าที่ pull มาค้าง)
async function getSourceIndex(): Promise<SourceIndex> {
  const [impRows, expRows] = await Promise.all([
    rawList(IMPORT_MODULE),
    rawList(EXPORT_MODULE),
  ]);
  return buildSourceIndex(impRows, expRows);
}

const moduleHasPull = (m: ModuleDef) => m.fields.some((f) => f.pull);
const moduleHasRPull = (m: ModuleDef) => m.fields.some((f) => f.rpull);

function applyPull(m: ModuleDef, rec: JobRecord, idx: SourceIndex): JobRecord {
  const hit = idx.byId.get(linkOf(rec, LINK_CS));
  if (!hit) return rec;
  const { side, rec: src } = hit;
  const next = { ...rec };
  for (const f of m.fields) {
    if (!f.pull) continue;
    const srcKey = f.pull[side];
    if (!srcKey) continue;
    next[f.key] = (src[srcKey] ?? "").toString();
  }
  return next;
}

// ===== reverse pull (CS Import/Export ดึงค่าจากโมดูลปลายทาง — link_cs ของปลายทาง = __id ของ CS) =====
type DownIndex = Record<string, Map<string, JobRecord>>;

function indexByCs(rows: JobRecord[]): Map<string, JobRecord> {
  const map = new Map<string, JobRecord>();
  for (const r of rows) {
    const k = linkOf(r, LINK_CS);
    if (k) map.set(k, r);
  }
  return map;
}

async function getDownstreamIndex(m: ModuleDef): Promise<DownIndex> {
  const ids = Array.from(new Set(m.fields.filter((f) => f.rpull).map((f) => f.rpull!.from)));
  const out: DownIndex = {};
  await Promise.all(
    ids.map(async (id) => {
      out[id] = indexByCs(await rawList(MODULE_BY_ID[id]));
    })
  );
  return out;
}

// ===== โน้ตสรุปค่าใช้จ่าย Extra ของงาน (ขาเข้า ข้อ 2) =====
// รวมทุกบรรทัดใน tab Extra ที่ผูกกับงาน CS นี้ มาเรียงเป็นข้อความบรรทัดละรายการ
// แสดงที่ช่อง extra_cost_note ของ CS Import/Export (อ่านอย่างเดียว)
function extraRowsByCs(rows: JobRecord[]): Map<string, JobRecord[]> {
  const map = new Map<string, JobRecord[]>();
  for (const r of rows) {
    const k = linkOf(r, LINK_CS);
    if (!k) continue;
    const cur = map.get(k);
    if (cur) cur.push(r);
    else map.set(k, [r]);
  }
  return map;
}

const money = (v: string | undefined) => {
  const n = parseFloat((v || "").toString().replace(/,/g, ""));
  return Number.isFinite(n) && n !== 0 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "";
};

export function composeExtraNote(rows: JobRecord[] | undefined): string {
  if (!rows || !rows.length) return "";
  const lines: string[] = [];
  for (const r of rows) {
    const type = (r.extra_req_type || "").trim() || "(ไม่ระบุ Type)";
    const cost = money(r.cost_total_rate);
    const sell = money(r.sell_total_rate);
    if (!cost && !sell) continue;
    const parts: string[] = [];
    if (cost) parts.push(`cost ${cost}${(r.cost_total_cur || "").trim() ? " " + r.cost_total_cur.trim() : ""}`);
    if (sell) parts.push(`sale ${sell}${(r.sell_total_cur || "").trim() ? " " + r.sell_total_cur.trim() : ""}`);
    lines.push(`${type}: ${parts.join(" / ")}`);
  }
  return lines.join("\n"); // บรรทัดละรายการ — ในตารางเห็นบรรทัดแรก กางรายละเอียด/ชี้เมาส์ดูได้ครบ
}

function applyRPull(m: ModuleDef, rec: JobRecord, dIdx: DownIndex): JobRecord {
  const next = { ...rec };
  for (const f of m.fields) {
    if (!f.rpull) continue;
    const src = dIdx[f.rpull.from]?.get(rec.__id);
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

// บังคับกติกา Re-Export (CS Import): Re-Export? = Yes ↔ Job Type = Re-Export/FCL หรือ /LCL
// prev = ค่าเดิมในชีท (ตอน update) — ถ้าคู่ Re-Export?/Job Type ไม่ได้เปลี่ยน ไม่ต้องเช็ค
// (กันงานเก่าที่ค้างผิดกติกามาบล็อกการ refresh/sync ทั้งชีท — ห้ามแค่ "ทำให้ผิด" ตอนแก้)
function enforceReExport(m: ModuleDef, rec: JobRecord, prev?: JobRecord): void {
  if (m.id !== "04_CS_Import") return;
  if (
    prev &&
    (prev.re_export || "") === (rec.re_export || "") &&
    (prev.job_type || "") === (rec.job_type || "")
  )
    return;
  const msg = checkReExport(rec);
  if (msg) {
    const jn = rec[m.jobNoKey] || rec.__id || "";
    throw new Error(`บันทึกไม่ได้ (${jn}): ${msg}`);
  }
}

// Extra Status (09) = auto — End เมื่อทุกบรรทัดของ Job นี้ (ทั้ง Sell และ Job Cost) เป็น END
// เรียกหลังบันทึกแถว Extra (ค่าเป็นระดับ Job จึงคำนวณจากทุกแถวของงาน CS เดียวกัน)
// รับหลายงานพร้อมกัน → เขียนรวดเดียว
async function syncExtraStatus(csIds: Iterable<string>): Promise<void> {
  const ids = new Set(Array.from(csIds).filter(Boolean));
  if (!ids.size) return;
  const EXTRA = MODULE_BY_ID[EXTRA_ID];
  const byCs = new Map<string, JobRecord[]>();
  for (const r of await rawList(EXTRA)) if (ids.has(linkOf(r, LINK_CS))) pushMap(byCs, linkOf(r, LINK_CS), r);
  const changed: Partial<JobRecord>[] = [];
  byCs.forEach((rows) => {
    const allEnd = rows.every((r) => INPUT_STATUS_KEYS.every((k) => isInputEnd(r[k])));
    const want = allEnd ? "End" : INPUT_STATUS_PENDING;
    for (const r of rows) if ((r.extra_status || "") !== want) changed.push({ __id: r.__id, extra_status: want });
  });
  if (changed.length) await updateJobs(EXTRA, changed, false);
}

// แถว Extra ของแต่ละแถวต้นทาง (04–08) เคลียร์ END ครบหรือยัง
// key = __id ของแถวต้นทาง (link_src) · ไม่มีแถว = ไม่มีคีย์ = ไม่มีเงื่อนไข
async function buildExtraEndMap(): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  for (const e of await rawList(MODULE_BY_ID[EXTRA_ID])) {
    const k = linkOf(e, LINK_SRC);
    if (!k) continue;
    const done = INPUT_STATUS_KEYS.every((key) => isInputEnd(e[key]));
    map.set(k, (map.get(k) ?? true) && done);
  }
  return map;
}

// สร้าง EndCtx (ข้อมูลข้ามโมดูล) เฉพาะตอนโมดูลต้นทาง (04–08) จะตั้ง Status = End
async function buildEndCtx(m: ModuleDef, recs: Partial<JobRecord>[]): Promise<EndCtx | undefined> {
  if (!EXTRA_MODULE_LABEL[m.id]) return undefined; // 09/10/rates ไม่ต้องมี ctx
  const statusKey = m.fields[0].key;
  if (!recs.some((r) => r[statusKey] === "End")) return undefined;
  await primeWorkModules(); // ดึงรวดเดียวก่อนอ่านหลายชีท
  const extraEnd = await buildExtraEndMap();

  // Shipping/Transport/Warehouse: เช็คแค่แถว Extra ของตัวเอง (เงื่อนไขอื่นอยู่ในแถวตัวเอง)
  if (m.id !== "04_CS_Import" && m.id !== "05_CS_Export")
    return {
      hasAcc: new Set(),
      shipEnd: new Map(), transEnd: new Map(), whEnd: new Map(),
      extraEnd,
    };

  const [shipRows, transRows, whRows, accRows] = await Promise.all([
    rawList(MODULE_BY_ID["06_Shipping"]),
    rawList(MODULE_BY_ID["07_Transportation"]),
    rawList(MODULE_BY_ID["08_Warehouse"]),
    rawList(MODULE_BY_ID[ACC_ID]),
  ]);
  const endMap = (rows: JobRecord[], sk: string) => {
    const map = new Map<string, boolean>();
    for (const r of rows) {
      const c = linkOf(r, LINK_CS);
      if (c) map.set(c, r[sk] === "End");
    }
    return map;
  };
  return {
    hasAcc: new Set(accRows.map((r) => linkOf(r, LINK_CS)).filter(Boolean)),
    shipEnd: endMap(shipRows, "shipp_status"),
    transEnd: endMap(transRows, "trans_status"),
    whEnd: endMap(whRows, "wha_status"),
    extraEnd,
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

// เติม cache ของชีทงานทั้งหมด (04–10) ด้วย batchGet ก้อนเดียว
// เรียกก่อน reconcile/buildEndCtx เพื่อให้ rawList ต่อ ๆ ไปใช้ cache (ลด API จาก ~7 read เหลือ 1 batch)
async function primeWorkModules(): Promise<void> {
  await primeReadCache(MODULES.map((m) => `${m.id}!A1:${lastCol(m)}`));
}

// ===== รหัสเชื่อม: คอลัมน์ + เติมให้แถวเก่า =====

// คอลัมน์รหัสเชื่อมอยู่ท้ายสุดของชีท — ชีทเดิม (ก่อนมีรหัสเชื่อม) ยังไม่มีคอลัมน์เหล่านี้
// → ขยายชีท + เขียนหัวตารางต่อท้ายให้เอง (ครั้งแรกของ process ครั้งเดียว)
// หัวตารางส่วนอื่นไม่ตรงกับระบบ = ไม่เดา (เขียนต่อไปจะลงผิดคอลัมน์) → ให้รัน PANEX_MIGRATE() ก่อน
let linkColumnsReady = false;
async function ensureLinkColumns(): Promise<void> {
  if (linkColumnsReady) return;
  // ตรวจ "ทุก" ชีทงาน ไม่ใช่เฉพาะชีทที่มีรหัสเชื่อม — เพราะเส้นเขียนลงคอลัมน์ตามลำดับ schema
  // ถ้าหัวตารางในชีทไม่ตรง (เช่นยังไม่ได้ migrate ตอนคอลัมน์เปลี่ยน) ค่าจะลงผิดช่องเงียบ ๆ
  const targets = MODULES;
  const heads = await readRanges(targets.map((m) => `${m.id}!A1:${lastCol(m)}1`));
  for (const m of targets) {
    const have = (heads[`${m.id}!A1:${lastCol(m)}1`]?.[0] || []).map((h) => String(h ?? "").trim());
    if (!have.length) continue; // ชีทว่าง/ยังไม่มี — เป็นหน้าที่ของ PANEX_INITIALIZE()
    const want = recordHeaders(m);
    if (want.every((h, i) => have[i] === h)) continue;
    // เฉพาะกรณีที่ "ขาดแค่คอลัมน์รหัสเชื่อมท้ายชีท" เท่านั้นที่เติมให้เองได้ (คอลัมน์เดิมไม่เลื่อน)
    const base = want.filter((h) => !LINK_KEYS.includes(h));
    const onlyLinksMissing =
      base.every((h, i) => have[i] === h) &&
      have.slice(base.length).every((h) => !h || LINK_KEYS.includes(h));
    if (!onlyLinksMissing)
      throw new Error(`หัวตารางของชีท ${m.id} ไม่ตรงกับระบบ — ให้ admin รัน PANEX_MIGRATE() ใน Apps Script ก่อน`);
    await ensureColumns(m.id, want.length);
    await writeRange(`${m.id}!A1`, [want]);
  }
  linkColumnsReady = true;
}

// เติมรหัสเชื่อมให้แถวที่ยังไม่มี (ข้อมูลก่อนเปลี่ยนมาใช้รหัสเชื่อม) — จับคู่ด้วย Job No. แบบเดิม
// เขียนเฉพาะช่องรหัสเชื่อมของแถวที่ขาด · ครบแล้ว = ไม่ยิงเขียนเลย
// ต้องรัน "ก่อน" เขียนทุกครั้ง — ถ้าเขียนก่อน (เช่นแก้ Job No.) แถวเก่าจะจับคู่ด้วยเลขเดิมไม่ได้แล้ว
// แถวที่ระบบสร้างมีรหัสเชื่อมเสมอ → เติมครบรอบเดียวต่อ process ก็พอ (force = ปุ่ม Sync ตรวจใหม่ทั้งหมด)
// คืนรายการที่จับคู่ได้ไม่ชัด (ให้คนตรวจ — แสดงตอนกด Sync)
let linksBackfilled = false;
async function ensureLinks(force = false): Promise<string[]> {
  if (linksBackfilled && !force) return [];
  await ensureLinkColumns();
  await primeWorkModules();
  const rows: Record<string, JobRecord[]> = {};
  for (const m of MODULES) rows[m.id] = await rawList(m);
  const { patches, notes } = resolveLegacyLinks(rows);
  const data: { range: string; values: string[][] }[] = [];
  for (const [id, byId] of Object.entries(patches)) {
    if (!byId.size) continue;
    const m = MODULE_BY_ID[id];
    const headers = recordHeaders(m);
    const sheet = await readRange(`${m.id}!A1:${lastCol(m)}`);
    for (let i = 1; i < sheet.length; i++) {
      const p = byId.get((sheet[i]?.[0] || "").trim());
      if (!p) continue;
      for (const [k, v] of Object.entries(p))
        data.push({ range: `${m.id}!${colLetter(headers.indexOf(k) + 1)}${i + 1}`, values: [[String(v ?? "")]] });
    }
  }
  if (data.length) {
    await batchWriteRanges(data);
    await primeWorkModules(); // ชีทที่เพิ่งเขียนถูกล้าง cache → ดึงใหม่รอบเดียว
  }
  linksBackfilled = true;
  return notes;
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
  // list ที่ยังไม่มีคอลัมน์ในชีท (เช่นเพิ่งเพิ่มใหม่ในโค้ด) → ใช้ค่าตั้งต้นจาก schema
  // ไม่งั้น dropdown ของช่องใหม่จะว่างจนกว่าจะรัน Initialize ใหม่ (list ที่มีคอลัมน์แล้วยึดตามชีทเสมอ)
  for (const k of ALL_LISTS) if (!(k in out)) out[k] = [...(LIST_SEED[k] || [])];
  return out;
}

// อ่านหลายช่วงรวดเดียว (ผ่าน cache) — ข้ามชีทที่ยังไม่มีจริง เพื่อไม่ให้ batch ทั้งก้อนล้ม
async function readRanges(ranges: string[]): Promise<Record<string, string[][]>> {
  const names = Array.from(new Set(ranges.map((r) => r.split("!")[0])));
  const ok = new Set<string>();
  await Promise.all(names.map(async (n) => (await sheetExists(n)) && ok.add(n)));
  await primeReadCache(ranges.filter((r) => ok.has(r.split("!")[0])));
  const out: Record<string, string[][]> = {};
  for (const r of ranges) out[r] = ok.has(r.split("!")[0]) ? await readRange(r) : [];
  return out;
}

export async function getSnapshot(): Promise<Snapshot> {
  // ทุกชีทที่หน้าเว็บต้องใช้ อ่านรวดเดียว (โมดูล + dropdown + ค่าตั้งค่า) = 1 API call
  const listRange = `${DB_SHEET}!A1:CZ`;
  const all = await readRanges([
    ...ALL_MODULES.map((m) => `${m.id}!A1:${lastCol(m)}`),
    listRange,
    SETTINGS_RANGE,
  ]);
  const lists = parseListRows(all[listRange]);

  const rawById: Record<string, JobRecord[]> = {};
  ALL_MODULES.forEach((m) => (rawById[m.id] = parseModuleRows(m, all[`${m.id}!A1:${lastCol(m)}`])));
  // แถวเก่าที่ยังไม่มีรหัสเชื่อม → เติมในหน่วยความจำ (หน้าเว็บใช้รหัสเชื่อมได้เสมอ; ลงชีทจริงตอนมีการบันทึก)
  applyLegacyLinks(rawById, resolveLegacyLinks(rawById).patches);

  // สร้าง index ต้นทาง (CS) + ปลายทาง (downstream) จากข้อมูลในหน่วยความจำ (ไม่อ่านซ้ำ)
  const srcIdx = buildSourceIndex(rawById["04_CS_Import"] || [], rawById["05_CS_Export"] || []);
  const downIdx: DownIndex = {};
  for (const id of ["06_Shipping", "07_Transportation", "08_Warehouse"]) downIdx[id] = indexByCs(rawById[id] || []);
  const extraIdx = extraRowsByCs(rawById["09_Extra_Service"] || []);

  const modules: Record<string, JobRecord[]> = {};
  for (const m of ALL_MODULES) {
    let rows = rawById[m.id] || [];
    if (moduleHasPull(m)) rows = rows.map((r) => applyPull(m, r, srcIdx));
    else if (moduleHasRPull(m)) rows = rows.map((r) => applyRPull(m, r, downIdx));
    // CS Import/Export: โน้ตสรุปค่าใช้จ่ายจาก tab Extra (คำนวณสดทุกครั้ง ไม่เก็บในชีท)
    if (m.id === "04_CS_Import" || m.id === "05_CS_Export")
      rows = rows.map((r) => ({ ...r, extra_cost_note: composeExtraNote(extraIdx.get(r.__id)) }));
    // Export: ช่อง Data from Import อัปเดตสด (live) จาก Import ที่อ้างถึง (link_imp)
    if (m.id === "05_CS_Export") {
      rows = rows.map((r) => {
        if ((r.re_export || "") !== "Yes") return r;
        const hit = srcIdx.byId.get(linkOf(r, LINK_IMP));
        const imp = hit?.side === "imp" ? hit.rec : undefined;
        // Job Type ก็ sync จาก Import ด้วย (ช่องนี้ล็อกที่หน้า Export)
        return imp
          ? { ...r, job_type: (imp.job_type || "").trim(), data_from_import: composeDataFromImport(imp) }
          : r;
      });
    }
    modules[m.key] = rows;
  }
  const settings = all[SETTINGS_RANGE];
  const cell = (n: number) => settings?.[n - 1]?.[0] || "";
  return {
    modules,
    lists,
    collapse: parseJsonObject<CollapseConfig>(cell(SETTINGS_CELL.collapse), {}),
    carrierColors: parseJsonObject<CarrierColors>(cell(SETTINGS_CELL.carrierColors), { ...CARRIER_COLOR_SEED }),
    palette: parseColorTags(cell(SETTINGS_CELL.palette)),
    notes: parseJsonObject<ModuleNotes>(cell(SETTINGS_CELL.notes), {}),
    prefs: parseJsonObject<AllUserPrefs>(cell(SETTINGS_CELL.prefs), {}),
  };
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
  await ensureLinks();
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
    enforceReExport(m, final);
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
  await ensureLinks();
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
    const prev = existingById.get(rec.__id)!;
    const merged = { ...prev, ...rec } as JobRecord;
    const withRules = applyAutoRules(m, merged) as JobRecord;
    enforceReExport(m, withRules, prev);
    enforceEnd(m, withRules, endCtx);
    const values = recordToRow(m, withRules);
    // ค่าเหมือนเดิมทุกช่อง = ไม่ต้องเขียน (Sync/reconcile ส่งแถวเดิมมาเยอะ — ประหยัดโควต้าเขียน 60 ครั้ง/นาที)
    if (values.join("\u0000") !== recordToRow(m, prev).join("\u0000"))
      data.push({ range: `${m.id}!A${rowNum}:${lastCol(m)}${rowNum}`, values: [values] });
    out.push(withRules);
  }
  await batchWriteRanges(data);
  // reconcile เฉพาะแถวที่ช่องขับลิงก์เปลี่ยนจริง (แก้ remark/วันที่/status ฯลฯ ไม่ต้อง reconcile)
  if (reconcile) {
    const changed = out.filter((rec) => reconcileNeeded(m, existingById.get(rec.__id!), rec));
    if (changed.length) await reconcileLinks(m, changed, existingById);
  }
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

// ลบหลายแถวรวดเดียว (ไม่ cascade) — ใช้ในเส้น reconcile ที่ลบลูกหลายแถว
// อ่านคอลัมน์ __id รอบเดียว (cache hit ถ้า prime แล้ว) → batchClear 1 request แทน clearRange ทีละแถว
async function deleteRows(m: ModuleDef, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const idSet = new Set(ids);
  const col = await readRange(`${m.id}!A1:A`);
  const ranges: string[] = [];
  for (let i = 1; i < col.length; i++) {
    if (idSet.has(col[i]?.[0] || "")) ranges.push(`${m.id}!A${i + 1}:${lastCol(m)}${i + 1}`);
  }
  await batchClearRanges(ranges);
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

const MID_MODULE_IDS = ["06_Shipping", "07_Transportation", "08_Warehouse"];
const EXTRA_ID = "09_Extra_Service";
const ACC_ID = "10_Accounting";

// ช่องที่ "ขับ" การ reconcile (สร้าง/ลบ/อัปเดตโมดูลปลายทาง) ของแต่ละโมดูล
// ตอน UPDATE ถ้าไม่มีช่องพวกนี้เปลี่ยน = ไม่ต้อง reconcile (ลดจำนวน API call ต่อการเซฟมาก)
// โมดูลที่ไม่อยู่ใน map นี้ (Accounting/Rates) ไม่ต้อง reconcile อยู่แล้ว
const RECON_KEYS: Record<string, string[]> = {
  "04_CS_Import": ["re_export", "job_type", "shipping_flag", "transport_flag", "warehouse_flag", "extra_require", "extra_req_type", "imp_job_no"],
  "05_CS_Export": ["shipping_flag", "transport_flag", "warehouse_flag", "extra_require", "extra_req_type", "exp_job_no"],
  "06_Shipping": ["extra_require", "extra_req_type", "link_cs", "ship_pic", "ship_outsourcing"],
  "07_Transportation": ["extra_require", "extra_req_type", "link_cs", "trans_pic", "supp1", "supp2", "supp3", "supp1_fuel", "supp2_fuel", "supp3_fuel"],
  "08_Warehouse": ["extra_require", "extra_req_type", "link_cs", "wh_pic", "wh_supp1"],
  "09_Extra_Service": [
    "link_cs", "module", "extra_req_type", "supplier", "root_cause",
    "cost_unit", "cost_cur", "cost_qty", "cost_paid_to", "cost_input_status",
    "sell_unit", "sell_cur", "sell_qty", "sell_received_from", "sell_input_status",
  ],
};

function reconcileNeeded(m: ModuleDef, oldRec: JobRecord | undefined, newRec: JobRecord): boolean {
  const keys = RECON_KEYS[m.id];
  if (!keys) return false; // โมดูลนี้ไม่มี reconcile
  if (!oldRec) return true; // กันพลาด (ไม่พบของเดิม)
  return keys.some((k) => (oldRec[k] || "") !== (newRec[k] || ""));
}

// Supplier + Cost PIC ของแถว Extra ตามโมดูลต้นทาง (เติมตอนสร้าง)
function extraMetaFromSource(m: ModuleDef, rec: JobRecord): { supplier: string; cost_pic: string } {
  switch (m.id) {
    case "04_CS_Import": return { supplier: "", cost_pic: rec.im_cs || "" };
    case "05_CS_Export": return { supplier: "", cost_pic: rec.ex_cs || "" };
    case "06_Shipping": return { supplier: rec.ship_outsourcing || "", cost_pic: rec.ship_pic || "" };
    case "07_Transportation": {
      // ดึงชื่อ Trans Supp 1/2/3 — เฉพาะตัวที่กรอก Fuel Rate แล้ว (= supplier ที่ใช้จริง)
      const names = [1, 2, 3]
        .filter((n) => (rec[`supp${n}_fuel`] || "").toString().trim())
        .map((n) => (rec[`supp${n}`] || "").toString().trim())
        .filter(Boolean);
      return { supplier: names.join(", "), cost_pic: rec.trans_pic || "" };
    }
    case "08_Warehouse": return { supplier: rec.wh_supp1 || "", cost_pic: rec.wh_pic || "" };
    default: return { supplier: "", cost_pic: "" };
  }
}

// สรุปข้อมูลจาก CS Import สำหรับช่อง "Data from Import" ใน Export (read-only)
// แสดงตามรายการที่กำหนด: Job Type / IM/CS / Job No. / Customer Ref / Co-Agent / ETA(IMP) /
// Booking-MBL / HBL / จำนวนตู้ / Vessel / Term / CS Remark
export function composeDataFromImport(r: Partial<JobRecord>): string {
  const g = (k: string) => (r[k] ?? "").toString().trim();
  const conts = contLabel(r as Record<string, string>);
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

// Re-Export: CS Import re_export=Yes → สร้าง "แถวเปล่า" ใน CS Export
// ตามสเปก: กรอกแค่ EX/OPS Status=Open, Re-Export?=Yes, Data from Import, Job Create Date(auto)
// + Job Type (ดึงจาก Import — sync ตลอด/ล็อกที่หน้าจอ ให้เห็นว่าเป็นงาน Re-Export)
// ช่องอื่นว่างหมด — exp_job_no ก็ว่าง (ไม่ลิงก์กับ Import)
function reExportSeed(r: JobRecord): Partial<JobRecord> {
  return {
    ex_ops_status: "Open",
    re_export: "Yes",
    job_type: (r.job_type || "").trim(),
    data_from_import: composeDataFromImport(r),
  };
}

// ช่องที่ระบบเป็นคนใส่ให้ตอนสร้างแถว Export อัตโนมัติ (นอกเหนือจากนี้ = ผู้ใช้กรอกเอง)
const RE_EXPORT_SEED_KEYS = new Set([
  "ex_ops_status", "re_export", "job_type", "data_from_import", "created_at", "ended_at", LINK_IMP,
]);

// แถว Export ที่สร้างอัตโนมัติแล้วยัง "ไม่มีใครแตะ" (ยังเป็นแถวเปล่าตามที่ระบบ seed ไว้)
// ใช้ตัดสินว่าปลอดภัยที่จะลบทิ้งตอนเจอแถวซ้ำ (แถวที่ผู้ใช้กรอกข้อมูลแล้วจะไม่ถูกลบ)
function isUntouchedReExportRow(r: JobRecord): boolean {
  if (!["", "Open"].includes((r.ex_ops_status || "").trim())) return false;
  return EXPORT_MODULE.fields.every(
    (f) => RE_EXPORT_SEED_KEYS.has(f.key) || !String(r[f.key] ?? "").trim()
  );
}

// Sync Export ตาม Re-Export? ของ Import (จับคู่ด้วย link_imp = __id ของงาน Import)
// - re_export=Yes → ยังไม่มีแถว = สร้างใหม่ / มีแล้ว = **แก้แถวเดิม** (ห้ามสร้างซ้ำ)
// - re_export=No  → ลบแถว Export ที่เชื่อมกันอยู่ทิ้ง
// จับคู่ด้วยรหัส จึงไม่สนว่า Job No. จะถูกแก้หรือยังไม่ได้กรอก · หลายงานพร้อมกัน → เขียนรวดเดียว
async function reconcileReExport(recs: JobRecord[]): Promise<void> {
  const byImp = new Map<string, JobRecord[]>();
  for (const r of await rawList(EXPORT_MODULE))
    if ((r.re_export || "") === "Yes" && linkOf(r, LINK_IMP)) pushMap(byImp, linkOf(r, LINK_IMP), r);

  const toCreate: Partial<JobRecord>[] = [];
  const toUpdate: Partial<JobRecord>[] = [];
  const toDelete: string[] = [];
  for (const rec of recs) {
    const matches = byImp.get(rec.__id) || [];
    if ((rec.re_export || "") !== "Yes") {
      // Re-Export? กลับเป็น No → ลบรายการ Export ที่สร้างอัตโนมัติ
      matches.forEach((m) => toDelete.push(m.__id!));
      continue;
    }
    if (!matches.length) {
      toCreate.push({ ...reExportSeed(rec), [LINK_IMP]: rec.__id });
      continue;
    }
    // มีแถวอยู่แล้ว → อัปเดตแถวเดิม: Job Type + Data from Import ให้ตรงกับ Import ปัจจุบัน
    const keep = matches[0];
    const jt = (rec.job_type || "").trim();
    const readout = composeDataFromImport(rec);
    if ((keep.job_type || "").trim() !== jt || (keep.data_from_import || "") !== readout)
      toUpdate.push({ __id: keep.__id, job_type: jt, data_from_import: readout });
    // แถวซ้ำที่ค้างจากบั๊กเดิม → ลบเฉพาะแถวที่ยังไม่มีใครกรอกอะไร (แถวที่มีข้อมูลแล้วปล่อยไว้)
    matches.slice(1).filter(isUntouchedReExportRow).forEach((r) => toDelete.push(r.__id!));
  }
  await deleteRows(EXPORT_MODULE, toDelete);
  if (toUpdate.length) await updateJobs(EXPORT_MODULE, toUpdate, false);
  if (toCreate.length) await createJobs(EXPORT_MODULE, toCreate, false, false);
}

// Accounting real-time: ทุกงาน CS ต้องมีแถวใน 10 — ไม่มี extra=1 แถว, มี extra=แถวตาม 09
// สร้างที่ขาด + อัปเดตค่า AP/AR ที่ดึงจาก extra + ลบแถวที่ไม่มี extra คู่แล้ว
// แต่ละแถวผูกกับที่มาด้วย link_key (base / extra:<id> / fuel:<id>:<n>) — เปลี่ยนชื่อ Type/Supplier ก็ไม่หลุด
// รับหลายงานพร้อมกัน → ลบ/สร้าง/แก้ อย่างละครั้งเดียว (Sync ทั้งระบบไม่ชนโควต้าเขียน 60 ครั้ง/นาที)
async function reconcileAccounting(csIds: Iterable<string>): Promise<void> {
  const ids = new Set(Array.from(csIds).filter(Boolean));
  if (!ids.size) return;
  const ACC = MODULE_BY_ID[ACC_ID];
  const src = await getSourceIndex();
  const extrasByCs = new Map<string, JobRecord[]>();
  for (const e of await rawList(MODULE_BY_ID[EXTRA_ID]))
    if (ids.has(linkOf(e, LINK_CS))) pushMap(extrasByCs, linkOf(e, LINK_CS), e);
  const transByCs = new Map<string, JobRecord[]>();
  for (const t of await rawList(MODULE_BY_ID["07_Transportation"]))
    if (ids.has(linkOf(t, LINK_CS))) pushMap(transByCs, linkOf(t, LINK_CS), t);
  const accByCs = new Map<string, JobRecord[]>();
  for (const r of await rawList(ACC))
    if (ids.has(linkOf(r, LINK_CS))) pushMap(accByCs, linkOf(r, LINK_CS), r);

  const transLabel = EXTRA_MODULE_LABEL["07_Transportation"];
  const toCreate: Partial<JobRecord>[] = [];
  const toUpdate: Partial<JobRecord>[] = [];
  const toDelete: string[] = [];
  for (const csId of Array.from(ids)) {
    const hit = src.byId.get(csId);
    if (!hit) continue; // ไม่มีงาน CS แม่ → ไม่ต้องมี Accounting (แถวค้างถูกเก็บกวาดตอน Sync)
    const origin = csLabel(hit.side);
    const jobNo = linkOf(hit.rec, csJobNoKey(hit.side));

    interface Want { key: string; data: Partial<JobRecord> }
    const wants: Want[] = [];
    const extras = extrasByCs.get(csId) || [];
    if (extras.length === 0) {
      wants.push({ key: ACC_BASE_KEY, data: { module: origin, acc_job_status: "Open" } });
    } else {
      for (const e of extras) {
        wants.push({
          key: accExtraKey(e.__id),
          data: {
            module: e.module || origin,
            acc_job_status: "Open",
            supplier: e.supplier || "",
            ap_extra_req_type: e.extra_req_type || "",
            ap_paid_to: e.cost_paid_to || "",
            ap_root_cause: e.root_cause || "",
            ap_cost_unit: e.cost_unit || "",
            ap_cost_cur: e.cost_cur || "",
            ap_total_cost: String(numOf(e.cost_total_rate)),
            ar_received_from: e.sell_received_from || "",
            ar_sell_unit: e.sell_unit || "",
            ar_sell_cur: e.sell_cur || "",
            ar_total_sell: String(numOf(e.sell_total_rate)),
          },
        });
      }
    }
    // แถว Fuel Rate: Trans Supp ตัวไหนกรอก Fuel Rate ไว้ = 1 แถว AP ของตัวเอง (ไม่ผูกกับ Extra)
    // ช่วง Extra Root Cause → Received Ship Close Acc ใส่ N/A ทั้งหมด · ตาราง AR ไม่แสดงแถวนี้
    for (const t of transByCs.get(csId) || []) {
      for (const n of [1, 2, 3]) {
        const fuel = (t[`supp${n}_fuel`] || "").toString().trim();
        if (!fuel) continue;
        const name = (t[`supp${n}`] || "").toString().trim() || `Supp ${n}`;
        const data: Partial<JobRecord> = {
          module: transLabel,
          acc_job_status: "Open",
          supplier: name,
          ap_extra_req_type: ACC_FUEL_LABEL,
          ap_paid_to: name,
          ap_fuel_rate: fuel,
        };
        for (const k of ACC_FUEL_NA_KEYS) data[k] = ACC_FUEL_NA;
        wants.push({ key: accFuelKey(t.__id, n), data });
      }
    }
    const wantKeys = new Set(wants.map((w) => w.key));

    const existing = accByCs.get(csId) || [];
    const byKey = new Map<string, JobRecord>();
    for (const r of existing) byKey.set(linkOf(r, LINK_KEY), r);

    for (const w of wants) {
      const cur = byKey.get(w.key);
      if (!cur) toCreate.push({ job_no: jobNo, [LINK_CS]: csId, [LINK_KEY]: w.key, ...w.data });
      // refresh ค่าที่ดึงจาก extra (คงค่าที่กรอกเอง) — เฉพาะที่ค่าเปลี่ยนจริง
      else if (Object.entries(w.data).some(([k, v]) => (cur[k] ?? "") !== (v ?? "")))
        toUpdate.push({ __id: cur.__id, ...w.data });
    }
    // ลบแถว Accounting ที่ไม่มี extra/base/fuel คู่แล้ว + แถวซ้ำ key เดียวกัน
    for (const r of existing)
      if (!wantKeys.has(linkOf(r, LINK_KEY)) || byKey.get(linkOf(r, LINK_KEY)) !== r) toDelete.push(r.__id!);
  }
  await deleteRows(ACC, toDelete);
  if (toCreate.length) await createJobs(ACC, toCreate, true, false);
  if (toUpdate.length) await updateJobs(ACC, toUpdate, false);
}

// โมดูลปลายทางที่ผูกกับงาน CS ด้วย link_cs
const LINKED_JOB_MODULE_IDS = [...MID_MODULE_IDS, EXTRA_ID, ACC_ID];

// Job No. ที่ CS ถูกแก้ → อัปเดตสำเนา Job No. ในแถวลูกให้ตรง (ตัวเชื่อมจริงคือรหัส ไม่ได้เปลี่ยน —
// แค่ให้ค่าที่เก็บในชีทตรงกับหน้าเว็บ ซึ่งดึงสดจาก CS อยู่แล้ว) · jobNoByCs = __id งาน CS → เลขใหม่
async function syncJobNoCopies(jobNoByCs: Map<string, string>): Promise<void> {
  if (!jobNoByCs.size) return;
  for (const id of LINKED_JOB_MODULE_IDS) {
    const tm = MODULE_BY_ID[id];
    const rows = (await rawList(tm)).filter((r) => {
      const jn = jobNoByCs.get(linkOf(r, LINK_CS));
      return jn !== undefined && linkOf(r, "job_no") !== jn;
    });
    if (rows.length)
      await updateJobs(tm, rows.map((r) => ({ __id: r.__id, job_no: jobNoByCs.get(linkOf(r, LINK_CS))! })), false);
  }
}

// ปรับ record ปลายทางให้ตรงกับ flag/req type บนต้นทาง (เรียกหลัง create/update)
// - CS Import/Export: shipping/transport/warehouse_flag → สร้าง/ลบ record ใน 06/07/08 (1 แถว/งาน)
// - ทุกต้นทาง (04–08): extra_require + req type → สร้าง/ลบแถวใน 09 (ป้าย Module ตามต้นทาง)
// จับคู่ทุกอย่างด้วยรหัสเชื่อม — ยังไม่กรอก Job No. ก็สร้างแถวปลายทางได้เลย
// prevById = ค่าเดิมของแต่ละแถวก่อนบันทึก (มีเฉพาะเส้น update) — ใช้ดูว่า Job No. เปลี่ยนไหม
async function reconcileLinks(
  m: ModuleDef,
  saved: JobRecord[],
  prevById?: Map<string, JobRecord>
): Promise<void> {
  if (!saved.length) return;
  await primeWorkModules(); // ดึงชีทงานทั้งหมดรวดเดียว แล้วค่อยทำงานจาก cache
  const isCS = m.id === "04_CS_Import" || m.id === "05_CS_Export";
  const isMid = MID_MODULE_IDS.includes(m.id);

  // Extra (09) ถูกแก้ (Cost/Sell ลงค่า, Input Status) → คิด Extra Status ใหม่ + refresh Accounting
  if (m.id === EXTRA_ID) {
    const jobs = saved.map((r) => linkOf(r, LINK_CS));
    await syncExtraStatus(jobs);
    await reconcileAccounting(jobs);
    return;
  }
  if (!isCS && !isMid) return;

  // __id ของงาน CS แม่ของแต่ละแถวที่บันทึก
  const csIdOf = (rec: JobRecord) => (isCS ? rec.__id : linkOf(rec, LINK_CS));
  const jobNoOf = (rec: JobRecord) => linkOf(rec, isCS ? m.jobNoKey : "job_no");

  // ----- 0a) Job No. ที่ CS เปลี่ยน → อัปเดตสำเนา Job No. ในแถวลูก -----
  if (isCS && prevById) {
    const renamed = new Map<string, string>();
    for (const rec of saved) {
      const prev = prevById.get(rec.__id || "");
      if (prev && linkOf(prev, m.jobNoKey) !== jobNoOf(rec)) renamed.set(rec.__id, jobNoOf(rec));
    }
    await syncJobNoCopies(renamed);
  }

  // เก็บงาน CS ที่แตะ เพื่อ refresh Accounting ทีเดียวตอนท้าย
  const touched = new Set<string>();
  for (const rec of saved) {
    const cs = csIdOf(rec);
    if (cs) touched.add(cs);
  }

  // ----- 0) Re-Export (เฉพาะ CS Import): re_export=Yes → สร้าง Export -----
  if (m.id === "04_CS_Import") await reconcileReExport(saved);

  // ----- 1) CS: สร้าง/ลบ record เดี่ยวใน Shipping/Transport/Warehouse ตาม flag -----
  // ลบแบบ batch ต่อชีท + Extra ที่แถวเหล่านั้นสร้างไว้ (Accounting refresh รวมตอนท้าย)
  if (isCS) {
    const droppedMid = new Set<string>();
    for (const link of CS_FLAG_LINKS) {
      const targetM = MODULE_BY_ID[link.id];
      const byCs = new Map<string, JobRecord[]>();
      for (const r of await rawList(targetM)) {
        const c = linkOf(r, LINK_CS);
        if (c) pushMap(byCs, c, r);
      }
      const toCreate: Partial<JobRecord>[] = [];
      const toDelete: string[] = [];
      for (const rec of saved) {
        const existing = byCs.get(rec.__id) || [];
        if ((rec[link.flag] || "") === "Yes") {
          if (existing.length === 0)
            toCreate.push({ job_no: jobNoOf(rec), [LINK_CS]: rec.__id, [targetM.fields[0].key]: "Open" });
        } else {
          // flag→No: ลบ record ปลายทาง (+ Extra ของแถวนั้น ด้านล่าง)
          for (const e of existing) toDelete.push(e.__id!);
        }
      }
      await deleteRows(targetM, toDelete);
      toDelete.forEach((id) => droppedMid.add(id));
      if (toCreate.length) await createJobs(targetM, toCreate, true, false);
    }
    if (droppedMid.size) {
      const EXTRA = MODULE_BY_ID[EXTRA_ID];
      await deleteRows(
        EXTRA,
        (await rawList(EXTRA)).filter((r) => droppedMid.has(linkOf(r, LINK_SRC))).map((r) => r.__id!)
      );
    }
  }

  // ----- 2) Extra (09): สร้าง/ลบแถวตาม extra_require + req type ที่เลือก -----
  const label = EXTRA_MODULE_LABEL[m.id];
  if (label) {
    const EXTRA = MODULE_BY_ID[EXTRA_ID];
    const bySrc = new Map<string, JobRecord[]>();
    for (const r of await rawList(EXTRA)) {
      const src = linkOf(r, LINK_SRC);
      if (src) pushMap(bySrc, src, r);
    }
    const toCreate: Partial<JobRecord>[] = [];
    const toUpdate: Partial<JobRecord>[] = [];
    const toDelete: string[] = [];
    for (const rec of saved) {
      const csId = csIdOf(rec);
      if (!csId) continue; // แถวปลายทางที่ไม่มีงาน CS แม่ (กำพร้า) — ไม่สร้าง Extra ให้
      const meta = extraMetaFromSource(m, rec);
      const want =
        (rec.extra_require || "") === "Yes"
          ? new Set(splitTypes(rec.extra_req_type || ""))
          : new Set<string>();
      const have = new Set<string>();
      for (const e of bySrc.get(rec.__id) || []) {
        const t = e.extra_req_type || "";
        if (want.has(t) && !have.has(t)) {
          have.add(t); // เก็บอันที่ยังต้องการ (กันซ้ำ)
          // supplier/cost_pic เป็น auto — รีเฟรชให้ตรงต้นทางปัจจุบัน (เผื่อกรอก supplier ทีหลัง)
          if ((e.supplier || "") !== meta.supplier || (e.cost_pic || "") !== meta.cost_pic)
            toUpdate.push({ __id: e.__id, supplier: meta.supplier, cost_pic: meta.cost_pic });
        } else toDelete.push(e.__id!); // ไม่ต้องการแล้ว / ซ้ำ → ลบ (batch ทีเดียว)
      }
      for (const t of want) if (!have.has(t))
        toCreate.push({
          job_no: jobNoOf(rec), [LINK_CS]: csId, [LINK_SRC]: rec.__id,
          module: label, extra_req_type: t, extra_status: INPUT_STATUS_PENDING,
          supplier: meta.supplier, cost_pic: meta.cost_pic,
        });
    }
    await deleteRows(EXTRA, toDelete);
    if (toUpdate.length) await updateJobs(EXTRA, toUpdate, false);
    if (toCreate.length) await createJobs(EXTRA, toCreate, true, false);
  }

  // ----- 3) Accounting: ทุก job ต้องมีแถว (real-time) — ทุกงานรวดเดียว -----
  await reconcileAccounting(touched);
}

// cascade ลบปลายทางเมื่อลบงานต้นทาง (ผูกกับงาน CS ด้วยรหัสเชื่อม ไม่มีชีวิตอิสระ)
async function cascadeDelete(m: ModuleDef, rec: JobRecord): Promise<void> {
  const isCS = m.id === "04_CS_Import" || m.id === "05_CS_Export";
  const isMid = MID_MODULE_IDS.includes(m.id);
  if (!isCS && !isMid) return;
  await ensureLinks(); // แถวเก่าต้องมีรหัสเชื่อมก่อน ไม่งั้นลบตามไม่ครบ
  await primeWorkModules();

  const EXTRA = MODULE_BY_ID[EXTRA_ID];

  if (isCS) {
    // ลบ record ใน 06/07/08 + Extra + Accounting ทั้งหมดของงานนี้ (batch ต่อชีท)
    for (const id of LINKED_JOB_MODULE_IDS) {
      const tm = MODULE_BY_ID[id];
      await deleteRows(
        tm,
        (await rawList(tm)).filter((r) => linkOf(r, LINK_CS) === rec.__id).map((r) => r.__id!)
      );
    }
    // ลบงาน Export ที่เกิดจาก Re-Export? ของ Import ใบนี้
    // ใช้ deleteJob เพื่อให้ cascade ต่อไปถึงลูกของแถว Export นั้นด้วย
    if (m.id === "04_CS_Import") {
      for (const r of await rawList(EXPORT_MODULE))
        if ((r.re_export || "") === "Yes" && linkOf(r, LINK_IMP) === rec.__id)
          await deleteJob(EXPORT_MODULE, r.__id!);
    }
    return;
  }

  // isMid: ลบ Extra ที่แถวนี้สร้างไว้ แล้ว refresh Accounting ให้ตรง (batch)
  await deleteRows(
    EXTRA,
    (await rawList(EXTRA)).filter((r) => linkOf(r, LINK_SRC) === rec.__id).map((r) => r.__id!)
  );
  await reconcileAccounting([linkOf(rec, LINK_CS)]);
}

// เก็บกวาดแถว "กำพร้า" ในโมดูลต่อยอด (06/07/08/09/10) = แถวที่งาน CS แม่ไม่มีอยู่แล้ว
// (เกิดได้จากลบงาน CS ตอนระบบยังไม่ cascade / กรอกมือในชีทโดยตรง)
// + แถว Extra ที่แถวต้นทาง (06/07/08) ถูกลบไปแล้ว
// **ไม่แตะ 04_CS_Import / 05_CS_Export เด็ดขาด** — สองตัวนี้เป็นต้นทาง ไม่ใช่ของต่อยอด
async function purgeOrphans(): Promise<{ total: number; detail: string[] }> {
  const src = await getSourceIndex();
  const detail: string[] = [];
  let total = 0;
  // กันเคสอ่านต้นทางแล้วไม่เจองานเลย (ชีท CS ว่าง/ยังไม่ได้ตั้งค่า) — ไม่ลบอะไรทั้งนั้น
  if (src.byId.size === 0) return { total: -1, detail };
  // Job No. ของงาน CS ที่มีอยู่ — แถวที่ยังไม่มีรหัสเชื่อมแต่ Job No. ยังมีอยู่ = ไม่ลบ (ให้คนตรวจ)
  const csJobNos = new Set<string>();
  for (const { side, rec } of Array.from(src.byId.values())) {
    const j = linkOf(rec, csJobNoKey(side));
    if (j) csJobNos.add(j);
  }
  // __id ที่เป็นต้นทางของ Extra ได้ (งาน CS + แถว 06/07/08)
  const srcIds = new Set<string>(Array.from(src.byId.keys()));
  for (const id of MID_MODULE_IDS) for (const r of await rawList(MODULE_BY_ID[id])) srcIds.add(r.__id);

  for (const id of LINKED_JOB_MODULE_IDS) {
    const tm = MODULE_BY_ID[id];
    const dead = (await rawList(tm))
      .filter((r) => {
        const cs = linkOf(r, LINK_CS);
        if (!cs) return !csJobNos.has(linkOf(r, "job_no")); // ไม่มีรหัสเชื่อม + หางาน CS ไม่เจอ
        if (!src.byId.has(cs)) return true; // งาน CS แม่ถูกลบไปแล้ว
        const s = linkOf(r, LINK_SRC);
        return id === EXTRA_ID && !!s && !srcIds.has(s); // Extra ที่แถวต้นทางหายไปแล้ว
      })
      .map((r) => r.__id!);
    if (dead.length) {
      await deleteRows(tm, dead);
      total += dead.length;
      detail.push(`${tm.short} ${dead.length}`);
    }
  }
  return { total, detail };
}

// Sync / Backfill: เติมรหัสเชื่อมให้แถวเก่า + reconcile ทุกงานต้นทางใหม่ + ลบแถวต่อยอดที่ไม่มีงาน CS ผูกอยู่
// ปกติ reconcile ทำ real-time ตอนบันทึกอยู่แล้ว — ปุ่มนี้ไว้ซ่อม/เติมย้อนหลังกรณีข้อมูลหลุด sync
export async function syncAll(): Promise<{ message: string; reconciled: number; purged: number }> {
  const legacy = await ensureLinks(true);
  const dup = duplicateJobNoNotes(
    await rawList(IMPORT_MODULE),
    await rawList(EXPORT_MODULE)
  );
  const notes = [...dup, ...legacy];
  let n = 0;
  for (const id of ["04_CS_Import", "05_CS_Export", "06_Shipping", "07_Transportation", "08_Warehouse"]) {
    const m = MODULE_BY_ID[id];
    const rows = await rawList(m);
    if (rows.length) {
      await reconcileLinks(m, rows);
      n += rows.length;
    }
  }
  const purge = await purgeOrphans();
  const purgeMsg =
    purge.total < 0
      ? " · ข้ามการเก็บกวาด (ไม่พบงานที่ CS Import/Export เลย)"
      : purge.total
      ? ` · ลบรายการที่ไม่มี CS ผูกอยู่ ${purge.total} แถว (${purge.detail.join(", ")})`
      : " · ไม่พบรายการกำพร้า";
  const notesMsg = notes.length
    ? ` · ⚠️ ควรตรวจ ${notes.length} รายการ: ${notes.slice(0, 10).join(" / ")}${notes.length > 10 ? " / …" : ""}`
    : "";
  return {
    message: `Sync/Backfill เสร็จ — reconcile ${n} งานต้นทาง (Re-Export/Shipping/Transport/Warehouse/Extra/Accounting)${purgeMsg}${notesMsg}`,
    reconciled: n,
    purged: Math.max(0, purge.total),
  };
}

// หมายเหตุ: การ Initialize ชีท (สร้าง tab + หัวตาราง + seed dropdown) ย้ายไปทำที่
// PANEX_Initialize.gs (Google Apps Script) เท่านั้น — ฝั่งเว็บไม่มีปุ่ม Initialize แล้ว
