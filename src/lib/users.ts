// ===== _users : ผู้ใช้ระบบ + สิทธิ์ต่อ tab =====
// เก็บใน Google Sheet tab "_users" (คอลัมน์ A = __id เหมือนชีทอื่น)
// รหัสผ่านเก็บเป็น scrypt hash เท่านั้น (ไม่เก็บข้อความเปล่า)
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { appendRows, clearRange, ensureSheet, readRange, writeRange } from "./sheets";
import { Perms, defaultUserPerms, parsePerms } from "./perms";
import type { Role } from "./session";

export const USERS_SHEET = "_users";
export const USER_HEADERS = [
  "__id",
  "username",
  "password",
  "display_name",
  "role",
  "active",
  "perms",
  "created_at",
];
const LAST_COL = "H"; // = USER_HEADERS.length

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  perms: Perms;
}

// ===== built-in admin (hardcode) =====
// เข้าได้เสมอ ไม่ต้องมีแถวใน _users และไม่ต้องพึ่ง Google Sheet
// (ใช้กู้ระบบตอนลืมรหัส / ชีทพัง / โดนถอดสิทธิ์) — role=admin จึงผ่านทุก permission
export const BUILTIN_ADMIN_ID = "U_BUILTIN_ADMIN";
const BUILTIN_ADMIN_USERNAME = "james";
const BUILTIN_ADMIN_PASSWORD = "1150";

export function isBuiltinAdminName(username: string): boolean {
  return (username || "").trim().toLowerCase() === BUILTIN_ADMIN_USERNAME;
}

export function builtinAdmin(): AppUser {
  return {
    id: BUILTIN_ADMIN_ID,
    username: BUILTIN_ADMIN_USERNAME,
    displayName: "James (Super Admin)",
    role: "admin",
    active: true,
    perms: { tabs: {}, lists: true },
  };
}

// true เมื่อ username+password ตรงกับ built-in admin
export function matchBuiltinAdmin(username: string, password: string): boolean {
  return isBuiltinAdminName(username) && password === BUILTIN_ADMIN_PASSWORD;
}

// ----- password hashing (scrypt) -----
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = (stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const expect = Buffer.from(parts[2], "hex");
    const got = scryptSync(plain, parts[1], expect.length);
    return expect.length === got.length && timingSafeEqual(expect, got);
  } catch {
    return false;
  }
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function genId(): string {
  return "U" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

interface RawUser {
  __id: string;
  username: string;
  password: string;
  display_name: string;
  role: string;
  active: string;
  perms: string;
  created_at: string;
  _row: number;
}

async function ensureUsersSheet(): Promise<void> {
  await ensureSheet(USERS_SHEET);
  const rows = await readRange(`${USERS_SHEET}!A1:${LAST_COL}1`);
  const header = rows[0] || [];
  if (header.join("|") !== USER_HEADERS.join("|")) {
    await writeRange(`${USERS_SHEET}!A1`, [USER_HEADERS]);
  }
}

async function rawUsers(): Promise<RawUser[]> {
  await ensureUsersSheet();
  const rows = await readRange(`${USERS_SHEET}!A1:${LAST_COL}`);
  if (rows.length < 2) return [];
  const out: RawUser[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (!(r[0] || "").trim()) continue;
    const rec: any = { _row: i + 1 };
    USER_HEADERS.forEach((h, c) => (rec[h] = (r[c] ?? "").toString()));
    out.push(rec as RawUser);
  }
  return out;
}

const toAppUser = (r: RawUser): AppUser => ({
  id: r.__id,
  username: r.username,
  displayName: r.display_name || r.username,
  role: r.role === "admin" ? "admin" : "user",
  active: (r.active || "Yes") !== "No",
  perms: parsePerms(r.perms),
});

// ผู้ใช้ตั้งต้น: admin / admin (สร้างครั้งแรกเมื่อชีทยังว่าง)
export async function seedAdminIfEmpty(): Promise<void> {
  const list = await rawUsers();
  if (list.length) return;
  await appendRows(`${USERS_SHEET}!A1`, [
    [
      genId(),
      "admin",
      hashPassword("admin"),
      "Administrator",
      "admin",
      "Yes",
      JSON.stringify({ tabs: {}, lists: true }),
      nowStamp(),
    ],
  ]);
}

export async function listUsers(): Promise<AppUser[]> {
  await seedAdminIfEmpty();
  return (await rawUsers()).map(toAppUser);
}

// ตรวจ username + password → คืน user ถ้าผ่าน (และยัง active)
export async function authenticate(username: string, password: string): Promise<AppUser | null> {
  // built-in admin: เช็คก่อนแตะชีท → เข้าได้แม้ Sheets ล่ม/ยังไม่มีชีท _users
  if (matchBuiltinAdmin(username, password)) return builtinAdmin();
  if (isBuiltinAdminName(username)) return null; // ชื่อนี้สงวนไว้ ห้ามใช้แถวในชีทมาสวม
  await seedAdminIfEmpty();
  const uname = (username || "").trim().toLowerCase();
  const hit = (await rawUsers()).find((r) => r.username.trim().toLowerCase() === uname);
  if (!hit) return null;
  if ((hit.active || "Yes") === "No") return null;
  if (!verifyPassword(password, hit.password)) return null;
  return toAppUser(hit);
}

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  if (isBuiltinAdminName(username)) return builtinAdmin();
  const uname = (username || "").trim().toLowerCase();
  const hit = (await rawUsers()).find((r) => r.username.trim().toLowerCase() === uname);
  return hit ? toAppUser(hit) : null;
}

