export function Spinner({ size = "sm" }: { size?: "sm" | "lg" }) {
  return <span className={size === "lg" ? "spinner lg" : "spinner"} aria-label="กำลังโหลด" />;
}

export function CenterLoading({ text = "กำลังโหลดข้อมูล…" }: { text?: string }) {
  return (
    <div className="center-load">
      <Spinner size="lg" />
      <div>{text}</div>
    </div>
  );
}
