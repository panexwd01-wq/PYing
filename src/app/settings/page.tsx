"use client";

import { useEffect, useState } from "react";
import { SavingOverlay } from "@/components/SavingOverlay";
import { CenterLoading } from "@/components/Spinner";
import { useData } from "@/components/DataProvider";
import { ALL_LISTS, LIST_LABEL } from "@/lib/schema";
import { Lists } from "@/lib/types";

const CARRIER_KEY = "carrier"; // list ที่มี color picker ต่อรายการ

export default function SettingsPage() {
  const { data, loading, error, reload: reloadApp } = useData();
  const [lists, setLists] = useState<Lists>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [drag, setDrag] = useState<{ key: string; idx: number } | null>(null);

  const flash = (text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2800);
  };

  // ตั้งสถานะ "ยังไม่บันทึก" + เด้ง Toast เตือนเฉพาะครั้งแรกที่เริ่มแก้
  const markDirty = () => {
    setDirty((prev) => {
      if (!prev) flash("มีการแก้ไข — อย่าลืมกด “บันทึก Dropdown”");
      return true;
    });
  };

  // sync สำเนาแก้ไขจากข้อมูลกลาง (context)
  useEffect(() => {
    if (!data) return;
    const base: Lists = {};
    for (const k of ALL_LISTS) base[k] = data.lists[k] ? [...data.lists[k]] : [];
    setLists(base);
    setColors({ ...(data.carrierColors || {}) });
    setDirty(false);
  }, [data]);

  // สีของรายการ Co-Agent/Carrier (คีย์ = ชื่อรายการ)
  const setColor = (value: string, color: string) => {
    markDirty();
    setColors((prev) => ({ ...prev, [value]: color }));
  };
  const clearColor = (value: string) => {
    markDirty();
    setColors((prev) => {
      const n = { ...prev };
      delete n[value];
      return n;
    });
  };

  const setItem = (key: string, idx: number, value: string) => {
    markDirty();
    setLists((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };
  const addItem = (key: string) => {
    markDirty();
    setLists((prev) => ({ ...prev, [key]: [...(prev[key] || []), ""] }));
  };
  const removeItem = (key: string, idx: number) => {
    markDirty();
    setLists((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));
  };
  const moveItem = (key: string, from: number, to: number) => {
    const arr = lists[key] || [];
    if (to < 0 || to >= arr.length || from === to) return;
    markDirty();
    const next = [...arr];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setLists((prev) => ({ ...prev, [key]: next }));
  };

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
      // บันทึกสี Co-Agent/Carrier — เก็บเฉพาะรายการที่ยังมีในลิสต์ (ตัด orphan)
      const carrierSet = new Set(clean[CARRIER_KEY] || []);
      const cleanColors: Record<string, string> = {};
      for (const [name, c] of Object.entries(colors)) if (carrierSet.has(name) && c) cleanColors[name] = c;
      const rc = await fetch("/api/carrier-colors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierColors: cleanColors }),
      }).then((x) => x.json());
      if (rc.error) throw new Error(rc.error);
      setDirty(false);
      await reloadApp();
      flash("บันทึก dropdown + สีเรียบร้อย");
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
          {dirty && <span className="unsaved-pill">● ยังไม่บันทึก</span>}
          <button className="btn" onClick={reloadApp} disabled={loading || saving}>
            รีเฟรช
          </button>
          <button className={"btn primary" + (dirty ? " pulse" : "")} onClick={saveLists} disabled={loading || saving}>
            บันทึก Dropdown
          </button>
        </div>
        <p className="muted">
          แก้ไขค่าตัวเลือกของแต่ละช่อง · ลากที่ <b>≡</b> เพื่อจัดลำดับ · <b>Co-Agent / Carrier</b> เลือกสีต่อรายการได้ (ระบายช่องทุก tab)
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
              <h3>
                {LIST_LABEL[key] || key}
                <span className="list-count">{(lists[key] || []).length}</span>
              </h3>
              <div className="list-items">
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
                    {key === CARRIER_KEY && (
                      <span className="color-pick" title="เลือกสีของรายการนี้ (ระบายช่อง Co-Agent/Carrier ทุก tab)">
                        <input
                          type="color"
                          value={colors[v.trim()] || "#ffffff"}
                          onChange={(e) => setColor(v.trim(), e.target.value)}
                          aria-label="เลือกสี"
                        />
                        {colors[v.trim()] && (
                          <button className="btn sm" onClick={() => clearColor(v.trim())} title="ล้างสี">
                            ล้าง
                          </button>
                        )}
                      </span>
                    )}
                    <button className="btn sm danger" onClick={() => removeItem(key, i)}>
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
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
