import { ModuleDef } from "./schema";
import { JobRecord } from "./types";

// ตรวจเงื่อนไขก่อนกด End ของแต่ละโมดูล — คืน list เหตุผลที่ยัง End ไม่ได้ (ว่าง = ผ่าน)
// อ้างอิงจาก requirement (Google Sheet ล่าสุด — แถว Status ของแต่ละโมดูล)

type Rec = Partial<JobRecord>;
const has = (v: unknown) => String(v ?? "").trim() !== "";
const isOne = (v: unknown, ...opts: string[]) => opts.includes(String(v ?? "").trim());

// ข้อมูลข้ามโมดูล (สร้างใน db.ts เฉพาะตอนโมดูลนั้นจะตั้ง Status = End)
// คีย์ทุกตัว = รหัสเชื่อม (__id) ไม่ใช่ Job No.
export interface EndCtx {
  hasAcc: Set<string>; // __id ของงาน CS ที่มีแถวใน Accounting
  shipEnd: Map<string, boolean>; // __id งาน CS → Shipping = End?
  transEnd: Map<string, boolean>; // __id งาน CS → Transport = End?
  whEnd: Map<string, boolean>; // __id งาน CS → Warehouse = End?
  // __id แถวต้นทาง (04–08) → แถว Extra ที่แถวนี้สร้างไว้ Input Status = END ครบทุกบรรทัดแล้ว?
  // (ไม่มีแถว Extra = ไม่มีเงื่อนไข)
  extraEnd: Map<string, boolean>;
}

const idOf = (r: Rec) => String(r.__id ?? "").trim();

// ต้องเคลียร์รายการที่ tab Extra ของแถวนี้ให้ END ก่อน ถึงจะปิดงานได้
function extraLinesEnd(r: Rec, ctx: EndCtx | undefined, m: string[]): void {
  if (!ctx) return;
  if (ctx.extraEnd.get(idOf(r)) === false)
    m.push("ยังมีรายการที่ tab Extra ของโมดูลนี้ที่ Input Status ไม่เป็น END");
}

// เงื่อนไข downstream End เมื่อ flag = Yes (ใช้ร่วม Import/Export)
function downstreamEnd(r: Rec, ctx: EndCtx | undefined, m: string[]): void {
  if (!ctx) return;
  const jn = idOf(r);
  if (isOne(r.shipping_flag, "Yes") && !ctx.shipEnd.get(jn)) m.push("Shipping? = Yes: รายการที่ tab Shipping ต้องเป็น End");
  if (isOne(r.transport_flag, "Yes") && !ctx.transEnd.get(jn)) m.push("Transport? = Yes: รายการที่ tab Transport ต้องเป็น End");
  if (isOne(r.warehouse_flag, "Yes") && !ctx.whEnd.get(jn)) m.push("Warehouse? = Yes: รายการที่ tab Warehouse ต้องเป็น End");
}

const RULES: Record<string, (r: Rec, ctx?: EndCtx) => string[]> = {
  "04_CS_Import": (r, ctx) => {
    const m: string[] = [];
    if (!has(r.im_doc)) m.push("ต้องเลือก IM/DOC");
    if (!isOne(r.enter_doc, "Done")) m.push("Enter Doc ต้อง Done");
    // Job Type = Transportation Only: ไม่มีงานเอกสาร/พิธีการ → ยกเว้น Check Deposit + Scan File
    if (!isOne(r.job_type, "Transportation Only")) {
      if (!isOne(r.check_deposit, "Done", "N/A")) m.push("Check Deposit ต้อง Done/N/A");
      if (!isOne(r.scan_file, "Done")) m.push("Scan File ต้อง Done");
    }
    if (ctx && !ctx.hasAcc.has(idOf(r))) m.push("ยังไม่มีรายการนี้ที่ tab Accounting");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type อย่างน้อย 1");
    downstreamEnd(r, ctx, m);
    extraLinesEnd(r, ctx, m);
    // หมายเหตุ: ไม่เช็ค "ต้องมีรายการที่ tab Export" — Export ที่สร้างจาก Re-Export? กรอกข้อมูลแยกเอง
    return m;
  },
  "05_CS_Export": (r, ctx) => {
    const m: string[] = [];
    if (!has(r.ex_doc)) m.push("ต้องเลือก EX/DOC");
    if (!isOne(r.si_submit, "Done")) m.push("SI Submit ต้อง Done");
    if (!isOne(r.vgm_submit, "Done")) m.push("VGM Submit ต้อง Done");
    if (!isOne(r.sent_pre_alert, "Done")) m.push("Sent Pre-Alert ต้อง Done");
    if (ctx && !ctx.hasAcc.has(idOf(r))) m.push("ยังไม่มีรายการนี้ที่ tab Accounting");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Type อย่างน้อย 1");
    downstreamEnd(r, ctx, m);
    extraLinesEnd(r, ctx, m);
    return m;
  },
  "06_Shipping": (r, ctx) => {
    const m: string[] = [];
    if (!has(r.entry_pic)) m.push("ต้องมี Entry PIC");
    if (!isOne(r.clearance_status, "Cleared", "Completed")) m.push("Clearance Status ต้อง Cleared/Completed");
    if (!has(r.ship_pic)) m.push("ต้องมี Ship PIC");
    if (isOne(r.ship_pic, "Outsourcing") && !has(r.ship_outsourcing))
      m.push("Ship PIC = Outsourcing ต้องเลือก Ship Outsourcing");
    if (!isOne(r.ship_close_acc_status, "Complete", "Completed")) m.push("Ship Close Acc Status ต้อง Completed");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type + ลงค่าใช้จ่ายใน Extra ให้ครบ");
    extraLinesEnd(r, ctx, m);
    return m;
  },
  "07_Transportation": (r, ctx) => {
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
    extraLinesEnd(r, ctx, m);
    return m;
  },
  "08_Warehouse": (r, ctx) => {
    const m: string[] = [];
    if (!has(r.wh_pic)) m.push("ต้องมี WH PIC");
    if (!has(r.wh_actual_rcv)) m.push("ต้องมี ACTUAL RCV CARGO TOTAL");
    if (!isOne(r.wh_supp1_sts, "End", "Completed")) m.push("WH Supp 1 Sts ต้อง End");
    if (!has(r.wh_supp1_end)) m.push("ต้องมี WH Supp 1 End Date");
    if (!has(r.actual_finished_date)) m.push("ต้องมี Actual Finished Date");
    if (isOne(r.extra_require, "Yes") && !has(r.extra_req_type))
      m.push("Extra/Service = Yes ต้องเลือก Req Type + ลงค่าใช้จ่ายใน Extra ให้ครบ");
    extraLinesEnd(r, ctx, m);
    return m;
  },
  // 09_Extra_Service: ไม่มีกฎ End ที่นี่ — Extra Status เป็น auto (End เมื่อ Input Status ของ
  // ทุกบรรทัดในตาราง Sell/Job Cost = END) ถ้าใส่กฎไว้จะกลายเป็นบล็อกการบันทึกอัตโนมัติ
  // ตัว Input Status เป็นคนคุมทางกลับ: ต้อง END ก่อน tab ต้นทาง (04–08) ถึงจะ End ได้ (extraLinesEnd)
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
