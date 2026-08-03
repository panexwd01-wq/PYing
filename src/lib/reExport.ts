// ===== กติกา Re-Export (ใช้ร่วมทั้ง client และ server) =====
// Re-Export? ที่ CS Import ต้องคู่กับ Job Type = Re-Export/FCL หรือ Re-Export/LCL เท่านั้น (บังคับ 2 ทาง)
import { JobRecord } from "./types";

export const RE_EXPORT_JOB_TYPES = ["Re-Export/FCL", "Re-Export/LCL"];

export function isReExportType(v?: string): boolean {
  return RE_EXPORT_JOB_TYPES.includes((v || "").trim());
}

// ตรวจความสอดคล้อง Re-Export? ↔ Job Type — คืนข้อความเตือน (null = ผ่าน)
// ใช้กับ CS Import เท่านั้น (Export ได้ค่ามาจาก Import อยู่แล้ว)
export function checkReExport(rec: Partial<JobRecord>): string | null {
  const flag = (rec.re_export || "").trim() === "Yes";
  const type = (rec.job_type || "").trim();
  if (flag && !isReExportType(type))
    return `Re-Export? = Yes ต้องเลือก Job Type เป็น ${RE_EXPORT_JOB_TYPES.join(" หรือ ")} เท่านั้น${
      type ? ` (ตอนนี้เป็น "${type}")` : " (ยังไม่ได้เลือก Job Type)"
    }`;
  if (!flag && isReExportType(type))
    return `Job Type = ${type} ต้องติ๊ก Re-Export? = Yes`;
  return null;
}
