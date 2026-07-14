import { ModuleDef } from "./schema";
import { JobRecord } from "./types";

// ตรวจเงื่อนไขก่อนกด End ของแต่ละโมดูล — คืน list เหตุผลที่ยัง End ไม่ได้ (ว่าง = ผ่าน)
// อ้างอิงจาก requirement (Google Sheet ล่าสุด — แถว Status ของแต่ละโมดูล)

type Rec = Partial<JobRecord>;
const has = (v: unknown) => String(v ?? "").trim() !== "";
const isOne = (v: unknown, ...opts: string[]) => opts.includes(String(v ?? "").trim());

// ข้อมูลข้ามโมดูล (สร้างใน db.ts เฉพาะตอน CS จะ End) — ใช้เช็คว่าปลายทาง End/มีรายการแล้ว
export interface EndCtx {
  hasAcc: Set<string>; // job_no ที่มีใน Accounting
  hasExport: Set<string>; // job_no ที่มีใน CS Export
  shipEnd: Map<string, boolean>; // job_no → Shipping = End?
  transEnd: Map<string, boolean>; // job_no → Transport = End?
  whEnd: Map<string, boolean>; // job_no → Warehouse = End?
}

// เงื่อนไข downstream End เมื่อ flag = Yes (ใช้ร่วม Import/Export)
function downstreamEnd(r: Rec, jn: string, ctx: EndCtx | undefined, m: string[]): void {
  if (!ctx) return;
  if (isOne(r.shipping_flag, "Yes") && !ctx.shipEnd.get(jn)) m.push("Shipping? = Yes: รายการที่ tab Shipping ต้องเป็น End");
  if (isOne(r.transport_flag, "Yes") && !ctx.transEnd.get(jn)) m.push("Transport? = Yes: รายการที่ tab Transport ต้องเป็น End");
  if (isOne(r.warehouse_flag, "Yes") && !ctx.whEnd.get(jn)) m.push("Warehouse? = Yes: รายการที่ tab Warehouse ต้องเป็น End");
}

