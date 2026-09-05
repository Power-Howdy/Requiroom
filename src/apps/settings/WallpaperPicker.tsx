"use client";

import { WALLPAPERS, type WallpaperId } from "@/theme/tokens";

export function WallpaperPicker({
  value,
  onChange,
}: {
  value: WallpaperId;
  onChange: (id: WallpaperId) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {WALLPAPERS.map((w) => {
        const selected = w.id === value;
        return (
          <button
            key={w.id}
            type="button"
            title={w.label}
            onClick={() => onChange(w.id)}
            className={`group relative overflow-hidden rounded-lg border text-left transition ${
              selected
                ? "border-[var(--os-primary)] ring-2 ring-[rgba(var(--os-primary-rgb),0.45)]"
                : "border-white/15 hover:border-white/35"
            }`}
          >
            <span
              className="block h-14 w-full"
              style={{ background: w.preview }}
              aria-hidden
            />
            <span className="block px-2 py-1 text-xs bg-black/40 truncate">{w.label}</span>
          </button>
        );
      })}
    </div>
  );
}
