export type JobRecord = Record<string, string> & { __id: string };

export type Lists = Record<string, string[]>;

// ข้อมูลทั้งระบบที่โหลดครั้งเดียว (โมดูล keyed ด้วย module.key + lists)
export interface Snapshot {
  modules: Record<string, JobRecord[]>;
  lists: Lists;
}

export interface ApiError {
  error: string;
}
