"use client";

// Toggle Yes/No — ใช้แทน radio button ตามที่ตกลง
export function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={"toggle" + (value ? " on" : "")}
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      aria-pressed={value}
    >
      <span className="track">
        <span className="knob" />
      </span>
      <span className="lbl">{value ? "Yes" : "No"}</span>
    </button>
  );
}
