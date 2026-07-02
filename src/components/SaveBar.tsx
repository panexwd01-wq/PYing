"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// แถบแจ้ง "มีการแก้ไขที่ยังไม่บันทึก" ลอยกลางล่างจอ + ปุ่มบันทึกในตัว
// portal ไป body เพื่อให้ยึดจอเสมอ (ไม่โดน transform ของ page กวน)
export function SaveBar({
  count,
  onSave,
  saving,
  label = "รายการ",
}: {
  count: number;
  onSave: () => void;
  saving: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count <= 0) return null;

  return createPortal(
    <div className="save-bar" role="status">
      <span className="save-bar-dot">●</span>
      <span>มีการแก้ไข <b>{count}</b> {label}ที่ยังไม่บันทึก</span>
      <button className="btn primary" onClick={onSave} disabled={saving}>
        บันทึก
      </button>
    </div>,
    document.body
  );
}
