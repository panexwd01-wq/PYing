// รวมกฎ "ช่องนี้ล็อกไหม / พื้นสีอะไร" ไว้ที่เดียว — ใช้ทั้งตารางปกติ (JobGrid) และมุมมองรวบกลุ่ม (GroupedGrid)
import { Field } from "./fields";
import { JobRecord } from "./types";
import { cellCue } from "./cellRules";

export interface CellStateOpts {
  statusKey: string;
  picKey: string;
  unlocked: boolean; // ปลดล็อกงานที่ End แล้ว (Supervisor)
  readOnly?: boolean; // ไม่มีสิทธิ์แก้ไข tab นี้
}

export interface CellState {
  locked: boolean;
  hint: string;
  bg?: string;
  isEnd: boolean;
  endLocked: boolean;
}

export function cellState(
  moduleId: string,
  rec: JobRecord,
  f: Field,
  o: CellStateOpts,
  carrierColors?: Record<string, string>
): CellState {
  const cue = cellCue(moduleId, f.key, rec, carrierColors);
  const isEnd = (rec[o.statusKey] || "") === "End";
  const endLocked = isEnd && !o.unlocked;
  const picFilled = (rec[o.picKey] || "") !== "";
  const isYellow = !f.mandatory && f.type !== "auto";
  const needPic = isYellow && f.key !== o.picKey && !picFilled;
  const locked = !!o.readOnly || endLocked || needPic || !!cue.locked;

  const hint = o.readOnly
    ? "บัญชีนี้ไม่มีสิทธิ์แก้ไข tab นี้"
    : cue.locked
    ? "ล็อกตามสถานะ (Cancel / Done) — เปลี่ยนสถานะก่อนจึงจะแก้ได้"
    : endLocked
    ? "งาน End แล้ว — ต้องปลดล็อก (Supervisor) ก่อนแก้"
    : "ต้องระบุ PIC ของโมดูลก่อนจึงจะแก้ช่องนี้ได้";

  return { locked, hint, bg: cue.bg, isEnd, endLocked };
}
