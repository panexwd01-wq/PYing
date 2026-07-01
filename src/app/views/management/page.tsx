"use client";

import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { managementStats } from "@/lib/stats";

function TopCard({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      {rows.length === 0 && <div className="muted">—</div>}
      {rows.map((r, i) => (
        <div key={i} className="item-row" style={{ justifyContent: "space-between" }}>
          <span>{r.name}</span>
          <b>{r.count}</b>
        </div>
      ))}
    </div>
  );
}

export default function ManagementView() {
  const { data, loading, error, reload } = useData();
  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;
  const s = data ? managementStats(data) : null;

  return (
    <main className="page fade-in">
      <div className="panel">
        <h2>Management View — KPI ทีม / บริษัท</h2>
        {error || !s ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={reload}>ลองใหม่</button>
          </p>
        ) : (
          <div className="lists-grid">
            <div className="list-card"><h3>Accounting Rows</h3><div className="dash-total">{s.totalAcc}</div></div>
            <div className="list-card"><h3>ACC Pending</h3><div className="dash-total">{s.accPending}</div></div>
            <div className="list-card"><h3>Extra Items</h3><div className="dash-total">{s.extraItems}</div></div>
            <div className="list-card"><h3>Transport Jobs</h3><div className="dash-total">{s.transJobs}</div></div>
            <div className="list-card"><h3>Warehouse Jobs</h3><div className="dash-total">{s.whJobs}</div></div>
          </div>
        )}
      </div>

      {s && !error && (
        <div className="panel">
          <h2 style={{ fontSize: 15 }}>Top รายการ</h2>
          <div className="lists-grid">
            <TopCard title="Top Extra/Service Type" rows={s.topExtra} />
            <TopCard title="Top Transport Supplier" rows={s.topTransSupp} />
            <TopCard title="Top Warehouse Supplier" rows={s.topWhSupp} />
          </div>
        </div>
      )}
    </main>
  );
}
