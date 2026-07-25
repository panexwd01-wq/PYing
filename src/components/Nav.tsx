"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/perms";
import { useAuth } from "@/components/AuthProvider";

export function Nav() {
  const pathname = usePathname();
  const { user, can, isAdmin } = useAuth();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  // แสดงเฉพาะ tab ที่ user มีสิทธิ์ "เห็น"
  const links = TABS.filter((t) => (t.adminOnly ? isAdmin : can(t.key, "view")));

  if (!user) return <nav />;

  return (
    <nav>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
