import { notFound } from "next/navigation";
import { ModuleBoard } from "@/components/ModuleBoard";
import { MODULES, MODULE_BY_KEY } from "@/lib/schema";

export function generateStaticParams() {
  return MODULES.map((m) => ({ key: m.key }));
}

export default function ModulePage({ params }: { params: { key: string } }) {
  if (!MODULE_BY_KEY[params.key]) notFound();
  return <ModuleBoard moduleKey={params.key} />;
}
