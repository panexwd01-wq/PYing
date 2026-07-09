import { Field } from "../fields";

// ===== 05_CS_Export — ตรงตาม requirement (Google Sheet ล่าสุด) =====
export const EXPORT_FIELDS: Field[] = [
  // ----- OPS -----
  { key: "ex_ops_status", label: "EX/OPS Status", group: "OPS", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130, help: "กด End ต้องผ่านเงื่อนไขครบ · แก้หลัง End ต้องติดต่อ Supervisor" },
  { key: "job_type", label: "Job Type", group: "OPS", type: "dropdown", list: "job_type", mandatory: true, sticky: true, width: 140 },
  { key: "re_export", label: "Re-Export?", group: "OPS", type: "auto", sticky: true, width: 100, help: "Auto = Yes ถ้าถูกสร้างจาก CS Import (Re-Export? = Yes) — แก้เองไม่ได้" },
  { key: "ex_cs", label: "EX/CS", group: "OPS", type: "dropdown", list: "ex_cs", mandatory: true, width: 110 },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "OPS", type: "dropdown", list: "sales", mandatory: true, width: 130 },
  { key: "etd_exp", label: "ETD (EXP)", group: "OPS", type: "datetime", width: 160 },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "OPS", type: "dropdown", list: "carrier", width: 150 },
  { key: "customer", label: "Customer", group: "OPS", type: "dropdown", list: "customer", width: 150 },
  { key: "exp_booking_mbl", label: "EXP/Booking / MBL No.", group: "OPS", type: "text", width: 170 },
  { key: "exp_hbl", label: "EXP/HBL No.", group: "OPS", type: "text", width: 140 },
  { key: "exp_job_no", label: "EXP/Job No.", group: "OPS", type: "text", sticky: true, width: 130 },
  { key: "pol", label: "POL", group: "OPS", type: "dropdown", list: "pol", width: 110 },
  { key: "pod", label: "POD", group: "OPS", type: "dropdown", list: "pod", width: 110 },
  { key: "cnt_4w", label: "4W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_6w", label: "6W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_10w", label: "10W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_20gp", label: "20GP", group: "OPS", type: "number", width: 70 },
  { key: "cnt_40hq", label: "40HQ", group: "OPS", type: "number", width: 70 },
  { key: "cy_date", label: "1st CY DATE", group: "OPS", type: "datetime", width: 150 },
  { key: "return_date", label: "1st Return DATE", group: "OPS", type: "datetime", width: 150 },
  { key: "vessel", label: "Vessel", group: "OPS", type: "text", width: 140 },
  { key: "term", label: "Term", group: "OPS", type: "dropdown", list: "term", width: 100 },
  { key: "ex_cs_remark", label: "EXP/CS Remark", group: "OPS", type: "text", width: 200 },
  { key: "cargo_type", label: "Cargo Type", group: "OPS", type: "dropdown", list: "cargo_type", mandatory: true, width: 130 },

  // ----- Documentation -----
  { key: "ex_doc", label: "EX/DOC", group: "Documentation", type: "dropdown", list: "ex_doc", mandatory: true, width: 110 },
  { key: "si_cut_off", label: "SI Cut Off", group: "Documentation", type: "datetime", width: 160 },
  { key: "si_submit", label: "SI Submit", group: "Documentation", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "vgm_cut_off", label: "VGM Cut Off", group: "Documentation", type: "datetime", width: 160 },
  { key: "vgm_submit", label: "VGM Submit", group: "Documentation", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "closing_time", label: "CLOSING TIME", group: "Documentation", type: "datetime", width: 160 },
  { key: "sent_pre_alert", label: "Sent Pre-Alert", group: "Documentation", type: "dropdown", list: "done_pending", width: 120 },
  { key: "exp_customer_ref", label: "EXP Customer Ref / No.", group: "Documentation", type: "text", width: 150 },
  { key: "ex_doc_remark", label: "EX/DOC Remark", group: "Documentation", type: "text", width: 200 },

  // ----- Extra / Service -----
  { key: "extra_require", label: "(EXP) Extra/Service Require", group: "Extra / Service", type: "toggle", mandatory: true, width: 150, help: "Yes แล้วต้องเลือก Type อย่างน้อย 1" },
  { key: "extra_req_type", label: "(EXP) Extra/Service Type", group: "Extra / Service", type: "multiselect", list: "extra_service_type", width: 200 },

  // ----- Shipping (auto = ดึงย้อนจาก 06_Shipping) -----
  { key: "shipping_flag", label: "Shipping?", group: "Shipping", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Shipping" },
  { key: "clearance_date", label: "Clearance Date", group: "Shipping", type: "datetime", width: 160 },
  { key: "clearance_pending_reason", label: "Clearance Pending Reason", group: "Shipping", type: "auto", width: 170, rpull: { from: "06_Shipping", field: "clearance_pending_reason" } },
  { key: "shipp_extra_type", label: "(SHIPP) Extra/Service Type", group: "Shipping", type: "auto", width: 170, rpull: { from: "06_Shipping", field: "extra_req_type" } },
  { key: "clearance_end_date", label: "Clearance Status End Date", group: "Shipping", type: "auto", width: 160, rpull: { from: "06_Shipping", field: "clearance_end_date" } },
  { key: "cs_note_ship", label: "Cs Note for Ship Pic", group: "Shipping", type: "text", mandatory: true, width: 180 },
  { key: "ship_outsourcing", label: "Ship Outsourcing", group: "Shipping", type: "auto", width: 150, rpull: { from: "06_Shipping", field: "ship_outsourcing" } },

  // ----- Transport -----
  { key: "transport_flag", label: "Transport?", group: "Transport", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Transport" },
  { key: "del_address", label: "Del Address", group: "Transport", type: "dropdown", list: "del_address", width: 150 },
  { key: "delivery_date", label: "Delivery / Loading Date", group: "Transport", type: "datetime", width: 170 },
  { key: "trans_extra_type", label: "(TRANS) Extra/Service require ?", group: "Transport", type: "auto", width: 170, rpull: { from: "07_Transportation", field: "extra_req_type" } },
  { key: "trans_supp1", label: "Trans Supp 1", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140, help: "Supp 1/2/3 ห้ามซ้ำกัน" },
  { key: "trans_supp1_vol", label: "Trans Supp 1 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp1_sts", label: "Trans Supp 1 Sts", group: "Transport", type: "auto", width: 120, rpull: { from: "07_Transportation", field: "supp1_sts" } },
  { key: "trans_supp1_end", label: "Trans Supp 1 End Date", group: "Transport", type: "auto", width: 150, rpull: { from: "07_Transportation", field: "supp1_end" } },
  { key: "trans_supp1_pending", label: "Trans Supp1 Pending Reason", group: "Transport", type: "auto", width: 160, rpull: { from: "07_Transportation", field: "supp1_pending" } },
  { key: "trans_supp1_any_extra", label: "Trans Supp1 Any Extra?", group: "Transport", type: "auto", width: 130, rpull: { from: "07_Transportation", field: "supp1_any_extra" } },
  { key: "trans_supp2", label: "Trans Supp 2", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140 },
  { key: "trans_supp2_vol", label: "Trans Supp 2 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp2_sts", label: "Trans Supp 2 Sts", group: "Transport", type: "auto", width: 120, rpull: { from: "07_Transportation", field: "supp2_sts" } },
  { key: "trans_supp2_end", label: "Trans Supp 2 End Date", group: "Transport", type: "auto", width: 150, rpull: { from: "07_Transportation", field: "supp2_end" } },
  { key: "trans_supp2_pending", label: "Trans Supp2 Pending Reason", group: "Transport", type: "auto", width: 160, rpull: { from: "07_Transportation", field: "supp2_pending" } },
  { key: "trans_supp2_any_extra", label: "Trans Supp2 Any Extra?", group: "Transport", type: "auto", width: 130, rpull: { from: "07_Transportation", field: "supp2_any_extra" } },
  { key: "trans_supp3", label: "Trans Supp 3", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140 },
  { key: "trans_supp3_vol", label: "Trans Supp 3 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp3_sts", label: "Trans Supp 3 Sts", group: "Transport", type: "auto", width: 120, rpull: { from: "07_Transportation", field: "supp3_sts" } },
  { key: "trans_supp3_end", label: "Trans Supp 3 End Date", group: "Transport", type: "auto", width: 150, rpull: { from: "07_Transportation", field: "supp3_end" } },
  { key: "trans_supp3_pending", label: "Trans Supp3 Pending Reason", group: "Transport", type: "auto", width: 160, rpull: { from: "07_Transportation", field: "supp3_pending" } },
  { key: "trans_supp3_any_extra", label: "Trans Supp3 Any Extra?", group: "Transport", type: "auto", width: 130, rpull: { from: "07_Transportation", field: "supp3_any_extra" } },
  { key: "cs_note_trans", label: "Cs Note for Trans Pic", group: "Transport", type: "text", mandatory: true, width: 180 },

  // ----- Warehouse -----
  { key: "warehouse_flag", label: "Warehouse?", group: "Warehouse", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Warehouse" },
  { key: "wh_export_date", label: "Warehouse Export Date", group: "Warehouse", type: "datetime", width: 170 },
  { key: "wha_extra_type", label: "(WHA) Extra/Service Type", group: "Warehouse", type: "auto", width: 170, rpull: { from: "08_Warehouse", field: "extra_req_type" } },
  { key: "wh_address", label: "WH Address", group: "Warehouse", type: "dropdown", list: "wh_address", width: 140 },
  { key: "wh_supp1", label: "WH Supp 1", group: "Warehouse", type: "dropdown", list: "supplier_warehouse", width: 130 },
  { key: "wh_supp1_vol", label: "WH Supp 1 Estimate Vol", group: "Warehouse", type: "text", width: 150 },
  { key: "wh_actual_rcv", label: "ACTUAL RCV CARGO TOTAL", group: "Warehouse", type: "auto", width: 170, rpull: { from: "08_Warehouse", field: "wh_actual_rcv" } },
  { key: "wh_supp1_sts", label: "WH Supp 1 Sts", group: "Warehouse", type: "auto", width: 120, rpull: { from: "08_Warehouse", field: "wh_supp1_sts" } },
  { key: "wh_supp1_end", label: "WH Supp 1 End Date", group: "Warehouse", type: "auto", width: 150, rpull: { from: "08_Warehouse", field: "wh_supp1_end" } },
  { key: "wh_supp1_pending", label: "WH Supp 1 Pending Reason", group: "Warehouse", type: "auto", width: 160, rpull: { from: "08_Warehouse", field: "wh_supp1_pending" } },
  { key: "cs_note_wh", label: "Cs Note for WH Pic", group: "Warehouse", type: "text", mandatory: true, width: 180 },

  // ----- Job Closing -----
  { key: "ex_ops_status_date", label: "EX/OPS Status Date", group: "Job Closing", type: "auto", width: 160, help: "ใส่อัตโนมัติเมื่อ Status = End" },

  // ----- Re-Export Data (เติมอัตโนมัติเมื่อสร้างจาก Import Re-Export?=Yes) -----
  { key: "data_from_import", label: "Data from Import", group: "Re-Export Data", type: "auto", width: 180, help: "เติมค่าอัตโนมัติจาก CS Import เมื่อ Re-Export? = Yes" },
];
