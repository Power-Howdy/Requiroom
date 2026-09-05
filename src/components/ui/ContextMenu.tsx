"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = {
  id: string;
  label: string;
  danger?: boolean;
};

export function ContextMenu({
  x,
  y,
  items,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const left = Math.min(x, typeof window !== "undefined" ? window.innerWidth - 180 : x);
  const top = Math.min(y, typeof window !== "undefined" ? window.innerHeight - items.length * 36 - 16 : y);

  return (
    <div
      ref={ref}
      className="fixed z-[11000] min-w-[160px] rounded-lg border border-white/15 bg-[var(--os-panel)] py-1 shadow-xl"
      style={{ left, top }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 ${
            item.danger ? "text-red-300" : "text-slate-100"
          }`}
          onClick={() => {
            onSelect(item.id);
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
