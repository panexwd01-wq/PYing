import { NextRequest, NextResponse } from "next/server";
import { createJobs, deleteJob, listJobs, updateJobs } from "@/lib/db";
import { withSheetCache } from "@/lib/sheets";
import { MODULE_BY_KEY } from "@/lib/schema";

export const dynamic = "force-dynamic";

function resolve(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("module") || "cs-import";
  const m = MODULE_BY_KEY[key];
  if (!m) throw new Error(`ไม่รู้จักโมดูล: ${key}`);
  return m;
}

export async function GET(req: NextRequest) {
  try {
    const jobs = await withSheetCache(() => listJobs(resolve(req)));
    return NextResponse.json({ jobs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const m = resolve(req);
    const body = await req.json();
    const records = Array.isArray(body.records)
      ? body.records
      : body.record
      ? [body.record]
      : [];
    const jobs = await withSheetCache(() => createJobs(m, records));
    return NextResponse.json({ jobs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const m = resolve(req);
    const body = await req.json();
    const records = Array.isArray(body.records)
      ? body.records
      : body.record
      ? [body.record]
      : [];
    const saved = await withSheetCache(() => updateJobs(m, records));
    return NextResponse.json({ jobs: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const m = resolve(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
    await withSheetCache(() => deleteJob(m, id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
