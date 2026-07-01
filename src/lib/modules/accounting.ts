import { Field } from "../fields";

// ===== 10_Accounting — ทุก Job ต้องมาโผล่ที่นี่ (Master Queue) =====
export const ACCOUNTING_FIELDS: Field[] = [
  // ----- Job Header -----
  { key: "acc_job_status", label: "ACC Job Status", group: "Job Header", type: "dropdown", list: "im_ops_status", mandatory: true, sticky: true, width: 130 },
  { key: "acc_pic", label: "Acc PIC", group: "Job Header", type: "dropdown", list: "acc_pic", sticky: true, width: 120 },
  { key: "acc_approved_sts", label: "Acc Approved Sts", group: "Job Header", type: "dropdown", list: "approved_sts", width: 130, help: "Acc PIC ได้คนเดียว" },
  { key: "ap_pic", label: "AP PIC", group: "Job Header", type: "dropdown", list: "acc_pic", width: 120 },
  { key: "job_type", label: "Job Type", group: "Job Header", type: "auto", width: 120, pull: { imp: "job_type", exp: "job_type" } },
  { key: "job_no", label: "Job No. (IMP/EXP)", group: "Job Header", type: "text", mandatory: true, width: 130, help: "กรอกเลขงาน แล้วกด Refresh" },
  { key: "booking_mbl", label: "Booking / MBL No.", group: "Job Header", type: "auto", width: 160, pull: { imp: "imp_booking_mbl", exp: "exp_booking_mbl" } },
  { key: "customer", label: "Customer", group: "Job Header", type: "auto", width: 160, pull: { imp: "customer", exp: "customer" } },
  { key: "module", label: "Module", group: "Job Header", type: "dropdown", list: "cost_module", width: 130 },
  { key: "cs_pic", label: "CS (IMP/EXP)", group: "Job Header", type: "auto", width: 110, pull: { imp: "im_cs", exp: "ex_cs" } },
  { key: "sales_bkg_by", label: "Sales / BKG by", group: "Job Header", type: "auto", width: 130, pull: { imp: "sales_bkg_by", exp: "sales_bkg_by" } },
  { key: "supplier", label: "Supplier", group: "Job Header", type: "text", width: 150 },

  // ----- Accounts Payable (AP) -----
  { key: "supp_inv", label: "Supp INV (Free Text)", group: "Accounts Payable (AP)", type: "text", width: 150 },
  { key: "ap_extra_req_type", label: "Extra/Service Req Type", group: "Accounts Payable (AP)", type: "auto", width: 170, help: "ดึงจาก 09_Extra_Service" },
  { key: "ap_root_cause", label: "Extra Root Cause", group: "Accounts Payable (AP)", type: "auto", width: 150 },
  { key: "ap_cost_unit", label: "Extra Cost/Unit", group: "Accounts Payable (AP)", type: "auto", width: 120 },
  { key: "ap_cost_cur", label: "Extra Cost Cur", group: "Accounts Payable (AP)", type: "auto", width: 110 },
  { key: "ap_total_cost", label: "Extra Total Cost", group: "Accounts Payable (AP)", type: "auto", width: 130 },
  { key: "received_ship_close_acc", label: "Received Ship Close Acc", group: "Accounts Payable (AP)", type: "dropdown", list: "rcv_ship_close_acc", width: 160 },
  { key: "ap_remark", label: "AP Remark", group: "Accounts Payable (AP)", type: "text", width: 170 },
  { key: "ap_status", label: "AP Status", group: "Accounts Payable (AP)", type: "dropdown", list: "ap_status", width: 150 },

  // ----- Accounts Receivable (AR) -----
  { key: "ar_pic", label: "AR PIC", group: "Accounts Receivable (AR)", type: "dropdown", list: "ar_pic", width: 120 },
  { key: "customer_inv", label: "Customer INV (Free Text)", group: "Accounts Receivable (AR)", type: "text", width: 160 },
  { key: "ar_sell_unit", label: "Extra Sell/Unit", group: "Accounts Receivable (AR)", type: "auto", width: 120, help: "ดึงจาก 09_Extra_Service" },
  { key: "ar_sell_cur", label: "Extra Sell Cur", group: "Accounts Receivable (AR)", type: "auto", width: 110 },
  { key: "ar_total_sell", label: "Extra Total Sell", group: "Accounts Receivable (AR)", type: "auto", width: 130 },
  { key: "billing_date", label: "Billing Date", group: "Accounts Receivable (AR)", type: "datetime", width: 160 },
  { key: "cus_paid", label: "Cus Paid?", group: "Accounts Receivable (AR)", type: "dropdown", list: "done_pending", width: 110 },
  { key: "cus_paid_date", label: "Cus Paid Date", group: "Accounts Receivable (AR)", type: "auto", width: 150 },
  { key: "ar_remark", label: "AR Remark", group: "Accounts Receivable (AR)", type: "text", width: 170 },
  { key: "ar_status", label: "AR Status", group: "Accounts Receivable (AR)", type: "dropdown", list: "ar_status", width: 150 },

  // ----- Closing -----
  { key: "acc_job_status_date", label: "ACC Job Status Date", group: "Accounting & Closing", type: "auto", width: 160, help: "Auto เมื่อ ACC Job Status = End" },
];
