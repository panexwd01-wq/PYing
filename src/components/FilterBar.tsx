"use client";

import { DateTimePicker } from "./DateTimePicker";

export interface Filters {
  year: string;
  month: string;
  range: string; // ช่วงวันที่ "YYYY-MM-DD ~ YYYY-MM-DD" — มีค่า = ใช้แทนปี/เดือน
  status: string;
  cs: string;
  q: string;
}

const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function FilterBar({
  filters,
  setFilters,
  statusOptions,
  csOptions,
  csLabel,
  years,
  showDate,
  showRange = false,
  dateLabel,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  statusOptions: string[];
  csOptions: string[];
  csLabel: string;
  years: string[];
  showDate: boolean;
  showRange?: boolean; // ช่องเลือกช่วงวันที่ (เฉพาะ tab ที่มีวันที่หลักของตัวเอง)
  dateLabel?: string; // ชื่อช่องวันที่ที่ฟิลเตอร์ปี/เดือนยึด (เช่น ETA (IMP))
}) {
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });
  const byRange = showRange && !!filters.range; // เลือกช่วงวันที่แล้ว → ปี/เดือนไม่ถูกนำมาคิด
  const ymTitle = byRange ? "กำลังกรองตามช่วงวันที่ — ล้างช่วงวันที่ก่อนจึงจะใช้ปี/เดือน" : undefined;

  return (
    <>
      {showDate && (
        <>
          <div className="field">
            <label>ปี{dateLabel ? ` — ${dateLabel}` : " (ค.ศ.)"}</label>
            <select value={filters.year} onChange={(e) => set("year", e.target.value)} disabled={byRange} title={ymTitle}>
              <option value="">ทั้งหมด</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} / {Number(y) + 543}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>เดือน</label>
            <select value={filters.month} onChange={(e) => set("month", e.target.value)} disabled={byRange} title={ymTitle}>
              <option value="">ทั้งหมด</option>
              {MONTHS_TH.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, "0")}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {showRange && (
            <div className="field">
              <label>ช่วงวันที่{dateLabel ? ` — ${dateLabel}` : ""}</label>
              <div className="range-filter">
                <DateTimePicker value={filters.range} onChange={(v) => set("range", v)} range className="" />
                {filters.range && (
                  <button type="button" className="range-clear" onClick={() => set("range", "")} title="ล้างช่วงวันที่" aria-label="ล้างช่วงวันที่">
                    ×
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div className="field">
        <label>Status</label>
        <select value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">ทั้งหมด</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {csOptions.length > 0 && (
        <div className="field">
          <label>{csLabel}</label>
          <select value={filters.cs} onChange={(e) => set("cs", e.target.value)}>
            <option value="">ทั้งหมด</option>
            {csOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field grow">
        <label>ค้นหา (ทุกช่อง)</label>
        <input
          value={filters.q}
          placeholder="พิมพ์เพื่อค้นหาจากทุกคอลัมน์…"
          onChange={(e) => set("q", e.target.value)}
        />
      </div>
    </>
  );
}