const RULES: Record<string, (r: Rec, ctx?: EndCtx) => string[]> = {
  "04_CS_Import": (r, ctx) => {
    const m: string[] = [];
    const jn = String(r.imp_job_no ?? "").trim();
    if (!has(r.im_doc)) m.push("ต้องเลือก IM/DOC");
    if (!isOne(r.enter_doc, "Done")) m.push("Enter Doc ต้อง Done");
    if (!isOne(r.check_deposit, "Done", "N/A")) m.push("Check Deposit ต้อง Done/N/A");
    if (!isOne(r.scan_file, "Done")) m.push("Scan File ต้อง Done");
    if (ctx && !ctx.hasAcc.has(jn)) m.push("ยังไม่มีรายการนี้ที่ tab Accounting");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type อย่างน้อย 1");
    downstreamEnd(r, jn, ctx, m);
    // หมายเหตุ: ไม่เช็ค "ต้องมีรายการที่ tab Export" อีกต่อไป —
    // Export ที่สร้างจาก Re-Export? เป็นแถวอิสระ (exp_job_no ว่าง) ตรวจย้อนไม่ได้
    return m;
  },
  "05_CS_Export": (r, ctx) => {
    const m: string[] = [];
    const jn = String(r.exp_job_no ?? "").trim();
    if (!has(r.ex_doc)) m.push("ต้องเลือก EX/DOC");
    if (!isOne(r.si_submit, "Done")) m.push("SI Submit ต้อง Done");
    if (!isOne(r.vgm_submit, "Done")) m.push("VGM Submit ต้อง Done");
    if (!isOne(r.sent_pre_alert, "Done")) m.push("Sent Pre-Alert ต้อง Done");
    if (ctx && !ctx.hasAcc.has(jn)) m.push("ยังไม่มีรายการนี้ที่ tab Accounting");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Type อย่างน้อย 1");
    downstreamEnd(r, jn, ctx, m);
    return m;
  },
  "06_Shipping": (r) => {
    const m: string[] = [];
    if (!has(r.entry_pic)) m.push("ต้องมี Entry PIC");
    if (!isOne(r.clearance_status, "Cleared", "Completed")) m.push("Clearance Status ต้อง Cleared/Completed");
    if (!has(r.ship_pic)) m.push("ต้องมี Ship PIC");
    if (isOne(r.ship_pic, "Outsourcing") && !has(r.ship_outsourcing))
      m.push("Ship PIC = Outsourcing ต้องเลือก Ship Outsourcing");
    if (!isOne(r.ship_close_acc_status, "Complete", "Completed")) m.push("Ship Close Acc Status ต้อง Completed");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type + ลงค่าใช้จ่ายใน Extra ให้ครบ");
    return m;
  },
  "07_Transportation": (r) => {
    const m: string[] = [];
    if (!has(r.trans_pic)) m.push("ต้องมี Trans PIC");
    for (const n of [1, 2, 3]) {
      if (has(r[`supp${n}`])) {
        if (!has(r[`supp${n}_fuel`])) m.push(`Supp ${n} ต้องมี Fuel Rate`);
        if (!isOne(r[`supp${n}_sts`], "End", "Completed")) m.push(`Supp ${n} Sts ต้อง End`);
        if (!has(r[`supp${n}_end`])) m.push(`Supp ${n} ต้องมี End Date`);
        if (!has(r[`supp${n}_kpi`])) m.push(`Supp ${n} ต้องมี KPI`);
      }
    }
    if (!has(r.actual_delivery_date)) m.push("ต้องมี Actual Delivery Date");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type + ลงค่าใช้จ่ายใน Extra ให้ครบ");
    return m;
  },
  "08_Warehouse": (r) => {
    const m: string[] = [];
    if (!has(r.wh_pic)) m.push("ต้องมี WH PIC");
    if (!has(r.wh_actual_rcv)) m.push("ต้องมี ACTUAL RCV CARGO TOTAL");
    if (!isOne(r.wh_supp1_sts, "End", "Completed")) m.push("WH Supp 1 Sts ต้อง End");
    if (!has(r.wh_supp1_end)) m.push("ต้องมี WH Supp 1 End Date");
    if (!has(r.actual_finished_date)) m.push("ต้องมี Actual Finished Date");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type + ลงค่าใช้จ่ายใน Extra ให้ครบ");
    return m;
  },
  "09_Extra_Service": (r) => {
    const m: string[] = [];
    if (!isOne(r.cost_sts, "Complete", "Completed")) m.push("Extra Cost Sts ต้อง Complete");
    if (!isOne(r.sell_sts, "Complete", "Completed")) m.push("Extra Sell Sts ต้อง Complete");
    if (!isOne(r.ready_acc, "Done", "Yes")) m.push("Ready Acc? ต้อง Done");
    if (!has(r.profit_sts)) m.push("ต้องมี Extra Profit Sts");
    if (isOne(r.profit_sts, "No Charge")) {
      if (!has(r.no_charge_remark)) m.push("Profit Sts = No Charge ต้องมี No Charge Remark");
    } else if (!has(r.sell_pic)) {
      m.push("ต้องมี Extra Sell PIC");
    }
    return m;
  },
  "10_Accounting": (r) => {
    const m: string[] = [];
    if (!isOne(r.acc_approved_sts, "Approved")) m.push("Acc Approved Sts ต้อง Approved");
    if (!has(r.ap_pic)) m.push("ต้องมี AP PIC");
    if (!isOne(r.ap_status, "Completed", "Complete")) m.push("AP Status ต้อง Completed");
    if (!has(r.ar_pic)) m.push("ต้องมี AR PIC");
    if (!isOne(r.ar_status, "Paid")) m.push("AR Status ต้อง Paid");
    return m;
  },
};

export function checkEnd(m: ModuleDef, rec: Rec, ctx?: EndCtx): string[] {
  const fn = RULES[m.id];
  return fn ? fn(rec, ctx) : [];
}
