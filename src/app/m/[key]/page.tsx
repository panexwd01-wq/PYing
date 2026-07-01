import { notFound } from "next/navigation";
import { ModuleBoard } from "@/components/ModuleBoard";
import { MODULES } from "@/lib/schema";

export function generateStaticParams() {
  return MODULES.map((m) => ({ key: m.key }));
}

export default function ModulePage({ params }: { params: { key: string } }) {
  // เฉพาะโมดูลงาน (04–10) — โมดูลเรทใช้หน้า /rates แยก
  if (!MODULES.some((m) => m.key === params.key)) notFound();
  return <ModuleBoard moduleKey={params.key} />;
}
