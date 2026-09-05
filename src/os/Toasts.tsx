"use client";

import { X } from "lucide-react";
import { useNotifStore } from "@/store/notifStore";
import { AppIcon } from "./AppIcon";

export function Toasts() {
  const toasts = useNotifStore((s) => s.toasts);
  const dismiss = useNotifStore((s) => s.dismissToast);

  return (
    <div className="fixed top-3 right-3 z-[10000] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`os-toast pointer-events-auto flex gap-2 p-3 os-toast-${t.level}`}
        >
          {t.appId && <AppIcon appId={t.appId} size={18} className="shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{t.title}</div>
            <div className="text-xs opacity-80 line-clamp-3">{t.body}</div>
          </div>
          <button type="button" className="opacity-60 hover:opacity-100" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
