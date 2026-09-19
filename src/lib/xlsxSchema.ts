// ===== รูปแบบไฟล์ .xlsx สำหรับ Export / Import (ใช้ร่วม client + server) =====
// รูปแบบเดียวกันทั้งขาออกและขาเข้า: แถวที่ 1 = ชื่อคอลัมน์ (label ตามที่เห็นบนหน้าจอ), แถวถัดไป = ข้อมูล
// ไฟล์ที่ export ออกมา แก้ใน Excel แล้วโยนกลับเข้าไปได้เลย
import { ModuleDef } from "./schema";
import { Field } from "./fields";

// คอลัมน์ที่เขียนลงไฟล์ = ทุกช่องของโมดูล รวมช่อง auto (ไว้อ่านประกอบ) และช่อง hidden
// (ช่อง hidden = ตาราง Sell/Job Cost ของ 09 ซึ่งเป็นตัวเงินจริง ต้องมีในไฟล์)
// ยกเว้นรหัสเชื่อม (internal) — ของระบบล้วน ไม่ออกไฟล์
export function exportFields(m: ModuleDef): Field[] {
  return m.fields.filter((f) => !f.internal);
}

// ชื่อหัวคอลัมน์ในไฟล์ — ต้องไม่ซ้ำกัน ไม่งั้นตอน import จะจับคู่ผิดช่อง
// label ที่ซ้ำ (เช่น "Qty." มีทั้งฝั่ง Sell และ Cost) ต่อท้ายด้วยคีย์ภายในให้แยกออก
export function headerLabels(m: ModuleDef): string[] {
  const count = new Map<string, number>();
  for (const f of exportFields(m)) count.set(f.label, (count.get(f.label) || 0) + 1);
  return exportFields(m).map((f) => ((count.get(f.label) || 0) > 1 ? `${f.label} (${f.key})` : f.label));
}

// หัวคอลัมน์ → คีย์ field (รับได้ทั้งหัวที่ระบบเขียนเอง, label เปล่า ๆ ถ้าไม่ซ้ำ, และคีย์ภายใน)
export function headerToKey(m: ModuleDef): Map<string, string> {
  const fields = exportFields(m);
  const heads = headerLabels(m);
  const map = new Map<string, string>();
  const put = (k: string, v: string) => {
    const kk = k.trim().toLowerCase();
    if (kk && !map.has(kk)) map.set(kk, v);
  };
  fields.forEach((f, i) => put(heads[i], f.key)); // หัวเต็มมาก่อนเสมอ
  fields.forEach((f) => put(f.key, f.key));
  const dup = new Set<string>();
  const seen = new Set<string>();
  for (const f of fields) (seen.has(f.label) ? dup : seen).add(f.label);
  for (const f of fields) if (!dup.has(f.label)) put(f.label, f.key);
  return map;
}

// คอลัมน์ที่ "รับค่ากลับ" ตอน import = เฉพาะช่องที่คนกรอกเอง
// ช่อง auto (เทา) ข้ามเสมอ — ระบบดึง/คำนวณให้เองหลังบันทึก
export function importFields(m: ModuleDef): Field[] {
  return exportFields(m).filter((f) => f.type !== "auto");
}

// คีย์ที่ใช้จับคู่แถวในไฟล์กับงานที่มีอยู่แล้ว (ตรงครบทุกคีย์ = แถวเดียวกัน → อัปเดต)
// 09/10 มีหลายแถวต่อ 1 Job No. จึงต้องใช้ Module + Req Type ประกอบ
export const IDENTITY_KEYS: Record<string, string[]> = {
  "04_CS_Import": ["imp_job_no"],
  "05_CS_Export": ["exp_job_no"],
  "06_Shipping": ["job_no"],
  "07_Transportation": ["job_no"],
  "08_Warehouse": ["job_no"],
  "09_Extra_Service": ["job_no", "module", "extra_req_type"],
  "10_Accounting": ["job_no", "module", "ap_extra_req_type"],
  // ตารางเรท: 1 แถว = 1 ชุด (ผู้ขาย/ลูกค้า/เส้นทาง/ประเภทตู้/บริการ) ตรงครบ = เรทเดิม → อัปเดตราคา
  "13_Cost_Rates": ["supplier", "customer", "job_type", "port_route", "cargo_type", "to_address", "service_type"],
  "13_Sell_Rates": ["customer", "job_type", "port_route", "cargo_type", "to_address", "service_type"],
};

