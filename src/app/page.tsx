import Link from "next/link";
import { MODULES } from "@/lib/schema";
import { listJobsRaw } from "@/lib/db";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

interface Stat {
  key: string;
  label: string;
  total: number;
  ended: number;
  open: number;
}

async function collect(): Promise<{ stats: Stat[]; error?: string }> {
  try {
    const stats: Stat[] = [];
    for (const m of MODULES) {
      const statusKey = m.fields[0].key;
      const rows = await listJobsRaw(m);
      const ended = rows.filter((r) => (r[statusKey] || "") === "End").length;
      stats.push({
        key: m.key,
        label: m.label,
        total: rows.length,
        ended,
        open: rows.length - ended,
      });
    }
    return { stats };
  } catch (e: any) {
    return { stats: [], error: e.message };
  }
}

export default async function Dashboard() {
  const { stats, error } = await collect();
  const grand = stats.reduce((a, s) => a + s.total, 0);

  return (
    <main className="page">
      <div className="panel">
        <h2>ภาพรวมระบบ (Dashboard)</h2>
        {error ? (
          <p className="muted">
            ยังอ่านข้อมูลไม่ได้: {error} — ไปที่หน้า <Link href="/settings">ตั้งค่า</Link> แล้วกด
            <b> Initialize</b> ก่อน
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
