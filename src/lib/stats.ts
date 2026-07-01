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
  topCustomers: { name: string; jobs: number; conts: number; pct: number }[];
  topSales: { name: string; jobs: number; conts: number; pct: number }[];
  jobTypes: { name: string; total: number; finished: number; pending: number }[];
  workflow: { module: string; active: number; pending: number; end: number }[];
  extraCases: number;
  noChargeCases: number;
  lostAmount: number;
  internalErrCases: number;
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

  return {
    finished,
    finishedConts,
    impFinished: impFin.length,
    expFinished: expFin.length,
    active,
    pending,
    completion,
    accReceived,
    invoiceIssued,
    pendingInvoice: Math.max(0, accReceived - invoiceIssued),
    paid,
    pendingCollection: Math.max(0, invoiceIssued - paid),
    topCustomers: topBy("customer"),
    topSales: topBy("sales_bkg_by"),
    jobTypes: Array.from(jtMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    workflow,
    extraCases: extra.length,
    noChargeCases: noCharge.length,
    lostAmount,
    internalErrCases,
  };
}

// ================= 01 Supervisor (control tower) =================
export interface SupervisorDash {
  exceptions: { label: string; count: number; hint: string }[];
  team: { team: string; total: number; active: number; endToday: number; endMonth: number }[];
  staff: { pic: string; total: number; active: number; end: number; delay: number; error: number }[];
  noChargeList: { jobNo: string; team: string; pic: string; type: string; lost: number; reason: string; remark: string }[];
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
  const staffMap = new Map<string, { total: number; active: number; end: number; delay: number; error: number }>();
  for (const [key, sk] of teamDefs.map((d) => [d[0], d[1]] as [string, string])) {
    for (const r of rowsOf(snap, key)) {
      const pic = pick(r, PIC_KEYS);
      if (!pic) continue;
      const cur = staffMap.get(pic) || { total: 0, active: 0, end: 0, delay: 0, error: 0 };
      cur.total++;
      const s = r[sk] || "";
      if (s === "End") cur.end++;
      else if (s !== "Cancel") cur.active++;
      const d = daysSince(r.created_at);
      if (d != null && d > 7 && s !== "End") cur.delay++;
      staffMap.set(pic, cur);
    }
  }
  for (const r of rowsOf(snap, "extra")) {
    if (!isInternalErr(r.root_cause)) continue;
    const pic = pick(r, PIC_KEYS);
    if (!pic) continue;
    const cur = staffMap.get(pic) || { total: 0, active: 0, end: 0, delay: 0, error: 0 };
    cur.error++;
    staffMap.set(pic, cur);
  }
  const staff = Array.from(staffMap.entries())
    .map(([pic, v]) => ({ pic, ...v }))
    .sort((a, b) => b.total - a.total);

  const noChargeList = rowsOf(snap, "extra")
    .filter((r) => r.profit_sts === "No Charge")
    .map((r) => ({
      jobNo: r.job_no || "",
      team: r.module || "",
      pic: pick(r, PIC_KEYS),
      type: r.extra_req_type || "",
      lost: num(r.cost_total),
      reason: r.root_cause || "",
      remark: r.no_charge_remark || "",
    }));

  return { exceptions, team, staff, noChargeList };
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
