/**
 * PANEX Mini ERP — Initialize (Google Apps Script)
 * รันฟังก์ชัน PANEX_INITIALIZE() หนึ่งครั้งใน Editor ของ Google Sheets
 *
 * ทำอะไร:
 *   1) สร้าง tab ของทุกโมดูล (04–10 + เรท 13) พร้อมหัวตาราง (คอลัมน์ A = __id ภายใน)
 *   2) สร้าง tab "_lists" เก็บ dropdown แบบบล็อก (list ละ 1 คอลัมน์ เว้น 1 คอลัมน์คั่น)
 *      แล้ว seed ค่าตั้งต้น "เฉพาะเมื่อยังว่าง" (ไม่ทับของเดิม)
 *   3) สร้าง tab "_users" (ผู้ใช้ระบบ + สิทธิ์) และ "_settings" ให้พร้อมใช้
 *      — ผู้ใช้ตั้งต้น admin / admin ระบบเว็บจะสร้างให้เองอัตโนมัติเมื่อล็อกอินครั้งแรก
 *        (รหัสผ่านต้อง hash ด้วย scrypt ซึ่ง Apps Script ทำไม่ได้ จึงปล่อยให้ฝั่งเว็บสร้าง)
 *
 * ไฟล์นี้ generate จาก schema ของเว็บโดยตรง — header ตรงกับที่เว็บอ่าน/เขียน
 *
 * ⚠️ เวอร์ชันนี้เปลี่ยนคอลัมน์ของ 04/05/06 (PERMIT/Form E), 09 (ตาราง Sell/Job Cost)
 *    และ 13 (Service Types / Remarks-Conditions) → ควรเคลียร์ข้อมูลในชีท 09 และ 13
 *    ก่อนรัน Initialize เพื่อไม่ให้ค่าเดิมเลื่อนคอลัมน์
 *
 * หมายเหตุ: ฝั่งเว็บไม่มีปุ่ม Initialize แล้ว — การตั้งค่าชีททั้งหมดทำที่ไฟล์นี้เท่านั้น
 */

var LIST_SHEET = "_lists";
var USERS_SHEET = "_users";
var SETTINGS_SHEET = "_settings";

// หัวตารางของชีทผู้ใช้ (ตรงกับ src/lib/users.ts)
var PANEX_USER_HEADERS = [
  "__id",
  "username",
  "password",
  "display_name",
  "role",
  "active",
  "perms",
  "created_at"
];

