/**
 * PANEX Mini ERP — Initialize (Google Apps Script)
 * รันฟังก์ชัน PANEX_INITIALIZE() หนึ่งครั้งใน Editor ของ Google Sheets
 *
 * ทำอะไร:
 *   1) สร้าง tab ของทุกโมดูล (04–10) พร้อมหัวตาราง (คอลัมน์ A = __id ภายใน)
 *   2) สร้าง tab "_lists" เก็บ dropdown แบบบล็อก (list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น)
 *      แล้ว seed ค่าตั้งต้น "เฉพาะเมื่อยังว่าง" (ไม่ทับของเดิม)
 *
 * ปลอดภัยกับข้อมูลเดิม: หัวตารางจะเขียนก็ต่อเมื่อยังไม่ตรง และ dropdown seed เฉพาะตอนว่าง
 * ไฟล์นี้ generate จาก schema ของเว็บโดยตรง — header ตรงกับที่เว็บอ่าน/เขียน
 */

var LIST_SHEET = "_lists";

// หัวตารางของแต่ละโมดูล (ตรงกับ src/lib recordHeaders)
var PANEX_HEADERS = {
  "04_CS_Import": [
    "__id",
    "im_ops_status",
    "job_type",
    "imp_job_no",
    "im_cs",
    "co_agent_carrier",
    "sales_bkg_by",
    "etd_imp",
    "eta_imp",
    "imp_booking_mbl",
    "imp_hbl",
    "customer",
    "pol",
    "pod",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "vessel",
    "freetime_dem",
    "freetime_det",
    "term",
    "im_cs_remark",
    "im_doc",
    "enter_doc",
    "check_deposit",
    "scan_file",
    "imp_customer_ref",
    "imp_cs_remark2",
    "extra_require",
    "extra_req_type",
    "re_export",
    "re_export_type",
    "shipping_flag",
    "clearance_date",
    "duty_vat_amount",
    "shipp_extra_type",
    "transport_flag",
    "del_address",
    "delivery_date",
    "trans_extra_type",
    "trans_supp1",
    "trans_supp1_vol",
    "trans_supp1_sts",
    "trans_supp1_end",
    "trans_supp2",
    "trans_supp2_vol",
    "trans_supp2_sts",
    "trans_supp2_end",
    "trans_supp3",
    "trans_supp3_vol",
    "trans_supp3_sts",
    "trans_supp3_end",
    "warehouse_flag",
    "wh_rcv_date",
    "wha_extra_type",
    "wh_address",
    "wh_supp1",
    "wh_supp1_vol",
    "wh_actual_rcv",
    "wh_supp1_sts",
    "wh_supp1_end",
    "im_ops_status_date"
  ],
  "05_CS_Export": [
    "__id",
    "ex_ops_status",
    "job_type",
    "exp_job_no",
    "ex_cs",
    "sales_bkg_by",
    "etd_exp",
    "co_agent_carrier",
    "customer",
    "exp_booking_mbl",
    "exp_hbl",
    "pol",
    "pod",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "cy_date",
    "return_date",
    "vessel",
    "term",
    "ex_cs_remark",
    "cargo_type",
    "ex_doc",
    "si_cut_off",
    "si_submit",
    "vgm_cut_off",
    "vgm_submit",
    "closing_time",
    "sent_pre_alert",
    "exp_customer_ref",
    "ex_doc_remark",
    "extra_require",
    "extra_req_type",
    "shipping_flag",
    "clearance_date",
    "clearance_pending_reason",
    "shipp_extra_type",
    "clearance_end_date",
    "cs_note_ship",
    "transport_flag",
    "del_address",
    "delivery_date",
    "trans_extra_require",
    "trans_supp1",
    "trans_supp1_vol",
    "trans_supp1_sts",
    "trans_supp1_end",
    "trans_supp2",
    "trans_supp2_vol",
    "trans_supp2_sts",
    "trans_supp2_end",
    "trans_supp3",
    "trans_supp3_vol",
    "trans_supp3_sts",
    "trans_supp3_end",
    "cs_note_trans",
    "warehouse_flag",
    "wh_export_date",
    "wha_extra_type",
    "wh_address",
    "wh_supp1",
    "wh_supp1_vol",
    "wh_actual_rcv",
    "wh_supp1_sts",
    "wh_supp1_end",
    "wh_supp1_pending",
    "cs_note_wh",
    "ex_ops_status_date"
  ],
  "06_Shipping": [
    "__id",
    "shipp_status",
    "job_type",
    "job_no",
    "entry_pic",
    "booking_mbl",
    "hbl",
    "customer",
    "cargo_type",
    "customer_ref",
    "cs_pic",
    "cs_note_ship",
    "entry_no",
    "duty_pay",
    "duty_vat_amount",
    "entry_status",
    "tisi",
    "form_e",
    "co_form",
    "entry_remark",
    "extra_require",
    "extra_req_type",
    "shipping_remark",
    "clearance_date",
    "delivery_date",
    "eta_imp",
    "imp_pod",
    "etd_exp",
    "exp_pol",
    "ship_pic",
    "ship_outsourcing",
    "forgot_ot",
    "ot_requested",
    "ot_receipt_lost",
    "clearance_status",
    "clearance_pending_reason",
    "clearance_end_date",
    "ship_close_acc_status",
    "ship_close_acc_date",
    "shipp_status_date"
  ],
  "07_Transportation": [
    "__id",
    "trans_status",
    "job_type",
    "job_no",
    "trans_pic",
    "cs_pic",
    "booking_mbl",
    "customer",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "customer_ref",
    "cs_note_trans",
    "clearance_date",
    "delivery_date",
    "del_address",
    "extra_require",
    "extra_req_type",
    "trans_remark",
    "supp1",
    "supp1_vol",
    "supp1_fuel",
    "supp1_sts",
    "supp1_end",
    "supp1_kpi",
    "supp1_pending",
    "supp1_any_extra",
    "supp2",
    "supp2_vol",
    "supp2_fuel",
    "supp2_sts",
    "supp2_end",
    "supp2_kpi",
    "supp2_pending",
    "supp2_any_extra",
    "supp3",
    "supp3_vol",
    "supp3_fuel",
    "supp3_sts",
    "supp3_end",
    "supp3_kpi",
    "supp3_pending",
    "supp3_any_extra",
    "actual_delivery_date",
    "trans_status_date"
  ],
  "08_Warehouse": [
    "__id",
    "wha_status",
    "job_type",
    "job_no",
    "wh_pic",
    "cs_pic",
    "booking_mbl",
    "customer",
    "customer_ref",
    "cs_note_wh",
    "clearance_date",
    "delivery_date",
    "wh_address",
    "extra_require",
    "extra_req_type",
    "wha_remark",
    "wh_supp1",
    "wh_supp1_vol",
    "wh_actual_rcv",
    "wh_supp1_sts",
    "wh_supp1_end",
    "wh_supp1_kpi",
    "wh_supp1_pending",
    "actual_finished_date",
    "wha_status_date"
  ],
  "09_Extra_Service": [
    "__id",
    "extra_status",
    "job_type",
    "job_no",
    "booking_mbl",
    "customer",
    "cs_pic",
    "sales_bkg_by",
    "co_agent_carrier",
    "module",
    "supplier",
    "extra_req_type",
    "cost_pic",
    "count",
    "unit",
    "root_cause",
    "cost_remark",
    "cost_unit",
    "cost_cur",
    "cost_total",
    "cost_sts",
    "sell_pic",
    "sell_unit",
    "sell_cur",
    "margin_total",
    "profit_sts",
    "no_charge_remark",
    "sell_sts",
    "sell_remark",
    "ready_acc",
    "extra_status_date"
  ],
  "10_Accounting": [
    "__id",
    "acc_job_status",
    "acc_pic",
    "acc_approved_sts",
    "ap_pic",
    "job_type",
    "job_no",
    "booking_mbl",
    "customer",
    "module",
    "cs_pic",
    "sales_bkg_by",
    "supplier",
    "supp_inv",
    "ap_extra_req_type",
    "ap_root_cause",
    "ap_cost_unit",
    "ap_cost_cur",
    "ap_total_cost",
    "received_ship_close_acc",
    "ap_remark",
    "ap_status",
    "ar_pic",
    "customer_inv",
    "ar_sell_unit",
    "ar_sell_cur",
    "ar_total_sell",
    "billing_date",
    "cus_paid",
    "cus_paid_date",
    "ar_remark",
    "ar_status",
    "acc_job_status_date"
  ]
};

