"use client";

import { Spinner } from "./Spinner";

// Overlay ระหว่างบันทึก — คลุมทั้งจอเพื่อกันผู้ใช้ปิด/ออกก่อนบันทึกเสร็จ
export function SavingOverlay({
  show,
  message = "กำลังบันทึก…",
}: {
  show: boolean;
  message?: string;
}) {
  if (!show) return null;
  return (
    <div className="overlay" role="alertdialog" aria-busy="true">
      <div className="card">
        <Spinner size="lg" />
        <div className="msg">{message}</div>
        <div className="sub">กรุณาอย่าปิดหน้าจอจนกว่าจะบันทึกเสร็จ</div>
      </div>
    </div>
  );
}