// หัวตารางของแต่ละโมดูล (ตรงกับ src/lib recordHeaders)
var PANEX_HEADERS = {
  "04_CS_Import": [
    "__id",
    "im_ops_status",
    "job_type",
    "im_cs",
    "imp_job_no",
    "customer",
    "eta_imp",
    "re_export",
    "co_agent_carrier",
    "sales_bkg_by",
    "imp_booking_mbl",
    "imp_booking_mbl_color",
    "imp_hbl",
    "im_cs_remark",
    "etd_imp",
    "import_port",
    "pol",
    "pod",
    "vessel",
    "freetime",
    "term",
    "cargo_type",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "pv_no",
    "pv_status",
    "im_doc",
    "enter_doc_cutoff",
    "enter_doc",
    "check_deposit",
    "check_deposit_done_date",
    "scan_file",
    "total_pkg",
    "imp_customer_ref",
    "im_doc_remark",
    "extra_require",
    "extra_req_type",
    "shipping_flag",
    "clearance_date",
    "cs_note_ship",
    "shipp_extra_type",
    "ship_outsourcing",
    "duty_vat_amount",
    "entry_status",
    "permit",
    "form_e",
    "transport_flag",
    "cs_note_trans",
    "trans_extra_type",
    "delivery_date",
    "trans_supp1",
    "trans_supp1_vol",
    "trans_supp1_del_addr",
    "trans_supp1_delivery",
    "trans_supp1_sts",
    "trans_supp1_pending",
    "trans_supp1_end",
    "trans_supp1_any_extra",
    "trans_supp2",
    "trans_supp2_vol",
    "trans_supp2_del_addr",
    "trans_supp2_delivery",
    "trans_supp2_sts",
    "trans_supp2_pending",
    "trans_supp2_end",
    "trans_supp2_any_extra",
    "trans_supp3",
    "trans_supp3_vol",
    "trans_supp3_del_addr",
    "trans_supp3_delivery",
    "trans_supp3_sts",
    "trans_supp3_pending",
    "trans_supp3_end",
    "trans_supp3_any_extra",
    "warehouse_flag",
    "wh_rcv_date",
    "wha_extra_type",
    "cs_note_wh",
    "wh_supp1",
    "wh_supp1_vol",
    "wh_address",
    "wh_actual_rcv",
    "wh_supp1_pending",
    "wh_supp1_sts",
    "wh_supp1_end",
    "im_ops_status_date",
    "created_at",
    "ended_at",
  ],
  "05_CS_Export": [
    "__id",
    "ex_ops_status",
    "job_type",
    "ex_cs",
    "exp_job_no",
    "exp_booking_mbl",
    "exp_hbl",
    "customer",
    "etd_exp",
    "re_export",
    "co_agent_carrier",
    "sales_bkg_by",
    "eta_imp",
    "ex_cs_remark",
    "cargo_type",
    "pol",
    "pod",
    "vessel",
    "freetime",
    "term",
    "cy_date",
    "return_date",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "pv_no",
    "pv_status",
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
    "cs_note_ship",
    "shipp_extra_type",
    "ship_outsourcing",
    "duty_vat_amount",
    "entry_status",
    "permit",
    "form_e",
    "transport_flag",
    "cs_note_trans",
    "trans_extra_type",
    "delivery_date",
    "trans_supp1",
    "trans_supp1_vol",
    "trans_supp1_del_addr",
    "trans_supp1_delivery",
    "trans_supp1_sts",
    "trans_supp1_pending",
    "trans_supp1_end",
    "trans_supp1_any_extra",
    "trans_supp2",
    "trans_supp2_vol",
    "trans_supp2_del_addr",
    "trans_supp2_delivery",
    "trans_supp2_sts",
    "trans_supp2_pending",
    "trans_supp2_end",
    "trans_supp2_any_extra",
    "trans_supp3",
    "trans_supp3_vol",
    "trans_supp3_del_addr",
    "trans_supp3_delivery",
    "trans_supp3_sts",
    "trans_supp3_pending",
    "trans_supp3_end",
    "trans_supp3_any_extra",
    "warehouse_flag",
    "wh_export_date",
    "wha_extra_type",
    "cs_note_wh",
    "wh_supp1",
    "wh_supp1_vol",
    "wh_address",
    "wh_actual_rcv",
    "wh_supp1_pending",
    "wh_supp1_sts",
    "wh_supp1_end",
    "ex_ops_status_date",
    "data_from_import",
    "created_at",
    "ended_at",
  ],
  "06_Shipping": [
    "__id",
    "shipp_status",
    "job_type",
    "entry_pic",
    "job_no",
    "booking_mbl",
    "hbl",
    "customer",
    "cargo_type",
    "import_port",
    "customer_ref",
    "cs_pic",
    "cs_note_ship",
    "entry_no",
    "duty_pay",
    "duty_vat_amount",
    "entry_status",
    "tisi",
    "permit",
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
    "shipp_status_date",
    "created_at",
    "ended_at",
  ],
  "07_Transportation": [
    "__id",
    "trans_status",
    "job_type",
    "trans_pic",
    "cs_pic",
    "job_no",
    "booking_mbl",
    "customer",
    "import_port",
    "cnt_4w",
    "cnt_6w",
    "cnt_10w",
    "cnt_20gp",
    "cnt_40hq",
    "customer_ref",
    "cs_note_trans",
    "clearance_date",
    "delivery_date",
    "extra_require",
    "extra_req_type",
    "trans_remark",
    "supp1",
    "supp1_vol",
    "supp1_del_addr",
    "supp1_delivery",
    "supp1_fuel",
    "supp1_sts",
    "supp1_end",
    "supp1_kpi",
    "supp1_pending",
    "supp1_any_extra",
    "supp2",
    "supp2_vol",
    "supp2_del_addr",
    "supp2_delivery",
    "supp2_fuel",
    "supp2_sts",
    "supp2_end",
    "supp2_kpi",
    "supp2_pending",
    "supp2_any_extra",
    "supp3",
    "supp3_vol",
    "supp3_del_addr",
    "supp3_delivery",
    "supp3_fuel",
    "supp3_sts",
    "supp3_end",
    "supp3_kpi",
    "supp3_pending",
    "supp3_any_extra",
    "actual_delivery_date",
    "trans_status_date",
    "created_at",
    "ended_at",
  ],
  "08_Warehouse": [
    "__id",
    "wha_status",
    "job_type",
    "wh_pic",
    "cs_pic",
    "job_no",
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
    "wha_status_date",
    "created_at",
    "ended_at",
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
    "root_cause",
    "cost_remark",
    "cost_total",
    "cost_sts",
    "sell_pic",
    "margin_total",
    "profit_sts",
    "no_charge_remark",
    "sell_sts",
    "sell_remark",
    "sell_line_type",
    "sell_qty",
    "sell_unit_name",
    "sell_unit",
    "sell_cur",
    "sell_exchange",
    "sell_received_from",
    "sell_usd",
    "sell_baht",
    "cost_line_type",
    "cost_qty",
    "cost_unit_name",
    "cost_unit",
    "cost_cur",
    "cost_exchange",
    "cost_paid_to",
    "cost_usd",
    "cost_baht",
    "ready_acc",
    "extra_status_date",
    "created_at",
    "ended_at",
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
    "acc_job_status_date",
    "created_at",
    "ended_at",
  ],
  "13_Cost_Rates": [
    "__id",
    "supplier",
    "customer",
    "job_type",
    "port_route",
    "cargo_type",
    "to_address",
    "cost_rate",
    "fuel_rate",
    "service_type",
    "remarks_conditions",
    "checked_by",
    "updated_at",
  ],
  "13_Sell_Rates": [
    "__id",
    "customer",
    "job_type",
    "port_route",
    "cargo_type",
    "to_address",
    "sell_rate",
    "fuel_rate",
    "service_type",
    "remarks_conditions",
    "sell_confirmed",
    "quoted_by",
    "updated_at",
  ]
};

