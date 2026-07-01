import Link from "next/link";
import { listJobs } from "@/lib/db";
import { MODULE_BY_ID } from "@/lib/schema";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// 06A — ใบตรวจปล่อยประจำวัน (สำหรับปริ้นหน้างาน) : ดึงงาน Shipping ที่ยังไม่ Finished
export default async function ShipDailyView() {
  let rows: Awaited<ReturnType<typeof listJobs>> = [];
  let error = "";
  try {
    const all = await listJobs(MODULE_BY_ID["06_Shipping"]);
    rows = all.filter((r) => (r.shipp_status || "") !== "End");
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="page">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ flex: 1 }}>Ship Daily Print Check — ใบตรวจปล่อยประจำวัน</h2>
          <PrintButton />
        </div>
        {error ? (
          <p className="muted">
            อ่านข้อมูลไม่ได้: {error} — ไปที่ <Link href="/settings">ตั้งค่า</Link> แล้วกด Initialize
          </p>
        ) : (
          <p className="muted no-print">งานตรวจปล่อยที่ยังไม่ End จำนวน {rows.length} รายการ</p>
        )}
      </div>

      {!error && (
        <div className="grid-wrap">
          <table className="grid view-table">
            <thead>
              <tr className="field-row">
                <th>No.</th>
                <th>Job No.</th>
                <th>Customer</th>
                <th>Clearance Date</th>
                <th>Delivery Date</th>
                <th>Ship PIC</th>
                <th>Status</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.__id}>
                  <td>{i + 1}</td>
                  <td>{r.job_no || "—"}</td>
                  <td>{r.customer || "—"}</td>
                  <td>{r.clearance_date || "—"}</td>
                  <td>{r.delivery_date || "—"}</td>
                  <td>{r.ship_pic || "—"}</td>
                  <td>{r.shipp_status || "—"}</td>
                  <td>{r.shipping_remark || ""}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                    ไม่มีงานตรวจปล่อยค้าง
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
