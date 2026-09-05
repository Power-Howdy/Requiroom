"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { useWindowStore, type WindowRecord } from "@/store/windowStore";

export function OsWindow({ win, children }: { win: WindowRecord; children: ReactNode }) {
  const focus = useWindowStore((s) => s.focus);
  const close = useWindowStore((s) => s.close);
  const minimize = useWindowStore((s) => s.minimize);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const move = useWindowStore((s) => s.move);
  const focusedId = useWindowStore((s) => s.focusedId);
  const drag = useRef<{ ox: number; oy: number; bx: number; by: number } | null>(null);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (win.state === "maximized") return;
      if ((e.target as HTMLElement).closest("button")) return;
      focus(win.id);
      drag.current = { ox: e.clientX, oy: e.clientY, bx: win.bounds.x, by: win.bounds.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [focus, win],
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      move(win.id, {
        x: Math.max(0, drag.current.bx + (e.clientX - drag.current.ox)),
        y: Math.max(0, drag.current.by + (e.clientY - drag.current.oy)),
      });
    },
    [move, win.id],
  );

  if (win.state === "minimized") return null;

  const maximized = win.state === "maximized";
  const style = maximized
    ? {
        left: 0,
        top: 0,
        width: "100%",
        height: "calc(100% - var(--os-taskbar-h))",
        zIndex: win.z,
      }
    : {
        left: win.bounds.x,
        top: win.bounds.y,
        width: win.bounds.w,
        height: win.bounds.h,
        zIndex: win.z,
      };

  return (
    <div
      className={`os-window absolute flex flex-col overflow-hidden ${
        focusedId === win.id ? "os-window-focused" : ""
      }`}
      style={style}
      onMouseDown={() => focus(win.id)}
    >
      <div
        className="os-titlebar flex items-center gap-2 px-2 select-none cursor-default"
        style={{ height: "var(--os-title-h)" }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={() => {
          drag.current = null;
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <AppIcon appId={win.appId} size={16} className="text-[var(--os-primary)] shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">{win.title}</span>
        <div className="flex items-center gap-0.5">
          <button type="button" className="os-win-btn" onClick={() => minimize(win.id)} aria-label="Minimize">
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="os-win-btn"
            onClick={() => toggleMaximize(win.id)}
            aria-label="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            type="button"
            className="os-win-btn os-win-btn-close"
            onClick={() => close(win.id)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="os-window-body flex-1 min-h-0 overflow-hidden">{children}</div>
      {!maximized && <WindowResizeHandles windowId={win.id} bounds={win.bounds} />}
    </div>
  );
}
