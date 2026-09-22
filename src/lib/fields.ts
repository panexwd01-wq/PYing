// ชนิดของ field และโครงสร้างกลางที่ทุก module ใช้ร่วมกัน
// (แยกไฟล์นี้ออกจาก schema.ts เพื่อไม่ให้ import วน)

export type FieldType =
  | "text"
  | "number"
  | "dropdown"
  | "multiselect"
  | "toggle" // Yes/No -> ใช้ toggle แทน radio
  | "datetime"
  | "auto"; // ดึงจาก Module อื่น / มีสูตร -> read-only (เทา)

// นิยามการดึงข้อมูลข้าม module (จับคู่แถวแม่ด้วยรหัสเชื่อม link_cs — ดู LINK_CS ด้านล่าง)
// - imp = คีย์ field ต้นทางในโมดูล CS Import (04)
// - exp = คีย์ field ต้นทางในโมดูล CS Export (05)
// ระบบจะเลือกใช้ imp/exp ตามว่า Job No. ของแถวนั้นไปเจอที่ฝั่งไหน
export interface PullSpec {
  imp?: string;
  exp?: string;
}

// ดึงย้อนกลับ: CS Import/Export ดึงค่าจากโมดูลปลายทาง (Shipping/Transport/Warehouse)
// โดยจับคู่ด้วยรหัสเชื่อม (link_cs ของแถวปลายทาง = __id ของงาน CS) — from = id ของชีทต้นทาง, field = คีย์ในชีทนั้น
export interface RPullSpec {
  from: string;
  field: string;
}

export interface Field {
  key: string; // คีย์ภายใน (ใช้เป็น header ในชีท record)
  label: string; // ชื่อที่แสดง
  group: string; // กลุ่ม/section
  type: FieldType;
  mandatory?: boolean; // ฟ้า = ต้องกรอกเสมอ
  list?: string; // ชื่อ list ใน _lists (สำหรับ dropdown/multiselect)
  width?: number; // ความกว้างคอลัมน์ (px)
  sticky?: boolean; // ตรึงคอลัมน์ซ้าย
  summary?: boolean; // แสดงในโหมดย่อ (ที่เหลือซ่อนไว้ใต้ปุ่มกางรายละเอียด)
  help?: string;
  pull?: PullSpec; // ถ้ามี = ช่องนี้ถูกเติมอัตโนมัติจากโมดูลต้นทาง (CS Import/Export)
  rpull?: RPullSpec; // ถ้ามี = ช่องนี้ดึงย้อนจากโมดูลปลายทาง (จับคู่ด้วยรหัสเชื่อม)
  hidden?: boolean; // เก็บเป็นคอลัมน์ในชีทแต่ไม่แสดงในตาราง (เช่นช่องเก็บสีปุ่ม)
  internal?: boolean; // ช่องของระบบล้วน (รหัสเชื่อม) — ไม่แสดงที่ไหนเลย ไม่ออกไฟล์ Excel ไม่รับค่าจากหน้าเว็บ
  colorPick?: boolean; // ปุ่มเลือกสีข้างช่อง — เลือกจาก "ชุดสีกลาง" ที่ตั้งไว้ในหน้าตั้งค่า (เก็บใน <key>_color)
  range?: boolean; // datetime แบบเลือกช่วงวันที่ (เก็บ "YYYY-MM-DD ~ YYYY-MM-DD")
  dateOnly?: boolean; // datetime ที่เลือกได้แค่วันที่ (ไม่มีเวลา) — เก็บ "YYYY-MM-DD"
}

// คอลัมน์ภายใน (เก็บในชีท record คอลัมน์แรก) ใช้ผูก row -> ระเบียน
export const ID_KEY = "__id";

// คีย์ field "เลขงาน" ของโมดูลปลายทาง — ดึงมาแสดงจากงาน CS แม่เท่านั้น (ไม่ได้ใช้เป็นตัวเชื่อมแล้ว)
export const JOB_KEY = "job_no";

// ===== รหัสเชื่อมข้ามโมดูล (ซ่อน — ไม่มีบนหน้าเว็บ) =====
// ใช้ __id ที่ระบบสร้างเอง (ไม่ซ้ำ ไม่มีใครพิมพ์) แทน Job No. — แก้/พิมพ์ผิด/ยังไม่กรอก Job No. ก็ไม่หลุดเชื่อม
export const LINK_CS = "link_cs"; // 06–10: __id ของงาน CS แม่ (04 หรือ 05)
export const LINK_SRC = "link_src"; // 09: __id ของแถวต้นทางที่สร้างแถว Extra นี้ (04–08)
export const LINK_KEY = "link_key"; // 10: แถวนี้มาจากอะไร — "base" / "extra:<__id แถว Extra>" / "fuel:<__id แถว Transport>:<ลำดับ Supp>"
export const LINK_IMP = "link_imp"; // 05: __id ของงาน Import ที่สร้างแถว Export นี้ (Re-Export)
export const LINK_KEYS = [LINK_CS, LINK_SRC, LINK_KEY, LINK_IMP];
