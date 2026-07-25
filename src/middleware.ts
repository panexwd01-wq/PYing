import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, signSession, verifySession } from "@/lib/session";

// เส้นทางที่เข้าได้โดยไม่ต้องล็อกอิน
const PUBLIC = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api/"))
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // ต่ออายุ session ทุกคำขอ (นับ idle ใหม่ 24 ชม.)
  const res = NextResponse.next();
  const fresh = await signSession({ ...session, t: Date.now() });
  res.cookies.set(SESSION_COOKIE, fresh, cookieOptions());
  return res;
}

export const config = {
  // ข้ามไฟล์ static ทั้งหมด
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js|woff|woff2)$).*)"],
};
