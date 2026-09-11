"use client";

// ปุ่ม Export / Import .xlsx ของโมดูล + โซนลากไฟล์มาวาง (โยนไฟล์ตรงไหนของหน้าก็ได้)
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SavingOverlay } from "@/components/SavingOverlay";
import { ImportResult } from "@/lib/xlsxSchema";

interface Props {
  moduleKey: string;
  moduleLabel: string;
  canImport: boolean;
  onDone: (snapshot?: unknown) => void | Promise<void>; // รับ snapshot ที่ API แนบมาหลัง import
  flash: (msg: string, err?: boolean) => void;
  dropzone?: boolean; // รับไฟล์ที่ลากมาวางทั้งหน้า — เปิดได้ตัวเดียวต่อหน้า (หน้าที่มีหลายตารางให้ใช้ปุ่มแทน)
}

// หน้าไหนมี XlsxIO หลายตัว (เช่นหน้า Rates = Cost + Sell) ต้องมีตัวเดียวที่รับไฟล์ที่ลากมาวาง
// ไม่งั้นไฟล์เดียวจะถูกอัปโหลดซ้ำไปคนละโมดูล
let dropOwner: string | null = null;

export function XlsxIO({ moduleKey, moduleLabel, canImport, onDone, flash, dropzone = true }: Props) {
  const [busy, setBusy] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const exportFile = () => {
    setBusy("กำลังสร้างไฟล์ .xlsx…");
    // ให้เบราว์เซอร์โหลดไฟล์เอง (route ส่ง Content-Disposition มาแล้ว)
    const a = document.createElement("a");
    a.href = `/api/xlsx?module=${encodeURIComponent(moduleKey)}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => setBusy(""), 1200);
  };

  const upload = useCallback(
    async (file: File) => {
      if (!canImport) return;
      if (!/\.xlsx$/i.test(file.name)) {
        flash("รองรับเฉพาะไฟล์ .xlsx (ไฟล์ที่กด Export ออกไป)", true);
        return;
      }
      setBusy(`กำลังนำเข้า ${file.name}…`);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`/api/xlsx?module=${encodeURIComponent(moduleKey)}`, { method: "POST", body: fd });
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        setResult(j as ImportResult);
        if (j.created || j.updated) await onDone(j.snapshot);
      } catch (e) {
        flash("นำเข้าไม่สำเร็จ: " + (e as Error).message, true);
      } finally {
        setBusy("");
      }
    },
    [canImport, flash, moduleKey, onDone]
  );

  // ลากไฟล์มาวางตรงไหนของหน้าก็ได้
  useEffect(() => {
    if (!canImport || !dropzone) return;
    if (dropOwner && dropOwner !== moduleKey) return; // มีตารางอื่นรับไฟล์อยู่แล้ว
    dropOwner = moduleKey;
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFile(e)) return;
      dragDepth.current++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFile(e)) e.preventDefault(); // ไม่กันไว้ เบราว์เซอร์จะเปิดไฟล์แทน
    };
    const onLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) void upload(f);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      if (dropOwner === moduleKey) dropOwner = null;
    };
  }, [canImport, dropzone, moduleKey, upload]);

  return (
    <>
      <button className="btn" onClick={exportFile} title={`ดาวน์โหลดข้อมูล ${moduleLabel} เป็นไฟล์ Excel`}>
        ⬇ Export .xlsx
      </button>
      {canImport && (
        <>
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
            title="เลือกไฟล์ .xlsx เพื่อนำเข้า (หรือลากไฟล์มาวางบนหน้านี้ได้เลย)"
          >
            ⬆ Import .xlsx
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
              if (f) void upload(f);
            }}
          />
        </>
      )}

      <SavingOverlay show={!!busy} message={busy} />

      {dragging &&
        createPortal(
          <div className="drop-zone">
            <div className="drop-box">
              <div className="drop-ic">⬆</div>
              <b>วางไฟล์ .xlsx ที่นี่เพื่อนำเข้า {moduleLabel}</b>
              <span className="muted">แถวที่ Job No. ตรงกับงานเดิม = อัปเดตทับ · ช่องสีเทา (auto) ระบบคำนวณเอง</span>
            </div>
          </div>,
          document.body
        )}

      {result &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setResult(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>ผลการนำเข้า — {moduleLabel}</h3>
              <div className="imp-sum">
                <span className="imp-pill ok">อัปเดต {result.updated}</span>
                <span className="imp-pill ok">เพิ่มใหม่ {result.created}</span>
                <span className={"imp-pill" + (result.skipped.length ? " warn" : "")}>ข้าม {result.skipped.length}</span>
              </div>
              {result.unknownColumns.length > 0 && (
                <p className="muted" style={{ fontSize: 12 }}>
                  คอลัมน์ที่ระบบไม่รู้จัก (ข้ามไป): {result.unknownColumns.join(", ")}
                </p>
              )}
              {result.skipped.length > 0 && (
                <div className="grid-wrap" style={{ maxHeight: 320 }}>
                  <table className="view-table">
                    <thead>
                      <tr className="field-row"><th>แถวในไฟล์</th><th>Job No.</th><th>เหตุผลที่ข้าม</th></tr>
                    </thead>
                    <tbody>
                      {result.skipped.map((s, i) => (
                        <tr key={i}><td>{s.row}</td><td>{s.ident}</td><td>{s.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!result.skipped.length && <p className="muted">นำเข้าครบทุกแถวในไฟล์</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn primary" onClick={() => setResult(null)}>ปิด</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
