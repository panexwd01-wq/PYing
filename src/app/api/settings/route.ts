// ค่าตั้งค่าที่เก็บในชีท _settings (นอกเหนือจาก collapse / สี dropdown ที่มี route ของตัวเองอยู่แล้ว)
//   palette = ชุดสีกลาง + ความหมาย (ต้องมีสิทธิ์แก้ Dropdown)
//   note    = โน้ตส่วนกลางของแต่ละ tab (ทุกคนที่ล็อกอินแก้ได้)
//   prefs   = ตั้งค่าคอลัมน์ของบัญชีตัวเอง (ลำดับ/ความกว้าง/คอลัมน์ตอนย่อ)
// ทุกอย่างเป็น read-modify-write ของ "ช่องเดียว" เพื่อไม่ให้ทับค่าของเรื่องอื่น
import { NextRequest, NextResponse } from "next/server";
import { readNotes, readUserPrefs, writeNotes, writePalette, writeUserPrefs } from "@/lib/db";
import { writeThenSnapshot } from "@/lib/apiWrite";
import { assertCanLists, authErrorResponse, requireUser } from "@/lib/authServer";
import type { ModulePrefs } from "@/lib/prefs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const u = await requireUser();
    const body = await req.json();

    if (body.palette) {
      assertCanLists(u);
      const { snapshot } = await writeThenSnapshot(() => writePalette(body.palette));
      return NextResponse.json({ ok: true, snapshot });
    }

    if (body.note) {
      const { module, text } = body.note as { module: string; text: string };
      if (!module) throw new Error("ไม่ได้ระบุ tab ของโน้ต");
      const { snapshot } = await writeThenSnapshot(async () => {
        const cur = await readNotes();
        const next = { ...cur };
        if ((text || "").trim()) next[module] = text;
        else delete next[module];
        await writeNotes(next);
      });
      return NextResponse.json({ ok: true, snapshot });
    }

    if (body.prefs) {
      const { module, value } = body.prefs as { module: string; value: ModulePrefs };
      if (!module) throw new Error("ไม่ได้ระบุ tab ของค่าตั้งค่า");
      // ไม่ต้องสร้าง snapshot — ค่านี้เป็นของบัญชีเดียว หน้าเว็บอัปเดต state เองได้
      await writeThenSnapshot(
        async () => {
          const all = await readUserPrefs();
          const mine = { ...(all[u.id] || {}) };
          mine[module] = value;
          await writeUserPrefs({ ...all, [u.id]: mine });
        },
        { snapshot: false }
      );
      return NextResponse.json({ ok: true });
    }

    throw new Error("ไม่รู้จักค่าที่ส่งมา");
  } catch (e) {
    const { message, status } = authErrorResponse(e);
    return NextResponse.json({ error: message }, { status });
  }
}