// ค่า dropdown ตั้งต้น (ตรงกับ LIST_SEED)
var PANEX_LIST_SEED = {
  "im_ops_status": [
    "Open",
    "In Progress",
    "Pending",
    "End"
  ],
  "job_type": [
    "Import/FCL",
    "Import/LCL",
    "Export/FCL",
    "Export/LCL",
    "Re-Export/FCL",
    "Re-Export/LCL"
  ],
  "im_cs": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "ex_cs": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "carrier": [
    "Maersk",
    "ONE",
    "Evergreen",
    "Co-Agent X"
  ],
  "sales": [
    "Sales 1",
    "Sales 2",
    "Sales 3"
  ],
  "customer": [
    "Customer A",
    "Customer B"
  ],
  "pol": [
    "THBKK",
    "THLCH",
    "CNSHA",
    "SGSIN"
  ],
  "pod": [
    "THLCH",
    "THBKK"
  ],
  "term": [
    "CIF",
    "FOB",
    "EXW",
    "CFR",
    "DAP",
    "DDP"
  ],
  "im_doc": [
    "DOC-A",
    "DOC-B"
  ],
  "ex_doc": [
    "DOC-A",
    "DOC-B"
  ],
  "enter_doc_status": [
    "Done",
    "Pending",
    "Revising",
    "N/A"
  ],
  "done_pending": [
    "Done",
    "Pending"
  ],
  "extra_service_type": [
    "ตรวจปล่อย",
    "เอกสารเพิ่ม",
    "ฉลากไทย",
    "OT",
    "Re-packing",
    "อื่น ๆ"
  ],
  "del_address": [
    "คลังลูกค้า A",
    "นิคม B"
  ],
  "supplier_transport": [
    "Trans Supp A",
    "Trans Supp B",
    "Trans Supp C"
  ],
  "wh_address": [
    "คลัง WH-1",
    "คลัง WH-2"
  ],
  "supplier_warehouse": [
    "WH Supp A",
    "WH Supp B"
  ],
  "entry_pic": [
    "NIROOTTI",
    "YO",
    "PORNTHEP",
    "BOONSONG",
    "Outsourcing"
  ],
  "ship_pic": [
    "NIROOTTI",
    "YO",
    "PORNTHEP",
    "BOONSONG",
    "Outsourcing"
  ],
  "trans_pic": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "wh_pic": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "acc_pic": [
    "THANITA",
    "CHUTIMA",
    "SAWAROT"
  ],
  "ar_pic": [
    "THANITA",
    "CHUTIMA",
    "SAWAROT"
  ],
  "sell_pic": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "cost_pic": [
    "POONYISA",
    "SUPAPORN",
    "NATTHANA",
    "NATTHAYA",
    "NANTHAWAN",
    "KAWINPAT",
    "NAPATCHAYA"
  ],
  "cargo_type": [
    "General Cargo",
    "Machine Cargo",
    "Dangerous Cargo",
    "Container Houses"
  ],
  "duty_pay": [
    "Duty Pay",
    "No Duty",
    "Customer Pay"
  ],
  "receipt_lost": [
    "Received",
    "Lost"
  ],
  "clearance_status": [
    "Pending",
    "Cleared",
    "Completed"
  ],
  "complete_sts": [
    "Complete",
    "Pending"
  ],
  "supplier_status": [
    "Active",
    "Pending",
    "End"
  ],
  "kpi": [
    "On Time",
    "Delay",
    "No Charge"
  ],
  "yes_no": [
    "Yes",
    "No"
  ],
  "cost_module": [
    "Import",
    "Export",
    "Shipping",
    "Transportation",
    "Warehouse",
    "CS Operation"
  ],
  "unit_list": [
    "Trip",
    "Container",
    "Shipment",
    "Set",
    "Day",
    "Hour",
    "Document",
    "Entry",
    "Lot",
    "Person"
  ],
  "root_cause": [
    "Customer Request",
    "Internal Error",
    "Transportation Error",
    "Warehouse Error",
    "CS Error",
    "Documentation Error"
  ],
  "currency": [
    "THB",
    "USD",
    "RMB",
    "EUR",
    "JPY",
    "Others"
  ],
  "profit_sts": [
    "With GP",
    "At Cost",
    "No Charge",
    "As Quotation"
  ],
  "approved_sts": [
    "Approved",
    "Pending"
  ],
  "rcv_ship_close_acc": [
    "Received",
    "Pending"
  ],
  "ap_status": [
    "Waiting Received Ship Close Acc",
    "Waiting Supplier Invoice",
    "Pending Approval",
    "Ready Payment",
    "Completed"
  ],
  "ar_status": [
    "Waiting Billing",
    "Invoiced",
    "Partial Paid",
    "Paid",
    "Overdue"
  ]
};

