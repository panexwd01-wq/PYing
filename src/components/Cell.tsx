"use client";

import { useState } from "react";
import { Field } from "@/lib/schema";
import { Toggle } from "./Toggle";
import { DateTimePicker } from "./DateTimePicker";

export function Cell({
  field,
  value,
  options,
  onChange,
  locked,
  lockHint,
  bg,
  onColorCycle,
}: {
  field: Field;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  locked?: boolean;
  lockHint?: string;
  bg?: string; // สีพื้น (จาก cellRules)
  onColorCycle?: () => void; // ปุ่มสลับสี (MBL)
}) {
  const bgStyle = bg ? { background: bg } : undefined;

  // ล็อกจากภายนอก (ยังไม่มี PIC / งาน End / Cancel / SI-VGM Done) -> แสดงแบบอ่านอย่างเดียว
  if (locked && field.type !== "auto") {
    return (
      <div className="cellbox locked-ext" style={bgStyle} title={lockHint || "ล็อกอยู่"}>
        {field.type === "toggle" ? value || "No" : value || "—"}
      </div>
    );
  }

  switch (field.type) {
    case "auto":
      // ดึงจาก Module อื่น -> read-only (เทา) — แต่ยังระบายสี cue ได้ (เช่น Entry Status แดง)
      return (
        <div className="cellbox" style={bgStyle} title={value}>
          {value || "—"}
        </div>
      );

    case "toggle":
      return (
        <div className="cellbox" style={bgStyle}>
          <Toggle value={value === "Yes"} onChange={(v) => onChange(v ? "Yes" : "No")} />
        </div>
      );

    case "datetime":
      return (
        <div className="cellbox">
          <DateTimePicker value={value} onChange={onChange} range={field.range} bg={bg} />
        </div>
      );

    case "dropdown":
      return (
        <select className="cell" style={bgStyle} title={value} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {/* คงค่าที่เคยบันทึกไว้ แม้จะถูกลบออกจาก list แล้ว */}
          {value && !options.includes(value) && <option value={value}>{value}</option>}
        </select>
      );

    case "multiselect":
      return <MultiSelectCell value={value} options={options} onChange={onChange} />;

    case "number":
      return (
        <input
          className="cell"
          type="number"
          style={bgStyle}
          title={value}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      // text — ถ้ามีปุ่มสลับสี (MBL) แสดงปุ่มสีข้างช่อง
      if (field.colorToggle && onColorCycle) {
        return (
          <div className="cell-color-wrap">
            <input className="cell" style={bgStyle} title={value} value={value} onChange={(e) => onChange(e.target.value)} />
            <button
              type="button"
              className="color-btn"
              style={bg ? { background: bg } : undefined}
              onClick={onColorCycle}
              title="สลับสี: ชมพู=รอลูกค้าจ่ายภาษี / เขียว=รอเงินมัดจำกับสายเรือ"
              aria-label="สลับสี"
            />
          </div>
        );
      }
      return (
        <input className="cell" style={bgStyle} title={value} value={value} onChange={(e) => onChange(e.target.value)} />
      );
  }
}

function MultiSelectCell({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const selected = value ? value.split(" | ").filter(Boolean) : [];
  const remaining = options.filter((o) => !selected.includes(o));

  const remove = (o: string) => onChange(selected.filter((s) => s !== o).join(" | "));
  const add = (o: string) => {
    if (o) onChange([...selected, o].join(" | "));
    setAdding(false);
  };

  return (
    <div className="chips">
      {selected.map((s) => (
        <span className="chip" key={s}>
          {s}
          <button type="button" onClick={() => remove(s)} aria-label="ลบ">
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <select
          className="cell"
          autoFocus
          style={{ width: "auto", minWidth: 120 }}
          onChange={(e) => add(e.target.value)}
          onBlur={() => setAdding(false)}
          defaultValue=""
        >
          <option value="">เลือก…</option>
          {remaining.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        remaining.length > 0 && (
          <button type="button" className="chips-add" onClick={() => setAdding(true)}>
            + เพิ่ม
          </button>
        )
      )}
    </div>
  );
}
