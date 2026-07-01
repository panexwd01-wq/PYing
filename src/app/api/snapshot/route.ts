import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

// อ่านทุกโมดูล + lists ใน request เดียว (batchGet) — ใช้ตอนเปิดเว็บ/หลังแก้ไข
export async function GET() {
  try {
    const snap = await getSnapshot();
    return NextResponse.json(snap);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
