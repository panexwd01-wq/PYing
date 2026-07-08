"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { managementDash, MONTHS_TH, yearsInData, SupplierStat } from "@/lib/stats";

function KPI({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="list-card">
      <h3>{label}</h3>
      <div className="dash-total">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function SuppCard({ title, rows, metric }: { title: string; rows: SupplierStat[]; metric: "onTime" | "delay" }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      {rows.length === 0 && <div className="muted">—</div>}
      {rows.map((r, i) => (
        <div key={i} className="item-row" style={{ justifyContent: "space-between" }}>
          <span>{r.name}</span>
          <b>{r.jobs} job · {r.conts} ตู้ · {metric === "onTime" ? `On-Time ${r.onTimePct}%` : `Delay ${r.delay} (${r.delayPct}%)`}</b>
        </div>
      ))}
    </div>
  );
}

export default function ManagementView() {
  const { data, loading, error, reload } = useData();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const years = useMemo(() => (data ? yearsInData(data) : [year]), [data, year]);
  const s = useMemo(() => (data ? managementDash(data, year, month) : null), [data, year, month]);

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Management View — รายงานประจำเดือน</h2>
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
          <h3 style={{ margin: "6px 4px" }}>Job Summary (เดือนที่เลือก)</h3>
          <div className="lists-grid">
            <KPI label="Finished Jobs" value={s.finished} sub={`Import ${s.impFinished} · Export ${s.expFinished} · เดือนก่อน ${s.lastFinished}`} />
            <KPI label="Finished Containers" value={s.finishedConts} sub={`เดือนก่อน ${s.lastFinishedConts}`} />
            <KPI label="Active Jobs" value={s.active} />
            <KPI label="Pending Jobs" value={s.pending} />
            <KPI label="Completion Rate" value={s.completion + "%"} />
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Accounting Pipeline</h3>
          <div className="lists-grid">
            <KPI label="Accounting Received" value={s.accReceived} />
            <KPI label="Invoice Issued" value={s.invoiceIssued} />
            <KPI label="Pending Invoice" value={s.pendingInvoice} />
            <KPI label="Payment Confirmed" value={s.paid} />
            <KPI label="Pending Collection" value={s.pendingCollection} />
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Service / Internal Error (รวม)</h3>
          <div className="lists-grid">
            <KPI label="Extra Service Cases" value={s.extraCases} />
            <KPI label="No Charge Cases" value={s.noChargeCases} />
            <KPI label="Total Lost Amount" value={s.lostAmount.toLocaleString()} />
            <KPI label="Internal Error Cases" value={s.internalErrCases} />
          </div>

          <div className="lists-grid" style={{ marginTop: 14 }}>
            <div className="list-card">
              <h3>Top 5 Customer</h3>
              {s.topCustomers.length === 0 && <div className="muted">—</div>}
              {s.topCustomers.map((c, i) => (
                <div key={i} className="item-row" style={{ justifyContent: "space-between" }}>
                  <span>{c.name}</span><b>{c.jobs} job · {c.conts} ตู้ · {c.pct}%</b>
                </div>
              ))}
            </div>
            <div className="list-card">
              <h3>Top 5 Sales / Co-Agent</h3>
              {s.topSales.length === 0 && <div className="muted">—</div>}
              {s.topSales.map((c, i) => (
                <div key={i} className="item-row" style={{ justifyContent: "space-between" }}>
                  <span>{c.name}</span><b>{c.jobs} job · {c.conts} ตู้ · {c.pct}% · KPI {c.kpi}%</b>
                </div>
              ))}
            </div>
            <div className="list-card">
              <h3>Job Type Breakdown</h3>
              {s.jobTypes.length === 0 && <div className="muted">—</div>}
              {s.jobTypes.map((c, i) => (
                <div key={i} className="item-row" style={{ justifyContent: "space-between" }}>
                  <span>{c.name}</span><b>{c.total} (End {c.finished} · Pending {c.pending})</b>
                </div>
              ))}
            </div>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Service Module KPI (รายโมดูล)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Module</th><th>Extra Cases</th><th>No Charge Cases</th><th>Lost Amount</th><th>No Charge %</th></tr></thead>
              <tbody>
                {s.serviceByModule.map((m, i) => (
                  <tr key={i}><td>{m.module}</td><td>{m.extraCases}</td><td>{m.noChargeCases}</td><td>{m.lost.toLocaleString()}</td><td>{m.noChargePct}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Internal Error Summary (รายโมดูล)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Module</th><th>Internal Error Cases</th><th>Loss Amount</th><th>Error % (÷ Finished)</th></tr></thead>
              <tbody>
                {s.errorByModule.map((m, i) => (
                  <tr key={i}><td>{m.module}</td><td>{m.cases}</td><td>{m.loss.toLocaleString()}</td><td>{m.pct}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Workflow Health (ทุกโมดูล)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Module</th><th>Active</th><th>Pending</th><th>End</th></tr></thead>
              <tbody>
                {s.workflow.map((w, i) => (
                  <tr key={i}><td>{w.module}</td><td>{w.active}</td><td>{w.pending}</td><td>{w.end}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lists-grid" style={{ marginTop: 14 }}>
            <SuppCard title="Transport Supplier — Top 5 On-Time" rows={s.topTransOnTime} metric="onTime" />
            <SuppCard title="Transport Supplier — Top 5 Delay" rows={s.topTransDelay} metric="delay" />
            <SuppCard title="Warehouse Supplier — Top 5 On-Time" rows={s.topWhOnTime} metric="onTime" />
            <SuppCard title="Warehouse Supplier — Top 5 Delay" rows={s.topWhDelay} metric="delay" />
          </div>
        </>
      )}
    </main>
  );
}
