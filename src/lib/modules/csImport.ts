import { Field } from "../fields";

// ===== 04_CS_Import — ตรงตาม requirement (Google Sheet ล่าสุด) =====
// สี: ฟ้า=Mandatory, เหลือง=Editable(เมื่อมี PIC), เทา=Auto/Pull/Lock
// ช่องกลุ่ม Shipping/Transport/Warehouse ที่เป็น auto ดึงย้อนจากโมดูลปลายทางด้วย Job No.
export const IMPORT_FIELDS: Field[] = [
  // ----- OPS -----
  { key: "im_ops_status", label: "IM/OPS Status", group: "OPS", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, summary: true, width: 130, help: "กด End ต้องผ่านเงื่อนไขครบ · แก้หลัง End ต้องติดต่อ Supervisor" },
  { key: "job_type", label: "Job Type", group: "OPS", type: "dropdown", list: "job_type", mandatory: true, sticky: true, summary: true, width: 140 },
  { key: "re_export", label: "Re-Export?", group: "OPS", type: "toggle", mandatory: true, sticky: true, width: 100, help: "Yes แล้วบันทึก = สร้างรายการใหม่ที่ CS Export อัตโนมัติ (เติม Data from Import)" },
  { key: "im_cs", label: "IM/CS", group: "OPS", type: "dropdown", list: "im_cs", mandatory: true, summary: true, width: 110 },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "OPS", type: "dropdown", list: "carrier", width: 150 },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "OPS", type: "dropdown", list: "sales", mandatory: true, width: 130 },
  { key: "etd_imp", label: "ETD (IMP)", group: "OPS", type: "datetime", width: 160 },
  { key: "eta_imp", label: "ETA (IMP)", group: "OPS", type: "datetime", summary: true, width: 160 },
  { key: "imp_job_no", label: "IMP/Job No.", group: "OPS", type: "text", sticky: true, summary: true, width: 130 },
  { key: "imp_booking_mbl", label: "IMP/Booking / MBL No.", group: "OPS", type: "text", width: 170 },
  { key: "imp_hbl", label: "IMP/HBL No.", group: "OPS", type: "text", width: 140 },
  { key: "customer", label: "Customer", group: "OPS", type: "dropdown", list: "customer", summary: true, width: 150 },
  { key: "pol", label: "POL", group: "OPS", type: "dropdown", list: "pol", width: 110 },
  { key: "pod", label: "POD", group: "OPS", type: "dropdown", list: "pod", width: 110 },
  { key: "cnt_4w", label: "4W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_6w", label: "6W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_10w", label: "10W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_20gp", label: "20GP", group: "OPS", type: "number", width: 70 },
  { key: "cnt_40hq", label: "40HQ", group: "OPS", type: "number", width: 70 },
  { key: "vessel", label: "Vessel", group: "OPS", type: "text", width: 140 },
  { key: "freetime", label: "Freetime", group: "OPS", type: "text", width: 130, help: "เช่น DEM 7 / DET 14" },
  { key: "term", label: "Term", group: "OPS", type: "dropdown", list: "term", width: 100 },
  { key: "im_cs_remark", label: "IM/CS Remark", group: "OPS", type: "text", width: 200 },
  { key: "cargo_type", label: "Cargo Type", group: "OPS", type: "dropdown", list: "cargo_type", mandatory: true, width: 130 },

  // ----- Documentation -----
  { key: "im_doc", label: "IM/DOC", group: "Documentation", type: "dropdown", list: "im_doc", mandatory: true, width: 110 },
  { key: "enter_doc_cutoff", label: "Enter Doc Cut off", group: "Documentation", type: "datetime", width: 160 },
  { key: "enter_doc", label: "Enter Doc", group: "Documentation", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "check_deposit", label: "Check Deposit", group: "Documentation", type: "dropdown", list: "check_deposit", width: 120 },
  { key: "scan_file", label: "Scan File", group: "Documentation", type: "dropdown", list: "done_pending", width: 110 },
  { key: "imp_customer_ref", label: "IMP Customer Ref", group: "Documentation", type: "text", width: 150 },
  { key: "im_doc_remark", label: "IM/DOC Remark", group: "Documentation", type: "text", width: 200 },

  // ----- Extra / Service -----
  { key: "extra_require", label: "(IMP) Extra/Service Require", group: "Extra / Service", type: "toggle", mandatory: true, width: 150, help: "Yes แล้วต้องเลือก Req Type อย่างน้อย 1" },
  { key: "extra_req_type", label: "(IMP) Extra/Service Req Type", group: "Extra / Service", type: "multiselect", list: "extra_service_type", width: 200 },

  // ----- Shipping (auto = ดึงย้อนจาก 06_Shipping) -----
  { key: "shipping_flag", label: "Shipping?", group: "Shipping", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Shipping" },
  { key: "clearance_date", label: "Clearance Date", group: "Shipping", type: "datetime", width: 160 },
  { key: "duty_vat_amount", label: "DUTY/VAT AMOUNT", group: "Shipping", type: "auto", width: 140, rpull: { from: "06_Shipping", field: "duty_vat_amount" } },
  { key: "shipp_extra_type", label: "(SHIPP) Extra/Service Type", group: "Shipping", type: "auto", width: 170, rpull: { from: "06_Shipping", field: "extra_req_type" } },
  { key: "clearance_pending_reason", label: "Clearance Pending Reason", group: "Shipping", type: "auto", width: 170, rpull: { from: "06_Shipping", field: "clearance_pending_reason" } },
  { key: "clearance_end_date", label: "Clearance Status End Date", group: "Shipping", type: "auto", width: 160, rpull: { from: "06_Shipping", field: "clearance_end_date" } },
  { key: "cs_note_ship", label: "Cs Note for Ship Pic", group: "Shipping", type: "text", mandatory: true, width: 180, help: "ข้อความถึง Ship PIC (Shipping จะดึงไปแสดง)" },
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
  { key: "wh_rcv_date", label: "Warehouse Rcv Date", group: "Warehouse", type: "datetime", width: 170 },
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
  { key: "im_ops_status_date", label: "IM/OPS Status Date", group: "Job Closing", type: "auto", width: 160, help: "ใส่อัตโนมัติเมื่อ Status = End" },
];
