"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { JobGrid } from "@/components/JobGrid";
import { FilterBar, Filters } from "@/components/FilterBar";
import { SavingOverlay } from "@/components/SavingOverlay";
import { SaveBar } from "@/components/SaveBar";
import { CenterLoading } from "@/components/Spinner";
import { useData } from "@/components/DataProvider";
import { MODULE_BY_KEY, moduleGroups, recordHeaders } from "@/lib/schema";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";

const CS_KEYS = ["im_cs", "ex_cs", "cs_pic"];
const SEARCH_KEYS = [
  "imp_job_no", "exp_job_no", "job_no",
  "imp_booking_mbl", "exp_booking_mbl", "booking_mbl",
  "imp_hbl", "exp_hbl", "hbl",
  "imp_customer_ref", "exp_customer_ref", "customer_ref", "customer",
];

function tempId() {
  return "J" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// ===== 1 section = filter + ตาราง (ใช้ซ้ำได้ 2 อันตอนโหมดเทียบ) =====
interface SectionMeta {
  fields: Field[];
  groups: string[];
  statusKey: string;
  statusList?: string;
  picKey: string;
  csField?: Field;
  dateField?: Field;
  searchKeys: string[];
  years: string[];
  lists: Lists;
}

function BoardSection({
  rows,
  meta,
  collapsed,
  compact,
  title,
  dirty,
  news,
  unlocked,
  onChange,
  onDelete,
  onUnlock,
}: {
  rows: JobRecord[];
  meta: SectionMeta;
  collapsed: boolean;
  compact: boolean;
  title?: string;
  dirty: Set<string>;
  news: Set<string>;
  unlocked: Set<string>;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ year: "", month: "", status: "", cs: "", q: "" });
  const { fields, groups, statusKey, statusList, picKey, csField, dateField, searchKeys, years, lists } = meta;

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = (dateField ? r[dateField.key] : "") || "";
      if (dateField && filters.year && d.slice(0, 4) !== filters.year) return false;
      if (dateField && filters.month && d.slice(5, 7) !== filters.month) return false;
      if (filters.status && r[statusKey] !== filters.status) return false;
      if (csField && filters.cs && r[csField.key] !== filters.cs) return false;
      if (q) {
        const hay = searchKeys.map((k) => r[k] || "").join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters, dateField, statusKey, csField, searchKeys]);

  return (
    <div className={"board-section" + (compact ? " compact" : "")}>
      <div className="toolbar section-toolbar">
        {title && <span className="section-tag">{title}</span>}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          statusOptions={(statusList && lists[statusList]) || []}
          csOptions={(csField?.list && lists[csField.list]) || []}
          csLabel={csField?.label || "CS"}
          years={years}
          showDate={!!dateField}
        />
        <span className="count-pill">{filtered.length} / {rows.length} รายการ</span>
      </div>
      <JobGrid
        fields={fields}
        groups={groups}
        rows={filtered}
        lists={lists}
        dirtyIds={dirty}
        newIds={news}
        statusKey={statusKey}
        picKey={picKey}
        unlockedIds={unlocked}
        collapsed={collapsed}
        onChange={onChange}
        onDelete={onDelete}
        onUnlock={onUnlock}
      />
    </div>
  );
}