var PANEX_LIST_SEED = {
  "im_ops_status": ["Open","In Progress","Pending","End","Cancel"],
  "job_type": ["Import/FCL","Import/LCL","Import/BULK","Export/FCL","Export/LCL","Export/BULK","Re-Export/FCL","Re-Export/LCL","Transportation Only","Warehouse Only","Shipping Only"],
  "im_cs": ["POONYISA","SUPAPORN","NAPATCHAYA"],
  "ex_cs": ["NATTHANA","NATTHAYA","NANTHAWAN","KAWINPAT"],
  "carrier": ["Maersk","ONE","Evergreen","Co-Agent X","HMM","SHIPCO","KMTC","NAMSUNG","PILOT","UWS","MARINE","OOCL","YOUNGFUN","KLN","SINOTRANS","MSC","HEUNG-A","YANGMING","TSLINE","COSCO","DPOWER","ASL / FUJI","CMA/CNC","ZIM","ORIENTAL","RCL","HPL","WANHAI","TOP INTER","GOLDSTAR","BENLINE","JINJIANG"],
  "sales": ["SEA AND LAND","SWIFTTHAI","EGF/SARAH","TVL LOGISTICS","YANKEY - DIRECT"],
  "customer": ["YANKEY ENGINEERING (THAILAND) CO., LTD.","JPF INTER SUPPLY CO., LTD.","ROYAL FUJI ELEVATOR (THAILAND) CO., LTD.","HRT NONWOVEN CO., LTD.","ACTER TECHNOLOGY CO., LTD.","YUANXING CONSTRUCTION (THAILAND) CO., LTD.","RICH PAPER CO., LTD.","JIANSEN PAPER CO.,LTD.","IDEALSTEP CORPORATION CO., LTD.","GOLDEN CRANE (GOLDEN DRAGON) CO.,LTD.","ZHONGCE RUBBER (THAILAND) CO.,LTD.","HENGTAI ADVANCED MATERIAL (THAILAND) CO., LTD.","DBJ SMART HOME CO., LTD.","RAISING TECHNOLOGY (THAILAND) CO., LTD.","MAP PREFABRICATION HOUSING CO., LTD.","ALLIANCE MULTISERVICE & SUPPLY CO., LTD.","ASP CARGO COMPANY LIMITED","XINFE CULTURE TECHNOLOGY (THAILAND) CO.,LTD.","THAI FU HOUSE FRAME ( THAILAND ) CO.,LTD","FRAME STEEL HOUSE CO., LTD.","JISUO ENVIRONMENTALPROTECTION TECHNOLOGY CO., LTD."],
  "pol": ["THBKK","THLCH","CNSHA","SGSIN","NINGBO","NANSHA","HOCHIMINH (VICT),VIETNAM","SHEKOU","XINGANG"],
  "pod": ["THLCH","THBKK","NINGBO","CNSHA","SGSIN","HOCHIMINH (VICT),VIETNAM"],
  "term": ["CIF","FOB","EXW","CFR","DAP","DDP","DDU"],
  "im_doc": ["POONYISA","SUPAPORN"],
  "ex_doc": ["NATTHANA","NATTHAYA","NANTHAWAN"],
  "enter_doc_status": ["Done","Pending","Revising","N/A"],
  "done_pending": ["Done","Pending"],
  "check_deposit": ["Done","Pending","N/A"],
  "extra_service_type": ["ตรวจปล่อย","แก้ไขเอกสาร","ค่าค้างหาง","OT-TRUCK","Re-packing","อื่น ๆ","Container Inspection","Over weight / Truck","CDI FEE","PRINT FORM-E","FOLK LIFT","HANDLING"],
  "del_address": ["BRAIN POWER","DYNAMIC TECHNOLOGY","DYNAMIC - BRAIN POWER","COMPEQ","UNITECH PCB - BRAINPOWER","PENG SHEN (AVARY)","EA WH BANGNA","JOMTHONG 13 (R1), EA WH BANGNA (R2)","HRT LCB","LAT PHRAO 29","RICH PAPER","DYNAMIC-AVARY","IDEALSTEP","HENGTAI - RAYONG","UNITECH PCB","FREEZONE WAREHOUSE","ALPHA PHANTHONG","Sakolchai Transpack (Sriracha)","PIONEER-BRAIN POWER","PIONEER"],
  "supplier_transport": ["NP GLOBAL","SS SERVICE 2013","P&L TRANSPORT","Jaguar","THANAWIN TRANSPORT","Progress Trans","TERN Logistics","NHL Transport","Ally Trans &  TAMMACHART","NNT Transpack","THE PRINCESS PINE","SUBSIAM CARRIER CO., LTD.","REAL TIME","UNIWISE","CBMT โชคบุญมี","ทรัพย์ศิวะพร SSWP","M BRIGHT LOGISTICS  AND SUPPLY","K.S.F TRANSPORT","KLINE","Barkley","SST ทรัพย์สถิตย์ยิ่งเจริญ","HOMKHUN","KK MOOK JAROEN","CBL โชคบุญเหลือ โลจิสติกส์","SN. ASIA CO., LTD.","Thai Global Logistics","RUGA LOGISTICS","Panex Supply Chain Management (Thailand) Co., Ltd.","NATTHARAT TRANSPORT","Commander  Transport","DMT TRANSPORT CO.,LTD","88 Slide On","RUTSADA  TRANSPORT"],
  "wh_address": ["EA (BANGNA)","EA (UNIWISE)","RUGA LOGISTICS","Sakolchai Transpack (Sriracha)"],
  "supplier_warehouse": ["EA Logistics Link Co., Ltd.","RUGA LOGISTICS"],
  "entry_pic": ["NIROOTTI","YO","PORNTHEP","BOONSONG","Outsourcing"],
  "ship_pic": ["NIROOTTI","YO","PORNTHEP","BOONSONG","Outsourcing"],
  "trans_pic": ["POONYISA","SUPAPORN","NATTHANA","NATTHAYA","NANTHAWAN","KAWINPAT","NAPATCHAYA"],
  "wh_pic": ["POONYISA","SUPAPORN","NATTHANA","NATTHAYA","NANTHAWAN","KAWINPAT","NAPATCHAYA"],
  "acc_pic": ["THANITA","CHUTIMA","SAWAROT"],
  "ar_pic": ["THANITA","CHUTIMA","SAWAROT"],
  "sell_pic": ["POONYISA","SUPAPORN","NATTHANA","NATTHAYA","NANTHAWAN","KAWINPAT","NAPATCHAYA"],
  "cost_pic": ["POONYISA","SUPAPORN","NATTHANA","NATTHAYA","NANTHAWAN","KAWINPAT","NAPATCHAYA"],
  "cargo_type": ["General Cargo","Machine Cargo","Dangerous Cargo","Container Houses"],
  "duty_pay": ["Duty Pay","No Duty","Customer Pay"],
  "receipt_lost": ["Received","Lost"],
  "clearance_status": ["Pending","Cleared","Completed"],
  "complete_sts": ["Complete","Pending"],
  "supplier_status": ["Active","Pending","End"],
  "kpi": ["On Time","Delay","No Charge"],
  "yes_no": ["Yes","No"],
  "cost_module": ["Import","Export","Shipping","Transportation","Warehouse","CS Operation","Re-Export"],
  "unit_list": ["Trip","Container","Shipment","Set","Day","Hour","Document","Entry","Lot","Person"],
  "root_cause": ["Customer Request","Internal Error","Transportation Error","Warehouse Error","CS Error","Documentation Error","Shipping Error"],
  "currency": ["THB","USD","RMB","EUR","JPY","Others"],
  "profit_sts": ["With GP","At Cost","No Charge","As Quotation"],
  "approved_sts": ["Approved","Pending"],
  "rcv_ship_close_acc": ["Received","Pending"],
  "ap_status": ["Waiting Received Ship Close Acc","Waiting Supplier Invoice","Pending Approval","Ready Payment","Completed"],
  "ar_status": ["Waiting Billing","Invoiced","Partial Paid","Paid","Overdue"],
  "service_type": ["Freight","Shipping","Transportation","Warehouse"],
  "sell_confirmed": ["Yes","No","Waiting"],
  "place": ["LCB","BANGKOK","LAT KRABANG","ICD"],
  "pv_status": ["รอจ่าย","จ่ายแล้ว","จบแล้ว"],
  "form_e": ["CFM","RECEIVED ORI","CHECKING","NEED REVISE","CFM-PRINT","CFM-SCAN FE","Customer confirm"],
  "permit": ["TISI","PHYTO","ชั่งตวงวัด","EXCISE LICENSE"]
};

