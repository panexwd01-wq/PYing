// ===== สิทธิ์ผู้ใช้ต่อ tab =====
// เก็บใน _users คอลัมน์ perms เป็น JSON ก้อนเดียว
import { MODULES } from "./schema";
import type { Role } from "./session";

export type PermAction = "view" | "add" | "edit" | "del" | "end";

export interface TabPerm {
  view: boolean; // เห็น + เข้าใช้ tab
  add: boolean; // เพิ่มรายการ
  edit: boolean; // แก้ไข
  del: boolean; // ลบ
  end: boolean; // เพิ่ม/ลบ/แก้ งานที่สถานะ End
}

export interface Perms {
  tabs: Record<string, Partial<TabPerm>>;
  lists: boolean; // แก้ไข Dropdown (หน้าตั้งค่า) ได้ไหม
}

export interface TabDef {
  key: string;
  label: string;
  href: string;
  crud: boolean; // true = มีเพิ่ม/แก้/ลบ/End ให้ตั้งค่า, false = ดูอย่างเดียว
  adminOnly?: boolean;
}

// ทะเบียน tab ทั้งหมดที่คุมสิทธิ์ได้ (ลำดับเดียวกับเมนู)
export const TABS: TabDef[] = [
  { key: "dashboard", label: "Dashboard", href: "/", crud: false },
  ...MODULES.map((m) => ({ key: m.key, label: m.short, href: `/m/${m.key}`, crud: true })),
  { key: "supervisor", label: "Supervisor", href: "/views/supervisor", crud: false },
  { key: "action", label: "Action", href: "/views/action", crud: false },
  { key: "management", label: "Mgmt", href: "/views/management", crud: false },
  { key: "sales", label: "Sales", href: "/views/sales", crud: false },
  { key: "ship-daily", label: "Ship Daily", href: "/views/ship-daily", crud: false },
  { key: "rates", label: "Rates", href: "/rates", crud: true },
  { key: "settings", label: "ตั้งค่า", href: "/settings", crud: false },
  { key: "users", label: "ผู้ใช้", href: "/users", crud: false, adminOnly: true },
];

export const TAB_BY_KEY: Record<string, TabDef> = Object.fromEntries(TABS.map((t) => [t.key, t]));

// tab ของหน้าเรท 2 ชีท (cost-rates / sell-rates) → คุมด้วยสิทธิ์ "rates"
export const MODULE_TAB_KEY: Record<string, string> = {
  "cost-rates": "rates",
  "sell-rates": "rates",
};

export const ALL_FALSE: TabPerm = { view: false, add: false, edit: false, del: false, end: false };
export const ALL_TRUE: TabPerm = { view: true, add: true, edit: true, del: true, end: true };

export function emptyPerms(): Perms {
  return { tabs: {}, lists: false };
}

// สิทธิ์ตั้งต้นของ user ใหม่ — เห็นได้ + แก้ได้ทุก tab งาน แต่ลบ/End ไม่ได้ และแก้ dropdown ไม่ได้
export function defaultUserPerms(): Perms {
  const tabs: Record<string, Partial<TabPerm>> = {};
  for (const t of TABS) {
    if (t.adminOnly) continue;
    tabs[t.key] = t.crud
      ? { view: true, add: true, edit: true, del: false, end: false }
      : { view: true };
  }
  tabs.settings = { view: false };
  // เรท: เพิ่มได้ แต่แก้/ลบไม่ได้ (ตามกติกา "บันทึกแล้วแก้ไขไม่ได้ ต้องติดต่อฝ่ายบัญชี")
  tabs.rates = { view: true, add: true, edit: false, del: false, end: false };
  return { tabs, lists: false };
}

// อ่านสิทธิ์จริง — admin ได้ทุกอย่างเสมอ
export function can(role: Role | undefined, perms: Perms | undefined, tabKey: string, action: PermAction): boolean {
  if (role === "admin") return true;
  if (!perms) return false;
  const t = TAB_BY_KEY[tabKey];
  if (t?.adminOnly) return false;
  const p = perms.tabs?.[tabKey];
  if (!p) return false;
  if (action !== "view" && !p.view) return false; // ไม่เห็น tab ก็ทำอะไรไม่ได้
  return !!p[action];
}

export function canLists(role: Role | undefined, perms: Perms | undefined): boolean {
  return role === "admin" || !!perms?.lists;
}

// path → tab key (ใช้ตอน middleware / guard หน้า)
export function tabKeyFromPath(pathname: string): string | null {
  if (pathname === "/") return "dashboard";
  const mod = /^\/m\/([^/]+)/.exec(pathname);
  if (mod) return mod[1];
  const hit = TABS.find((t) => t.href !== "/" && (pathname === t.href || pathname.startsWith(t.href + "/")));
  return hit ? hit.key : null;
}

// แปลงค่าที่อ่านจากชีทให้เป็น Perms ที่ใช้งานได้เสมอ
export function parsePerms(raw: string | undefined): Perms {
  if (!raw) return emptyPerms();
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return emptyPerms();
    return { tabs: o.tabs && typeof o.tabs === "object" ? o.tabs : {}, lists: !!o.lists };
  } catch {
    return emptyPerms();
  }
}
