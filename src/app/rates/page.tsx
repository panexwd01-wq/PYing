"use client";

import { useState } from "react";
import { RateBoard } from "@/components/RateBoard";

export default function RatesPage() {
  const [tab, setTab] = useState<"cost" | "sell">("cost");

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Rate Checker — ฐานเรทค่าขนส่ง / ราคาขาย</h2>
          <div className="seg">
            <button className={"seg-btn" + (tab === "cost" ? " on" : "")} onClick={() => setTab("cost")}>
              Cost Rates (ต้นทุน)
            </button>
            <button className={"seg-btn" + (tab === "sell" ? " on" : "")} onClick={() => setTab("sell")}>
              Sell Rates (ราคาขาย)
            </button>
          </div>
        </div>
        <p className="muted">
          เก็บเรทของแต่ละ Supplier/Customer แยกตาม Port · Cargo · Job Type — เพิ่ม/แก้/ค้นหาได้ · วันที่อัปเดตลงอัตโนมัติ
        </p>
      </div>

      {tab === "cost" ? <RateBoard moduleKey="cost-rates" /> : <RateBoard moduleKey="sell-rates" />}
    </main>
  );
}
