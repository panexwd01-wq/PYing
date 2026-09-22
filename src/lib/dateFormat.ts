// รูปแบบวันที่ที่ใช้แสดงผลทั้งระบบ — DD/MM/YYYY (ค.ศ.)
// ค่าที่เก็บในชีทยังเป็น "YYYY-MM-DD" หรือ "YYYY-MM-DD HH:mm" เหมือนเดิม (เรียงลำดับได้ตรง ๆ)

const p2 = (n: number) => String(n).padStart(2, "0");

export const RANGE_SEP = " ~ ";

// "YYYY-MM-DD[ HH:mm]" -> "DD/MM/YYYY[ HH:mm]" · ไม่ตรงรูปแบบ = คืนค่าเดิม
function formatOne(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v.trim());
  if (!m) return v;
  const d = `${m[3]}/${m[2]}/${m[1]}`;
  return m[4] ? `${d} ${m[4]}:${m[5]}` : d;
}

// ใช้กับค่าที่เก็บในระเบียน — รองรับช่วงวันที่ ("a ~ b") ด้วย
export function formatStored(v: string): string {
  if (!v) return "";
  if (v.includes(RANGE_SEP)) return v.split(RANGE_SEP).map(formatOne).join(RANGE_SEP);
  return formatOne(v);
}

// ใช้ใน flatpickr (ได้ Date มา ไม่ใช่ข้อความ)
export function formatDate(d: Date, withTime: boolean): string {
  const base = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${base} ${p2(d.getHours())}:${p2(d.getMinutes())}` : base;
}

// ช่อง auto ในโมดูลปลายทางเก็บข้อความดิบมาจาก CS — เดาว่าเป็นวันที่ไหมก่อนจัดรูปแบบ
const LOOKS_LIKE_DATE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2})?( ~ \d{4}-\d{2}-\d{2})?$/;

export function formatIfDate(v: string, dateOnly = false): string {
  const t = (v || "").trim();
  if (!LOOKS_LIKE_DATE.test(t)) return v;
  // ช่องที่ตั้งเป็น "วันที่อย่างเดียว" — ค่าเก่าที่ยังติดเวลามาด้วยให้ตัดเวลาทิ้งตอนแสดงผล
  return formatStored(dateOnly ? t.replace(/[ T]\d{2}:\d{2}.*$/, "") : t);
}
