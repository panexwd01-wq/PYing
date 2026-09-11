import { AsyncLocalStorage } from "node:async_hooks";
import { google, sheets_v4 } from "googleapis";

// ----- เชื่อม Google Sheets ด้วย Service Account (ฝั่ง server เท่านั้น) -----

let cached: sheets_v4.Sheets | null = null;

// =====================================================================
// cache 2 ชั้น (ลดจำนวน API call — Google Sheets ตอบช้า ~0.3–3 วิ/ครั้ง)
//
// ชั้นที่ 1: cache ต่อ 1 คำขอ (AsyncLocalStorage) — อ่านซ้ำชีทเดิมในคำขอเดียวใช้ของเดิม
// ชั้นที่ 2: cache ข้ามคำขอ (ตัวแปรระดับ process, มีอายุ SHEET_CACHE_TTL_MS)
//   - เส้น "อ่านเพื่อแสดงผล" (snapshot / GET) ใช้ชั้นนี้ได้ → เปิดหน้า/รีเฟรชแทบไม่แตะ Google
//   - เส้น "เขียน" (withSheetCache(fn, { fresh: true })) ข้ามชั้นนี้ → อ่านค่าล่าสุดก่อน merge เสมอ
//   - เขียน/ลบชีทไหน → ล้าง cache ของชีทนั้นทั้ง 2 ชั้น (คนถัดไปอ่านได้ค่าใหม่ทันที)
//   - คำขอที่ยิงพร้อมกันหลายคน → รอผลจาก Google ก้อนเดียวกัน (ไม่ยิงซ้ำ)
//
// ข้อจำกัด: ถ้ารันหลาย instance (เช่น Vercel หลาย lambda) แต่ละ instance มี cache ของตัวเอง
// การเขียนจาก instance หนึ่งจะไปเห็นที่อีก instance ช้าสุดตาม TTL — ปุ่ม "รีเฟรช" ในหน้าเว็บ
// ยิง ?fresh=1 เพื่อบังคับอ่านใหม่ได้เสมอ · แก้ชีทตรงใน Google Sheet ก็เห็นภายใน TTL เช่นกัน
// =====================================================================
interface SheetCtx {
  reads: Map<string, string[][]>;
  fresh: boolean; // true = ห้ามใช้ cache ข้ามคำขอ (เส้นเขียน)
}
const als = new AsyncLocalStorage<SheetCtx>();

const num = (v: string | undefined, d: number) => {
  const n = parseInt(v || "", 10);
  return isNaN(n) || n < 0 ? d : n;
};
const READ_TTL = num(process.env.SHEET_CACHE_TTL_MS, 30_000); // ค่าที่อ่านจากชีท
const META_TTL = num(process.env.SHEET_META_TTL_MS, 5 * 60_000); // รายชื่อ tab (แทบไม่เปลี่ยน)

interface Entry {
  val: string[][];
  at: number;
}
const gReads = new Map<string, Entry>(); // range → ค่า
const gPending = new Map<string, Promise<string[][]>>(); // range → คำขอที่กำลังยิงอยู่
const gGen = new Map<string, number>(); // sheet → รุ่น (บวกทุกครั้งที่เขียน กันผลที่ค้างอยู่มาทับ)
let gMeta: { list: sheets_v4.Schema$Sheet[]; at: number } | null = null;
let gMetaPending: Promise<sheets_v4.Schema$Sheet[]> | null = null;

// รันงานภายใต้ cache เดียว — เรียกซ้อนกันได้ (ใช้ cache ตัวนอกสุด)
// fresh: true = เส้นเขียน (อ่านสดจาก Google ทุกชีทที่แตะ) — ซ้อนใน ctx เดิมจะยกระดับ ctx นั้นเป็น fresh
export function withSheetCache<T>(fn: () => Promise<T>, opts?: { fresh?: boolean }): Promise<T> {
  const cur = als.getStore();
  if (cur) {
    if (opts?.fresh) cur.fresh = true;
    return fn();
  }
  return als.run({ reads: new Map(), fresh: !!opts?.fresh }, fn);
}

// อนุญาตให้ใช้ cache ข้ามคำขอชั่วคราว (ใช้ตอนสร้าง snapshot ท้ายเส้นเขียน —
// ชีทที่เพิ่งเขียนถูกล้างจาก cache แล้วจึงถูกอ่านใหม่แน่นอน ชีทอื่นใช้ของเดิมได้)
export async function withGlobalCache<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = als.getStore();
  if (!ctx) return fn();
  const prev = ctx.fresh;
  ctx.fresh = false;
  try {
    return await fn();
  } finally {
    ctx.fresh = prev;
  }
}

