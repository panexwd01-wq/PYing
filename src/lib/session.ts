// ===== Session cookie (ลงลายเซ็น HMAC) =====
// ใช้ Web Crypto ล้วน ๆ เพื่อให้รันได้ทั้ง Node runtime (API routes) และ Edge runtime (middleware)
// อายุ session = "ไม่ได้ใช้งาน 24 ชั่วโมง" (sliding) — ทุกคำขอที่ผ่านการตรวจจะต่ออายุให้ใหม่

export const SESSION_COOKIE = "panex_session";
export const IDLE_MS = 24 * 60 * 60 * 1000; // 24 ชม.

export type Role = "admin" | "user";

export interface SessionData {
  u: string; // username
  r: Role;
  n: string; // display name
  t: number; // เวลาที่ออก token (ms) — ใช้วัด idle
}

function secretKey(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.SHEET_ID ||
    "panex-mini-erp-dev-secret"
  );
}

const enc = new TextEncoder();

function b64urlEncode(s: string): string {
  const bytes = enc.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  let bin = "";
  for (const b of new Uint8Array(sig)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signSession(data: SessionData): Promise<string> {
  const body = b64urlEncode(JSON.stringify(data));
  return `${body}.${await hmac(body)}`;
}

// คืน null ถ้าลายเซ็นไม่ตรง / รูปแบบผิด / หมดอายุ (ไม่ได้ใช้งานเกิน 24 ชม.)
export async function verifySession(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expect: string;
  try {
    expect = await hmac(body);
  } catch {
    return null;
  }
  if (expect.length !== sig.length) return null;
  // เทียบแบบเวลาคงที่ (กัน timing attack)
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const data = JSON.parse(b64urlDecode(body)) as SessionData;
    if (!data?.u || typeof data.t !== "number") return null;
    if (Date.now() - data.t > IDLE_MS) return null; // ไม่ได้ใช้งานเกิน 24 ชม.
    return data;
  } catch {
    return null;
  }
}

// ค่า cookie มาตรฐาน (ใช้ทั้งตอน login และตอนต่ออายุใน middleware)
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(IDLE_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  };
}
