// ทะเบียนโมดูลทั้งหมดของระบบ (PANEX Mini ERP) + master lists ที่ใช้ร่วมกัน
import { Field, ID_KEY, JOB_KEY } from "./fields";
import { IMPORT_FIELDS } from "./modules/csImport";
import { EXPORT_FIELDS } from "./modules/csExport";
import { SHIPPING_FIELDS } from "./modules/shipping";
import { TRANSPORT_FIELDS } from "./modules/transport";
import { WAREHOUSE_FIELDS } from "./modules/warehouse";
import { EXTRA_FIELDS } from "./modules/extra";
import { ACCOUNTING_FIELDS } from "./modules/accounting";
import { COST_RATE_FIELDS, SELL_RATE_FIELDS } from "./modules/rates";

export type { Field, FieldType, PullSpec } from "./fields";
export { ID_KEY, JOB_KEY } from "./fields";

// ===== โมดูล =====
export type ModuleKind = "import" | "export" | "downstream";

export interface ModuleDef {
  id: string; // = ชื่อชีท (เช่น 04_CS_Import)
  key: string; // route key (เช่น cs-import)
  label: string; // ชื่อเต็ม
  short: string; // ชื่อย่อบนเมนู
  kind: ModuleKind;
  jobNoKey: string; // คีย์ field ที่เป็นเลขงานของโมดูลนี้ (ใช้จับคู่ pull)
  picKey: string; // คีย์ field ผู้รับผิดชอบ (PIC) — ช่องเหลืองแก้ได้เมื่อมี PIC
  rate?: boolean; // true = ตารางเรท (Rate Checker) ไม่ใช่ job — ไม่เข้า dashboard/sync
  fields: Field[];
}

// ช่องระบบ (เติมอัตโนมัติ) ต่อท้ายทุกโมดูลงาน — ใช้คำนวณ aging / KPI รายเดือน
const SYSTEM_FIELDS: Field[] = [
  { key: "created_at", label: "Job Create Date", group: "ระบบ", type: "auto", width: 150, help: "วันเปิดงาน (อัตโนมัติ)" },
  { key: "ended_at", label: "Job End Date", group: "ระบบ", type: "auto", width: 150, help: "วันปิดงาน/End (อัตโนมัติ)" },
];
const withSystem = (fields: Field[]): Field[] => [...fields, ...SYSTEM_FIELDS.map((f) => ({ ...f }))];

// ----- โมดูลงาน (04–10) -----
export const MODULES: ModuleDef[] = [
  { id: "04_CS_Import", key: "cs-import", label: "CS Import", short: "Import", kind: "import", jobNoKey: "imp_job_no", picKey: "im_cs", fields: withSystem(IMPORT_FIELDS) },
  { id: "05_CS_Export", key: "cs-export", label: "CS Export", short: "Export", kind: "export", jobNoKey: "exp_job_no", picKey: "ex_cs", fields: withSystem(EXPORT_FIELDS) },
  { id: "06_Shipping", key: "shipping", label: "Shipping", short: "Shipping", kind: "downstream", jobNoKey: JOB_KEY, picKey: "ship_pic", fields: withSystem(SHIPPING_FIELDS) },
  { id: "07_Transportation", key: "transport", label: "Transportation", short: "Transport", kind: "downstream", jobNoKey: JOB_KEY, picKey: "trans_pic", fields: withSystem(TRANSPORT_FIELDS) },
  { id: "08_Warehouse", key: "warehouse", label: "Warehouse", short: "Warehouse", kind: "downstream", jobNoKey: JOB_KEY, picKey: "wh_pic", fields: withSystem(WAREHOUSE_FIELDS) },
  { id: "09_Extra_Service", key: "extra", label: "Extra / Service", short: "Extra", kind: "downstream", jobNoKey: JOB_KEY, picKey: "cost_pic", fields: withSystem(EXTRA_FIELDS) },
  { id: "10_Accounting", key: "accounting", label: "Accounting", short: "Accounting", kind: "downstream", jobNoKey: JOB_KEY, picKey: "acc_pic", fields: withSystem(ACCOUNTING_FIELDS) },
];

// ----- ตารางเรท (13) — ใช้ CRUD ร่วมกับโมดูลได้ แต่ไม่ใช่ job -----
export const RATE_MODULES: ModuleDef[] = [
  { id: "13_Cost_Rates", key: "cost-rates", label: "Cost Rates", short: "Cost", kind: "downstream", jobNoKey: "supplier", picKey: "", rate: true, fields: COST_RATE_FIELDS },
  { id: "13_Sell_Rates", key: "sell-rates", label: "Sell Rates", short: "Sell", kind: "downstream", jobNoKey: "customer", picKey: "", rate: true, fields: SELL_RATE_FIELDS },
];

