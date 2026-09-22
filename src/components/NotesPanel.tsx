"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { MODULE_BY_KEY } from "@/lib/schema";

// ===== แผงโน้ตด้านข้าง (ขาออก ข้อ 2) =====
// โน้ตของ "หน้านั้น ๆ" — เป็นของส่วนกลาง ทุกคนเห็นและแก้ร่วมกัน
// เก็บใน _settings (A4) เป็น JSON { pageKey: ข้อความ }

// ชื่อหน้าที่อ่านง่าย ใช้เป็นหัวแผง + คีย์ที่เก็บโน้ต
function pageOf(pathname: string): { key: string; label: string } | null {
  if (pathname === "/login") return null;
  if (pathname.startsWith("/m/")) {
    const k = pathname.split("/")[2] || "";
    const m = MODULE_BY_KEY[k];
    return m ? { key: k, label: m.label } : null;
  }
  const fixed: Record<string, string> = {
    "/": "Dashboard",
    "/rates": "Rates",
    "/settings": "ตั้งค่า",
    "/users": "ผู้ใช้",
    "/views/action": "Action",
    "/views/management": "Management",
    "/views/sales": "Sales",
    "/views/ship-daily": "Ship Daily",
    "/views/supervisor": "Supervisor",
  };
  const label = fixed[pathname];
  return label ? { key: pathname, label } : null;
}

export function NotesPanel() {
  const pathname = usePathname();
  const { data, applyOrReload } = useData();
  const { user } = useAuth();
  const page = useMemo(() => pageOf(pathname), [pathname]);

  const saved = (page && data?.notes?.[page.key]) || "";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ค่าจาก server เปลี่ยน (เปลี่ยนหน้า / มีคนอื่นแก้) → ตั้งค่าในกล่องใหม่
  useEffect(() => {
    setText(saved);
    setErr("");
  }, [saved, page?.key]);

  if (!page || !user) return null;

  const dirty = text !== saved;

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: { module: page.key, text } }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await applyOrReload(r.snapshot);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        className={"note-fab" + (saved ? " has" : "")}
        onClick={() => setOpen((v) => !v)}
        title={saved ? "มีโน้ตของหน้านี้อยู่" : "เปิดแผงโน้ตของหน้านี้"}
      >
        📝 โน้ต
      </button>

      {open && (
        <aside className="note-panel">
          <div className="note-head">
            <b>โน้ต — {page.label}</b>
            <button className="btn sm ghost" onClick={() => setOpen(false)} aria-label="ปิด">✕</button>
          </div>
          <p className="muted note-hint">โน้ตนี้ใช้ร่วมกันทุกคน — ใครแก้ก็เห็นเหมือนกัน</p>
          {err && <div className="cs-err">{err}</div>}
          <textarea
            className="note-text"
            value={text}
            placeholder="พิมพ์อะไรก็ได้ ยาวเท่าไหร่ก็ได้…"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="note-foot">
            {dirty && <span className="unsaved-pill">● ยังไม่บันทึก</span>}
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setText(saved)} disabled={!dirty || saving}>
              ย้อนกลับ
            </button>
            <button className="btn primary" onClick={save} disabled={!dirty || saving}>
              {saving ? "กำลังบันทึก…" : "บันทึกโน้ต"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
