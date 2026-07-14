import { NextResponse } from "next/server";
import { syncAll } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Extra Split (09) + Accounting Master Queue (10) ตาม Workflow Rules
export async function POST() {
  try {
    const res = await withSheetCache(() => syncAll());
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
