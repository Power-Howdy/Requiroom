import { COLOR_SWATCHES } from "@/theme/tokens";

export function ColorPickerRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className="w-6 h-6 rounded-full border border-white/20"
          style={{ background: c }}
          aria-label={c}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
