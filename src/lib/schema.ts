// ระบบ CS Import — นิยามคอลัมน์ทั้งหมดของ Module 1 (04_CS_Import)
// อ้างอิงรูปแบบจาก temp_excel.xlsx : Sheet1 = layout, Sheet2 = ชนิดช่อง/เงื่อนไข

export type FieldType =
  | "text"
  | "number"
  | "dropdown"
  | "multiselect"
  | "toggle" // Yes/No -> ใช้ toggle แทน radio
  | "datetime"
  | "auto"; // ดึงจาก Module อื่น -> read-only (เทา)

export interface Field {
  key: string; // คีย์ภายใน (ใช้เป็น header ในชีท record)
  label: string; // ชื่อที่แสดง
  group: string; // กลุ่ม/section
  type: FieldType;
  mandatory?: boolean; // ฟ้า = ต้องกรอกเสมอ
  list?: string; // ชื่อ list ใน _database (สำหรับ dropdown/multiselect)
  width?: number; // ความกว้างคอลัมน์ (px)
  sticky?: boolean; // ตรึงคอลัมน์ซ้าย
  help?: string;
}

export const GROUPS = [
  "OPS",
  "Documentation",
  "Extra / Service",
  "Shipping",
  "Transport",
  "Warehouse",
  "Job Closing",
] as const;

// รายการ dropdown ที่เก็บใน _database (ค่าตั้งต้นใช้ตอน initialize)
export const LIST_SEED: Record<string, string[]> = {
  im_ops_status: ["Open", "In Progress", "Pending", "End"],
  job_type: ["Import/FCL", "Import/LCL", "Re-Export/FCL", "Re-Export/LCL"],
  im_cs: ["CS-A", "CS-B", "CS-C"],
  carrier: ["Maersk", "ONE", "Evergreen", "Co-Agent X"],
  sales: ["Sales 1", "Sales 2"],
  customer: ["Customer A", "Customer B"],
  pol: ["THBKK", "THLCH", "CNSHA", "SGSIN"],
  pod: ["THLCH", "THBKK"],
  term: ["CIF", "FOB", "EXW", "CFR", "DAP", "DDP"],
  im_doc: ["DOC-A", "DOC-B"],
  enter_doc_status: ["Done", "Pending", "Revising", "N/A"],
  done_pending: ["Done", "Pending"],
  extra_service_type: ["ตรวจปล่อย", "เอกสารเพิ่ม", "ฉลากไทย", "อื่น ๆ"],
  del_address: ["คลังลูกค้า A", "นิคม B"],
  supplier_transport: ["Trans Supp A", "Trans Supp B", "Trans Supp C"],
  wh_address: ["คลัง WH-1", "คลัง WH-2"],
  supplier_warehouse: ["WH Supp A", "WH Supp B"],
};

