import { NextRequest, NextResponse } from "next/server";
import { refreshModule } from "@/lib/db";
import { writeThenSnapshot } from "@/lib/apiWrite";
import { MODULE_BY_KEY } from "@/lib/schema";
import { assertCan, authErrorResponse, requireUser } from "@/lib/authServer";
import { MODULE_TAB_KEY } from "@/lib/perms";

export const dynamic = "force-dynamic";

// ดึงข้อมูลจาก CS Import/Export เข้ามาในโมดูลปลายทาง (ตาม Job No.) แล้วบันทึก
export async function POST(req: NextRequest) {
  try {
    const u = await requireUser();
    const key = new URL(req.url).searchParams.get("module") || "";
    const m = MODULE_BY_KEY[key];
    if (!m) return NextResponse.json({ error: `ไม่รู้จักโมดูล: ${key}` }, { status: 400 });
    assertCan(u, MODULE_TAB_KEY[key] || key, "edit");
    const { result: count, snapshot } = await writeThenSnapshot(() => refreshModule(m));
    return NextResponse.json({
      ok: true,
      count,
      message: `ดึงข้อมูลอัปเดต ${count} รายการ`,
      snapshot,
    });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
