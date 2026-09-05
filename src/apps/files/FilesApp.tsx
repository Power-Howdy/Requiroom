"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFsStore } from "@/store/fsStore";
import { basename, joinPath, type FsNode } from "@/fs/virtualFs";
import {
  exportFsFile,
  exportFsFolderZip,
  importDirectoryFromDisk,
  importHostFiles,
  openFromDisk,
  saveToDisk,
  supportsFileSystemAccess,
} from "@/fs/transfer";
import { useWindowStore } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { AppShell, AppToolbar, AppSidebar, AppSplit, AppBody, ToolButton, ConfirmDialog } from "@/components/ui";
import { openPathWithApp } from "./openPathWithApp";
import { FilesToolbar } from "./FilesToolbar";
import { FilesSidebar, FilesListView, FilesIconView, FilesPreviewPane } from "./FilesViews";
import { NameDialog } from "./NameDialog";

const SIDEBAR_ROOTS = [
  "/home/user",
  "/home/user/Documents",
  "/home/user/Downloads",
  "/home/user/Notes",
  "/home/user/Sheets",
  "/tmp",
];

type NameMode =
  | { kind: "folder" }
  | { kind: "rename"; path: string }
  | null;

type DeleteConfirm =
  | { kind: "selection"; paths: string[] }
  | { kind: "single"; path: string; name: string }
  | null;

