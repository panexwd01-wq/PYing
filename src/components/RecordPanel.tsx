"use client";

import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { cellState } from "@/lib/cellState";
import { Cell } from "./Cell";

// แผงรายละเอียดของ "1 ระเบียน" — จัดกลุ่มตาม section ของ schema
// ใช้ตอนกาง (Expand) ในมุมมองที่รวบหลายแถวเป็น 1 Job No.
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
}) {
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
                  <div className={"detail-item " + tint} key={f.key}>
                    <label title={f.help || f.label}>{f.label}</label>
                    <Cell
                      field={f}
                      value={rec[f.key] || ""}
                      options={f.list ? lists[f.list] || [] : []}
                      onChange={(v) => onChange(rec.__id, f.key, v)}
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
