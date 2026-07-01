import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import Link from "next/link";
import { MODULES } from "@/lib/schema";
import { DataProvider } from "@/components/DataProvider";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CS Import — Operations Board",
  description: "ระบบจัดการงาน CS Import (Module 1)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>
        <header className="app-header">
          <div className="brand">
            <span className="full">FREIGHT</span> OPS
          </div>
          <div className="spacer" />
          <nav>
            <Link href="/">Dashboard</Link>
            {MODULES.map((m) => (
              <Link key={m.key} href={`/m/${m.key}`}>
                {m.short}
              </Link>
            ))}
            <Link href="/views/supervisor">Supervisor</Link>
            <Link href="/views/action">Action</Link>
            <Link href="/views/management">Mgmt</Link>
            <Link href="/views/sales">Sales</Link>
            <Link href="/views/ship-daily">Ship Daily</Link>
            <Link href="/rates">Rates</Link>
            <Link href="/settings">ตั้งค่า</Link>
          </nav>
        </header>
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
