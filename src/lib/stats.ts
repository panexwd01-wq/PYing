// ฟังก์ชันสรุปผล (pure) ทำงานบน Snapshot ในหน่วยความจำฝั่ง client — ไม่ยิง server
import { MODULES, MODULE_BY_KEY } from "./schema";
import { Snapshot } from "./types";

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

function agingDays(d: string): number | null {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return Math.floor((Date.now() - dt.getTime()) / 86400000);
}

function topCount(vals: string[], n = 6): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of vals) {
    const v = (raw || "").trim();
    if (!v) continue;
    map.set(v, (map.get(v) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

const rowsOf = (snap: Snapshot, key: string) => snap.modules[key] || [];

// ===== Dashboard =====
export interface DashStat {
  key: string;
  label: string;
  total: number;
  ended: number;
  open: number;
}
export function dashboardStats(snap: Snapshot): DashStat[] {
  return MODULES.map((m) => {
    const statusKey = m.fields[0].key;
    const rows = rowsOf(snap, m.key);
    const ended = rows.filter((r) => (r[statusKey] || "") === "End").length;
    return { key: m.key, label: m.label, total: rows.length, ended, open: rows.length - ended };
  });
}

// ===== Supervisor / Action =====
const PIC_KEYS = ["im_cs", "ex_cs", "cs_pic", "entry_pic", "ship_pic", "trans_pic", "wh_pic", "cost_pic", "acc_pic"];
const REMARK_KEYS = ["im_cs_remark", "imp_cs_remark2", "ex_cs_remark", "shipping_remark", "trans_remark", "wha_remark", "entry_remark", "sell_remark", "ap_remark", "ar_remark"];
const pick = (r: Record<string, string>, keys: string[]) => {
  for (const k of keys) if ((r[k] || "").trim()) return r[k];
  return "";
};

export interface FlatJob {
  short: string;
  jobNo: string;
  customer: string;
  status: string;
  pic: string;
  remark: string;
  date: string;
  aging: number | null;
}
export function collectJobs(snap: Snapshot): FlatJob[] {
  const out: FlatJob[] = [];
  for (const m of MODULES) {
    const statusKey = m.fields[0].key;
    const dateField = m.fields.find((f) => f.type === "datetime");
    for (const r of rowsOf(snap, m.key)) {
      const date = (dateField && r[dateField.key]) || "";
      out.push({
        short: m.short,
        jobNo: (r[m.jobNoKey] || "").trim(),
        customer: r.customer || "",
        status: r[statusKey] || "",
        pic: pick(r, PIC_KEYS),
        remark: pick(r, REMARK_KEYS),
        date,
        aging: agingDays(date),
      });
    }
  }
  return out;
}

// ===== Sales =====
export interface SalesStats {
  totalJobs: number;
  uniqueCustomers: number;
  t20: number;
  t40: number;
  customers: { name: string; jobs: number; c20: number; c40: number }[];
}
export function salesStats(snap: Snapshot): SalesStats {
  const all = [...rowsOf(snap, "cs-import"), ...rowsOf(snap, "cs-export")];
  const byCust = new Map<string, { jobs: number; c20: number; c40: number }>();
  let t20 = 0,
    t40 = 0;
  for (const r of all) {
    const cust = (r.customer || "").trim() || "(ไม่ระบุ)";
    const c20 = num(r.cnt_20gp);
    const c40 = num(r.cnt_40hq);
    t20 += c20;
    t40 += c40;
    const cur = byCust.get(cust) || { jobs: 0, c20: 0, c40: 0 };
    cur.jobs++;
    cur.c20 += c20;
    cur.c40 += c40;
    byCust.set(cust, cur);
  }
  const customers = Array.from(byCust.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.jobs - a.jobs);
  return { totalJobs: all.length, uniqueCustomers: byCust.size, t20, t40, customers };
}

// ===== Management =====
export interface MgmtStats {
  totalAcc: number;
  accPending: number;
  extraItems: number;
  transJobs: number;
  whJobs: number;
  topExtra: { name: string; count: number }[];
  topTransSupp: { name: string; count: number }[];
  topWhSupp: { name: string; count: number }[];
}
export function managementStats(snap: Snapshot): MgmtStats {
  const acc = rowsOf(snap, "accounting");
  const extra = rowsOf(snap, "extra");
  const trans = rowsOf(snap, "transport");
  const wh = rowsOf(snap, "warehouse");
  return {
    totalAcc: acc.length,
    accPending: acc.filter((r) => (r.acc_job_status || "") !== "End").length,
    extraItems: extra.length,
    transJobs: trans.length,
    whJobs: wh.length,
    topExtra: topCount(extra.map((r) => r.extra_req_type || "")),
    topTransSupp: topCount(trans.flatMap((r) => [r.supp1 || "", r.supp2 || "", r.supp3 || ""])),
    topWhSupp: topCount(wh.map((r) => r.wh_supp1 || "")),
  };
}

// ship daily (Shipping ที่ยังไม่ End)
export function shipDailyRows(snap: Snapshot) {
  return rowsOf(snap, MODULE_BY_KEY["shipping"].key).filter((r) => (r.shipp_status || "") !== "End");
}
