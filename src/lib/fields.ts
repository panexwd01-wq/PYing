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

// นิยามการดึงข้อมูลข้าม module โดยใช้ Job No. เป็น key
// - imp = คีย์ field ต้นทางในโมดูล CS Import (04)
// - exp = คีย์ field ต้นทางในโมดูล CS Export (05)
// ระบบจะเลือกใช้ imp/exp ตามว่า Job No. ของแถวนั้นไปเจอที่ฝั่งไหน
export interface PullSpec {
  imp?: string;
  exp?: string;
}

// ดึงย้อนกลับ: CS Import/Export ดึงค่าจากโมดูลปลายทาง (Shipping/Transport/Warehouse)
// โดยจับคู่ด้วย Job No. — from = id ของชีทต้นทาง, field = คีย์ในชีทนั้น
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
  help?: string;
  pull?: PullSpec; // ถ้ามี = ช่องนี้ถูกเติมอัตโนมัติจากโมดูลต้นทาง (CS Import/Export)
  rpull?: RPullSpec; // ถ้ามี = ช่องนี้ดึงย้อนจากโมดูลปลายทางด้วย Job No.
}

// คอลัมน์ภายใน (เก็บในชีท record คอลัมน์แรก) ใช้ผูก row -> ระเบียน
export const ID_KEY = "__id";

// คีย์ field ที่ใช้เป็น "เลขงาน" สำหรับเชื่อมข้าม module ในโมดูลปลายทาง
export const JOB_KEY = "job_no";
