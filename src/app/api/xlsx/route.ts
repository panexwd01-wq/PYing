// Export / Import ข้อมูลของ 1 โมดูลเป็นไฟล์ .xlsx (รูปแบบเดียวกันทั้งขาออก-ขาเข้า)
import { NextRequest, NextResponse } from "next/server";
import { createJobs, listJobs, listJobsRaw, updateJobs } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { writeThenSnapshot } from "@/lib/apiWrite";
import { MODULE_BY_KEY, ModuleDef } from "@/lib/schema";
import { assertCan, authErrorResponse, requireUser } from "@/lib/authServer";
import { can, MODULE_TAB_KEY } from "@/lib/perms";
import { RATE_SIGNER_KEY } from "@/lib/modules/rates";
import { buildWorkbook, parseWorkbook } from "@/lib/xlsxIo";
import { rateDupKeyOrNull } from "@/lib/rateDup";
import {
  canCreateOnImport,
  fileName,
  identityLabel,
  ImportSkip,
  planImport,
  PlanRow,
} from "@/lib/xlsxSchema";
import type { JobRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function resolve(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("module") || "";
  const m = MODULE_BY_KEY[key];
  if (!m) throw new Error(`ไม่รู้จักโมดูล: ${key}`);
  return { m, tab: MODULE_TAB_KEY[key] || key };
}

const stampNow = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

// สร้างไฟล์ .xlsx ของโมดูล — ids = เอาเฉพาะแถวที่ระบุ (ใช้ตอน "Export เฉพาะที่กรองไว้")
async function exportWorkbook(m: ModuleDef, ids?: string[]): Promise<NextResponse> {
  let rows = await withSheetCache(() => listJobs(m));
  if (ids && ids.length) {
    const want = new Set(ids);
    rows = rows.filter((r) => want.has(r.__id));
  }
  const buf = await buildWorkbook(m, rows);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName(m, stampNow()))}`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "view");
    return await exportWorkbook(m);
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

// เขียนทีละก้อนก่อน (ประหยัดโควต้า) — ถ้าก้อนล้มเพราะมีแถวผิดกฎ ค่อยไล่ทีละแถวเพื่อหาว่าแถวไหน
// createJobs/updateJobs ตรวจกฎครบทุกแถวก่อนเขียนจริง ก้อนที่ล้มจึงไม่มีอะไรถูกเขียนไปแล้ว
async function applyRows(
  m: ModuleDef,
  items: { rec: Record<string, string>; src: PlanRow }[],
  run: (recs: Partial<JobRecord>[]) => Promise<unknown>,
  skipped: ImportSkip[]
): Promise<number> {
  if (!items.length) return 0;
  try {
    await run(items.map((i) => i.rec));
    return items.length;
  } catch {
    let ok = 0;
    for (const it of items) {
      try {
        await run([it.rec]);
        ok++;
      } catch (e) {
        skipped.push({
          row: it.src.row,
          ident: identityLabel(m, it.src.ident),
          reason: (e as Error).message,
        });
      }
    }
    return ok;
  }
}

export async function POST(req: NextRequest) {
  if ((req.headers.get("content-type") || "").includes("application/json")) {
    try {
      const u = await requireUser();
      const { m, tab } = resolve(req);
      assertCan(u, tab, "view");
      const body = await req.json();
      return await exportWorkbook(m, Array.isArray(body?.ids) ? body.ids.map(String) : undefined);
    } catch (e) {
      const { message, status } = authErrorResponse(e);
      return NextResponse.json({ error: message }, { status });
    }
  }

  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "edit");

    const form = await req.formData();
    const file = form.get("file");
    // allowDup=1 = ผู้ใช้กดยืนยันแล้วว่าให้นำเข้าแถวที่ซ้ำด้วย (หน้า Rate)
    const allowDup = new URL(req.url).searchParams.get("allowDup") === "1";
    if (!file || typeof file === "string") throw new Error("ไม่พบไฟล์ที่อัปโหลด");
    if (!/\.xlsx$/i.test((file as File).name || "")) throw new Error("รองรับเฉพาะไฟล์ .xlsx");
    const buf = Buffer.from(await (file as File).arrayBuffer());

    const parsed = await parseWorkbook(m, buf);
    if (!parsed.rows.length) throw new Error("ไม่มีข้อมูลในไฟล์ (มีแต่หัวคอลัมน์)");

    const statusKey = m.fields[0]?.key;
    if (statusKey && parsed.rows.some((r) => r.values[statusKey] === "End")) assertCan(u, tab, "end");
    const mayCreate = canCreateOnImport(m) && can(u.role, u.perms, tab, "add");
    const noCreateReason = canCreateOnImport(m)
      ? "ไม่มีงานนี้ในระบบ และบัญชีนี้ไม่มีสิทธิ์เพิ่มงาน"
      : "ไม่มีงานนี้ในระบบ — โมดูลนี้สร้างแถวเองไม่ได้ (แถวสร้างอัตโนมัติจาก CS)";

    const { result, snapshot } = await writeThenSnapshot(async () => {
      const existing = await listJobsRaw(m);
      const plan = planImport(m, parsed.rows, existing as Record<string, string>[], {
        mayCreate,
        noCreateReason,
      });
      const skipped = plan.skipped;

      // ตารางเรท: เรทที่บันทึกแล้วแก้ได้เฉพาะ admin (กติกาเดียวกับหน้า Rates)
      // + ช่องผู้ตรวจ/ผู้เสนอราคา ระบบเติมชื่อคนที่ล็อกอินให้เสมอ (ห้ามกรอกจากไฟล์)
      if (m.rate) {
        const signer = RATE_SIGNER_KEY[m.key];
        if (signer) for (const it of [...plan.updates, ...plan.creates]) it.rec[signer] = u.displayName;
        if (u.role !== "admin" && plan.updates.length) {
          for (const it of plan.updates)
            skipped.push({
              row: it.src.row,
              ident: identityLabel(m, it.src.ident),
              reason: "เรทนี้มีอยู่แล้ว — แก้ไขเรทที่บันทึกแล้วได้เฉพาะ admin",
            });
          plan.updates.length = 0;
        }
      }
      // ตารางเรท: กันลงข้อมูลซ้ำ (ทุกช่องตรงกัน ยกเว้น Remarks) — เตือนไว้ก่อน กดยืนยันแล้วค่อยลงซ้ำได้
      let dupFound = 0;
      if (m.rate && !allowDup) {
        const seen = new Set<string>();
        for (const r of existing as Record<string, string>[]) {
          const k = rateDupKeyOrNull(m, r);
          if (k) seen.add(k);
        }
        const keep: typeof plan.creates = [];
        for (const it of plan.creates) {
          const k = rateDupKeyOrNull(m, it.rec);
          if (k && seen.has(k)) {
            dupFound++;
            skipped.push({
              row: it.src.row,
              ident: identityLabel(m, it.src.ident),
              reason: "ซ้ำกับเรทที่มีอยู่แล้ว (ทุกช่องตรงกัน ยกเว้น Remarks)",
            });
            continue;
          }
          if (k) seen.add(k);
          keep.push(it);
        }
        plan.creates.length = 0;
        plan.creates.push(...keep);
      }

      const updated = await applyRows(m, plan.updates, (recs) => updateJobs(m, recs), skipped);
      const created = await applyRows(m, plan.creates, (recs) => createJobs(m, recs), skipped);
      return {
        created,
        updated,
        skipped,
        duplicates: dupFound, // > 0 = มีแถวที่ถูกข้ามเพราะซ้ำ (หน้าเว็บจะถามว่าจะลงซ้ำไหม)
        unknownColumns: parsed.unknownColumns,
        ignoredAuto: parsed.ignoredAuto,
      };
    });

    return NextResponse.json({ ...result, snapshot });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