var PANEX_USER_SEED = [
  ["Ums0d8tf86aic","admin","scrypt$247632e4708b0bcbdff81315fe38b232$114abb61e0b4c0ac8e2e6f54f6ee62a89b2f50dfed7fbce048a0589ddbdcf7ff","Administrator","admin","Yes","{\"tabs\":{},\"lists\":true}","2026-07-25 12:49"],
  ["Ums2gyur7hyew","POONYISA","scrypt$777e0a6bedc0bb06a4170dc374c56664$68081536660768b3c4f14d539f46a562bd698c9dca28996bfa64d92c721cc5c1","POONYISA","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:09"],
  ["Ums2h1f761dod","SUPAPORN","scrypt$2658f283c153727f955b06793e50edc5$9114b9697f1be835e9ac7a3a5c398fcf3bf1c773266409e37636d1a88709ea71","SUPAPORN","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:11"],
  ["Ums2h7jb2ja8f","NATTHAYA","scrypt$41acc3142108ba63197826b5b14eeded$fc83278dbaea016df17a0696f19c28d105ed8fb7c47ec7514e72d15f3f6631dc","NATTHAYA","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:15"],
  ["Ums2hg5ohilhc","NANTHAWAN","scrypt$b01f2c2d52c5e38d336e714cbc3c09c9$707be883bc1962a4ba55686983f6108865bd7ca116c1cf3f738d29bb034c4ef6","NANTHAWAN","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:22"],
  ["Ums2hk2vohyu","NATTHANA","scrypt$f7802c37b0179351cacf30a75b5580bc$02cfae0d408aaa045e4670a3e1f821544a9dacdc3e57ca80b0af6cf5686cdb62","NATTHANA","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:25"],
  ["Ums2hn2a04qw6","BOONSONG","scrypt$519f1de04cb9c3f60658466ec632e4ea$fbd5e78fb53cf3904679dd5763a7f89be1b703518fd091307372bef50cbf9899","BOONSONG","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:27"],
  ["Ums2ht20t8vw3","PORNTHEP","scrypt$bf241f99509e83f82ee7878ff77fc732$f9baec610059d2fdf767b4579ce2081b9e81dd79f8a6d91bf6ffd336d8a4f5e5","PORNTHEP","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"transport\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"supervisor\":{\"view\":true},\"action\":{\"view\":true},\"management\":{\"view\":true},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:32"],
  ["Ums2hwjmb2ai0","CHUTIMA","scrypt$a178c9c1b27c5ad5ab917ccb20b34e11$1da3455e6e5b0f28887e35e70a36d9d158a92d7db4984d4dbefa2aa63325586b","CHUTIMA","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":false,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"supervisor\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:35"],
  ["Ums2i8mi2h7k1","SAWAROT","scrypt$3f7c49f77beab4dbf2edd9a7f5dc644b$cd31605f9486bdbf2b1e93efcd18da071bdc382988d52eb52ce5b01671102992","SAWAROT","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"accounting\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"supervisor\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:44"],
  ["Ums2if2711tl","MATAVEE","scrypt$cdea2ae34bb7ffc27d4530bb5db6d690$3a9dc5705af3d051840d50a409ad531b1891c7a9c7ae4cf66aca5d70c217ebe0","MATAVEE","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":true,\"end\":true},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"transport\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"warehouse\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"extra\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"accounting\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"supervisor\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":false},\"settings\":{\"view\":true}},\"lists\":true}","2026-07-27 00:49"],
  ["Ums2ihj2a3y3j","NIROOTTI","scrypt$895a889b6ebc7afe42eae2624aaa1647$f47d9ea0f66bc585c20bde268f90d98db1e9d8a1c9b076d9f42be13636ab7925","NIROOTTI","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"transport\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"accounting\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"supervisor\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":false}},\"lists\":false}","2026-07-27 00:51"],
  ["Ums2ik95bg73u","YO","scrypt$ece0d20f44abbd1335788f9be9512062$4bf5d6b21ff1826d0632f9354fa8b0a200591f1cbe652955b057f299cef294f1","YO","user","Yes","{\"tabs\":{\"dashboard\":{\"view\":true},\"cs-import\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"cs-export\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"shipping\":{\"view\":true,\"add\":true,\"edit\":true,\"del\":false,\"end\":true},\"transport\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"warehouse\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"extra\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"accounting\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"supervisor\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"action\":{\"view\":true},\"management\":{\"view\":false,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"sales\":{\"view\":true},\"ship-daily\":{\"view\":true},\"rates\":{\"view\":true,\"add\":false,\"edit\":false,\"del\":false,\"end\":false},\"settings\":{\"view\":false}},\"lists\":false}","2026-07-27 00:53"]
];

