"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell } from "@/components/Cell";
import { SavingOverlay } from "@/components/SavingOverlay";
import { Toast } from "@/components/Toast";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { MODULE_BY_KEY, recordHeaders } from "@/lib/schema";
import { RATE_FILTER_KEYS, RATE_SIGNER_KEY } from "@/lib/modules/rates";
import { JobRecord } from "@/lib/types";

function tempId() {
  return "R" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// ตารางเรท (Cost / Sell) ตามฟอร์ม PANEX CHECKER:
//   1) Add New List — ฟอร์มเพิ่มเรทใหม่
//   2) Search By Filter — กรอง Supplier / Customer / Service Type / Cargo Type / Port-Route / Job Type / Address
//   3) ตารางผลลัพธ์ — บันทึกแล้ว "แก้ไขไม่ได้" (เฉพาะ admin แก้/ลบได้)
export function RateBoard({ moduleKey, title }: { moduleKey: string; title: string }) {
  const mod = MODULE_BY_KEY[moduleKey];
  const { data, loading, reload } = useData();
  const { user, isAdmin, can } = useAuth();
  const lists = data?.lists || {};

  const signerKey = RATE_SIGNER_KEY[moduleKey];
  const signerLabel = mod.fields.find((f) => f.key === signerKey)?.label || "ผู้ตรวจ";
  const mayAdd = can("rates", "add");

  // ช่องที่กรอกเองได้ (ตัด auto ทั้งหมด — checked_by/quoted_by/updated_at ระบบเติมให้)
  const inputFields = useMemo(() => mod.fields.filter((f) => f.type !== "auto"), [mod]);
  const filterFields = useMemo(
    () => RATE_FILTER_KEYS.map((k) => mod.fields.find((f) => f.key === k)).filter(Boolean) as typeof mod.fields,
    [mod]
  );

  const emptyDraft = useCallback(() => {
    const r: Record<string, string> = {};
    for (const h of recordHeaders(mod)) r[h] = "";
    return r as JobRecord;
  }, [mod]);

  const [rows, setRows] = useState<JobRecord[]>([]);
  const [draft, setDraft] = useState<JobRecord>(emptyDraft);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<JobRecord | null>(null); // admin แก้แถวที่บันทึกแล้ว
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);

  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), err ? 4200 : 2600);
  }, []);

  useEffect(() => {
    setRows(data?.modules[moduleKey] || []);
    setEditing(null);
  }, [data, moduleKey]);

  const setDraftValue = (key: string, value: string) => setDraft((p) => ({ ...p, [key]: value }));
  const setEditValue = (key: string, value: string) =>
    setEditing((p) => (p ? { ...p, [key]: value } : p));

  // ----- เพิ่มเรทใหม่ -----
  const addRate = async () => {
    const missing = inputFields.filter((f) => f.mandatory && !(draft[f.key] || "").trim());
    if (missing.length) return flash("กรอกช่องบังคับก่อน: " + missing.map((f) => f.label).join(", "), true);
    if (!user) return flash("ต้องเข้าสู่ระบบก่อน", true);

    setSaving(true);
    try {
      const rec: JobRecord = { ...draft, __id: tempId(), [signerKey]: user.displayName };
      const r = await fetch(`/api/jobs?module=${moduleKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: [rec] }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setDraft(emptyDraft());
      await reload();
      flash("บันทึกเรทเรียบร้อย — แถวที่บันทึกแล้วแก้ไขไม่ได้");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  // ----- admin: แก้ไข / ลบแถวที่บันทึกแล้ว -----
  const saveEdit = async () => {
    if (!editing || !user) return;
    setSaving(true);
    try {
      const rec = { ...editing, [signerKey]: user.displayName };
      const r = await fetch(`/api/jobs?module=${moduleKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: [rec] }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setEditing(null);
      await reload();
      flash("แก้ไขเรทเรียบร้อย");
    } catch (e: any) {
      flash("แก้ไขไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const removeRate = async (id: string) => {
    if (!confirm("ยืนยันลบเรทนี้?")) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/jobs?module=${moduleKey}&id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await reload();
      flash("ลบเรียบร้อย");
    } catch (e: any) {
      flash("ลบไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  // ----- กรอง -----
  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => (v || "").trim());
    if (!active.length) return rows;
    return rows.filter((r) =>
      active.every(([k, v]) => (r[k] || "").toLowerCase().includes(v.trim().toLowerCase()))
    );
  }, [rows, filters]);

  const clearFilters = () => setFilters({});

  return (
    <section className="rate-section">
      <SavingOverlay show={saving} message="กำลังบันทึกเรท…" />

      <div className="rate-head">{title}</div>

      {/* ===== Add New List ===== */}
      {mayAdd && (
        <div className="rate-block">
          <div className="rate-block-title">Add New List</div>
          <div className="rate-form">
            {inputFields.map((f) => (
              <div className={"field" + (f.mandatory ? " req" : "")} key={f.key}>
                <label title={f.help || f.label}>
                  {f.label}
                  {f.mandatory && <span className="req-star"> *</span>}
                </label>
                <Cell
                  field={f}
                  value={draft[f.key] || ""}
                  options={f.list ? lists[f.list] || [] : []}
                  onChange={(v) => setDraftValue(f.key, v)}
                />
              </div>
            ))}
            <div className="field">
              <label>{signerLabel}</label>
              <div className="cellbox locked-ext" title="ล็อกตามบัญชีที่เข้าสู่ระบบ">
                {user?.displayName || "—"}
              </div>
            </div>
          </div>
          <div className="rate-form-actions">
            <span className="muted">
              ช่องที่มี <b style={{ color: "var(--danger)" }}>*</b> ต้องกรอก · บันทึกแล้ว <b>แก้ไขไม่ได้</b> — หากต้องการแก้ไขให้ติดต่อฝ่ายบัญชี
            </span>
            <button className="btn" onClick={() => setDraft(emptyDraft())}>ล้างฟอร์ม</button>
            <button className="btn primary" onClick={addRate} disabled={saving}>＋ เพิ่มเรท</button>
          </div>
        </div>
      )}

      {/* ===== Search By Filter ===== */}
      <div className="rate-block filter">
        <div className="rate-block-title">Search By Filter</div>
        <div className="rate-form">
          {filterFields.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              {f.type === "dropdown" && f.list ? (
                <select
                  value={filters[f.key] || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
                >
                  <option value="">— ทั้งหมด —</option>
                  {(lists[f.list] || []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={filters[f.key] || ""}
                  placeholder="พิมพ์เพื่อค้นหา…"
                  onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="rate-form-actions">
          <span className="count-pill">{filtered.length} / {rows.length} เรท</span>
          <button className="btn" onClick={clearFilters}>ล้างตัวกรอง</button>
        </div>
      </div>

      {/* ===== ผลลัพธ์ ===== */}
      <div className="grid-wrap">
        <table className="grid rate-grid">
          <thead>
            <tr className="field-row">
              <th className="rownum">#</th>
              {mod.fields.map((f) => (
                <th key={f.key} style={{ minWidth: f.width, width: f.width }} title={f.help || f.label}>
                  {f.label}
                </th>
              ))}
              {isAdmin && <th>จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec, i) => {
              const isEditing = editing?.__id === rec.__id;
              return (
                <tr key={rec.__id} className={isEditing ? "dirty" : ""}>
                  <td className="rownum">{i + 1}</td>
                  {mod.fields.map((f) => (
                    <td key={f.key} className={f.type === "auto" ? "tint-locked" : undefined}>
                      {isEditing && f.type !== "auto" ? (
                        <Cell
                          field={f}
                          value={editing[f.key] || ""}
                          options={f.list ? lists[f.list] || [] : []}
                          onChange={(v) => setEditValue(f.key, v)}
                        />
                      ) : (
                        <div className="cellbox" title={rec[f.key] || ""}>{rec[f.key] || "—"}</div>
                      )}
                    </td>
                  ))}
                  {isAdmin && (
                    <td>
                      <div className="row-actions">
                        {isEditing ? (
                          <>
                            <button className="btn sm primary" onClick={saveEdit}>บันทึก</button>
                            <button className="btn sm" onClick={() => setEditing(null)}>ยกเลิก</button>
                          </>
                        ) : (
                          <>
                            <button className="btn sm" onClick={() => setEditing({ ...rec })}>แก้ไข</button>
                            <button className="btn sm danger" onClick={() => removeRate(rec.__id)}>ลบ</button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={mod.fields.length + (isAdmin ? 2 : 1)} style={{ padding: 24, textAlign: "center", color: "#777" }}>
                  {loading ? "กำลังโหลด…" : rows.length ? "ไม่พบเรทตามตัวกรอง" : "ยังไม่มีเรท — เพิ่มที่กล่อง “Add New List”"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast text={toast.text} err={toast.err} onClose={() => setToast(null)} />}
    </section>
  );
}
