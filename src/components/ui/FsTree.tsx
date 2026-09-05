"use client";

import { useState } from "react";
import { useFsStore } from "@/store/fsStore";
import type { FsNode } from "@/fs/virtualFs";

export function FsTree({
  path,
  depth = 0,
  onOpen,
  initiallyOpen,
}: {
  path: string;
  depth?: number;
  onOpen: (path: string) => void;
  initiallyOpen?: boolean;
}) {
  const tree = useFsStore((s) => s.tree);
  const ls = useFsStore((s) => s.ls);
  const [open, setOpen] = useState(initiallyOpen ?? depth < 2);
  let kids: FsNode[] = [];
  try {
    kids = ls(path);
  } catch {
    kids = [];
  }
  void tree;

  return (
    <div>
      {kids.map((n) => (
        <div key={n.path}>
          <button
            type="button"
            className="w-full text-left text-xs px-1 py-0.5 hover:bg-white/10 truncate"
            style={{ paddingLeft: 4 + depth * 10 }}
            onClick={() => {
              if (n.type === "dir") setOpen((o) => !o);
              else onOpen(n.path);
            }}
          >
            {n.type === "dir" ? (open ? "📂 " : "📁 ") : "📄 "}
            {n.name}
          </button>
          {n.type === "dir" && open && (
            <FsTree path={n.path} depth={depth + 1} onOpen={onOpen} />
          )}
        </div>
      ))}
    </div>
  );
}