// ทุกโมดูลที่มีชีท (ใช้ตอน snapshot / initialize / resolve API)
export const ALL_MODULES: ModuleDef[] = [...MODULES, ...RATE_MODULES];

export const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m])
);
export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.id, m])
);

// โมดูลต้นทางของการ pull (CS Import / Export)
export const IMPORT_MODULE = MODULE_BY_ID["04_CS_Import"];
export const EXPORT_MODULE = MODULE_BY_ID["05_CS_Export"];

// ----- helpers per-module -----
export function recordHeaders(m: ModuleDef): string[] {
  return [ID_KEY, ...m.fields.map((f) => f.key)];
}
export function fieldByKey(m: ModuleDef): Record<string, Field> {
  return Object.fromEntries(m.fields.map((f) => [f.key, f]));
}
export function moduleGroups(m: ModuleDef): string[] {
  const seen: string[] = [];
  for (const f of m.fields) if (!seen.includes(f.group)) seen.push(f.group);
  return seen;
}

// ===== ชีทเก็บ dropdown (แชร์ทุกโมดูล) =====
export const DB_SHEET = "_lists";

// ป้ายชื่อ list (ใช้ในหน้าตั้งค่า)
export const LIST_LABEL: Record<string, string> = {
  im_ops_status: "Status (Open/End)",
  job_type: "Job Type",
  im_cs: "IM/CS",
  ex_cs: "EX/CS",
  carrier: "Co-Agent / Carrier",
  sales: "Sales / BKG by",
  customer: "Customer",
  pol: "POL",
  pod: "POD",
  term: "Term",
  im_doc: "IM/DOC",
  ex_doc: "EX/DOC",
  enter_doc_status: "Doc Status (Done/Pending/…)",
  done_pending: "Done / Pending",
  check_deposit: "Check Deposit (Done/Pending/N/A)",
  extra_service_type: "Extra/Service Type",
  del_address: "Del Address",
  supplier_transport: "Transport Supplier",
  wh_address: "WH Address",
  supplier_warehouse: "Warehouse Supplier",
  entry_pic: "Entry PIC",
  ship_pic: "Ship PIC",
  trans_pic: "Trans PIC",
  wh_pic: "WH PIC",
  acc_pic: "Accounting PIC",
  ar_pic: "AR PIC",
  sell_pic: "Sell PIC",
  cost_pic: "Cost PIC",
  cargo_type: "Cargo Type",
  duty_pay: "Duty Pay",
  receipt_lost: "OT Receipt",
  clearance_status: "Clearance Status",
  complete_sts: "Complete / Pending",
  supplier_status: "Supplier Status",
  kpi: "Supplier KPI",
  yes_no: "Yes / No",
  cost_module: "Cost Module",
  unit_list: "Unit",
  root_cause: "Root Cause",
  currency: "Currency",
  profit_sts: "Profit Sts",
  approved_sts: "Approved / Pending",
  rcv_ship_close_acc: "Received Ship Close Acc",
  ap_status: "AP Status",
  ar_status: "AR Status",
  service_type: "Service Type (Rate)",
  sell_confirmed: "Sell Confirmed",
  place: "สถานที่ตรวจปล่อย (Place)",
  pv_status: "PV Status",
  form_e: "Form E",
  permit: "PERMIT (ใบอนุญาต)",
};

// ชื่อทีม (ใช้ซ้ำหลาย list)
const CS_NAMES = ["POONYISA", "SUPAPORN", "NATTHANA", "NATTHAYA", "NANTHAWAN", "KAWINPAT", "NAPATCHAYA"];
const ACC_NAMES = ["THANITA", "CHUTIMA", "SAWAROT"];
const SHIP_NAMES = ["NIROOTTI", "YO", "PORNTHEP", "BOONSONG", "Outsourcing"];

