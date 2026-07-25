import { NextRequest, NextResponse } from "next/server";
import { createJobs, deleteJob, listJobs, listJobsRaw, updateJobs } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { MODULE_BY_KEY, ModuleDef } from "@/lib/schema";
import { AuthError, assertCan, authErrorResponse, requireUser } from "@/lib/authServer";
import { MODULE_TAB_KEY } from "@/lib/perms";
import type { AppUser } from "@/lib/users";
import type { JobRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function resolve(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("module") || "cs-import";
  const m = MODULE_BY_KEY[key];
  if (!m) throw new Error(`ไม่รู้จักโมดูล: ${key}`);
  return { m, tab: MODULE_TAB_KEY[key] || key };
}

// เรทที่บันทึกแล้ว ห้ามแก้/ลบ — ยกเว้น admin (ต้องติดต่อฝ่ายบัญชี)
function assertRateWritable(u: AppUser, tab: string) {
  if (tab === "rates" && u.role !== "admin")
    throw new AuthError("เรทที่บันทึกแล้วแก้ไข/ลบไม่ได้ — กรุณาติดต่อฝ่ายบัญชี", 403);
}

// งานสถานะ End ต้องมีสิทธิ์ "END" แยกต่างหาก
function assertEnd(u: AppUser, tab: string, m: ModuleDef, recs: Partial<JobRecord>[]) {
  const statusKey = m.fields[0]?.key;
  if (!statusKey) return;
  if (recs.some((r) => (r as Record<string, unknown>)[statusKey] === "End")) assertCan(u, tab, "end");
}

export async function GET(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "view");
    const jobs = await withSheetCache(() => listJobs(m));
    return NextResponse.json({ jobs });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "add");
    const body = await req.json();
    const records = Array.isArray(body.records) ? body.records : body.record ? [body.record] : [];
    assertEnd(u, tab, m, records);
    const jobs = await withSheetCache(() => createJobs(m, records));
    return NextResponse.json({ jobs });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "edit");
    assertRateWritable(u, tab);
    const body = await req.json();
    const records = Array.isArray(body.records) ? body.records : body.record ? [body.record] : [];
    assertEnd(u, tab, m, records);
    const saved = await withSheetCache(() => updateJobs(m, records));
    return NextResponse.json({ jobs: saved });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const u = await requireUser();
    const { m, tab } = resolve(req);
    assertCan(u, tab, "del");
    assertRateWritable(u, tab);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
    await withSheetCache(async () => {
      // ลบงานที่ End แล้ว ต้องมีสิทธิ์ END ด้วย
      const statusKey = m.fields[0]?.key;
      if (statusKey) {
        const rec = (await listJobsRaw(m)).find((r) => r.__id === id);
        if (rec && rec[statusKey] === "End") assertCan(u, tab, "end");
      }
      await deleteJob(m, id);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
