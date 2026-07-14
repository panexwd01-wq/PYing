"use client";

import { RateBoard } from "@/components/RateBoard";

export default function RatesPage() {
  return (
    <main className="page fade-in">
      <div className="panel">
        <h2>Rate Checker — ฐานเรทค่าขนส่ง / ราคาขาย</h2>
        <p className="muted">
          ต้นทุน (Cost) ด้านบน · ราคาขาย (Sell) ด้านล่าง — วางเทียบกันได้เลย · เพิ่ม/แก้/ค้นหาแยกกัน · วันที่อัปเดตลงอัตโนมัติ
        </p>
      </div>

      <div className="compare-wrap">
        <RateBoard moduleKey="cost-rates" compact title="ต้นทุน (Cost)" />
        <RateBoard moduleKey="sell-rates" compact title="ราคาขาย (Sell)" saveBarOffset={64} />
      </div>
    </main>
  );
}