// ล้าง cache ข้ามคำขอทั้งหมด (ปุ่มรีเฟรชแบบบังคับ)
export function invalidateAllCache(): void {
  for (const k of gReads.keys()) bumpGen(sheetOf(k));
  gReads.clear();
  gPending.clear();
  gMeta = null;
}

// ===== retry เมื่อชน quota (429) / server ไม่ว่าง (503) =====
// quota Sheets = 60 read/60 write ต่อนาที/ต่อ user แชร์กันทั้งทีม → เจอ 429 บ่อย
// exponential backoff + jitter ให้คำขอที่ชนรอแล้วลองใหม่แทนที่จะ error ทันที
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errCode(e: unknown): number | undefined {
  const err = e as {
    code?: number | string;
    status?: number;
    response?: { status?: number };
  };
  const raw = err?.response?.status ?? err?.status ?? err?.code;
  return typeof raw === "string" ? parseInt(raw, 10) : raw;
}

function isRetryable(e: unknown): boolean {
  const code = errCode(e);
  return code === 429 || code === 503;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let delay = 600;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= tries - 1 || !isRetryable(e)) throw e;
      await sleep(delay + Math.floor(Math.random() * 300)); // jitter กันชนพร้อมกัน
      delay = Math.min(delay * 2, 8000);
    }
  }
}

const sheetOf = (range: string) => range.split("!")[0].replace(/^'|'$/g, "");
const genOf = (sheet: string) => gGen.get(sheet) || 0;
const bumpGen = (sheet: string) => gGen.set(sheet, genOf(sheet) + 1);

// เขียน/ลบชีทไหน → ล้าง cache ของชีทนั้นทั้ง 2 ชั้น + ทิ้งคำขอที่ค้าง (ผลอาจเก่า)
function invalidateSheet(range: string) {
  const sheet = sheetOf(range);
  const ctx = als.getStore();
  if (ctx) for (const k of [...ctx.reads.keys()]) if (sheetOf(k) === sheet) ctx.reads.delete(k);
  for (const k of [...gReads.keys()]) if (sheetOf(k) === sheet) gReads.delete(k);
  for (const k of [...gPending.keys()]) if (sheetOf(k) === sheet) gPending.delete(k);
  bumpGen(sheet);
}

function gGet(range: string): string[][] | undefined {
  const hit = gReads.get(range);
  if (!hit) return undefined;
  if (Date.now() - hit.at > READ_TTL) {
    gReads.delete(range);
    return undefined;
  }
  return hit.val;
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

// ยิง batchGet จริง 1 ครั้งสำหรับหลาย range → เก็บลง cache ข้ามคำขอ + ลงทะเบียนเป็น pending
// ให้คำขออื่นที่มาระหว่างนี้รอผลเดียวกัน (ผลจะไม่ถูกเก็บถ้าชีทนั้นถูกเขียนระหว่างรอ)
async function fetchRanges(ranges: string[]): Promise<string[][][]> {
  const sheets = getSheets();
  const gens = ranges.map((r) => genOf(sheetOf(r)));
  const all = withRetry(() =>
    sheets.spreadsheets.values.batchGet({
      spreadsheetId: getSheetId(),
      ranges,
      valueRenderOption: "FORMATTED_VALUE",
    })
  ).then((res) => {
    const vr = res.data.valueRanges || [];
    return ranges.map((_, i) => (vr[i]?.values as string[][]) || []);
  });
  const per = ranges.map((_, i) => all.then((v) => v[i]));
  ranges.forEach((r, i) => gPending.set(r, per[i]));
  try {
    const vals = await all;
    const now = Date.now();
    ranges.forEach((r, i) => {
      if (genOf(sheetOf(r)) === gens[i]) gReads.set(r, { val: vals[i], at: now });
    });
    return vals;
  } finally {
    ranges.forEach((r, i) => {
      if (gPending.get(r) === per[i]) gPending.delete(r);
    });
  }
}

// อ่านค่าช่วงหนึ่ง -> matrix ของ string (ผ่าน cache ทั้ง 2 ชั้น)
export async function readRange(range: string): Promise<string[][]> {
  const ctx = als.getStore();
  const hit = ctx?.reads.get(range);
  if (hit) return hit;
  if (!ctx?.fresh) {
    const g = gGet(range);
    if (g) {
      ctx?.reads.set(range, g);
      return g;
    }
    const p = gPending.get(range);
    if (p) {
      const v = await p;
      ctx?.reads.set(range, v);
      return v;
    }
  }
  const [val] = await fetchRanges([range]);
  ctx?.reads.set(range, val);
  return val;
}

// เติม cache ล่วงหน้าด้วย batchGet ก้อนเดียว (แทน readRange ทีละชีท)
// ดึงเฉพาะช่วงที่ยังไม่มีใน cache (ชั้นไหนก็ได้ตามโหมด) — ช่วงที่คนอื่นกำลังดึงอยู่ก็รอผลนั้น
export async function primeReadCache(ranges: string[]): Promise<void> {
  const ctx = als.getStore();
  const need: string[] = [];
  const waits: Promise<void>[] = [];
  for (const r of Array.from(new Set(ranges))) {
    if (ctx?.reads.has(r)) continue;
    if (!ctx?.fresh) {
      const g = gGet(r);
      if (g) {
        ctx?.reads.set(r, g);
        continue;
      }
      const p = gPending.get(r);
      if (p) {
        waits.push(p.then((v) => void ctx?.reads.set(r, v)));
        continue;
      }
    }
    need.push(r);
  }
  if (need.length) {
    const vals = await fetchRanges(need);
    need.forEach((r, i) => ctx?.reads.set(r, vals[i]));
  }
  await Promise.all(waits);
}

// ล้างหลายช่วงในคำสั่งเดียว (ลบหลายแถวรวดเดียว แทน clear ทีละแถว)
export async function batchClearRanges(ranges: string[]): Promise<void> {
  if (!ranges.length) return;
  const sheets = getSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.batchClear({
      spreadsheetId: getSheetId(),
      requestBody: { ranges },
    })
  );
  for (const r of ranges) invalidateSheet(r);
}