var PANEX_SETTINGS_SEED = {
  "collapse": {"cs-import":["im_ops_status","job_type","im_cs","eta_imp","imp_job_no","customer","vessel","freetime","trans_supp1_del_addr","delivery_date"],"cs-export":["ex_ops_status","job_type","ex_cs","etd_exp","customer","exp_job_no","si_cut_off","si_submit","vgm_cut_off","vgm_submit","closing_time","ex_doc_remark","delivery_date"],"shipping":["shipp_status","job_type","entry_pic","job_no","booking_mbl","customer","cs_note_ship","entry_status","clearance_date","eta_imp","etd_exp","clearance_status"],"transport":["trans_status","job_type","trans_pic","job_no","booking_mbl","customer","cs_note_trans","clearance_date","delivery_date","supp1_del_addr","supp1","supp2","supp3","trans_status_date"],"warehouse":["wha_status","job_type","wh_pic","job_no","booking_mbl","customer","cs_note_wh","delivery_date","wh_actual_rcv","actual_finished_date"],"extra":["extra_status","job_type","job_no","booking_mbl","customer","module","supplier","extra_req_type","cost_pic","root_cause","cost_total","margin_total","no_charge_remark"],"accounting":["acc_job_status","acc_pic","job_type","job_no","booking_mbl","customer","module","supplier","ap_extra_req_type","ap_status","ar_status"]},
  "carrierColors": {"Evergreen":"#50f262","YANGMING":"#3eeade","MSC":"#fbefa2","ZIM":"#fb8451","OOCL":"#e199f5","COSCO":"#f584d7","TSLINE":"#f49595","CMA/CNC":"#e30d0d","ONE":"#4068dd"}
};

