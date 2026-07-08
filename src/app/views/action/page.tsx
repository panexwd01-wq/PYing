"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { actionRows } from "@/lib/stats";

export default function ActionView() {
  const { data, loading, error, reload } = useData();
  const lists = data?.lists || {};
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("");
  const [status, setStatus] = useState("");
  const [jobType, setJobType] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  const all = useMemo(() => (data ? actionRows(data) : []), [data]);
  const modules = useMemo(() => Array.from(new Set(all.map((r) => r.currentModule))), [all]);
  const statuses = useMemo(() => Array.from(new Set(all.map((r) => r.currentStatus).filter(Boolean))), [all]);
  const jobTypes = useMemo(
    () => (lists.job_type?.length ? lists.job_type : Array.from(new Set(all.map((r) => r.jobType).filter(Boolean)))),
    [lists, all]
  );

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => {
      if (mod && r.currentModule !== mod) return false;
      if (status && r.currentStatus !== status) return false;
      if (jobType && r.jobType !== jobType) return false;
      if (year && !(r.firstAssigned || "").startsWith(year)) return false;
      if (month && (r.firstAssigned || "").slice(5, 7) !== month) return false;
      if (s && !(r.jobNo + " " + r.booking + " " + r.customer).toLowerCase().includes(s)) return false;
      return true;
    });
  }, [all, q, mod, status, jobType, year, month]);

  const years = useMemo(() => {
    const set = new Set(all.map((r) => (r.firstAssigned || "").slice(0, 4)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [all]);

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Action Follow-up — งานค้างตามลำดับ Workflow</h2>
        </div>
        <div className="toolbar" style={{ marginTop: 8 }}>
          <div className="field grow"><label>ค้นหา (Job No. / Booking / MBL / Customer)</label>
            <input value={q} placeholder="พิมพ์เพื่อค้นหา…" onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="field"><label>Filter Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field"><label>Filter Job Type</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>Filter Module</label>
            <select value={mod} onChange={(e) => setMod(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>ปี</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field"><label>เดือน</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={reload}>ลองใหม่</button></p>
        ) : (
          <p className="muted">งานที่ต้องติดตาม {rows.length} รายการ · Current Module = โมดูลแรกในลำดับที่ยังไม่ End · เลือก Active/Pending เพื่อดูงานที่ยังไม่ Finished</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="view-table">
            <thead>
              <tr className="field-row">
                <th>Job No.</th><th>Booking / MBL</th><th>Job Type</th><th>Customer</th><th>CS / PIC</th>
                <th>Current Module</th>
                <th>4W</th><th>6W</th><th>10W</th><th>20GP</th><th>40HQ</th>
                <th>Current Status</th><th>Current PIC</th>
                <th>Action Required</th><th>1st Assigned</th><th>Blocking Party</th><th>Aging</th><th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={(r.aging ?? 0) > 30 ? "row-aging" : ""}>
                  <td>{r.jobNo}</td><td>{r.booking || "—"}</td><td>{r.jobType || "—"}</td>
                  <td>{r.customer || "—"}</td><td>{r.csPic || "—"}</td>
                  <td><b>{r.currentModule}</b></td>
                  <td>{r.c4w || ""}</td><td>{r.c6w || ""}</td><td>{r.c10w || ""}</td>
                  <td>{r.c20gp || ""}</td><td>{r.c40hq || ""}</td>
                  <td><span className="pill open">{r.currentStatus}</span></td>
                  <td>{r.currentPic || "—"}</td><td>{r.actionRequired}</td>
                  <td>{r.firstAssigned || "—"}</td><td>{r.blocking}</td>
                  <td>{r.aging == null ? "—" : `${r.aging} วัน`}</td>
                  <td>{r.remark || ""}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={18} style={{ padding: 26, textAlign: "center", color: "#777" }}>ไม่มีงานค้าง 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
