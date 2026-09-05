"use client";

import { useNotifStore } from "@/store/notifStore";
import { useWindowStore } from "@/store/windowStore";
import { AppIcon } from "./AppIcon";

export function NotificationCenter() {
  const open = useWindowStore((s) => s.notifOpen);
  const setNotifOpen = useWindowStore((s) => s.setNotifOpen);
  const focus = useWindowStore((s) => s.focus);
  const items = useNotifStore((s) => s.items);
  const markRead = useNotifStore((s) => s.markRead);
  const markAllRead = useNotifStore((s) => s.markAllRead);
  const clearAll = useNotifStore((s) => s.clearAll);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9980]" onClick={() => setNotifOpen(false)} />
      <div className="os-notif-center fixed bottom-[calc(var(--os-taskbar-h)+8px)] right-2 z-[9985] w-[360px] max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex gap-2 text-xs">
            <button type="button" className="opacity-70 hover:opacity-100" onClick={markAllRead}>
              Mark all read
            </button>
            <button type="button" className="opacity-70 hover:opacity-100" onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 && (
            <div className="p-6 text-center text-sm opacity-50">No notifications</div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 flex gap-2 ${
                n.read ? "opacity-60" : ""
              }`}
              onClick={() => {
                markRead(n.id);
                if (n.windowId) focus(n.windowId);
                setNotifOpen(false);
              }}
            >
              {n.appId ? (
                <AppIcon appId={n.appId} size={16} className="mt-0.5 shrink-0" />
              ) : (
                <span className="w-4" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{n.title}</div>
                <div className="text-xs opacity-70 line-clamp-2">{n.body}</div>
                <div className="text-[10px] opacity-40 mt-0.5">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--os-primary)] mt-1.5 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