// ค่าตั้งต้น seed ตอน Initialize — ตรงกับ _lists ที่ใช้งานจริง (2026-07-30)
// แก้ได้ในหน้าตั้งค่า (ค่าที่นี่ใช้เฉพาะตอน Initialize ชีทใหม่)
export const LIST_SEED: Record<string, string[]> = {
  im_ops_status: ["Open", "In Progress", "Pending", "End", "Cancel"],
  job_type: ["Import/FCL", "Import/LCL", "Import/BULK", "Export/FCL", "Export/LCL", "Export/BULK", "Re-Export/FCL", "Re-Export/LCL", "Transportation Only", "Warehouse Only", "Shipping Only"],
  im_cs: ["POONYISA", "SUPAPORN", "NAPATCHAYA"],
  ex_cs: ["NATTHANA", "NATTHAYA", "NANTHAWAN", "KAWINPAT"],
  carrier: ["Maersk", "ONE", "Evergreen", "Co-Agent X", "HMM", "SHIPCO", "KMTC", "NAMSUNG", "PILOT", "UWS", "MARINE", "OOCL", "YOUNGFUN", "KLN", "SINOTRANS", "MSC", "HEUNG-A", "YANGMING", "TSLINE", "COSCO", "DPOWER", "ASL / FUJI", "CMA/CNC", "ZIM", "ORIENTAL", "RCL", "HPL", "WANHAI", "TOP INTER", "GOLDSTAR", "BENLINE", "JINJIANG"],
  sales: ["SEA AND LAND", "SWIFTTHAI", "EGF/SARAH", "TVL LOGISTICS", "YANKEY - DIRECT"],
  customer: [
    "YANKEY ENGINEERING (THAILAND) CO., LTD.",
    "JPF INTER SUPPLY CO., LTD.",
    "ROYAL FUJI ELEVATOR (THAILAND) CO., LTD.",
    "HRT NONWOVEN CO., LTD.",
    "ACTER TECHNOLOGY CO., LTD.",
    "YUANXING CONSTRUCTION (THAILAND) CO., LTD.",
    "RICH PAPER CO., LTD.",
    "JIANSEN PAPER CO.,LTD.",
    "IDEALSTEP CORPORATION CO., LTD.",
    "GOLDEN CRANE (GOLDEN DRAGON) CO.,LTD.",
    "ZHONGCE RUBBER (THAILAND) CO.,LTD.",
    "HENGTAI ADVANCED MATERIAL (THAILAND) CO., LTD.",
    "DBJ SMART HOME CO., LTD.",
    "RAISING TECHNOLOGY (THAILAND) CO., LTD.",
    "MAP PREFABRICATION HOUSING CO., LTD.",
    "ALLIANCE MULTISERVICE & SUPPLY CO., LTD.",
    "ASP CARGO COMPANY LIMITED",
    "XINFE CULTURE TECHNOLOGY (THAILAND) CO.,LTD.",
    "THAI FU HOUSE FRAME ( THAILAND ) CO.,LTD",
    "FRAME STEEL HOUSE CO., LTD.",
    "JISUO ENVIRONMENTALPROTECTION TECHNOLOGY CO., LTD.",
  ],
  pol: ["THBKK", "THLCH", "CNSHA", "SGSIN", "NINGBO", "NANSHA", "HOCHIMINH (VICT),VIETNAM", "SHEKOU", "XINGANG"],
  pod: ["THLCH", "THBKK", "NINGBO", "CNSHA", "SGSIN", "HOCHIMINH (VICT),VIETNAM"],
  term: ["CIF", "FOB", "EXW", "CFR", "DAP", "DDP", "DDU"],
  im_doc: ["POONYISA", "SUPAPORN"],
  ex_doc: ["NATTHANA", "NATTHAYA", "NANTHAWAN"],
  enter_doc_status: ["Done", "Pending", "Revising", "N/A"],
  done_pending: ["Done", "Pending"],
  check_deposit: ["Done", "Pending", "N/A"],
  extra_service_type: ["ตรวจปล่อย", "แก้ไขเอกสาร", "ค่าค้างหาง", "OT-TRUCK", "Re-packing", "อื่น ๆ", "Container Inspection", "Over weight / Truck", "CDI FEE", "PRINT FORM-E", "FOLK LIFT", "HANDLING"],
  del_address: [
    "BRAIN POWER",
    "DYNAMIC TECHNOLOGY",
    "DYNAMIC - BRAIN POWER",
    "COMPEQ",
    "UNITECH PCB - BRAINPOWER",
    "PENG SHEN (AVARY)",
    "EA WH BANGNA",
    "JOMTHONG 13 (R1), EA WH BANGNA (R2)",
    "HRT LCB",
    "LAT PHRAO 29",
    "RICH PAPER",
    "DYNAMIC-AVARY",
    "IDEALSTEP",
    "HENGTAI - RAYONG",
    "UNITECH PCB",
    "FREEZONE WAREHOUSE",
    "ALPHA PHANTHONG",
    "Sakolchai Transpack (Sriracha)",
    "PIONEER-BRAIN POWER",
    "PIONEER",
  ],
  supplier_transport: [
    "NP GLOBAL",
    "SS SERVICE 2013",
    "P&L TRANSPORT",
    "Jaguar",
    "THANAWIN TRANSPORT",
    "Progress Trans",
    "TERN Logistics",
    "NHL Transport",
    "Ally Trans &  TAMMACHART",
    "NNT Transpack",
    "THE PRINCESS PINE",
    "SUBSIAM CARRIER CO., LTD.",
    "REAL TIME",
    "UNIWISE",
    "CBMT โชคบุญมี",
    "ทรัพย์ศิวะพร SSWP",
    "M BRIGHT LOGISTICS  AND SUPPLY",
    "K.S.F TRANSPORT",
    "KLINE",
    "Barkley",
    "SST ทรัพย์สถิตย์ยิ่งเจริญ",
    "HOMKHUN",
    "KK MOOK JAROEN",
    "CBL โชคบุญเหลือ โลจิสติกส์",
    "SN. ASIA CO., LTD.",
    "Thai Global Logistics",
    "RUGA LOGISTICS",
    "Panex Supply Chain Management (Thailand) Co., Ltd.",
    "NATTHARAT TRANSPORT",
    "Commander  Transport",
    "DMT TRANSPORT CO.,LTD",
    "88 Slide On",
    "RUTSADA  TRANSPORT",
  ],
  wh_address: ["EA (BANGNA)", "EA (UNIWISE)", "RUGA LOGISTICS", "Sakolchai Transpack (Sriracha)"],
  supplier_warehouse: ["EA Logistics Link Co., Ltd.", "RUGA LOGISTICS"],
  entry_pic: SHIP_NAMES,
  ship_pic: SHIP_NAMES,
  trans_pic: CS_NAMES,
  wh_pic: CS_NAMES,
  acc_pic: ACC_NAMES,
  ar_pic: ACC_NAMES,
  sell_pic: CS_NAMES,
  cost_pic: CS_NAMES,
  cargo_type: ["General Cargo", "Machine Cargo", "Dangerous Cargo", "Container Houses"],
  duty_pay: ["Duty Pay", "No Duty", "Customer Pay"],
  receipt_lost: ["Received", "Lost"],
  clearance_status: ["Pending", "Cleared", "Completed"],
  complete_sts: ["Complete", "Pending"],
  supplier_status: ["Active", "Pending", "End"],
  kpi: ["On Time", "Delay", "No Charge"],
  yes_no: ["Yes", "No"],
  cost_module: ["Import", "Export", "Shipping", "Transportation", "Warehouse", "CS Operation", "Re-Export"],
  unit_list: ["Trip", "Container", "Shipment", "Set", "Day", "Hour", "Document", "Entry", "Lot", "Person"],
  root_cause: ["Customer Request", "Internal Error", "Transportation Error", "Warehouse Error", "CS Error", "Documentation Error", "Shipping Error"],
  currency: ["THB", "USD", "RMB", "EUR", "JPY", "Others"],
  profit_sts: ["With GP", "At Cost", "No Charge", "As Quotation"],
  approved_sts: ["Approved", "Pending"],
  rcv_ship_close_acc: ["Received", "Pending"],
  ap_status: ["Waiting Received Ship Close Acc", "Waiting Supplier Invoice", "Pending Approval", "Ready Payment", "Completed"],
  ar_status: ["Waiting Billing", "Invoiced", "Partial Paid", "Paid", "Overdue"],
  service_type: ["Freight", "Shipping", "Transportation", "Warehouse"],
  sell_confirmed: ["Yes", "No", "Waiting"],
  place: ["LCB", "BANGKOK", "LAT KRABANG", "ICD"],
  pv_status: ["รอจ่าย", "จ่ายแล้ว", "จบแล้ว"], // ในชีทจริงยังว่าง — คงค่าตั้งต้นเดิมไว้
  form_e: ["CFM", "RECEIVED ORI", "CHECKING", "NEED REVISE", "CFM-PRINT", "CFM-SCAN FE", "Customer confirm"],
  permit: ["TISI", "PHYTO", "ชั่งตวงวัด", "EXCISE LICENSE"],
};

// list ทั้งหมดที่ต้อง seed/อ่าน
export const ALL_LISTS = Object.keys(LIST_SEED);

// สีตั้งต้นของ Co-Agent / Carrier (ใช้เมื่อยังไม่เคยตั้งค่าใน _settings!A2)
// ตั้งค่าเพิ่ม/แก้ได้ที่หน้าตั้งค่า → Co-Agent / Carrier
export const CARRIER_COLOR_SEED: Record<string, string> = {
  Evergreen: "#50f262",
  YANGMING: "#3eeade",
  MSC: "#fbefa2",
  ZIM: "#fb8451",
  OOCL: "#e199f5",
  COSCO: "#f584d7",
  TSLINE: "#f49595",
  "CMA/CNC": "#e30d0d",
  ONE: "#4068dd",
};
