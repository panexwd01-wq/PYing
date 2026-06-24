import { NextResponse } from "next/server";
import { initializeWorkbook } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await initializeWorkbook();
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
