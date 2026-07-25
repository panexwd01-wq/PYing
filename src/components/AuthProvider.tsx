"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Perms, PermAction, can as canPerm, canLists } from "@/lib/perms";
import type { Role } from "@/lib/session";

export interface CurrentUser {
  username: string;
  displayName: string;
  role: Role;
  perms: Perms;
}

interface Ctx {
  user: CurrentUser | null;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  can: (tabKey: string, action: PermAction) => boolean;
  canLists: () => boolean;
  isAdmin: boolean;
}

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: true,
  reload: async () => {},
  logout: async () => {},
  can: () => false,
  canLists: () => false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me").then((x) => x.json());
      setUser(r.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  const can = useCallback(
    (tabKey: string, action: PermAction) => canPerm(user?.role, user?.perms, tabKey, action),
    [user]
  );

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        reload,
        logout,
        can,
        canLists: () => canLists(user?.role, user?.perms),
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
