import { NextRequest, NextResponse } from "next/server";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/users";
import { authErrorResponse, requireAdmin } from "@/lib/authServer";
import { withSheetCache } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// จัดการผู้ใช้ + สิทธิ์ — admin เท่านั้น
export async function GET() {
  try {
    await requireAdmin();
    const users = await withSheetCache(() => listUsers());
    return NextResponse.json({ users });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const user = await withSheetCache(() => createUser(body));
    return NextResponse.json({ user });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
    const user = await withSheetCache(() => updateUser(body.id, body));
    return NextResponse.json({ user });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
    await withSheetCache(() => deleteUser(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
