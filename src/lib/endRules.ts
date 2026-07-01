import { ModuleDef } from "./schema";
import { JobRecord } from "./types";

// ตรวจเงื่อนไขก่อนกด End ของแต่ละโมดูล — คืน list เหตุผลที่ยัง End ไม่ได้ (ว่าง = ผ่าน)
// อ้างอิงจาก requirement.xlsx (แถว IM/OPS Status ... ของแต่ละโมดูล)

type Rec = Partial<JobRecord>;
const has = (v: unknown) => String(v ?? "").trim() !== "";
const isOne = (v: unknown, ...opts: string[]) => opts.includes(String(v ?? "").trim());
const docOk = (v: unknown) => isOne(v, "Done", "N/A", "Completed", "Cleared", "Complete");

const RULES: Record<string, (r: Rec) => string[]> = {
  "04_CS_Import": (r) => {
    const m: string[] = [];
    if (!has(r.imp_job_no)) m.push("ต้องมี IMP/Job No.");
    if (!has(r.customer)) m.push("ต้องมี Customer");
    if (!has(r.job_type)) m.push("ต้องมี Job Type");
    if (!docOk(r.enter_doc)) m.push("Enter Doc ต้อง Done/N/A");
    if (!isOne(r.check_deposit, "Done")) m.push("Check Deposit ต้อง Done");
    if (!isOne(r.scan_file, "Done")) m.push("Scan File ต้อง Done");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type");
    return m;
  },
  "05_CS_Export": (r) => {
    const m: string[] = [];
    if (!has(r.exp_job_no)) m.push("ต้องมี EXP/Job No.");
    if (!has(r.customer)) m.push("ต้องมี Customer");
    if (!docOk(r.si_submit)) m.push("SI Submit ต้อง Done/N/A");
    if (!docOk(r.vgm_submit)) m.push("VGM Submit ต้อง Done/N/A");
    if (!docOk(r.sent_pre_alert)) m.push("Sent Pre-Alert ต้อง Done/N/A");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Type");
    return m;
  },
  "06_Shipping": (r) => {
    const m: string[] = [];
    if (!has(r.ship_pic)) m.push("ต้องมี Ship PIC");
    if (isOne(r.clearance_status, "Pending"))
      m.push("Clearance Status = Pending ยัง End ไม่ได้");
    else if (!isOne(r.clearance_status, "Cleared", "Completed"))
      m.push("Clearance Status ต้อง Cleared/Completed");
    if (!isOne(r.ship_close_acc_status, "Complete", "Completed"))
      m.push("Ship Close Acc Status ต้อง Complete");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type");
    return m;
  },
  "07_Transportation": (r) => {
    const m: string[] = [];
    if (!has(r.trans_pic)) m.push("ต้องมี Trans PIC");
    for (const n of [1, 2, 3]) {
      if (has(r[`supp${n}`])) {
        if (!isOne(r[`supp${n}_sts`], "End", "Completed"))
          m.push(`Supp ${n} Sts ต้อง End/Completed`);
        if (!has(r[`supp${n}_end`])) m.push(`Supp ${n} ต้องมี End Date`);
      }
    }
    if (!has(r.actual_delivery_date)) m.push("ต้องมี Actual Delivery Date");
    return m;
  },
  "08_Warehouse": (r) => {
    const m: string[] = [];
    if (!has(r.wh_pic)) m.push("ต้องมี WH PIC");
    if (!has(r.wh_actual_rcv)) m.push("ต้องมี ACTUAL RCV CARGO TOTAL");
    if (has(r.wh_supp1) && !isOne(r.wh_supp1_sts, "End", "Completed"))
      m.push("WH Supp 1 Sts ต้อง End/Completed");
    if (!has(r.actual_finished_date)) m.push("ต้องมี Actual Finished Date");
    return m;
  },
  "09_Extra_Service": (r) => {
    const m: string[] = [];
    if (!isOne(r.cost_sts, "Complete", "Completed")) m.push("Cost Sts ต้อง Complete");
    if (!has(r.profit_sts)) m.push("ต้องมี Profit Sts");
    if (isOne(r.profit_sts, "No Charge") && !has(r.no_charge_remark))
      m.push("Profit Sts = No Charge ต้องมี No Charge Remark");
    if (!isOne(r.ready_acc, "Yes", "Done")) m.push("Ready Acc? ต้องเป็น Yes");
    return m;
  },
  "10_Accounting": (r) => {
    const m: string[] = [];
    if (!isOne(r.acc_approved_sts, "Approved")) m.push("Acc Approved Sts ต้อง Approved");
    if (!isOne(r.ap_status, "Completed", "Complete")) m.push("AP Status ต้อง Completed");
    if (!isOne(r.ar_status, "Paid", "No Charge")) m.push("AR Status ต้อง Paid/No Charge");
    if (!isOne(r.cus_paid, "Yes", "Done")) m.push("Cus Paid? ต้องเป็น Yes");
    return m;
  },
};

export function checkEnd(m: ModuleDef, rec: Rec): string[] {
  const fn = RULES[m.id];
  return fn ? fn(rec) : [];
}