function PANEX_INITIALIZE() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];

  // ----- 1) โมดูล + หัวตาราง -----
  Object.keys(PANEX_HEADERS).forEach(function (name) {
    report.push(writeHeader_(ss, name, PANEX_HEADERS[name]));
  });

  // ----- 2) _users : ชีทผู้ใช้ + สิทธิ์ (seed รายชื่อเฉพาะเมื่อยังไม่มีใคร) -----
  report.push(writeHeader_(ss, USERS_SHEET, PANEX_USER_HEADERS));
  report.push(seedUsers_(ss));

  // ----- 3) _settings : ค่าตั้งค่าส่วนกลาง (คอลัมน์ตอนย่อ A1 / สี Carrier A2) -----
  report.push(seedSettings_(ss));

  // ----- 4) _lists : seed เฉพาะเมื่อว่าง -----
  report.push(seedLists_(ss));

  var NL = String.fromCharCode(10);
  SpreadsheetApp.getUi().alert(
    "PANEX Initialize เสร็จ" + NL + NL + report.join(NL) + NL + NL +
    "ล็อกอินด้วยชื่อผู้ใช้เดิม (รหัสผ่านเดิม) ได้ทันที"
  );
}

// seed ผู้ใช้ + สิทธิ์ — ข้ามทันทีถ้ามีแถวผู้ใช้อยู่แล้ว (ไม่ทับของเดิมเด็ดขาด)
function seedUsers_(ss) {
  var sh = ss.getSheetByName(USERS_SHEET);
  if (!sh) return USERS_SHEET + " : ไม่พบชีท";
  if (!PANEX_USER_SEED.length) return USERS_SHEET + " : ไม่มีรายชื่อตั้งต้น";

  var lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    var vals = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    var hasAny = vals.some(function (row) { return String(row[0]).trim() !== ""; });
    if (hasAny) return USERS_SHEET + " : มีผู้ใช้อยู่แล้ว (ข้าม seed)";
  }

  var width = PANEX_USER_HEADERS.length;
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  sh.getRange(2, 1, PANEX_USER_SEED.length, width).setValues(PANEX_USER_SEED);
  return USERS_SHEET + " : seed ผู้ใช้ " + PANEX_USER_SEED.length + " คน (รหัสผ่านเดิม)";
}

