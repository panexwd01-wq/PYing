import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db";
import { authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// อ่านทุกโมดูล + lists ใน request เดียว (batchGet) — ใช้ตอนเปิดเว็บ/หลังแก้ไข
export async function GET() {
  try {
    await requireUser();
    const snap = await getSnapshot();
    return NextResponse.json(snap);
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
