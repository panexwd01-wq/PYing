import { Field } from "../fields";

// ===== 07_Transportation =====
const supplier = (n: number, startPull: boolean): Field[] => [
  { key: `supp${n}`, label: `Trans Supp ${n}`, group: `Transport Supplier ${n}`, type: "auto", width: 140, pull: { imp: `trans_supp${n}`, exp: `trans_supp${n}` } },
  { key: `supp${n}_vol`, label: `Supp ${n} Vol`, group: `Transport Supplier ${n}`, type: "auto", width: 110, pull: { imp: `trans_supp${n}_vol`, exp: `trans_supp${n}_vol` } },
  { key: `supp${n}_fuel`, label: `Supp ${n} Fuel Rate`, group: `Transport Supplier ${n}`, type: "text", width: 120 },
  { key: `supp${n}_sts`, label: `Supp ${n} Sts`, group: `Transport Supplier ${n}`, type: "dropdown", list: "supplier_status", width: 120 },
  { key: `supp${n}_end`, label: `Supp ${n} End Date`, group: `Transport Supplier ${n}`, type: "auto", width: 150 },
  { key: `supp${n}_kpi`, label: `Supp ${n} KPI`, group: `Transport Supplier ${n}`, type: "dropdown", list: "kpi", width: 120 },
  { key: `supp${n}_pending`, label: `Trans Supp${n} Pending Reason`, group: `Transport Supplier ${n}`, type: "text", width: 160 },
  { key: `supp${n}_any_extra`, label: `Trans Supp${n} Any Extra?`, group: `Transport Supplier ${n}`, type: "dropdown", list: "yes_no", width: 130 },
];

export const TRANSPORT_FIELDS: Field[] = [
  // ----- Job Info -----
  { key: "trans_status", label: "Trans Status", group: "Job Info", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130 },
  { key: "job_type", label: "Job Type", group: "Job Info", type: "auto", sticky: true, width: 130, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Info", type: "text", mandatory: true, sticky: true, width: 130, help: "กรอกเลขงาน แล้วกด Refresh" },
  { key: "trans_pic", label: "Trans PIC", group: "Job Info", type: "dropdown", list: "trans_pic", width: 120 },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Info", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "booking_mbl", label: "Booking / MBL No.", group: "Job Info", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer", group: "Job Info", type: "auto", width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "cnt_4w", label: "4W", group: "Job Info", type: "auto", width: 70, pull: { imp: "cnt_4w", exp: "cnt_4w" } },
  { key: "cnt_6w", label: "6W", group: "Job Info", type: "auto", width: 70, pull: { imp: "cnt_6w", exp: "cnt_6w" } },
  { key: "cnt_10w", label: "10W", group: "Job Info", type: "auto", width: 70, pull: { imp: "cnt_10w", exp: "cnt_10w" } },
  { key: "cnt_20gp", label: "20GP", group: "Job Info", type: "auto", width: 70, pull: { imp: "cnt_20gp", exp: "cnt_20gp" } },
  { key: "cnt_40hq", label: "40HQ", group: "Job Info", type: "auto", width: 70, pull: { imp: "cnt_40hq", exp: "cnt_40hq" } },
  { key: "customer_ref", label: "Customer Ref / No.", group: "Job Info", type: "auto", width: 150, pull: { imp: "imp_customer_ref", exp: "exp_customer_ref" } },
  { key: "cs_note_trans", label: "Cs Note for Trans Pic", group: "Job Info", type: "auto", width: 180, pull: { imp: "cs_note_trans", exp: "cs_note_trans" } },

  // ----- Operation Schedule -----
  { key: "clearance_date", label: "Clearance Date", group: "Operation Schedule", type: "auto", width: 160, pull: { imp: "clearance_date", exp: "clearance_date" } },
  { key: "delivery_date", label: "Delivery / Loading Date", group: "Operation Schedule", type: "auto", width: 170, pull: { imp: "delivery_date", exp: "delivery_date" } },
  { key: "del_address", label: "Del Address", group: "Operation Schedule", type: "auto", width: 150, pull: { imp: "del_address", exp: "del_address" } },

  // ----- Extra Service -----
  { key: "extra_require", label: "(Trans) Extra/Service Require", group: "Extra Service", type: "toggle", width: 150 },
  { key: "extra_req_type", label: "(Trans) Extra/Service Req Type", group: "Extra Service", type: "multiselect", list: "extra_service_type", width: 200 },
  { key: "trans_remark", label: "Trans Remark", group: "Extra Service", type: "text", width: 180 },

  // ----- Suppliers 1..3 -----
  ...supplier(1, true),
  ...supplier(2, false),
  ...supplier(3, false),

  // ----- Job Closing -----
  { key: "actual_delivery_date", label: "Actual Delivery Date", group: "Job Closing", type: "datetime", width: 160 },
  { key: "trans_status_date", label: "Trans Status Date", group: "Job Closing", type: "auto", width: 160, help: "Auto เมื่อ Trans Status = End" },
];
