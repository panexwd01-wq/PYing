"use client";

import { RateBoard } from "@/components/RateBoard";
import { RequireTab } from "@/components/RequireTab";

export default function RatesPage() {
  return (
    <RequireTab tab="rates">
      <main className="page fade-in">
        <div className="panel">
          <h2>Rate Checker — ฐานเรทต้นทุน / ราคาขาย</h2>
          <p className="muted">
            ต้นทุน (COST CHECKER) ด้านบน · ราคาขาย (SELL CHECKER) ด้านล่าง — อยู่หน้าเดียวกัน ·
            ช่อง <b>Cost Checked by / Sale Quoted by</b> ระบบล็อกตามบัญชีที่เข้าสู่ระบบ ·
            บันทึกแล้ว <b>แก้ไขไม่ได้</b> หากต้องการแก้ไขให้ติดต่อฝ่ายบัญชี
          </p>
        </div>

        <RateBoard moduleKey="cost-rates" title="PANEX COST CHECKER" />
        <RateBoard moduleKey="sell-rates" title="PANEX SELL CHECKER" />
      </main>
    </RequireTab>
  );
}
