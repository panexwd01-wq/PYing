"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./Spinner";

// Overlay ระหว่างบันทึก — portal ไปที่ body เพื่อให้คลุมเต็มจอเสมอ
// (กันปัญหา ancestor ที่มี transform/animation ทำให้ position:fixed เพี้ยน)
export function SavingOverlay({
  show,
  message = "กำลังบันทึก…",
}: {
  show: boolean;
  message?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!show || !mounted) return null;

  return createPortal(
    <div className="overlay" role="alertdialog" aria-busy="true">
      <div className="card">
        <Spinner size="lg" />
        <div className="msg">{message}</div>
        <div className="sub">กรุณาอย่าปิดหน้าจอจนกว่าจะบันทึกเสร็จ</div>
      </div>
    </div>,
    document.body
  );
}
