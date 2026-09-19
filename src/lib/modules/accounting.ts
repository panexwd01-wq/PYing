import { Field } from "../fields";

// ===== 10_Accounting — ทุก Job ต้องมาโผล่ที่นี่ (สร้างอัตโนมัติเมื่อบันทึกงาน) =====
export const ACCOUNTING_FIELDS: Field[] = [
  // ----- Job Header -----
  { key: "acc_job_status", label: "ACC Job Status", group: "Job Header", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, summary: true, width: 130, help: "แก้หลัง End ต้องติดต่อ Supervisor" },
  { key: "acc_pic", label: "Acc PIC", group: "Job Header", type: "dropdown", list: "acc_pic", mandatory: true, sticky: true, summary: true, width: 120 },
  { key: "acc_approved_sts", label: "Acc Approved Sts", group: "Job Header", type: "dropdown", list: "approved_sts", mandatory: true, width: 130, help: "Approved ได้เมื่อ AP=Completed, AR=Paid, Cus Paid?=Done" },
  { key: "job_type", label: "Job Type", group: "Job Header", type: "auto", width: 120, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Header", type: "auto", summary: true, width: 130, pull: { imp: "imp_job_no", exp: "exp_job_no" }, help: "ดึงจากงาน CS แม่ (แก้ที่ CS เท่านั้น)" },
  { key: "booking_mbl", label: "Booking / MBL No. (IMP/EXP)", group: "Job Header", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer (IMP/EXP)", group: "Job Header", type: "auto", summary: true, width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "module", label: "Module", group: "Job Header", type: "auto", width: 140, help: "โมดูลต้นทางที่สร้างรายการ" },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Header", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "Job Header", type: "auto", width: 130, pull: { imp: "sales_bkg_by", exp: "sales_bkg_by" } },
  { key: "supplier", label: "Supplier", group: "Job Header", type: "auto", width: 150, help: "Supplier ของโมดูลต้นทาง (ถ้ามี)" },

  // ----- Accounts Receivable (AR) — ขึ้นก่อน AP ตามฟอร์มจริง -----
  { key: "ar_pic", label: "AR PIC", group: "Accounts Receivable (AR)", type: "dropdown", list: "ar_pic", mandatory: true, width: 120 },
  { key: "ar_received_from", label: "Received From", group: "Accounts Receivable (AR)", type: "auto", width: 150, help: "ดึงจากตาราง Sell ของ 09_Extra_Service" },
  { key: "customer_inv", label: "Customer INV", group: "Accounts Receivable (AR)", type: "text", mandatory: true, width: 160 },
  { key: "ar_qty", label: "Qty.", group: "Accounts Receivable (AR)", type: "number", mandatory: true, width: 90 },
  { key: "ar_unit", label: "Unit", group: "Accounts Receivable (AR)", type: "text", mandatory: true, width: 110 },
  { key: "ar_sell_unit", label: "Extra Sell Rate", group: "Accounts Receivable (AR)", type: "auto", width: 120, help: "Rate ในตาราง Sell ของ 09_Extra_Service" },
  { key: "ar_sell_cur", label: "Extra Sell Cur", group: "Accounts Receivable (AR)", type: "auto", width: 110 },
  { key: "ar_total_sell", label: "Extra Total Sell", group: "Accounts Receivable (AR)", type: "auto", width: 150, help: "= Total Rate ฝั่ง Sell ของ 09_Extra_Service" },
  { key: "billing_date", label: "Billing Date", group: "Accounts Receivable (AR)", type: "datetime", mandatory: true, width: 160 },
  { key: "cus_paid", label: "Cus Paid?", group: "Accounts Receivable (AR)", type: "dropdown", list: "done_pending", mandatory: true, width: 110 },
  { key: "cus_paid_date", label: "Cus Paid Date", group: "Accounts Receivable (AR)", type: "auto", width: 150, help: "Auto เมื่อ Cus Paid? = Done" },
  { key: "ar_remark", label: "AR Remark", group: "Accounts Receivable (AR)", type: "text", width: 170 },
  { key: "ar_status", label: "AR Status", group: "Accounts Receivable (AR)", type: "dropdown", list: "ar_status", mandatory: true, summary: true, width: 150 },

  // ----- Accounts Payable (AP) -----
  { key: "ap_extra_req_type", label: "Extra/Service Req Type", group: "Accounts Payable (AP)", type: "auto", width: 170, help: "ดึงจาก 09_Extra_Service" },
  { key: "ap_pic", label: "AP PIC", group: "Accounts Payable (AP)", type: "dropdown", list: "acc_pic", mandatory: true, width: 120 },
  { key: "ap_paid_to", label: "Paid To", group: "Accounts Payable (AP)", type: "auto", width: 150, help: "ดึงจากตาราง Job Cost ของ 09_Extra_Service (แถว Fuel = ชื่อ Supplier)" },
  { key: "supp_inv", label: "Supp INV (Free Text)", group: "Accounts Payable (AP)", type: "text", mandatory: true, width: 150 },
  { key: "ap_fuel_rate", label: "Fuel Rate", group: "Accounts Payable (AP)", type: "auto", width: 110, help: "ดึงจาก 07_Transportation ตาม Supplier ที่ใช้" },
  { key: "ap_root_cause", label: "Extra Root Cause", group: "Accounts Payable (AP)", type: "auto", width: 150 },
  { key: "ap_qty", label: "Qty.", group: "Accounts Payable (AP)", type: "number", mandatory: true, width: 90 },
  { key: "ap_unit", label: "Unit", group: "Accounts Payable (AP)", type: "text", mandatory: true, width: 110 },
  { key: "ap_cur", label: "CUR", group: "Accounts Payable (AP)", type: "dropdown", list: "currency", mandatory: true, width: 100 },
  { key: "ap_cost_unit", label: "Extra Cost Rate", group: "Accounts Payable (AP)", type: "auto", width: 120, help: "Rate ในตาราง Job Cost ของ 09_Extra_Service" },
  { key: "ap_cost_cur", label: "Extra Cost Cur", group: "Accounts Payable (AP)", type: "auto", width: 110 },
  { key: "ap_total_cost", label: "Extra Total Cost", group: "Accounts Payable (AP)", type: "auto", width: 150, help: "= Total Rate ฝั่ง Job Cost ของ 09_Extra_Service" },
  { key: "received_ship_close_acc", label: "Received Ship Close Acc", group: "Accounts Payable (AP)", type: "dropdown", list: "rcv_ship_close_acc", mandatory: true, width: 160 },
  { key: "ap_remark", label: "AP Remark", group: "Accounts Payable (AP)", type: "text", width: 170 },
  { key: "ap_status", label: "AP Status", group: "Accounts Payable (AP)", type: "dropdown", list: "ap_status", mandatory: true, summary: true, width: 150 },

  // ----- Closing -----
  { key: "acc_job_status_date", label: "ACC Job Status Date", group: "Accounting & Closing", type: "auto", width: 160, help: "Auto เมื่อ ACC Job Status = End" },
];

// คอลัมน์ของตาราง AR / AP ตอนกางดูราย Job (1 บรรทัด = 1 Extra/Service Req Type)
// คอลัมน์แรกของทั้งสองตาราง = Req Type (ap_extra_req_type) ล็อกไว้ · ที่เหลือกรอกราย Type
export const ACC_LINE_LEAD = "ap_extra_req_type";
export const ACC_LINE_COLUMNS = {
  ar: ["ar_pic", "ar_received_from", "customer_inv", "ar_qty", "ar_unit", "ar_sell_unit", "ar_sell_cur", "ar_total_sell", "billing_date", "cus_paid", "cus_paid_date", "ar_remark", "ar_status"],
  ap: ["ap_pic", "ap_paid_to", "supp_inv", "ap_fuel_rate", "ap_root_cause", "ap_qty", "ap_unit", "ap_cur", "ap_cost_unit", "ap_cost_cur", "ap_total_cost", "received_ship_close_acc", "ap_remark", "ap_status"],
} as const;

// ยอดรวมท้ายตาราง (คอลัมน์ที่บวกกันทั้ง Job)
export const ACC_LINE_SUMS = { ap: ["ap_total_cost"], ar: ["ar_total_sell"] } as const;

// ===== แถว Fuel Rate ของ Transport =====
// Trans Supp ตัวไหนกรอก Fuel Rate ไว้ → แยกเป็นแถว AP ของตัวเอง (ไม่ผูกกับ Extra)
// แถวพวกนี้เป็นรายการฝั่งจ่ายล้วน — ตาราง AR ไม่แสดง
export const ACC_FUEL_LABEL = "Transportation fee AP";
// ช่วง "Extra Root Cause → Received Ship Close Acc" ที่ต้องใส่ค่า N/A ในแถว Fuel
export const ACC_FUEL_NA_KEYS = [
  "ap_root_cause", "ap_qty", "ap_unit", "ap_cur",
  "ap_cost_unit", "ap_cost_cur", "ap_total_cost", "received_ship_close_acc",
] as const;
export const ACC_FUEL_NA = "N/A";
export const isFuelRow = (r: Record<string, string>) =>
  (r.ap_extra_req_type || "").trim() === ACC_FUEL_LABEL;
