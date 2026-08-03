"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { JobGrid } from "@/components/JobGrid";
import { GroupedGrid } from "@/components/GroupedGrid";
import { RecordPanel } from "@/components/RecordPanel";
import { AccountingLinesTable, ExtraLinesTable } from "@/components/LinesTable";
import { FilterBar, Filters } from "@/components/FilterBar";
import { SavingOverlay } from "@/components/SavingOverlay";
import { SaveBar } from "@/components/SaveBar";
import { CenterLoading } from "@/components/Spinner";
import { CollapseSettings } from "@/components/CollapseSettings";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { MODULE_BY_KEY, fieldByKey, moduleGroups, recordHeaders } from "@/lib/schema";
import { defaultCollapseKeys, normalizeCollapseKeys } from "@/lib/collapseDefaults";
import { ACC_LINE_COLUMNS, ACC_LINE_LEAD } from "@/lib/modules/accounting";
import { checkReExport, impJobNoFromReadout } from "@/lib/reExport";
import { JobRecord } from "@/lib/types";

const CS_KEYS = ["im_cs", "ex_cs", "cs_pic"];
const SEARCH_KEYS = [
  "imp_job_no", "exp_job_no", "job_no",
  "imp_booking_mbl", "exp_booking_mbl", "booking_mbl",
  "imp_hbl", "exp_hbl", "hbl",
  "imp_customer_ref", "exp_customer_ref", "customer_ref", "customer",
];

// คีย์วันที่ที่ให้เลือกเรียง (ตามที่มีจริงในโมดูล)
const SORT_DATE_KEYS = ["eta_imp", "etd_exp", "etd_imp", "clearance_date", "delivery_date", "billing_date", "created_at"];

