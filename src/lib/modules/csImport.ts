import { Field } from "../fields";

// ===== 04_CS_Import — จัดเรียง section ตาม requirement ใหม่ (2026-07) =====
// สี: ฟ้า=Mandatory, เหลือง=Editable(เมื่อมี PIC), เทา=Auto/Pull/Lock
// ต่อ 1 supplier ใน Transport มี Del Address + Delivery Date แยกของตัวเอง

// helper: 1 ชุด Trans Supp (n) ในมุมมอง Import (Supp/Vol/Del/Delivery กรอกที่นี่, Sts/Pending/End/AnyExtra ดึงย้อน)
const transSupp = (n: number): Field[] => [
  { key: `trans_supp${n}`, label: `Trans Supp ${n}`, group: `Transport Supp ${n}`, type: "dropdown", list: "supplier_transport", width: 140, help: "Supp 1/2/3 ห้ามซ้ำกัน" },
  { key: `trans_supp${n}_vol`, label: `Trans Supp ${n} Vol`, group: `Transport Supp ${n}`, type: "text", width: 120 },
  { key: `trans_supp${n}_del_addr`, label: `Supp ${n} Del Address`, group: `Transport Supp ${n}`, type: "text", width: 160 },
  { key: `trans_supp${n}_delivery`, label: `Supp ${n} Delivery / Loading Date`, group: `Transport Supp ${n}`, type: "datetime", range: true, width: 190 },
  { key: `trans_supp${n}_sts`, label: `Trans Supp ${n} Sts`, group: `Transport Supp ${n}`, type: "auto", width: 120, rpull: { from: "07_Transportation", field: `supp${n}_sts` } },
  { key: `trans_supp${n}_pending`, label: `Trans Supp${n} Pending Reason`, group: `Transport Supp ${n}`, type: "auto", width: 160, rpull: { from: "07_Transportation", field: `supp${n}_pending` } },
  { key: `trans_supp${n}_end`, label: `Trans Supp ${n} End Date`, group: `Transport Supp ${n}`, type: "auto", width: 150, rpull: { from: "07_Transportation", field: `supp${n}_end` } },
  { key: `trans_supp${n}_any_extra`, label: `Trans Supp${n} Any Extra?`, group: `Transport Supp ${n}`, type: "auto", width: 130, rpull: { from: "07_Transportation", field: `supp${n}_any_extra` } },
];

