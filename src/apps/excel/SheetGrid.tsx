"use client";

import { useEffect, useRef } from "react";
import { TextInput } from "@/components/ui";
import { COLS, ROWS, displayCell, type Sheet } from "./sheetModel";

export function SheetGrid({
  sheet,
  active,
  draft,
  editing,
  onSelect,
  onDraftChange,
  onStartEdit,
  onCommit,
  onCancelEdit,
  onNavigate,
}: {
  sheet: Sheet;
  active: string;
  draft: string;
  editing: boolean;
  onSelect: (key: string) => void;
  onDraftChange: (value: string) => void;
  onStartEdit: (seed?: string) => void;
  onCommit: (move?: "down" | "right" | "none") => void;
  onCancelEdit: () => void;
  onNavigate: (key: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      gridRef.current?.focus();
    }
  }, [editing, active]);

  return (
    <div
      ref={gridRef}
      className="h-full overflow-auto outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === "F2" || e.key === "Enter") {
          e.preventDefault();
          onStartEdit();
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onDraftChange("");
          onCommit("none");
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onStartEdit(e.key);
          return;
        }
        const m = /^([A-J])(\d+)$/i.exec(active);
        if (!m) return;
        const col = m[1].toUpperCase();
        const row = parseInt(m[2], 10);
        const ci = COLS.indexOf(col);
        let next: string | null = null;
        if (e.key === "ArrowUp") next = `${col}${Math.max(1, row - 1)}`;
        if (e.key === "ArrowDown") next = `${col}${Math.min(ROWS.length, row + 1)}`;
        if (e.key === "ArrowLeft") next = `${COLS[Math.max(0, ci - 1)]}${row}`;
        if (e.key === "ArrowRight") next = `${COLS[Math.min(COLS.length - 1, ci + 1)]}${row}`;
        if (e.key === "Tab") {
          e.preventDefault();
          next = e.shiftKey
            ? `${COLS[Math.max(0, ci - 1)]}${row}`
            : `${COLS[Math.min(COLS.length - 1, ci + 1)]}${row}`;
        }
        if (next) {
          e.preventDefault();
          onNavigate(next);
        }
      }}
    >
      <table className="border-collapse text-xs select-none">
        <thead>
          <tr>
            <th className="w-8 border border-white/10 bg-white/5 sticky top-0 left-0 z-[1]" />
            {COLS.map((c) => (
              <th
                key={c}
                className="min-w-[80px] border border-white/10 bg-white/5 px-1 py-1 sticky top-0"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r}>
              <td className="border border-white/10 bg-white/5 text-center opacity-60 sticky left-0">
                {r}
              </td>
              {COLS.map((c) => {
                const key = `${c}${r}`;
                const isActive = active === key;
                const isEditing = isActive && editing;
                return (
                  <td
                    key={key}
                    className={`border border-white/10 px-0 py-0 h-7 relative cursor-cell ${
                      isActive ? "outline outline-2 outline-[var(--os-primary)] z-[1]" : ""
                    }`}
                    onClick={() => {
                      if (isActive && !editing) onStartEdit();
                      else onSelect(key);
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      onSelect(key);
                      onStartEdit();
                    }}
                  >
                    {isEditing ? (
                      <TextInput
                        ref={inputRef}
                        className="w-full h-full min-h-7 rounded-none border-0 px-1 py-0.5 text-xs font-mono bg-[var(--os-panel)]"
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onBlur={() => onCommit("none")}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onCommit("down");
                          } else if (e.key === "Tab") {
                            e.preventDefault();
                            onCommit("right");
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            onCancelEdit();
                          }
                        }}
                      />
                    ) : (
                      <span className="block px-1 py-0.5 truncate min-h-7 leading-6">
                        {displayCell(sheet.cells[key], sheet.cells)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
