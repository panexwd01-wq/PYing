"use client";

import { useMemo } from "react";
import { Field } from "@/lib/fields";
import { JobRecord, Lists } from "@/lib/types";
import { cellState } from "@/lib/cellState";
import { EXTRA_LINE_COLUMNS } from "@/lib/modules/extra";
import { Cell } from "./Cell";

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};
const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ต้นตอของงาน: Import หรือ Export (ใช้เป็นหัวตารางตามฟอร์มจริง)
function originLabel(rows: JobRecord[]): string {
  const mods = rows.map((r) => (r.module || "").toUpperCase());
  if (mods.includes("FREIGHT IMPORT")) return "FREIGHT IMPORT";
  if (mods.includes("FREIGHT EXPORT")) return "FREIGHT EXPORT";
  const jt = (rows[0]?.job_type || "").toLowerCase();
  if (jt.includes("export")) return "FREIGHT EXPORT"; // ครอบคลุม Re-Export ด้วย
  if (jt.includes("import")) return "FREIGHT IMPORT";
  return "FREIGHT";
}

// ตาราง Sell / Job Cost ของ 1 Job No. — 1 บรรทัดต่อ 1 Extra/Service Req Type
// คอลัมน์แรก (ชื่อรายการ) = Req Type ล็อกไว้ · ที่เหลือกรอกเอง
export function ExtraLinesTable({
  rows,
  fieldByKey,
  lists,
  statusKey,
  picKey,
  unlockedIds,
  readOnly,
  onChange,
}: {
  rows: JobRecord[];
  fieldByKey: Record<string, Field>;
  lists: Lists;
  statusKey: string;
  picKey: string;
  unlockedIds: Set<string>;
  readOnly?: boolean;
  onChange: (id: string, key: string, value: string) => void;
}) {
  // ตัวเลือกคู่ค้า — รวมจากหลาย list ตามสเปก
  const receivedFrom = useMemo(
    () => uniq([...(lists.customer || []), ...(lists.carrier || []), ...(lists.sales || [])]),
    [lists]
  );
  const paidTo = useMemo(
    () => uniq([...(lists.supplier_transport || []), ...(lists.supplier_warehouse || [])]),
    [lists]
  );

  const origin = originLabel(rows);

  const side = (kind: "sell" | "cost") => {
    const keys = EXTRA_LINE_COLUMNS[kind] as readonly string[];
    const partnerOptions = kind === "sell" ? receivedFrom : paidTo;
    const totalUsd = rows.reduce((a, r) => a + num(r[`${kind}_usd`]), 0);
    const totalBaht = rows.reduce((a, r) => a + num(r[`${kind}_baht`]), 0);

    return (
      <div className="extra-side" key={kind}>
        <table className="extra-lines">
          <thead>
            <tr>
              <th className="lead">{kind === "sell" ? "Sell" : "Job Cost"}</th>
              {keys.map((k) => (
                <th key={k} className={k.endsWith("_usd") || k.endsWith("_baht") ? "num" : undefined}>
                  {fieldByKey[k]?.label || k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const unlocked = unlockedIds.has(r.__id);
              return (
                <tr key={r.__id}>
                  <td className="lead" title={r.extra_req_type || ""}>
                    {r.extra_req_type || "—"}
                    {r.module && <span className="mod-tag">{r.module}</span>}
                  </td>
                  {keys.map((k) => {
                    const f = fieldByKey[k];
                    if (!f) return <td key={k} />;
                    const st = cellState("09_Extra_Service", r, f, { statusKey, picKey, unlocked, readOnly });
                    const opts =
                      k === "sell_received_from" || k === "cost_paid_to"
                        ? partnerOptions
                        : f.list
                        ? lists[f.list] || []
                        : [];
                    return (
                      <td key={k} className={k.endsWith("_usd") || k.endsWith("_baht") ? "num" : undefined}>
                        <Cell
                          field={f}
                          value={r[k] || ""}
                          options={opts}
                          onChange={(v) => onChange(r.__id, k, v)}
                          locked={st.locked}
                          lockHint={st.hint}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="lead">Total</td>
              <td colSpan={keys.length - 2} className="tot-label">Local Amt. =</td>
              <td className="num tot">{money(totalUsd)}</td>
              <td className="num tot">{money(totalBaht)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="extra-lines-wrap">
      <div className="extra-origin">{origin}</div>
      {side("sell")}
      {side("cost")}
    </div>
  );
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