export function FilesApp({ windowId, initialPath }: { windowId: string; initialPath?: string }) {
  const tree = useFsStore((s) => s.tree);
  const ls = useFsStore((s) => s.ls);
  const mkdir = useFsStore((s) => s.mkdir);
  const rm = useFsStore((s) => s.rm);
  const mv = useFsStore((s) => s.mv);
  const openApp = useWindowStore((s) => s.openApp);
  const updatePayload = useWindowStore((s) => s.updatePayload);
  const notify = useNotifStore((s) => s.notify);

  const start = initialPath || "/home/user";
  const [cwd, setCwd] = useState(start);
  const [history, setHistory] = useState<string[]>([start]);
  const [histIdx, setHistIdx] = useState(0);
  const [view, setView] = useState<"list" | "icons">("list");
  const [selected, setSelected] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<{ mode: "copy" | "cut"; paths: string[] } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nameMode, setNameMode] = useState<NameMode>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const fsa = useMemo(() => supportsFileSystemAccess(), []);

  useEffect(() => {
    updatePayload(windowId, { path: cwd });
  }, [cwd, windowId, updatePayload]);

  const entries = useMemo(() => {
    try {
      void tree[cwd];
      return ls(cwd);
    } catch {
      return [];
    }
  }, [ls, cwd, tree]);

  const navigate = (path: string) => {
    const next = history.slice(0, histIdx + 1).concat(path);
    setHistory(next);
    setHistIdx(next.length - 1);
    setCwd(path);
    setSelected([]);
    setPreview(null);
  };

  const onOpen = (node: FsNode) => {
    if (node.type === "dir") navigate(node.path);
    else if (node.mime?.startsWith("image/") || node.mime === "application/pdf") setPreview(node.path);
    else openPathWithApp(node.path, openApp);
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const r = await importHostFiles(files, cwd);
      notify({
        title: "Import complete",
        body: `Imported ${r.imported} file(s) into ${cwd}`,
        level: r.warned ? "warning" : "success",
        appId: "files",
        windowId,
      });
    } catch (e) {
      notify({
        title: "Import failed",
        body: e instanceof Error ? e.message : "Unknown error",
        level: "error",
        appId: "files",
        windowId,
      });
    }
  };

  const uniqueChildName = (base: string) => {
    const existing = new Set(entries.map((e) => e.name));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base} ${i}`)) i += 1;
    return `${base} ${i}`;
  };

  const renamePath = (oldPath: string) => {
    setNameMode({ kind: "rename", path: oldPath });
  };

  const deleteSel = () => {
    if (!selected.length) return;
    setDeleteConfirm({ kind: "selection", paths: [...selected] });
  };

  const performDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.kind === "selection") {
      for (const p of deleteConfirm.paths) rm(p, true);
    } else {
      rm(deleteConfirm.path, true);
    }
    setSelected([]);
    setDeleteConfirm(null);
  };

  const downloadSel = () => {
    if (!selected.length) return;
    try {
      for (const p of selected) {
        const node = useFsStore.getState().stat(p);
        if (node?.type === "dir") exportFsFolderZip(p, tree);
        else exportFsFile(p);
      }
      notify({
        title: "Export started",
        body: "Download should begin shortly.",
        level: "info",
        appId: "files",
        windowId,
      });
    } catch (e) {
      notify({
        title: "Export failed",
        body: e instanceof Error ? e.message : "Unknown error",
        level: "error",
        appId: "files",
      });
    }
  };

  const onContextAction = (node: FsNode, action: string) => {
    setSelected([node.path]);
    if (action === "rename") renamePath(node.path);
    if (action === "delete") {
      setDeleteConfirm({ kind: "single", path: node.path, name: node.name });
      return;
    }
    if (action === "download") {
      try {
        if (node.type === "dir") exportFsFolderZip(node.path, tree);
        else exportFsFile(node.path);
      } catch (e) {
        notify({
          title: "Export failed",
          body: e instanceof Error ? e.message : "Unknown error",
          level: "error",
          appId: "files",
        });
      }
    }
    if (action === "cut") setClipboard({ mode: "cut", paths: [node.path] });
    if (action === "copy") setClipboard({ mode: "copy", paths: [node.path] });
  };

  const previewNode = preview ? useFsStore.getState().stat(preview) : null;

  const onNameConfirm = (value: string) => {
    if (!nameMode) return;
    try {
      if (nameMode.kind === "folder") {
        const dest = joinPath(cwd, value);
        if (useFsStore.getState().stat(dest)) {
          notify({
            title: "Folder exists",
            body: `${value} already exists here.`,
            level: "warning",
            appId: "files",
            windowId,
          });
          return;
        }
        mkdir(dest);
      } else {
        const dest = joinPath(cwd, value);
        if (dest !== nameMode.path) mv(nameMode.path, dest);
        setSelected([]);
      }
      setNameMode(null);
    } catch (e) {
      notify({
        title: nameMode.kind === "folder" ? "Could not create folder" : "Rename failed",
        body: e instanceof Error ? e.message : "Unknown error",
        level: "error",
        appId: "files",
        windowId,
      });
    }
  };

  return (
    <AppShell
      className="relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files?.length) await onUpload(e.dataTransfer.files);
      }}
    >
      <AppToolbar>
        <FilesToolbar
          cwd={cwd}
          onCwdChange={setCwd}
          onNavigateEnter={() => navigate(cwd)}
          canBack={histIdx > 0}
          canForward={histIdx < history.length - 1}
          onBack={() => {
            if (histIdx <= 0) return;
            const i = histIdx - 1;
            setHistIdx(i);
            setCwd(history[i]);
          }}
          onForward={() => {
            if (histIdx >= history.length - 1) return;
            const i = histIdx + 1;
            setHistIdx(i);
            setCwd(history[i]);
          }}
          onRefresh={() => setCwd(cwd)}
          onNewFolder={() => setNameMode({ kind: "folder" })}
          onUploadClick={() => fileInput.current?.click()}
          onImportFolderClick={() => folderInput.current?.click()}
          fsa={fsa}
          onOpenFromDisk={async () => {
            const n = await openFromDisk(cwd);
            notify({ title: "Opened from disk", body: `${n} file(s)`, level: "success", appId: "files" });
          }}
          onImportDirFromDisk={async () => {
            const n = await importDirectoryFromDisk(cwd);
            notify({ title: "Folder imported", body: `${n} file(s)`, level: "success", appId: "files" });
          }}
          canSaveToDisk={selected.length === 1 && useFsStore.getState().stat(selected[0])?.type === "file"}
          onSaveToDisk={async () => {
            await saveToDisk(selected[0]);
            notify({ title: "Saved to disk", body: selected[0], level: "success", appId: "files" });
          }}
          canDownload={selected.length > 0}
          onDownload={downloadSel}
          canDelete={selected.length > 0}
          onDelete={deleteSel}
          view={view}
          onToggleView={() => setView(view === "list" ? "icons" : "list")}
        />
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <input
          ref={folderInput}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory
          webkitdirectory=""
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </AppToolbar>

      <AppSplit>
        <AppSidebar widthClass="w-44">
          <FilesSidebar roots={SIDEBAR_ROOTS} cwd={cwd} onNavigate={navigate} />
        </AppSidebar>

        <AppBody className="p-2" onClick={() => setSelected([])}>
          {view === "list" ? (
            <FilesListView
              entries={entries}
              selected={selected}
              onSelect={(path, multi) =>
                setSelected((s) =>
                  multi ? (s.includes(path) ? s.filter((x) => x !== path) : [...s, path]) : [path],
                )
              }
              onOpen={onOpen}
              onContextAction={onContextAction}
            />
          ) : (
            <FilesIconView
              entries={entries}
              selected={selected}
              onSelect={(path) => setSelected([path])}
              onOpen={onOpen}
              onContextAction={onContextAction}
            />
          )}
          {clipboard && (
            <ToolButton
              size="sm"
              className="mt-3"
              onClick={() => {
                for (const p of clipboard.paths) {
                  const dest = joinPath(cwd, basename(p));
                  if (clipboard.mode === "copy") useFsStore.getState().cp(p, dest);
                  else useFsStore.getState().mv(p, dest);
                }
                setClipboard(null);
              }}
            >
              Paste here ({clipboard.mode})
            </ToolButton>
          )}
        </AppBody>

        {preview && previewNode?.type === "file" && (
          <FilesPreviewPane
            path={preview}
            mime={previewNode.mime}
            name={previewNode.name}
            bytes={useFsStore.getState().readBytes(preview)}
            onClose={() => setPreview(null)}
          />
        )}
      </AppSplit>

      {nameMode?.kind === "folder" && (
        <NameDialog
          title="New folder"
          initialValue={uniqueChildName("New Folder")}
          confirmLabel="Create"
          onConfirm={onNameConfirm}
          onCancel={() => setNameMode(null)}
        />
      )}
      {nameMode?.kind === "rename" && (
        <NameDialog
          title="Rename"
          initialValue={basename(nameMode.path)}
          confirmLabel="Rename"
          onConfirm={onNameConfirm}
          onCancel={() => setNameMode(null)}
        />
      )}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete"
          message={
            deleteConfirm.kind === "selection"
              ? `Delete ${deleteConfirm.paths.length} item${deleteConfirm.paths.length === 1 ? "" : "s"}? This cannot be undone.`
              : `Delete “${deleteConfirm.name}”? This cannot be undone.`
          }
          confirmLabel="Delete"
          onConfirm={performDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </AppShell>
  );
}
