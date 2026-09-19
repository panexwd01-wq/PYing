import { Field } from "../fields";

// ===== 09_Extra_Service — 1 แถวต่อ 1 รายการ Extra (split ตาม Req Type) =====
// หัว Job + Module/Supplier/Req Type = auto (ระบบเติมจากโมดูลที่ Extra/Service Require = Yes)
//
// การแสดงผลใน tab Extra: รวบเป็น 1 บรรทัดต่อ 1 Job No. (Req Type แสดงรวม)
// กด Expand = ตาราง Sell / Job Cost (1 บรรทัดต่อ 1 Type ทั้งสองฝั่ง) ตามฟอร์มเอกสารจริง
// ช่องของตารางนั้นตั้ง hidden ไว้ — เก็บเป็นคอลัมน์ในชีท แต่ไม่โผล่เป็นคอลัมน์ในตารางหลัก

// 1 ฝั่งของตาราง (sell / cost) — ต่างกันแค่คู่ค้า (Received From / Paid To)
const LINE_GROUP = "Extra Detail (ตาราง Sell / Job Cost)";

// ค่าของช่อง Input Status (ราย 1 บรรทัดในตาราง Sell / Job Cost)
// END เลือกได้เฉพาะเมื่อรายการที่ tab ต้นทาง (Shipping/Transport/Warehouse/CS) เป็น End แล้ว
// โมดูลต้นทาง → ป้าย "Module" ของแถว Extra (09) / Accounting (10)
// อยู่ที่นี่ (ไฟล์ pure) เพราะใช้ทั้งฝั่ง server (db.ts) และหน้าจอ (ModuleBoard เช็คต้นทาง End)
export const EXTRA_MODULE_LABEL: Record<string, string> = {
  "04_CS_Import": "FREIGHT IMPORT",
  "05_CS_Export": "FREIGHT EXPORT",
  "06_Shipping": "SHIPPING",
  "07_Transportation": "TRANSPORT",
  "08_Warehouse": "WAREHOUSE",
};
export const EXTRA_SOURCE_ID_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(EXTRA_MODULE_LABEL).map(([id, label]) => [label, id])
);

export const INPUT_STATUS_PENDING = "Pending";
export const INPUT_STATUS_END = "END";
export const INPUT_STATUS_OPTIONS = [INPUT_STATUS_PENDING, INPUT_STATUS_END];
export const isInputEnd = (v: unknown) =>
  String(v ?? "").trim().toUpperCase() === INPUT_STATUS_END;

