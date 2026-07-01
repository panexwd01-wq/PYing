import Link from "next/link";
import { collectJobs } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function SupervisorView() {
  let jobs: Awaited<ReturnType<typeof collectJobs>> = [];
  let error = "";
  try {
    jobs = await collectJobs();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="page">
      <div className="panel">
        <h2>Supervisor View — งานทั้งหมดทุกโมดูล</h2>
        {error ? (
          <p className="muted">
            อ่านข้อมูลไม่ได้: {error} — ไปที่ <Link href="/settings">ตั้งค่า</Link> แล้วกด Initialize
          </p>
        ) : (
          <p className="muted">รวม {jobs.length} รายการจาก 7 โมดูล</p>
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
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={i} className={j.status === "End" ? "row-end" : ""}>
                  <td>{j.short}</td>
                  <td>{j.jobNo || "—"}</td>
                  <td>{j.customer || "—"}</td>
                  <td>{j.pic || "—"}</td>
                  <td>
                    <span className={"pill " + (j.status === "End" ? "end" : "open")}>
                      {j.status || "—"}
                    </span>
                  </td>
                  <td>{j.aging == null ? "—" : `${j.aging} วัน`}</td>
                  <td>{j.remark || ""}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                    ยังไม่มีข้อมูล
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
