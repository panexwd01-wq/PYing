import { Field } from "../fields";

// ===== 09_Extra_Service — 1 แถวต่อ 1 รายการ Extra (split ตาม Req Type) =====
export const EXTRA_FIELDS: Field[] = [
  // ----- Job Info -----
  { key: "extra_status", label: "Extra Status", group: "Job Info", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130 },
  { key: "job_type", label: "Job Type", group: "Job Info", type: "auto", sticky: true, width: 130, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Info", type: "text", mandatory: true, sticky: true, width: 130, help: "กรอกเลขงาน แล้วกด Refresh" },
  { key: "booking_mbl", label: "Booking / MBL No.", group: "Job Info", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer", group: "Job Info", type: "auto", width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Info", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "Job Info", type: "auto", width: 130, pull: { imp: "sales_bkg_by", exp: "sales_bkg_by" } },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "Job Info", type: "auto", width: 150, pull: { imp: "co_agent_carrier", exp: "co_agent_carrier" } },
  { key: "module", label: "Module", group: "Job Info", type: "dropdown", list: "cost_module", width: 130, help: "โมดูลต้นทางของค่าใช้จ่าย" },
  { key: "supplier", label: "Supplier", group: "Job Info", type: "text", width: 150 },
  { key: "extra_req_type", label: "Extra/Service Req Type", group: "Job Info", type: "dropdown", list: "extra_service_type", width: 180 },

  // ----- Cost Information -----
  { key: "cost_pic", label: "Extra Cost PIC", group: "Cost Information", type: "dropdown", list: "cost_pic", width: 130 },
  { key: "count", label: "Count", group: "Cost Information", type: "number", width: 90 },
  { key: "unit", label: "Unit", group: "Cost Information", type: "dropdown", list: "unit_list", width: 110 },
  { key: "root_cause", label: "Extra Root Cause", group: "Cost Information", type: "dropdown", list: "root_cause", width: 150 },
  { key: "cost_remark", label: "Extra Cost Remark", group: "Cost Information", type: "text", width: 180 },
  { key: "cost_unit", label: "Extra Cost/Unit", group: "Cost Information", type: "number", width: 120 },
  { key: "cost_cur", label: "Extra Cost Cur", group: "Cost Information", type: "dropdown", list: "currency", width: 110 },
  { key: "cost_total", label: "Extra Cost Total", group: "Cost Information", type: "auto", width: 130, help: "Cost/Unit × Count" },
  { key: "cost_sts", label: "Extra Cost Sts", group: "Cost Information", type: "dropdown", list: "complete_sts", width: 120 },

  // ----- Selling Information -----
  { key: "sell_pic", label: "Extra Sell PIC", group: "Selling Information", type: "dropdown", list: "sell_pic", width: 130 },
  { key: "sell_unit", label: "Extra Sell/Unit", group: "Selling Information", type: "number", width: 120 },
  { key: "sell_cur", label: "Extra Sell Cur", group: "Selling Information", type: "dropdown", list: "currency", width: 110 },
  { key: "margin_total", label: "Extra Margin Total", group: "Selling Information", type: "auto", width: 140, help: "(Sell/Unit − Cost/Unit) × Count" },
  { key: "profit_sts", label: "Extra Profit Sts", group: "Selling Information", type: "dropdown", list: "profit_sts", width: 140 },
  { key: "no_charge_remark", label: "Extra No Charge Remark", group: "Selling Information", type: "text", width: 180, help: "บังคับกรอกเมื่อ Profit Sts = No Charge" },
  { key: "sell_sts", label: "Extra Sell Sts", group: "Selling Information", type: "dropdown", list: "complete_sts", width: 120 },
  { key: "sell_remark", label: "Extra Sell Remark", group: "Selling Information", type: "text", width: 180 },

  // ----- Accounting & Closing -----
  { key: "ready_acc", label: "Ready Acc?", group: "Accounting & Closing", type: "dropdown", list: "done_pending", width: 120 },
  { key: "extra_status_date", label: "Extra Status Date", group: "Accounting & Closing", type: "auto", width: 160, help: "Auto เมื่อ Extra Status = End" },
];
