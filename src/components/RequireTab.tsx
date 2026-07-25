"use client";

import { useAuth } from "@/components/AuthProvider";
import { CenterLoading } from "@/components/Spinner";
import { TAB_BY_KEY } from "@/lib/perms";

// ครอบหน้าที่ต้องมีสิทธิ์ "เห็น" tab นั้น — ไม่มีสิทธิ์ = แสดงข้อความแทนเนื้อหา
export function RequireTab({ tab, children }: { tab: string; children: React.ReactNode }) {
  const { loading, user, can, isAdmin } = useAuth();
  const def = TAB_BY_KEY[tab];

  if (loading) return <main className="page fade-in"><CenterLoading /></main>;
  if (!user) return <main className="page fade-in"><CenterLoading text="กำลังตรวจสอบสิทธิ์…" /></main>;

  const ok = def?.adminOnly ? isAdmin : can(tab, "view");
  if (!ok)
    return (
      <main className="page fade-in">
        <div className="panel">
          <h2>ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="muted">
            บัญชี <b>{user.displayName}</b> ยังไม่ได้รับสิทธิ์เข้าใช้ <b>{def?.label || tab}</b> —
            ติดต่อผู้ดูแลระบบ (admin) เพื่อเปิดสิทธิ์
          </p>
        </div>
      </main>
    );

  return <>{children}</>;
}
