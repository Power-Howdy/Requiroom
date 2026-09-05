"use client";

import { AppIcon } from "./AppIcon";
import { APP_META, useWindowStore, type AppId } from "@/store/windowStore";

const APPS: AppId[] = [
  "browser",
  "files",
  "shell",
  "editor",
  "notes",
  "excel",
  "settings",
  "assistant",
];

export function StartMenu() {
  const open = useWindowStore((s) => s.startOpen);
  const setStartOpen = useWindowStore((s) => s.setStartOpen);
  const openApp = useWindowStore((s) => s.openApp);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9980]" onClick={() => setStartOpen(false)} />
      <div className="os-startmenu fixed bottom-[calc(var(--os-taskbar-h)+8px)] left-2 z-[9985] w-[340px] p-3">
        <div className="text-xs uppercase tracking-wider opacity-60 mb-2 px-1">Applications</div>
        <div className="grid grid-cols-2 gap-1">
          {APPS.map((id) => (
            <button
              key={id}
              type="button"
              className="os-start-item flex items-center gap-3 px-3 py-2.5 text-left"
              onClick={() => {
                openApp(id);
                setStartOpen(false);
              }}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${APP_META[id].color}33`, color: APP_META[id].color }}
              >
                <AppIcon appId={id} size={18} />
              </span>
              <span className="text-sm font-medium">{APP_META[id].title}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
