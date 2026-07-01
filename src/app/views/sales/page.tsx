import Link from "next/link";
import { salesStats } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function SalesView() {
  let s: Awaited<ReturnType<typeof salesStats>> | null = null;
  let error = "";
  try {
    s = await salesStats();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="page">
      <div className="panel">
        <h2>Sales View — ลูกค้า / ปริมาณตู้</h2>
        {error ? (
          <p className="muted">
            อ่านข้อมูลไม่ได้: {error} — ไปที่ <Link href="/settings">ตั้งค่า</Link> แล้วกด Initialize
          </p>
        ) : (
          <div className="lists-grid">
            <div className="list-card"><h3>Total Jobs</h3><div className="dash-total">{s!.totalJobs}</div></div>
            <div className="list-card"><h3>Unique Customers</h3><div className="dash-total">{s!.uniqueCustomers}</div></div>
            <div className="list-card"><h3>Total 20GP</h3><div className="dash-total">{s!.t20}</div></div>
            <div className="list-card"><h3>Total 40HQ</h3><div className="dash-total">{s!.t40}</div></div>
          </div>
        )}
      </div>

      {!error && (
        <div className="panel">
          <h2 style={{ fontSize: 15 }}>งานแยกตามลูกค้า</h2>
          <div className="grid-wrap">
            <table className="grid view-table">
              <thead>
                <tr className="field-row">
                  <th>Customer</th>
                  <th>Jobs</th>
                  <th>20GP</th>
                  <th>40HQ</th>
                </tr>
              </thead>
              <tbody>
                {s!.customers.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.jobs}</td>
                    <td>{c.c20}</td>
                    <td>{c.c40}</td>
                  </tr>
                ))}
                {s!.customers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                      ยังไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
