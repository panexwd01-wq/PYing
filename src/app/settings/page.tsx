"use client";

import { useEffect, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { CenterLoading } from "@/components/Spinner";
import { useData } from "@/components/DataProvider";
import { ALL_LISTS, LIST_LABEL } from "@/lib/schema";
import { Lists } from "@/lib/types";

export default function SettingsPage() {
  const { data, loading, error, reload: reloadApp } = useData();
  const [lists, setLists] = useState<Lists>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [drag, setDrag] = useState<{ key: string; idx: number } | null>(null);

  const flash = (text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2800);
  };

  // sync สำเนาแก้ไขจากข้อมูลกลาง (context)
  useEffect(() => {
    if (!data) return;
    const base: Lists = {};
    for (const k of ALL_LISTS) base[k] = data.lists[k] ? [...data.lists[k]] : [];
    setLists(base);
  }, [data]);

  const setItem = (key: string, idx: number, value: string) =>
    setLists((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  const addItem = (key: string) =>
    setLists((prev) => ({ ...prev, [key]: [...(prev[key] || []), ""] }));
  const removeItem = (key: string, idx: number) =>
    setLists((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));
  const moveItem = (key: string, from: number, to: number) =>
    setLists((prev) => {
      const arr = [...(prev[key] || [])];
      if (to < 0 || to >= arr.length || from === to) return prev;
      const [x] = arr.splice(from, 1);
      arr.splice(to, 0, x);
      return { ...prev, [key]: arr };
    });

  const saveLists = async () => {
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
      await reloadApp();
      flash("บันทึก dropdown เรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page fade-in">
      <SavingOverlay show={saving} message="กำลังบันทึก dropdown…" />

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ flex: 1 }}>จัดการ Dropdown (Lists)</h2>
          <button className="btn" onClick={reloadApp} disabled={loading}>
            รีเฟรช
          </button>
          <button className="btn primary" onClick={saveLists} disabled={loading}>
            บันทึก Dropdown
          </button>
        </div>
        <p className="muted">
          แก้ไขค่าตัวเลือกของแต่ละช่อง · ลากที่ <b>≡</b> เพื่อจัดลำดับ · แล้วกดบันทึก — มีผลกับ dropdown ทั้งระบบทันที
        </p>
      </div>

      {loading && !data ? (
        <CenterLoading text="กำลังโหลด Lists…" />
      ) : error ? (
        <div className="panel">
          <p className="muted">โหลดไม่สำเร็จ: {error}</p>
          <button className="btn primary" onClick={reloadApp}>ลองใหม่</button>
        </div>
      ) : (
        <div className="lists-grid">
          {ALL_LISTS.map((key) => (
            <div className="list-card" key={key}>
              <h3>{LIST_LABEL[key] || key}</h3>
              {(lists[key] || []).map((v, i) => (
                <div
                  className={"item-row" + (drag && drag.key === key && drag.idx === i ? " dragging" : "")}
                  key={i}
                  onDragOver={(e) => {
                    if (drag && drag.key === key) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (drag && drag.key === key) moveItem(key, drag.idx, i);
                    setDrag(null);
                  }}
                >
                  <span
                    className="drag-handle"
                    draggable
                    onDragStart={() => setDrag({ key, idx: i })}
                    onDragEnd={() => setDrag(null)}
                    title="ลากเพื่อจัดลำดับ"
                  >
                    ≡
                  </span>
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

      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </main>
  );
}
