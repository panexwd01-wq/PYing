import { NextRequest, NextResponse } from "next/server";
import { readCarrierColors, writeCarrierColors } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { assertCanLists, authErrorResponse, requireUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const carrierColors = await withSheetCache(() => readCarrierColors());
    return NextResponse.json({ carrierColors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const u = await requireUser();
    assertCanLists(u); // สีของ Co-Agent/Carrier อยู่ในหน้าตั้งค่า Dropdown
    const body = await req.json();
    await withSheetCache(() => writeCarrierColors(body.carrierColors || {}));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
