// ===== เรียงตารางด้วยการคลิกหัวคอลัมน์ (ใช้ร่วมกันทุกตารางในระบบ) =====
// คลิก 1 = น้อย→มาก · คลิก 2 = มาก→น้อย · คลิก 3 = เลิกเรียง (กลับเป็นลำดับเดิม)
// ค่าว่างอยู่ท้ายเสมอ ไม่ว่าจะเรียงทางไหน (เหมือน Google Sheet)

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

// สถานะถัดไปเมื่อคลิกหัวคอลัมน์ key
export function nextSort(cur: SortState | null, key: string): SortState | null {
  if (!cur || cur.key !== key) return { key, dir: "asc" };
  if (cur.dir === "asc") return { key, dir: "desc" };
  return null;
}

// ตัวเลขล้วน (มีคอมม่า/ทศนิยม/ติดลบ/% ได้) → เทียบแบบตัวเลข
const NUM_RE = /^-?[\d,]*\.?\d+%?$/;
const toNum = (s: string) => parseFloat(s.replace(/[,%]/g, ""));

// ข้อความ: ไม่สนตัวพิมพ์เล็ก/ใหญ่ + เลขในข้อความเรียงแบบตัวเลข (A2 < A10) + เรียงภาษาไทยถูก
const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });

// เทียบค่าในช่อง 2 ค่า (ไม่รวมกรณีว่าง — sortRows จัดการเอง)
// วันที่ในระบบเก็บเป็น YYYY-MM-DD[ HH:mm] → เทียบเป็นข้อความก็เรียงถูกอยู่แล้ว
export function compareCell(a: string, b: string): number {
  if (NUM_RE.test(a) && NUM_RE.test(b)) return toNum(a) - toNum(b);
  return collator.compare(a, b);
}

// คืน array ใหม่ที่เรียงแล้ว (ไม่แตะ array เดิม) — sort = null คืนของเดิม
// get = ดึงค่าที่ใช้เรียงของแถวนั้น (ต้องเป็นค่าที่ "เห็นบนจอ" เช่นตัวเลขที่คำนวณแล้ว)
export function sortRows<T>(rows: T[], sort: SortState | null, get: (row: T, key: string) => unknown): T[] {
  if (!sort) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  const keyed = rows.map((r, i) => ({ r, i, v: String(get(r, sort.key) ?? "").trim() }));
  keyed.sort((x, y) => {
    if (!x.v && !y.v) return x.i - y.i;
    if (!x.v) return 1;
    if (!y.v) return -1;
    return compareCell(x.v, y.v) * dir || x.i - y.i; // ค่าเท่ากัน = คงลำดับเดิม
  });
  return keyed.map((x) => x.r);
}
