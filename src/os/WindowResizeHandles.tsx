"use client";

import { useCallback, useRef } from "react";
import { useWindowStore, type Bounds } from "@/store/windowStore";

const EDGES = ["e", "s", "se", "w", "n", "ne", "nw", "sw"] as const;

export function WindowResizeHandles({
  windowId,
  bounds,
}: {
  windowId: string;
  bounds: Bounds;
}) {
  const focus = useWindowStore((s) => s.focus);
  const move = useWindowStore((s) => s.move);
  const resize = useRef<{
    ox: number;
    oy: number;
    bw: number;
    bh: number;
    bx: number;
    by: number;
    edge: string;
  } | null>(null);

  const onStart = useCallback(
    (edge: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      focus(windowId);
      resize.current = {
        ox: e.clientX,
        oy: e.clientY,
        bw: bounds.w,
        bh: bounds.h,
        bx: bounds.x,
        by: bounds.y,
        edge,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [focus, windowId, bounds],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resize.current) return;
      const { ox, oy, bw, bh, bx, by, edge } = resize.current;
      const dx = e.clientX - ox;
      const dy = e.clientY - oy;
      let x = bx;
      let y = by;
      let w = bw;
      let h = bh;
      if (edge.includes("e")) w = Math.max(320, bw + dx);
      if (edge.includes("s")) h = Math.max(200, bh + dy);
      if (edge.includes("w")) {
        w = Math.max(320, bw - dx);
        x = bx + (bw - w);
      }
      if (edge.includes("n")) {
        h = Math.max(200, bh - dy);
        y = by + (bh - h);
      }
      move(windowId, { x, y, w, h });
    },
    [move, windowId],
  );

  return (
    <>
      {EDGES.map((edge) => (
        <div
          key={edge}
          className={`os-resize-${edge}`}
          onPointerDown={onStart(edge)}
          onPointerMove={onMove}
          onPointerUp={() => {
            resize.current = null;
          }}
        />
      ))}
    </>
  );
}
