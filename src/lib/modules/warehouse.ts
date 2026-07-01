import { Field } from "../fields";

// ===== 08_Warehouse =====
export const WAREHOUSE_FIELDS: Field[] = [
  // ----- Job Info -----
  { key: "wha_status", label: "WHA Status", group: "Job Info", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130 },
  { key: "job_type", label: "Job Type", group: "Job Info", type: "auto", sticky: true, width: 130, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Info", type: "text", mandatory: true, sticky: true, width: 130, help: "กรอกเลขงาน แล้วกด Refresh" },
  { key: "wh_pic", label: "WH PIC", group: "Job Info", type: "dropdown", list: "wh_pic", width: 120 },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Info", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "booking_mbl", label: "Booking / MBL No.", group: "Job Info", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer", group: "Job Info", type: "auto", width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "customer_ref", label: "Customer Ref / No.", group: "Job Info", type: "auto", width: 150, pull: { imp: "imp_customer_ref", exp: "exp_customer_ref" } },
  { key: "cs_note_wh", label: "Cs Note for WH Pic", group: "Job Info", type: "auto", width: 180, pull: { imp: "cs_note_wh", exp: "cs_note_wh" } },

  // ----- Operation Schedule -----
  { key: "clearance_date", label: "Clearance Date", group: "Operation Schedule", type: "auto", width: 160, pull: { imp: "clearance_date", exp: "clearance_date" } },
  { key: "delivery_date", label: "Delivery / Loading Date", group: "Operation Schedule", type: "auto", width: 170, pull: { imp: "delivery_date", exp: "delivery_date" } },
  { key: "wh_address", label: "WH Address", group: "Operation Schedule", type: "auto", width: 140, pull: { imp: "wh_address", exp: "wh_address" } },

  // ----- Extra Service -----
  { key: "extra_require", label: "(WHA) Extra/Service Require", group: "Extra Service", type: "toggle", width: 150 },
  { key: "extra_req_type", label: "(WHA) Extra/Service Req Type", group: "Extra Service", type: "multiselect", list: "extra_service_type", width: 200 },
  { key: "wha_remark", label: "WHA Remark", group: "Extra Service", type: "text", width: 180 },

  // ----- Warehouse Operation -----
  { key: "wh_supp1", label: "WH Supp 1", group: "Warehouse Operation", type: "auto", width: 140, pull: { imp: "wh_supp1", exp: "wh_supp1" } },
  { key: "wh_supp1_vol", label: "WH Supp 1 Estimate Vol", group: "Warehouse Operation", type: "auto", width: 150, pull: { imp: "wh_supp1_vol", exp: "wh_supp1_vol" } },
  { key: "wh_actual_rcv", label: "ACTUAL RCV CARGO TOTAL", group: "Warehouse Operation", type: "text", width: 170 },
  { key: "wh_supp1_sts", label: "WH Supp 1 Sts", group: "Warehouse Operation", type: "dropdown", list: "supplier_status", width: 120 },
  { key: "wh_supp1_end", label: "WH Supp 1 End Date", group: "Warehouse Operation", type: "auto", width: 150 },
  { key: "wh_supp1_kpi", label: "WH Supp 1 KPI", group: "Warehouse Operation", type: "dropdown", list: "kpi", width: 120 },
  { key: "wh_supp1_pending", label: "WH Supp 1 Pending Reason", group: "Warehouse Operation", type: "text", width: 160 },

  // ----- Closing Information -----
  { key: "actual_finished_date", label: "Actual Finished Date", group: "Closing Information", type: "datetime", width: 160 },
  { key: "wha_status_date", label: "WHA Status Date", group: "Closing Information", type: "auto", width: 160, help: "Auto เมื่อ WHA Status = End" },
];
