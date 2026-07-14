"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell } from "@/components/Cell";
import { SavingOverlay } from "@/components/SavingOverlay";
import { SaveBar } from "@/components/SaveBar";
import { useData } from "@/components/DataProvider";
import { MODULE_BY_KEY, recordHeaders } from "@/lib/schema";
import { JobRecord } from "@/lib/types";

function tempId() {
  return "R" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// ตารางเรท (Cost/Sell) — แก้ไขในตาราง + ค้นหา + บันทึก
// compact/title/saveBarOffset ใช้ตอนวาง 2 ตารางเทียบกัน (Cost บน / Sell ล่าง)
export function RateBoard({
  moduleKey,
  compact = false,
  title,
  saveBarOffset = 0,
}: {
  moduleKey: string;
  compact?: boolean;
  title?: string;
  saveBarOffset?: number;
}) {
  const mod = MODULE_BY_KEY[moduleKey];
  const { data, loading, reload } = useData();
  const lists = data?.lists || {};

  const [rows, setRows] = useState<JobRecord[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [news, setNews] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    if (!data) return;
    setRows(data.modules[moduleKey] || []);
    setDirty(new Set());
    setNews(new Set());
  }, [data, moduleKey]);

  const onChange = useCallback((id: string, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.__id === id ? { ...r, [key]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const addRow = () => {
    const id = tempId();
    const r: any = {};
    for (const h of recordHeaders(mod)) r[h] = "";
    r.__id = id;
    setRows((prev) => [{ ...r }, ...prev]);
    setNews((prev) => new Set(prev).add(id));
    setDirty((prev) => new Set(prev).add(id));
  };

  const removeRow = async (id: string) => {
    if (news.has(id)) {
      setRows((prev) => prev.filter((r) => r.__id !== id));
      return;
    }
    if (!confirm("ยืนยันลบเรทนี้?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs?module=${moduleKey}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      await reload();
      flash("ลบเรียบร้อย");
    } catch (e: any) {
      flash("ลบไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (dirty.size === 0) return flash("ไม่มีการแก้ไข");
    const newRecords = rows.filter((r) => news.has(r.__id));
    const updRecords = rows.filter((r) => dirty.has(r.__id) && !news.has(r.__id));
    setSaving(true);
    try {
      if (newRecords.length) {
        const res = await fetch(`/api/jobs?module=${moduleKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: newRecords }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
      }
      if (updRecords.length) {
        const res = await fetch(`/api/jobs?module=${moduleKey}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: updRecords }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
      }
      await reload();
      flash("บันทึกเรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => mod.fields.some((f) => (r[f.key] || "").toLowerCase().includes(s)));
  }, [rows, q, mod]);

  return (
    <div className={"board-section" + (compact ? " compact" : "")}>
      <SavingOverlay show={saving} message="กำลังบันทึกเรท…" />
      <div className="toolbar" style={{ marginBottom: 10 }}>
        {title && <span className="section-tag">{title}</span>}
        <div className="field grow">
          <label>ค้นหา (Supplier / Customer / Port / Cargo / …)</label>
          <input value={q} placeholder="พิมพ์เพื่อค้นหา…" onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="count-pill">{filtered.length} / {rows.length} เรท</span>
        <div className="actions">
          <button className="btn" onClick={addRow}>＋ เพิ่มเรท</button>
        </div>
      </div>

      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="sticky-col" style={{ left: 0 }}>#</th>
              {mod.fields.map((f) => (
                <th key={f.key} className={f.mandatory ? "req" : ""} style={{ minWidth: f.width, width: f.width }} title={f.help || f.label}>
                  {f.label}
                </th>
              ))}
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec, i) => (
              <tr key={rec.__id} className={news.has(rec.__id) ? "row-new" : dirty.has(rec.__id) ? "dirty" : ""}>
                <td className="sticky-col rownum" style={{ left: 0 }}>{i + 1}</td>
                {mod.fields.map((f) => (
                  <td key={f.key} className={f.type === "auto" ? "tint-locked" : f.mandatory ? "tint-mandatory" : "tint-editable"}>
                    <Cell
                      field={f}
                      value={rec[f.key] || ""}
                      options={f.list ? lists[f.list] || [] : []}
                      onChange={(v) => onChange(rec.__id, f.key, v)}
                    />
                  </td>
                ))}
                <td>
                  <button className="btn sm danger" onClick={() => removeRow(rec.__id)}>ลบ</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={mod.fields.length + 2} style={{ padding: 26, textAlign: "center", color: "#777" }}>
                  {loading ? "กำลังโหลด…" : "ยังไม่มีเรท — กด “＋ เพิ่มเรท”"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SaveBar count={dirty.size} onSave={save} saving={saving} label={title ? title + " " : "เรท"} offset={saveBarOffset} />
      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </div>
  );
}
