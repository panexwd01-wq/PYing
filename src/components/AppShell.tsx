"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";
import { NotesPanel } from "@/components/NotesPanel";
import { TableScrollAssist } from "@/components/TableScrollAssist";
import { useAuth } from "@/components/AuthProvider";

// หน้า login ไม่ต้องมี header/เมนู และไม่ต้องโหลด snapshot
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const headerRef = useRef<HTMLElement>(null);

  // แถบเมนูตรึงกับจอ (fixed) — วัดความสูงจริง (มือถือพับ 2 บรรทัด) ส่งให้ CSS เว้นที่ด้านบนของหน้า
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const measure = () => {
      root.style.setProperty("--app-header-h", el.offsetHeight + "px");
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <header className="app-header" ref={headerRef}>
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
      <DataProvider>
        {children}
        <NotesPanel />
        <TableScrollAssist />
      </DataProvider>
    </>
  );
}
