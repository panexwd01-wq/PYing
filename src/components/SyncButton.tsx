"use client";

import { useState } from "react";
import { SavingOverlay } from "./SavingOverlay";
import { useData } from "./DataProvider";

// ปุ่ม Sync: สร้าง Extra (09) + Accounting queue (10) ตาม Workflow Rules
export function SyncButton() {
  const { reload } = useData();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      setMsg({ text: j.message || "Sync เรียบร้อย" });
      await reload();
    } catch (e: any) {
      setMsg({ text: "Sync ไม่สำเร็จ: " + e.message, err: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SavingOverlay show={busy} message="กำลัง Sync Extra + Accounting…" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button className="btn primary" onClick={run} disabled={busy}>
          ⟳ Sync (Extra + Accounting)
        </button>
        {msg && (
          <span className={"count-pill" + (msg.err ? " err" : "")} style={msg.err ? { color: "#b00" } : undefined}>
            {msg.text}
          </span>
        )}
      </div>
    </>
  );
}
