export type JobRecord = Record<string, string> & { __id: string };

export type Lists = Record<string, string[]>;

// ข้อมูลทั้งระบบที่โหลดครั้งเดียว (โมดูล keyed ด้วย module.key + lists)
export interface Snapshot {
  modules: Record<string, JobRecord[]>;
  lists: Lists;
  collapse?: Record<string, string[]>; // moduleKey → field key ที่โชว์ตอนย่อ (ตั้งค่าส่วนกลาง)
}

export interface ApiError {
  error: string;
}
