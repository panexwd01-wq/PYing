// เส้นเขียนของ API: อ่านสดจาก Google ทุกชีทที่แตะ (fresh) แล้วแนบ snapshot ใหม่กลับไปด้วย
// ฝั่งหน้าเว็บจึงไม่ต้องยิง /api/snapshot ซ้ำอีกรอบหลังบันทึก (ประหยัดไปเต็ม ๆ 1 รอบ)
import { getSnapshot } from "./db";
import { withGlobalCache, withSheetCache } from "./sheets";
import type { Snapshot } from "./types";

export async function writeThenSnapshot<T>(
  run: () => Promise<T>,
  opts?: { snapshot?: boolean }
): Promise<{ result: T; snapshot: Snapshot | null }> {
  return withSheetCache(
    async () => {
      const result = await run();
      // ชีทที่เพิ่งเขียนถูกล้าง cache ไปแล้ว → ถูกอ่านใหม่แน่นอน · ชีทที่ไม่ได้แตะใช้ของเดิมได้
      const snapshot =
        opts?.snapshot === false ? null : await withGlobalCache(() => getSnapshot());
      return { result, snapshot };
    },
    { fresh: true }
  );
}
