"use client";

import { usePathname } from "next/navigation";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";

// หน้า login ไม่ต้องมี header/เมนู และไม่ต้องโหลด snapshot
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="full">FREIGHT</span> OPS
        </div>
        <div className="spacer" />
        <Nav />
        {!loading && user && (
          <div className="user-box">
            <span className="user-name" title={`${user.displayName} (${user.role})`}>
              {user.displayName}
              {user.role === "admin" && <span className="role-pill">admin</span>}
            </span>
            <button className="btn sm" onClick={logout} title="ออกจากระบบ">
              ออก
            </button>
          </div>
        )}
      </header>
      <DataProvider>{children}</DataProvider>
    </>
  );
}
