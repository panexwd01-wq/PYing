/**
 * CS Import — Initialize (Google Apps Script)
 * ------------------------------------------------------------------
 * ใช้แทนปุ่ม Initialize ในเว็บ — รันแยกเองครั้งเดียวตอนตั้งค่าชีท
 *
 * วิธีใช้:
 *   1) เปิด Google Sheet ที่จะใช้งาน → เมนู Extensions → Apps Script
 *   2) วางโค้ดทั้งไฟล์นี้ลงไป (ลบโค้ดตัวอย่างเดิมออก)
 *   3) ถ้า "รันจากในชีทนี้เลย" (bound script) ปล่อย SHEET_ID = '' ได้
 *      ถ้ารันแบบ standalone ให้ใส่ SHEET_ID ของชีทเป้าหมาย
 *   4) เลือกฟังก์ชัน initializeWorkbook → กด Run (ครั้งแรกจะให้ขออนุญาตสิทธิ์)
 *
 * ทำอะไร:
 *   - สร้าง/ตรวจหัวตาราง 04_CS_Import (คอลัมน์ A = __id แล้วตามด้วย 63 ฟิลด์)
 *   - seed dropdown ตั้งต้นใน _database แบบ "บล็อก" (list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น)
 *     จะ seed เฉพาะเมื่อ _database ยังว่าง (ปลอดภัยกับข้อมูลเดิม)
 *
 * หมายเหตุ: ลำดับ FIELD_KEYS และ LIST_SEED ต้องตรงกับ src/lib/schema.ts เสมอ
 *           ถ้าแก้ schema ในเว็บ อย่าลืมแก้ที่นี่ให้ตรงกันด้วย
 * ------------------------------------------------------------------
 */

// ใส่ SHEET_ID ถ้ารันแบบ standalone; ปล่อยว่างถ้าเป็น bound script (รันจากในชีท)
var SHEET_ID = '';

var DATA_SHEET = '04_CS_Import';
var DB_SHEET = '_database';
var ID_KEY = '__id';

// ===== 63 ฟิลด์ ตามลำดับใน schema.ts (FIELDS) =====
var FIELD_KEYS = [
  // OPS
  'im_ops_status', 'job_type', 'imp_job_no', 'im_cs', 'co_agent_carrier',
  'sales_bkg_by', 'etd_imp', 'eta_imp', 'imp_booking_mbl', 'imp_hbl',
  'customer', 'pol', 'pod', 'cnt_4w', 'cnt_6w', 'cnt_10w', 'cnt_20gp',
  'cnt_40hq', 'vessel', 'freetime_dem', 'freetime_det', 'term', 'im_cs_remark',
  // Documentation
  'im_doc', 'enter_doc', 'check_deposit', 'scan_file', 'imp_customer_ref',
  'imp_cs_remark2',
  // Extra / Service
  'extra_require', 'extra_req_type', 're_export', 're_export_type',
  // Shipping
  'shipping_flag', 'clearance_date', 'duty_vat_amount', 'shipp_extra_type',
  // Transport
  'transport_flag', 'del_address', 'delivery_date', 'trans_extra_type',
  'trans_supp1', 'trans_supp1_vol', 'trans_supp1_sts', 'trans_supp1_end',
  'trans_supp2', 'trans_supp2_vol', 'trans_supp2_sts', 'trans_supp2_end',
  'trans_supp3', 'trans_supp3_vol', 'trans_supp3_sts', 'trans_supp3_end',
  // Warehouse
  'warehouse_flag', 'wh_rcv_date', 'wha_extra_type', 'wh_address', 'wh_supp1',
  'wh_supp1_vol', 'wh_actual_rcv', 'wh_supp1_sts', 'wh_supp1_end',
  // Job Closing
  'im_ops_status_date'
];

var RECORD_HEADERS = [ID_KEY].concat(FIELD_KEYS);

// ===== dropdown ตั้งต้น (ตรงกับ LIST_SEED ใน schema.ts) =====
// ลำดับ key ต้องตรงกับ ALL_LISTS (= ลำดับ key ใน LIST_SEED)
var LIST_KEYS = [
  'im_ops_status', 'job_type', 'im_cs', 'carrier', 'sales', 'customer',
  'pol', 'pod', 'term', 'im_doc', 'enter_doc_status', 'done_pending',
  'extra_service_type', 'del_address', 'supplier_transport', 'wh_address',
  'supplier_warehouse'
];

