import { useFsStore } from "@/store/fsStore";
import { useWindowStore, type AppId, APP_META } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { joinPath } from "@/fs/virtualFs";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "open_app",
      description: "Open a Requiroom application window",
      parameters: {
        type: "object",
        properties: {
          appId: {
            type: "string",
            enum: ["browser", "files", "shell", "editor", "notes", "excel", "settings", "assistant"],
          },
          path: { type: "string", description: "Optional file path payload" },
        },
        required: ["appId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "focus_window",
      description: "Focus a window by id",
      parameters: {
        type: "object",
        properties: { windowId: { type: "string" } },
        required: ["windowId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_window",
      description: "Close a window by id",
      parameters: {
        type: "object",
        properties: { windowId: { type: "string" } },
        required: ["windowId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_windows",
      description: "List open windows",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "shell_exec",
      description: "Run a shell command in the virtual Linux shell",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_ls",
      description: "List a directory in the virtual filesystem",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_read",
      description: "Read a text file from the virtual filesystem",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_write",
      description: "Write a text file (destructive — may overwrite)",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notes_upsert",
      description: "Create or update a markdown note and open Notes",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          content: { type: "string" },
        },
        required: ["name", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sheet_set_cells",
      description: "Write cells into a sheet workbook JSON file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          cells: { type: "object", additionalProperties: { type: "string" } },
        },
        required: ["path", "cells"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editor_open",
      description: "Open a file in the code editor",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "files_open",
      description: "Open the Files app at a path",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Open/focus Browser and navigate to a URL",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_read",
      description: "Read text content from the active browser iframe when same-origin (home page); cross-origin pages cannot be read",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "notify",
      description: "Post an OS notification",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          level: { type: "string", enum: ["info", "success", "warning", "error"] },
        },
        required: ["title", "body"],
      },
    },
  },
] as const;

export function isDestructive(name: string): boolean {
  return name === "fs_write" || name === "shell_exec";
}

export async function executeTool(call: ToolCall): Promise<string> {
  const args = call.arguments || {};
  const wm = useWindowStore.getState();
  const fs = useFsStore.getState();

  try {
    switch (call.name) {
      case "open_app": {
        const appId = args.appId as AppId;
        const path = args.path as string | undefined;
        const id = wm.openApp(appId, APP_META[appId]?.title, path ? { path } : undefined);
        return JSON.stringify({ windowId: id, appId });
      }
      case "focus_window": {
        wm.focus(String(args.windowId));
        return "focused";
      }
      case "close_window": {
        wm.close(String(args.windowId));
        return "closed";
      }
      case "list_windows":
        return JSON.stringify(
          wm.windows.map((w) => ({
            id: w.id,
            appId: w.appId,
            title: w.title,
            state: w.state,
          })),
        );
      case "shell_exec": {
        const { createShellContext, runShellLine } = await import("@/apps/shell/commands");
        const ctx = createShellContext();
        const result = runShellLine(ctx, String(args.command || ""));
        return JSON.stringify(result);
      }
      case "fs_ls":
        return JSON.stringify(
          fs.ls(String(args.path)).map((n) => ({
            name: n.name,
            path: n.path,
            type: n.type,
            size: n.size,
          })),
        );
      case "fs_read":
        return fs.readText(String(args.path)).slice(0, 20000);
      case "fs_write":
        fs.writeText(String(args.path), String(args.content ?? ""));
        return `wrote ${args.path}`;
      case "notes_upsert": {
        const name = String(args.name);
        const path = joinPath(
          "/home/user/Notes",
          name.endsWith(".md") ? name : `${name}.md`,
        );
        fs.writeText(path, String(args.content ?? ""), "text/markdown");
        wm.openApp("notes", `Notes — ${name}`, { path });
        return path;
      }
      case "sheet_set_cells": {
        const path = String(args.path);
        let book = {
          name: "Workbook",
          sheets: [{ name: "Sheet1", cells: {} as Record<string, { v?: string | number; f?: string }> }],
        };
        try {
          book = JSON.parse(fs.readText(path));
        } catch {
          /* new */
        }
        const cells = (args.cells || {}) as Record<string, string>;
        for (const [k, v] of Object.entries(cells)) {
          if (String(v).startsWith("=")) book.sheets[0].cells[k] = { f: String(v) };
          else {
            const num = Number(v);
            book.sheets[0].cells[k] = {
              v: v !== "" && !Number.isNaN(num) ? num : v,
            };
          }
        }
        fs.writeText(path, JSON.stringify(book, null, 2), "application/json");
        wm.openApp("excel", `Sheets — ${path}`, { path });
        return path;
      }
      case "editor_open": {
        const path = String(args.path);
        wm.openApp("editor", `Editor — ${path}`, { path });
        return path;
      }
      case "files_open": {
        const path = String(args.path || "/home/user");
        wm.openApp("files", "Files", { path });
        return path;
      }
      case "browser_navigate": {
        const url = String(args.url);
        const existing = wm.windows.find((w) => w.appId === "browser");
        const id = existing
          ? existing.id
          : wm.openApp("browser");
        if (existing) wm.focus(existing.id);
        window.dispatchEvent(
          new CustomEvent("requiroom:navigate", { detail: { windowId: id, url } }),
        );
        return `navigating to ${url}`;
      }
      case "browser_read": {
        const iframe = document.querySelector(
          ".os-window-focused iframe",
        ) as HTMLIFrameElement | null;
        try {
          const text = iframe?.contentDocument?.body?.innerText || "";
          return text.slice(0, 15000) || "(empty or cross-origin)";
        } catch {
          return "(unable to read iframe)";
        }
      }
      case "notify": {
        useNotifStore.getState().notify({
          title: String(args.title),
          body: String(args.body),
          level: (args.level as "info") || "info",
          appId: "assistant",
        });
        return "notified";
      }
      default:
        return `Unknown tool: ${call.name}`;
    }
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export const SYSTEM_PROMPT = `You are Requiroom Assistant, an AI that controls an in-browser desktop OS.
You can open apps, run shell commands, read/write the virtual filesystem, edit notes and sheets, navigate the built-in browser, and post notifications.
Prefer short tool sequences. Confirm intent in your final message. The filesystem is virtual (IndexedDB), not the user's real disk unless they import files.
When done with a multi-step job, call notify with a short summary.`;
