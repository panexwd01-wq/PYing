"use client";

import { useMemo, useState } from "react";
import { Field } from "@/lib/fields";
import { Lists } from "@/lib/types";
import { Cell } from "./Cell";

// ===== แถบแก้หลายแถวพร้อมกัน (ขาออก ข้อ 7) =====
// ติ๊กเลือกแถวในตาราง → เลือกช่องที่จะแก้ → ใส่ค่าครั้งเดียว → ลงให้ทุกแถวที่เลือก
// ยังไม่เขียนลงชีททันที — ค่าที่ใส่จะไปอยู่ในรายการ "รอบันทึก" เหมือนแก้เองทีละช่อง
export function BulkEditBar({
  fields,
  lists,
  count,
  onApply,
  onClear,
}: {
  fields: Field[];
  lists: Lists;
  count: number;
  onApply: (key: string, value: string) => void;
  onClear: () => void;
}) {
  // แก้ได้เฉพาะช่องที่กรอกเองได้ (ไม่เอา auto / ช่องซ่อน / ช่องระบบ)
  const editable = useMemo(
    () => fields.filter((f) => !f.hidden && !f.internal && f.type !== "auto"),
    [fields]
  );
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const field = editable.find((f) => f.key === key);

  const apply = () => {
    if (!field) return;
    onApply(field.key, value);
    setValue("");
  };

  return (
    <div className="bulk-bar">
      <b>เลือกไว้ {count} แถว</b>
      <div className="field">
        <label>ช่องที่จะแก้</label>
        <select
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setValue("");
          }}
        >
          <option value="">— เลือกช่อง —</option>
          {editable.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field bulk-value">
        <label>ค่าใหม่</label>
        {field ? (
          <Cell
            field={field}
            value={value}
            options={field.list ? lists[field.list] || [] : []}
            onChange={setValue}
          />
        ) : (
          <input value="" placeholder="เลือกช่องก่อน" readOnly />
        )}
      </div>
      <button className="btn primary" onClick={apply} disabled={!field}>
        ใส่ให้ทุกแถวที่เลือก
      </button>
      <button className="btn" onClick={onClear}>
        ล้างการเลือก
      </button>
      <span className="muted" style={{ fontSize: 12 }}>
        ใส่แล้วยังไม่บันทึก — กด “บันทึก” ด้านล่างอีกครั้ง
      </span>
    </div>
  );
}
