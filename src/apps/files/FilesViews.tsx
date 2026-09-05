"use client";

import { useState } from "react";
import { basename, type FsNode } from "@/fs/virtualFs";
import { ContextMenu, FsNodeIcon, ToolButton } from "@/components/ui";

export function FilesSidebar({
  roots,
  cwd,
  onNavigate,
}: {
  roots: string[];
  cwd: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <>
      {roots.map((p) => (
        <button
          key={p}
          type="button"
          className={`w-full text-left px-2 py-1.5 rounded hover:bg-white/10 truncate ${
            cwd === p ? "bg-[rgba(var(--os-primary-rgb),0.25)]" : ""
          }`}
          onClick={() => onNavigate(p)}
        >
          {basename(p) || p}
        </button>
      ))}
    </>
  );
}

const FILE_ACTIONS = [
  { id: "rename", label: "Rename" },
  { id: "download", label: "Download" },
  { id: "cut", label: "Cut" },
  { id: "copy", label: "Copy" },
  { id: "delete", label: "Delete", danger: true },
] as const;

export function FilesListView({
  entries,
  selected,
  onSelect,
  onOpen,
  onContextAction,
}: {
  entries: FsNode[];
  selected: string[];
  onSelect: (path: string, multi: boolean) => void;
  onOpen: (node: FsNode) => void;
  onContextAction: (node: FsNode, action: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);

  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-xs opacity-50">
          <tr>
            <th className="text-left font-medium py-1">Name</th>
            <th className="text-left font-medium py-1 w-24">Size</th>
            <th className="text-left font-medium py-1 w-40">Modified</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((n) => (
            <tr
              key={n.path}
              className={`cursor-default hover:bg-white/5 ${
                selected.includes(n.path) ? "bg-[rgba(var(--os-primary-rgb),0.2)]" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(n.path, e.ctrlKey || e.metaKey);
              }}
              onDoubleClick={() => onOpen(n)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(n.path, false);
                setMenu({ x: e.clientX, y: e.clientY, node: n });
              }}
            >
              <td className="py-1.5">
                <span className="inline-flex items-center gap-2">
                  <FsNodeIcon node={n} />
                  {n.name}
                </span>
              </td>
              <td className="opacity-60">{n.type === "dir" ? "—" : `${n.size} B`}</td>
              <td className="opacity-60">{new Date(n.mtime).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[...FILE_ACTIONS]}
          onSelect={(id) => onContextAction(menu.node, id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

export function FilesIconView({
  entries,
  selected,
  onSelect,
  onOpen,
  onContextAction,
}: {
  entries: FsNode[];
  selected: string[];
  onSelect: (path: string) => void;
  onOpen: (node: FsNode) => void;
  onContextAction?: (node: FsNode, action: string) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {entries.map((n) => (
          <button
            key={n.path}
            type="button"
            className={`flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/5 ${
              selected.includes(n.path) ? "bg-[rgba(var(--os-primary-rgb),0.2)]" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.path);
            }}
            onDoubleClick={() => onOpen(n)}
            onContextMenu={(e) => {
              if (!onContextAction) return;
              e.preventDefault();
              e.stopPropagation();
              onSelect(n.path);
              setMenu({ x: e.clientX, y: e.clientY, node: n });
            }}
          >
            <FsNodeIcon node={n} />
            <span className="text-xs text-center truncate w-full">{n.name}</span>
          </button>
        ))}
      </div>
      {menu && onContextAction && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[...FILE_ACTIONS]}
          onSelect={(id) => onContextAction(menu.node, id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

export function FilesPreviewPane({
  path,
  mime,
  name,
  bytes,
  onClose,
}: {
  path: string;
  mime?: string;
  name: string;
  bytes: Uint8Array;
  onClose: () => void;
}) {
  void path;
  if (mime?.startsWith("image/")) {
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }));
    return (
      <aside className="w-64 border-l border-white/10 p-2 overflow-auto">
        <div className="text-xs opacity-60 mb-2">Preview</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="max-w-full rounded" />
        <ToolButton size="sm" className="mt-2" onClick={onClose}>
          Close
        </ToolButton>
      </aside>
    );
  }
  return (
    <aside className="w-64 border-l border-white/10 p-2 overflow-auto">
      <div className="text-xs opacity-60 mb-2">Preview</div>
      <div className="text-xs">{name}</div>
      <ToolButton size="sm" className="mt-2" onClick={onClose}>
        Close
      </ToolButton>
    </aside>
  );
}
