"use client";

import React, { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { RequireTab } from "@/components/RequireTab";
import { SortMark, useTableSort } from "@/components/SortTh";
import { supervisorDash, MONTHS_TH, yearsInData, SupervisorDash } from "@/lib/stats";

// คอลัมน์ตาราง No Charge Detail: [ฟิลด์, หัวคอลัมน์]
const NC_COLS: [keyof SupervisorDash["noChargeList"][number], string][] = [
  ["jobNo", "Job No"], ["date", "Date"], ["team", "Team"], ["pic", "PIC"], ["type", "Extra Type"],
  ["lost", "Lost Amount"], ["reason", "No Charge Reason"], ["remark", "Remark"],
];

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
  const [jobType, setJobType] = useState("");
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
  const jobTypes = useMemo(() => data?.lists?.job_type || [], [data]);
  const s = useMemo(() => (data ? supervisorDash(data, year, month, jobType) : null), [data, year, month, jobType]);

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

  // คลิกหัวคอลัมน์เพื่อเรียง (hook ต้องอยู่ก่อน return ด้านล่าง)
  const errorHealth = useMemo(() => s?.errorHealth || [], [s]);
  const teamRows = useMemo(() => s?.team || [], [s]);
  const ehSort = useTableSort(errorHealth);
  const teamSort = useTableSort(teamRows);
  const staffSort = useTableSort(staff);
  const ncSort = useTableSort(noCharge);

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
          <div className="field"><label>Job Type</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
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
        <p className="muted" style={{ margin: "8px 4px 0", fontSize: 12 }}>
          ปี/เดือนที่เลือกกรองจาก<b>วันที่หลักของแต่ละ tab</b> (Import = ETA · Export = ETD · Shipping = Clearance Date ·
          Transport/Warehouse = Delivery Date · ที่เหลือใช้วันที่สร้างงาน) ทุกตารางในหน้านี้
          ยกเว้น <b>Exception Dashboard</b> (งานค้างเรียลไทม์ นับจากวันนี้เสมอ) และ <b>End เดือนนี้</b> (ยึดวันที่ปิดงาน)
          {s && s.undated > 0 && (
            <> · <b>{s.undated}</b> แถวยังไม่มีวันที่ จะแสดงในทุกเดือน</>
          )}
        </p>
        {error && <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={() => reload(true)}>ลองใหม่</button></p>}
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
              <thead><tr className="field-row">
                <th {...ehSort.th("team")}>Team / Module <SortMark dir={ehSort.dirOf("team")} /></th>
                <th {...ehSort.th("noChargeCases")} title="แถว Extra ของทีมนี้ที่ Profit Status = No Charge">No Charge Cases <SortMark dir={ehSort.dirOf("noChargeCases")} /></th>
                <th {...ehSort.th("riskPic")} title="Extra Cost PIC ที่มีเคส Error มากสุดของทีมนี้ (นับจาก Extra Root Cause ที่เป็น Error ทุกแบบ — Internal / CS / Transportation / Warehouse / Shipping / Documentation; ไม่นับ Customer Request)">Most Risk PIC <SortMark dir={ehSort.dirOf("riskPic")} /></th>
                <th {...ehSort.th("extraType")} title="Extra Req Type ที่พบบ่อยสุดของทีมนี้">Most Extra Service Type <SortMark dir={ehSort.dirOf("extraType")} /></th>
                <th {...ehSort.th("lost")} title="ผลรวม Cost Total ของเคส No Charge">Total Lost Amount <SortMark dir={ehSort.dirOf("lost")} /></th>
                <th {...ehSort.th("errorRate")} title="เคส Error ÷ งานที่ End ของทีมนี้ (ในเดือนที่เลือก)">Error Rate % <SortMark dir={ehSort.dirOf("errorRate")} /></th>
              </tr></thead>
              <tbody>
                {ehSort.sorted.map((h, i) => (
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
              <thead><tr className="field-row">
                <th style={{ width: 40 }} /><th {...teamSort.th("team")}>Team <SortMark dir={teamSort.dirOf("team")} /></th>
                <th {...teamSort.th("total")} title="งานที่ถูกสร้างในเดือนที่เลือก">งานเดือนนี้ <SortMark dir={teamSort.dirOf("total")} /></th>
                <th {...teamSort.th("active")} title="งานที่สร้างในเดือนที่เลือกและยังไม่ End/Cancel">Active <SortMark dir={teamSort.dirOf("active")} /></th>
                <th {...teamSort.th("endToday")} title="งานที่ End วันนี้ (ยึด ended_at = วันนี้จริง)">End วันนี้ <SortMark dir={teamSort.dirOf("endToday")} /></th>
                <th {...teamSort.th("endMonth")} title="งานที่ End ในเดือนที่เลือก (ยึด ended_at ไม่ว่างานจะสร้างเดือนไหน)">End เดือนนี้ <SortMark dir={teamSort.dirOf("endMonth")} /></th>
              </tr></thead>
              <tbody>
                {teamSort.sorted.map((t) => {
                  const open = openTeams.has(t.team);
                  // พนักงานในทีมนี้ เรียงจากงานมาก → น้อย
                  const members = s.staff.filter((x) => x.team === t.team).sort((a, b) => b.total - a.total);
                  return (
                    <React.Fragment key={t.team}>
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
                            <TeamMembers members={members} />
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
          <p className="muted" style={{ margin: "0 4px 6px", fontSize: 12 }}>
            นับ <b>รายแถวงาน</b> ของเดือนที่เลือก จาก 6 tab (Import / Export / Shipping / Transport / Warehouse / Accounting)
            โดยยึด PIC ของ tab นั้น ๆ (Ship PIC / Trans PIC / WH PIC / Acc PIC — ไม่ใช่ CS PIC ที่ดึงมาแสดง)
            → งาน 1 ใบที่วิ่งหลาย tab จะถูกนับให้เจ้าของแต่ละ tab คนละ 1
          </p>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row">
                <th {...staffSort.th("pic")}>PIC <SortMark dir={staffSort.dirOf("pic")} /></th>
                <th {...staffSort.th("team")}>Team <SortMark dir={staffSort.dirOf("team")} /></th>
                <th {...staffSort.th("total")} title="จำนวนแถวงานที่คนนี้เป็น PIC (รวมทุก tab) ที่สร้างในเดือนที่เลือก">Total <SortMark dir={staffSort.dirOf("total")} /></th>
                <th {...staffSort.th("active")} title="ยังไม่ End และไม่ใช่ Cancel">Active <SortMark dir={staffSort.dirOf("active")} /></th>
                <th {...staffSort.th("end")} title="Status = End">End <SortMark dir={staffSort.dirOf("end")} /></th>
                <th {...staffSort.th("error")} title="แถว Extra ที่คนนี้เป็น Extra Cost PIC และ Root Cause เป็น Error (ทุกแบบ ยกเว้น Customer Request)">Internal Error <SortMark dir={staffSort.dirOf("error")} /></th>
              </tr></thead>
              <tbody>
                {staffSort.sorted.map((t, i) => (
                  <tr key={i}><td>{t.pic}</td><td>{t.team || "—"}</td><td>{t.total}</td><td>{t.active}</td><td>{t.end}</td><td>{t.error}</td></tr>
                ))}
                {staff.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#777" }}>ยังไม่มีข้อมูล PIC</td></tr>}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: "14px 4px 6px" }}>No Charge / Internal Error Detail</h3>
          <div className="grid-wrap">
            <table className="view-table">
              <thead><tr className="field-row">
                {NC_COLS.map(([k, label]) => (
                  <th key={k} {...ncSort.th(k)}>{label} <SortMark dir={ncSort.dirOf(k)} /></th>
                ))}
              </tr></thead>
              <tbody>
                {ncSort.sorted.map((n, i) => (
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

// รายชื่อพนักงานในทีม (กางจากแถวทีม) — อันดับ/ป้ายมากสุด-น้อยสุด ยึดจำนวนงานเสมอ ไม่เปลี่ยนตามการคลิกเรียง
function TeamMembers({ members }: { members: SupervisorDash["staff"] }) {
  const { sorted, th, dirOf } = useTableSort(members);
  const max = members.length ? members[0].total : 0;
  const min = members.length ? members[members.length - 1].total : 0;
  return (
    <div className="team-members">
      <table className="view-table">
        <thead>
          <tr className="field-row">
            <th>อันดับ</th>
            <th {...th("pic")}>พนักงาน (PIC) <SortMark dir={dirOf("pic")} /></th>
            <th {...th("total")}>Total <SortMark dir={dirOf("total")} /></th>
            <th {...th("active")}>Active <SortMark dir={dirOf("active")} /></th>
            <th {...th("end")}>End <SortMark dir={dirOf("end")} /></th>
            <th {...th("error")}>Internal Error <SortMark dir={dirOf("error")} /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((mbr) => {
            const hot = members.length > 1 && mbr.total === max && max > 0;
            const cold = members.length > 1 && mbr.total === min;
            return (
              <tr key={mbr.pic} className={hot ? "wl-max" : cold ? "wl-min" : undefined}>
                <td>{members.indexOf(mbr) + 1}</td>
                <td>
                  {mbr.pic}
                  {hot && <span className="wl-tag hot">งานมากสุด</span>}
                  {cold && !hot && <span className="wl-tag cold">งานน้อยสุด</span>}
                </td>
                <td>{mbr.total}</td><td>{mbr.active}</td><td>{mbr.end}</td><td>{mbr.error}</td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 14, textAlign: "center", color: "#777" }}>ยังไม่มีพนักงานที่มีงานในทีมนี้เดือนนี้</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
