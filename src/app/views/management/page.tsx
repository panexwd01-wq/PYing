import Link from "next/link";
import { managementStats } from "@/lib/views";

export const dynamic = "force-dynamic";

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

export default async function ManagementView() {
  let s: Awaited<ReturnType<typeof managementStats>> | null = null;
  let error = "";
  try {
    s = await managementStats();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="page">
      <div className="panel">
        <h2>Management View — KPI ทีม / บริษัท</h2>
        {error ? (
          <p className="muted">
            อ่านข้อมูลไม่ได้: {error} — ไปที่ <Link href="/settings">ตั้งค่า</Link> แล้วกด Initialize
          </p>
        ) : (
          <div className="lists-grid">
            <div className="list-card"><h3>Accounting Rows</h3><div className="dash-total">{s!.totalAcc}</div></div>
            <div className="list-card"><h3>ACC Pending</h3><div className="dash-total">{s!.accPending}</div></div>
            <div className="list-card"><h3>Extra Items</h3><div className="dash-total">{s!.extraItems}</div></div>
            <div className="list-card"><h3>Transport Jobs</h3><div className="dash-total">{s!.transJobs}</div></div>
            <div className="list-card"><h3>Warehouse Jobs</h3><div className="dash-total">{s!.whJobs}</div></div>
          </div>
        )}
      </div>

      {!error && (
        <div className="panel">
          <h2 style={{ fontSize: 15 }}>Top รายการ</h2>
          <div className="lists-grid">
            <TopCard title="Top Extra/Service Type" rows={s!.topExtra} />
            <TopCard title="Top Transport Supplier" rows={s!.topTransSupp} />
            <TopCard title="Top Warehouse Supplier" rows={s!.topWhSupp} />
          </div>
        </div>
      )}
    </main>
  );
}
