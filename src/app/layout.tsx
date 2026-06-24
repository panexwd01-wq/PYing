import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import Link from "next/link";
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
            <span className="mod">04 · CS Import</span>
          </div>
          <div className="spacer" />
          <nav>
            <Link href="/">ตารางงาน</Link>
            <Link href="/settings">ตั้งค่า</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