export interface UserInput {
  username: string;
  password?: string;
  displayName?: string;
  role?: Role;
  active?: boolean;
  perms?: Perms;
}

export async function createUser(input: UserInput): Promise<AppUser> {
  const username = (input.username || "").trim();
  if (!username) throw new Error("ต้องระบุ username");
  if (isBuiltinAdminName(username)) throw new Error(`username "${username}" สงวนไว้สำหรับผู้ดูแลระบบ`);
  if (!input.password) throw new Error("ต้องระบุรหัสผ่าน");
  const existing = await rawUsers();
  if (existing.some((r) => r.username.trim().toLowerCase() === username.toLowerCase()))
    throw new Error(`มี username "${username}" อยู่แล้ว`);
  const perms = input.perms || defaultUserPerms();
  const row = [
    genId(),
    username,
    hashPassword(input.password),
    input.displayName || username,
    input.role === "admin" ? "admin" : "user",
    input.active === false ? "No" : "Yes",
    JSON.stringify(perms),
    nowStamp(),
  ];
  await appendRows(`${USERS_SHEET}!A1`, [row]);
  const rec: any = {};
  USER_HEADERS.forEach((h, i) => (rec[h] = row[i]));
  return toAppUser({ ...rec, _row: 0 } as RawUser);
}

export async function updateUser(id: string, patch: UserInput & { password?: string }): Promise<AppUser> {
  const all = await rawUsers();
  const cur = all.find((r) => r.__id === id);
  if (!cur) throw new Error("ไม่พบผู้ใช้");

  const nextUsername = patch.username?.trim() || cur.username;
  if (isBuiltinAdminName(nextUsername))
    throw new Error(`username "${nextUsername}" สงวนไว้สำหรับผู้ดูแลระบบ`);
  if (
    nextUsername.toLowerCase() !== cur.username.toLowerCase() &&
    all.some((r) => r.__id !== id && r.username.trim().toLowerCase() === nextUsername.toLowerCase())
  )
    throw new Error(`มี username "${nextUsername}" อยู่แล้ว`);

  const next: RawUser = {
    ...cur,
    username: nextUsername,
    password: patch.password ? hashPassword(patch.password) : cur.password,
    display_name: patch.displayName ?? cur.display_name,
    role: patch.role ? (patch.role === "admin" ? "admin" : "user") : cur.role,
    active: patch.active === undefined ? cur.active : patch.active ? "Yes" : "No",
    perms: patch.perms ? JSON.stringify(patch.perms) : cur.perms,
  };

  // กันล็อกตัวเองออกจากระบบ: ต้องเหลือ admin ที่ active อย่างน้อย 1 คน
  const adminsLeft = all.filter((r) =>
    r.__id === id ? next.role === "admin" && next.active !== "No" : r.role === "admin" && r.active !== "No"
  );
  if (!adminsLeft.length) throw new Error("ต้องเหลือผู้ใช้สิทธิ์ admin ที่ใช้งานได้อย่างน้อย 1 คน");

  await writeRange(
    `${USERS_SHEET}!A${cur._row}:${LAST_COL}${cur._row}`,
    [USER_HEADERS.map((h) => (next as any)[h] ?? "")]
  );
  return toAppUser(next);
}

export async function deleteUser(id: string): Promise<void> {
  const all = await rawUsers();
  const cur = all.find((r) => r.__id === id);
  if (!cur) return;
  const adminsLeft = all.filter((r) => r.__id !== id && r.role === "admin" && r.active !== "No");
  if (!adminsLeft.length) throw new Error("ต้องเหลือผู้ใช้สิทธิ์ admin ที่ใช้งานได้อย่างน้อย 1 คน");
  await clearRange(`${USERS_SHEET}!A${cur._row}:${LAST_COL}${cur._row}`);
}
