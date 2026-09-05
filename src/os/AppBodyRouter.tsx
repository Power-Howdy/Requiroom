"use client";

import dynamic from "next/dynamic";
import type { AppId } from "@/store/windowStore";

const BrowserApp = dynamic(() => import("@/apps/browser/BrowserApp").then((m) => m.BrowserApp), {
  ssr: false,
});
const FilesApp = dynamic(() => import("@/apps/files/FilesApp").then((m) => m.FilesApp), {
  ssr: false,
});
const ShellApp = dynamic(() => import("@/apps/shell/ShellApp").then((m) => m.ShellApp), {
  ssr: false,
});
const EditorApp = dynamic(() => import("@/apps/editor/EditorApp").then((m) => m.EditorApp), {
  ssr: false,
});
const NotesApp = dynamic(() => import("@/apps/notes/NotesApp").then((m) => m.NotesApp), {
  ssr: false,
});
const ExcelApp = dynamic(() => import("@/apps/excel/ExcelApp").then((m) => m.ExcelApp), {
  ssr: false,
});
const SettingsApp = dynamic(() => import("@/apps/settings/SettingsApp").then((m) => m.SettingsApp), {
  ssr: false,
});
const AssistantApp = dynamic(
  () => import("@/apps/assistant/AssistantApp").then((m) => m.AssistantApp),
  { ssr: false },
);

export function AppBodyRouter({
  appId,
  windowId,
  payload,
}: {
  appId: AppId;
  windowId: string;
  payload?: Record<string, unknown>;
}) {
  const path = typeof payload?.path === "string" ? payload.path : undefined;
  switch (appId) {
    case "browser":
      return <BrowserApp windowId={windowId} />;
    case "files":
      return <FilesApp windowId={windowId} initialPath={path} />;
    case "shell":
      return <ShellApp />;
    case "editor":
      return <EditorApp windowId={windowId} initialPath={path} />;
    case "notes":
      return <NotesApp windowId={windowId} initialPath={path} />;
    case "excel":
      return <ExcelApp windowId={windowId} initialPath={path} />;
    case "settings":
      return <SettingsApp />;
    case "assistant":
      return <AssistantApp windowId={windowId} />;
    default:
      return null;
  }
}
