"use client";

import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { collectJobs } from "@/lib/stats";

export default function ActionView() {
  const { data, loading, error, reload } = useData();
  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;
  const jobs = (data ? collectJobs(data) : [])
    .filter((j) => j.jobNo && j.status !== "End")
    .sort((a, b) => (b.aging ?? -1) - (a.aging ?? -1));

  return (
    <main className="page fade-in">
      <div className="panel">
        <h2>Action Follow-up — งานค้าง (ยังไม่ End)</h2>
        {error ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={reload}>ลองใหม่</button>
          </p>
        ) : (
          <p className="muted">มีงานค้าง {jobs.length} รายการ (เรียงตามค้างนานสุด)</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="grid view-table">
            <thead>
              <tr className="field-row">
                <th>Module</th>
                <th>Job No.</th>
                <th>Customer</th>
                <th>PIC / CS</th>
                <th>Status</th>
                <th>Aging</th>
                <th>Remark / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={i} className={(j.aging ?? 0) > 30 ? "row-aging" : ""}>
                  <td>{j.short}</td>
                  <td>{j.jobNo}</td>
                  <td>{j.customer || "—"}</td>
                  <td>{j.pic || "—"}</td>
                  <td>
                    <span className="pill open">{j.status || "—"}</span>
                  </td>
                  <td>{j.aging == null ? "—" : `${j.aging} วัน`}</td>
                  <td>{j.remark || ""}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                    ไม่มีงานค้าง 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
