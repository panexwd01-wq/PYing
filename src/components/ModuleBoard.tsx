"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { JobGrid } from "@/components/JobGrid";
import { GroupedGrid } from "@/components/GroupedGrid";
import { RecordPanel } from "@/components/RecordPanel";
import { AccountingLinesTable, ExtraLinesTable } from "@/components/LinesTable";
import { FilterBar, Filters } from "@/components/FilterBar";
import { SavingOverlay } from "@/components/SavingOverlay";
import { SaveBar } from "@/components/SaveBar";
import { BulkEditBar } from "@/components/BulkEditBar";
import { Toast } from "@/components/Toast";
import { CenterLoading } from "@/components/Spinner";
import { ColumnSettings } from "@/components/ColumnSettings";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { LINK_CS, LINK_IMP, MODULE_BY_KEY, fieldByKey, moduleGroups, recordHeaders } from "@/lib/schema";
import { defaultCollapseKeys, normalizeCollapseKeys } from "@/lib/collapseDefaults";
import { ModulePrefs, applyColumnPrefs } from "@/lib/prefs";
import { ACC_LINE_COLUMNS, ACC_LINE_LEAD } from "@/lib/modules/accounting";
import { EXTRA_LINE_COLUMNS } from "@/lib/modules/extra";
import { checkReExport } from "@/lib/reExport";
import { deleteImpact } from "@/lib/stats";
import { CS_DRIVEN_KEYS } from "@/lib/xlsxSchema";
import { XlsxIO } from "@/components/XlsxIO";
import { JobRecord } from "@/lib/types";

const CS_KEYS = ["im_cs", "ex_cs", "cs_pic"];

// คีย์วันที่ที่ให้เลือกเรียง (ตามที่มีจริงในโมดูล)
const SORT_DATE_KEYS = ["eta_imp", "etd_exp", "etd_imp", "clearance_date", "delivery_date", "billing_date", "created_at"];

