"use client";

import React, { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { RequireTab } from "@/components/RequireTab";
import { supervisorDash, MONTHS_TH, yearsInData } from "@/lib/stats";

export default function SupervisorPage() {
  return (
    <RequireTab tab="supervisor">
      <SupervisorView />
    </RequireTab>
  );
}

function SupervisorView() {
  const { data, loading, error, reload } = useData();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [team, setTeam] = useState("");
  const [pic, setPic] = useState("");
  const [openTeams, setOpenTeams] = useState<Set<string>>(new Set()); // ทีมที่กางดูรายชื่อพนักงาน

  const toggleTeam = (t: string) =>
    setOpenTeams((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const years = useMemo(() => (data ? yearsInData(data) : [year]), [data, year]);
  const s = useMemo(() => (data ? supervisorDash(data, year, month) : null), [data, year, month]);

  const teams = useMemo(() => (s ? Array.from(new Set(s.staff.map((t) => t.team).filter(Boolean))) : []), [s]);
  const pics = useMemo(() => (s ? s.staff.map((t) => t.pic) : []), [s]);
  const staff = useMemo(() => {
    if (!s) return [];
    return s.staff.filter((t) => (!team || t.team === team) && (!pic || t.pic === pic));
  }, [s, team, pic]);
  const noCharge = useMemo(() => {
    if (!s) return [];
    return s.noChargeList.filter((n) => (!pic || n.pic === pic));
  }, [s, pic]);

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
          <div className="field"><label>Module / Team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>PIC</label>
            <select value={pic} onChange={(e) => setPic(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {pics.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={reload}>ลองใหม่</button></p>}
      </div>

      {s && (
        <>
          <h3 style={{ margin: "6px 4px" }}>Operational Risk Summary</h3>
          <div className="lists-grid">
            <div className="list-card"><h3>Most Internal Error Team</h3>
              <div className="dash-total">{s.risk.mostErrorTeam}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s.risk.mostErrorCount} เคส No Charge</div>
            </div>
            <div className="list-card"><h3>Internal Error Lost Amount</h3>
              <div className="dash-total">{s.risk.errorLost.toLocaleString()}</div>
              <div className="muted" style={{ fontSize: 12 }}>รวมทุกทีม (No Charge)</div>
            </div>
            <div className="list-card"><h3>Most Pending Jobs</h3>
              <div className="dash-total">{s.risk.mostPendingTeam}</div>
              <div className="muted" style={{ fontSize: 12 }}>{s.risk.mostPendingCount} งาน Pending</div>
            </div>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Exception Dashboard</h3>
          <div className="lists-grid">
            {s.exceptions.map((e, i) => (
              <div key={i} className={"list-card" + (e.count > 0 ? " exc-hot" : "")}>
                <h3>{e.label}</h3>
                <div className="dash-total">{e.count}</div>
                <div className="muted" style={{ fontSize: 12 }}>{e.hint}</div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Internal Error Health (รายทีม)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Team / Module</th><th>No Charge Cases</th><th>Most Risk PIC</th><th>Most Extra Service Type</th><th>Total Lost Amount</th><th>Error Rate %</th></tr></thead>
              <tbody>
                {s.errorHealth.map((h, i) => (
                  <tr key={i}><td>{h.team}</td><td>{h.noChargeCases}</td><td>{h.riskPic}</td><td>{h.extraType}</td><td>{h.lost.toLocaleString()}</td><td>{h.errorRate}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Team Workload</h3>
          <p className="muted" style={{ margin: "0 4px 6px", fontSize: 12 }}>
            กด ▸ หน้าแถวทีม เพื่อดูรายชื่อพนักงานทุกคนในทีมนั้น (เรียงจากงานมากสุด → น้อยสุด)
          </p>
          <div className="grid-wrap">
            <table className="view-table team-workload">
              <thead><tr className="field-row"><th style={{ width: 40 }} /><th>Team</th><th>งานเดือนนี้</th><th>Active</th><th>End วันนี้</th><th>End เดือนนี้</th></tr></thead>
              <tbody>
                {s.team.map((t, i) => {
                  const open = openTeams.has(t.team);
                  // พนักงานในทีมนี้ เรียงจากงานมาก → น้อย
                  const members = s.staff.filter((x) => x.team === t.team).sort((a, b) => b.total - a.total);
                  const max = members.length ? members[0].total : 0;
                  const min = members.length ? members[members.length - 1].total : 0;
                  return (
                    <React.Fragment key={i}>
                      <tr className={open ? "row-expanded" : undefined}>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className={"expand-btn" + (open ? " on" : "")}
                            onClick={() => toggleTeam(t.team)}
                            title={open ? "ย่อ" : "ดูรายชื่อพนักงานในทีมนี้"}
                            aria-label="กางรายชื่อพนักงาน"
                          >
                            ▸
                          </button>
                        </td>
                        <td><b>{t.team}</b> <span className="count-pill sm">{members.length} คน</span></td>
                        <td>{t.total}</td><td>{t.active}</td><td>{t.endToday}</td><td>{t.endMonth}</td>
                      </tr>
                      {open && (
                        <tr className="detail-row">
                          <td className="detail-cell" colSpan={6}>
                            <div className="team-members">
                              <table className="view-table">
                                <thead>
                                  <tr className="field-row">
                                    <th>อันดับ</th><th>พนักงาน (PIC)</th><th>Total</th><th>Active</th><th>End</th><th>Delay (&gt;7 วัน)</th><th>Internal Error</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map((mbr, j) => {
                                    const hot = members.length > 1 && mbr.total === max && max > 0;
                                    const cold = members.length > 1 && mbr.total === min;
                                    return (
                                      <tr key={mbr.pic} className={hot ? "wl-max" : cold ? "wl-min" : undefined}>
                                        <td>{j + 1}</td>
                                        <td>
                                          {mbr.pic}
                                          {hot && <span className="wl-tag hot">งานมากสุด</span>}
                                          {cold && !hot && <span className="wl-tag cold">งานน้อยสุด</span>}
                                        </td>
                                        <td>{mbr.total}</td><td>{mbr.active}</td><td>{mbr.end}</td><td>{mbr.delay}</td><td>{mbr.error}</td>
                                      </tr>
                                    );
                                  })}
                                  {members.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding: 14, textAlign: "center", color: "#777" }}>ยังไม่มีพนักงานที่มีงานในทีมนี้เดือนนี้</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>Staff KPI (ตาม PIC)</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>PIC</th><th>Team</th><th>Total</th><th>Active</th><th>End</th><th>Delay (&gt;7 วัน)</th><th>Internal Error</th></tr></thead>
              <tbody>
                {staff.map((t, i) => (
                  <tr key={i}><td>{t.pic}</td><td>{t.team || "—"}</td><td>{t.total}</td><td>{t.active}</td><td>{t.end}</td><td>{t.delay}</td><td>{t.error}</td></tr>
                ))}
                {staff.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#777" }}>ยังไม่มีข้อมูล PIC</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>No Charge / Internal Error Detail</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row"><th>Job No</th><th>Date</th><th>Team</th><th>PIC</th><th>Extra Type</th><th>Lost Amount</th><th>No Charge Reason</th><th>Remark</th></tr></thead>
              <tbody>
                {noCharge.map((n, i) => (
                  <tr key={i}><td>{n.jobNo || "—"}</td><td>{n.date || "—"}</td><td>{n.team}</td><td>{n.pic}</td><td>{n.type}</td><td>{n.lost.toLocaleString()}</td><td>{n.reason}</td><td>{n.remark}</td></tr>
                ))}
                {noCharge.length === 0 && <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#777" }}>ไม่มีรายการ No Charge</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
