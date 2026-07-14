import { NextRequest, NextResponse } from "next/server";
import { readCollapseConfig, writeCollapseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collapse = await readCollapseConfig();
    return NextResponse.json({ collapse });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await writeCollapseConfig(body.collapse || {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