function PANEX_INITIALIZE() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];

  // ----- 1) โมดูล + หัวตาราง -----
  Object.keys(PANEX_HEADERS).forEach(function (name) {
    var headers = PANEX_HEADERS[name];
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    var width = headers.length;
    var cur = sh.getRange(1, 1, 1, width).getValues()[0];
    if (cur.join("|") !== headers.join("|")) {
      sh.getRange(1, 1, 1, width).setValues([headers]);
      report.push(name + " : เขียนหัวตาราง (" + width + " คอลัมน์)");
    } else {
      report.push(name + " : หัวตารางตรงอยู่แล้ว");
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, width).setFontWeight("bold");
  });

  // ----- 2) _lists : seed เฉพาะเมื่อว่าง -----
  report.push(seedLists_(ss));

  SpreadsheetApp.getUi().alert("PANEX Initialize เสร็จ

" + report.join("
"));
}

function seedLists_(ss) {
  var sh = ss.getSheetByName(LIST_SHEET);
  if (!sh) sh = ss.insertSheet(LIST_SHEET);

  // ตรวจว่ามีค่า list อยู่แล้วหรือยัง (ดูตั้งแต่แถว 2 ลงไป)
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var hasAny = false;
  if (lastRow >= 2 && lastCol >= 1) {
    var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    hasAny = vals.some(function (row) {
      return row.some(function (c) { return String(c).trim() !== ""; });
    });
  }
  if (hasAny) return LIST_SHEET + " : มี dropdown อยู่แล้ว (ข้าม seed)";

  // สร้างบล็อก: [key, ...values] เว้น 1 คอลัมน์คั่นแต่ละ list
  var keys = Object.keys(PANEX_LIST_SEED);
  var cols = [];
  keys.forEach(function (k, i) {
    cols.push([k].concat(PANEX_LIST_SEED[k] || []));
    if (i < keys.length - 1) cols.push([]); // คอลัมน์คั่น
  });
  var height = 1;
  cols.forEach(function (c) { if (c.length > height) height = c.length; });

  var matrix = [];
  for (var r = 0; r < height; r++) {
    var row = [];
    for (var c = 0; c < cols.length; c++) row.push(cols[c][r] != null ? cols[c][r] : "");
    matrix.push(row);
  }

  if (lastRow >= 1 && lastCol >= 1) sh.getRange(1, 1, lastRow, lastCol).clearContent();
  sh.getRange(1, 1, matrix.length, cols.length).setValues(matrix);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, cols.length).setFontWeight("bold");
  return LIST_SHEET + " : seed dropdown " + keys.length + " ชุด";
}
