import { NextRequest, NextResponse } from "next/server";
import { readCollapseConfig, writeCollapseConfig } from "@/lib/db";
import { writeThenSnapshot } from "@/lib/apiWrite";
import { withSheetCache } from "@/lib/sheets";
import { authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const collapse = await withSheetCache(() => readCollapseConfig());
    return NextResponse.json({ collapse });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { snapshot } = await writeThenSnapshot(() => writeCollapseConfig(body.collapse || {}));
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
