"use client";

import { useCallback, useMemo, useState } from "react";
import { nextSort, sortRows, SortState } from "@/lib/sort";

// เวลาที่ลากขอบคอลัมน์ (ยืด/หด) เสร็จล่าสุด — ปล่อยเมาส์แล้วเบราว์เซอร์ยิง click ที่หัวคอลัมน์ต่อ
// ต้องไม่นับเป็นการกดเรียง
let resizedAt = 0;
export const markColumnResized = () => {
  resizedAt = Date.now();
};

// ลูกศรบอกทิศที่หัวคอลัมน์ (ยังไม่เรียง = ลูกศรจาง ๆ โผล่ตอนชี้)
export function SortMark({ dir }: { dir?: "asc" | "desc" }) {
  return (
    <span className={"sort-mark" + (dir ? " on" : "")} aria-hidden>
      {dir === "desc" ? "▼" : "▲"}
    </span>
  );
}

// props สำหรับ <th> ที่คลิกเรียงได้ — ใช้กับ <th> เดิมของแต่ละตารางได้เลย
export function sortThProps(sort: SortState | null, key: string, onSort: (key: string) => void, className = "") {
  const dir = sort?.key === key ? sort.dir : undefined;
  return {
    className: (className ? className + " " : "") + "sortable" + (dir ? " sorted" : ""),
    "aria-sort": (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") as
      | "ascending"
      | "descending"
      | "none",
    onClick: (e: React.MouseEvent) => {
      if (Date.now() - resizedAt < 400) return;
      // คลิกโดนปุ่ม/ช่องติ๊กในหัวคอลัมน์ = ไม่ใช่การเรียง
      if ((e.target as HTMLElement).closest("input, button, select, .col-resize")) return;
      onSort(key);
    },
  };
}

// ตารางธรรมดา: เก็บสถานะการเรียง + คืนแถวที่เรียงแล้ว
// get = ค่าที่เห็นบนจอของแถวนั้นในคอลัมน์ key (ไม่ส่ง = row[key])
export function useTableSort<T>(rows: T[], get?: (row: T, key: string) => unknown, initial: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(initial);
  const onSort = useCallback((key: string) => setSort((cur) => nextSort(cur, key)), []);
  const sorted = useMemo(
    () => sortRows(rows, sort, get || ((r, k) => (r as Record<string, unknown>)[k])),
    [rows, sort, get]
  );
  // <th {...th("key")}>ชื่อ <SortMark dir={dirOf("key")} /></th>
  const th = (key: string, className = "") => sortThProps(sort, key, onSort, className);
  const dirOf = (key: string) => (sort?.key === key ? sort.dir : undefined);
  return { sorted, sort, setSort, onSort, th, dirOf };
}
