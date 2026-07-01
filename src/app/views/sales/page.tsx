"use client";

import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { salesStats } from "@/lib/stats";

export default function SalesView() {
  const { data, loading, error, reload } = useData();
  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;
  const s = data ? salesStats(data) : null;

  return (
    <main className="page fade-in">
      <div className="panel">
        <h2>Sales View — ลูกค้า / ปริมาณตู้</h2>
        {error || !s ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={reload}>ลองใหม่</button>
          </p>
        ) : (
          <div className="lists-grid">
            <div className="list-card"><h3>Total Jobs</h3><div className="dash-total">{s.totalJobs}</div></div>
            <div className="list-card"><h3>Unique Customers</h3><div className="dash-total">{s.uniqueCustomers}</div></div>
            <div className="list-card"><h3>Total 20GP</h3><div className="dash-total">{s.t20}</div></div>
            <div className="list-card"><h3>Total 40HQ</h3><div className="dash-total">{s.t40}</div></div>
          </div>
        )}
      </div>

      {s && !error && (
        <div className="panel">
          <h2 style={{ fontSize: 15 }}>งานแยกตามลูกค้า</h2>
          <div className="grid-wrap">
            <table className="view-table">
              <thead>
                <tr className="field-row">
                  <th>Customer</th>
                  <th>Jobs</th>
                  <th>20GP</th>
                  <th>40HQ</th>
                </tr>
              </thead>
              <tbody>
                {s.customers.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.jobs}</td>
                    <td>{c.c20}</td>
                    <td>{c.c40}</td>
                  </tr>
                ))}
                {s.customers.length === 0 && (
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
