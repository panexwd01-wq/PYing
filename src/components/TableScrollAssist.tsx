"use client";

import { useEffect, useRef } from "react";

// ตัวช่วยการเลื่อนของตารางหลัก (.grid-wrap.fit / .flow) — ดู CSS "การเลื่อนตาราง"
// กรอบตารางเลื่อนซ้าย-ขวาเองได้ จึงเป็นกรอบ scroll ของตัวเอง → CSS sticky ทำให้หัวตารางค้างเทียบกับหน้าเว็บไม่ได้
//   1) หัวตารางค้างใต้แถบเมนู: ทุกครั้งที่เลื่อนหน้า คำนวณว่าหัวตารางต้องถูกดันลงกี่ px (--hdr) ใส่ที่ thead
//      (ใส่ที่ thead ไม่ใส่ที่กรอบ — ไม่ให้ตารางที่ซ้อนอยู่ข้างในรับค่าไปด้วย และไม่ต้องคำนวณสไตล์ทั้งตารางใหม่)
//   2) แถบเลื่อนซ้าย-ขวาของกรอบอยู่ท้ายตาราง — ถ้าตารางยาวจนมองไม่เห็น โชว์แถบเลื่อนแทนลอยที่ขอบล่างจอ
export function TableScrollAssist() {
  const proxyRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const proxy = proxyRef.current;
    const inner = innerRef.current;
    if (!proxy || !inner) return;
    let raf = 0;
    let target: HTMLElement | null = null;

    const update = () => {
      raf = 0;
      const headerH = (document.querySelector(".app-header") as HTMLElement | null)?.offsetHeight || 0;
      const vh = window.innerHeight;
      let next: HTMLElement | null = null;
      for (const wrap of Array.from(document.querySelectorAll<HTMLElement>(".grid-wrap.fit, .grid-wrap.flow"))) {
        const r = wrap.getBoundingClientRect();
        const thead = wrap.querySelector<HTMLElement>(":scope > table > thead");
        if (thead) {
          const shift = Math.max(0, Math.round(headerH - r.top)) + "px";
          if (thead.style.getPropertyValue("--hdr") !== shift) thead.style.setProperty("--hdr", shift);
        }
        // ตารางกว้างเกินกรอบ + เห็นตารางอยู่บนจอ แต่ขอบล่าง (ที่แถบเลื่อนจริงอยู่) เลยจอไปแล้ว
        if (!next && wrap.scrollWidth > wrap.clientWidth + 1 && r.top < vh - 40 && r.bottom > vh) next = wrap;
      }
      target = next;
      if (!next) {
        proxy.style.display = "none";
        return;
      }
      const r = next.getBoundingClientRect();
      proxy.style.display = "block";
      proxy.style.left = r.left + next.clientLeft + "px";
      proxy.style.width = next.clientWidth + "px";
      inner.style.width = next.scrollWidth + "px";
      if (Math.abs(proxy.scrollLeft - next.scrollLeft) > 1) proxy.scrollLeft = next.scrollLeft;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // ลากแถบเลื่อนแทน → เลื่อนกรอบตารางจริงตาม
    const onProxyScroll = () => {
      if (target && Math.abs(target.scrollLeft - proxy.scrollLeft) > 1) target.scrollLeft = proxy.scrollLeft;
    };

    // capture: จับทั้งการเลื่อนหน้า และการเลื่อนซ้าย-ขวาในกรอบตาราง
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    proxy.addEventListener("scroll", onProxyScroll);
    // ตารางวาดแถวเพิ่ม / เปลี่ยนตัวกรอง / ซ่อน-แสดงคอลัมน์ / สลับ tab
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      proxy.removeEventListener("scroll", onProxyScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div className="hscroll-proxy" ref={proxyRef} style={{ display: "none" }} aria-hidden="true">
      <div ref={innerRef} />
    </div>
  );
}
