"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { JobGrid } from "@/components/JobGrid";
import { FilterBar, Filters } from "@/components/FilterBar";
import { SavingOverlay } from "@/components/SavingOverlay";
import { CenterLoading } from "@/components/Spinner";
import { RECORD_HEADERS } from "@/lib/schema";
import { JobRecord, Lists } from "@/lib/types";

function emptyRecord(id: string): JobRecord {
  const r: any = {};
  for (const h of RECORD_HEADERS) r[h] = "";
  r.__id = id;
  r.im_ops_status = "Open";
  return r as JobRecord;
}

function tempId() {
  return "J" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState("กำลังบันทึก…");
  const [rows, setRows] = useState<JobRecord[]>([]);
  const [lists, setLists] = useState<Lists>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [news, setNews] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [filters, setFilters] = useState<Filters>({ year: "", month: "", status: "", cs: "", q: "" });

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, jr] = await Promise.all([
        fetch("/api/lists").then((r) => r.json()),
        fetch("/api/jobs").then((r) => r.json()),
      ]);
      if (lr.error) throw new Error(lr.error);
      if (jr.error) throw new Error(jr.error);
      setLists(lr.lists || {});
      setRows(jr.jobs || []);
      setDirty(new Set());
      setNews(new Set());
    } catch (e: any) {
      flash("โหลดข้อมูลไม่สำเร็จ: " + e.message, true);
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = useCallback((id: string, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.__id === id ? { ...r, [key]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const addRow = useCallback(() => {
    const id = tempId();
    const rec = emptyRecord(id);
    setRows((prev) => [rec, ...prev]);
    setNews((prev) => new Set(prev).add(id));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const removeRow = useCallback(
    async (id: string) => {
      if (news.has(id)) {
        // ยังไม่เคยบันทึก -> ลบ local ได้เลย
        setRows((prev) => prev.filter((r) => r.__id !== id));
        setNews((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        return;
      }
      if (!confirm("ยืนยันลบงานนี้?")) return;
      setSavingMsg("กำลังลบ…");
      setSaving(true);
      try {
        const res = await fetch(`/api/jobs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        setRows((prev) => prev.filter((r) => r.__id !== id));
        flash("ลบเรียบร้อย");
      } catch (e: any) {
        flash("ลบไม่สำเร็จ: " + e.message, true);
      } finally {
        setSaving(false);
      }
    },
    [news, flash]
  );

  const saveAll = useCallback(async () => {
    if (dirty.size === 0) {
      flash("ไม่มีการแก้ไขที่ต้องบันทึก");
      return;
    }
    const newRecords = rows.filter((r) => news.has(r.__id));
    const updRecords = rows.filter((r) => dirty.has(r.__id) && !news.has(r.__id));
    setSavingMsg("กำลังบันทึก…");
    setSaving(true);
    try {
      for (const rec of newRecords) {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record: rec }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
      }
      if (updRecords.length) {
        const res = await fetch("/api/jobs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: updRecords }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
      }
      await load();
      flash("บันทึกเรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
      setSaving(false);
    }
  }, [dirty, news, rows, load, flash]);

  // ===== filter =====
  const years = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const d = r.eta_imp || r.etd_imp;
      if (d && d.length >= 4) s.add(d.slice(0, 4));
    }
    s.add(String(new Date().getFullYear()));
    return Array.from(s).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = r.eta_imp || r.etd_imp || "";
      if (filters.year && d.slice(0, 4) !== filters.year) return false;
      if (filters.month && d.slice(5, 7) !== filters.month) return false;
      if (filters.status && r.im_ops_status !== filters.status) return false;
      if (filters.cs && r.im_cs !== filters.cs) return false;
      if (q) {
        const hay = [r.imp_job_no, r.imp_booking_mbl, r.imp_hbl, r.imp_customer_ref, r.customer]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters]);

  return (
    <main className="page">
      <SavingOverlay show={saving} message={savingMsg} />

      <div className="toolbar">
        <FilterBar filters={filters} setFilters={setFilters} lists={lists} years={years} />
        <span className="count-pill">{filtered.length} / {rows.length} รายการ</span>
        <div className="actions">
          <button className="btn" onClick={load} disabled={loading}>
            รีเฟรช
          </button>
          <button className="btn" onClick={addRow}>
            ＋ เพิ่มงาน
          </button>
          <button className="btn primary" onClick={saveAll} disabled={dirty.size === 0}>
            บันทึก {dirty.size > 0 ? `(${dirty.size})` : ""}
          </button>
        </div>
      </div>

      <div className="legend">
        <span className="item"><span className="sw" style={{ background: "var(--c-mandatory)", borderColor: "var(--c-mandatory-bd)" }} /> ฟ้า = ต้องกรอก</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-editable)", borderColor: "var(--c-editable-bd)" }} /> เหลือง = แก้ไขได้</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-locked)", borderColor: "var(--c-locked-bd)" }} /> เทา = Auto / Lock (ดึงจาก Module อื่น)</span>
      </div>

      {loading ? (
        <CenterLoading />
      ) : (
        <div style={{ marginTop: 12 }}>
          <JobGrid
            rows={filtered}
            lists={lists}
            dirtyIds={dirty}
            newIds={news}
            onChange={onChange}
            onDelete={removeRow}
          />
        </div>
      )}

      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </main>
  );
}
