import { NextRequest, NextResponse } from "next/server";
import { readLists, writeLists } from "@/lib/db";
import { writeThenSnapshot } from "@/lib/apiWrite";
import { withSheetCache } from "@/lib/sheets";
import { assertCanLists, authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const lists = await withSheetCache(() => readLists());
    return NextResponse.json({ lists });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const u = await requireUser();
    assertCanLists(u); // แก้ Dropdown ต้องได้รับสิทธิ์จาก admin
    const body = await req.json();
    // ?snapshot=0 = หน้าตั้งค่าจะบันทึกสีต่อทันที ค่อยเอา snapshot จากคำขอนั้นก้อนเดียว
    const wantSnap = new URL(req.url).searchParams.get("snapshot") !== "0";
    const { snapshot } = await writeThenSnapshot(() => writeLists(body.lists || {}), {
      snapshot: wantSnap,
    });
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