function tempId() {
  return "J" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function ModuleBoard({ moduleKey }: { moduleKey: string }) {
  const mod = MODULE_BY_KEY[moduleKey];
  const { data, loading: dataLoading, error: dataError, reload, apply, applyOrReload } = useData();
  const { can, canLists, user } = useAuth();
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), err ? 6000 : 2600); // error กลางจอ ให้เวลาอ่านนานขึ้น
  }, []);
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
  // ช่องวันที่หลัก — ยึด dateKey ของโมดูล (ขาเข้า ข้อ 14) ถ้าไม่ได้กำหนดค่อย fallback เป็นช่อง datetime ช่องแรก
  const dateField = useMemo(
    () => (mod.dateKey && mod.fields.find((f) => f.key === mod.dateKey)) || mod.fields.find((f) => f.type === "datetime"),
    [mod]
  );
  // ค้นหาได้ทุกช่องที่มองเห็นบนหน้าจอ (ยกเว้นช่องระบบ/รหัสเชื่อม)
  const searchKeys = useMemo(
    () => mod.fields.filter((f) => !f.internal).map((f) => f.key),
    [mod]
  );
  const hasPull = useMemo(() => mod.fields.some((f) => f.pull || f.rpull), [mod]);
  // 4 โมดูลนี้ผูกกับ CS: สร้าง/ลบอัตโนมัติเมื่อบันทึก CS Import/Export — ห้ามเพิ่ม/ลบเอง
  const csDriven = CS_DRIVEN_KEYS.includes(moduleKey);

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
  // ตั้งค่าคอลัมน์ของบัญชีนี้ (ลำดับ/ความกว้าง/คอลัมน์ตอนย่อ) — ทับค่าส่วนกลางถ้ามี
  const serverPrefs = data?.prefs?.[user?.id || ""]?.[moduleKey];
  const [localPrefs, setLocalPrefs] = useState<ModulePrefs | undefined>(undefined);
  useEffect(() => setLocalPrefs(undefined), [moduleKey, data]); // เปลี่ยน tab / โหลดใหม่ = ยึดของ server
  const myPrefs = localPrefs ?? serverPrefs;

  // ลำดับ + ความกว้างที่ผู้ใช้จัดไว้ (ใช้แทน mod.fields ทุกที่ที่วาดตาราง)
  const viewFields = useMemo(() => applyColumnPrefs(mod.fields, myPrefs), [mod, myPrefs]);

  const collapsedKeys = myPrefs?.collapse?.length
    ? myPrefs.collapse
    : savedCollapse.length
    ? savedCollapse
    : defaultSummaryKeys;

  // ลากขอบหัวคอลัมน์ → จำความกว้างไว้ให้บัญชีนี้
  const saveWidth = useCallback(
    (key: string, width: number) => {
      const base = myPrefs || {};
      const value: ModulePrefs = {
        order: base.order || [],
        widths: { ...(base.widths || {}), [key]: width },
        collapse: base.collapse || [],
      };
      setLocalPrefs(value);
      apply(null); // จำว่าเพิ่งเขียน → รีโหลดหน้าในช่วงนี้จะอ่านสด ไม่เจอค่าเก่าจาก cache
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: { module: moduleKey, value } }),
      }).catch(() => flash("จำความกว้างคอลัมน์ไม่สำเร็จ", true));
    },
    [myPrefs, moduleKey, flash, apply]
  );

  // ===== มุมมองรวบกลุ่ม: Extra / Accounting = 1 บรรทัดต่อ 1 Job No. (กางแล้วแยกราย Type) =====
  const grouped = moduleKey === "extra" || moduleKey === "accounting";
  const fbk = useMemo(() => fieldByKey(mod), [mod]);
  const groupedDisplayFields = useMemo(() => {
    const visible = viewFields.filter((f) => !f.hidden);
    if (collapsedKeys && collapsedKeys.length) {
      const set = new Set(collapsedKeys);
      const chosen = visible.filter((f) => set.has(f.key));
      if (chosen.length) return chosen;
    }
    const marked = visible.filter((f) => f.summary);
    return marked.length ? marked : visible.filter((f) => f.sticky);
  }, [viewFields, collapsedKeys]);

  // ช่องในแผงตอนกาง — ผูกกับ Job No. ชุดเดียว (แก้ทีเดียวเขียนลงทุกแถวของ Job นั้น)
  // ยกเว้นช่องของตาราง Sell / Job Cost ที่ยังแยกราย Type (hidden อยู่แล้ว)
  // Accounting: ช่องของตาราง AP / AR ก็แยกราย Type เหมือนกัน → ตัดออกจากแผงกันซ้ำ
  const panelFields = useMemo(() => {
    const lineKeys =
      moduleKey === "accounting"
        ? new Set<string>([ACC_LINE_LEAD, ...ACC_LINE_COLUMNS.ap, ...ACC_LINE_COLUMNS.ar])
        : moduleKey === "extra"
        ? new Set<string>([...EXTRA_LINE_COLUMNS.sell, ...EXTRA_LINE_COLUMNS.cost])
        : null;
    return lineKeys ? viewFields.filter((f) => !lineKeys.has(f.key)) : viewFields;
  }, [viewFields, moduleKey]);

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
        const cost = sum("cost_total_rate");
        return {
          cost_total: String(cost),
          margin_total: String(sum("sell_total_rate") - cost),
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
      for (const [k, v] of Object.entries(mod.newDefaults || {})) r[k] = v;
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
  const [collapsed, setCollapsed] = useState(true); // เริ่มที่โหมดย่อ
  const [filters, setFilters] = useState<Filters>({ year: "", month: "", status: "", cs: "", q: "" });
  const [sortKey, setSortKey] = useState(mod.dateKey || "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(mod.dateKey ? "desc" : "asc");
  const [showCfg, setShowCfg] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // แถวที่ติ๊กไว้ (แก้หลายแถวพร้อมกัน)

  // เปลี่ยนตัวกรอง/การเรียง/โมดูล = คนละชุดข้อมูล → ตารางเริ่มนับแถวที่วาดใหม่
  const windowKey = useMemo(
    () => [moduleKey, filters.year, filters.month, filters.status, filters.cs, filters.q, sortKey, sortDir].join("|"),
    [moduleKey, filters, sortKey, sortDir]
  );

  // sync แถวจาก snapshot (โหลดครั้งแรก / หลัง reload) — ทิ้ง state แก้ไขที่ค้าง
  const resetFromData = useCallback(() => {
    setRows(data?.modules[moduleKey] || []);
    setDirty(new Set());
    setNews(new Set());
    setUnlocked(new Set());
    setSelected(new Set());
  }, [data, moduleKey]);

  useEffect(() => {
    if (!data) return;
    resetFromData();
  }, [data, moduleKey, resetFromData]);

  // เปลี่ยน tab = กลับไปใช้การเรียงตั้งต้นของ tab นั้น (ใหม่→เก่า ตามช่องวันที่หลัก)
  useEffect(() => {
    setSortKey(mod.dateKey || "");
    setSortDir(mod.dateKey ? "desc" : "asc");
  }, [mod]);

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
      // เตือนก่อนลบ: บอกด้วยว่ามีอะไรถูกลบตามไปบ้าง (ปลายทาง/Extra/Accounting/งาน Export จาก Re-Export?)
      const rec = rows.find((r) => r.__id === id);
      const impact = data && rec ? deleteImpact(data, moduleKey, rec) : [];
      const msg = impact.length
        ? `ยืนยันลบงานนี้?\n\nรายการที่เชื่อมอยู่จะถูกลบไปด้วย:\n${impact.map((s) => `• ${s}`).join("\n")}\n\nกู้คืนไม่ได้`
        : "ยืนยันลบงานนี้?";
      if (!confirm(msg)) return;
      setSavingMsg("กำลังลบ…");
      setSaving(true);
      try {
        const res = await fetch(`/api/jobs?module=${moduleKey}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        await applyOrReload(j.snapshot); // API ส่งข้อมูลล่าสุดกลับมาแล้ว ไม่ต้องยิงอ่านซ้ำ
        flash("ลบเรียบร้อย");
      } catch (e: any) {
        flash("ลบไม่สำเร็จ: " + e.message, true);
      } finally {
        setSaving(false);
      }
    },
    [news, flash, moduleKey, applyOrReload, rows, data, mod.manualDelete]
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
      let snap: unknown = null;
      if (newRecords.length) {
        // มีทั้งเพิ่มและแก้ → ก้อนแรกไม่ต้องสร้าง snapshot (ใช้ของก้อนสุดท้ายก้อนเดียว)
        const res = await fetch(
          `/api/jobs?module=${moduleKey}${updRecords.length ? "&snapshot=0" : ""}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ records: newRecords }),
          }
        );
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        snap = j.snapshot;
      }
      if (updRecords.length) {
        const res = await fetch(`/api/jobs?module=${moduleKey}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: updRecords }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        snap = j.snapshot;
      }
      await applyOrReload(snap);
      flash("บันทึกเรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  }, [dirty, news, rows, applyOrReload, flash, moduleKey, mod.id]);

  const refresh = useCallback(async () => {
    setSavingMsg("กำลังดึงข้อมูลจาก CS…");
    setSaving(true);
    try {
      const res = await fetch(`/api/refresh?module=${moduleKey}`, { method: "POST" });
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      await applyOrReload(j.snapshot);
      flash(j.message || "ดึงข้อมูลเรียบร้อย");
    } catch (e: any) {
      flash("ดึงข้อมูลไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  }, [moduleKey, applyOrReload, flash]);

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

  // รวมทุกช่องของแถวเป็นข้อความก้อนเดียวไว้ล่วงหน้า — พิมพ์ค้นหาแล้วไม่ต้องไล่ทีละช่องใหม่ทุกตัวอักษร
  const haystacks = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.__id, searchKeys.map((k) => r[k] || "").join(" ").toLowerCase());
    return m;
  }, [rows, searchKeys]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const out = rows.filter((r) => {
      const d = (dateField ? r[dateField.key] : "") || "";
      if (dateField && filters.year && d.slice(0, 4) !== filters.year) return false;
      if (dateField && filters.month && d.slice(5, 7) !== filters.month) return false;
      if (filters.status && r[statusKey] !== filters.status) return false;
      if (csField && filters.cs && r[csField.key] !== filters.cs) return false;
      if (q && !(haystacks.get(r.__id) || "").includes(q)) return false;
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
  }, [rows, filters, dateField, statusKey, csField, haystacks, sortKey, sortDir]);

  // ค่าที่ซ้ำกันในช่องที่ห้ามซ้ำ (ขาออก ข้อ 1: เลข Booking ซ้ำ = ไฮไลต์แดง)
  const dupValues = useMemo(() => {
    if (!mod.dupKey) return undefined;
    const seen = new Map<string, number>();
    for (const r of rows) {
      const v = (r[mod.dupKey] || "").trim().toUpperCase();
      if (v) seen.set(v, (seen.get(v) || 0) + 1);
    }
    return new Set(Array.from(seen.entries()).filter(([, n]) => n > 1).map(([v]) => v));
  }, [rows, mod.dupKey]);
  const dupCount = useMemo(
    () => (dupValues?.size ? rows.filter((r) => dupValues.has((r[mod.dupKey!] || "").trim().toUpperCase())).length : 0),
    [rows, dupValues, mod.dupKey]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // แก้ค่าเดียวกันให้ทุกแถวที่เลือก (ยังไม่เขียนลงชีท — รอกดบันทึก)
  const applyBulk = useCallback(
    (key: string, value: string) => {
      const ids = selected;
      if (!ids.size) return;
      setRows((prev) => prev.map((r) => (ids.has(r.__id) ? { ...r, [key]: value } : r)));
      setDirty((prev) => {
        const n = new Set(prev);
        for (const id of ids) n.add(id);
        return n;
      });
      flash(`ใส่ค่าให้ ${ids.size} แถวแล้ว — กดบันทึกเพื่อยืนยัน`);
    },
    [selected, flash]
  );

  // id ของแถวที่ตัวกรองเหลืออยู่ — ใช้ตอน Export เฉพาะที่กรองไว้ และตอนเลือกทั้งหมดเพื่อแก้ทีเดียว
  const filteredIds = useMemo(() => filtered.map((r) => r.__id), [filtered]);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const allOn = filteredIds.length > 0 && filteredIds.every((id) => prev.has(id));
      return allOn ? new Set() : new Set(filteredIds);
    });
  }, [filteredIds]);

  // Export ที่มาจาก Re-Export = ถูกคุมด้วย CS Import (ซ่อนปุ่มลบ)
  // ยกเว้นแถวกำพร้า — งาน Import ที่อ้างถึงไม่มีอยู่แล้ว (เช่นแถวซ้ำที่ค้างจากของเดิม) → ให้ลบเองได้
  const impIds = useMemo(
    () => new Set((data?.modules?.["cs-import"] || []).map((r) => r.__id)),
    [data]
  );
  const hideDeleteFor = moduleKey === "cs-export"
    ? (r: JobRecord) => {
        if ((r.re_export || "") !== "Yes") return false;
        if (!impIds.size) return true; // ยังไม่มีข้อมูล Import ในมือ = ไม่เดา
        const imp = (r[LINK_IMP] || "").trim();
        return !imp || impIds.has(imp);
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
          <button className="btn" onClick={() => setShowCfg(true)} title="เลือกคอลัมน์ตอนย่อ + จัดลำดับหน้า/หลัง (จำไว้เฉพาะบัญชีนี้)">
            ⚙ ตั้งค่าคอลัมน์
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
          <button className="btn" onClick={() => reload(true)} disabled={dataLoading}>
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
          <XlsxIO
            moduleKey={moduleKey}
            moduleLabel={mod.label}
            canImport={mayEdit}
            onDone={applyOrReload}
            flash={flash}
            filteredIds={filteredIds}
            totalCount={rows.length}
          />
        </div>
      </div>

      <div className="toolbar" style={{ paddingTop: 0 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          ⬇ Export = โหลดข้อมูล tab นี้เป็น Excel · ⬆ Import = แก้ในไฟล์แล้วโยนไฟล์กลับมาวางบนหน้านี้ได้เลย
          (แถวที่ Job No. ตรงกัน = อัปเดตทับ{csDriven ? " · tab นี้เพิ่มงานใหม่จากไฟล์ไม่ได้" : ""})
        </span>
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
          dateLabel={dateField?.label}
        />
        <span className="count-pill">{filtered.length} / {rows.length} รายการ</span>
      </div>

      <div className="legend">
        <span className="item"><span className="sw" style={{ background: "var(--c-mandatory)", borderColor: "var(--c-mandatory-bd)" }} /> ฟ้า = ต้องกรอก</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-editable)", borderColor: "var(--c-editable-bd)" }} /> เหลือง = แก้ไขได้ (ต้องมี PIC)</span>
        <span className="item"><span className="sw" style={{ background: "var(--c-locked)", borderColor: "var(--c-locked-bd)" }} /> เทา = Auto / ดึงจาก Module อื่น</span>
        {dupCount > 0 && (
          <span className="item"><span className="sw" style={{ background: "#ff8f8f", borderColor: "#e06060" }} /> แดง = {fbk[mod.dupKey!]?.label || "เลข"} ซ้ำ ({dupCount} แถว)</span>
        )}
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
              groupKey={LINK_CS}
              displayFields={groupedDisplayFields}
              rows={filtered}
              windowKey={windowKey}
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
                      onDelete={mayDelete ? removeRow : undefined}
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
                      onDelete={mayDelete ? removeRow : undefined}
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
                      palette={data?.palette}
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
            fields={viewFields}
            rows={filtered}
            windowKey={windowKey}
            lists={lists}
            carrierColors={data?.carrierColors}
            palette={data?.palette}
            dirtyIds={dirty}
            newIds={news}
            statusKey={statusKey}
            picKey={mod.picKey}
            unlockedIds={unlocked}
            collapsed={collapsed}
            collapsedKeys={collapsedKeys}
            dupKey={mod.dupKey}
            dupValues={dupValues}
            onResizeColumn={saveWidth}
            selectedIds={selected}
            onToggleSelect={mayEdit ? toggleSelect : undefined}
            onToggleSelectAll={toggleSelectAll}
            hideDeleteFor={hideDeleteFor}
            readOnly={!mayEdit}
            canUnlock={mayEnd}
            onChange={onChange}
            onDelete={(csDriven && !mod.manualDelete) || !mayDelete ? undefined : removeRow}
            onUnlock={onUnlock}
          />
          )}
        </div>
      )}

      {mayEdit && selected.size > 0 && (
        <BulkEditBar
          fields={viewFields}
          lists={lists}
          count={selected.size}
          onApply={applyBulk}
          onClear={() => setSelected(new Set())}
        />
      )}
      {mayEdit && <SaveBar count={dirty.size} onSave={saveAll} onCancel={cancelAll} saving={saving} label="งาน" />}
      {toast && <Toast text={toast.text} err={toast.err} onClose={() => setToast(null)} />}

      {showCfg && (
        <ColumnSettings
          moduleLabel={mod.label}
          moduleKey={moduleKey}
          fields={viewFields}
          defaultKeys={defaultSummaryKeys}
          sharedKeys={savedCollapse}
          fullConfig={data?.collapse || {}}
          prefs={myPrefs}
          canSetShared={canLists()}
          onClose={() => setShowCfg(false)}
          onSavedPrefs={(v) => {
            setLocalPrefs(v);
            apply(null); // จำว่าเพิ่งเขียน (API นี้ไม่แนบ snapshot กลับมา)
          }}
          onSavedShared={applyOrReload}
        />
      )}
    </main>
  );
}
