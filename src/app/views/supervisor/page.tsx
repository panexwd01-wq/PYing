"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { supervisorDash, MONTHS_TH, yearsInData } from "@/lib/stats";

export default function SupervisorView() {
  const { data, loading, error, reload } = useData();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const years = useMemo(() => (data ? yearsInData(data) : [year]), [data, year]);
  const s = useMemo(() => (data ? supervisorDash(data, year, month) : null), [data, year, month]);

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Supervisor — Daily Operation Control Tower</h2>
          <div className="field"><label>ปี</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field"><label>เดือน</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS_TH.map((m, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={reload}>ลองใหม่</button></p>}
      </div>

      {s && (
        <>
          <h3 style={{ margin: "6px 4px" }}>Exception Dashboard</h3>
          <div className="lists-grid">
            {s.exceptions.map((e, i) => (
              <div key={i} className={"list-card" + (e.count > 0 ? " exc-hot" : "")}>
                <h3>{e.label}</h3>
                <div className="dash-total">{e.count}</div>
                <div className="muted" style={{ fontSize: 12 }}>{e.hint}</div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Team Workload</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Team</th><th>งานเดือนนี้</th><th>Active</th><th>End วันนี้</th><th>End เดือนนี้</th></tr></thead>
              <tbody>
                {s.team.map((t, i) => (
                  <tr key={i}><td>{t.team}</td><td>{t.total}</td><td>{t.active}</td><td>{t.endToday}</td><td>{t.endMonth}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Staff KPI (ตาม PIC)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>PIC</th><th>Total</th><th>Active</th><th>End</th><th>Delay (&gt;7 วัน)</th><th>Internal Error</th></tr></thead>
              <tbody>
                {s.staff.map((t, i) => (
                  <tr key={i}><td>{t.pic}</td><td>{t.total}</td><td>{t.active}</td><td>{t.end}</td><td>{t.delay}</td><td>{t.error}</td></tr>
                ))}
                {s.staff.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#777" }}>ยังไม่มีข้อมูล PIC</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>No Charge / Internal Error Detail</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Job No</th><th>Team</th><th>PIC</th><th>Extra Type</th><th>Lost Amount</th><th>Reason</th><th>Remark</th></tr></thead>
              <tbody>
                {s.noChargeList.map((n, i) => (
                  <tr key={i}><td>{n.jobNo || "—"}</td><td>{n.team}</td><td>{n.pic}</td><td>{n.type}</td><td>{n.lost.toLocaleString()}</td><td>{n.reason}</td><td>{n.remark}</td></tr>
                ))}
                {s.noChargeList.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#777" }}>ไม่มีรายการ No Charge</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
