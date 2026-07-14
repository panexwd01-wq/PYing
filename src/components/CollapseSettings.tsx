"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Field } from "@/lib/fields";

// ป็อปอัปตั้งค่า "คอลัมน์ตอนย่อ" ของโมดูลนี้ (ค่าส่วนกลาง — มีผลกับทุกคน)
export function CollapseSettings({
  moduleLabel,
  fields,
  defaultKeys,
  currentKeys,
  fullConfig,
  moduleKey,
  onClose,
  onSaved,
}: {
  moduleLabel: string;
  fields: Field[];
  defaultKeys: string[]; // คอลัมน์สำคัญเดิม (จาก schema)
  currentKeys: string[]; // ที่ใช้อยู่ตอนนี้
  fullConfig: Record<string, string[]>; // config ทั้งหมด (ทุกโมดูล)
  moduleKey: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(currentKeys.length ? currentKeys : defaultKeys));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const f of fields) if (!seen.includes(f.group)) seen.push(f.group);
    return seen;
  }, [fields]);

  const toggle = (k: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const save = async (keys: string[] | null) => {
    setSaving(true);
    setErr("");
    try {
      const next = { ...fullConfig };
      if (keys === null) delete next[moduleKey]; // reset = กลับไปใช้ default
      else next[moduleKey] = keys;
      const r = await fetch("/api/collapse", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collapse: next }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const doSave = () => {
    const keys = fields.filter((f) => sel.has(f.key)).map((f) => f.key); // คงลำดับตาม schema
    if (!keys.length) {
      setErr("ต้องเลือกอย่างน้อย 1 คอลัมน์");
      return;
    }
    save(keys);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal collapse-settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>ตั้งค่าคอลัมน์ตอนย่อ — {moduleLabel}</h3>
          <button className="btn sm ghost" onClick={onClose}>✕</button>
        </div>
        <p className="muted" style={{ margin: "0 0 10px" }}>
          เลือกคอลัมน์ที่จะแสดงตอน “ย่อ” (ที่เหลือกดกางดูได้) — ค่านี้ใช้ร่วมกันทุกคน · เลือกแล้ว <b>{sel.size}</b> คอลัมน์
        </p>
        {err && <div className="cs-err">{err}</div>}
        <div className="cs-groups">
          {groups.map((g) => (
            <div className="cs-group" key={g}>
              <div className="cs-group-title">{g}</div>
              <div className="cs-fields">
                {fields.filter((f) => f.group === g).map((f) => (
                  <label className={"cs-item" + (sel.has(f.key) ? " on" : "")} key={f.key}>
                    <input type="checkbox" checked={sel.has(f.key)} onChange={() => toggle(f.key)} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => save(null)} disabled={saving} title="กลับไปใช้คอลัมน์สำคัญเริ่มต้น">
            รีเซ็ตเป็นค่าเริ่มต้น
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose} disabled={saving}>ยกเลิก</button>
          <button className="btn primary" onClick={doSave} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
