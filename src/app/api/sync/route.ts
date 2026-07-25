import { NextResponse } from "next/server";
import { syncAll } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { authErrorResponse, requireAdmin } from "@/lib/authServer";

export const dynamic = "force-dynamic";

// Extra Split (09) + Accounting Master Queue (10) ตาม Workflow Rules — admin เท่านั้น
export async function POST() {
  try {
    await requireAdmin();
    const res = await withSheetCache(() => syncAll());
    return NextResponse.json(res);
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
