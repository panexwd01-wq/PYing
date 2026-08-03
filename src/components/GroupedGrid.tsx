"use client";

import React, { useMemo, useState } from "react";
import { Field } from "@/lib/fields";
import { JobRecord } from "@/lib/types";
import { cellCue } from "@/lib/cellRules";

// ตารางที่ "รวบหลายแถวของ Job No. เดียวกันเป็น 1 บรรทัด"
// - ค่าที่ต่างกันในกลุ่ม จะถูกรวมแสดงคั่นด้วย " · " (เช่น Extra/Service Req Type)
// - แก้ไขทำในแผงที่กางออกมา (แยกราย Type) — บรรทัดสรุปเป็นอ่านอย่างเดียว
export interface RowGroup {
  key: string;
  rows: JobRecord[];
}

export function groupRows(rows: JobRecord[], groupKey: string): RowGroup[] {
  const order: string[] = [];
  const map = new Map<string, JobRecord[]>();
  for (const r of rows) {
    const k = (r[groupKey] || "").trim() || `__${r.__id}`; // ไม่มี Job No. = แยกเป็นกลุ่มของตัวเอง
    const arr = map.get(k);
    if (arr) arr.push(r);
    else {
      map.set(k, [r]);
      order.push(k);
    }
  }
  return order.map((k) => ({ key: k, rows: map.get(k)! }));
}

// รวมค่าที่ไม่ซ้ำในกลุ่ม
function mergedValue(rows: JobRecord[], key: string): string {
  const seen: string[] = [];
  for (const r of rows) {
    const v = (r[key] || "").trim();
    if (v && !seen.includes(v)) seen.push(v);
  }
  return seen.join(" · ");
}

export function GroupedGrid({
  displayFields,
  rows,
  moduleId,
  carrierColors,
  groupKey = "job_no",
  statusKey,
  dirtyIds,
  unlockedIds,
  canUnlock = true,
  renderDetail,
  onUnlockGroup,
}: {
  displayFields: Field[];
  rows: JobRecord[];
  moduleId: string;
  carrierColors?: Record<string, string>;
  groupKey?: string;
  statusKey: string;
  dirtyIds: Set<string>;
  unlockedIds: Set<string>;
  canUnlock?: boolean;
  renderDetail: (rows: JobRecord[]) => React.ReactNode;
  onUnlockGroup: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const groups = useMemo(() => groupRows(rows, groupKey), [rows, groupKey]);
  const cols = 1 + 1 + displayFields.length + 1;

  return (
    <div className="grid-wrap collapsed">
      <table className="grid grouped">
        <thead>
          <tr className="field-row">
            <th className="rownum">#</th>
            <th className="expand-col" />
            {displayFields.map((f) => (
              <th key={f.key} style={{ width: f.width, minWidth: f.width }} title={f.help || f.label}>
                {f.label}
              </th>
            ))}
            <th>รายการย่อย</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => {
            const open = expanded.has(g.key);
            const anyEnd = g.rows.some((r) => (r[statusKey] || "") === "End");
            const anyDirty = g.rows.some((r) => dirtyIds.has(r.__id));
            const allUnlocked = g.rows.every((r) => unlockedIds.has(r.__id));
            return (
              <React.Fragment key={g.key}>
                <tr className={(anyDirty ? "dirty " : "") + (open ? "row-expanded" : "")}>
                  <td className="rownum">{i + 1}</td>
                  <td className="expand-col">
                    <button
                      className={"expand-btn" + (open ? " on" : "")}
                      onClick={() => toggle(g.key)}
                      title={open ? "ย่อ" : "กางดูรายละเอียดแยกตาม Type"}
                      aria-label="กางรายละเอียด"
                    >
                      ▸
                    </button>
                  </td>
                  {displayFields.map((f) => {
                    // สีตามกฎเดียวกับตารางปกติ (เช่น Job Type = Re-Export/* → แดง)
                    // ใช้ได้เมื่อทุกแถวใน Job นี้มีค่าเดียวกัน — ถ้าค่าต่างกัน (ช่องราย Type) ไม่ระบายสี
                    const vals = new Set(g.rows.map((r) => (r[f.key] || "").trim()));
                    const bg = vals.size === 1 ? cellCue(moduleId, f.key, g.rows[0], carrierColors).bg : undefined;
                    return (
                      <td
                        key={f.key}
                        className="tint-locked"
                        title={mergedValue(g.rows, f.key)}
                        style={bg ? { background: bg } : undefined}
                      >
                        <div className="cellbox">{mergedValue(g.rows, f.key) || "—"}</div>
                      </td>
                    );
                  })}
                  <td>
                    <div className="row-actions">
                      <span className="count-pill sm">{g.rows.length}</span>
                      {anyEnd && canUnlock && (
                        <button
                          className={"btn sm" + (allUnlocked ? " primary" : "")}
                          onClick={() => onUnlockGroup(g.rows.map((r) => r.__id))}
                          title="ปลดล็อกงานที่ End แล้วทั้ง Job (สำหรับผู้มีสิทธิ์)"
                        >
                          {allUnlocked ? "🔓" : "🔒"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="detail-row">
                    <td className="detail-cell" colSpan={cols}>
                      {renderDetail(g.rows)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {groups.length === 0 && (
            <tr>
              <td colSpan={cols} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                ยังไม่มีข้อมูล — รายการจะถูกสร้างอัตโนมัติจาก CS Import/Export
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
