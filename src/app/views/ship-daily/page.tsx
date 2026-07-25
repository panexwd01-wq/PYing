"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { PrintButton } from "@/components/PrintButton";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RequireTab } from "@/components/RequireTab";
import { JobRecord } from "@/lib/types";

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
  const { data, loading, error, reload } = useData();
  const lists = data?.lists || {};
  const [date, setDate] = useState("");
  const [jobType, setJobType] = useState("");
  const [place, setPlace] = useState(lists.place?.[0] || "LCB");

  // ดึงข้อมูล CS (จำนวนตู้ 20GP/40HQ) ตาม Job No.
  const csByJob = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    for (const key of ["cs-import", "cs-export"]) {
      for (const r of data?.modules[key] || []) {
        const j = (r.imp_job_no || r.exp_job_no || "").trim();
        if (j) m.set(j, r);
      }
    }
    return m;
  }, [data]);

  // จำนวนซัพขนส่งต่อ Job (จาก 07_Transportation)
  const transConts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data?.modules["transport"] || []) {
      const j = (r.job_no || "").trim();
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

  const contQty = (job: string) => {
    const cs = csByJob.get(job);
    return cs ? num(cs.cnt_20gp) + num(cs.cnt_40hq) : 0;
  };

  const cols: Col[] = useMemo(
    () => [
      { key: "booking_mbl", label: "Booking / MBL", value: (r) => r.booking_mbl || "—" },
      { key: "customer", label: "Customer", value: (r) => r.customer || "—" },
      { key: "customer_ref", label: "Cust Ref", value: (r) => r.customer_ref || "—" },
      { key: "conts", label: "20GP/40HC ตู้", center: true, value: (r) => String(contQty((r.job_no || "").trim()) || "") },
      { key: "delivery_date", label: "Delivery Date", value: (r) => r.delivery_date || "—" },
      { key: "ship_pic", label: "Ship PIC", value: (r) => r.ship_pic || "—" },
      { key: "trans_conts", label: "Trans Conts", center: true, value: (r) => String(transConts.get((r.job_no || "").trim()) ?? "") },
      { key: "cs_note_ship", label: "Cs Note", wide: true, value: (r) => r.cs_note_ship || "" },
      { key: "entry_remark", label: "Entry Remark", wide: true, value: (r) => r.entry_remark || "" },
      { key: "extra_req_type", label: "Extra / Service Req", wide: true, value: (r) => r.extra_req_type || "" },
      { key: "end", label: "End", chk: true, center: true, value: () => BOX },
      { key: "red", label: "Red", chk: true, center: true, value: () => BOX },
      { key: "xray", label: "X-ray", chk: true, center: true, value: () => BOX },
      { key: "pending", label: "Pending", chk: true, center: true, value: () => BOX },
      { key: "ot_req", label: "OT Req", chk: true, center: true, value: () => BOX },
      { key: "ot_lost", label: "OT Receipt Lost", chk: true, center: true, value: () => BOX },
      { key: "reason", label: "Reason / Pending Remark", wide: true, value: () => "" },
    ],
    [csByJob, transConts] // eslint-disable-line react-hooks/exhaustive-deps
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
          <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={reload}>ลองใหม่</button></p>
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
                  {cols.map((c) => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.__id}>
                    <td>{i + 1}</td>
                    {cols.map((c) => (
                      <td key={c.key} className={c.chk ? "chk" : undefined} style={c.center ? { textAlign: "center" } : undefined}>
                        {c.value(r)}
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
            {rows.map((r, i) => (
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
    </main>
  );
}
