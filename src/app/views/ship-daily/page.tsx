"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { PrintButton } from "@/components/PrintButton";
import { DateTimePicker } from "@/components/DateTimePicker";

const chk = (v: string) => (["Yes", "True", "1", "Lost", "Received"].includes((v || "").trim()) ? "☑" : "☐");

export default function ShipDailyView() {
  const { data, loading, error, reload } = useData();
  const lists = data?.lists || {};
  const [date, setDate] = useState("");
  const [jobType, setJobType] = useState("");
  const [place, setPlace] = useState(lists.place?.[0] || "LCB");

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

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

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
          <p className="muted">ตรวจปล่อยที่ <b>{place}</b>{date ? ` วันที่ ${date}` : ""} · {rows.length} รายการ (งานที่ยังไม่ End)</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="view-table">
            <thead>
              <tr className="field-row">
                <th>No.</th><th>Booking/MBL</th><th>Customer</th><th>Cust Ref</th><th>Delivery Date</th>
                <th>Ship PIC</th><th>Trans Conts</th><th>Cs Note</th><th>Entry Remark</th><th>Extra Type</th>
                <th>Clearance</th><th>Forgot OT</th><th>OT Req</th><th>OT Lost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.__id}>
                  <td>{i + 1}</td>
                  <td>{r.booking_mbl || "—"}</td>
                  <td>{r.customer || "—"}</td>
                  <td>{r.customer_ref || "—"}</td>
                  <td>{r.delivery_date || "—"}</td>
                  <td>{r.ship_pic || "—"}</td>
                  <td>{transConts.get((r.job_no || "").trim()) ?? ""}</td>
                  <td>{r.cs_note_ship || ""}</td>
                  <td>{r.entry_remark || ""}</td>
                  <td>{r.extra_req_type || ""}</td>
                  <td>{r.clearance_status || ""}</td>
                  <td style={{ textAlign: "center" }}>{chk(r.forgot_ot)}</td>
                  <td style={{ textAlign: "center" }}>{chk(r.ot_requested)}</td>
                  <td style={{ textAlign: "center" }}>{chk(r.ot_receipt_lost)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={14} style={{ padding: 26, textAlign: "center", color: "#777" }}>ไม่มีงานตรวจปล่อยตามเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
