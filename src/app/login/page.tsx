"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TABS, can } from "@/lib/perms";
import type { Perms } from "@/lib/perms";
import type { Role } from "@/lib/session";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { reload } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // หน้าแรกหลังล็อกอิน: หน้าที่ขอมา (ถ้ามีสิทธิ์) ไม่งั้นเอา tab แรกที่เห็นได้
  const landing = (role: Role, perms: Perms) => {
    const next = params.get("next");
    if (next && next.startsWith("/")) return next;
    const first = TABS.find((t) => (t.adminOnly ? role === "admin" : can(role, perms, t.key, "view")));
    return first ? first.href : "/";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await reload();
      router.replace(landing(r.user.role, r.user.perms));
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card fade-in" onSubmit={submit}>
        <div className="login-brand">
          <span className="full">FREIGHT</span> OPS
        </div>
        <p className="muted" style={{ marginTop: 0 }}>PANEX Mini ERP — เข้าสู่ระบบ</p>

        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="username"
          />
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {err && <div className="login-err">{err}</div>}

        <button className="btn primary lg" type="submit" disabled={busy || !username || !password}>
          {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
        <p className="muted login-hint">ใช้งานครั้งแรก: <b>admin</b> / <b>admin</b> (เปลี่ยนรหัสผ่านทันทีที่หน้า “ผู้ใช้”)</p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-page" />}>
      <LoginForm />
    </Suspense>
  );
}
