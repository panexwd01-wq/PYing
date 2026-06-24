"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Thai } from "flatpickr/dist/l10n/th.js";
import "flatpickr/dist/flatpickr.css";

// เก็บค่าเป็น "YYYY-MM-DD HH:mm" (24h) แต่แสดงผลเป็นวันที่ไทย (พ.ศ.)
function toStore(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

function parseStore(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

const TH_MONTHS = Thai.months.shorthand as string[];

export function DateTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    const fp = flatpickr(inputRef.current, {
      locale: Thai,
      enableTime: true,
      time_24hr: true, // เวลาแบบ 24 ชั่วโมง
      dateFormat: "Y-m-d H:i",
      allowInput: false,
      defaultDate: parseStore(value) || undefined,
      // แสดงผลเป็นวันที่ไทย + ปี พ.ศ.
      formatDate: (date) => {
        const d = `${date.getDate()} ${TH_MONTHS[date.getMonth()]} ${
          date.getFullYear() + 543
        }`;
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d} ${p(date.getHours())}:${p(date.getMinutes())} น.`;
      },
      onChange: (dates) => {
        onChangeRef.current(dates[0] ? toStore(dates[0]) : "");
      },
    });
    fpRef.current = fp;
    return () => fp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync เมื่อค่าเปลี่ยนจากภายนอก
  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    const d = parseStore(value);
    const cur = fp.selectedDates[0];
    const same = d && cur && d.getTime() === cur.getTime();
    if (!same) fp.setDate(d || "", false);
  }, [value]);

  return (
    <input
      ref={inputRef}
      className="cell"
      placeholder="เลือกวันที่/เวลา"
      disabled={disabled}
      readOnly
    />
  );
}
