"use client";

import React, { useMemo, useState } from "react";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { cellCue } from "@/lib/cellRules";
import { ColorTag } from "@/lib/prefs";
import { cellState } from "@/lib/cellState";
import { Cell } from "./Cell";
import { useRowWindow } from "./useRowWindow";
import { SortState } from "@/lib/sort";
import { markColumnResized, SortMark, sortThProps } from "./SortTh";

const ROWNUM_W = 48;
const MIN_COL_W = 60;
const MAX_COL_W = 600;

// ที่จับลากขอบขวาของหัวคอลัมน์ — ปรับความกว้างสดระหว่างลาก แล้วค่อยบันทึกตอนปล่อยเมาส์
function ResizeHandle({
  fieldKey,
  width,
  onDone,
}: {
  fieldKey: string;
  width: number;
  onDone: (key: string, width: number) => void;
}) {
  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLElement | null;
    const x0 = e.clientX;
    const w0 = th?.offsetWidth || width;
    let next = w0;
    const move = (ev: MouseEvent) => {
      next = Math.min(MAX_COL_W, Math.max(MIN_COL_W, w0 + ev.clientX - x0));
      if (th) {
        th.style.width = next + "px";
        th.style.minWidth = next + "px";
      }
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      markColumnResized(); // click ที่ตามมาหลังปล่อยเมาส์ ไม่ใช่การกดเรียง
      if (next !== w0) onDone(fieldKey, next);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  return <span className="col-resize" onMouseDown={start} title="ลากเพื่อปรับความกว้าง (จำไว้เฉพาะบัญชีนี้)" />;
}
const DUP_BG = "#ff8f8f"; // เลขซ้ำ — แดงเข้มกว่าสี cue ปกติ ให้สะดุดตา

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
  moduleId: string;
  carrierColors?: Record<string, string>;
  palette?: ColorTag[];
  displayFields: Field[];
  dupKey?: string; // ช่องที่ห้ามซ้ำ
  isDupValue?: (v: string) => boolean; // ค่านี้ไปซ้ำกับแถวอื่นไหม
  selected?: boolean; // ติ๊กเลือกไว้ (โหมดแก้หลายแถวพร้อมกัน)
  onToggleSelect?: (id: string) => void;
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
  canDelete: boolean;
  readOnly: boolean; // ไม่มีสิทธิ์แก้ไข tab นี้ → ทุกช่องอ่านอย่างเดียว
  canUnlock: boolean; // มีสิทธิ์จัดการงานที่ End (ปุ่ม 🔒)
  onToggleExpand: (id: string) => void;
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}

