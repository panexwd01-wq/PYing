// ===== รหัสเชื่อมข้ามโมดูล (ใช้ร่วม server + หน้าเว็บ — ไฟล์ pure ไม่แตะ Google) =====
// ทุกแถวผูกกับแม่ด้วย __id (รหัสภายในที่ระบบสร้างเอง ไม่ซ้ำ ไม่แสดงบนเว็บ) แทน Job No.
//   06/07/08  link_cs  = __id ของงาน CS แม่
//   09 Extra  link_cs  = __id ของงาน CS แม่ · link_src = __id ของแถวต้นทาง (04–08) ที่สร้างแถวนี้
//   10 Acc    link_cs  = __id ของงาน CS แม่ · link_key = แถวนี้มาจากอะไร (base / extra / fuel)
//   05 Export link_imp = __id ของงาน Import ที่สร้างแถวนี้ (Re-Export)
import { LINK_CS, LINK_IMP, LINK_KEY, LINK_SRC } from "./fields";
import { MODULE_BY_ID } from "./schema";
import { EXTRA_MODULE_LABEL, EXTRA_SOURCE_ID_BY_LABEL } from "./modules/extra";
import { ACC_FUEL_LABEL } from "./modules/accounting";
import { impJobNoFromReadout } from "./reExport";
import { JobRecord } from "./types";

type Rec = Partial<JobRecord>;

export const linkOf = (r: Rec | undefined, key: string): string => String(r?.[key] ?? "").trim();

// ค่า link_key ของแถว Accounting
export const ACC_BASE_KEY = "base"; // งานที่ยังไม่มี Extra = 1 แถวพื้นฐาน
export const accExtraKey = (extraId: string) => `extra:${extraId}`;
export const accFuelKey = (transId: string, n: number) => `fuel:${transId}:${n}`;

const IMP_ID = "04_CS_Import";
const EXP_ID = "05_CS_Export";
const CHILD_IDS = ["06_Shipping", "07_Transportation", "08_Warehouse", "09_Extra_Service", "10_Accounting"];

export interface LegacyLinks {
  patches: Record<string, Map<string, Rec>>; // moduleId → __id → รหัสเชื่อมที่ต้องเติม
  notes: string[]; // รายการที่จับคู่ได้ไม่ชัด (ให้คนตรวจ)
}

