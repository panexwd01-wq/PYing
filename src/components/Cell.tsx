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
}: {
  field: Field;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  locked?: boolean;
  lockHint?: string;
}) {
  // ล็อกจากภายนอก (ยังไม่มี PIC / งาน End แล้ว) -> แสดงแบบอ่านอย่างเดียว
  if (locked && field.type !== "auto") {
    return (
      <div className="cellbox locked-ext" title={lockHint || "ล็อกอยู่"}>
        {field.type === "toggle" ? value || "No" : value || "—"}
      </div>
    );
  }

  switch (field.type) {
    case "auto":
      // ดึงจาก Module อื่น -> read-only (เทา)
      return <div className="cellbox">{value || "—"}</div>;

    case "toggle":
      return (
        <div className="cellbox">
          <Toggle value={value === "Yes"} onChange={(v) => onChange(v ? "Yes" : "No")} />
        </div>
      );

    case "datetime":
      return (
        <div className="cellbox">
          <DateTimePicker value={value} onChange={onChange} />
        </div>
      );

    case "dropdown":
      return (
        <select className="cell" value={value} onChange={(e) => onChange(e.target.value)}>
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <input className="cell" value={value} onChange={(e) => onChange(e.target.value)} />
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
