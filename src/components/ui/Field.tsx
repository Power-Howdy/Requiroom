import { type ReactNode } from "react";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`.trim()}>
      <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
      {children}
    </label>
  );
}
