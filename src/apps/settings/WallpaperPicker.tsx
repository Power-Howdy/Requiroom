"use client";

import { WALLPAPERS, type WallpaperId } from "@/theme/tokens";

function WallpaperThumb({
  id,
  label,
  preview,
  image,
  selected,
  onChange,
}: {
  id: WallpaperId;
  label: string;
  preview: string;
  image?: string;
  selected: boolean;
  onChange: (id: WallpaperId) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={() => onChange(id)}
      className={`group relative overflow-hidden rounded-lg border text-left transition ${
        selected
          ? "border-[var(--os-primary)] ring-2 ring-[rgba(var(--os-primary-rgb),0.45)]"
          : "border-white/15 hover:border-white/35"
      }`}
    >
      <span
        className="block h-16 w-full bg-cover bg-center"
        style={
          image
            ? { backgroundImage: `url(${image})`, backgroundColor: "#0f172a" }
            : { background: preview }
        }
        aria-hidden
      />
      <span className="block px-2 py-1 text-xs bg-black/40 truncate">{label}</span>
    </button>
  );
}

export function WallpaperPicker({
  value,
  onChange,
}: {
  value: WallpaperId;
  onChange: (id: WallpaperId) => void;
}) {
  const scenes = WALLPAPERS.filter((w) => w.group === "scenes" || w.image);
  const gradients = WALLPAPERS.filter((w) => w.group === "gradients" || (!w.image && w.group !== "scenes"));

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1.5">Requiroom scenes</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {scenes.map((w) => (
            <WallpaperThumb
              key={w.id}
              id={w.id}
              label={w.label}
              preview={w.preview}
              image={w.image}
              selected={value === w.id}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1.5">Gradients</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {gradients.map((w) => (
            <WallpaperThumb
              key={w.id}
              id={w.id}
              label={w.label}
              preview={w.preview}
              selected={value === w.id}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
