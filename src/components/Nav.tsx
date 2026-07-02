"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/schema";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  ...MODULES.map((m) => ({ href: `/m/${m.key}`, label: m.short })),
  { href: "/views/supervisor", label: "Supervisor" },
  { href: "/views/action", label: "Action" },
  { href: "/views/management", label: "Mgmt" },
  { href: "/views/sales", label: "Sales" },
  { href: "/views/ship-daily", label: "Ship Daily" },
  { href: "/rates", label: "Rates" },
  { href: "/settings", label: "ตั้งค่า" },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