// ===== ฟิลด์ทั้ง 63 คอลัมน์ ตาม Sheet1 (A..BK) =====
export const FIELDS: Field[] = [
  // ----- OPS -----
  { key: "im_ops_status", label: "IM/OPS Status", group: "OPS", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130, help: "กด End ต้องผ่านเงื่อนไขครบ (ดูหมายเหตุ)" },
  { key: "job_type", label: "Job Type", group: "OPS", type: "dropdown", list: "job_type", mandatory: true, sticky: true, width: 140 },
  { key: "imp_job_no", label: "IMP/Job No.", group: "OPS", type: "text", mandatory: true, sticky: true, width: 130 },
  { key: "im_cs", label: "IM/CS", group: "OPS", type: "dropdown", list: "im_cs", mandatory: true, width: 110 },
  { key: "co_agent_carrier", label: "Co-Agent / Carrier", group: "OPS", type: "dropdown", list: "carrier", width: 150 },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "OPS", type: "dropdown", list: "sales", width: 130 },
  { key: "etd_imp", label: "ETD (IMP)", group: "OPS", type: "datetime", width: 160 },
  { key: "eta_imp", label: "ETA (IMP)", group: "OPS", type: "datetime", width: 160 },
  { key: "imp_booking_mbl", label: "IMP/Booking / MBL No.", group: "OPS", type: "text", width: 170 },
  { key: "imp_hbl", label: "IMP/HBL No.", group: "OPS", type: "text", width: 140 },
  { key: "customer", label: "Customer", group: "OPS", type: "dropdown", list: "customer", mandatory: true, width: 150 },
  { key: "pol", label: "POL", group: "OPS", type: "dropdown", list: "pol", width: 110 },
  { key: "pod", label: "POD", group: "OPS", type: "dropdown", list: "pod", width: 110 },
  { key: "cnt_4w", label: "4W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_6w", label: "6W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_10w", label: "10W", group: "OPS", type: "number", width: 70 },
  { key: "cnt_20gp", label: "20GP", group: "OPS", type: "number", width: 70 },
  { key: "cnt_40hq", label: "40HQ", group: "OPS", type: "number", width: 70 },
  { key: "vessel", label: "Vessel", group: "OPS", type: "text", width: 140 },
  { key: "freetime_dem", label: "Freetime DEM", group: "OPS", type: "text", width: 110 },
  { key: "freetime_det", label: "Freetime DET", group: "OPS", type: "text", width: 110 },
  { key: "term", label: "Term", group: "OPS", type: "dropdown", list: "term", width: 100 },
  { key: "im_cs_remark", label: "IM/CS Remark", group: "OPS", type: "text", width: 200 },

  // ----- Documentation -----
  { key: "im_doc", label: "IM/DOC", group: "Documentation", type: "dropdown", list: "im_doc", width: 110 },
  { key: "enter_doc", label: "Enter Doc", group: "Documentation", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "check_deposit", label: "Check Deposit", group: "Documentation", type: "dropdown", list: "done_pending", width: 120 },
  { key: "scan_file", label: "Scan File", group: "Documentation", type: "dropdown", list: "done_pending", width: 110 },
  { key: "imp_customer_ref", label: "IMP Customer Ref", group: "Documentation", type: "text", width: 150 },
  { key: "imp_cs_remark2", label: "IMP CS Remark", group: "Documentation", type: "text", width: 200 },

  // ----- Extra / Service -----
  { key: "extra_require", label: "(IMP) Extra/Service Require", group: "Extra / Service", type: "toggle", width: 150, help: "Yes แล้วต้องเลือก Req Type" },
  { key: "extra_req_type", label: "(IMP) Extra/Service Req Type", group: "Extra / Service", type: "multiselect", list: "extra_service_type", width: 200, help: "เลือกได้หลายรายการ" },
  { key: "re_export", label: "Re-Export?", group: "Extra / Service", type: "toggle", width: 110 },
  { key: "re_export_type", label: "(Re-Export) Extra/Service Type", group: "Extra / Service", type: "auto", width: 170 },

  // ----- Shipping -----
  { key: "shipping_flag", label: "Shipping?", group: "Shipping", type: "toggle", width: 100 },
  { key: "clearance_date", label: "Clearance Date", group: "Shipping", type: "datetime", width: 160 },
  { key: "duty_vat_amount", label: "DUTY/VAT AMOUNT", group: "Shipping", type: "auto", width: 140 },
  { key: "shipp_extra_type", label: "(SHIPP) Extra/Service Type", group: "Shipping", type: "auto", width: 170 },

  // ----- Transport -----
  { key: "transport_flag", label: "Transport?", group: "Transport", type: "toggle", width: 100 },
  { key: "del_address", label: "Del Address", group: "Transport", type: "dropdown", list: "del_address", width: 150 },
  { key: "delivery_date", label: "Delivery / Loading Date", group: "Transport", type: "datetime", width: 170 },
  { key: "trans_extra_type", label: "(TRANS) Extra/Service Type", group: "Transport", type: "auto", width: 170 },
  { key: "trans_supp1", label: "Trans Supp 1", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140 },
  { key: "trans_supp1_vol", label: "Trans Supp 1 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp1_sts", label: "Trans Supp 1 Sts", group: "Transport", type: "auto", width: 120 },
  { key: "trans_supp1_end", label: "Trans Supp 1 End Date", group: "Transport", type: "auto", width: 150 },
  { key: "trans_supp2", label: "Trans Supp 2", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140 },
  { key: "trans_supp2_vol", label: "Trans Supp 2 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp2_sts", label: "Trans Supp 2 Sts", group: "Transport", type: "auto", width: 120 },
  { key: "trans_supp2_end", label: "Trans Supp 2 End Date", group: "Transport", type: "auto", width: 150 },
  { key: "trans_supp3", label: "Trans Supp 3", group: "Transport", type: "dropdown", list: "supplier_transport", width: 140 },
  { key: "trans_supp3_vol", label: "Trans Supp 3 Vol", group: "Transport", type: "text", width: 120 },
  { key: "trans_supp3_sts", label: "Trans Supp 3 Sts", group: "Transport", type: "auto", width: 120 },
  { key: "trans_supp3_end", label: "Trans Supp 3 End Date", group: "Transport", type: "auto", width: 150 },

  // ----- Warehouse -----
  { key: "warehouse_flag", label: "Warehouse?", group: "Warehouse", type: "toggle", width: 100 },
  { key: "wh_rcv_date", label: "Warehouse Rcv Date", group: "Warehouse", type: "datetime", width: 170 },
  { key: "wha_extra_type", label: "(WHA) Extra/Service Type", group: "Warehouse", type: "auto", width: 170 },
  { key: "wh_address", label: "WH Address", group: "Warehouse", type: "dropdown", list: "wh_address", width: 140 },
  { key: "wh_supp1", label: "WH Supp 1", group: "Warehouse", type: "dropdown", list: "supplier_warehouse", width: 130 },
  { key: "wh_supp1_vol", label: "WH Supp 1 Estimate Vol", group: "Warehouse", type: "text", width: 150 },
  { key: "wh_actual_rcv", label: "ACTUAL RCV CARGO TOTAL", group: "Warehouse", type: "auto", width: 170 },
  { key: "wh_supp1_sts", label: "WH Supp 1 Sts", group: "Warehouse", type: "auto", width: 120 },
  { key: "wh_supp1_end", label: "WH Supp 1 End Date", group: "Warehouse", type: "auto", width: 150 },

  // ----- Job Closing -----
  { key: "im_ops_status_date", label: "IM/OPS Status Date", group: "Job Closing", type: "auto", width: 160, help: "ใส่อัตโนมัติเมื่อ Status = End" },
];

// คอลัมน์ภายใน (เก็บในชีท record คอลัมน์แรก) ใช้ผูก row -> ระเบียน
export const ID_KEY = "__id";

export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f])
);

export const RECORD_HEADERS = [ID_KEY, ...FIELDS.map((f) => f.key)];

export const DATA_SHEET = "04_CS_Import";
export const DB_SHEET = "_database";

// list ทั้งหมดที่ต้อง seed/อ่าน
export const ALL_LISTS = Object.keys(LIST_SEED);