var LIST_SEED = {
  im_ops_status: ['Open', 'In Progress', 'Pending', 'End'],
  job_type: ['Import/FCL', 'Import/LCL', 'Re-Export/FCL', 'Re-Export/LCL'],
  im_cs: ['CS-A', 'CS-B', 'CS-C'],
  carrier: ['Maersk', 'ONE', 'Evergreen', 'Co-Agent X'],
  sales: ['Sales 1', 'Sales 2'],
  customer: ['Customer A', 'Customer B'],
  pol: ['THBKK', 'THLCH', 'CNSHA', 'SGSIN'],
  pod: ['THLCH', 'THBKK'],
  term: ['CIF', 'FOB', 'EXW', 'CFR', 'DAP', 'DDP'],
  im_doc: ['DOC-A', 'DOC-B'],
  enter_doc_status: ['Done', 'Pending', 'Revising', 'N/A'],
  done_pending: ['Done', 'Pending'],
  extra_service_type: ['ตรวจปล่อย', 'เอกสารเพิ่ม', 'ฉลากไทย', 'อื่น ๆ'],
  del_address: ['คลังลูกค้า A', 'นิคม B'],
  supplier_transport: ['Trans Supp A', 'Trans Supp B', 'Trans Supp C'],
  wh_address: ['คลัง WH-1', 'คลัง WH-2'],
  supplier_warehouse: ['WH Supp A', 'WH Supp B']
};

// ===== entry point =====
function initializeWorkbook() {
  var ss = getSpreadsheet_();
  ensureDataSheet_(ss);
  seedListsIfEmpty_(ss);
  notify_('ตั้งค่าชีทเรียบร้อย (หัวตาราง + dropdown ตั้งต้น)');
}

function getSpreadsheet_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('ไม่พบ active spreadsheet — กรุณาใส่ค่า SHEET_ID ด้านบนของสคริปต์');
  }
  return ss;
}

// สร้าง/ตรวจหัวตาราง record (เขียนหัวเฉพาะเมื่อยังไม่ตรง — ไม่แตะข้อมูลแถวอื่น)
function ensureDataSheet_(ss) {
  var sh = ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);
  var n = RECORD_HEADERS.length;
  var current = sh.getRange(1, 1, 1, n).getValues()[0];
  if (current.join('|') !== RECORD_HEADERS.join('|')) {
    sh.getRange(1, 1, 1, n).setValues([RECORD_HEADERS]);
  }
}

// seed เฉพาะเมื่อ _database ยังไม่มีค่าใด ๆ ใต้หัว (เลียนแบบ seedListsIfEmpty ในเว็บ)
function seedListsIfEmpty_(ss) {
  var sh = ss.getSheetByName(DB_SHEET);
  if (sh && hasAnyListValue_(sh)) return;
  writeLists_(ss, LIST_SEED);
}

function hasAnyListValue_(sh) {
  if (sh.getLastRow() < 2) return false;
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    for (var c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).trim() !== '') return true;
    }
  }
  return false;
}

// เขียน list ทั้งหมดแบบบล็อก: list ละ 1 คอลัมน์ [key, ...values] เว้น 1 คอลัมน์คั่น
// (ต้องตรงกับ writeLists ใน src/lib/db.ts เพื่อให้ readLists ฝั่งเว็บ parse ได้)
function writeLists_(ss, lists) {
  var sh = ss.getSheetByName(DB_SHEET) || ss.insertSheet(DB_SHEET);

  var cols = [];
  for (var i = 0; i < LIST_KEYS.length; i++) {
    var k = LIST_KEYS[i];
    cols.push([k].concat(lists[k] || []));
    if (i < LIST_KEYS.length - 1) cols.push([]); // คอลัมน์คั่นแต่ละบล็อก
  }

  var height = 1;
  for (var c = 0; c < cols.length; c++) {
    if (cols[c].length > height) height = cols[c].length;
  }

  var matrix = [];
  for (var r = 0; r < height; r++) {
    var row = [];
    for (var c2 = 0; c2 < cols.length; c2++) {
      row.push(r < cols[c2].length ? cols[c2][r] : '');
    }
    matrix.push(row);
  }

  sh.clearContents();
  sh.getRange(1, 1, matrix.length, cols.length).setValues(matrix);
}

// แจ้งผล: ใช้ toast ถ้ามี UI, ไม่งั้น log ลง Execution log
function notify_(msg) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'CS Import', 5);
  } catch (e) {
    Logger.log(msg);
  }
}
