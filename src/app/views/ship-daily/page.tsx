"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { useAuth } from "@/components/AuthProvider";
import { CenterLoading } from "@/components/Spinner";
import { PrintButton } from "@/components/PrintButton";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RequireTab } from "@/components/RequireTab";
import { SortMark, useTableSort } from "@/components/SortTh";
import { Toast } from "@/components/Toast";
import { JobRecord } from "@/lib/types";
import { contBySize } from "@/lib/containers";
import { LINK_CS } from "@/lib/fields";
import { cellCue } from "@/lib/cellRules";

// ช่อง Reason / Pending Remark = Clearance Pending Reason ของ 06_Shipping
const REASON_KEY = "clearance_pending_reason";

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};
// กล่องติ๊กเปล่าสำหรับปริ้นไปติ๊กมือหน้างาน
const BOX = "☐";

// นิยามคอลัมน์ที่เดียว — ใช้ทั้งตารางบนจอ และบล็อกตอนพิมพ์ (ที่ตัดขึ้นบรรทัดใหม่ได้)
interface Col {
  key: string;
  label: string;
  value: (r: JobRecord) => string;
  chk?: boolean; // ช่องติ๊กมือ
  wide?: boolean; // กินพื้นที่ 2 ช่องตอนพิมพ์ (ข้อความยาว)
  center?: boolean;
}

export default function ShipDailyPage() {
  return (
    <RequireTab tab="ship-daily">
      <ShipDailyView />
    </RequireTab>
  );
}

