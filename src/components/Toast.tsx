"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// แจ้งเตือน: ปกติ = มุมขวาล่าง, error = กลางจอ (ไม่จมไปด้านบน/ไม่โดน header บัง)
// portal ไป body เสมอ เพื่อให้ยึดจอจริง (ไม่โดน transform ของ page ทำให้ fixed เพี้ยน)
export function Toast({
  text,
  err,
  onClose,
}: {
  text: string;
  err?: boolean;
  onClose?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const node = err ? (
    <div className="toast-center-wrap" role="alert">
      <div className="toast err">
        <span className="toast-ico">!</span>
        <span className="toast-text">{text}</span>
        {onClose && (
          <button className="toast-close" onClick={onClose} title="ปิด" aria-label="ปิด">
            ✕
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="toast" role="status">
      {text}
    </div>
  );

  return createPortal(node, document.body);
}
