"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Field } from "@/lib/schema";
import { formatIfDate } from "@/lib/dateFormat";
import { ColorTag, colorLabel } from "@/lib/prefs";
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
  palette,
  pickedColor,
  onColorPick,
}: {
  field: Field;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  locked?: boolean;
  lockHint?: string;
  bg?: string; // สีพื้น (จาก cellRules)
  palette?: ColorTag[]; // ชุดสีกลาง (ปุ่มเลือกสีข้างช่อง)
  pickedColor?: string; // สีที่แถวนี้เลือกไว้
  onColorPick?: (color: string) => void;
}) {
  const bgStyle = bg ? { background: bg } : undefined;

  // ล็อกจากภายนอก (ยังไม่มี PIC / งาน End / Cancel / SI-VGM Done) -> แสดงแบบอ่านอย่างเดียว
  if (locked && field.type !== "auto") {
    return (
      <div className="cellbox locked-ext" style={bgStyle} title={lockHint || "ล็อกอยู่"}>
        {field.type === "toggle" ? value || "No" : formatIfDate(value, field.dateOnly) || "—"}
      </div>
    );
  }

  switch (field.type) {
    case "auto":
      // ดึงจาก Module อื่น -> read-only (เทา) — แต่ยังระบายสี cue ได้ (เช่น Entry Status แดง)
      return (
        <div className="cellbox" style={bgStyle} title={value}>
          {formatIfDate(value, field.dateOnly) || "—"}
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
        <div className="cellbox" style={bgStyle}>
          <DateTimePicker value={value} onChange={onChange} range={field.range} dateOnly={field.dateOnly} bg={bg} />
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
      // text — ถ้าช่องนี้เลือกสีได้ แสดงปุ่มสีข้างช่อง (เลือกจากชุดสีกลาง)
      if (field.colorPick && onColorPick) {
        return (
          <div className="cell-color-wrap">
            <input className="cell" style={bgStyle} title={value} value={value} onChange={(e) => onChange(e.target.value)} />
            <ColorPickButton palette={palette} value={pickedColor || ""} onPick={onColorPick} />
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

// ปุ่มเลือกสีข้างช่อง — เลือกจาก "ชุดสีกลาง" ที่ตั้งความหมายไว้ในหน้าตั้งค่า
// เมนูต้องลอยออกนอกตาราง (portal + position: fixed) — ถ้าวางไว้ใน <td> จะโดน
//   1) ช่อง sticky (Job No.) ของแถวล่างทับ เพราะ td sticky มี z-index ของตัวเอง
//   2) กรอบตาราง (overflow: auto) ตัดทิ้ง ตอนอยู่ขอบซ้าย/แถวล่าง ๆ
function ColorPickButton({
  palette,
  value,
  onPick,
}: {
  palette?: ColorTag[];
  value: string;
  onPick: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const tags = palette && palette.length ? palette : [];

  // คลิกที่อื่น = ปิดเมนู · เลื่อนตาราง/ย่อขยายหน้าจอ = ปิด (ตำแหน่งจะไม่ตรงปุ่มแล้ว)
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const close = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", off);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", off);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // วางเมนูใต้ปุ่ม — ถ้าล้นขอบล่างให้พลิกขึ้น · ล้นซ้าย/ขวาให้เลื่อนเข้ามาในจอ
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = boxRef.current?.getBoundingClientRect();
    const pop = popRef.current;
    if (!btn || !pop) return;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const gap = 4;
    let top = btn.bottom + gap;
    if (top + h > window.innerHeight - 8 && btn.top - gap - h >= 8) top = btn.top - gap - h;
    const left = Math.max(8, Math.min(btn.left, window.innerWidth - w - 8));
    setPos({ top, left });
  }, [open, tags.length]);

  const label = colorLabel(palette, value);

  return (
    <div className="color-pop-wrap" ref={boxRef}>
      <button
        type="button"
        className="color-btn"
        style={value ? { background: value } : undefined}
        onClick={() => setOpen((v) => !v)}
        title={label ? `สี: ${label}` : "เลือกสีเพื่อทำเครื่องหมาย"}
        aria-label="เลือกสี"
      />
      {open &&
        createPortal(
          // ยังไม่รู้ตำแหน่ง (รอบแรกที่วัดขนาด) → วางไว้นอกจอก่อน ไม่ให้กระพริบที่มุมซ้ายบน
          <div className="color-pop" ref={popRef} style={pos || { top: -9999, left: -9999 }}>
            {tags.length === 0 && <div className="color-pop-empty">ยังไม่ได้ตั้งชุดสี — ตั้งได้ที่หน้า “ตั้งค่า”</div>}
            {tags.map((t) => (
              <button
                type="button"
                key={t.color}
                className={"color-pop-item" + (t.color.toLowerCase() === value.toLowerCase() ? " on" : "")}
                onClick={() => {
                  onPick(t.color);
                  setOpen(false);
                }}
              >
                <span className="sw" style={{ background: t.color }} />
                <span>{t.label || t.color}</span>
              </button>
            ))}
            <button
              type="button"
              className="color-pop-item clear"
              onClick={() => {
                onPick("");
                setOpen(false);
              }}
            >
              <span className="sw none" />
              <span>เอาสีออก</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
