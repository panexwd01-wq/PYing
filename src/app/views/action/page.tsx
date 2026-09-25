"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { RequireTab } from "@/components/RequireTab";
import { SortMark, useTableSort } from "@/components/SortTh";
import { actionRows, ActionRow } from "@/lib/stats";

// คอลัมน์ตาราง: [ฟิลด์ใน ActionRow, หัวคอลัมน์]
const COLS: [keyof ActionRow, string][] = [
  ["jobNo", "Job No."], ["booking", "Booking / MBL"], ["jobType", "Job Type"], ["customer", "Customer"], ["csPic", "CS / PIC"],
  ["currentModule", "Current Module"],
  ["contLabel", "จำนวน/หน่วย"],
  ["currentStatus", "Current Status"], ["currentPic", "Current PIC"],
  ["actionRequired", "Action Required"], ["firstAssigned", "1st Assigned"], ["blocking", "Blocking Party"], ["aging", "Aging"], ["remark", "Remark"],
];

export default function ActionPage() {
  return (
    <RequireTab tab="action">
      <ActionView />
    </RequireTab>
  );
}

function ActionView() {
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

  // คลิกหัวคอลัมน์เพื่อเรียง (Aging เรียงตามจำนวนวัน)
  const { sorted, th, dirOf } = useTableSort(rows);

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
          <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={() => reload(true)}>ลองใหม่</button></p>
        ) : (
          <p className="muted">งานที่ต้องติดตาม {rows.length} รายการ · Current Module = โมดูลแรกในลำดับที่ยังไม่ End · เลือก Active/Pending เพื่อดูงานที่ยังไม่ Finished</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="view-table">
            <thead>
              <tr className="field-row">
                {COLS.map(([k, label]) => (
                  <th key={k} {...th(k)}>{label} <SortMark dir={dirOf(k)} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className={(r.aging ?? 0) > 30 ? "row-aging" : ""}>
                  <td>{r.jobNo}</td><td>{r.booking || "—"}</td><td>{r.jobType || "—"}</td>
                  <td>{r.customer || "—"}</td><td>{r.csPic || "—"}</td>
                  <td><b>{r.currentModule}</b></td>
                  <td>{r.contLabel || ""}</td>
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
