import { basename } from "@/fs/virtualFs";
import type { AppId } from "@/store/windowStore";

type OpenApp = (id: AppId, title?: string, payload?: Record<string, unknown>) => string;

export function openPathWithApp(path: string, openApp: OpenApp) {
  const name = basename(path).toLowerCase();
  if (name.endsWith(".md")) {
    openApp("notes", `Notes — ${basename(path)}`, { path });
    return;
  }
  if (name.endsWith(".sheet.json") || name.endsWith(".csv")) {
    openApp("excel", `Sheets — ${basename(path)}`, { path });
    return;
  }
  if (/\.(txt|json|ts|tsx|js|jsx|css|html|py|sh|md)$/i.test(name)) {
    openApp("editor", `Editor — ${basename(path)}`, { path });
  }
}
