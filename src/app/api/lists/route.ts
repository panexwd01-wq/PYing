import { NextRequest, NextResponse } from "next/server";
import { readLists, writeLists } from "@/lib/db";
import { assertCanLists, authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const lists = await readLists();
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
    await writeLists(body.lists || {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
