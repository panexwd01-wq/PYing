// ===== ชุดสีกลาง + ตั้งค่าคอลัมน์ต่อบัญชี =====
// เก็บใน _settings (A3 = ชุดสี, A5 = ตั้งค่าคอลัมน์ต่อบัญชี) — ดู SETTINGS_CELL ใน db.ts
import { Field } from "./fields";

// ----- ชุดสีกลาง: สี + ความหมาย (แก้ได้ที่หน้าตั้งค่า) -----
export interface ColorTag {
  color: string; // hex
  label: string; // ความหมายของสีนี้
}

// ค่าตั้งต้นตามที่ใช้งานจริงอยู่ (ชมพู/เหลืองมาจากปุ่มสี MBL เดิม — เขียว "รอเงินมัดจำ" เปลี่ยนเป็นเหลืองตามที่ขอ)
export const PALETTE_SEED: ColorTag[] = [
  { color: "#f7c6d0", label: "รอลูกค้าจ่ายภาษี" },
  { color: "#ffe08a", label: "รอเงินมัดจำ" },
  { color: "#ffb3b3", label: "งานจ่ายเงินสด" },
  { color: "#bcdcff", label: "อัปเดตค่าขนส่งใหม่กับลูกค้าแล้ว" },
];

export function parseColorTags(raw: string): ColorTag[] {
  if (!raw) return [...PALETTE_SEED];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [...PALETTE_SEED];
    return v
      .filter((x) => x && typeof x.color === "string" && /^#[0-9a-f]{3,8}$/i.test(x.color))
      .map((x) => ({ color: x.color, label: String(x.label ?? "") }));
  } catch {
    return [...PALETTE_SEED];
  }
}

// ความหมายของสี (ใช้เป็น tooltip ของช่องที่ถูกระบาย)
export function colorLabel(palette: ColorTag[] | undefined, color: string): string {
  const hit = (palette || []).find((t) => t.color.toLowerCase() === (color || "").toLowerCase());
  return hit?.label || "";
}

// ----- ตั้งค่าคอลัมน์ต่อบัญชี -----
export interface ModulePrefs {
  order?: string[]; // ลำดับคอลัมน์ (field key) — key ที่ไม่อยู่ในนี้ต่อท้ายตามลำดับ schema
  widths?: Record<string, number>; // ความกว้างที่ผู้ใช้ลากไว้ (px)
  collapse?: string[]; // คอลัมน์ที่โชว์ตอนย่อของบัญชีนี้ (ว่าง = ใช้ค่าส่วนกลาง)
}
export type UserPrefs = Record<string, ModulePrefs>; // moduleKey → ค่าตั้งค่า
export type AllUserPrefs = Record<string, UserPrefs>; // userId → ค่าตั้งค่าของคนนั้น

export const emptyModulePrefs = (): ModulePrefs => ({ order: [], widths: {}, collapse: [] });

// เรียงคอลัมน์ตามที่ผู้ใช้จัดไว้ + ใส่ความกว้างที่ลากไว้
// key ที่ผู้ใช้ไม่ได้จัด (เช่นคอลัมน์ที่เพิ่มมาใหม่หลังเขาตั้งค่า) ต่อท้ายตามลำดับ schema เสมอ
export function applyColumnPrefs(fields: Field[], prefs?: ModulePrefs): Field[] {
  if (!prefs) return fields;
  const widths = prefs.widths || {};
  let out = fields;
  const order = prefs.order || [];
  if (order.length) {
    const rank = new Map(order.map((k, i) => [k, i]));
    const big = order.length;
    out = fields
      .map((f, i) => ({ f, i }))
      .sort((a, b) => {
        const ra = rank.get(a.f.key) ?? big + a.i;
        const rb = rank.get(b.f.key) ?? big + b.i;
        return ra - rb;
      })
      .map((x) => x.f);
  }
  const hasWidth = Object.keys(widths).length > 0;
  return hasWidth ? out.map((f) => (widths[f.key] ? { ...f, width: widths[f.key] } : f)) : out;
}