// เติมรหัสเชื่อมให้แถวที่ยังไม่มี (ข้อมูลก่อนเปลี่ยนมาใช้รหัสเชื่อม) โดยจับคู่ด้วย Job No. แบบเดิม
// กติกาเดียวกับของเดิมทุกอย่าง: เจอทั้ง Import และ Export → ถือเป็น Import · Job No. ซ้ำ → แถวหลังสุด
// แถวที่มีรหัสเชื่อมแล้วไม่ถูกแตะ — เรียกซ้ำได้เรื่อย ๆ ถ้าเติมครบแล้วจะได้ patches ว่าง
export function resolveLegacyLinks(rows: Record<string, JobRecord[]>): LegacyLinks {
  const patches: Record<string, Map<string, Rec>> = {};
  const notes: string[] = [];
  const patch = (moduleId: string, id: string, v: Rec) => {
    const byId = (patches[moduleId] ||= new Map());
    byId.set(id, { ...byId.get(id), ...v });
  };
  const jn = (r: Rec, key = "job_no") => linkOf(r, key);

  const byJob = (list: JobRecord[], key: string) => {
    const map = new Map<string, JobRecord[]>();
    for (const r of list) {
      const k = jn(r, key);
      if (k) map.set(k, [...(map.get(k) || []), r]);
    }
    return map;
  };
  const imp = byJob(rows[IMP_ID] || [], "imp_job_no");
  const exp = byJob(rows[EXP_ID] || [], "exp_job_no");

  // Job No. → __id ของงาน CS (Job No. ซ้ำ → งานล่าสุด · มีทั้งสองฝั่ง → Import — แจ้งด้วย duplicateJobNoNotes)
  const warn = (msg: string) => {
    if (!notes.includes(msg)) notes.push(msg);
  };
  const csIdOfJob = (jobNo: string): string => {
    const list = imp.get(jobNo)?.length ? imp.get(jobNo)! : exp.get(jobNo) || [];
    return list.length ? list[list.length - 1].__id : "";
  };

  // 1) link_cs ของ 06–10
  const csOf = new Map<string, string>(); // __id แถวลูก → link_cs (ของเดิมหรือที่เพิ่งเติม)
  for (const id of CHILD_IDS) {
    for (const r of rows[id] || []) {
      let cs = linkOf(r, LINK_CS);
      if (!cs) {
        cs = jn(r) ? csIdOfJob(jn(r)) : "";
        if (cs) patch(id, r.__id, { [LINK_CS]: cs });
      }
      if (cs) csOf.set(r.__id, cs);
    }
  }
  const childrenOf = (moduleId: string, cs: string) =>
    (rows[moduleId] || []).filter((r) => csOf.get(r.__id) === cs);

  // 2) link_src ของ Extra: ป้าย Module บอกว่ามาจากโมดูลไหน → หาแถวของโมดูลนั้นในงานเดียวกัน
  for (const r of rows["09_Extra_Service"] || []) {
    if (linkOf(r, LINK_SRC)) continue;
    const cs = csOf.get(r.__id);
    const srcModule = EXTRA_SOURCE_ID_BY_LABEL[linkOf(r, "module")];
    if (!cs || !srcModule) continue;
    let src = "";
    if (srcModule === IMP_ID || srcModule === EXP_ID) src = cs;
    else src = childrenOf(srcModule, cs)[0]?.__id || "";
    if (src) patch("09_Extra_Service", r.__id, { [LINK_SRC]: src });
    else warn(`Extra ของ Job No. ${jn(r) || "-"} (${linkOf(r, "module")}) หาแถวต้นทางไม่เจอ`);
  }

  // 3) link_key ของ Accounting: จับคู่ด้วย Module + Req Type (+ ชื่อ Supplier สำหรับแถวค่าน้ำมัน) แบบเดิม
  const usedExtra = new Set<string>();
  for (const r of rows["10_Accounting"] || []) {
    const k = linkOf(r, LINK_KEY);
    if (k.startsWith("extra:")) usedExtra.add(k);
  }
  for (const r of rows["10_Accounting"] || []) {
    if (linkOf(r, LINK_KEY)) continue;
    const cs = csOf.get(r.__id);
    if (!cs) continue;
    const type = linkOf(r, "ap_extra_req_type");
    let key = "";
    if (!type) key = ACC_BASE_KEY;
    else if (type === ACC_FUEL_LABEL) {
      const supplier = linkOf(r, "supplier");
      for (const t of childrenOf("07_Transportation", cs)) {
        for (const n of [1, 2, 3]) {
          const name = linkOf(t, `supp${n}`) || `Supp ${n}`;
          if (!key && linkOf(t, `supp${n}_fuel`) && name === supplier) key = accFuelKey(t.__id, n);
        }
      }
    } else {
      const e = childrenOf("09_Extra_Service", cs).find(
        (x) =>
          linkOf(x, "extra_req_type") === type &&
          (linkOf(x, "module") || "") === linkOf(r, "module") &&
          !usedExtra.has(accExtraKey(x.__id))
      );
      if (e) key = accExtraKey(e.__id);
    }
    if (key) {
      if (key.startsWith("extra:")) usedExtra.add(key);
      patch("10_Accounting", r.__id, { [LINK_KEY]: key });
    } else warn(`Accounting ของ Job No. ${jn(r) || "-"} (${type}) ไม่มีรายการ Extra/ค่าน้ำมันคู่ — ระบบจะลบตอน Sync`);
  }

  // 4) link_imp ของ Export ที่มาจาก Re-Export (เดิมอ่าน Job No. จากข้อความ Data from Import)
  for (const r of rows[EXP_ID] || []) {
    if (linkOf(r, LINK_IMP) || linkOf(r, "re_export") !== "Yes") continue;
    const j = impJobNoFromReadout(r.data_from_import || "");
    const list = j ? imp.get(j) : undefined;
    if (list?.length) patch(EXP_ID, r.__id, { [LINK_IMP]: list[list.length - 1].__id });
  }

  return { patches, notes };
}

// Job No. ที่ซ้ำกันในงาน CS — ไม่ทำให้หลุดเชื่อมแล้ว แต่คนหาเลขในหน้าเว็บจะสับสน (แจ้งตอน Sync)
export function duplicateJobNoNotes(impRows: JobRecord[], expRows: JobRecord[]): string[] {
  const count = new Map<string, { imp: number; exp: number }>();
  const add = (rows: JobRecord[], key: string, side: "imp" | "exp") => {
    for (const r of rows) {
      const j = linkOf(r, key);
      if (!j) continue;
      const c = count.get(j) || { imp: 0, exp: 0 };
      c[side]++;
      count.set(j, c);
    }
  };
  add(impRows, "imp_job_no", "imp");
  add(expRows, "exp_job_no", "exp");
  const out: string[] = [];
  count.forEach((c, j) => {
    if (c.imp + c.exp < 2) return;
    const where = [c.imp && `CS Import ${c.imp}`, c.exp && `CS Export ${c.exp}`].filter(Boolean).join(" + ");
    out.push(`Job No. ${j} ซ้ำ (${where} งาน)`);
  });
  return out;
}

// เอา patch ไปทับแถวในหน่วยความจำ (ใช้ตอนสร้าง snapshot — หน้าเว็บเห็นรหัสเชื่อมครบเสมอ)
export function applyLegacyLinks(rows: Record<string, JobRecord[]>, patches: LegacyLinks["patches"]): void {
  for (const [id, byId] of Object.entries(patches)) {
    if (!byId.size || !rows[id]) continue;
    rows[id] = rows[id].map((r) => (byId.has(r.__id) ? ({ ...r, ...byId.get(r.__id) } as JobRecord) : r));
  }
}

// ป้ายของงาน CS แม่ (FREIGHT IMPORT / FREIGHT EXPORT)
export const csLabel = (side: "imp" | "exp") => EXTRA_MODULE_LABEL[side === "imp" ? IMP_ID : EXP_ID];
export const csJobNoKey = (side: "imp" | "exp") => MODULE_BY_ID[side === "imp" ? IMP_ID : EXP_ID].jobNoKey;
