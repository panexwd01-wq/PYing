import { Field } from "../fields";

// ===== 13_Cost_Rates — ฐานเรทต้นทุนค่าขนส่ง (PANEX Cost Checker) =====
export const COST_RATE_FIELDS: Field[] = [
  { key: "supplier", label: "Supplier", group: "Cost Rate", type: "dropdown", list: "supplier_transport", mandatory: true, sticky: true, width: 160 },
  { key: "service_type", label: "Service Type", group: "Cost Rate", type: "dropdown", list: "service_type", width: 130 },
  { key: "job_type", label: "Job Type", group: "Cost Rate", type: "dropdown", list: "job_type", width: 130 },
  { key: "port_route", label: "Port / Route", group: "Cost Rate", type: "dropdown", list: "pol", width: 130 },
  { key: "cargo_type", label: "Cargo Type", group: "Cost Rate", type: "dropdown", list: "cargo_type", width: 130 },
  { key: "customer", label: "Customer", group: "Cost Rate", type: "dropdown", list: "customer", width: 160 },
  { key: "to_address", label: "To Address", group: "Cost Rate", type: "text", width: 140 },
  { key: "cost_rate", label: "Cost Rate/Trip", group: "Cost Rate", type: "number", mandatory: true, width: 120 },
  { key: "fuel_rate", label: "Fuel Rate", group: "Cost Rate", type: "text", width: 140 },
  { key: "price_range", label: "Price Range", group: "Cost Rate", type: "text", width: 130 },
  { key: "checked_by", label: "Cost Checked by", group: "Cost Rate", type: "dropdown", list: "cost_pic", width: 130 },
  { key: "updated_at", label: "Cost Updated Date", group: "Cost Rate", type: "auto", width: 150 },
];

// ===== 13_Sell_Rates — ฐานเรทราคาขาย (PANEX Sell Checker) =====
export const SELL_RATE_FIELDS: Field[] = [
  { key: "customer", label: "Customer", group: "Sell Rate", type: "dropdown", list: "customer", mandatory: true, sticky: true, width: 170 },
  { key: "service_type", label: "Service Type", group: "Sell Rate", type: "dropdown", list: "service_type", width: 130 },
  { key: "job_type", label: "Job Type", group: "Sell Rate", type: "dropdown", list: "job_type", width: 130 },
  { key: "port_route", label: "Port / Route", group: "Sell Rate", type: "dropdown", list: "pol", width: 130 },
  { key: "cargo_type", label: "Cargo Type", group: "Sell Rate", type: "dropdown", list: "cargo_type", width: 130 },
  { key: "to_address", label: "To Address", group: "Sell Rate", type: "text", width: 140 },
  { key: "sell_rate", label: "Sell Rate/Trip", group: "Sell Rate", type: "number", mandatory: true, width: 120 },
  { key: "fuel_rate", label: "Fuel Rate", group: "Sell Rate", type: "text", width: 140 },
  { key: "remarks", label: "Remarks", group: "Sell Rate", type: "text", width: 160 },
  { key: "quoted_by", label: "Sale / Quoted by", group: "Sell Rate", type: "dropdown", list: "sell_pic", width: 130 },
  { key: "sell_confirmed", label: "Sell Confirmed", group: "Sell Rate", type: "dropdown", list: "sell_confirmed", width: 130 },
  { key: "updated_at", label: "Sell Updated Date", group: "Sell Rate", type: "auto", width: 150 },
];
