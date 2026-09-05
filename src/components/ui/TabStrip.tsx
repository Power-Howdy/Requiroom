import { type ReactNode } from "react";
import { X } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  dirty?: boolean;
}

export function TabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  trailing,
}: {
  tabs: TabItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1 pt-1 border-b border-white/10 overflow-x-auto">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-t max-w-[160px] ${
            t.id === activeId ? "bg-white/10" : "opacity-60 hover:bg-white/5"
          }`}
        >
          <button type="button" className="truncate" onClick={() => onSelect(t.id)}>
            {t.label}
            {t.dirty ? " •" : ""}
          </button>
          {onClose && tabs.length > 1 && (
            <button type="button" aria-label={`Close ${t.label}`} onClick={() => onClose(t.id)}>
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      {trailing}
    </div>
  );
}

export function SegmentTabs({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-white/10">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`px-4 py-2 text-sm ${
            activeId === t.id ? "border-b-2 border-[var(--os-primary)]" : "opacity-60"
          }`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
