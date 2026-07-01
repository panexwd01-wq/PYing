import { CenterLoading } from "@/components/Spinner";

// แสดงทันทีตอนสลับหน้า (header/เมนูคงอยู่) — กันอาการค้างหน้าเดิม
export default function Loading() {
  return (
    <main className="page fade-in">
      <CenterLoading />
    </main>
  );
}
