import { NextRequest, NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db";
import { invalidateAllCache, withSheetCache } from "@/lib/sheets";
import { authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// อ่านทุกโมดูล + lists + ค่าตั้งค่า ใน request เดียว (batchGet) — ใช้ตอนเปิดเว็บ/หลังแก้ไข
// ปกติใช้ cache ฝั่ง server (อายุสั้น) → เปิดหน้าซ้ำ ๆ แทบไม่แตะ Google
// ?fresh=1 = บังคับอ่านใหม่จาก Google (ปุ่ม "รีเฟรช" ในหน้าเว็บ)
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    if (new URL(req.url).searchParams.get("fresh") === "1") invalidateAllCache();
    const snap = await withSheetCache(() => getSnapshot());
    return NextResponse.json(snap);
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
