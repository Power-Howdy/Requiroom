"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFsStore } from "@/store/fsStore";
import { basename, joinPath } from "@/fs/virtualFs";
import { useWindowStore } from "@/store/windowStore";
import {
  AppShell,
  AppToolbar,
  AppBody,
  ToolButton,
  TextInput,
  SelectInput,
} from "@/components/ui";
import { NameDialog } from "@/apps/files/NameDialog";
import { SheetGrid } from "./SheetGrid";
import {
  COLS,
  ROWS,
  colRow,
  emptyBook,
  parseCsvToBook,
  type Workbook,
} from "./sheetModel";

function nextCell(active: string, move: "down" | "right" | "none"): string {
  if (move === "none") return active;
  const cr = colRow(active);
  if (!cr) return active;
  if (move === "down") return `${cr.c}${Math.min(ROWS.length, cr.r + 1)}`;
  const ci = COLS.indexOf(cr.c);
  return `${COLS[Math.min(COLS.length - 1, ci + 1)]}${cr.r}`;
}

export function ExcelApp({ windowId, initialPath }: { windowId: string; initialPath?: string }) {
  const readText = useFsStore((s) => s.readText);
  const writeText = useFsStore((s) => s.writeText);
  const tree = useFsStore((s) => s.tree);
  const updateTitle = useWindowStore((s) => s.updateTitle);
  const [path, setPath] = useState(initialPath || "");
  const [book, setBook] = useState<Workbook>(emptyBook());
  const [sheetIdx, setSheetIdx] = useState(0);
  const [active, setActive] = useState("A1");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);

  const sheet = book.sheets[sheetIdx] || book.sheets[0];

  const load = useCallback(
    (p: string) => {
      try {
        if (p.endsWith(".csv")) {
          setBook(parseCsvToBook(basename(p), readText(p)));
        } else {
          setBook(JSON.parse(readText(p)) as Workbook);
        }
        setPath(p);
        setEditing(false);
        updateTitle(windowId, `Sheets — ${basename(p)}`);
      } catch {
        setBook(emptyBook());
      }
    },
    [readText, updateTitle, windowId],
  );

  useEffect(() => {
    if (initialPath) load(initialPath);
  }, [initialPath, load]);

  useEffect(() => {
    if (editing) return;
    const cell = sheet.cells[active];
    setDraft(cell?.f ?? (cell?.v !== undefined ? String(cell.v) : ""));
  }, [active, sheet, editing]);

  const writeDraftToBook = (value: string) => {
    const cells = { ...sheet.cells };
    if (!value) delete cells[active];
    else if (value.startsWith("=")) cells[active] = { f: value };
    else {
      const num = Number(value);
      cells[active] = {
        v: value !== "" && !Number.isNaN(num) && value.trim() !== "" ? num : value,
      };
    }
    setBook({
      ...book,
      sheets: book.sheets.map((s, i) => (i === sheetIdx ? { ...s, cells } : s)),
    });
  };

  const startEdit = (seed?: string) => {
    if (seed !== undefined) setDraft(seed);
    else {
      const cell = sheet.cells[active];
      setDraft(cell?.f ?? (cell?.v !== undefined ? String(cell.v) : ""));
    }
    setEditing(true);
  };

  const cancelEdit = () => {
    const cell = sheet.cells[active];
    setDraft(cell?.f ?? (cell?.v !== undefined ? String(cell.v) : ""));
    setEditing(false);
  };

  const commit = (move: "down" | "right" | "none" = "none") => {
    writeDraftToBook(draft);
    setEditing(false);
    if (move !== "none") setActive(nextCell(active, move));
  };

  const saveToPath = (p: string) => {
    writeText(p, JSON.stringify(book, null, 2), "application/json");
    setPath(p);
    updateTitle(windowId, `Sheets — ${basename(p)}`);
  };

  const save = () => {
    if (!path) {
      setSaveAsOpen(true);
      return;
    }
    saveToPath(path);
  };

  const sheetsList = useMemo(() => {
    try {
      return useFsStore
        .getState()
        .ls("/home/user/Sheets")
        .filter((n) => n.type === "file");
    } catch {
      return [];
    }
  }, [book, path, tree]);

  return (
    <AppShell>
      <AppToolbar>
        <ToolButton size="sm" onClick={() => { setBook(emptyBook("Untitled")); setPath(""); setEditing(false); }}>
          New
        </ToolButton>
        <ToolButton size="sm" onClick={save}>
          Save
        </ToolButton>
        <SelectInput
          className="text-xs"
          value={path}
          onChange={(e) => e.target.value && load(e.target.value)}
        >
          <option value="">Open…</option>
          {sheetsList.map((n) => (
            <option key={n.path} value={n.path}>
              {n.name}
            </option>
          ))}
        </SelectInput>
        <span className="text-xs opacity-50 min-w-[2rem]">{active}</span>
        <TextInput
          className="flex-1 text-sm px-2 py-1 font-mono"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (!editing) setEditing(true);
          }}
          onFocus={() => setEditing(true)}
          onBlur={() => {
            if (editing) commit("none");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit("down");
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          placeholder="Enter value or =formula"
        />
      </AppToolbar>
      <AppBody className="p-0 overflow-hidden">
        <SheetGrid
          sheet={sheet}
          active={active}
          draft={draft}
          editing={editing}
          onSelect={(key) => {
            if (editing && key !== active) commit("none");
            setActive(key);
            setEditing(false);
          }}
          onDraftChange={setDraft}
          onStartEdit={startEdit}
          onCommit={commit}
          onCancelEdit={cancelEdit}
          onNavigate={(key) => {
            setActive(key);
            setEditing(false);
          }}
        />
      </AppBody>
      <div className="flex gap-1 px-2 py-1 border-t border-white/10">
        {book.sheets.map((s, i) => (
          <button
            key={s.name}
            type="button"
            className={`text-xs px-2 py-1 rounded ${
              i === sheetIdx ? "bg-[rgba(var(--os-primary-rgb),0.3)]" : "hover:bg-white/10"
            }`}
            onClick={() => {
              if (editing) commit("none");
              setSheetIdx(i);
              setEditing(false);
            }}
          >
            {s.name}
          </button>
        ))}
        <button
          type="button"
          className="text-xs px-2 py-1 hover:bg-white/10"
          onClick={() =>
            setBook({
              ...book,
              sheets: [...book.sheets, { name: `Sheet${book.sheets.length + 1}`, cells: {} }],
            })
          }
        >
          +
        </button>
      </div>

      {saveAsOpen && (
        <NameDialog
          title="Save workbook as"
          initialValue="Workbook.sheet.json"
          confirmLabel="Save"
          onConfirm={(name) => {
            const file = name.endsWith(".sheet.json") ? name : `${name.replace(/\.json$/i, "")}.sheet.json`;
            saveToPath(joinPath("/home/user/Sheets", file));
            setSaveAsOpen(false);
          }}
          onCancel={() => setSaveAsOpen(false)}
        />
      )}
    </AppShell>
  );
}