function ShipDailyView() {
  const { data, loading, error, reload, applyOrReload } = useData();
  const { can } = useAuth();
  const [savingId, setSavingId] = useState("");
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const flash = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), err ? 4200 : 2200);
  }, []);
  const lists = data?.lists || {};
  const [date, setDate] = useState("");
  const [jobType, setJobType] = useState("");
  const [place, setPlace] = useState(lists.place?.[0] || "LCB");

  // ดึงข้อมูล CS (จำนวนตู้ 20GP/40HQ) ตามรหัสเชื่อม (__id ของงาน CS)
  const csById = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    for (const key of ["cs-import", "cs-export"])
      for (const r of data?.modules[key] || []) m.set(r.__id, r);
    return m;
  }, [data]);

  // จำนวนซัพขนส่งต่อ Job (จาก 07_Transportation)
  const transConts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data?.modules["transport"] || []) {
      const j = (r[LINK_CS] || "").trim();
      if (!j) continue;
      m.set(j, [r.supp1, r.supp2, r.supp3].filter((x) => (x || "").trim()).length);
    }
    return m;
  }, [data]);

  const rows = useMemo(() => {
    const all = (data?.modules["shipping"] || []).filter((r) => (r.shipp_status || "") !== "End");
    return all.filter((r) => {
      if (date && !(r.clearance_date || "").startsWith(date)) return false;
      if (jobType && r.job_type !== jobType) return false;
      return true;
    });
  }, [data, date, jobType]);

  const contQty = (csId: string) => {
    const cs = csById.get(csId);
    if (!cs) return 0;
    const { c20, c40 } = contBySize(cs);
    return c20 + c40;
  };

  const cols: Col[] = useMemo(
    () => [
      { key: "booking_mbl", label: "Booking / MBL", value: (r) => r.booking_mbl || "—" },
      { key: "customer", label: "Customer", value: (r) => r.customer || "—" },
      { key: "customer_ref", label: "Cust Ref", value: (r) => r.customer_ref || "—" },
      { key: "conts", label: "20GP/40HC ตู้", center: true, value: (r) => String(contQty((r[LINK_CS] || "").trim()) || "") },
      { key: "delivery_date", label: "Delivery Date", value: (r) => r.delivery_date || "—" },
      { key: "ship_pic", label: "Ship PIC", value: (r) => r.ship_pic || "—" },
      { key: "trans_conts", label: "Trans Conts", center: true, value: (r) => String(transConts.get((r[LINK_CS] || "").trim()) ?? "") },
      { key: "cs_note_ship", label: "Cs Note", wide: true, value: (r) => r.cs_note_ship || "" },
      { key: "entry_remark", label: "Entry Remark", wide: true, value: (r) => r.entry_remark || "" },
      { key: "extra_req_type", label: "Extra / Service Req", wide: true, value: (r) => r.extra_req_type || "" },
      { key: "end", label: "End", chk: true, center: true, value: () => BOX },
      { key: "red", label: "Red", chk: true, center: true, value: () => BOX },
      { key: "xray", label: "X-ray", chk: true, center: true, value: () => BOX },
      { key: "pending", label: "Pending", chk: true, center: true, value: () => BOX },
      { key: "ot_req", label: "OT Req", chk: true, center: true, value: () => BOX },
      { key: "ot_lost", label: "OT Receipt Lost", chk: true, center: true, value: () => BOX },
      // = Clearance Pending Reason ของ tab Shipping (ช่องเดียวกัน แก้ที่นี่หรือที่ Shipping ก็ได้)
      { key: REASON_KEY, label: "Reason / Pending Remark", wide: true, value: (r) => r[REASON_KEY] || "" },
    ],
    [csById, transConts] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // คลิกหัวคอลัมน์เพื่อเรียง — ใช้ค่าเดียวกับที่แสดง ("—" = ว่าง ไปท้ายเสมอ) · ตอนพิมพ์ก็ออกตามลำดับนี้
  const sortVal = useCallback(
    (r: JobRecord, key: string) => {
      const v = cols.find((c) => c.key === key)?.value(r) ?? "";
      return v === "—" ? "" : v;
    },
    [cols]
  );
  const { sorted, th, dirOf } = useTableSort(rows, sortVal);
  // ช่องติ๊กมือ ไม่มีอะไรให้เรียง
  const sortable = (c: Col) => !c.chk;

  // บันทึก Reason กลับไปที่ tab Shipping — ส่งแค่ช่องเดียว (server merge กับค่าเดิมให้เอง)
  const canEdit = can("shipping", "edit");
  const saveReason = useCallback(
    async (id: string, value: string) => {
      setSavingId(id);
      try {
        const res = await fetch("/api/jobs?module=shipping", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: [{ __id: id, [REASON_KEY]: value }] }),
        });
        const j = await res.json();
        if (j.error) throw new Error(j.error);
        await applyOrReload(j.snapshot);
        flash("บันทึก Reason เรียบร้อย");
        return true;
      } catch (e) {
        flash("บันทึกไม่สำเร็จ: " + (e as Error).message, true);
        return false;
      } finally {
        setSavingId("");
      }
    },
    [applyOrReload, flash]
  );

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  const header = (
    <>
      ตรวจปล่อยที่ <b>{place}</b>
      {date ? ` วันที่ ${date}` : ""} · {rows.length} รายการ
    </>
  );

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Ship Daily Print Check — ใบตรวจปล่อยประจำวัน</h2>
          <PrintButton />
        </div>
        <div className="toolbar no-print" style={{ marginTop: 8 }}>
          <div className="field"><label>วันที่ตรวจปล่อย</label>
            <DateTimePicker value={date} onChange={setDate} dateOnly />
          </div>
          <div className="field"><label>สถานที่ตรวจ (Place)</label>
            <select value={place} onChange={(e) => setPlace(e.target.value)}>
              {(lists.place || ["LCB"]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field"><label>ประเภทงาน</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {(lists.job_type || []).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {error ? (
          <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={() => reload(true)}>ลองใหม่</button></p>
        ) : (
          <p className="muted">{header} (งานที่ยังไม่ End + งาน Pending เก่า)</p>
        )}
      </div>

      {!error && (
        <>
          {/* ----- บนจอ: ตารางเลื่อนแนวนอนตามปกติ ----- */}
          <div className="grid-wrap screen-only">
            <table className="view-table ship-daily">
              <thead>
                <tr className="field-row">
                  <th>No.</th>
                  {cols.map((c) =>
                    sortable(c) ? (
                      <th key={c.key} {...th(c.key)}>{c.label} <SortMark dir={dirOf(c.key)} /></th>
                    ) : (
                      <th key={c.key}>{c.label}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.__id}>
                    <td>{i + 1}</td>
                    {cols.map((c) => (
                      <td key={c.key} className={c.chk ? "chk" : undefined} style={c.center ? { textAlign: "center" } : undefined}>
                        {c.key === REASON_KEY ? (
                          <ReasonCell
                            rec={r}
                            canEdit={canEdit}
                            saving={savingId === r.__id}
                            onSave={saveReason}
                          />
                        ) : (
                          c.value(r)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={cols.length + 1} style={{ padding: 26, textAlign: "center", color: "#777" }}>ไม่มีงานตรวจปล่อยตามเงื่อนไข</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ----- ตอนพิมพ์: 1 รายการ = 1 บล็อก คอลัมน์ที่เกินหน้ากระดาษไหลลงบรรทัดถัดไปของรายการเดิม ----- */}
          <div className="print-only pd-sheet">
            <div className="pd-head">
              <b>Ship Daily Print Check — ใบตรวจปล่อยประจำวัน</b>
              <span>{header}</span>
            </div>
            {sorted.map((r, i) => (
              <div className="pd-rec" key={r.__id}>
                <div className="pd-no">{i + 1}</div>
                <div className="pd-fields">
                  {cols.map((c) => (
                    <div className={"pd-cell" + (c.wide ? " wide" : "") + (c.chk ? " chk" : "")} key={c.key}>
                      <span className="k">{c.label}</span>
                      <span className="v">{c.value(r) || " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {rows.length === 0 && <div className="pd-empty">ไม่มีงานตรวจปล่อยตามเงื่อนไข</div>}
          </div>
        </>
      )}

      {toast && <Toast text={toast.text} err={toast.err} onClose={() => setToast(null)} />}
    </main>
  );
}

// ช่อง Reason แก้ได้ในตาราง — พิมพ์แล้วกด Enter หรือคลิกออก = บันทึก · Esc = ยกเลิก
// ล็อกตามกฎเดียวกับ tab Shipping (ต้องมี Entry PIC + Ship PIC ก่อน) และต้องมีสิทธิ์แก้ไข Shipping
function ReasonCell({
  rec,
  canEdit,
  saving,
  onSave,
}: {
  rec: JobRecord;
  canEdit: boolean;
  saving: boolean;
  onSave: (id: string, value: string) => Promise<boolean>;
}) {
  const saved = rec[REASON_KEY] || "";
  const [draft, setDraft] = useState(saved);
  // ค่าที่บันทึกเปลี่ยนจากที่อื่น (tab Shipping / รีเฟรช) → ตามค่าใหม่
  useEffect(() => setDraft(saved), [saved]);

  const cue = cellCue("06_Shipping", REASON_KEY, rec);
  if (!canEdit || cue.locked) {
    return (
      <span title={!canEdit ? "ไม่มีสิทธิ์แก้ไข tab Shipping" : cue.hint}>
        {saved || <span className="muted">—</span>}
      </span>
    );
  }

  const commit = async () => {
    const v = draft.trim();
    if (v === saved.trim()) return;
    if (!(await onSave(rec.__id, v))) setDraft(saved);
  };

  return (
    <input
      className="sd-reason"
      value={draft}
      disabled={saving}
      placeholder="พิมพ์เหตุผล…"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(saved);
          // รอ state กลับเป็นค่าเดิมก่อน blur จะได้ไม่บันทึก
          const el = e.currentTarget;
          setTimeout(() => el.blur());
        }
      }}
    />
  );
}
