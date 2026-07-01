"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Snapshot } from "@/lib/types";

interface Ctx {
  data: Snapshot | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const DataCtx = createContext<Ctx>({
  data: null,
  loading: true,
  error: "",
  reload: async () => {},
});

export const useData = () => useContext(DataCtx);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/snapshot").then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setData({ modules: r.modules || {}, lists: r.lists || {} });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <DataCtx.Provider value={{ data, loading, error, reload }}>
      {children}
    </DataCtx.Provider>
  );
}
