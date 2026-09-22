"use client";

import { useMemo } from "react";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { cellState } from "@/lib/cellState";
import { EXTRA_LINE_COLUMNS } from "@/lib/modules/extra";
import {
  ACC_FUEL_NA_KEYS,
  ACC_LINE_COLUMNS,
  ACC_LINE_LEAD,
  ACC_LINE_SUMS,
  isFuelRow,
} from "@/lib/modules/accounting";
import { Cell } from "./Cell";

// ===== ตารางรายบรรทัดของ 1 Job No. =====
// ใช้ร่วมกัน 2 ที่: Extra (Sell / Job Cost) และ Accounting (AP / AR)
// 1 บรรทัด = 1 Extra/Service Req Type · คอลัมน์แรกคือชื่อรายการ (ล็อก) · ที่เหลือกรอกราย Type
// (class CSS ยังใช้ชื่อชุด .extra-lines เดิมร่วมกันทั้งสองแบบ)

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};
const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ต้นตอของงาน: Import หรือ Export (ใช้เป็นหัวตารางตามฟอร์มจริง)
export function originLabel(rows: JobRecord[]): string {
  const mods = rows.map((r) => (r.module || "").toUpperCase());
  if (mods.includes("FREIGHT IMPORT")) return "FREIGHT IMPORT";
  if (mods.includes("FREIGHT EXPORT")) return "FREIGHT EXPORT";
  const jt = (rows[0]?.job_type || "").toLowerCase();
  if (jt.includes("export")) return "FREIGHT EXPORT"; // ครอบคลุม Re-Export ด้วย
  if (jt.includes("import")) return "FREIGHT IMPORT";
  return "FREIGHT";
}

export interface LineSide {
  key: string; // id ของตาราง (sell/cost/ap/ar)
  title: string; // ป้ายมุมซ้ายบน
  leadKey: string; // ช่องที่ใช้เป็นชื่อบรรทัด (อ่านอย่างเดียว)
  columns: readonly string[];
  sumKeys: readonly string[]; // คอลัมน์ที่รวมยอดท้ายตาราง
  totalLabel?: string; // ข้อความหน้ายอดรวม
  rowFilter?: (r: JobRecord) => boolean; // แถวที่ตารางนี้แสดง (เช่น AR ไม่เอาแถว Fuel)
  lockCell?: (key: string, r: JobRecord) => boolean; // ช่องที่ระบบเป็นคนใส่ (แสดงเป็นข้อความ)
  optionsFor?: (key: string, r: JobRecord) => string[] | undefined; // ตัวเลือก dropdown ที่ไม่ได้มาจาก f.list
}

interface Props {
  moduleId: string;
  rows: JobRecord[];
  fieldByKey: Record<string, Field>;
  lists: Lists;
  statusKey: string;
  picKey: string;
  unlockedIds: Set<string>;
  readOnly?: boolean;
  sides: LineSide[];
  onChange: (id: string, key: string, value: string) => void;
  onDelete?: (id: string) => void; // ลบบรรทัดนี้ทิ้ง (โชว์เฉพาะตารางแรก — 1 บรรทัด = 1 ระเบียน)
}

