import { NextRequest, NextResponse } from "next/server";
import { createJob, deleteJob, listJobs, updateJob } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await listJobs();
    return NextResponse.json({ jobs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const job = await createJob(body.record || {});
    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // รองรับบันทึกหลายระเบียนพร้อมกัน (กรณีแก้หลายแถวในตาราง)
    const records = Array.isArray(body.records) ? body.records : [body.record];
    const saved = [];
    for (const r of records) {
      saved.push(await updateJob(r));
    }
    return NextResponse.json({ jobs: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 });
    await deleteJob(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
