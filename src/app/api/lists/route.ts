import { NextRequest, NextResponse } from "next/server";
import { readLists, writeLists } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lists = await readLists();
    return NextResponse.json({ lists });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await writeLists(body.lists || {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
