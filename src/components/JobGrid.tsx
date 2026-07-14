"use client";

import React, { useMemo, useState } from "react";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { Cell } from "./Cell";

const ROWNUM_W = 48;

function tintClass(f: Field): string {
  if (f.type === "auto") return "tint-locked";
  if (f.mandatory) return "tint-mandatory";
  return "tint-editable";
}

// เลือกคอลัมน์ที่โชว์ตอนย่อ: ยึด summary flag; ถ้าโมดูลไหนยังไม่มาร์ก fallback = คอลัมน์ตรึงซ้าย
function summaryFields(fields: Field[]): Field[] {
  const marked = fields.filter((f) => f.summary);
  if (marked.length) return marked;
  return fields.filter((f) => f.sticky);
}

interface RowProps {
  rec: JobRecord;
  index: number;
  displayFields: Field[];
  detailFields: Field[]; // ช่องที่ซ่อน (โชว์ตอนกาง) — ว่าง = โหมดเต็ม
  detailGroups: string[];
  collapsed: boolean;
  expanded: boolean;
  stickyLeft: Record<string, number>;
  lists: Lists;
  dirty: boolean;
  isNew: boolean;
  statusKey: string;
  picKey: string;
  unlocked: boolean;
  onToggleExpand: (id: string) => void;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}

