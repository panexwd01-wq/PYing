// ===== อ่าน/เขียนไฟล์ .xlsx (ฝั่ง server เท่านั้น — exceljs ไม่เข้า client bundle) =====
import ExcelJS from "exceljs";
import { ModuleDef } from "./schema";
import { JobRecord } from "./types";
import { exportFields, headerLabels, headerToKey, importFields, identityKeys, sheetName } from "./xlsxSchema";

const HEAD_FILL = {
  mandatory: "FF4D94D8", // ฟ้า = ต้องกรอก
  auto: "FFBFBFBF", // เทา = auto (import ข้ามคอลัมน์นี้)
  normal: "FFFFF2CC",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Date → "YYYY-MM-DD HH:mm" (ตัดเวลาออกถ้าเป็น 00:00) ให้ตรงรูปแบบที่ระบบเก็บ
function fromDate(d: Date): string {
  const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.getHours() || d.getMinutes() ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}

// ค่าที่อ่านจาก cell ของ exceljs มีได้หลายรูปแบบ → ทำให้เป็น string เดียวเสมอ
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return fromDate(v);
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
  if (o.text !== undefined) return cellText(o.text);
  if (o.result !== undefined) return cellText(o.result); // สูตร → ใช้ผลลัพธ์
  if (o.error) return "";
  return String(v).trim();
}

// ---------- Export ----------
export async function buildWorkbook(m: ModuleDef, rows: JobRecord[]): Promise<Buffer> {
  const fields = exportFields(m);
  const heads = headerLabels(m);
  const wb = new ExcelJS.Workbook();
  wb.creator = "PANEX Mini ERP";
  const ws = wb.addWorksheet(sheetName(m), { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = fields.map((f, i) => ({
    header: heads[i],
    key: f.key,
    width: Math.min(60, Math.max(10, Math.round((f.width || 120) / 7))),
  }));

  const head = ws.getRow(1);
  fields.forEach((f, i) => {
    const c = head.getCell(i + 1);
    const color = f.type === "auto" ? HEAD_FILL.auto : f.mandatory ? HEAD_FILL.mandatory : HEAD_FILL.normal;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    c.font = { bold: true, size: 10 };
    c.alignment = { vertical: "middle", wrapText: true };
    const note = [f.help, f.type === "auto" ? "ช่องอัตโนมัติ — ตอน Import ระบบจะข้ามคอลัมน์นี้" : ""]
      .filter(Boolean)
      .join("\n");
    if (note) c.note = note;
  });
  head.height = 30;

  for (const r of rows) {
    const row = ws.addRow(
      fields.map((f) => {
        const v = (r[f.key] ?? "").toString();
        if (f.type === "number" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
        return v;
      })
    );
    fields.forEach((f, i) => {
      row.getCell(i + 1).alignment = { vertical: "top", wrapText: true };
    });
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: fields.length } };
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------- Import ----------
export interface ParsedRow {
  row: number; // เลขแถวจริงในไฟล์ (ไว้อ้างตอนรายงาน)
  ident: Record<string, string>; // ค่าคีย์ที่ใช้จับคู่ (อ่านทุกคอลัมน์ รวมช่อง auto)
  values: Record<string, string>; // ค่าที่จะเขียนจริง (เฉพาะช่องที่ import ได้)
}
export interface ParsedSheet {
  rows: ParsedRow[];
  unknownColumns: string[];
  ignoredAuto: number;
}

export async function parseWorkbook(m: ModuleDef, buf: Buffer): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets.find((w) => w.name === sheetName(m)) || wb.worksheets[0];
  if (!ws) throw new Error("ไฟล์นี้ไม่มีชีทข้อมูล");

  // แถวที่ 1 = หัวคอลัมน์ → จับคู่กับ field ด้วยชื่อหัว (สำรอง: label เปล่า / คีย์ภายใน)
  const byLabel = headerToKey(m);
  const importable = new Set(importFields(m).map((f) => f.key));
  const idKeys = new Set(identityKeys(m));

  const colKey: (string | null)[] = [];
  const unknownColumns: string[] = [];
  let ignoredAuto = 0;
  const head = ws.getRow(1);
  head.eachCell({ includeEmpty: false }, (cell, col) => {
    const raw = cellText(cell.value);
    if (!raw) return;
    const key = byLabel.get(raw.trim().toLowerCase()) || null;
    colKey[col] = key;
    if (!key) unknownColumns.push(raw);
    else if (!importable.has(key) && !idKeys.has(key)) ignoredAuto++;
  });
  if (!colKey.some(Boolean))
    throw new Error("อ่านหัวคอลัมน์ไม่ได้ — แถวแรกของไฟล์ต้องเป็นชื่อคอลัมน์ (ใช้ไฟล์ที่กด Export ออกไปจะชัวร์สุด)");

  const rows: ParsedRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNo) => {
    if (rowNo === 1) return;
    const ident: Record<string, string> = {};
    const values: Record<string, string> = {};
    let any = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = colKey[col];
      if (!key) return;
      const v = cellText(cell.value);
      if (v !== "") any = true;
      if (idKeys.has(key)) ident[key] = v;
      if (importable.has(key)) values[key] = v;
    });
    if (any) rows.push({ row: rowNo, ident, values });
  });
  return { rows, unknownColumns, ignoredAuto };
}
