import Link from "next/link";
import { collectJobs } from "@/lib/views";

export const dynamic = "force-dynamic";

// Action Follow-up: งานที่ยังไม่ End (โฟกัสงานค้าง + remark)
export default async function ActionView() {
  let jobs: Awaited<ReturnType<typeof collectJobs>> = [];
  let error = "";
  try {
    jobs = (await collectJobs()).filter((j) => j.jobNo && j.status !== "End");
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="page">
      <div className="panel">
        <h2>Action Follow-up — งานค้าง (ยังไม่ End)</h2>
        {error ? (
          <p className="muted">
            อ่านข้อมูลไม่ได้: {error} — ไปที่ <Link href="/settings">ตั้งค่า</Link> แล้วกด Initialize
          </p>
        ) : (
          <p className="muted">มีงานค้าง {jobs.length} รายการ</p>
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
              {jobs
                .slice()
                .sort((a, b) => (b.aging ?? -1) - (a.aging ?? -1))
                .map((j, i) => (
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
