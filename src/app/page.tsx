"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { SyncButton } from "@/components/SyncButton";
import { CenterLoading } from "@/components/Spinner";
import { dashboardStats } from "@/lib/stats";

export default function Dashboard() {
  const { data, loading, error, reload } = useData();

  if (loading && !data) {
    return (
      <main className="page fade-in">
        <CenterLoading />
      </main>
    );
  }

  const stats = data ? dashboardStats(data) : [];
  const grand = stats.reduce((a, s) => a + s.total, 0);

  return (
    <main className="page fade-in">
      <div className="panel">
        <h2>ภาพรวมระบบ (Dashboard)</h2>
        {error ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={reload}>ลองใหม่</button>
          </p>
        ) : (
          <p className="muted">
            งานทั้งหมดในระบบ <b>{grand}</b> รายการ · แยกตามโมดูลด้านล่าง (คลิกเพื่อเข้าโมดูล)
          </p>
        )}
        {!error && <SyncButton />}
      </div>

      {!error && (
        <div className="lists-grid">
          {stats.map((s) => (
            <Link key={s.key} href={`/m/${s.key}`} className="list-card dash-card">
              <h3>{s.label}</h3>
              <div className="dash-total">{s.total}</div>
              <div className="dash-sub">
                <span className="pill open">Open {s.open}</span>
                <span className="pill end">End {s.ended}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