export function ModuleBoard({ moduleKey }: { moduleKey: string }) {
  const mod = MODULE_BY_KEY[moduleKey];
  const { data, loading: dataLoading, error: dataError, reload } = useData();
  const lists = data?.lists || {};

  const groups = useMemo(() => moduleGroups(mod), [mod]);
  const statusKey = mod.fields[0].key;
  const statusList = mod.fields[0].list;
  const csField = useMemo(() => mod.fields.find((f) => CS_KEYS.includes(f.key)), [mod]);
  const dateField = useMemo(() => mod.fields.find((f) => f.type === "datetime"), [mod]);
  const searchKeys = useMemo(
    () => mod.fields.filter((f) => SEARCH_KEYS.includes(f.key)).map((f) => f.key),
    [mod]
  );
  const hasPull = useMemo(() => mod.fields.some((f) => f.pull || f.rpull), [mod]);
  // 4 โมดูลนี้ผูกกับ CS: สร้าง/ลบอัตโนมัติเมื่อบันทึก CS Import/Export — ห้ามเพิ่ม/ลบเอง
  const csDriven = ["shipping", "transport", "warehouse", "extra"].includes(moduleKey);

  const emptyRecord = useCallback(
    (id: string): JobRecord => {
      const r: any = {};
      for (const h of recordHeaders(mod)) r[h] = "";
      r.__id = id;
      r[statusKey] = "Open";
      return r as JobRecord;
    },
    [mod, statusKey]
  );

  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState("กำลังบันทึก…");
  const [rows, setRows] = useState<JobRecord[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [news, setNews] = useState<Set<string>>(new Set());
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [collapsed, setCollapsed] = useState(true); // เริ่มที่โหมดย่อ
  const [compare, setCompare] = useState(false);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // sync แถวจาก snapshot (โหลดครั้งแรก / หลัง reload) — ทิ้ง state แก้ไขที่ค้าง
  useEffect(() => {
    if (!data) return;
    setRows(data.modules[moduleKey] || []);
    setDirty(new Set());
    setNews(new Set());
    setUnlocked(new Set());
  }, [data, moduleKey]);

  useEffect(() => {
    if (dataError) flash("โหลดข้อมูลไม่สำเร็จ: " + dataError, true);
  }, [dataError, flash]);

  const onChange = useCallback((id: string, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.__id === id ? { ...r, [key]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  const onUnlock = useCallback((id: string) => {
    setUnlocked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const addRow = useCallback(() => {
    const id = tempId();
    setRows((prev) => [emptyRecord(id), ...prev]);
    setNews((prev) => new Set(prev).add(id));
    setDirty((prev) => new Set(prev).add(id));
  }, [emptyRecord]);

  const removeRow = useCallback(
    async (id: string) => {
      if (news.has(id)) {
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
    },
    [news, flash, moduleKey, reload]
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
  }, [dirty, news, rows, reload, flash, moduleKey]);

  const refresh = useCallback(async () => {
    setSavingMsg("กำลังดึงข้อมูลจาก CS…");
    setSaving(true);
    try {
      const res = await fetch(`/api/refresh?module=${moduleKey}`, { method: "POST" });
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      await reload();
      flash(j.message || "ดึงข้อมูลเรียบร้อย");
    } catch (e: any) {
      flash("ดึงข้อมูลไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  }, [moduleKey, reload, flash]);

  // ===== ปีสำหรับ filter (ใช้ร่วมทุก section) =====
  const years = useMemo(() => {
    const s = new Set<string>();
    if (dateField) {
      for (const r of rows) {
        const d = r[dateField.key];
        if (d && d.length >= 4) s.add(d.slice(0, 4));
      }
    }
    s.add(String(new Date().getFullYear()));
    return Array.from(s).sort().reverse();
  }, [rows, dateField]);

  const meta: SectionMeta = useMemo(
    () => ({
      fields: mod.fields,
      groups,
      statusKey,
      statusList,
      picKey: mod.picKey,
      csField,
      dateField,
      searchKeys,
      years,
      lists,
    }),
    [mod.fields, mod.picKey, groups, statusKey, statusList, csField, dateField, searchKeys, years, lists]
  );

  const sectionProps = {
    rows,
    meta,
    collapsed,
    dirty,
    news,
    unlocked,
    onChange,
    onDelete: csDriven ? undefined : removeRow,
    onUnlock,
  };

  return (
    <main className="page fade-in">
      <SavingOverlay show={saving} message={savingMsg} />

      <div className="toolbar top-toolbar">
        <div className="view-toggle" role="group" aria-label="โหมดแสดงผล">
          <button className={"btn" + (collapsed ? " primary" : "")} onClick={() => setCollapsed(true)} title="โชว์แค่คอลัมน์สำคัญ กดกางดูรายละเอียดต่อแถว">
            ▤ ย่อ
          </button>
          <button className={"btn" + (!collapsed ? " primary" : "")} onClick={() => setCollapsed(false)} title="โชว์ทุกคอลัมน์ (เลื่อนซ้าย-ขวา)">
            ▦ เต็ม
          </button>
        </div>
        <button className={"btn" + (compare ? " primary" : "")} onClick={() => setCompare((v) => !v)} title="แบ่งจอบน/ล่างเป็น 2 ตาราง เปิดคนละรายการเทียบกัน">
          ⇅ เทียบ 2 รายการ {compare ? "(เปิด)" : ""}
        </button>
        <div className="actions">
          <button className="btn" onClick={reload} disabled={dataLoading}>
            รีเฟรช
          </button>
          {hasPull && (
            <button className="btn" onClick={refresh} disabled={dataLoading} title="ดึงข้อมูลเชื่อมข้ามโมดูลด้วย Job No.">
              ⟳ ดึงข้อมูลเชื่อม
            </button>
          )}
          {!csDriven && (
            <button className="btn" onClick={addRow}>
              ＋ เพิ่มงาน
            </button>
          )}
        </div>
      </div>

      <div className="legend">
        <span className="item"><span className="sw" style={{ background: "var(--c-mandatory)", borderColor: "var(--c-mandatory-bd)" }} /> ฟ้า = ต้องกรอก</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-editable)", borderColor: "var(--c-editable-bd)" }} /> เหลือง = แก้ไขได้ (ต้องมี PIC)</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-locked)", borderColor: "var(--c-locked-bd)" }} /> เทา = Auto / ดึงจาก Module อื่น</span>
        {collapsed && <span className="item hint">กด ▸ หน้าแถวเพื่อกางรายละเอียดที่เหลือ</span>}
      </div>

      {dataLoading && !data ? (
        <CenterLoading />
      ) : compare ? (
        <div className="compare-wrap">
          <BoardSection {...sectionProps} compact title="รายการที่ 1" />
          <BoardSection {...sectionProps} compact title="รายการที่ 2" />
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <BoardSection {...sectionProps} compact={false} />
        </div>
      )}

      <SaveBar count={dirty.size} onSave={saveAll} saving={saving} label="งาน" />
      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </main>
  );
}
