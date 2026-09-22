"use client";

export interface Filters {
  year: string;
  month: string;
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
  dateLabel,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  statusOptions: string[];
  csOptions: string[];
  csLabel: string;
  years: string[];
  showDate: boolean;
  dateLabel?: string; // ชื่อช่องวันที่ที่ฟิลเตอร์ปี/เดือนยึด (เช่น ETA (IMP))
}) {
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <>
      {showDate && (
        <>
          <div className="field">
            <label>ปี{dateLabel ? ` — ${dateLabel}` : " (ค.ศ.)"}</label>
            <select value={filters.year} onChange={(e) => set("year", e.target.value)}>
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
            <select value={filters.month} onChange={(e) => set("month", e.target.value)}>
              <option value="">ทั้งหมด</option>
              {MONTHS_TH.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, "0")}>
                  {m}
                </option>
              ))}
            </select>
          </div>
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
