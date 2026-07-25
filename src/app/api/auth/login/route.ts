import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/users";
import { withSheetCache } from "@/lib/sheets";
import { SESSION_COOKIE, cookieOptions, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "กรอก username และรหัสผ่าน" }, { status: 400 });

    const user = await withSheetCache(() => authenticate(String(username), String(password)));
    if (!user)
      return NextResponse.json({ error: "username หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    const token = await signSession({
      u: user.username,
      r: user.role,
      n: user.displayName,
      t: Date.now(),
    });
    const res = NextResponse.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        perms: user.perms,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
