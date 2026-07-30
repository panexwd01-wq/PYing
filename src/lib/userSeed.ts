// ===== ผู้ใช้ตั้งต้น (seed ตอนชีท _users ยังว่าง) =====
// คัดลอกจาก _users ที่ใช้งานจริง (2026-07-30) — รหัสผ่านเป็น scrypt hash เดิม ใช้รหัสเดิมได้ทันที
// แถวเรียงตาม USER_HEADERS: __id, username, password, display_name, role, active, perms, created_at
// หมายเหตุ: built-in admin (james) ไม่ได้อยู่ในนี้ — hardcode ใน users.ts เข้าได้เสมอโดยไม่ต้องมีแถว
const P = (tabs: Record<string, Record<string, boolean>>, lists: boolean) => JSON.stringify({ tabs, lists });

// สิทธิ์ที่ใช้ซ้ำหลายคน (ชุดฐาน: เห็นทุก tab, จัดการงานฝั่ง Ops ได้, ไม่เห็น Mgmt)
const VIEW = { view: true };
const NONE = { view: true, add: false, edit: false, del: false, end: false };
const FULL = { view: true, add: true, edit: true, del: true, end: true };
const EDIT = { view: true, add: true, edit: true, del: false, end: false };
const EDIT_END = { view: true, add: true, edit: true, del: false, end: true };
const HIDDEN = { view: false, add: false, edit: false, del: false, end: false };

// CS (Import เจ้าของงาน) — POONYISA / SUPAPORN
const CS_IMPORT_PERMS = P(
  {
    dashboard: VIEW,
    "cs-import": FULL,
    "cs-export": NONE,
    shipping: EDIT,
    transport: EDIT_END,
    warehouse: EDIT_END,
    extra: EDIT_END,
    accounting: EDIT,
    supervisor: NONE,
    action: VIEW,
    management: HIDDEN,
    sales: VIEW,
    "ship-daily": VIEW,
    rates: EDIT,
    settings: VIEW,
  },
  true
);

// CS (Export เจ้าของงาน) — NATTHAYA / NANTHAWAN / NATTHANA
const CS_EXPORT_PERMS = P(
  {
    dashboard: VIEW,
    "cs-import": NONE,
    "cs-export": FULL,
    shipping: EDIT,
    transport: EDIT_END,
    warehouse: EDIT_END,
    extra: EDIT_END,
    accounting: EDIT,
    supervisor: VIEW,
    action: VIEW,
    management: HIDDEN,
    sales: VIEW,
    "ship-daily": VIEW,
    rates: EDIT,
    settings: VIEW,
  },
  true
);

// Shipping / Entry — เข้าได้เฉพาะสายชิปปิ้ง
const SHIP_PERMS = P(
  {
    dashboard: VIEW,
    "cs-import": NONE,
    "cs-export": NONE,
    shipping: EDIT_END,
    transport: NONE,
    warehouse: NONE,
    extra: NONE,
    accounting: NONE,
    supervisor: HIDDEN,
    action: VIEW,
    management: HIDDEN,
    sales: VIEW,
    "ship-daily": VIEW,
    rates: NONE,
    settings: { view: false },
  },
  false
);

