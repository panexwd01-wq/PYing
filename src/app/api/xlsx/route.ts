// Export / Import ข้อมูลของ 1 โมดูลเป็นไฟล์ .xlsx (รูปแบบเดียวกันทั้งขาออก-ขาเข้า)
import { NextRequest, NextResponse } from "next/server";
import { createJobs, listJobs, listJobsRaw, updateJobs } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { MODULE_BY_KEY, ModuleDef } from "@/lib/schema";
import { assertCan, authErrorResponse, requireUser } from "@/lib/authServer";
import { can, MODULE_TAB_KEY } from "@/lib/perms";
import { RATE_SIGNER_KEY } from "@/lib/modules/rates";
import { buildWorkbook, parseWorkbook } from "@/lib/xlsxIo";
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

export async function GET(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "view");
    const rows = await withSheetCache(() => listJobs(m));
    const buf = await buildWorkbook(m, rows);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName(m, stampNow()))}`,
        "Cache-Control": "no-store",
      },
    });
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
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "edit");

    const form = await req.formData();
    const file = form.get("file");
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

    const result = await withSheetCache(async () => {
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
      const updated = await applyRows(m, plan.updates, (recs) => updateJobs(m, recs), skipped);
      const created = await applyRows(m, plan.creates, (recs) => createJobs(m, recs), skipped);
      return {
        created,
        updated,
        skipped,
        unknownColumns: parsed.unknownColumns,
        ignoredAuto: parsed.ignoredAuto,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
