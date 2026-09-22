// ===== จำนวนตู้/รถ แบบ "จำนวน + หน่วย" (ขาเข้า ข้อ 7) =====
// เดิมเป็นคอลัมน์ตายตัว 4W/6W/10W/20GP/40HQ — เปลี่ยนเป็น 2 คู่ที่เลือกหน่วยเองได้
// ทุกที่ที่ต้องนับตู้ให้เรียกผ่านไฟล์นี้ จะได้ไม่ต้องไล่แก้สูตรหลายที่ถ้าเพิ่มคู่ที่ 3

export const CONT_PAIRS = [1, 2] as const;

export const contQtyKey = (n: number) => `cnt${n}_qty`;
export const contUnitKey = (n: number) => `cnt${n}_unit`;

export interface ContPair {
  qty: number;
  unit: string;
}

const num = (v: string | undefined) => {
  const n = parseFloat((v || "").toString().replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function contPairs(r: Record<string, string>): ContPair[] {
  const out: ContPair[] = [];
  for (const n of CONT_PAIRS) {
    const qty = num(r[contQtyKey(n)]);
    const unit = (r[contUnitKey(n)] || "").trim().toUpperCase();
    if (qty || unit) out.push({ qty, unit });
  }
  return out;
}

// จำนวนรวมทุกหน่วย (ตู้ + รถ) — ใช้แทน contQty เดิมที่บวก 5 คอลัมน์
export function contTotal(r: Record<string, string>): number {
  return contPairs(r).reduce((a, p) => a + p.qty, 0);
}

// หน่วยที่เป็น "ตู้" = ขึ้นต้นด้วยขนาดฟุต (20xx / 40xx / 45xx) · ที่เหลือ (4W/6W/10W) คือรถบรรทุก
const FT = /^(\d{2})/;
export function contFeet(unit: string): number {
  const m = FT.exec((unit || "").trim());
  const ft = m ? Number(m[1]) : 0;
  return ft === 20 || ft === 40 || ft === 45 ? ft : 0;
}

// แยกจำนวนตู้ 20 ฟุต / 40 ฟุต (ใช้ในสถิติยอดขายและหน้า Ship Daily)
export function contBySize(r: Record<string, string>): { c20: number; c40: number } {
  let c20 = 0;
  let c40 = 0;
  for (const p of contPairs(r)) {
    const ft = contFeet(p.unit);
    if (ft === 20) c20 += p.qty;
    else if (ft === 40 || ft === 45) c40 += p.qty;
  }
  return { c20, c40 };
}

// TEU — 20 ฟุต = 1, 40/45 ฟุต = 2, รถบรรทุกไม่นับ
export function contTeu(r: Record<string, string>): number {
  const { c20, c40 } = contBySize(r);
  return c20 + c40 * 2;
}

// ข้อความสรุป เช่น "20GP 2 / 40HQ 1" (ใช้ในช่อง Data from Import และไฟล์ Excel)
export function contLabel(r: Record<string, string>): string {
  return contPairs(r)
    .filter((p) => p.unit || p.qty)
    .map((p) => `${p.unit || "?"} ${p.qty || ""}`.trim())
    .join(" / ");
}
