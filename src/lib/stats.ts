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
export interface DashStatusCount {
  name: string;
  count: number;
}
export interface DashStat {
  key: string;
  label: string;
  total: number;
  ended: number;
  open: number;
  byStatus: DashStatusCount[]; // นับแยกทุก Status (เรียงตามลำดับใน list)
}
export function dashboardStats(snap: Snapshot): DashStat[] {
  const order = snap.lists?.im_ops_status || [];
  return MODULES.map((m) => {
    const statusKey = m.fields[0].key;
    const rows = rowsOf(snap, m.key);
    // นับแต่ละค่า Status
    const counts = new Map<string, number>();
    for (const r of rows) {
      const s = (r[statusKey] || "").trim() || "(ว่าง)";
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    // เรียงตามลำดับใน list ก่อน แล้วต่อด้วยค่าที่ไม่อยู่ใน list
    const seen = new Set<string>();
    const byStatus: DashStatusCount[] = [];
    for (const name of order) {
      if (counts.has(name)) { byStatus.push({ name, count: counts.get(name)! }); seen.add(name); }
    }
    for (const [name, count] of counts) {
      if (!seen.has(name)) byStatus.push({ name, count });
    }
    const ended = counts.get("End") || 0;
    return { key: m.key, label: m.label, total: rows.length, ended, open: rows.length - ended, byStatus };
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

// ================= เวลา/เดือน =================
export const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const ym = (d: string) => {
  const m = (d || "").match(/^(\d{4})-(\d{2})/);
  return m ? { y: m[1], m: m[2] } : null;
};
const inMonth = (d: string, year: string, month: string) => {
  const p = ym(d);
  if (!p) return false;
  if (year && p.y !== year) return false;
  if (month && p.m !== month) return false;
  return true;
};
const daysSince = (d: string): number | null => {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Math.floor((Date.now() - new Date(+m[1], +m[2] - 1, +m[3]).getTime()) / 86400000);
};
const contQty = (r: Record<string, string>) =>
  num(r.cnt_4w) + num(r.cnt_6w) + num(r.cnt_10w) + num(r.cnt_20gp) + num(r.cnt_40hq);
const isInternalErr = (v: string) => /internal/i.test(v || "");

// ================= 00 Management (รายเดือน) =================
export interface MgmtDash {
  finished: number;
  finishedConts: number;
  impFinished: number;
  expFinished: number;
  active: number;
  pending: number;
  completion: number; // %
  accReceived: number;
  invoiceIssued: number;
  pendingInvoice: number;
  paid: number;
  pendingCollection: number;
  lastFinished: number;
  lastFinishedConts: number;
  topCustomers: { name: string; jobs: number; conts: number; pct: number }[];
  topSales: { name: string; jobs: number; conts: number; pct: number; kpi: number }[];
  jobTypes: { name: string; total: number; finished: number; pending: number }[];
  workflow: { module: string; active: number; pending: number; end: number }[];
  extraCases: number;
  noChargeCases: number;
  lostAmount: number;
  internalErrCases: number;
  serviceByModule: { module: string; extraCases: number; noChargeCases: number; lost: number; noChargePct: number }[];
  errorByModule: { module: string; cases: number; loss: number; pct: number }[];
  topTransOnTime: SupplierStat[];
  topTransDelay: SupplierStat[];
  topWhOnTime: SupplierStat[];
  topWhDelay: SupplierStat[];
}
export interface SupplierStat {
  name: string;
  jobs: number;
  conts: number;
  pct: number;
  onTime: number;
  delay: number;
  onTimePct: number;
  delayPct: number;
}

// จับคู่ supplier → นับงาน/ตู้/ตรงเวลา/ล่าช้า (measured = แถวที่มีวันจริง+วันกำหนด)
function supplierBreakdown(
  rows: Record<string, string>[],
  suppKeys: string[],
  actualKey: string,
  dueKey: string
): { onTime: SupplierStat[]; delay: SupplierStat[] } {
  const m = new Map<string, { jobs: number; conts: number; onTime: number; delay: number }>();
  let totalJobs = 0;
  for (const r of rows) {
    const conts = contQty(r);
    const actual = (r[actualKey] || "").slice(0, 10);
    const due = (r[dueKey] || "").slice(0, 10);
    const measured = !!actual && !!due;
    const late = measured && actual > due;
    for (const sk of suppKeys) {
      const name = (r[sk] || "").trim();
      if (!name) continue;
      totalJobs++;
      const cur = m.get(name) || { jobs: 0, conts: 0, onTime: 0, delay: 0 };
      cur.jobs++;
      cur.conts += conts;
      if (measured) late ? cur.delay++ : cur.onTime++;
      m.set(name, cur);
    }
  }
  const base = totalJobs || 1;
  const list: SupplierStat[] = Array.from(m.entries()).map(([name, v]) => {
    const meas = v.onTime + v.delay || 1;
    return {
      name,
      jobs: v.jobs,
      conts: v.conts,
      pct: Math.round((v.jobs / base) * 100),
      onTime: v.onTime,
      delay: v.delay,
      onTimePct: Math.round((v.onTime / meas) * 100),
      delayPct: Math.round((v.delay / meas) * 100),
    };
  });
  return {
    onTime: [...list].sort((a, b) => b.onTimePct - a.onTimePct || b.jobs - a.jobs).slice(0, 5),
    delay: [...list].sort((a, b) => b.delay - a.delay || b.delayPct - a.delayPct).slice(0, 5),
  };
}
export function managementDash(snap: Snapshot, year: string, month: string): MgmtDash {
  const imp = rowsOf(snap, "cs-import");
  const exp = rowsOf(snap, "cs-export");
  const cs = [...imp, ...exp];
  const impFin = imp.filter((r) => r.im_ops_status === "End" && inMonth(r.ended_at, year, month));
  const expFin = exp.filter((r) => r.ex_ops_status === "End" && inMonth(r.ended_at, year, month));
  const finished = impFin.length + expFin.length;
  const finishedConts = [...impFin, ...expFin].reduce((a, r) => a + contQty(r), 0);

  const stat = (r: Record<string, string>) => r.im_ops_status || r.ex_ops_status || "";
  const active = cs.filter((r) => !["End", "Cancel"].includes(stat(r))).length;
  const pending = cs.filter((r) => stat(r) === "Pending").length;
  const completion = finished + active > 0 ? Math.round((finished / (finished + active)) * 100) : 0;

  const acc = rowsOf(snap, "accounting");
  const accReceived = acc.length;
  const invoiceIssued = acc.filter(
    (r) => (r.billing_date || "").trim() || ["Invoiced", "Partial Paid", "Paid"].includes(r.ar_status)
  ).length;
  const paid = acc.filter((r) => r.cus_paid === "Yes" || r.ar_status === "Paid").length;

  // เทียบเดือนก่อนหน้า (Finished Jobs/Containers)
  let ly = +year, lm = +month - 1;
  if (lm < 1) { lm = 12; ly -= 1; }
  const lastY = String(ly), lastM = String(lm).padStart(2, "0");
  const lastFin = [
    ...imp.filter((r) => r.im_ops_status === "End" && inMonth(r.ended_at, lastY, lastM)),
    ...exp.filter((r) => r.ex_ops_status === "End" && inMonth(r.ended_at, lastY, lastM)),
  ];

  const total = cs.length || 1;
  const topBy = (key: string) => {
    const m = new Map<string, { jobs: number; conts: number }>();
    for (const r of cs) {
      const k = (r[key] || "").trim();
      if (!k) continue;
      const cur = m.get(k) || { jobs: 0, conts: 0 };
      cur.jobs++;
      cur.conts += contQty(r);
      m.set(k, cur);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, jobs: v.jobs, conts: v.conts, pct: Math.round((v.jobs / total) * 100) }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 5);
  };

  const jtMap = new Map<string, { total: number; finished: number; pending: number }>();
  for (const r of cs) {
    const k = (r.job_type || "").trim() || "(ไม่ระบุ)";
    const cur = jtMap.get(k) || { total: 0, finished: 0, pending: 0 };
    cur.total++;
    if (stat(r) === "End") cur.finished++;
    if (stat(r) === "Pending") cur.pending++;
    jtMap.set(k, cur);
  }

  const wfMods: [string, string, string][] = [
    ["cs-import", "im_ops_status", "CS Import"],
    ["cs-export", "ex_ops_status", "CS Export"],
    ["shipping", "shipp_status", "Shipping"],
    ["transport", "trans_status", "Transport"],
    ["warehouse", "wha_status", "Warehouse"],
    ["extra", "extra_status", "Extra"],
    ["accounting", "acc_job_status", "Accounting"],
  ];
  const workflow = wfMods.map(([key, sk, label]) => {
    const rs = rowsOf(snap, key);
    return {
      module: label,
      active: rs.filter((r) => !["End", "Cancel"].includes(r[sk] || "")).length,
      pending: rs.filter((r) => (r[sk] || "") === "Pending").length,
      end: rs.filter((r) => (r[sk] || "") === "End").length,
    };
  });

  const extra = rowsOf(snap, "extra");
  const noCharge = extra.filter((r) => r.profit_sts === "No Charge");
  const lostAmount = noCharge.reduce((a, r) => a + num(r.cost_total), 0);
  const internalErrCases = extra.filter((r) => isInternalErr(r.root_cause)).length;

  // Service / Internal Error แยกตามโมดูลต้นทาง (Extra.module ใช้ป้ายใหม่ FREIGHT IMPORT ฯลฯ)
  const SERVICE_MODS = [
    { key: "FREIGHT IMPORT", label: "Import", fin: impFin.length },
    { key: "FREIGHT EXPORT", label: "Export", fin: expFin.length },
    { key: "SHIPPING", label: "Shipping", fin: workflow.find((w) => w.module === "Shipping")?.end || 0 },
    { key: "TRANSPORT", label: "Transport", fin: workflow.find((w) => w.module === "Transport")?.end || 0 },
    { key: "WAREHOUSE", label: "Warehouse", fin: workflow.find((w) => w.module === "Warehouse")?.end || 0 },
  ];
  const serviceByModule = SERVICE_MODS.map(({ key, label }) => {
    const rs = extra.filter((r) => (r.module || "").trim() === key);
    const nc = rs.filter((r) => r.profit_sts === "No Charge");
    return {
      module: label,
      extraCases: rs.length,
      noChargeCases: nc.length,
      lost: nc.reduce((a, r) => a + num(r.cost_total), 0),
      noChargePct: rs.length ? Math.round((nc.length / rs.length) * 100) : 0,
    };
  });
  const errorByModule = SERVICE_MODS.map(({ key, label, fin }) => {
    const errs = extra.filter((r) => (r.module || "").trim() === key && isInternalErr(r.root_cause));
    return {
      module: label,
      cases: errs.length,
      loss: errs.reduce((a, r) => a + num(r.cost_total), 0),
      pct: fin ? Math.round((errs.length / fin) * 100) : 0,
    };
  });

  const trans = supplierBreakdown(rowsOf(snap, "transport"), ["supp1", "supp2", "supp3"], "actual_delivery_date", "delivery_date");
  const wh = supplierBreakdown(rowsOf(snap, "warehouse"), ["wh_supp1"], "actual_finished_date", "delivery_date");

  const salesTop = topBy("sales_bkg_by");
  const topSalesJobs = salesTop[0]?.jobs || 1;

  return {
    finished,
    finishedConts,
    impFinished: impFin.length,
    expFinished: expFin.length,
    active,
    pending,
    completion,
    lastFinished: lastFin.length,
    lastFinishedConts: lastFin.reduce((a, r) => a + contQty(r), 0),
    accReceived,
    invoiceIssued,
    pendingInvoice: Math.max(0, accReceived - invoiceIssued),
    paid,
    pendingCollection: Math.max(0, invoiceIssued - paid),
    topCustomers: topBy("customer"),
    topSales: salesTop.map((s) => ({ ...s, kpi: Math.round((s.jobs / topSalesJobs) * 100) })),
    jobTypes: Array.from(jtMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    workflow,
    extraCases: extra.length,
    noChargeCases: noCharge.length,
    lostAmount,
    internalErrCases,
    serviceByModule,
    errorByModule,
    topTransOnTime: trans.onTime,
    topTransDelay: trans.delay,
    topWhOnTime: wh.onTime,
    topWhDelay: wh.delay,
  };
}

// ================= 01 Supervisor (control tower) =================
export interface SupervisorDash {
  risk: { mostErrorTeam: string; mostErrorCount: number; errorLost: number; mostPendingTeam: string; mostPendingCount: number };
  exceptions: { label: string; count: number; hint: string }[];
  team: { team: string; total: number; active: number; endToday: number; endMonth: number }[];
  errorHealth: { team: string; noChargeCases: number; riskPic: string; extraType: string; lost: number; errorRate: number }[];
  staff: { pic: string; team: string; total: number; active: number; end: number; delay: number; error: number }[];
  noChargeList: { jobNo: string; date: string; team: string; pic: string; type: string; lost: number; reason: string; remark: string }[];
}
export function supervisorDash(snap: Snapshot, year: string, month: string): SupervisorDash {
  const imp = rowsOf(snap, "cs-import");
  const exp = rowsOf(snap, "cs-export");
  const acc = rowsOf(snap, "accounting");
  const cs = [...imp, ...exp];
  const stat = (r: Record<string, string>) => r.im_ops_status || r.ex_ops_status || "";

  const etaPassed = imp.filter((r) => {
    const d = daysSince(r.eta_imp);
    return d != null && d > 0 && r.im_ops_status !== "End";
  }).length;
  const etdPassed = exp.filter((r) => {
    const d = daysSince(r.etd_exp);
    return d != null && d > 0 && r.ex_ops_status !== "End";
  }).length;
  const openOver = (n: number) =>
    cs.filter((r) => {
      const d = daysSince(r.created_at);
      return d != null && d > n && !["End", "Cancel"].includes(stat(r));
    }).length;
  const cancel = cs.filter((r) => stat(r) === "Cancel").length;
  const pendInv15 = acc.filter((r) => {
    const d = daysSince(r.created_at);
    return d != null && d > 15 && r.cus_paid !== "Yes" && r.ar_status !== "Paid";
  }).length;

  const exceptions = [
    { label: "ETA Passed", count: etaPassed, hint: "Today > ETA และ IM/OPS ≠ End" },
    { label: "ETD Passed", count: etdPassed, hint: "Today > ETD และ EX/OPS ≠ End" },
    { label: "Job Open > 7 วัน", count: openOver(7), hint: "ยังไม่ End เกิน 7 วัน" },
    { label: "Job Open > 15 วัน", count: openOver(15), hint: "ยังไม่ End เกิน 15 วัน" },
    { label: "Job Open > 30 วัน", count: openOver(30), hint: "ยังไม่ End เกิน 30 วัน" },
    { label: "Cancel Job", count: cancel, hint: "Status = Cancel" },
    { label: "Pending Invoice > 15 วัน", count: pendInv15, hint: "Accounting ค้างเก็บเงินเกิน 15 วัน" },
  ];

  const teamDefs: [string, string, string][] = [
    ["cs-import", "im_ops_status", "Import"],
    ["cs-export", "ex_ops_status", "Export"],
    ["shipping", "shipp_status", "Shipping"],
    ["transport", "trans_status", "Transport"],
    ["warehouse", "wha_status", "Warehouse"],
    ["accounting", "acc_job_status", "Accounting"],
  ];
  const todayY = String(new Date().getFullYear());
  const todayM = String(new Date().getMonth() + 1).padStart(2, "0");
  const todayD = new Date().toISOString().slice(0, 10);
  const team = teamDefs.map(([key, sk, label]) => {
    const rs = rowsOf(snap, key);
    return {
      team: label,
      total: rs.filter((r) => inMonth(r.created_at, year, month)).length,
      active: rs.filter((r) => !["End", "Cancel"].includes(r[sk] || "")).length,
      endToday: rs.filter((r) => (r[sk] || "") === "End" && (r.ended_at || "").slice(0, 10) === todayD).length,
      endMonth: rs.filter((r) => (r[sk] || "") === "End" && inMonth(r.ended_at, todayY, todayM)).length,
    };
  });

  // Staff KPI รวมทุกโมดูล ตาม PIC
  type SV = { team: string; total: number; active: number; end: number; delay: number; error: number };
  const staffMap = new Map<string, SV>();
  const ensure = (pic: string, team: string): SV => {
    const cur = staffMap.get(pic) || { team, total: 0, active: 0, end: 0, delay: 0, error: 0 };
    if (!cur.team) cur.team = team;
    staffMap.set(pic, cur);
    return cur;
  };
  for (const [key, sk, label] of teamDefs) {
    for (const r of rowsOf(snap, key)) {
      const pic = pick(r, PIC_KEYS);
      if (!pic) continue;
      const cur = ensure(pic, label);
      cur.total++;
      const s = r[sk] || "";
      if (s === "End") cur.end++;
      else if (s !== "Cancel") cur.active++;
      const d = daysSince(r.created_at);
      if (d != null && d > 7 && s !== "End") cur.delay++;
    }
  }
  for (const r of rowsOf(snap, "extra")) {
    if (!isInternalErr(r.root_cause)) continue;
    const pic = pick(r, PIC_KEYS);
    if (!pic) continue;
    ensure(pic, r.module || "").error++;
  }
  const staff = Array.from(staffMap.entries())
    .map(([pic, v]) => ({ pic, ...v }))
    .sort((a, b) => b.total - a.total);

  const noChargeList = rowsOf(snap, "extra")
    .filter((r) => r.profit_sts === "No Charge")
    .map((r) => ({
      jobNo: r.job_no || "",
      date: (r.ended_at || r.created_at || "").slice(0, 10),
      team: r.module || "",
      pic: pick(r, PIC_KEYS),
      type: r.extra_req_type || "",
      lost: num(r.cost_total),
      reason: r.root_cause || "",
      remark: r.no_charge_remark || "",
    }));

  // Internal Error Health รายทีม (จาก Extra.module) + End Job รายทีมสำหรับ Error Rate
  const endByTeam: Record<string, number> = {};
  for (const [key, sk, label] of teamDefs) {
    endByTeam[label] = rowsOf(snap, key).filter((r) => (r[sk] || "") === "End").length;
  }
  const EXTRA_MODS = [
    { key: "FREIGHT IMPORT", team: "Import" },
    { key: "FREIGHT EXPORT", team: "Export" },
    { key: "SHIPPING", team: "Shipping" },
    { key: "TRANSPORT", team: "Transport" },
    { key: "WAREHOUSE", team: "Warehouse" },
  ];
  const errorHealth = EXTRA_MODS.map(({ key, team }) => {
    const rs = rowsOf(snap, "extra").filter((r) => (r.module || "").trim() === key);
    const nc = rs.filter((r) => r.profit_sts === "No Charge");
    const errs = rs.filter((r) => isInternalErr(r.root_cause));
    const end = endByTeam[team] || 0;
    return {
      team,
      noChargeCases: nc.length,
      riskPic: topCount(errs.map((r) => pick(r, PIC_KEYS)), 1)[0]?.name || "—",
      extraType: topCount(rs.map((r) => r.extra_req_type || ""), 1)[0]?.name || "—",
      lost: nc.reduce((a, r) => a + num(r.cost_total), 0),
      errorRate: end ? Math.round((errs.length / end) * 100) : 0,
    };
  });

  // Operational Risk Summary
  const topErr = [...errorHealth].sort((a, b) => b.noChargeCases - a.noChargeCases)[0];
  const pendByTeam = teamDefs.map(([key, sk, label]) => ({
    team: label,
    count: rowsOf(snap, key).filter((r) => (r[sk] || "") === "Pending").length,
  }));
  const topPend = [...pendByTeam].sort((a, b) => b.count - a.count)[0];
  const risk = {
    mostErrorTeam: topErr && topErr.noChargeCases > 0 ? topErr.team : "—",
    mostErrorCount: topErr?.noChargeCases || 0,
    errorLost: errorHealth.reduce((a, e) => a + e.lost, 0),
    mostPendingTeam: topPend && topPend.count > 0 ? topPend.team : "—",
    mostPendingCount: topPend?.count || 0,
  };

  return { risk, exceptions, team, errorHealth, staff, noChargeList };
}

// ================= 02 Action Follow-up (Current Module) =================
const SEQ: { key: string; sk: string; flag?: string; label: string }[] = [
  { key: "shipping", sk: "shipp_status", flag: "shipping_flag", label: "Shipping" },
  { key: "transport", sk: "trans_status", flag: "transport_flag", label: "Transport" },
  { key: "warehouse", sk: "wha_status", flag: "warehouse_flag", label: "Warehouse" },
  { key: "extra", sk: "extra_status", label: "Extra" },
  { key: "accounting", sk: "acc_job_status", label: "Accounting" },
];
const BLOCK: Record<string, string> = {
  Shipping: "Internal / Customs",
  Transport: "Supplier",
  Warehouse: "Supplier",
  Extra: "Internal",
  Accounting: "Customer",
  CS: "Internal",
};

export interface ActionRow {
  jobNo: string;
  booking: string;
  jobType: string;
  customer: string;
  csPic: string;
  currentModule: string;
  conts: number;
  c4w: number;
  c6w: number;
  c10w: number;
  c20gp: number;
  c40hq: number;
  currentStatus: string;
  currentPic: string;
  actionRequired: string;
  firstAssigned: string;
  blocking: string;
  aging: number | null;
  remark: string;
}
export function actionRows(snap: Snapshot): ActionRow[] {
  const byJob = (key: string, jobKey: string) => {
    const m = new Map<string, Record<string, string>>();
    for (const r of rowsOf(snap, key)) {
      const k = (r[jobKey] || "").trim();
      if (k) m.set(k, r);
    }
    return m;
  };
  const ship = byJob("shipping", "job_no");
  const trans = byJob("transport", "job_no");
  const wh = byJob("warehouse", "job_no");
  const extra = byJob("extra", "job_no");
  const acc = byJob("accounting", "job_no");
  const down: Record<string, Map<string, Record<string, string>>> = {
    shipping: ship, transport: trans, warehouse: wh, extra, accounting: acc,
  };

  const out: ActionRow[] = [];
  const consider = (csRows: Record<string, string>[], jobKey: string, statusKey: string, csLabel: string) => {
    for (const r of csRows) {
      const jobNo = (r[jobKey] || "").trim();
      if (!jobNo) continue;
      const csStatus = r[statusKey] || "";
      if (csStatus === "Cancel") continue;

      let current = "";
      let cStatus = "";
      let cPic = "";
      for (const step of SEQ) {
        if (step.flag && (r[step.flag] || "") !== "Yes") continue; // ไม่ใช้บริการนี้
        const rec = down[step.key].get(jobNo);
        const st = rec ? rec[step.sk] || "" : "";
        if (st !== "End") {
          current = step.label;
          cStatus = st || "Waiting";
          cPic = rec ? pick(rec, PIC_KEYS) : "";
          break;
        }
      }
      if (!current) {
        // downstream ครบ → เหลือ CS ปิดงาน
        if (csStatus !== "End") {
          current = csLabel;
          cStatus = csStatus || "Waiting";
          cPic = pick(r, PIC_KEYS);
        } else continue; // จบทุกอย่างแล้ว ไม่ต้องติดตาม
      }
      out.push({
        jobNo,
        booking: r.imp_booking_mbl || r.exp_booking_mbl || "",
        jobType: r.job_type || "",
        customer: r.customer || "",
        csPic: pick(r, PIC_KEYS),
        currentModule: current,
        conts: contQty(r),
        c4w: num(r.cnt_4w),
        c6w: num(r.cnt_6w),
        c10w: num(r.cnt_10w),
        c20gp: num(r.cnt_20gp),
        c40hq: num(r.cnt_40hq),
        currentStatus: cStatus,
        currentPic: cPic,
        actionRequired: cStatus,
        firstAssigned: r.created_at || "",
        blocking: BLOCK[current] || BLOCK.CS,
        aging: daysSince(r.created_at),
        remark: r.im_cs_remark || r.ex_cs_remark || "",
      });
    }
  };
  consider(rowsOf(snap, "cs-import"), "imp_job_no", "im_ops_status", "CS Import");
  consider(rowsOf(snap, "cs-export"), "exp_job_no", "ex_ops_status", "CS Export");
  return out.sort((a, b) => (b.aging ?? -1) - (a.aging ?? -1));
}

// ปีที่มีในระบบ (จาก created_at ของ CS)
export function yearsInData(snap: Snapshot): string[] {
  const s = new Set<string>();
  for (const key of ["cs-import", "cs-export"]) {
    for (const r of rowsOf(snap, key)) {
      const p = ym(r.created_at);
      if (p) s.add(p.y);
    }
  }
  s.add(String(new Date().getFullYear()));
  return Array.from(s).sort().reverse();
}
