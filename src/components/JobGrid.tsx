"use client";

import React from "react";
import { Field, FIELDS, GROUPS } from "@/lib/schema";
import { JobRecord, Lists } from "@/lib/types";
import { Cell } from "./Cell";

const ROWNUM_W = 48;

// คำนวณตำแหน่ง left ของคอลัมน์ที่ตรึงซ้าย
const stickyFields = FIELDS.filter((f) => f.sticky);
const stickyLeft: Record<string, number> = {};
{
  let acc = ROWNUM_W;
  for (const f of stickyFields) {
    stickyLeft[f.key] = acc;
    acc += f.width || 130;
  }
}

function tintClass(f: Field): string {
  if (f.type === "auto") return "tint-locked";
  if (f.mandatory) return "tint-mandatory";
  return "tint-editable";
}

interface RowProps {
  rec: JobRecord;
  index: number;
  lists: Lists;
  dirty: boolean;
  isNew: boolean;
  onChange: (id: string, key: string, value: string) => void;
  onDelete: (id: string) => void;
}

const Row = React.memo(function Row({
  rec,
  index,
  lists,
  dirty,
  isNew,
  onChange,
  onDelete,
}: RowProps) {
  return (
    <tr className={(dirty ? "dirty " : "") + (isNew ? "row-new" : "")}>
      <td className="sticky-col rownum" style={{ left: 0 }}>
        {index + 1}
      </td>
      {FIELDS.map((f) => {
        const sticky = f.sticky;
        return (
          <td
            key={f.key}
            className={tintClass(f) + (sticky ? " sticky-col" : "")}
            style={sticky ? { left: stickyLeft[f.key] } : undefined}
          >
            <Cell
              field={f}
              value={rec[f.key] || ""}
              options={f.list ? lists[f.list] || [] : []}
              onChange={(v) => onChange(rec.__id, f.key, v)}
            />
          </td>
        );
      })}
      <td>
        <div className="row-actions">
          <button className="btn sm danger" onClick={() => onDelete(rec.__id)}>
            ลบ
          </button>
        </div>
      </td>
    </tr>
  );
});

export function JobGrid({
  rows,
  lists,
  dirtyIds,
  newIds,
  onChange,
  onDelete,
}: {
  rows: JobRecord[];
  lists: Lists;
  dirtyIds: Set<string>;
  newIds: Set<string>;
  onChange: (id: string, key: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid-wrap">
      <table className="grid">
        <thead>
          <tr className="group-row">
            <th className="sticky-col" rowSpan={2} style={{ left: 0 }}>
              #
            </th>
            {GROUPS.map((g) => {
              const cols = FIELDS.filter((f) => f.group === g).length;
              if (!cols) return null;
              return (
                <th key={g} colSpan={cols}>
                  {g}
                </th>
              );
            })}
            <th rowSpan={2}>จัดการ</th>
          </tr>
          <tr className="field-row">
            {FIELDS.map((f) => (
              <th
                key={f.key}
                className={(f.mandatory ? "req " : "") + (f.sticky ? "sticky-col" : "")}
                style={{
                  width: f.width,
                  minWidth: f.width,
                  ...(f.sticky ? { left: stickyLeft[f.key], top: 27 } : {}),
                }}
                title={f.help || f.label}
              >
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rec, i) => (
            <Row
              key={rec.__id}
              rec={rec}
              index={i}
              lists={lists}
              dirty={dirtyIds.has(rec.__id)}
              isNew={newIds.has(rec.__id)}
              onChange={onChange}
              onDelete={onDelete}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={FIELDS.length + 2} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                ยังไม่มีข้อมูล — กด “＋ เพิ่มงาน” เพื่อเริ่มบันทึก
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
