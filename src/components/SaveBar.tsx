"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// แถบแจ้ง "มีการแก้ไขที่ยังไม่บันทึก" ลอยกลางล่างจอ + ปุ่มบันทึกในตัว
// portal ไป body เพื่อให้ยึดจอเสมอ (ไม่โดน transform ของ page กวน)
export function SaveBar({
  count,
  onSave,
  onCancel,
  saving,
  label = "รายการ",
  offset = 0,
}: {
  count: number;
  onSave: () => void;
  onCancel?: () => void; // ยกเลิกการแก้ไข → กลับเป็นค่าเดิม
  saving: boolean;
  label?: string;
  offset?: number; // ยกสูงขึ้นจากขอบล่าง (px) — กันซ้อนกันเมื่อมีหลายแถบ
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count <= 0) return null;

  return createPortal(
    <div className="save-bar" role="status" style={offset ? { bottom: 22 + offset } : undefined}>
      <span className="save-bar-dot">●</span>
      <span>มีการแก้ไข <b>{count}</b> {label}ที่ยังไม่บันทึก</span>
      {onCancel && (
        <button className="btn" onClick={onCancel} disabled={saving} title="ยกเลิกการแก้ไขทั้งหมด กลับเป็นค่าเดิม">
          ยกเลิก
        </button>
      )}
      <button className="btn primary" onClick={onSave} disabled={saving}>
        บันทึก
      </button>
    </div>,
    document.body
  );
}