export function identityKeys(m: ModuleDef): string[] {
  return IDENTITY_KEYS[m.id] || [m.jobNoKey];
}

// ค่าที่ใช้เทียบ (ตัดช่องว่าง + ไม่สนตัวพิมพ์เล็ก/ใหญ่) — ว่าง = จับคู่ไม่ได้ ถือเป็นแถวใหม่
export function identityOf(m: ModuleDef, rec: Record<string, string>): string {
  const parts = identityKeys(m).map((k) => (rec[k] || "").trim().toUpperCase());
  return parts[0] ? parts.join(" || ") : "";
}

export function identityLabel(m: ModuleDef, rec: Record<string, string>): string {
  const v = identityKeys(m)
    .map((k) => (rec[k] || "").trim())
    .filter(Boolean)
    .join(" / ");
  return v || "(ไม่มี Job No.)";
}

// โมดูลที่แถวถูกสร้างอัตโนมัติจาก CS → import สร้างแถวใหม่ไม่ได้ (อัปเดตของเดิมได้อย่างเดียว)
export const CS_DRIVEN_KEYS = ["shipping", "transport", "warehouse", "extra"];
export const canCreateOnImport = (m: ModuleDef) => !CS_DRIVEN_KEYS.includes(m.key);

// ชื่อชีทใน .xlsx (Excel ห้าม : \ / ? * [ ] และยาวไม่เกิน 31 ตัว)
export function sheetName(m: ModuleDef): string {
  return (m.label || m.key).replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

export function fileName(m: ModuleDef, stamp: string): string {
  return `${(m.label || m.key).replace(/[^\w฀-๿.-]+/g, "_")}_${stamp}.xlsx`;
}

// ===== วางแผนการนำเข้า (pure — แยกออกมาให้เทสได้ ไม่ยุ่งกับ Google Sheets) =====
export interface PlanRow {
  row: number;
  ident: Record<string, string>;
  values: Record<string, string>;
}
export interface ImportPlan<T> {
  updates: { rec: Record<string, string>; src: PlanRow }[];
  creates: { rec: Record<string, string>; src: PlanRow }[];
  skipped: ImportSkip[];
  matched: T[]; // แถวเดิมที่ถูกจับคู่ (ไว้ใช้ต่อฝั่ง server)
}

export function planImport<T extends Record<string, string>>(
  m: ModuleDef,
  rows: PlanRow[],
  existing: T[],
  opts: { mayCreate: boolean; noCreateReason: string }
): ImportPlan<T> {
  const byIdent = new Map<string, T>();
  for (const r of existing) {
    const k = identityOf(m, r);
    if (k && !byIdent.has(k)) byIdent.set(k, r);
  }
  const plan: ImportPlan<T> = { updates: [], creates: [], skipped: [], matched: [] };
  const seen = new Set<string>();

  for (const p of rows) {
    const key = identityOf(m, p.ident);
    const label = identityLabel(m, p.ident);
    if (key && seen.has(key)) {
      plan.skipped.push({ row: p.row, ident: label, reason: "ซ้ำกับแถวก่อนหน้าในไฟล์เดียวกัน" });
      continue;
    }
    if (key) seen.add(key);

    const found = key ? byIdent.get(key) : undefined;
    if (found) {
      plan.matched.push(found);
      plan.updates.push({ rec: { ...p.values, __id: found.__id || "" }, src: p });
      continue;
    }
    if (!opts.mayCreate) {
      plan.skipped.push({ row: p.row, ident: label, reason: opts.noCreateReason });
      continue;
    }
    // แถวใหม่: เขียนคอลัมน์ที่ใช้จับคู่ลงไปด้วย (บางโมดูลคีย์เป็นช่อง auto แต่ต้องมีไว้เชื่อมงาน)
    const rec: Record<string, string> = { ...p.values };
    for (const k of identityKeys(m)) if (p.ident[k]) rec[k] = p.ident[k];
    plan.creates.push({ rec, src: p });
  }
  return plan;
}

// ผลลัพธ์ตอน import (ใช้แสดงสรุปบนหน้าจอ)
export interface ImportSkip {
  row: number; // เลขแถวในไฟล์ Excel
  ident: string;
  reason: string;
}
export interface ImportResult {
  created: number;
  updated: number;
  skipped: ImportSkip[];
  unknownColumns: string[]; // คอลัมน์ในไฟล์ที่ระบบไม่รู้จัก (ข้ามไป)
  ignoredAuto: number; // จำนวนคอลัมน์ auto ที่อ่านข้าม
}