export const IMPORT_FIELDS: Field[] = [
  // ----- OPS (ช่องหลักคงหน้าสุด แล้วเรียงตามที่สั่ง) -----
  { key: "im_ops_status", label: "IM/OPS Status", group: "OPS", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, summary: true, width: 130, help: "กด End ต้องผ่านเงื่อนไขครบ · แก้หลัง End ต้องติดต่อ Supervisor" },
  { key: "job_type", label: "Job Type", group: "OPS", type: "dropdown", list: "job_type", mandatory: true, sticky: true, summary: true, width: 140 },
  { key: "im_cs", label: "IM/CS", group: "OPS", type: "dropdown", list: "im_cs", mandatory: true, summary: true, width: 110 },
  { key: "imp_job_no", label: "IMP/Job No.", group: "OPS", type: "text", sticky: true, summary: true, width: 130 },
  { key: "customer", label: "Customer", group: "OPS", type: "dropdown", list: "customer", summary: true, width: 150 },
  { key: "eta_imp", label: "ETA (IMP)", group: "OPS", type: "datetime", summary: true, width: 160 },
  // กลุ่ม 1
  { key: "re_export", label: "Re-Export?", group: "OPS", type: "toggle", mandatory: true, sticky: true, width: 100, help: "Yes แล้วบันทึก = สร้างรายการใหม่ที่ CS Export อัตโนมัติ (เติม Data from Import)" },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "OPS", type: "dropdown", list: "carrier", width: 150 },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "OPS", type: "dropdown", list: "sales", mandatory: true, width: 130 },
  { key: "imp_booking_mbl", label: "IMP/Booking / MBL No.", group: "OPS", type: "text", width: 170, colorToggle: ["#f7c6d0", "#bfe9c8"], help: "กดปุ่มสี: ชมพู=รอลูกค้าจ่ายภาษี / เขียว=รอติดตามเงินมัดจำกับสายเรือ" },
  { key: "imp_booking_mbl_color", label: "MBL Color", group: "OPS", type: "text", hidden: true },
  { key: "imp_hbl", label: "IMP/HBL No.", group: "OPS", type: "text", width: 140 },
  { key: "im_cs_remark", label: "IM/CS Remark", group: "OPS", type: "text", width: 200 },
  // กลุ่ม 2
  { key: "etd_imp", label: "ETD (IMP)", group: "OPS", type: "datetime", width: 160 },
  { key: "import_port", label: "IMPORT PORT", group: "OPS", type: "text", width: 140, help: "กรอกที่นี่ — Shipping/Transport จะดึงไปแสดง (ห้ามแก้)" },
  { key: "pol", label: "POL", group: "OPS", type: "dropdown", list: "pol", width: 110 },
  { key: "pod", label: "POD", group: "OPS", type: "dropdown", list: "pod", width: 110 },
  { key: "vessel", label: "Vessel", group: "OPS", type: "text", width: 140 },
  { key: "freetime", label: "Freetime", group: "OPS", type: "text", width: 130, help: "เช่น DEM 7 / DET 14" },
  { key: "term", label: "Term", group: "OPS", type: "dropdown", list: "term", width: 100 },
  { key: "cargo_type", label: "Cargo Type", group: "OPS", type: "auto", width: 130, rpull: { from: "06_Shipping", field: "cargo_type" }, help: "ดึงจากรายการ Shipping (ถ้ามี)" },
  // กลุ่ม 3
  { key: "cnt_4w", label: "4W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_6w", label: "6W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_10w", label: "10W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_20gp", label: "20GP", group: "OPS", type: "number", width: 70 },
  { key: "cnt_40hq", label: "40HQ", group: "OPS", type: "number", width: 70 },
  // กลุ่ม 4
  { key: "pv_no", label: "PV No.", group: "OPS", type: "text", width: 130 },
  { key: "pv_status", label: "PV Status", group: "OPS", type: "dropdown", list: "pv_status", width: 120, help: "รอจ่าย(ส้ม) / จ่ายแล้ว(เขียว) / จบแล้ว(เทา)" },

  // ----- Documentation -----
  { key: "im_doc", label: "IM/DOC", group: "Documentation", type: "dropdown", list: "im_doc", mandatory: true, width: 110 },
  { key: "enter_doc_cutoff", label: "Enter Doc Cut off", group: "Documentation", type: "datetime", width: 160 },
  { key: "enter_doc", label: "Enter Doc", group: "Documentation", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "check_deposit", label: "Check Deposit", group: "Documentation", type: "dropdown", list: "check_deposit", width: 120 },
  { key: "check_deposit_done_date", label: "Check Deposit Done Date", group: "Documentation", type: "auto", width: 170, help: "Auto เมื่อ Check Deposit = Done" },
  { key: "scan_file", label: "Scan File", group: "Documentation", type: "dropdown", list: "done_pending", width: 110 },
  { key: "total_pkg", label: "Total PKG/Carton/Pallet", group: "Documentation", type: "number", width: 160 },
  { key: "imp_customer_ref", label: "IMP Customer Ref", group: "Documentation", type: "text", width: 150 },
  { key: "im_doc_remark", label: "IM/DOC Remark", group: "Documentation", type: "text", width: 200 },

  // ----- Extra / Service -----
  { key: "extra_require", label: "(IMP) Extra/Service Require", group: "Extra / Service", type: "toggle", mandatory: true, width: 150, help: "Yes แล้วต้องเลือก Req Type อย่างน้อย 1" },
  { key: "extra_req_type", label: "(IMP) Extra/Service Req Type", group: "Extra / Service", type: "multiselect", list: "extra_service_type", width: 200 },

  // ----- Shipping -----
  { key: "shipping_flag", label: "Shipping?", group: "Shipping", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Shipping" },
  { key: "clearance_date", label: "Clearance Date", group: "Shipping", type: "datetime", width: 160 },
  { key: "cs_note_ship", label: "Cs Note for Ship Pic", group: "Shipping", type: "text", mandatory: true, width: 180, help: "ข้อความถึง Ship PIC (Shipping จะดึงไปแสดง)" },
  { key: "shipp_extra_type", label: "(SHIPP) Extra/Service Type", group: "Shipping", type: "auto", width: 170, rpull: { from: "06_Shipping", field: "extra_req_type" } },
  { key: "ship_outsourcing", label: "Ship Outsourcing", group: "Shipping", type: "auto", width: 150, rpull: { from: "06_Shipping", field: "ship_outsourcing" } },
  { key: "duty_vat_amount", label: "DUTY/VAT AMOUNT", group: "Shipping", type: "auto", width: 140, rpull: { from: "06_Shipping", field: "duty_vat_amount" } },
  { key: "entry_status", label: "Entry Status", group: "Shipping", type: "auto", width: 120, rpull: { from: "06_Shipping", field: "entry_status" }, help: "ดึงจาก Shipping · Done = แดง" },
  { key: "permit", label: "PERMIT", group: "Shipping", type: "text", width: 130, help: "(รอสเปกเพิ่มเติม)" },
  { key: "form_e", label: "Form E", group: "Shipping", type: "dropdown", list: "form_e", width: 150, help: "มีสีตามค่าที่เลือก" },

  // ----- Transport -----
  { key: "transport_flag", label: "Transport?", group: "Transport", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Transport" },
  { key: "cs_note_trans", label: "Cs Note for Trans Pic", group: "Transport", type: "text", mandatory: true, width: 180 },
  { key: "trans_extra_type", label: "(TRANS) Extra/Service require ?", group: "Transport", type: "auto", width: 170, rpull: { from: "07_Transportation", field: "extra_req_type" } },
  { key: "delivery_date", label: "Delivery / Loading Date (รวม)", group: "Transport", type: "datetime", width: 190, help: "วันส่งรวมของรายการ (Shipping/Warehouse/สถิติ ใช้ช่องนี้)" },
  ...transSupp(1),
  ...transSupp(2),
  ...transSupp(3),

  // ----- Warehouse -----
  { key: "warehouse_flag", label: "Warehouse?", group: "Warehouse", type: "toggle", mandatory: true, width: 100, help: "Yes = สร้างรายการที่ tab Warehouse" },
  { key: "wh_rcv_date", label: "Warehouse Rcv Date", group: "Warehouse", type: "datetime", width: 170 },
  { key: "wha_extra_type", label: "(WHA) Extra/Service Type", group: "Warehouse", type: "auto", width: 170, rpull: { from: "08_Warehouse", field: "extra_req_type" } },
  { key: "cs_note_wh", label: "Cs Note for WH Pic", group: "Warehouse", type: "text", mandatory: true, width: 180 },
  { key: "wh_supp1", label: "WH Supp 1", group: "Warehouse", type: "dropdown", list: "supplier_warehouse", width: 130 },
  { key: "wh_supp1_vol", label: "WH Supp 1 Estimate Vol", group: "Warehouse", type: "text", width: 150 },
  { key: "wh_address", label: "WH Address", group: "Warehouse", type: "dropdown", list: "wh_address", width: 140 },
  { key: "wh_actual_rcv", label: "ACTUAL RCV CARGO TOTAL", group: "Warehouse", type: "auto", width: 170, rpull: { from: "08_Warehouse", field: "wh_actual_rcv" } },
  { key: "wh_supp1_pending", label: "WH Supp 1 Pending Reason", group: "Warehouse", type: "auto", width: 160, rpull: { from: "08_Warehouse", field: "wh_supp1_pending" } },
  { key: "wh_supp1_sts", label: "WH Supp 1 Sts", group: "Warehouse", type: "auto", width: 120, rpull: { from: "08_Warehouse", field: "wh_supp1_sts" } },
  { key: "wh_supp1_end", label: "WH Supp 1 End Date", group: "Warehouse", type: "auto", width: 150, rpull: { from: "08_Warehouse", field: "wh_supp1_end" } },

  // ----- Job Closing -----
  { key: "im_ops_status_date", label: "IM/OPS Status Date", group: "Job Closing", type: "auto", width: 160, help: "ใส่อัตโนมัติเมื่อ Status = End" },
];