export async function writeRange(range: string, values: (string | number)[][]) {
  const sheets = getSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    })
  );
  invalidateSheet(range);
}

// เขียนหลายช่วงพร้อมกันในคำสั่งเดียว (ลดจำนวน API call ตอนบันทึกหลายแถว)
export async function batchWriteRanges(
  data: { range: string; values: (string | number)[][] }[]
) {
  if (!data.length) return;
  const sheets = getSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: getSheetId(),
      requestBody: { valueInputOption: "RAW", data },
    })
  );
  for (const d of data) invalidateSheet(d.range);
}

export async function appendRows(range: string, values: (string | number)[][]) {
  const sheets = getSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    })
  );
  invalidateSheet(range);
}

export async function clearRange(range: string) {
  const sheets = getSheets();
  await withRetry(() =>
    sheets.spreadsheets.values.clear({
      spreadsheetId: getSheetId(),
      range,
    })
  );
  invalidateSheet(range);
}

// ดึงรายชื่อ tab + ขนาด (cache ข้ามคำขอ META_TTL — ensureSheet เรียกบ่อยมากใน rawList)
export async function getMeta(): Promise<sheets_v4.Schema$Sheet[]> {
  if (gMeta && Date.now() - gMeta.at <= META_TTL) return gMeta.list;
  if (gMetaPending) return gMetaPending; // มีคนกำลังดึงอยู่ → รอผลเดียวกัน
  const p = (async () => {
    const sheets = getSheets();
    const res = await withRetry(() =>
      sheets.spreadsheets.get({
        spreadsheetId: getSheetId(),
        fields: "sheets.properties",
      })
    );
    const list = res.data.sheets || [];
    gMeta = { list, at: Date.now() };
    return list;
  })();
  gMetaPending = p;
  try {
    return await p;
  } finally {
    if (gMetaPending === p) gMetaPending = null;
  }
}

// มี tab ชื่อนี้ไหม (จาก meta ที่ cache ไว้)
export async function sheetExists(title: string): Promise<boolean> {
  const meta = await getMeta();
  return meta.some((s) => s.properties?.title === title);
}

// สร้าง tab ถ้ายังไม่มี
export async function ensureSheet(title: string) {
  if (await sheetExists(title)) return;
  const sheets = getSheets();
  try {
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: getSheetId(),
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }],
        },
      })
    );
  } catch (e) {
    // meta ที่ cache ไว้เก่า (มีคนสร้าง tab นี้ไปแล้วจากที่อื่น) → ถือว่ามีแล้ว
    if (errCode(e) !== 400) throw e;
  }
  // อัปเดต cache meta ให้เห็นชีทใหม่ (กัน ensureSheet ซ้ำสร้างซ้ำ)
  if (gMeta && !gMeta.list.some((s) => s.properties?.title === title))
    gMeta.list.push({ properties: { title } });
}
