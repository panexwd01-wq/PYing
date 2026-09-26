import { NextResponse } from "next/server";
import { currentUser } from "@/lib/authServer";
import { withSheetCache } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// คืนผู้ใช้ปัจจุบัน + สิทธิ์ล่าสุด (อ่านสดจากชีท — admin แก้สิทธิ์แล้วมีผลทันทีที่รีเฟรช)
export async function GET() {
  try {
    // fresh: ข้าม cache ข้ามคำขอ (30 วิ/instance) — ไม่งั้นสิทธิ์ที่ admin เพิ่งแก้อาจยังไม่มา
    // เรียกแค่ตอนเปิดหน้า/กลับมาที่แท็บ จึงเปลือง quota แค่ 1 read ต่อครั้ง
    const u = await withSheetCache(() => currentUser(), { fresh: true });
    if (!u) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: { id: u.id, username: u.username, displayName: u.displayName, role: u.role, perms: u.perms },
    });
  } catch (e: any) {
    return NextResponse.json({ user: null, error: e.message }, { status: 200 });
  }
}
