import { JobRecord } from "./types";

// ===== กฎสีพื้น/ล็อกของ cell ตามค่าในระเบียน (Phase B) =====
// คืน { bg?, locked? } ต่อ 1 ช่อง — JobGrid เอาไปใช้ระบายสี + ล็อก

// จานสี (พื้นอ่อนพออ่านตัวหนังสือได้)
const C = {
  pink: "#f7c6d0",
  green: "#bfe9c8",
  orange: "#ffd9a8",
  gray: "#d9d9d9",
  red: "#ffb3b3",
  yellow: "#fff3b0",
  purple: "#e2c6f0",
  blue: "#bcdcff",
};

// Form E → สีตามค่า
const FORM_E_COLORS: Record<string, string> = {
  CFM: C.yellow,
  "RECEIVED ORI": C.purple,
  CHECKING: C.blue,
  "NEED REVISE": C.red,
  "CFM-PRINT": C.pink,
  "CFM-SCAN FE": C.green,
  "Customer Confirm": C.red,
};

// PV Status → สีตามค่า
const PV_COLORS: Record<string, string> = {
  รอจ่าย: C.orange,
  จ่ายแล้ว: C.green,
  จบแล้ว: C.gray,
};

// สีตามวัน (getDay: 0=อาทิตย์ .. 6=เสาร์)
const WEEKDAY_COLORS = [C.red, C.yellow, C.pink, C.green, C.orange, C.blue, C.purple];
// เฉพาะ Export: ช่องวันที่ที่ระบายสีตามวัน
const WEEKDAY_FIELDS = new Set(["etd_exp", "si_cut_off", "vgm_cut_off"]);

function weekdayColor(v: string): string | undefined {
  const mm = /(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
  if (!mm) return undefined;
  const d = new Date(Number(mm[1]), Number(mm[2]) - 1, Number(mm[3]));
  return WEEKDAY_COLORS[d.getDay()];
}

export interface CellCue {
  bg?: string;
  locked?: boolean;
}

export function cellCue(moduleId: string, fieldKey: string, rec: JobRecord): CellCue {
  // ----- Export: กฎล็อก (มาก่อนกฎสีอื่น) -----
  if (moduleId === "05_CS_Export") {
    // EX/OPS Status = Cancel → ล็อกทั้งแถวเป็นเทา (แก้ได้แค่ Status)
    if ((rec.ex_ops_status || "") === "Cancel" && fieldKey !== "ex_ops_status")
      return { bg: C.gray, locked: true };
    // SI Submit = Done → ล็อก SI Cut Off / SI Submit
    if ((rec.si_submit || "") === "Done" && (fieldKey === "si_cut_off" || fieldKey === "si_submit"))
      return { bg: C.gray, locked: true };
    // VGM Submit = Done → ล็อก VGM Cut Off / VGM Submit
    if ((rec.vgm_submit || "") === "Done" && (fieldKey === "vgm_cut_off" || fieldKey === "vgm_submit"))
      return { bg: C.gray, locked: true };
    // สีตามวัน (ETD / SI Cut Off / VGM Cut Off)
    if (WEEKDAY_FIELDS.has(fieldKey)) {
      const bg = weekdayColor(rec[fieldKey] || "");
      if (bg) return { bg };
    }
  }

  // ----- Entry Status (Import/Export) = Done → แดง -----
  if (fieldKey === "entry_status" && (rec.entry_status || "") === "Done") return { bg: C.red };

  // ----- Form E → สีตามค่า -----
  if (fieldKey === "form_e") {
    const bg = FORM_E_COLORS[(rec.form_e || "").trim()];
    if (bg) return { bg };
  }

  // ----- PV Status → สีตามค่า -----
  if (fieldKey === "pv_status") {
    const bg = PV_COLORS[(rec.pv_status || "").trim()];
    if (bg) return { bg };
  }

  // ----- ปุ่มสี MBL (Import) → พื้นตามสีที่กดไว้ -----
  if (fieldKey === "imp_booking_mbl") {
    const c = (rec.imp_booking_mbl_color || "").trim();
    if (c) return { bg: c };
  }

  return {};
}