export const EXTRA_FIELDS: Field[] = [
  // ----- Job Info -----
  // Extra Status = auto: Pending จนกว่าทุกบรรทัดของ Job นี้ (ทั้ง Sell และ Job Cost) จะเป็น END
  { key: "extra_status", label: "Extra Status", group: "Job Info", type: "auto", list: "im_ops_status", sticky: true, summary: true, width: 130, help: "อัตโนมัติ: End เมื่อ Input Status ของทุกบรรทัดในตาราง = END" },
  { key: "job_type", label: "Job Type", group: "Job Info", type: "auto", sticky: true, width: 130, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Info", type: "auto", sticky: true, summary: true, width: 130, pull: { imp: "imp_job_no", exp: "exp_job_no" }, help: "ดึงจากงาน CS แม่ (แก้ที่ CS เท่านั้น)" },
  { key: "booking_mbl", label: "Booking / MBL No. (IMP/EXP)", group: "Job Info", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer (IMP/EXP)", group: "Job Info", type: "auto", summary: true, width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Info", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "Job Info", type: "auto", width: 130, pull: { imp: "sales_bkg_by", exp: "sales_bkg_by" } },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "Job Info", type: "auto", width: 150, pull: { imp: "co_agent_carrier", exp: "co_agent_carrier" } },
  { key: "module", label: "Module", group: "Job Info", type: "auto", summary: true, width: 140, help: "โมดูลต้นทาง (FREIGHT IMPORT/EXPORT/SHIPPING/TRANSPORT/WAREHOUSE)" },
  { key: "supplier", label: "Supplier", group: "Job Info", type: "auto", width: 150, help: "Supplier ของโมดูลต้นทาง (ถ้ามี)" },
  { key: "extra_req_type", label: "Extra/Service Req Type", group: "Job Info", type: "auto", summary: true, width: 180, help: "ชนิด Extra จากโมดูลต้นทาง" },

  // ----- Cost Information (ตัวเลข + Cost Sts/Root Cause ย้ายไปอยู่ในตาราง Job Cost แล้ว) -----
  { key: "cost_pic", label: "Extra Cost PIC", group: "Cost Information", type: "auto", width: 130, help: "ดึงจาก PIC ผู้รับผิดชอบของโมดูลต้นทาง" },
  { key: "cost_remark", label: "Extra Cost Remark", group: "Cost Information", type: "text", width: 180 },
  { key: "cost_total", label: "Extra Cost Total", group: "Cost Information", type: "auto", width: 130, help: "= Total Rate (Qty. × Rate) ในตาราง Job Cost" },

  // ----- Selling Information (ตัวเลข + Profit Sts/No Charge Remark ย้ายไปอยู่ในตาราง Sell แล้ว) -----
  { key: "sell_pic", label: "Extra Sell PIC", group: "Selling Information", type: "dropdown", list: "sell_pic", mandatory: true, width: 130 },
  { key: "margin_total", label: "Extra Margin Total", group: "Selling Information", type: "auto", width: 140, help: "= Total Rate (Sell) − Total Rate (Job Cost)" },
  { key: "sell_sts", label: "Extra Sell Sts", group: "Selling Information", type: "dropdown", list: "complete_sts", mandatory: true, width: 120, help: "เลือกได้เมื่อมี Extra Profit Sts แล้ว" },
  { key: "sell_remark", label: "Extra Sell Remark", group: "Selling Information", type: "text", width: 180 },

  // ----- ตาราง Sell (แสดงตอน Expand เท่านั้น) -----
  { key: "sell_input_status", label: "Input Status", group: LINE_GROUP, type: "dropdown", list: "input_status", mandatory: true, width: 120, help: "Pending / END — END ได้เมื่อรายการที่ tab ต้นทางเป็น End แล้ว" },
  { key: "sell_qty", label: "Qty.", group: LINE_GROUP, type: "number", hidden: true },
  { key: "sell_unit_name", label: "Unit", group: LINE_GROUP, type: "dropdown", list: "unit_list", hidden: true },
  { key: "sell_unit", label: "Rate", group: LINE_GROUP, type: "number", hidden: true },
  { key: "sell_cur", label: "CUR", group: LINE_GROUP, type: "dropdown", list: "currency", hidden: true },
  { key: "sell_received_from", label: "Received From", group: LINE_GROUP, type: "dropdown", hidden: true, help: "Customer / Co-Agent / Carrier / Sales / BKG by" },
  { key: "sell_total_rate", label: "Total Rate", group: LINE_GROUP, type: "auto", hidden: true, help: "อัตโนมัติ = Qty. × Rate" },
  { key: "sell_total_cur", label: "CUR", group: LINE_GROUP, type: "dropdown", list: "currency", hidden: true, help: "สกุลเงินของยอด Total Rate" },
  { key: "profit_sts", label: "Extra Profit Sts", group: LINE_GROUP, type: "dropdown", list: "profit_sts", mandatory: true, summary: true, width: 140 },
  { key: "no_charge_remark", label: "Extra No Charge Remark", group: LINE_GROUP, type: "text", width: 180, help: "บังคับกรอกเมื่อ Profit Sts = No Charge" },

  // ----- ตาราง Job Cost (แสดงตอน Expand เท่านั้น) -----
  { key: "cost_input_status", label: "Input Status", group: LINE_GROUP, type: "dropdown", list: "input_status", mandatory: true, width: 120, help: "Pending / END — END ได้เมื่อรายการที่ tab ต้นทางเป็น End แล้ว" },
  { key: "cost_qty", label: "Qty.", group: LINE_GROUP, type: "number", hidden: true },
  { key: "cost_unit_name", label: "Unit", group: LINE_GROUP, type: "dropdown", list: "unit_list", hidden: true },
  { key: "cost_unit", label: "Rate", group: LINE_GROUP, type: "number", hidden: true },
  { key: "cost_cur", label: "CUR", group: LINE_GROUP, type: "dropdown", list: "currency", hidden: true },
  { key: "cost_paid_to", label: "Paid To", group: LINE_GROUP, type: "dropdown", hidden: true, help: "Transport Supplier / Warehouse Supplier" },
  { key: "cost_total_rate", label: "Total Rate", group: LINE_GROUP, type: "auto", hidden: true, help: "อัตโนมัติ = Qty. × Rate" },
  { key: "cost_total_cur", label: "CUR", group: LINE_GROUP, type: "dropdown", list: "currency", hidden: true, help: "สกุลเงินของยอด Total Rate" },
  { key: "cost_sts", label: "Extra Cost Sts", group: LINE_GROUP, type: "dropdown", list: "complete_sts", mandatory: true, width: 120 },
  { key: "root_cause", label: "Extra Root Cause", group: LINE_GROUP, type: "dropdown", list: "root_cause", width: 150 },

  // ----- Accounting & Closing -----
  { key: "ready_acc", label: "Ready Acc?", group: "Accounting & Closing", type: "auto", width: 120, help: "Done เมื่อ Cost/Sell Sts ครบ" },
  { key: "extra_status_date", label: "Extra Status Date", group: "Accounting & Closing", type: "auto", width: 160, help: "Auto เมื่อ Extra Status = End" },
];

// คีย์ของคอลัมน์ในตาราง Sell / Job Cost (เรียงตามฟอร์ม) — ใช้โดย ExtraLinesTable
// Total Rate = auto (Qty. × Rate) · CUR มี 2 ช่อง: ของ Rate และของยอด Total
export const EXTRA_LINE_COLUMNS = {
  sell: ["sell_input_status", "sell_qty", "sell_unit_name", "sell_unit", "sell_cur", "sell_received_from", "sell_total_rate", "sell_total_cur", "profit_sts", "no_charge_remark"],
  cost: ["cost_input_status", "cost_qty", "cost_unit_name", "cost_unit", "cost_cur", "cost_paid_to", "cost_total_rate", "cost_total_cur", "cost_sts", "root_cause"],
} as const;

// ช่อง Input Status ของแต่ละฝั่ง (ใช้คุมกฎ End ทั้งฝั่งเว็บและ server)
export const INPUT_STATUS_KEYS = ["sell_input_status", "cost_input_status"] as const;
