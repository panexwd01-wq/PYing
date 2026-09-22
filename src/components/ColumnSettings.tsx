"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Field } from "@/lib/fields";
import { ModulePrefs } from "@/lib/prefs";

// ป็อปอัปตั้งค่าคอลัมน์ของ tab นี้ — **ของบัญชีตัวเองเท่านั้น** (ขาออก ข้อ 3 + 8, ขาเข้า ข้อ 8)
//   • ติ๊กเลือกว่าตอน "ย่อ" จะโชว์คอลัมน์ไหน
//   • ลาก ≡ เพื่อสลับว่าคอลัมน์ไหนอยู่หน้า/อยู่หลัง (มีผลทั้งโหมดย่อและโหมดเต็ม)
//   • ความกว้างที่ลากไว้ในตารางก็เก็บรวมอยู่ในค่าชุดเดียวกัน
// admin ที่มีสิทธิ์แก้ Dropdown ยังตั้ง "ค่าเริ่มต้นของทุกคน" ได้จากปุ่มล่างซ้าย
export function ColumnSettings({
  moduleLabel,
  moduleKey,
  fields: allFields,
  defaultKeys,
  sharedKeys,
  fullConfig,
  prefs,
  canSetShared,
  onClose,
  onSavedPrefs,
  onSavedShared,
}: {
  moduleLabel: string;
  moduleKey: string;
  fields: Field[]; // เรียงตามลำดับที่ใช้อยู่จริงแล้ว (ผ่าน applyColumnPrefs มาแล้ว)
  defaultKeys: string[]; // คอลัมน์สำคัญตั้งต้นจาก schema
  sharedKeys: string[]; // ค่าส่วนกลางที่ admin ตั้งไว้
  fullConfig: Record<string, string[]>; // ค่าส่วนกลางทุกโมดูล (ใช้ตอนบันทึกทับ)
  prefs?: ModulePrefs; // ค่าของบัญชีนี้
  canSetShared: boolean;
  onClose: () => void;
  onSavedPrefs: (next: ModulePrefs) => void;
  onSavedShared: (snapshot?: unknown) => Promise<void> | void;
}) {
  const fields = useMemo(() => allFields.filter((f) => !f.hidden), [allFields]);
  const startKeys = prefs?.collapse?.length ? prefs.collapse : sharedKeys.length ? sharedKeys : defaultKeys;

  const [sel, setSel] = useState<Set<string>>(new Set(startKeys));
  const [order, setOrder] = useState<string[]>(fields.map((f) => f.key));
  const [drag, setDrag] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const byKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const rows = useMemo(() => order.map((k) => byKey.get(k)).filter(Boolean) as Field[], [order, byKey]);

  const toggle = (k: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
  };

  // บันทึกของบัญชีตัวเอง — เก็บความกว้างที่ลากไว้เดิมต่อไป
  const savePrefs = async (reset = false) => {
    const keys = order.filter((k) => sel.has(k));
    if (!reset && !keys.length) {
      setErr("ต้องเลือกอย่างน้อย 1 คอลัมน์");
      return;
    }
    const value: ModulePrefs = reset
      ? { order: [], widths: {}, collapse: [] }
      : { order, widths: prefs?.widths || {}, collapse: keys };
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: { module: moduleKey, value } }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      onSavedPrefs(value);
      onClose();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  // ตั้งเป็นค่าเริ่มต้นของทุกคน (เฉพาะคนที่มีสิทธิ์) — คนที่ตั้งค่าส่วนตัวไว้แล้วยังใช้ของตัวเองเหมือนเดิม
  const saveShared = async () => {
    const keys = order.filter((k) => sel.has(k));
    if (!keys.length) {
      setErr("ต้องเลือกอย่างน้อย 1 คอลัมน์");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/collapse", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collapse: { ...fullConfig, [moduleKey]: keys } }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await onSavedShared(r.snapshot);
      onClose();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal collapse-settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>ตั้งค่าคอลัมน์ — {moduleLabel}</h3>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>
        <p className="muted" style={{ margin: "0 0 10px" }}>
          ติ๊ก = โชว์ตอน “ย่อ” · ลาก <b>≡</b> เพื่อสลับหน้า/หลัง · ค่านี้เป็น<b>ของบัญชีนี้คนเดียว</b> ไม่กระทบหน้าจอคนอื่น ·
          เลือกแล้ว <b>{sel.size}</b> คอลัมน์
        </p>
        {err && <div className="cs-err">{err}</div>}
        <div className="col-order-list">
          {rows.map((f, i) => (
            <div
              className={"col-order-item" + (drag === i ? " dragging" : "") + (sel.has(f.key) ? " on" : "")}
              key={f.key}
              onDragOver={(e) => drag !== null && e.preventDefault()}
              onDrop={() => {
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
            >
              <span
                className="drag-handle"
                draggable
                onDragStart={() => setDrag(i)}
                onDragEnd={() => setDrag(null)}
                title="ลากเพื่อจัดลำดับ"
              >
                ≡
              </span>
              <label className="col-order-label">
                <input type="checkbox" checked={sel.has(f.key)} onChange={() => toggle(f.key)} />
                <span>{f.label}</span>
              </label>
              <span className="col-order-group">{f.group}</span>
              <span className="col-order-move">
                <button className="btn sm" onClick={() => move(i, i - 1)} disabled={i === 0} title="เลื่อนขึ้น">↑</button>
                <button className="btn sm" onClick={() => move(i, i + 1)} disabled={i === rows.length - 1} title="เลื่อนลง">↓</button>
              </span>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          {canSetShared && (
            <button className="btn" onClick={saveShared} disabled={saving} title="ตั้งเป็นค่าเริ่มต้นให้คนที่ยังไม่ได้ตั้งค่าเอง">
              ตั้งเป็นค่าเริ่มต้นของทุกคน
            </button>
          )}
          <button className="btn" onClick={() => savePrefs(true)} disabled={saving} title="ล้างค่าของบัญชีนี้ กลับไปใช้ค่าเริ่มต้น">
            รีเซ็ตของฉัน
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn primary" onClick={() => savePrefs()} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก (เฉพาะฉัน)"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