const Row = React.memo(function Row({
  rec,
  index,
  moduleId,
  carrierColors,
  palette,
  displayFields,
  dupKey,
  isDupValue,
  selected,
  onToggleSelect,
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
  canDelete,
  readOnly,
  canUnlock,
  onToggleExpand,
  onChange,
  onDelete,
  onUnlock,
}: RowProps) {
  const isEnd = (rec[statusKey] || "") === "End";
  const endLocked = isEnd && !unlocked; // งาน End -> ล็อกทั้งแถวจนกว่าจะปลดล็อก (Supervisor)

  // เลขซ้ำ (เช่น Booking ของ Export) — ทับสี cue ปกติเพื่อให้เห็นชัด
  const dupHit = (f: Field) =>
    !!dupKey && f.key === dupKey && !!isDupValue && isDupValue(rec[f.key] || "");

  const cueFor = (f: Field): { bg?: string; dup?: boolean } => {
    if (dupHit(f)) return { bg: DUP_BG, dup: true };
    return cellCue(moduleId, f.key, rec, carrierColors);
  };

  // Cell ดิบ + logic ล็อก/สี (ใช้ทั้งในตารางและแผงรายละเอียด)
  const bareCell = (f: Field) => {
    const st = cellState(moduleId, rec, f, { statusKey, picKey, unlocked, readOnly }, carrierColors);
    const { locked, hint } = st;
    const bg = dupHit(f) ? DUP_BG : st.bg;
    const pick = f.colorPick ? (color: string) => onChange(rec.__id, `${f.key}_color`, color) : undefined;
    return (
      <Cell
        field={f}
        value={rec[f.key] || ""}
        options={f.list ? lists[f.list] || [] : []}
        onChange={(v) => onChange(rec.__id, f.key, v)}
        locked={locked}
        lockHint={dupHit(f) ? "เลขนี้ซ้ำกับงานอื่น — ตรวจสอบก่อน" : hint}
        bg={bg}
        palette={palette}
        pickedColor={rec[`${f.key}_color`] || ""}
        onColorPick={pick}
      />
    );
  };

  const cellFor = (f: Field, useSticky: boolean) => {
    const sticky = useSticky && f.sticky && stickyLeft[f.key] != null;
    const cue = cueFor(f);
    return (
      <td
        key={f.key}
        className={tintClass(f) + (sticky ? " sticky-col" : "")}
        style={{ ...(sticky ? { left: stickyLeft[f.key] } : {}), ...(cue.bg ? { background: cue.bg } : {}) }}
        title={cue.dup ? "เลขนี้ซ้ำกับงานอื่น — ตรวจสอบก่อน" : undefined}
      >
        {bareCell(f)}
      </td>
    );
  };

  const rowCls = (dirty ? "dirty " : "") + (isNew ? "row-new " : "") + (endLocked ? "row-locked " : "") + (expanded ? "row-expanded" : "");
  // จำนวนคอลัมน์ทั้งแถว (สำหรับ colSpan ของแผงรายละเอียด): # + [ปุ่มกาง] + fields + จัดการ
  const totalCols = 1 + (onToggleSelect ? 1 : 0) + (collapsed ? 1 : 0) + displayFields.length + 1;

  return (
    <>
      <tr className={rowCls}>
        <td className="sticky-col rownum" style={{ left: 0 }}>
          {index + 1}
        </td>
        {onToggleSelect && (
          <td className="sel-col">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect(rec.__id)}
              aria-label="เลือกแถวนี้"
            />
          </td>
        )}
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
            {isEnd && canUnlock && (
              <button
                className={"btn sm" + (unlocked ? " primary" : "")}
                onClick={() => onUnlock(rec.__id)}
                title="ปลดล็อกเพื่อแก้ไขงานที่ End แล้ว (สำหรับ Supervisor)"
              >
                {unlocked ? "🔓" : "🔒"}
              </button>
            )}
            {onDelete && canDelete && (
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
                      {gf.map((f) => {
                        // กติกาสี (Form E / PERMIT / PV / Carrier …) ให้ระบายทั้งกล่อง ไม่ใช่แค่ช่องกรอก
                        const cueBg = cueFor(f).bg;
                        return (
                          <div
                            className={"detail-item " + tintClass(f) + (cueBg ? " has-cue" : "")}
                            key={f.key}
                            style={cueBg ? { background: cueBg, borderColor: cueBg } : undefined}
                          >
                            <label title={f.help || f.label}>{f.label}</label>
                            {bareCell(f)}
                          </div>
                        );
                      })}
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
  moduleId,
  fields: allFields,
  rows,
  lists,
  carrierColors,
  palette,
  dirtyIds,
  newIds,
  statusKey,
  picKey,
  unlockedIds,
  collapsed = false,
  collapsedKeys,
  dupKey,
  dupValues,
  onResizeColumn,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  hideDeleteFor,
  readOnly = false,
  canUnlock = true,
  windowKey = "",
  sort = null,
  onSort,
  onChange,
  onDelete,
  onUnlock,
}: {
  moduleId: string;
  fields: Field[];
  carrierColors?: Record<string, string>;
  palette?: ColorTag[];
  rows: JobRecord[];
  lists: Lists;
  dirtyIds: Set<string>;
  newIds: Set<string>;
  statusKey: string;
  picKey: string;
  unlockedIds: Set<string>;
  collapsed?: boolean;
  collapsedKeys?: string[]; // คอลัมน์ที่โชว์ตอนย่อ (ตั้งค่าส่วนกลาง) — ไม่ส่ง = ใช้ summary จาก schema
  dupKey?: string; // ช่องที่ห้ามซ้ำ
  dupValues?: Set<string>; // ค่าที่ซ้ำ (normalize แล้ว)
  onResizeColumn?: (key: string, width: number) => void; // ลากขอบหัวคอลัมน์เพื่อยืด/หด (เก็บต่อบัญชี)
  selectedIds?: Set<string>; // แถวที่ติ๊กไว้ (โหมดแก้หลายแถวพร้อมกัน)
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  hideDeleteFor?: (rec: JobRecord) => boolean; // แถวที่ไม่ให้ลบ (เช่น Export ที่มาจาก Re-Export)
  windowKey?: string; // เปลี่ยนค่านี้ = เริ่มนับจำนวนแถวที่วาดใหม่ (ตัวกรอง/การเรียงเปลี่ยน)
  readOnly?: boolean; // ไม่มีสิทธิ์แก้ไข → ทั้งตารางอ่านอย่างเดียว
  canUnlock?: boolean; // มีสิทธิ์จัดการงานที่ End
  sort?: SortState | null; // การเรียงปัจจุบัน (แถวที่ส่งมาเรียงแล้ว — ใช้แค่วาดลูกศร)
  onSort?: (key: string) => void; // คลิกหัวคอลัมน์ = เรียง
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void;
  onUnlock: (id: string) => void;
}) {
  const isDupValue = React.useCallback(
    (v: string) => {
      const t = (v || "").trim().toUpperCase();
      return !!t && !!dupValues && dupValues.has(t);
    },
    [dupValues]
  );

  // วาดทีละชุด — ข้อมูลมาครบตั้งแต่แรกแล้ว แค่ทยอยวาดให้ตารางขึ้นเร็ว
  const { limit, hasMore, sentinel, showAll } = useRowWindow(rows.length, windowKey);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const onToggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // ซ่อนช่อง hidden (เก็บเป็นคอลัมน์ในชีทแต่ไม่แสดง เช่นช่องเก็บสีปุ่ม)
  const fields = useMemo(() => allFields.filter((f) => !f.hidden), [allFields]);

  // ในโหมดย่อ: แสดงคอลัมน์ตามที่ตั้งค่าไว้ (collapsedKeys) ถ้าไม่มีก็ใช้ summary จาก schema
  const displayFields = useMemo(() => {
    if (!collapsed) return fields;
    if (collapsedKeys && collapsedKeys.length) {
      const set = new Set(collapsedKeys);
      const chosen = fields.filter((f) => set.has(f.key)); // คงลำดับตาม schema
      return chosen.length ? chosen : summaryFields(fields);
    }
    return summaryFields(fields);
  }, [collapsed, fields, collapsedKeys]);
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
  // ตรึงได้ก็ต่อเมื่อคอลัมน์ที่ mark sticky ยังอยู่ "หัวแถว" ติดกันจริง —
  // ถ้าผู้ใช้ลากสลับจนมันไปอยู่กลางตาราง ให้เลิกตรึงทั้งหมด ไม่งั้นจะซ้อนทับคอลัมน์อื่น
  const stickyLeft = useMemo(() => {
    const out: Record<string, number> = {};
    const sticky = fields.filter((x) => x.sticky);
    const leading = fields.slice(0, sticky.length).every((f) => f.sticky);
    if (!leading) return out;
    let acc = ROWNUM_W;
    for (const f of sticky) {
      out[f.key] = acc;
      acc += f.width || 130;
    }
    return out;
  }, [fields]);

  // แถบกลุ่มด้านบน (โหมดเต็ม) — รวมเป็น "ช่วงต่อเนื่อง" ตามลำดับคอลัมน์จริง
  // ถ้าผู้ใช้สลับคอลัมน์ข้ามกลุ่ม กลุ่มเดียวกันจะโผล่หลายช่วงได้ (ไม่ใช่ colSpan ก้อนเดียว)
  const groupSpans = useMemo(() => {
    const out: { group: string; span: number }[] = [];
    for (const f of displayFields) {
      const last = out[out.length - 1];
      if (last && last.group === f.group) last.span++;
      else out.push({ group: f.group, span: 1 });
    }
    return out;
  }, [displayFields]);

  return (
    <div className={"grid-wrap" + (collapsed ? " collapsed" : "")}>
      <table className="grid">
        <thead>
          {!collapsed ? (
            <tr className="group-row">
              <th className="sticky-col" rowSpan={2} style={{ left: 0 }}>
                #
              </th>
              {onToggleSelect && <th className="sel-col" rowSpan={2} />}
              {groupSpans.map((gs, i) => (
                <th key={gs.group + i} colSpan={gs.span}>
                  {gs.group}
                </th>
              ))}
              <th rowSpan={2}>จัดการ</th>
            </tr>
          ) : null}
          <tr className="field-row">
            {collapsed && <th className="rownum">#</th>}
            {onToggleSelect && (
              <th className="sel-col">
                <input
                  type="checkbox"
                  checked={!!rows.length && !!selectedIds && rows.every((r) => selectedIds.has(r.__id))}
                  onChange={() => onToggleSelectAll?.()}
                  title="เลือก/ไม่เลือกทุกแถวที่เห็นอยู่"
                  aria-label="เลือกทั้งหมด"
                />
              </th>
            )}
            {collapsed && <th className="expand-col" />}
            {displayFields.map((f) => (
              <th
                key={f.key}
                {...(onSort ? sortThProps(sort, f.key, onSort) : {})}
                className={
                  (f.mandatory ? "req " : "") +
                  (!collapsed && stickyLeft[f.key] != null ? "sticky-col " : "") +
                  (onSort ? "sortable" + (sort?.key === f.key ? " sorted" : "") : "")
                }
                style={{
                  width: f.width,
                  minWidth: f.width,
                  ...(!collapsed && stickyLeft[f.key] != null ? { left: stickyLeft[f.key], top: 27 } : {}),
                }}
                title={f.help || f.label}
              >
                {f.label}
                {onSort && <SortMark dir={sort?.key === f.key ? sort.dir : undefined} />}
                {onResizeColumn && <ResizeHandle fieldKey={f.key} width={f.width || 130} onDone={onResizeColumn} />}
              </th>
            ))}
            {collapsed && <th>จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((rec, i) => (
            <Row
              key={rec.__id}
              rec={rec}
              index={i}
              moduleId={moduleId}
              carrierColors={carrierColors}
              palette={palette}
              displayFields={displayFields}
              dupKey={dupKey}
              isDupValue={isDupValue}
              selected={selectedIds?.has(rec.__id)}
              onToggleSelect={onToggleSelect}
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
              canDelete={!hideDeleteFor || !hideDeleteFor(rec)}
              readOnly={readOnly}
              canUnlock={canUnlock}
              onToggleExpand={onToggleExpand}
              onChange={onChange}
              onDelete={onDelete}
              onUnlock={onUnlock}
            />
          ))}
          {hasMore && (
            <tr ref={sentinel} className="row-more">
              <td colSpan={displayFields.length + (collapsed ? 3 : 2) + (onToggleSelect ? 1 : 0)} style={{ padding: 14, textAlign: "center", color: "#777" }}>
                แสดง {limit} จาก {rows.length} แถว — เลื่อนลงเพื่อดูต่อ
                <button className="btn sm" style={{ marginLeft: 10 }} onClick={showAll}>
                  แสดงทั้งหมด
                </button>
              </td>
            </tr>
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={displayFields.length + (collapsed ? 3 : 2) + (onToggleSelect ? 1 : 0)} style={{ padding: 30, textAlign: "center", color: "#777" }}>
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
