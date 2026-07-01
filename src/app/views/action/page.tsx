"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { actionRows } from "@/lib/stats";

export default function ActionView() {
  const { data, loading, error, reload } = useData();
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("");

  const all = useMemo(() => (data ? actionRows(data) : []), [data]);
  const modules = useMemo(() => Array.from(new Set(all.map((r) => r.currentModule))), [all]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => {
      if (mod && r.currentModule !== mod) return false;
      if (s && !(r.jobNo + " " + r.booking + " " + r.customer).toLowerCase().includes(s)) return false;
      return true;
    });
  }, [all, q, mod]);

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Action Follow-up — งานค้างตามลำดับ Workflow</h2>
          <div className="field"><label>Current Module</label>
            <select value={mod} onChange={(e) => setMod(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field grow"><label>ค้นหา (Job / Booking / Customer)</label>
            <input value={q} placeholder="พิมพ์เพื่อค้นหา…" onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {error ? (
          <p className="muted">โหลดข้อมูลไม่สำเร็จ: {error} <button className="btn sm" onClick={reload}>ลองใหม่</button></p>
        ) : (
          <p className="muted">งานที่ต้องติดตาม {rows.length} รายการ · Current Module = โมดูลแรกในลำดับที่ยังไม่ End</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="grid view-table">
            <thead>
              <tr className="field-row">
                <th>Job No.</th><th>Booking/MBL</th><th>Job Type</th><th>Customer</th><th>CS/PIC</th>
                <th>Cont.</th><th>Current Module</th><th>Status</th><th>Current PIC</th>
                <th>Action Required</th><th>Blocking</th><th>Aging</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={(r.aging ?? 0) > 30 ? "row-aging" : ""}>
                  <td>{r.jobNo}</td><td>{r.booking || "—"}</td><td>{r.jobType || "—"}</td>
                  <td>{r.customer || "—"}</td><td>{r.csPic || "—"}</td><td>{r.conts || ""}</td>
                  <td><b>{r.currentModule}</b></td>
                  <td><span className="pill open">{r.currentStatus}</span></td>
                  <td>{r.currentPic || "—"}</td><td>{r.actionRequired}</td><td>{r.blocking}</td>
                  <td>{r.aging == null ? "—" : `${r.aging} วัน`}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={12} style={{ padding: 26, textAlign: "center", color: "#777" }}>ไม่มีงานค้าง 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
