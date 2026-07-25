import { Field } from "../fields";

// ===== 13_Cost_Rates — ฐานเรทต้นทุนค่าขนส่ง (PANEX COST CHECKER) =====
// ลำดับคอลัมน์ตามฟอร์มจริง · "Service Types" มาแทนช่อง Price Range เดิม แล้วต่อด้วย Remarks/Conditions
// Cost Checked by = ชื่อบัญชีที่ล็อกอิน (ระบบเติมให้ ห้ามแก้) · บันทึกแล้วแก้ไขได้เฉพาะ admin
export const COST_RATE_FIELDS: Field[] = [
  { key: "supplier", label: "Supplier", group: "Cost Rate", type: "dropdown", list: "supplier_transport", mandatory: true, sticky: true, width: 160 },
  { key: "customer", label: "Customer", group: "Cost Rate", type: "dropdown", list: "customer", width: 160 },
  { key: "job_type", label: "Job Type", group: "Cost Rate", type: "dropdown", list: "job_type", width: 130 },
  { key: "port_route", label: "PORT (POL/POD) / Route", group: "Cost Rate", type: "dropdown", list: "pol", width: 150 },
  { key: "cargo_type", label: "Cargo Type", group: "Cost Rate", type: "dropdown", list: "cargo_type", width: 130 },
  { key: "to_address", label: "To Address", group: "Cost Rate", type: "text", width: 140 },
  { key: "cost_rate", label: "Cost Rate/Trip", group: "Cost Rate", type: "number", mandatory: true, width: 120 },
  { key: "fuel_rate", label: "Fuel Rate", group: "Cost Rate", type: "text", width: 140 },
  { key: "service_type", label: "Service Types", group: "Cost Rate", type: "dropdown", list: "service_type", width: 140 },
  { key: "remarks_conditions", label: "Remarks / Conditions", group: "Cost Rate", type: "text", width: 200 },
  { key: "checked_by", label: "Cost Checked by", group: "Cost Rate", type: "auto", width: 140, help: "ระบบเติมชื่อผู้ที่ล็อกอินให้อัตโนมัติ" },
  { key: "updated_at", label: "Cost Updated Date", group: "Cost Rate", type: "auto", width: 150 },
];

// ===== 13_Sell_Rates — ฐานเรทราคาขาย (PANEX SELL CHECKER) =====
export const SELL_RATE_FIELDS: Field[] = [
  { key: "customer", label: "Customer", group: "Sell Rate", type: "dropdown", list: "customer", mandatory: true, sticky: true, width: 170 },
  { key: "job_type", label: "Job Type", group: "Sell Rate", type: "dropdown", list: "job_type", width: 130 },
  { key: "port_route", label: "PORT (POL/POD) / Route", group: "Sell Rate", type: "dropdown", list: "pol", width: 150 },
  { key: "cargo_type", label: "Cargo Type", group: "Sell Rate", type: "dropdown", list: "cargo_type", width: 130 },
  { key: "to_address", label: "To Address", group: "Sell Rate", type: "text", width: 140 },
  { key: "sell_rate", label: "SELL Rate/Trip", group: "Sell Rate", type: "number", mandatory: true, width: 120 },
  { key: "fuel_rate", label: "Fuel Rate", group: "Sell Rate", type: "text", width: 140 },
  { key: "service_type", label: "Service Types", group: "Sell Rate", type: "dropdown", list: "service_type", width: 140 },
  { key: "remarks_conditions", label: "Remarks / Conditions", group: "Sell Rate", type: "text", width: 200 },
  { key: "sell_confirmed", label: "Sell Confirmed", group: "Sell Rate", type: "dropdown", list: "sell_confirmed", width: 130 },
  { key: "quoted_by", label: "Sale / Quoted by", group: "Sell Rate", type: "auto", width: 140, help: "ระบบเติมชื่อผู้ที่ล็อกอินให้อัตโนมัติ" },
  { key: "updated_at", label: "SELL Updated Date", group: "Sell Rate", type: "auto", width: 150 },
];

// ช่องที่ระบบเติมชื่อผู้ล็อกอินให้ (ห้ามกรอกเอง) — ต่อโมดูล
export const RATE_SIGNER_KEY: Record<string, string> = {
  "cost-rates": "checked_by",
  "sell-rates": "quoted_by",
};

// ช่องที่ให้กรองในกล่อง Search By Filter
export const RATE_FILTER_KEYS = [
  "supplier",
  "customer",
  "service_type",
  "cargo_type",
  "port_route",
  "job_type",
  "to_address",
];
