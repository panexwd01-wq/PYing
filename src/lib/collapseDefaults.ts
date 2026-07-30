// ===== คอลัมน์ตั้งต้นของโหมดย่อ (ต่อโมดูล) =====
// ลำดับความสำคัญตอนแสดงผล: ค่าที่ตั้งไว้ใน _settings > ค่าตั้งต้นที่นี่ > field ที่ mark summary ใน fields.ts
// (ค่าที่นี่ = ค่าที่ใช้งานจริงอยู่ตอน 2026-07-30 — ปุ่ม "รีเซ็ต" ในหน้าตั้งค่าย่อจะกลับมาที่ชุดนี้)
// การเรียงคอลัมน์บนตารางยึดลำดับใน fields.ts เสมอ ไม่ใช่ลำดับในอาร์เรย์นี้
export const DEFAULT_COLLAPSE: Record<string, string[]> = {
  "cs-import": [
    "im_ops_status",
    "job_type",
    "im_cs",
    "eta_imp",
    "imp_job_no",
    "customer",
    "vessel",
    "freetime",
    "trans_supp1_del_addr", // เดิมตั้งไว้เป็น del_address (ช่องรวม) — ตอนนี้แยกต่อ supplier แล้ว
    "delivery_date",
  ],
  "cs-export": [
    "ex_ops_status",
    "job_type",
    "ex_cs",
    "etd_exp",
    "customer",
    "exp_job_no",
    "si_cut_off",
    "si_submit",
    "vgm_cut_off",
    "vgm_submit",
    "closing_time",
    "ex_doc_remark",
    "delivery_date",
  ],
  shipping: [
    "shipp_status",
    "job_type",
    "entry_pic",
    "job_no",
    "booking_mbl",
    "customer",
    "cs_note_ship",
    "entry_status",
    "clearance_date",
    "eta_imp",
    "etd_exp",
    "clearance_status",
  ],
  transport: [
    "trans_status",
    "job_type",
    "trans_pic",
    "job_no",
    "booking_mbl",
    "customer",
    "cs_note_trans",
    "clearance_date",
    "delivery_date",
    "supp1_del_addr", // เดิม del_address (ช่องรวม) — ตอนนี้แยกต่อ supplier
    "supp1",
    "supp2",
    "supp3",
    "trans_status_date",
  ],
  warehouse: [
    "wha_status",
    "job_type",
    "wh_pic",
    "job_no",
    "booking_mbl",
    "customer",
    "cs_note_wh",
    "delivery_date",
    "wh_actual_rcv",
    "actual_finished_date",
  ],
  extra: [
    "extra_status",
    "job_type",
    "job_no",
    "booking_mbl",
    "customer",
    "module",
    "supplier",
    "extra_req_type",
    "cost_pic",
    "root_cause",
    "cost_total",
    "margin_total",
    "no_charge_remark",
  ],
  accounting: [
    "acc_job_status",
    "acc_pic",
    "job_type",
    "job_no",
    "booking_mbl",
    "customer",
    "module",
    "supplier",
    "ap_extra_req_type",
    "ap_status",
    "ar_status",
  ],
};

// คอลัมน์ย่อที่ควรใช้ของโมดูลหนึ่ง (ยังไม่นับค่าที่ผู้ใช้ตั้งเองใน _settings)
// fallback = field ที่ mark summary ไว้ใน fields.ts (ใช้กับโมดูลที่ไม่ได้กำหนดไว้ เช่น หน้าเรท)
export function defaultCollapseKeys(moduleKey: string, summaryKeys: string[]): string[] {
  const preset = DEFAULT_COLLAPSE[moduleKey];
  return preset && preset.length ? preset : summaryKeys;
}
