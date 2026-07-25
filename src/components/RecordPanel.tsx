"use client";

import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { cellState } from "@/lib/cellState";
import { Cell } from "./Cell";

// แผงรายละเอียดของ "1 ระเบียน" — จัดกลุ่มตาม section ของ schema
// ใช้ตอนกาง (Expand) ในมุมมองที่รวบหลายแถวเป็น 1 Job No.
//
// applyToIds  = ถ้าส่งมา แก้ 1 ครั้งจะเขียนลงทุกแถวของ Job No. นั้น (ช่องพวกนี้ผูกกับ Job ไม่ใช่ราย Type)
// valueOverride = ค่าที่ให้แสดงแทนค่าดิบของแถว (ใช้กับยอดรวมของทั้ง Job)
export function RecordPanel({
  moduleId,
  rec,
  fields,
  lists,
  carrierColors,
  statusKey,
  picKey,
  unlocked,
  readOnly,
  onChange,
  applyToIds,
  valueOverride,
}: {
  moduleId: string;
  rec: JobRecord;
  fields: Field[];
  lists: Lists;
  carrierColors?: Record<string, string>;
  statusKey: string;
  picKey: string;
  unlocked: boolean;
  readOnly?: boolean;
  onChange: (id: string, key: string, value: string) => void;
  applyToIds?: string[];
  valueOverride?: Record<string, string>;
}) {
  const change = (key: string, v: string) => {
    for (const id of applyToIds && applyToIds.length ? applyToIds : [rec.__id]) onChange(id, key, v);
  };
  const visible = fields.filter((f) => !f.hidden);
  const groups: string[] = [];
  for (const f of visible) if (!groups.includes(f.group)) groups.push(f.group);

  return (
    <div className="detail-panel">
      {groups.map((g) => {
        const gf = visible.filter((f) => f.group === g);
        if (!gf.length) return null;
        return (
          <div className="detail-group" key={g}>
            <div className="detail-group-title">{g}</div>
            <div className="detail-grid">
              {gf.map((f) => {
                const st = cellState(moduleId, rec, f, { statusKey, picKey, unlocked, readOnly }, carrierColors);
                const tint = f.type === "auto" ? "tint-locked" : f.mandatory ? "tint-mandatory" : "tint-editable";
                return (
                  // กติกาสีของช่อง (เช่น PERMIT แดง) ระบายทั้งกล่อง ไม่ใช่แค่ช่องกรอก
                  <div
                    className={"detail-item " + tint + (st.bg ? " has-cue" : "")}
                    key={f.key}
                    style={st.bg ? { background: st.bg, borderColor: st.bg } : undefined}
                  >
                    <label title={f.help || f.label}>{f.label}</label>
                    <Cell
                      field={f}
                      value={valueOverride?.[f.key] ?? (rec[f.key] || "")}
                      options={f.list ? lists[f.list] || [] : []}
                      onChange={(v) => change(f.key, v)}
                      locked={st.locked}
                      lockHint={st.hint}
                      bg={st.bg}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
