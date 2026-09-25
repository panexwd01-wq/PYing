"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Snapshot } from "@/lib/types";

interface Ctx {
  data: Snapshot | null;
  loading: boolean;
  error: string;
  /** โหลดข้อมูลทั้งระบบใหม่ — force = บังคับอ่านสดจาก Google (ปุ่มรีเฟรช) */
  reload: (force?: boolean) => Promise<void>;
  /** ใช้ snapshot ที่ API แนบกลับมาหลังบันทึก — คืน false ถ้าไม่มีมาด้วย (ให้ไป reload เอง) */
  apply: (snap: unknown) => boolean;
  /** ใช้ snapshot จาก API ถ้ามี ไม่งั้นค่อยยิง /api/snapshot */
  applyOrReload: (snap: unknown) => Promise<void>;
}

const DataCtx = createContext<Ctx>({
  data: null,
  loading: true,
  error: "",
  reload: async () => {},
  apply: () => false,
  applyOrReload: async () => {},
});

export const useData = () => useContext(DataCtx);

function normalize(r: any): Snapshot {
  return {
    modules: r.modules || {},
    lists: r.lists || {},
    collapse: r.collapse || {},
    carrierColors: r.carrierColors || {},
    // ต้องส่งต่อให้ครบทุกช่องของ Snapshot — ถ้าตกช่องไหน หน้าเว็บจะมองไม่เห็นค่าที่บันทึกไว้
    palette: r.palette || [],
    notes: r.notes || {},
    prefs: r.prefs || {},
  };
}

const isSnapshot = (s: any) => !!s && typeof s === "object" && !!s.modules;

// ===== กันเห็นข้อมูลเก่าหลังเพิ่งบันทึก =====
// ฝั่ง server มี cache อายุสั้น และตอน deploy จริงอาจมีหลาย instance (cache คนละก้อน)
// ถ้าเพิ่งบันทึกไปหมาด ๆ แล้วรีโหลดหน้า ให้บังคับอ่านสดจาก Google เพื่อไม่ให้ค่าที่เพิ่งเซฟหายไปต่อหน้า
const WROTE_KEY = "panex_last_write";
const WROTE_WINDOW_MS = 90_000;

function markWrote() {
  try {
    sessionStorage.setItem(WROTE_KEY, String(Date.now()));
  } catch {
    /* โหมดส่วนตัว/ปิด storage — ข้ามไป */
  }
}

function wroteRecently(): boolean {
  try {
    const t = parseInt(sessionStorage.getItem(WROTE_KEY) || "", 10);
    return !!t && Date.now() - t < WROTE_WINDOW_MS;
  } catch {
    return false;
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const fresh = force || wroteRecently();
      const r = await fetch("/api/snapshot" + (fresh ? "?fresh=1" : "")).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setData(normalize(r));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ทุก API ที่เขียนข้อมูลจะแนบ snapshot ล่าสุดกลับมาด้วย → ไม่ต้องยิงอ่านซ้ำอีกรอบ
  const apply = useCallback((snap: unknown) => {
    markWrote(); // เรียกจากเส้นบันทึกเสมอ (ต่อให้ API ไม่ได้แนบ snapshot มา ก็ต้องจำว่าเพิ่งเขียน)
    if (!isSnapshot(snap)) return false;
    setData(normalize(snap));
    setError("");
    return true;
  }, []);

  const applyOrReload = useCallback(
    async (snap: unknown) => {
      if (!apply(snap)) await reload();
    },
    [apply, reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <DataCtx.Provider value={{ data, loading, error, reload, apply, applyOrReload }}>
      {children}
    </DataCtx.Provider>
  );
}
