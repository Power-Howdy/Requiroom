import { type ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center opacity-50 text-sm p-6 text-center">
      {children}
    </div>
  );
}

export function ListRowButton({
  active,
  children,
  onClick,
  className = "",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`w-full text-left text-sm px-2 py-1.5 rounded truncate ${
        active ? "bg-[rgba(var(--os-primary-rgb),0.25)]" : "hover:bg-white/5"
      } ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
