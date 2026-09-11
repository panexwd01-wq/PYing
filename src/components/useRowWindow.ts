"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// วาดแถวเป็นชุด ๆ แทนที่จะวาดทั้งตารางรวดเดียว
// ตารางของระบบนี้มีหลายสิบคอลัมน์ต่อแถว — พอข้อมูลเยอะ การวาดทุกแถวพร้อมกันคือจุดที่หน่วงที่สุด
// ฝั่งเบราว์เซอร์ (ข้อมูลถูกโหลดมาครบแล้ว แค่ยังไม่วาด) · เลื่อนถึงท้ายตารางเมื่อไหร่ค่อยต่อชุดถัดไป
export const ROW_WINDOW_STEP = 60;

export function useRowWindow(total: number, resetKey = "", step = ROW_WINDOW_STEP) {
  const [limit, setLimit] = useState(step);
  const sentinel = useRef<HTMLTableRowElement | null>(null);

  // เปลี่ยนตัวกรอง/การเรียง/โมดูล → เริ่มนับชุดใหม่ (แก้ค่าในช่องไม่นับ — ไม่งั้นตารางเด้งกลับทุกครั้งที่พิมพ์)
  useEffect(() => setLimit(step), [resetKey, step]);

  // เลื่อนใกล้ถึงแถวสุดท้ายที่วาดไว้ → ต่ออีกชุด
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= total) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + step);
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [limit, total, step]);

  const showAll = useCallback(() => setLimit(Number.MAX_SAFE_INTEGER), []);

  return { limit: Math.min(limit, total), hasMore: limit < total, sentinel, showAll };
}
