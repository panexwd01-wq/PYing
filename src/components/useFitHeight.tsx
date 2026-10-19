"use client";

import { ReactNode, useEffect, useRef } from "react";

// ตารางหลักของหน้า: ยืด/หดกรอบตารางให้ขอบล่างพอดีขอบล่างจอ → หน้าเว็บไม่ต้องเลื่อน เหลือ scroll เดียวคือในตาราง
// (หัวตารางค้างบนสุด · แถบเลื่อนแนวนอนอยู่ติดขอบล่างจอเสมอ ไม่ต้องเลื่อนหน้าลงไปหา)
// วัดจากขอบล่างของ .page จริง ไม่เดาความสูง toolbar/legend ด้านบน (พับบรรทัดต่างกันตามขนาดจอ)
// และของที่โผล่ใต้ตาราง (แถบแก้หลายแถว) ก็ถูกหักออกให้เอง
const MIN_H = 260; // จอเตี้ยมาก — ยอมให้หน้าเลื่อนดีกว่าตารางเหลือนิดเดียว

export function useFitHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const page = (el.closest(".page") as HTMLElement | null) || document.body;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // ที่ว่าง (บวก) หรือส่วนที่ล้นจอ (ลบ) ใต้ขอบล่างของหน้า
        const slack = window.innerHeight - (page.getBoundingClientRect().bottom + window.scrollY);
        const next = Math.max(MIN_H, Math.floor(el.offsetHeight + slack));
        if (el.style.maxHeight !== next + "px") el.style.maxHeight = next + "px";
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(page);
    window.addEventListener("resize", fit);
    page.addEventListener("animationend", fit); // หน้า fade-in ขยับตำแหน่งตอนเปิด — วัดใหม่เมื่อนิ่ง
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", fit);
      page.removeEventListener("animationend", fit);
    };
  }, []);

  return ref;
}

// กรอบตาราง (.grid-wrap) ที่ยืดพอดีจอ — ใช้แทน <div className="grid-wrap"> ในหน้าที่มีตารางหลักตารางเดียว
export function FitGridWrap({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useFitHeight<HTMLDivElement>();
  return (
    <div ref={ref} className={"grid-wrap fit " + className}>
      {children}
    </div>
  );
}
