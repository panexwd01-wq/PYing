"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import { Thai } from "flatpickr/dist/l10n/th.js";
import "flatpickr/dist/flatpickr.css";

const p2 = (n: number) => String(n).padStart(2, "0");

// เก็บค่าเป็น "YYYY-MM-DD HH:mm" หรือ "YYYY-MM-DD" (dateOnly) — แสดงผลเป็นวันที่ไทย (พ.ศ.)
function toStore(d: Date, dateOnly: boolean): string {
  const base = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  return dateOnly ? base : `${base} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

function parseStore(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}

const TH_MONTHS = Thai.months.shorthand as string[];

const RANGE_SEP = " ~ ";

// range: เก็บ "YYYY-MM-DD ~ YYYY-MM-DD" (dateOnly เสมอ)
function parseRange(s: string): Date[] {
  if (!s) return [];
  return s
    .split(RANGE_SEP)
    .map((p) => parseStore(p.trim()))
    .filter((d): d is Date => !!d);
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
  dateOnly = false,
  range = false,
  bg,
  className = "cell",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  dateOnly?: boolean;
  range?: boolean;
  bg?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dOnly = dateOnly || range; // โหมด range เก็บวันที่อย่างเดียว

  useEffect(() => {
    if (!inputRef.current) return;
    const fp = flatpickr(inputRef.current, {
      locale: Thai,
      mode: range ? "range" : "single",
      enableTime: !dOnly,
      time_24hr: true,
      dateFormat: dOnly ? "Y-m-d" : "Y-m-d H:i",
      allowInput: false,
      defaultDate: range ? parseRange(value) : parseStore(value) || undefined,
      formatDate: (date) => {
        const d = `${date.getDate()} ${TH_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
        return dOnly ? d : `${d} ${p2(date.getHours())}:${p2(date.getMinutes())} น.`;
      },
      onChange: (dates) => {
        if (range) {
          // เก็บเมื่อเลือกครบช่วง (2 วัน); เลือกวันเดียว = ยังไม่บันทึก (รอวันปิดช่วง)
          if (dates.length === 2) onChangeRef.current(dates.map((d) => toStore(d, true)).join(RANGE_SEP));
          else if (dates.length === 0) onChangeRef.current("");
        } else {
          onChangeRef.current(dates[0] ? toStore(dates[0], dOnly) : "");
        }
      },
    });
    fpRef.current = fp;
    return () => fp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dOnly, range]);

  // sync เมื่อค่าเปลี่ยนจากภายนอก
  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (range) {
      fp.setDate(parseRange(value), false);
      return;
    }
    const d = parseStore(value);
    const cur = fp.selectedDates[0];
    const same = d && cur && d.getTime() === cur.getTime();
    if (!same) fp.setDate(d || "", false);
  }, [value, range]);

  return (
    <input
      ref={inputRef}
      className={className}
      style={bg ? { background: bg } : undefined}
      placeholder={range ? "เลือกช่วงวันที่" : dOnly ? "เลือกวันที่" : "เลือกวันที่/เวลา"}
      disabled={disabled}
      readOnly
    />
  );
}
