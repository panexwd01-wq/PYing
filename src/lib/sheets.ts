import { google, sheets_v4 } from "googleapis";

// ----- เชื่อม Google Sheets ด้วย Service Account (ฝั่ง server เท่านั้น) -----

let cached: sheets_v4.Sheets | null = null;

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

// อ่านค่าช่วงหนึ่ง -> matrix ของ string
export async function readRange(range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return (res.data.values as string[][]) || [];
}

export async function writeRange(range: string, values: (string | number)[][]) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
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
}

export async function clearRange(range: string) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSheetId(),
    range,
  });
}

// ดึงรายชื่อ tab + ขนาด
export async function getMeta() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties",
  });
  return res.data.sheets || [];
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
}
