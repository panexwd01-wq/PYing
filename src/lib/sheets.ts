import { AsyncLocalStorage } from "node:async_hooks";
import { google, sheets_v4 } from "googleapis";

// ----- เชื่อม Google Sheets ด้วย Service Account (ฝั่ง server เท่านั้น) -----

let cached: sheets_v4.Sheets | null = null;

// ===== cache ต่อ 1 คำขอ (ลดจำนวน API call) =====
// เก็บผล readRange + getMeta ไว้ในบริบท async เดียว (กัน request อื่นปน)
// - อ่านซ้ำชีทเดิม → ใช้ cache
// - เขียน/ลบ → ล้าง cache ของชีทนั้น (อ่านครั้งถัดไปได้ค่าล่าสุด)
interface SheetCtx {
  reads: Map<string, string[][]>;
  meta: sheets_v4.Schema$Sheet[] | null;
  metaPending?: Promise<sheets_v4.Schema$Sheet[]>; // กัน getMeta ยิงซ้ำตอนเรียกพร้อมกัน
}
const als = new AsyncLocalStorage<SheetCtx>();

// รันงานภายใต้ cache เดียว — เรียกซ้อนกันได้ (ใช้ cache ตัวนอกสุด)
export function withSheetCache<T>(fn: () => Promise<T>): Promise<T> {
  if (als.getStore()) return fn();
  return als.run({ reads: new Map(), meta: null }, fn);
}

const sheetOf = (range: string) => range.split("!")[0].replace(/^'|'$/g, "");

function invalidateSheet(range: string) {
  const ctx = als.getStore();
  if (!ctx) return;
  const sheet = sheetOf(range);
  for (const k of [...ctx.reads.keys()]) if (sheetOf(k) === sheet) ctx.reads.delete(k);
}

export function getSheetId(): string {
  const id = process.env.SHEET_ID;
  if (!id) throw new Error("ยังไม่ได้ตั้งค่า SHEET_ID ใน environment");
  return id;
}

export function getSheets(): sheets_v4.Sheets {
  if (cached) return cached;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY"
    );
  }
  // Vercel เก็บ newline เป็น \n -> ต้องแปลงกลับ
  key = key.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cached = google.sheets({ version: "v4", auth });
  return cached;
}

// อ่านค่าช่วงหนึ่ง -> matrix ของ string (cache ต่อคำขอ)
export async function readRange(range: string): Promise<string[][]> {
  const ctx = als.getStore();
  const hit = ctx?.reads.get(range);
  if (hit) return hit;
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const val = (res.data.values as string[][]) || [];
  ctx?.reads.set(range, val);
  return val;
}

// อ่านหลายช่วงพร้อมกันใน 1 request (ใช้ทำ snapshot ทั้งระบบ)
export async function batchGetRanges(ranges: string[]): Promise<string[][][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: getSheetId(),
    ranges,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const vr = res.data.valueRanges || [];
  return ranges.map((_, i) => (vr[i]?.values as string[][]) || []);
}

// เติม cache ล่วงหน้าด้วย batchGet ก้อนเดียว (แทน readRange ทีละชีทตอน reconcile)
// ดึงเฉพาะช่วงที่ยังไม่มีใน cache — ถ้าไม่มี ctx (ไม่ได้อยู่ใน withSheetCache) จะข้าม
export async function primeReadCache(ranges: string[]): Promise<void> {
  const ctx = als.getStore();
  if (!ctx) return;
  const need = ranges.filter((r) => !ctx.reads.has(r));
  if (!need.length) return;
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: getSheetId(),
    ranges: need,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const vr = res.data.valueRanges || [];
  need.forEach((range, i) => ctx.reads.set(range, (vr[i]?.values as string[][]) || []));
}

// ล้างหลายช่วงในคำสั่งเดียว (ลบหลายแถวรวดเดียว แทน clear ทีละแถว)
export async function batchClearRanges(ranges: string[]): Promise<void> {
  if (!ranges.length) return;
  const sheets = getSheets();
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: getSheetId(),
    requestBody: { ranges },
  });
  for (const r of ranges) invalidateSheet(r);
}

export async function writeRange(range: string, values: (string | number)[][]) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  invalidateSheet(range);
}

// เขียนหลายช่วงพร้อมกันในคำสั่งเดียว (ลดจำนวน API call ตอนบันทึกหลายแถว)
export async function batchWriteRanges(
  data: { range: string; values: (string | number)[][] }[]
) {
  if (!data.length) return;
  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: { valueInputOption: "RAW", data },
  });
  for (const d of data) invalidateSheet(d.range);
}

export async function appendRows(range: string, values: (string | number)[][]) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  invalidateSheet(range);
}

export async function clearRange(range: string) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSheetId(),
    range,
  });
  invalidateSheet(range);
}

// ดึงรายชื่อ tab + ขนาด (cache ต่อคำขอ — ensureSheet เรียกบ่อยมากใน rawList)
export async function getMeta() {
  const ctx = als.getStore();
  if (ctx?.meta) return ctx.meta;
  if (ctx?.metaPending) return ctx.metaPending; // มีคนกำลังดึงอยู่ → รอผลเดียวกัน
  const fetchMeta = async () => {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.get({
      spreadsheetId: getSheetId(),
      fields: "sheets.properties",
    });
    const list = res.data.sheets || [];
    if (ctx) {
      ctx.meta = list;
      ctx.metaPending = undefined;
    }
    return list;
  };
  const p = fetchMeta();
  if (ctx) ctx.metaPending = p;
  return p;
}

// สร้าง tab ถ้ายังไม่มี
export async function ensureSheet(title: string) {
  const meta = await getMeta();
  const exists = meta.some((s) => s.properties?.title === title);
  if (exists) return;
  const sheets = getSheets();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  // อัปเดต cache meta ให้เห็นชีทใหม่ (กัน ensureSheet ซ้ำสร้างซ้ำ)
  const ctx = als.getStore();
  if (ctx?.meta) ctx.meta.push({ properties: { title } });
}
