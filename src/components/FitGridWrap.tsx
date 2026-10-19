"use client";

import { ReactNode } from "react";

// กรอบตาราง (.grid-wrap.fit) ที่ไม่มี scroll ของตัวเอง — เลื่อนด้วย scroll ของหน้าเว็บอย่างเดียว
// (หัวตารางค้างใต้แถบเมนูบนสุด · ตารางกว้างเกินจอ = หน้าเว็บเลื่อนซ้าย-ขวา) ดู CSS "scroll เดียวทั้งหน้า"
export function FitGridWrap({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={"grid-wrap fit " + className}>{children}</div>;
}
