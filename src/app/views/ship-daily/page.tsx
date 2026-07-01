"use client";

import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { PrintButton } from "@/components/PrintButton";
import { shipDailyRows } from "@/lib/stats";

export default function ShipDailyView() {
  const { data, loading, error, reload } = useData();
  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;
  const rows = data ? shipDailyRows(data) : [];

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ flex: 1 }}>Ship Daily Print Check — ใบตรวจปล่อยประจำวัน</h2>
          <PrintButton />
        </div>
        {error ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={reload}>ลองใหม่</button>
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
