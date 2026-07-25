// helper ฝั่ง server (API routes) — อ่าน session จาก cookie แล้วโหลดสิทธิ์ล่าสุดจากชีท
// โหลดสิทธิ์สดทุกครั้ง เพื่อให้ admin แก้สิทธิ์แล้วมีผลทันที (ไม่ต้องรอ user login ใหม่)
import { cookies } from "next/headers";
import { SESSION_COOKIE, SessionData, verifySession } from "./session";
import { getUserByUsername, seedAdminIfEmpty, AppUser } from "./users";
import { PermAction, can, canLists } from "./perms";
import { withSheetCache } from "./sheets";

export async function currentSession(): Promise<SessionData | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

export async function currentUser(): Promise<AppUser | null> {
  const s = await currentSession();
  if (!s) return null;
  await seedAdminIfEmpty();
  const u = await getUserByUsername(s.u);
  if (!u || !u.active) return null;
  return u;
}

// ใช้ในทุก API ที่ต้องล็อกอิน — โยน error ถ้าไม่ผ่าน (route จับแล้วตอบ 401)
export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<AppUser> {
  const u = await withSheetCache(() => currentUser());
  if (!u) throw new AuthError("กรุณาเข้าสู่ระบบใหม่", 401);
  return u;
}

export async function requireAdmin(): Promise<AppUser> {
  const u = await requireUser();
  if (u.role !== "admin") throw new AuthError("ต้องเป็นผู้ดูแลระบบ (admin)", 403);
  return u;
}

export function assertCan(u: AppUser, tabKey: string, action: PermAction): void {
  if (!can(u.role, u.perms, tabKey, action)) {
    const what = { view: "เข้าดู", add: "เพิ่ม", edit: "แก้ไข", del: "ลบ", end: "จัดการงานที่ End" }[action];
    throw new AuthError(`ไม่มีสิทธิ์${what}ใน tab นี้`, 403);
  }
}

export function assertCanLists(u: AppUser): void {
  if (!canLists(u.role, u.perms)) throw new AuthError("ไม่มีสิทธิ์แก้ไข Dropdown", 403);
}

export function authErrorResponse(e: unknown): { message: string; status: number } {
  if (e instanceof AuthError) return { message: e.message, status: e.status };
  return { message: (e as Error)?.message || "เกิดข้อผิดพลาด", status: 500 };
}