function tempId() {
  return "J" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function ModuleBoard({ moduleKey }: { moduleKey: string }) {
  const mod = MODULE_BY_KEY[moduleKey];
  const { data, loading: dataLoading, error: dataError, reload } = useData();
  const { can } = useAuth();
  const lists = data?.lists || {};

  // สิทธิ์ของ tab นี้
  const mayAdd = can(moduleKey, "add");
  const mayEdit = can(moduleKey, "edit");
  const mayDelete = can(moduleKey, "del");
  const mayEnd = can(moduleKey, "end");

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

  // ตัวเลือกวันที่สำหรับเรียง (เฉพาะที่มีในโมดูลนี้)
  const sortFields = useMemo(
    () => SORT_DATE_KEYS.map((k) => mod.fields.find((f) => f.key === k)).filter(Boolean) as { key: string; label: string }[],
    [mod]
  );

  // ค่าตั้งค่าคอลัมน์ตอนย่อ (ส่วนกลาง) + default จาก schema
  // default = ชุดที่กำหนดไว้ใน collapseDefaults.ts (ถ้าโมดูลนั้นไม่ได้กำหนด → field ที่ mark summary)
  const defaultSummaryKeys = useMemo(() => {
    const keys = mod.fields.filter((f) => f.summary).map((f) => f.key);
    const preset = defaultCollapseKeys(moduleKey, keys);
    const exist = new Set(mod.fields.map((f) => f.key));
    return preset.filter((k) => exist.has(k)); // กัน key ที่ถูกลบ/เปลี่ยนชื่อไปแล้ว
  }, [mod, moduleKey]);
  // ค่าที่บันทึกไว้ใน _settings: map key เก่าที่เปลี่ยนชื่อไปแล้ว + ตัด key ที่ไม่มีใน schema
  // (ถ้าไม่ทำ คอลัมน์ที่เคยตั้งไว้ด้วยชื่อเดิม เช่น del_address จะหายจากโหมดย่อเงียบ ๆ)
  const savedCollapse = useMemo(
    () => normalizeCollapseKeys(moduleKey, data?.collapse?.[moduleKey], mod.fields.map((f) => f.key)),
    [data?.collapse, moduleKey, mod]
  );
  const collapsedKeys = savedCollapse.length ? savedCollapse : defaultSummaryKeys;

  // ===== มุมมองรวบกลุ่ม: Extra / Accounting = 1 บรรทัดต่อ 1 Job No. (กางแล้วแยกราย Type) =====
  const grouped = moduleKey === "extra" || moduleKey === "accounting";
  const fbk = useMemo(() => fieldByKey(mod), [mod]);
  const groupedDisplayFields = useMemo(() => {
    const visible = mod.fields.filter((f) => !f.hidden);
    if (collapsedKeys && collapsedKeys.length) {
      const set = new Set(collapsedKeys);
      const chosen = visible.filter((f) => set.has(f.key));
      if (chosen.length) return chosen;
    }
    const marked = visible.filter((f) => f.summary);
    return marked.length ? marked : visible.filter((f) => f.sticky);
  }, [mod, collapsedKeys]);

  // ช่องในแผงตอนกาง — ผูกกับ Job No. ชุดเดียว (แก้ทีเดียวเขียนลงทุกแถวของ Job นั้น)
  // ยกเว้นช่องของตาราง Sell / Job Cost ที่ยังแยกราย Type (hidden อยู่แล้ว)
  // Accounting: ช่องของตาราง AP / AR ก็แยกราย Type เหมือนกัน → ตัดออกจากแผงกันซ้ำ
  const panelFields = useMemo(() => {
    if (moduleKey !== "accounting") return mod.fields;
    const lineKeys = new Set<string>([ACC_LINE_LEAD, ...ACC_LINE_COLUMNS.ap, ...ACC_LINE_COLUMNS.ar]);
    return mod.fields.filter((f) => !lineKeys.has(f.key));
  }, [mod, moduleKey]);

  // ค่าที่ต้องแสดงเป็น "ของทั้ง Job" ในแผงเดียว — ยอดรวม + ค่าที่ต่างกันราย Type ให้รวมข้อความ
  const groupTotals = useCallback(
    (rs: JobRecord[]): Record<string, string> => {
      const sum = (k: string) => rs.reduce((a, r) => a + (parseFloat((r[k] || "0").replace(/,/g, "")) || 0), 0);
      const merge = (k: string) => {
        const seen: string[] = [];
        for (const r of rs) {
          const v = (r[k] || "").trim();
          if (v && !seen.includes(v)) seen.push(v);
        }
        return seen.join(" · ");
      };
      if (moduleKey === "extra") {
        const cost = sum("cost_baht");
        return {
          cost_total: String(cost),
          margin_total: String(sum("sell_baht") - cost),
          extra_req_type: merge("extra_req_type"),
          module: merge("module"),
          supplier: merge("supplier"),
        };
      }
      return {
        ap_total_cost: String(sum("ap_total_cost")),
        ar_total_sell: String(sum("ar_total_sell")),
        ap_extra_req_type: merge("ap_extra_req_type"),
        module: merge("module"),
        supplier: merge("supplier"),
      };
    },
    [moduleKey]
  );

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
  const [filters, setFilters] = useState<Filters>({ year: "", month: "", status: "", cs: "", q: "" });
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCfg, setShowCfg] = useState(false);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), err ? 4200 : 2600);
  }, []);

  // sync แถวจาก snapshot (โหลดครั้งแรก / หลัง reload) — ทิ้ง state แก้ไขที่ค้าง
  const resetFromData = useCallback(() => {
    setRows(data?.modules[moduleKey] || []);
    setDirty(new Set());
    setNews(new Set());
    setUnlocked(new Set());
  }, [data, moduleKey]);

  useEffect(() => {
    if (!data) return;
    resetFromData();
  }, [data, moduleKey, resetFromData]);

  useEffect(() => {
    if (dataError) flash("โหลดข้อมูลไม่สำเร็จ: " + dataError, true);
  }, [dataError, flash]);

  const onChange = useCallback((id: string, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.__id === id ? { ...r, [key]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  }, []);

  // ปลดล็อก/ล็อกทั้ง Job (มุมมองรวบกลุ่ม)
  const onUnlockGroup = useCallback((ids: string[]) => {
    setUnlocked((prev) => {
      const n = new Set(prev);
      const allOn = ids.every((id) => n.has(id));
      for (const id of ids) {
        if (allOn) n.delete(id);
        else n.add(id);
      }
      return n;
    });
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

  // ยกเลิกการแก้ไขทั้งหมด → กลับเป็นค่าจาก snapshot ล่าสุด
  const cancelAll = useCallback(() => {
    resetFromData();
    flash("ยกเลิกการแก้ไขแล้ว");
  }, [resetFromData, flash]);

  const saveAll = useCallback(async () => {
    if (dirty.size === 0) {
      flash("ไม่มีการแก้ไขที่ต้องบันทึก");
      return;
    }
    const newRecords = rows.filter((r) => news.has(r.__id));
    const updRecords = rows.filter((r) => dirty.has(r.__id) && !news.has(r.__id));

    // CS Import: Re-Export? ↔ Job Type ต้องสอดคล้องกัน (เตือนตั้งแต่ยังไม่ส่ง — ไม่บันทึกทั้งชุด)
    if (mod.id === "04_CS_Import") {
      for (const r of [...newRecords, ...updRecords]) {
        const msg = checkReExport(r);
        if (msg) {
          flash(`บันทึกไม่ได้ (${r.imp_job_no || "รายการใหม่"}): ${msg}`, true);
          return;
        }
      }
    }

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
  }, [dirty, news, rows, reload, flash, moduleKey, mod.id]);

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

  // ===== filter =====
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

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const out = rows.filter((r) => {
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
    // ===== sort ตามวันที่ที่เลือก =====
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const av = (a[sortKey] || "").trim();
        const bv = (b[sortKey] || "").trim();
        if (!av && !bv) return 0;
        if (!av) return 1; // ค่าว่างไปอยู่ท้ายเสมอ
        if (!bv) return -1;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }
    return out;
  }, [rows, filters, dateField, statusKey, csField, searchKeys, sortKey, sortDir]);

  // Export ที่มาจาก Re-Export = ถูกคุมด้วย CS Import (ซ่อนปุ่มลบ)
  // ยกเว้นแถวกำพร้า — งาน Import ที่อ้างถึงไม่มีอยู่แล้ว (เช่นแถวซ้ำที่ค้างจากของเดิม) → ให้ลบเองได้
  const impJobNos = useMemo(() => {
    const s = new Set<string>();
    for (const r of data?.modules?.["cs-import"] || []) {
      const j = (r.imp_job_no || "").trim();
      if (j) s.add(j);
    }
    return s;
  }, [data]);
  const hideDeleteFor = moduleKey === "cs-export"
    ? (r: JobRecord) => {
        if ((r.re_export || "") !== "Yes") return false;
        if (!impJobNos.size) return true; // ยังไม่มีข้อมูล Import ในมือ = ไม่เดา
        const jn = impJobNoFromReadout(r.data_from_import || "");
        return !jn || impJobNos.has(jn);
      }
    : undefined;

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
          <button className="btn" onClick={() => setShowCfg(true)} title="ตั้งค่าว่าตอนย่อจะแสดงคอลัมน์ไหนบ้าง (ใช้ร่วมกันทุกคน)">
            ⚙ ตั้งค่าย่อ
          </button>
        </div>

        {sortFields.length > 0 && (
          <div className="sort-box">
            <div className="field">
              <label>เรียงตามวันที่</label>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                <option value="">— ไม่เรียง —</option>
                {sortFields.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              disabled={!sortKey}
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              title="สลับลำดับ ก่อน↔หลัง"
            >
              {sortDir === "asc" ? "↑ เก่า→ใหม่" : "↓ ใหม่→เก่า"}
            </button>
          </div>
        )}

        <div className="actions">
          <button className="btn" onClick={reload} disabled={dataLoading}>
            รีเฟรช
          </button>
          {hasPull && mayEdit && (
            <button className="btn" onClick={refresh} disabled={dataLoading} title="ดึงข้อมูลเชื่อมข้ามโมดูลด้วย Job No.">
              ⟳ ดึงข้อมูลเชื่อม
            </button>
          )}
          {!csDriven && mayAdd && (
            <button className="btn" onClick={addRow}>
              ＋ เพิ่มงาน
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
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

      <div className="legend">
        <span className="item"><span className="sw" style={{ background: "var(--c-mandatory)", borderColor: "var(--c-mandatory-bd)" }} /> ฟ้า = ต้องกรอก</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-editable)", borderColor: "var(--c-editable-bd)" }} /> เหลือง = แก้ไขได้ (ต้องมี PIC)</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-locked)", borderColor: "var(--c-locked-bd)" }} /> เทา = Auto / ดึงจาก Module อื่น</span>
        {collapsed && (
          <span className="item hint">
            {grouped
              ? "รวบเป็น 1 บรรทัดต่อ 1 Job No. — กด ▸ เพื่อดู/แก้รายละเอียดแยกตาม Type"
              : "กด ▸ หน้าแถวเพื่อกางรายละเอียดที่เหลือ"}
          </span>
        )}
      </div>

      {dataLoading && !data ? (
        <CenterLoading />
      ) : (
        <div style={{ marginTop: 12 }}>
          {collapsed && grouped ? (
            <GroupedGrid
              displayFields={groupedDisplayFields}
              rows={filtered}
              moduleId={mod.id}
              carrierColors={data?.carrierColors}
              statusKey={statusKey}
              dirtyIds={dirty}
              unlockedIds={unlocked}
              canUnlock={mayEnd}
              onUnlockGroup={onUnlockGroup}
              renderDetail={(rs) => (
                <div className="group-detail">
                  {moduleKey === "extra" && (
                    <ExtraLinesTable
                      rows={rs}
                      fieldByKey={fbk}
                      lists={lists}
                      statusKey={statusKey}
                      picKey={mod.picKey}
                      unlockedIds={unlocked}
                      readOnly={!mayEdit}
                      onChange={onChange}
                    />
                  )}
                  {moduleKey === "accounting" && (
                    <AccountingLinesTable
                      rows={rs}
                      fieldByKey={fbk}
                      lists={lists}
                      statusKey={statusKey}
                      picKey={mod.picKey}
                      unlockedIds={unlocked}
                      readOnly={!mayEdit}
                      onChange={onChange}
                    />
                  )}
                  <div className="group-rec">
                    <div className="group-rec-title">
                      Job No. {rs[0].job_no || "—"}
                      <span className="mod-tag">{rs.length} Type</span>
                      <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                        แก้ที่นี่ครั้งเดียว มีผลกับทุก Type ของ Job นี้
                      </span>
                    </div>
                    <RecordPanel
                      moduleId={mod.id}
                      rec={rs[0]}
                      fields={panelFields}
                      lists={lists}
                      carrierColors={data?.carrierColors}
                      statusKey={statusKey}
                      picKey={mod.picKey}
                      unlocked={unlocked.has(rs[0].__id)}
                      readOnly={!mayEdit}
                      onChange={onChange}
                      applyToIds={rs.map((r) => r.__id)}
                      valueOverride={groupTotals(rs)}
                    />
                  </div>
                </div>
              )}
            />
          ) : (
          <JobGrid
            moduleId={mod.id}
            fields={mod.fields}
            groups={groups}
            rows={filtered}
            lists={lists}
            carrierColors={data?.carrierColors}
            dirtyIds={dirty}
            newIds={news}
            statusKey={statusKey}
            picKey={mod.picKey}
            unlockedIds={unlocked}
            collapsed={collapsed}
            collapsedKeys={collapsedKeys}
            hideDeleteFor={hideDeleteFor}
            readOnly={!mayEdit}
            canUnlock={mayEnd}
            onChange={onChange}
            onDelete={csDriven || !mayDelete ? undefined : removeRow}
            onUnlock={onUnlock}
          />
          )}
        </div>
      )}

      {mayEdit && <SaveBar count={dirty.size} onSave={saveAll} onCancel={cancelAll} saving={saving} label="งาน" />}
      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}

      {showCfg && (
        <CollapseSettings
          moduleLabel={mod.label}
          fields={mod.fields}
          defaultKeys={defaultSummaryKeys}
          currentKeys={savedCollapse}
          fullConfig={data?.collapse || {}}
          moduleKey={moduleKey}
          onClose={() => setShowCfg(false)}
          onSaved={reload}
        />
      )}
    </main>
  );
}