const Row = React.memo(function Row({
  rec,
  index,
  displayFields,
  detailFields,
  detailGroups,
  collapsed,
  expanded,
  stickyLeft,
  lists,
  dirty,
  isNew,
  statusKey,
  picKey,
  unlocked,
  onToggleExpand,
  onChange,
  onDelete,
  onUnlock,
}: RowProps) {
  const isEnd = (rec[statusKey] || "") === "End";
  const endLocked = isEnd && !unlocked; // งาน End -> ล็อกทั้งแถวจนกว่าจะปลดล็อก (Supervisor)
  const picFilled = (rec[picKey] || "") !== "";

  // Cell ดิบ + logic ล็อก (ใช้ทั้งในตารางและแผงรายละเอียด)
  const bareCell = (f: Field) => {
    const isYellow = !f.mandatory && f.type !== "auto";
    const needPic = isYellow && f.key !== picKey && !picFilled;
    const locked = endLocked || needPic;
    const hint = endLocked ? "งาน End แล้ว — ต้องปลดล็อก (Supervisor) ก่อนแก้" : "ต้องระบุ PIC ของโมดูลก่อนจึงจะแก้ช่องนี้ได้";
    return (
      <Cell
        field={f}
        value={rec[f.key] || ""}
        options={f.list ? lists[f.list] || [] : []}
        onChange={(v) => onChange(rec.__id, f.key, v)}
        locked={locked}
        lockHint={hint}
      />
    );
  };

  const cellFor = (f: Field, useSticky: boolean) => {
    const sticky = useSticky && f.sticky;
    return (
      <td
        key={f.key}
        className={tintClass(f) + (sticky ? " sticky-col" : "")}
        style={sticky ? { left: stickyLeft[f.key] } : undefined}
      >
        {bareCell(f)}
      </td>
    );
  };

  const rowCls = (dirty ? "dirty " : "") + (isNew ? "row-new " : "") + (endLocked ? "row-locked " : "") + (expanded ? "row-expanded" : "");
  // จำนวนคอลัมน์ทั้งแถว (สำหรับ colSpan ของแผงรายละเอียด): # + [ปุ่มกาง] + fields + จัดการ
  const totalCols = 1 + (collapsed ? 1 : 0) + displayFields.length + 1;

  return (
    <>
      <tr className={rowCls}>
        <td className="sticky-col rownum" style={{ left: 0 }}>
          {index + 1}
        </td>
        {collapsed && (
          <td className="expand-col">
            <button
              className={"expand-btn" + (expanded ? " on" : "")}
              onClick={() => onToggleExpand(rec.__id)}
              title={expanded ? "ย่อรายละเอียด" : "ดูรายละเอียดเพิ่ม"}
              aria-label="กางรายละเอียด"
            >
              ▸
            </button>
          </td>
        )}
        {displayFields.map((f) => cellFor(f, !collapsed))}
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
      {collapsed && expanded && detailFields.length > 0 && (
        <tr className="detail-row">
          <td className="detail-cell" colSpan={totalCols}>
            <div className="detail-panel">
              {detailGroups.map((g) => {
                const gf = detailFields.filter((f) => f.group === g);
                if (!gf.length) return null;
                return (
                  <div className="detail-group" key={g}>
                    <div className="detail-group-title">{g}</div>
                    <div className="detail-grid">
                      {gf.map((f) => (
                        <div className={"detail-item " + tintClass(f)} key={f.key}>
                          <label title={f.help || f.label}>{f.label}</label>
                          {bareCell(f)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
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
  collapsed = false,
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
  collapsed?: boolean;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const onToggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // ในโหมดย่อ: แสดงเฉพาะ summary; detail = ที่เหลือ (โชว์ตอนกาง)
  const displayFields = useMemo(() => (collapsed ? summaryFields(fields) : fields), [collapsed, fields]);
  const detailFields = useMemo(() => {
    if (!collapsed) return [];
    const shown = new Set(displayFields.map((f) => f.key));
    return fields.filter((f) => !shown.has(f.key));
  }, [collapsed, fields, displayFields]);
  const detailGroups = useMemo(() => {
    const seen: string[] = [];
    for (const f of detailFields) if (!seen.includes(f.group)) seen.push(f.group);
    return seen;
  }, [detailFields]);

  // ตำแหน่ง left ของคอลัมน์ตรึงซ้าย (เฉพาะโหมดเต็ม)
  const stickyLeft = useMemo(() => {
    const out: Record<string, number> = {};
    let acc = ROWNUM_W;
    for (const f of fields.filter((x) => x.sticky)) {
      out[f.key] = acc;
      acc += f.width || 130;
    }
    return out;
  }, [fields]);

  // groups ที่มีคอลัมน์โชว์จริง (โหมดเต็มเท่านั้นที่ใช้ group-row)
  const visibleGroups = useMemo(
    () => groups.filter((g) => displayFields.some((f) => f.group === g)),
    [groups, displayFields]
  );

  return (
    <div className={"grid-wrap" + (collapsed ? " collapsed" : "")}>
      <table className="grid">
        <thead>
          {!collapsed ? (
            <tr className="group-row">
              <th className="sticky-col" rowSpan={2} style={{ left: 0 }}>
                #
              </th>
              {visibleGroups.map((g) => {
                const cols = displayFields.filter((f) => f.group === g).length;
                if (!cols) return null;
                return (
                  <th key={g} colSpan={cols}>
                    {g}
                  </th>
                );
              })}
              <th rowSpan={2}>จัดการ</th>
            </tr>
          ) : null}
          <tr className="field-row">
            {collapsed && <th className="rownum">#</th>}
            {collapsed && <th className="expand-col" />}
            {displayFields.map((f) => (
              <th
                key={f.key}
                className={(f.mandatory ? "req " : "") + (!collapsed && f.sticky ? "sticky-col" : "")}
                style={{
                  width: f.width,
                  minWidth: f.width,
                  ...(!collapsed && f.sticky ? { left: stickyLeft[f.key], top: 27 } : {}),
                }}
                title={f.help || f.label}
              >
                {f.label}
              </th>
            ))}
            {collapsed && <th>จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((rec, i) => (
            <Row
              key={rec.__id}
              rec={rec}
              index={i}
              displayFields={displayFields}
              detailFields={detailFields}
              detailGroups={detailGroups}
              collapsed={collapsed}
              expanded={expanded.has(rec.__id)}
              stickyLeft={stickyLeft}
              lists={lists}
              dirty={dirtyIds.has(rec.__id)}
              isNew={newIds.has(rec.__id)}
              statusKey={statusKey}
              picKey={picKey}
              unlocked={unlockedIds.has(rec.__id)}
              onToggleExpand={onToggleExpand}
              onChange={onChange}
              onDelete={onDelete}
              onUnlock={onUnlock}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={displayFields.length + (collapsed ? 3 : 2)} style={{ padding: 30, textAlign: "center", color: "#777" }}>
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
