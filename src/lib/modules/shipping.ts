import { Field } from "../fields";

// ===== 06_Shipping — ปลายทาง: สร้างอัตโนมัติจาก CS Import/Export, ดึงหัว Job ด้วย Job No. =====
export const SHIPPING_FIELDS: Field[] = [
  // ----- Job Info -----
  { key: "shipp_status", label: "SHIPP Status", group: "Job Info", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, summary: true, width: 130, help: "แก้หลัง End ต้องติดต่อ Supervisor" },
  { key: "job_type", label: "Job Type", group: "Job Info", type: "auto", sticky: true, summary: true, width: 130, pull: { imp: "job_type", exp: "job_type" } },
  { key: "entry_pic", label: "Entry PIC", group: "Job Info", type: "dropdown", list: "entry_pic", mandatory: true, width: 120 },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Info", type: "auto", sticky: true, summary: true, width: 130, help: "ตัวเชื่อมกับ CS (สร้างอัตโนมัติ)" },
  { key: "booking_mbl", label: "Booking / MBL No. (IMP/EXP)", group: "Job Info", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "hbl", label: "HBL No. (IMP/EXP)", group: "Job Info", type: "auto", width: 140, pull: { imp: "imp_hbl", exp: "exp_hbl" } },
  { key: "customer", label: "Customer (IMP/EXP)", group: "Job Info", type: "auto", summary: true, width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "cargo_type", label: "Cargo Type", group: "Job Info", type: "dropdown", list: "cargo_type", mandatory: true, width: 130 },
  { key: "customer_ref", label: "Customer Ref / No. (IMP/EXP)", group: "Job Info", type: "auto", width: 150, pull: { imp: "imp_customer_ref", exp: "exp_customer_ref" } },
  { key: "cs_pic", label: "CS PIC", group: "Job Info", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "cs_note_ship", label: "Cs Note for Ship Pic", group: "Job Info", type: "auto", width: 180, pull: { imp: "cs_note_ship", exp: "cs_note_ship" } },

  // ----- Clearance Information -----
  { key: "entry_no", label: "Imp/Exp Entry No.", group: "Clearance Information", type: "text", width: 140 },
  { key: "duty_pay", label: "Duty Pay", group: "Clearance Information", type: "dropdown", list: "duty_pay", width: 120 },
  { key: "duty_vat_amount", label: "DUTY/VAT AMOUNT", group: "Clearance Information", type: "text", width: 140 },
  { key: "entry_status", label: "Entry Status", group: "Clearance Information", type: "dropdown", list: "enter_doc_status", width: 120 },
  { key: "tisi", label: "TISI", group: "Clearance Information", type: "dropdown", list: "enter_doc_status", width: 110 },
  { key: "form_e", label: "Form E", group: "Clearance Information", type: "dropdown", list: "enter_doc_status", width: 110 },
  { key: "co_form", label: "C/O Form", group: "Clearance Information", type: "dropdown", list: "enter_doc_status", width: 110 },
  { key: "entry_remark", label: "Entry Remark", group: "Clearance Information", type: "text", width: 180 },

  // ----- Extra Service -----
  { key: "extra_require", label: "(SHIPP) Extra/Service Require", group: "Extra Service", type: "toggle", mandatory: true, width: 150 },
  { key: "extra_req_type", label: "(SHIPP) Extra/Service Req Type", group: "Extra Service", type: "multiselect", list: "extra_service_type", width: 200 },
  { key: "shipping_remark", label: "Shipping Remark", group: "Extra Service", type: "text", width: 180 },

  // ----- Operation Schedule -----
  { key: "clearance_date", label: "Clearance Date (IMP/EXP)", group: "Operation Schedule", type: "auto", width: 160, pull: { imp: "clearance_date", exp: "clearance_date" } },
  { key: "delivery_date", label: "Delivery / Loading Date", group: "Operation Schedule", type: "auto", width: 170, pull: { imp: "delivery_date", exp: "delivery_date" } },
  { key: "eta_imp", label: "ETA (IMP)", group: "Operation Schedule", type: "auto", width: 160, pull: { imp: "eta_imp" } },
  { key: "imp_pod", label: "IMP/POD", group: "Operation Schedule", type: "auto", width: 110, pull: { imp: "pod" } },
  { key: "etd_exp", label: "ETD (EXP)", group: "Operation Schedule", type: "auto", width: 160, pull: { exp: "etd_exp" } },
  { key: "exp_pol", label: "EXP/POL", group: "Operation Schedule", type: "auto", width: 110, pull: { exp: "pol" } },

  // ----- Shipping Execution -----
  { key: "ship_pic", label: "Ship PIC", group: "Shipping Execution", type: "dropdown", list: "ship_pic", mandatory: true, summary: true, width: 130, help: "ถ้าเลือก Outsourcing ต้องเลือก Ship Outsourcing ด้วย" },
  { key: "ship_outsourcing", label: "Ship Outsourcing", group: "Shipping Execution", type: "dropdown", list: "supplier_transport", width: 150 },
  { key: "forgot_ot", label: "Forgot OT", group: "Shipping Execution", type: "toggle", mandatory: true, width: 100 },
  { key: "ot_requested", label: "OT Requested", group: "Shipping Execution", type: "toggle", mandatory: true, width: 110 },
  { key: "ot_receipt_lost", label: "OT Receipt Lost", group: "Shipping Execution", type: "dropdown", list: "receipt_lost", mandatory: true, width: 120 },

  // ----- Clearance Monitoring -----
  { key: "clearance_status", label: "Clearance Status", group: "Clearance Monitoring", type: "dropdown", list: "clearance_status", mandatory: true, summary: true, width: 140 },
  { key: "clearance_pending_reason", label: "Clearance Pending Reason", group: "Clearance Monitoring", type: "text", mandatory: true, width: 170 },
  { key: "clearance_end_date", label: "Clearance Status End Date", group: "Clearance Monitoring", type: "auto", width: 160, help: "Auto เมื่อ Clearance Status = Cleared/Completed" },

  // ----- Accounting & Closing -----
  { key: "ship_close_acc_status", label: "Ship Close Acc Status", group: "Accounting & Closing", type: "dropdown", list: "complete_sts", mandatory: true, width: 150 },
  { key: "ship_close_acc_date", label: "Ship Close Acc Status Date", group: "Accounting & Closing", type: "auto", width: 170 },

  // ----- Job Closing -----
  { key: "shipp_status_date", label: "SHIPP Status Date", group: "Job Closing", type: "auto", width: 160, help: "Auto เมื่อ SHIPP Status = End" },
];
