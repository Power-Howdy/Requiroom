"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useFsStore } from "@/store/fsStore";
import { basename, joinPath } from "@/fs/virtualFs";
import { useWindowStore } from "@/store/windowStore";
import {
  AppShell,
  AppSidebar,
  AppSplit,
  AppBody,
  EmptyState,
  FsTree,
  ToolButton,
  TabStrip,
} from "@/components/ui";
import { langOf } from "./langOf";
import { osPrompt } from "@/store/dialogStore";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface EditorTab {
  path: string;
  dirty: boolean;
  value: string;
}

export function EditorApp({ windowId, initialPath }: { windowId: string; initialPath?: string }) {
  const readText = useFsStore((s) => s.readText);
  const writeText = useFsStore((s) => s.writeText);
  const updateTitle = useWindowStore((s) => s.updateTitle);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const openFile = (path: string) => {
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      let value = "";
      try {
        value = readText(path);
      } catch {
        value = "";
      }
      return [...prev, { path, dirty: false, value }];
    });
    setActive(path);
    updateTitle(windowId, `Editor — ${basename(path)}`);
  };

  useEffect(() => {
    if (initialPath) openFile(initialPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  const current = tabs.find((t) => t.path === active);

  const save = () => {
    if (!current) return;
    writeText(current.path, current.value);
    setTabs((t) => t.map((x) => (x.path === current.path ? { ...x, dirty: false } : x)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const language = useMemo(() => (current ? langOf(current.path) : "plaintext"), [current]);

  return (
    <AppShell className="bg-[#0f172a] text-slate-100">
      <AppSplit>
        <AppSidebar>
          <div className="text-[10px] uppercase opacity-50 px-1 mb-1">Explorer</div>
          <FsTree path="/home/user" onOpen={openFile} />
          <ToolButton
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => {
              void (async () => {
                const name = await osPrompt(
                  "New file",
                  joinPath("/home/user/Documents", "untitled.txt"),
                  { confirmLabel: "Create", message: "Path inside the virtual filesystem" },
                );
                if (!name) return;
                writeText(name, "");
                openFile(name);
              })();
            }}
          >
            + New file
          </ToolButton>
        </AppSidebar>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center border-b border-white/10">
            <div className="flex-1 min-w-0">
              <TabStrip
                tabs={tabs.map((t) => ({
                  id: t.path,
                  label: basename(t.path),
                  dirty: t.dirty,
                }))}
                activeId={active}
                onSelect={setActive}
                onClose={(id) => {
                  setTabs((t) => t.filter((x) => x.path !== id));
                  if (active === id) setActive(tabs.find((x) => x.path !== id)?.path ?? null);
                }}
              />
            </div>
            <ToolButton size="sm" className="mx-2" onClick={save} disabled={!current}>
              Save
            </ToolButton>
          </div>
          <AppBody className="min-h-0">
            {current ? (
              <Monaco
                height="100%"
                theme="vs-dark"
                language={language}
                value={current.value}
                onChange={(v) => {
                  setTabs((prev) =>
                    prev.map((t) =>
                      t.path === current.path ? { ...t, value: v ?? "", dirty: true } : t,
                    ),
                  );
                }}
                options={{ fontSize: 13, minimap: { enabled: false }, automaticLayout: true }}
              />
            ) : (
              <EmptyState>Open a file from the explorer, or create a new one.</EmptyState>
            )}
          </AppBody>
        </div>
      </AppSplit>
    </AppShell>
  );
}