export function LinesTable({
  moduleId,
  rows,
  fieldByKey,
  lists,
  statusKey,
  picKey,
  unlockedIds,
  readOnly,
  sides,
  onChange,
  onDelete,
}: Props) {
  const origin = originLabel(rows);

  return (
    <div className="extra-lines-wrap">
      <div className="extra-origin">{origin}</div>
      {sides.map((side, sideIdx) => {
        const canDel = !!onDelete && !readOnly && sideIdx === 0;
        const keys = side.columns;
        const sideRows = side.rowFilter ? rows.filter(side.rowFilter) : rows;
        const firstSum = keys.findIndex((k) => side.sumKeys.includes(k));
        const isNum = (k: string) => side.sumKeys.includes(k) || k.endsWith("_total_rate");

        return (
          <div className="extra-side" key={side.key}>
            <table className="extra-lines">
              <thead>
                <tr>
                  <th className="lead">{side.title}</th>
                  {keys.map((k) => (
                    <th key={k} className={isNum(k) ? "num" : undefined}>
                      {fieldByKey[k]?.label || k}
                    </th>
                  ))}
                  {canDel && <th className="act">จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {sideRows.map((r) => {
                  const unlocked = unlockedIds.has(r.__id);
                  return (
                    <tr key={r.__id}>
                      <td className="lead" title={r[side.leadKey] || ""}>
                        {r[side.leadKey] || "—"}
                        {r.module && <span className="mod-tag">{r.module}</span>}
                      </td>
                      {keys.map((k) => {
                        const f = fieldByKey[k];
                        if (!f) return <td key={k} />;
                        const st = cellState(moduleId, r, f, { statusKey, picKey, unlocked, readOnly });
                        const sysLocked = side.lockCell?.(k, r) ?? false;
                        const opts = side.optionsFor?.(k, r) ?? (f.list ? lists[f.list] || [] : []);
                        return (
                          <td key={k} className={isNum(k) ? "num" : undefined}>
                            <Cell
                              field={f}
                              value={r[k] || ""}
                              options={opts}
                              onChange={(v) => onChange(r.__id, k, v)}
                              locked={st.locked || sysLocked}
                              lockHint={sysLocked ? "ช่องนี้ระบบใส่ให้ (แถวที่ไม่เกี่ยวกับ Extra)" : st.hint}
                            />
                          </td>
                        );
                      })}
                      {canDel && (
                        <td className="act">
                          <button className="btn sm danger" onClick={() => onDelete!(r.__id)} title="ลบบรรทัดนี้ทิ้ง">
                            ลบ
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {firstSum >= 0 && (
                <tfoot>
                  <tr>
                    <td className="lead">Total</td>
                    {firstSum > 0 && (
                      <td colSpan={firstSum} className="tot-label">
                        {side.totalLabel || "รวม ="}
                      </td>
                    )}
                    {keys.slice(firstSum).map((k) =>
                      side.sumKeys.includes(k) ? (
                        <td key={k} className="num tot">
                          {money(sideRows.reduce((a, r) => a + num(r[k]), 0))}
                        </td>
                      ) : (
                        <td key={k} />
                      )
                    )}
                    {canDel && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
      })}
    </div>
  );
}

type WrapProps = Omit<Props, "sides" | "moduleId">;

// ----- Extra (09): Sell / Job Cost -----
export function ExtraLinesTable(props: WrapProps) {
  const { lists } = props;
  // ตัวเลือกคู่ค้า — รวมจากหลาย list ตามสเปก
  const receivedFrom = useMemo(
    () => uniq([...(lists.customer || []), ...(lists.carrier || []), ...(lists.sales || [])]),
    [lists]
  );
  const paidTo = useMemo(
    () => uniq([...(lists.supplier_transport || []), ...(lists.supplier_warehouse || [])]),
    [lists]
  );

  const sides: LineSide[] = useMemo(
    () => [
      {
        key: "sell",
        title: "Sell",
        leadKey: "extra_req_type",
        columns: EXTRA_LINE_COLUMNS.sell,
        sumKeys: ["sell_total_rate"],
        totalLabel: "Local Amt. =",
        optionsFor: (k) => (k === "sell_received_from" ? receivedFrom : undefined),
      },
      {
        key: "cost",
        title: "Job Cost",
        leadKey: "extra_req_type",
        columns: EXTRA_LINE_COLUMNS.cost,
        sumKeys: ["cost_total_rate"],
        totalLabel: "Local Amt. =",
        optionsFor: (k) => (k === "cost_paid_to" ? paidTo : undefined),
      },
    ],
    [receivedFrom, paidTo]
  );

  return <LinesTable {...props} moduleId="09_Extra_Service" sides={sides} />;
}

// ----- Accounting (10): AR ขึ้นก่อน AP -----
export function AccountingLinesTable(props: WrapProps) {
  const sides: LineSide[] = useMemo(
    () => [
      {
        key: "ar",
        title: "AR",
        leadKey: ACC_LINE_LEAD,
        columns: ACC_LINE_COLUMNS.ar,
        sumKeys: ACC_LINE_SUMS.ar,
        totalLabel: "Total Sell =",
        // แถว Fuel Rate ของ Transport เป็นรายการฝั่งจ่ายล้วน — ไม่แสดงในตาราง AR
        rowFilter: (r) => !isFuelRow(r),
      },
      {
        key: "ap",
        title: "AP",
        leadKey: ACC_LINE_LEAD,
        columns: ACC_LINE_COLUMNS.ap,
        sumKeys: ACC_LINE_SUMS.ap,
        totalLabel: "Total Cost =",
        // แถว Fuel: ช่วง Extra Root Cause → Received Ship Close Acc ระบบใส่ N/A ให้ (แก้ไม่ได้)
        lockCell: (k, r) => isFuelRow(r) && (ACC_FUEL_NA_KEYS as readonly string[]).includes(k),
      },
    ],
    []
  );

  return <LinesTable {...props} moduleId="10_Accounting" sides={sides} />;
}

function uniq(a: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of a) {
    const s = (v || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}
