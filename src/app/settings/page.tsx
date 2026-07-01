"use client";

import { useCallback, useEffect, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { CenterLoading } from "@/components/Spinner";
import { ALL_LISTS, LIST_LABEL } from "@/lib/schema";
import { Lists } from "@/lib/types";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState("กำลังบันทึก…");
  const [lists, setLists] = useState<Lists>({});
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);

  const flash = (text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2800);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/lists").then((x) => x.json());
      if (r.error) throw new Error(r.error);
      const base: Lists = {};
      for (const k of ALL_LISTS) base[k] = r.lists?.[k] || [];
      setLists(base);
    } catch (e: any) {
      flash("โหลดไม่สำเร็จ: " + e.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setItem = (key: string, idx: number, value: string) => {
    setLists((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };
  const addItem = (key: string) =>
    setLists((prev) => ({ ...prev, [key]: [...(prev[key] || []), ""] }));
  const removeItem = (key: string, idx: number) =>
    setLists((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));

  const initialize = async () => {
    if (!confirm("ตั้งค่าชีท: สร้างหัวตาราง 04_CS_Import และ seed dropdown ตั้งต้น (ถ้ายังว่าง)\nดำเนินการต่อ?"))
      return;
    setSavingMsg("กำลังตั้งค่าชีท…");
    setSaving(true);
    try {
      const r = await fetch("/api/init", { method: "POST" }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      flash(r.message || "ตั้งค่าเรียบร้อย");
      await load();
    } catch (e: any) {
      flash("ตั้งค่าไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const saveLists = async () => {
    setSavingMsg("กำลังบันทึก dropdown…");
    setSaving(true);
    try {
      const clean: Lists = {};
      for (const k of Object.keys(lists)) clean[k] = lists[k].map((s) => s.trim()).filter(Boolean);
      const r = await fetch("/api/lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lists: clean }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      flash("บันทึก dropdown เรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page">
      <SavingOverlay show={saving} message={savingMsg} />

      <div className="panel">
        <h2>ตั้งค่าชีท (Initialize)</h2>
        <p className="muted">
          สร้าง/ตรวจหัวตาราง <code>04_CS_Import</code> และชีท <code>_database</code> (เก็บ dropdown
          แบบบล็อก เว้นคอลัมน์คั่น) — ปลอดภัยกับข้อมูลเดิม จะ seed เฉพาะเมื่อ dropdown ยังว่าง
        </p>
        <button className="btn primary" onClick={initialize}>
          เริ่ม Initialize
        </button>
      </div>

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ flex: 1 }}>จัดการ Dropdown (Lists)</h2>
          <button className="btn" onClick={load} disabled={loading}>
            รีเฟรช
          </button>
          <button className="btn primary" onClick={saveLists} disabled={loading}>
            บันทึก Dropdown
          </button>
        </div>
        <p className="muted">แก้ไขค่าตัวเลือกของแต่ละช่อง แล้วกดบันทึก — มีผลกับ dropdown ในตารางทันที</p>

        {loading ? (
          <CenterLoading text="กำลังโหลด Lists…" />
        ) : (
          <div className="lists-grid">
            {ALL_LISTS.map((key) => (
              <div className="list-card" key={key}>
                <h3>{LIST_LABEL[key] || key}</h3>
                {(lists[key] || []).map((v, i) => (
                  <div className="item-row" key={i}>
                    <input value={v} onChange={(e) => setItem(key, i, e.target.value)} />
                    <button className="btn sm danger" onClick={() => removeItem(key, i)}>
                      ลบ
                    </button>
                  </div>
                ))}
                <button className="btn sm" onClick={() => addItem(key)}>
                  ＋ เพิ่มตัวเลือก
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </main>
  );
}