export const USER_SEED: string[][] = [
  [
    "Ums0d8tf86aic",
    "admin",
    "scrypt$247632e4708b0bcbdff81315fe38b232$114abb61e0b4c0ac8e2e6f54f6ee62a89b2f50dfed7fbce048a0589ddbdcf7ff",
    "Administrator",
    "admin",
    "Yes",
    P({}, true),
    "2026-07-25 12:49",
  ],
  [
    "Ums2gyur7hyew",
    "POONYISA",
    "scrypt$777e0a6bedc0bb06a4170dc374c56664$68081536660768b3c4f14d539f46a562bd698c9dca28996bfa64d92c721cc5c1",
    "POONYISA",
    "user",
    "Yes",
    CS_IMPORT_PERMS,
    "2026-07-27 00:09",
  ],
  [
    "Ums2h1f761dod",
    "SUPAPORN",
    "scrypt$2658f283c153727f955b06793e50edc5$9114b9697f1be835e9ac7a3a5c398fcf3bf1c773266409e37636d1a88709ea71",
    "SUPAPORN",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": FULL,
        "cs-export": NONE,
        shipping: EDIT,
        transport: EDIT_END,
        warehouse: EDIT_END,
        extra: EDIT_END,
        accounting: EDIT,
        supervisor: VIEW,
        action: VIEW,
        management: HIDDEN,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: EDIT,
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:11",
  ],
  [
    "Ums2h7jb2ja8f",
    "NATTHAYA",
    "scrypt$41acc3142108ba63197826b5b14eeded$fc83278dbaea016df17a0696f19c28d105ed8fb7c47ec7514e72d15f3f6631dc",
    "NATTHAYA",
    "user",
    "Yes",
    CS_EXPORT_PERMS,
    "2026-07-27 00:15",
  ],
  [
    "Ums2hg5ohilhc",
    "NANTHAWAN",
    "scrypt$b01f2c2d52c5e38d336e714cbc3c09c9$707be883bc1962a4ba55686983f6108865bd7ca116c1cf3f738d29bb034c4ef6",
    "NANTHAWAN",
    "user",
    "Yes",
    CS_EXPORT_PERMS,
    "2026-07-27 00:22",
  ],
  [
    "Ums2hk2vohyu",
    "NATTHANA",
    "scrypt$f7802c37b0179351cacf30a75b5580bc$02cfae0d408aaa045e4670a3e1f821544a9dacdc3e57ca80b0af6cf5686cdb62",
    "NATTHANA",
    "user",
    "Yes",
    CS_EXPORT_PERMS,
    "2026-07-27 00:25",
  ],
  [
    "Ums2hn2a04qw6",
    "BOONSONG",
    "scrypt$519f1de04cb9c3f60658466ec632e4ea$fbd5e78fb53cf3904679dd5763a7f89be1b703518fd091307372bef50cbf9899",
    "BOONSONG",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": NONE,
        "cs-export": NONE,
        shipping: EDIT_END,
        transport: EDIT,
        warehouse: NONE,
        extra: EDIT_END,
        accounting: NONE,
        supervisor: VIEW,
        action: VIEW,
        management: HIDDEN,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: NONE,
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:27",
  ],
  [
    "Ums2ht20t8vw3",
    "PORNTHEP",
    "scrypt$bf241f99509e83f82ee7878ff77fc732$f9baec610059d2fdf767b4579ce2081b9e81dd79f8a6d91bf6ffd336d8a4f5e5",
    "PORNTHEP",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": NONE,
        "cs-export": NONE,
        shipping: FULL,
        transport: NONE,
        warehouse: NONE,
        extra: EDIT_END,
        accounting: NONE,
        supervisor: VIEW,
        action: VIEW,
        management: VIEW,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: { view: true, add: true, edit: false, del: false, end: false },
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:32",
  ],
  [
    "Ums2hwjmb2ai0",
    "CHUTIMA",
    "scrypt$a178c9c1b27c5ad5ab917ccb20b34e11$1da3455e6e5b0f28887e35e70a36d9d158a92d7db4984d4dbefa2aa63325586b",
    "CHUTIMA",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": NONE,
        "cs-export": NONE,
        shipping: NONE,
        transport: NONE,
        warehouse: NONE,
        extra: { view: true, add: false, edit: true, del: false, end: true },
        accounting: EDIT_END,
        supervisor: HIDDEN,
        action: VIEW,
        management: HIDDEN,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: NONE,
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:35",
  ],
  [
    "Ums2i8mi2h7k1",
    "SAWAROT",
    "scrypt$3f7c49f77beab4dbf2edd9a7f5dc644b$cd31605f9486bdbf2b1e93efcd18da071bdc382988d52eb52ce5b01671102992",
    "SAWAROT",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": NONE,
        "cs-export": NONE,
        shipping: NONE,
        transport: NONE,
        warehouse: NONE,
        extra: EDIT,
        accounting: FULL,
        supervisor: HIDDEN,
        action: VIEW,
        management: HIDDEN,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: NONE,
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:44",
  ],
  [
    "Ums2if2711tl",
    "MATAVEE",
    "scrypt$cdea2ae34bb7ffc27d4530bb5db6d690$3a9dc5705af3d051840d50a409ad531b1891c7a9c7ae4cf66aca5d70c217ebe0",
    "MATAVEE",
    "user",
    "Yes",
    P(
      {
        dashboard: VIEW,
        "cs-import": FULL,
        "cs-export": NONE,
        shipping: NONE,
        transport: EDIT_END,
        warehouse: EDIT_END,
        extra: EDIT_END,
        accounting: NONE,
        supervisor: HIDDEN,
        action: VIEW,
        management: HIDDEN,
        sales: VIEW,
        "ship-daily": VIEW,
        rates: EDIT,
        settings: VIEW,
      },
      true
    ),
    "2026-07-27 00:49",
  ],
  [
    "Ums2ihj2a3y3j",
    "NIROOTTI",
    "scrypt$895a889b6ebc7afe42eae2624aaa1647$f47d9ea0f66bc585c20bde268f90d98db1e9d8a1c9b076d9f42be13636ab7925",
    "NIROOTTI",
    "user",
    "Yes",
    SHIP_PERMS,
    "2026-07-27 00:51",
  ],
  [
    "Ums2ik95bg73u",
    "YO",
    "scrypt$ece0d20f44abbd1335788f9be9512062$4bf5d6b21ff1826d0632f9354fa8b0a200591f1cbe652955b057f299cef294f1",
    "YO",
    "user",
    "Yes",
    SHIP_PERMS,
    "2026-07-27 00:53",
  ],
];