// seed ค่าตั้งค่าส่วนกลาง — เขียนเฉพาะช่องที่ยังว่าง (A1 = คอลัมน์ตอนย่อ, A2 = สี Carrier)
function seedSettings_(ss) {
  var sh = ss.getSheetByName(SETTINGS_SHEET);
  var created = false;
  if (!sh) { sh = ss.insertSheet(SETTINGS_SHEET); created = true; }

  var done = [];
  if (String(sh.getRange("A1").getValue()).trim() === "") {
    sh.getRange("A1").setValue(JSON.stringify(PANEX_SETTINGS_SEED.collapse));
    done.push("คอลัมน์ตอนย่อ");
  }
  if (String(sh.getRange("A2").getValue()).trim() === "") {
    sh.getRange("A2").setValue(JSON.stringify(PANEX_SETTINGS_SEED.carrierColors));
    done.push("สี Carrier");
  }
  return SETTINGS_SHEET + " : " + (created ? "สร้างชีทแล้ว · " : "") +
    (done.length ? "seed " + done.join(" + ") : "มีค่าอยู่แล้ว (ข้าม seed)");
}

// เขียนหัวตารางของชีทหนึ่ง (สร้างชีทถ้ายังไม่มี) — ไม่แตะข้อมูลแถวอื่น
function writeHeader_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  var width = headers.length;
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());

  var cur = sh.getRange(1, 1, 1, width).getValues()[0];
  var msg;
  if (cur.join("|") !== headers.join("|")) {
    sh.getRange(1, 1, 1, width).setValues([headers]);
    msg = name + " : เขียนหัวตาราง (" + width + " คอลัมน์)";
  } else {
    msg = name + " : หัวตารางตรงอยู่แล้ว";
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, width).setFontWeight("bold");
  return msg;
}

