import { NextResponse } from "next/server";
import { currentUser } from "@/lib/authServer";
import { withSheetCache } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// คืนผู้ใช้ปัจจุบัน + สิทธิ์ล่าสุด (อ่านสดจากชีท — admin แก้สิทธิ์แล้วมีผลทันทีที่รีเฟรช)
export async function GET() {
  try {
    const u = await withSheetCache(() => currentUser());
    if (!u) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: { username: u.username, displayName: u.displayName, role: u.role, perms: u.perms },
    });
  } catch (e: any) {
    return NextResponse.json({ user: null, error: e.message }, { status: 200 });
  }
}
