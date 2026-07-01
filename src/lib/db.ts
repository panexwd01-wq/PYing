import {
  ALL_LISTS,
  DATA_SHEET,
  DB_SHEET,
  FIELDS,
  ID_KEY,
  LIST_SEED,
  RECORD_HEADERS,
} from "./schema";
import { JobRecord, Lists } from "./types";
import {
  appendRows,
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

const LAST_COL = colLetter(RECORD_HEADERS.length); // คอลัมน์สุดท้ายของ record

// ===== _database : เก็บ list แบบบล็อก (เว้น 1 คอลัมน์คั่นแต่ละ list) =====

export async function readLists(): Promise<Lists> {
  await ensureSheet(DB_SHEET); // กันกรณี tab ยังไม่ถูกสร้าง (อ่าน range ของ tab ที่ไม่มีจะ error)
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
  // เติม list ที่นิยามไว้แต่ยังไม่มีในชีท ให้เป็น array ว่าง
  for (const k of ALL_LISTS) if (!(k in out)) out[k] = [];
  return out;
}

// เขียน list ทั้งหมดกลับ โดยวางเป็นบล็อก list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น
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

// ===== record CRUD =====

function rowToRecord(headers: string[], row: string[]): JobRecord {
  const rec: Record<string, string> = {};
  headers.forEach((h, i) => (rec[h] = row[i] ?? ""));
  return rec as JobRecord;
}

function recordToRow(rec: Partial<JobRecord>): string[] {
  return RECORD_HEADERS.map((h) => (rec[h] ?? "").toString());
}

// ใส่วันที่ปิดงานอัตโนมัติเมื่อ Status = End
function applyAutoRules(rec: Partial<JobRecord>): Partial<JobRecord> {
  const next = { ...rec };
  if ((next.im_ops_status || "") === "End") {
    if (!next.im_ops_status_date) {
      next.im_ops_status_date = nowStamp();
    }
  } else {
    next.im_ops_status_date = "";
  }
  return next;
}

function nowStamp(): string {
  // เก็บเป็น yyyy-MM-dd HH:mm (24h) — เวลาเซิร์ฟเวอร์ UTC, แสดงผลฝั่ง client
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

export async function ensureDataSheet(): Promise<void> {
  await ensureSheet(DATA_SHEET);
  const rows = await readRange(`${DATA_SHEET}!A1:${LAST_COL}1`);
  const header = rows[0] || [];
  const needHeader = header.join("|") !== RECORD_HEADERS.join("|");
  if (needHeader) {
    await writeRange(`${DATA_SHEET}!A1`, [RECORD_HEADERS]);
  }
}

export async function listJobs(): Promise<JobRecord[]> {
  await ensureSheet(DATA_SHEET); // กันกรณี tab ยังไม่ถูกสร้าง
  const rows = await readRange(`${DATA_SHEET}!A1:${LAST_COL}`);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).filter((r) => (r[0] || "").trim() !== "").map((r) => rowToRecord(headers, r));
}

function genId(): string {
  // id แบบสั้น เรียงตามเวลา
  const d = new Date();
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  return `J${d.getTime().toString(36)}${rand}`;
}

export async function createJob(rec: Partial<JobRecord>): Promise<JobRecord> {
  await ensureDataSheet();
  const withId = applyAutoRules({ ...rec, __id: rec.__id || genId() });
  await appendRows(`${DATA_SHEET}!A1`, [recordToRow(withId)]);
  return withId as JobRecord;
}

// หาเลขแถวจริงในชีทจาก __id
async function findRowNumber(id: string): Promise<number | null> {
  const rows = await readRange(`${DATA_SHEET}!A1:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] || "") === id) return i + 1; // 1-indexed + header
  }
  return null;
}

export async function updateJob(rec: Partial<JobRecord>): Promise<JobRecord> {
  const [saved] = await updateJobs([rec]);
  return saved;
}

// อัปเดตหลายระเบียนในครั้งเดียว: อ่านชีทรอบเดียว แล้วเขียนแบบ batch
// - merge กับข้อมูลเดิม เพื่อกัน field ที่ client ไม่ได้ส่งมาโดนเขียนทับด้วยค่าว่าง
export async function updateJobs(
  recs: Partial<JobRecord>[]
): Promise<JobRecord[]> {
  if (!recs.length) return [];
  const rows = await readRange(`${DATA_SHEET}!A1:${LAST_COL}`);
  const headers = rows[0] || RECORD_HEADERS;
  const rowNumById = new Map<string, number>(); // __id -> เลขแถวจริงในชีท
  const existingById = new Map<string, JobRecord>();
  for (let i = 1; i < rows.length; i++) {
    const id = (rows[i]?.[0] || "").trim();
    if (!id) continue;
    rowNumById.set(id, i + 1);
    existingById.set(id, rowToRecord(headers, rows[i]));
  }

  const data: { range: string; values: string[][] }[] = [];
  const out: JobRecord[] = [];
  for (const rec of recs) {
    if (!rec.__id) throw new Error("ไม่มี __id สำหรับอัปเดต");
    const rowNum = rowNumById.get(rec.__id);
    if (!rowNum) throw new Error(`ไม่พบระเบียนที่ต้องการแก้ไข (${rec.__id})`);
    const merged = { ...existingById.get(rec.__id), ...rec };
    const withRules = applyAutoRules(merged);
    data.push({
      range: `${DATA_SHEET}!A${rowNum}:${LAST_COL}${rowNum}`,
      values: [recordToRow(withRules)],
    });
    out.push(withRules as JobRecord);
  }
  await batchWriteRanges(data);
  return out;
}

export async function deleteJob(id: string): Promise<void> {
  const rowNum = await findRowNumber(id);
  if (!rowNum) return;
  // เคลียร์ทั้งแถว (คงโครงสร้างชีท ไม่ขยับ index แถวอื่น)
  await clearRange(`${DATA_SHEET}!A${rowNum}:${LAST_COL}${rowNum}`);
}

// initialize: สร้าง/รีเซ็ตหัวตาราง + seed dropdown
export async function initializeWorkbook(): Promise<{ message: string }> {
  await ensureDataSheet();
  await seedListsIfEmpty();
  return { message: "ตั้งค่าชีทเรียบร้อย (หัวตาราง + dropdown ตั้งต้น)" };
}
