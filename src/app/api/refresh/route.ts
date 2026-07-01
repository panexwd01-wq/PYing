import { NextRequest, NextResponse } from "next/server";
import { refreshModule } from "@/lib/db";
import { MODULE_BY_KEY } from "@/lib/schema";

export const dynamic = "force-dynamic";

// ดึงข้อมูลจาก CS Import/Export เข้ามาในโมดูลปลายทาง (ตาม Job No.) แล้วบันทึก
export async function POST(req: NextRequest) {
  try {
    const key = new URL(req.url).searchParams.get("module") || "";
    const m = MODULE_BY_KEY[key];
    if (!m) return NextResponse.json({ error: `ไม่รู้จักโมดูล: ${key}` }, { status: 400 });
    const count = await refreshModule(m);
    return NextResponse.json({ ok: true, count, message: `ดึงข้อมูลอัปเดต ${count} รายการ` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
