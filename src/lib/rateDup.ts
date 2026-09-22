// ===== กันข้อมูลซ้ำในตารางเรท (หน้า Rate) =====
// "ซ้ำ" = ทุกช่องที่กรอกตรงกันหมด ยกเว้น Remarks / Conditions และช่องที่ระบบเติมให้เอง (auto)
// ใช้ทั้งตอนกดเพิ่มเรททีละรายการ และตอนนำเข้าไฟล์ Excel
import { ModuleDef } from "./schema";

// ช่องที่ไม่เอามานับว่าซ้ำ
const IGNORE = new Set(["remarks_conditions"]);

export function rateDupFields(m: ModuleDef): string[] {
  return m.fields.filter((f) => f.type !== "auto" && !f.internal && !IGNORE.has(f.key)).map((f) => f.key);
}

// คีย์เปรียบเทียบ — ตัดช่องว่างหัวท้าย + ไม่สนตัวพิมพ์ใหญ่เล็ก
export function rateDupKey(m: ModuleDef, rec: Record<string, string>): string {
  return rateDupFields(m)
    .map((k) => (rec[k] || "").trim().toLowerCase())
    .join("\u0001");
}

// แถวที่ยังไม่ได้กรอกอะไรเลย ไม่ต้องเตือนว่าซ้ำ
export function rateDupKeyOrNull(m: ModuleDef, rec: Record<string, string>): string | null {
  const key = rateDupKey(m, rec);
  return key.replace(/\u0001/g, "").trim() ? key : null;
}
