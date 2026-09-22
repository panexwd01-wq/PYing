import type { AllUserPrefs, ColorTag } from "./prefs";

export type JobRecord = Record<string, string> & { __id: string };

export type Lists = Record<string, string[]>;

// ข้อมูลทั้งระบบที่โหลดครั้งเดียว (โมดูล keyed ด้วย module.key + lists)
export interface Snapshot {
  modules: Record<string, JobRecord[]>;
  lists: Lists;
  collapse?: Record<string, string[]>; // moduleKey → field key ที่โชว์ตอนย่อ (ตั้งค่าส่วนกลาง)
  carrierColors?: Record<string, string>; // ค่าใน dropdown → สี hex (ระบายช่องที่ผูกกับ list นั้น)
  palette?: ColorTag[]; // ชุดสีกลาง + ความหมาย (ปุ่มเลือกสีข้างช่อง)
  notes?: Record<string, string>; // moduleKey → โน้ตส่วนกลางของ tab นั้น
  prefs?: AllUserPrefs; // userId → ตั้งค่าคอลัมน์ของบัญชีนั้น
}

export interface ApiError {
  error: string;
}
