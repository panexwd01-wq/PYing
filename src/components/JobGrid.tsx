"use client";

import React, { useMemo } from "react";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { Cell } from "./Cell";

const ROWNUM_W = 48;

function tintClass(f: Field): string {
  if (f.type === "auto") return "tint-locked";
  if (f.mandatory) return "tint-mandatory";
  return "tint-editable";
}

interface RowProps {
  rec: JobRecord;
  index: number;
  fields: Field[];
  stickyLeft: Record<string, number>;
  lists: Lists;
  dirty: boolean;
  isNew: boolean;
  statusKey: string;
  picKey: string;
  unlocked: boolean;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}

const Row = React.memo(function Row({
  rec,
  index,
  fields,
  stickyLeft,
  lists,
  dirty,
  isNew,
  statusKey,
  picKey,
  unlocked,
  onChange,
  onDelete,
  onUnlock,
}: RowProps) {
  const isEnd = (rec[statusKey] || "") === "End";
  const endLocked = isEnd && !unlocked; // งาน End -> ล็อกทั้งแถวจนกว่าจะปลดล็อก (Supervisor)
  const picFilled = (rec[picKey] || "") !== "";

  return (
    <tr className={(dirty ? "dirty " : "") + (isNew ? "row-new " : "") + (endLocked ? "row-locked" : "")}>
      <td className="sticky-col rownum" style={{ left: 0 }}>
        {index + 1}
      </td>
      {fields.map((f) => {
        const sticky = f.sticky;
        const isYellow = !f.mandatory && f.type !== "auto";
        const needPic = isYellow && f.key !== picKey && !picFilled;
        const locked = endLocked || needPic;
        const hint = endLocked ? "งาน End แล้ว — ต้องปลดล็อก (Supervisor) ก่อนแก้" : "ต้องระบุ PIC ของโมดูลก่อนจึงจะแก้ช่องนี้ได้";
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
              locked={locked}
              lockHint={hint}
            />
          </td>
        );
      })}
      <td>
        <div className="row-actions">
          {isEnd && (
            <button
              className={"btn sm" + (unlocked ? " primary" : "")}
              onClick={() => onUnlock(rec.__id)}
              title="ปลดล็อกเพื่อแก้ไขงานที่ End แล้ว (สำหรับ Supervisor)"
            >
              {unlocked ? "🔓" : "🔒"}
            </button>
          )}
          {onDelete && (
            <button className="btn sm danger" onClick={() => onDelete(rec.__id)}>
              ลบ
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export function JobGrid({
  fields,
  groups,
  rows,
  lists,
  dirtyIds,
  newIds,
  statusKey,
  picKey,
  unlockedIds,
  onChange,
  onDelete,
  onUnlock,
}: {
  fields: Field[];
  groups: string[];
  rows: JobRecord[];
  lists: Lists;
  dirtyIds: Set<string>;
  newIds: Set<string>;
  statusKey: string;
  picKey: string;
  unlockedIds: Set<string>;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}) {
  // ตำแหน่ง left ของคอลัมน์ตรึงซ้าย
  const stickyLeft = useMemo(() => {
    const out: Record<string, number> = {};
    let acc = ROWNUM_W;
    for (const f of fields.filter((x) => x.sticky)) {
      out[f.key] = acc;
      acc += f.width || 130;
    }
    return out;
  }, [fields]);

  return (
    <div className="grid-wrap">
      <table className="grid">
        <thead>
          <tr className="group-row">
            <th className="sticky-col" rowSpan={2} style={{ left: 0 }}>
              #
            </th>
            {groups.map((g) => {
              const cols = fields.filter((f) => f.group === g).length;
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
            {fields.map((f) => (
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
              fields={fields}
              stickyLeft={stickyLeft}
              lists={lists}
              dirty={dirtyIds.has(rec.__id)}
              isNew={newIds.has(rec.__id)}
              statusKey={statusKey}
              picKey={picKey}
              unlocked={unlockedIds.has(rec.__id)}
              onChange={onChange}
              onDelete={onDelete}
              onUnlock={onUnlock}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={fields.length + 2} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                {onDelete
                  ? "ยังไม่มีข้อมูล — กด “＋ เพิ่มงาน” เพื่อเริ่มบันทึก"
                  : "ยังไม่มีข้อมูล — งานจะถูกสร้างอัตโนมัติจาก CS Import/Export"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