function seedLists_(ss) {
  var sh = ss.getSheetByName(LIST_SHEET);
  if (!sh) sh = ss.insertSheet(LIST_SHEET);

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var hasAny = false;
  if (lastRow >= 2 && lastCol >= 1) {
    var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    hasAny = vals.some(function (row) {
      return row.some(function (c) { return String(c).trim() !== ""; });
    });
  }
  if (hasAny) return LIST_SHEET + " : มี dropdown อยู่แล้ว (ข้าม seed — เพิ่ม list ใหม่ที่หน้าตั้งค่าได้)";

  var keys = Object.keys(PANEX_LIST_SEED);
  var cols = [];
  keys.forEach(function (k, i) {
    cols.push([k].concat(PANEX_LIST_SEED[k] || []));
    if (i < keys.length - 1) cols.push([]);
  });
  var height = 1;
  cols.forEach(function (c) { if (c.length > height) height = c.length; });

  var matrix = [];
  for (var r = 0; r < height; r++) {
    var row = [];
    for (var c = 0; c < cols.length; c++) row.push(cols[c][r] != null ? cols[c][r] : "");
    matrix.push(row);
  }

  if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
  if (lastRow >= 1 && lastCol >= 1) sh.getRange(1, 1, lastRow, lastCol).clearContent();
  sh.getRange(1, 1, matrix.length, cols.length).setValues(matrix);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, cols.length).setFontWeight("bold");
  return LIST_SHEET + " : seed dropdown " + keys.length + " ชุด";
}
