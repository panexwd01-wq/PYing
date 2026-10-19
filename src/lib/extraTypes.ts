// Extra/Service Req Type เลือกรายการเดิมซ้ำได้ (เช่น OT-TRUCK หลายตู้ ส่งคนละวัน ค่าโอทีไม่เท่ากัน)
// รายการที่ซ้ำจะถูกเติมเลขต่อท้าย "OT-TRUCK #2", "OT-TRUCK #3" — ชื่อในช่องจึงไม่ซ้ำกันเลย
// ฝั่ง Extra / Accounting ที่แยกบรรทัดด้วยชื่อ Type จึงได้ 1 บรรทัดต่อ 1 รายการเหมือนเดิม
const DUP_SUFFIX = / #\d+$/;

// ชื่อ Type ตัดเลขลำดับออก (ใช้ตอนนับสถิติ — OT-TRUCK กับ OT-TRUCK #2 คือ Type เดียวกัน)
export function baseExtraType(t: string): string {
  return (t || "").trim().replace(DUP_SUFFIX, "");
}

// ชื่อสำหรับรายการที่กำลังเพิ่ม: ยังไม่มี = ชื่อเดิม · มีแล้ว = เติมเลขถัดไปที่ยังว่าง
export function nextExtraTypeLabel(selected: string[], option: string): string {
  const taken = new Set(selected);
  if (!taken.has(option)) return option;
  let n = 2;
  while (taken.has(`${option} #${n}`)) n++;
  return `${option} #${n}`;
}
