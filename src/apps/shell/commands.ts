"use client";

import { useFsStore } from "@/store/fsStore";
import {
  basename,
  dirname,
  joinPath,
  normalizePath,
  type FsNode,
} from "@/fs/virtualFs";
import { useWindowStore } from "@/store/windowStore";

export interface ShellContext {
  cwd: string;
  env: Record<string, string>;
  history: string[];
}

export function createShellContext(): ShellContext {
  return {
    cwd: "/home/user",
    env: {
      USER: "user",
      HOME: "/home/user",
      HOSTNAME: "requiroom",
      PATH: "/bin:/usr/bin",
      SHELL: "/bin/sh",
    },
    history: [],
  };
}

function expandPath(ctx: ShellContext, path: string): string {
  if (!path || path === "~") return ctx.env.HOME;
  if (path.startsWith("~/")) return joinPath(ctx.env.HOME, path.slice(2));
  if (path.startsWith("/")) return normalizePath(path);
  return joinPath(ctx.cwd, path);
}

function formatLs(nodes: FsNode[], long: boolean): string {
  if (!long) return nodes.map((n) => n.name + (n.type === "dir" ? "/" : "")).join("  ");
  return nodes
    .map((n) => {
      const mode = n.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
      const size = String(n.size).padStart(8);
      const date = new Date(n.mtime).toLocaleString();
      return `${mode} 1 user user ${size} ${date} ${n.name}`;
    })
    .join("\n");
}

function runSimple(
  ctx: ShellContext,
  cmd: string,
  args: string[],
): { out: string; err?: string; openEditor?: string } {
  const fs = useFsStore.getState();

  switch (cmd) {
    case "help":
      return {
        out: "Commands: help pwd cd ls cat echo touch mkdir rm cp mv head tail grep wc clear whoami hostname uname date env tree code edit",
      };
    case "pwd":
      return { out: ctx.cwd };
    case "cd": {
      const target = expandPath(ctx, args[0] || ctx.env.HOME);
      const node = fs.stat(target);
      if (!node || node.type !== "dir") return { out: "", err: `cd: no such directory: ${args[0]}` };
      ctx.cwd = target;
      return { out: "" };
    }
    case "ls": {
      const long = args.includes("-l") || args.includes("-la") || args.includes("-al");
      const pathArg = args.find((a) => !a.startsWith("-"));
      const target = expandPath(ctx, pathArg || ".");
      try {
        return { out: formatLs(fs.ls(target), long) };
      } catch (e) {
        return { out: "", err: e instanceof Error ? e.message : "ls failed" };
      }
    }
    case "cat": {
      if (!args[0]) return { out: "", err: "cat: missing file" };
      try {
        return { out: fs.readText(expandPath(ctx, args[0])) };
      } catch (e) {
        return { out: "", err: e instanceof Error ? e.message : "cat failed" };
      }
    }
    case "echo":
      return { out: args.join(" ") };
    case "touch": {
      for (const a of args) {
        const p = expandPath(ctx, a);
        if (!fs.stat(p)) fs.writeText(p, "");
      }
      return { out: "" };
    }
    case "mkdir": {
      for (const a of args.filter((x) => x !== "-p")) {
        fs.mkdir(expandPath(ctx, a));
      }
      return { out: "" };
    }
    case "rm": {
      const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
      for (const a of args.filter((x) => !x.startsWith("-"))) {
        try {
          fs.rm(expandPath(ctx, a), recursive);
        } catch (e) {
          return { out: "", err: e instanceof Error ? e.message : "rm failed" };
        }
      }
      return { out: "" };
    }
    case "cp": {
      if (args.length < 2) return { out: "", err: "cp: usage: cp src dest" };
      fs.cp(expandPath(ctx, args[0]), expandPath(ctx, args[1]));
      return { out: "" };
    }
    case "mv": {
      if (args.length < 2) return { out: "", err: "mv: usage: mv src dest" };
      fs.mv(expandPath(ctx, args[0]), expandPath(ctx, args[1]));
      return { out: "" };
    }
    case "head": {
      const n = args.includes("-n") ? parseInt(args[args.indexOf("-n") + 1] || "10", 10) : 10;
      const file = args.filter((a) => !a.startsWith("-") && a !== String(n)).pop();
      if (!file) return { out: "", err: "head: missing file" };
      const lines = fs.readText(expandPath(ctx, file)).split("\n").slice(0, n);
      return { out: lines.join("\n") };
    }
    case "tail": {
      const n = args.includes("-n") ? parseInt(args[args.indexOf("-n") + 1] || "10", 10) : 10;
      const file = args.filter((a) => !a.startsWith("-") && a !== String(n)).pop();
      if (!file) return { out: "", err: "tail: missing file" };
      const lines = fs.readText(expandPath(ctx, file)).split("\n");
      return { out: lines.slice(-n).join("\n") };
    }
    case "grep": {
      const pattern = args[0];
      const file = args[1];
      if (!pattern || !file) return { out: "", err: "grep: usage: grep pattern file" };
      const lines = fs
        .readText(expandPath(ctx, file))
        .split("\n")
        .filter((l) => l.includes(pattern));
      return { out: lines.join("\n") };
    }
    case "wc": {
      const file = args[0];
      if (!file) return { out: "", err: "wc: missing file" };
      const text = fs.readText(expandPath(ctx, file));
      const lines = text ? text.split("\n").length : 0;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      return { out: `${lines} ${words} ${chars} ${file}` };
    }
    case "clear":
      return { out: "__CLEAR__" };
    case "whoami":
      return { out: ctx.env.USER };
    case "hostname":
      return { out: ctx.env.HOSTNAME };
    case "uname":
      return { out: args.includes("-a") ? "Requiroom 1.0 browser x86_64 GNU/Linux" : "Requiroom" };
    case "date":
      return { out: new Date().toString() };
    case "env":
      return { out: Object.entries(ctx.env).map(([k, v]) => `${k}=${v}`).join("\n") };
    case "tree": {
      const root = expandPath(ctx, args[0] || ".");
      const lines: string[] = [root];
      const walk = (path: string, prefix: string) => {
        let kids: FsNode[] = [];
        try {
          kids = fs.ls(path);
        } catch {
          return;
        }
        kids.forEach((k, i) => {
          const last = i === kids.length - 1;
          lines.push(`${prefix}${last ? "└── " : "├── "}${k.name}`);
          if (k.type === "dir") walk(k.path, prefix + (last ? "    " : "│   "));
        });
      };
      walk(root, "");
      return { out: lines.join("\n") };
    }
    case "code":
    case "edit": {
      if (!args[0]) return { out: "", err: `${cmd}: missing file` };
      const p = expandPath(ctx, args[0]);
      if (!fs.stat(p)) fs.writeText(p, "");
      return { out: `Opening ${p}`, openEditor: p };
    }
    case "":
      return { out: "" };
    default:
      return { out: "", err: `command not found: ${cmd}` };
  }
}

function tokenize(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur) parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur) parts.push(cur);
  return parts;
}

function runSegment(ctx: ShellContext, segment: string, stdin: string): { out: string; err?: string; openEditor?: string } {
  let redir = segment;
  let append = false;
  let outFile: string | null = null;
  if (/\s>>\s*/.test(segment)) {
    const [left, right] = segment.split(/>>/);
    redir = left.trim();
    outFile = right.trim();
    append = true;
  } else if (/\s>\s*/.test(segment)) {
    const [left, right] = segment.split(/>/);
    redir = left.trim();
    outFile = right.trim();
  }

  const tokens = tokenize(redir);
  const cmd = tokens[0] || "";
  const args = tokens.slice(1);

  // pipe-aware: if stdin provided and cmd reads file from stdin conceptually
  let result = runSimple(ctx, cmd, args);
  if (stdin && (cmd === "grep" || cmd === "wc" || cmd === "head" || cmd === "tail" || cmd === "cat")) {
    if (cmd === "grep") {
      const pattern = args[0] || "";
      result = { out: stdin.split("\n").filter((l) => l.includes(pattern)).join("\n") };
    } else if (cmd === "wc") {
      const lines = stdin ? stdin.split("\n").length : 0;
      const words = stdin.trim() ? stdin.trim().split(/\s+/).length : 0;
      result = { out: `${lines} ${words} ${stdin.length}` };
    } else if (cmd === "head") {
      result = { out: stdin.split("\n").slice(0, 10).join("\n") };
    } else if (cmd === "tail") {
      result = { out: stdin.split("\n").slice(-10).join("\n") };
    } else if (cmd === "cat") {
      result = { out: stdin };
    }
  }

  if (outFile && !result.err) {
    const fs = useFsStore.getState();
    const path = expandPath(ctx, outFile);
    const prev = append && fs.stat(path) ? fs.readText(path) : "";
    fs.writeText(path, prev + (prev && append ? "\n" : "") + result.out);
    return { out: "", openEditor: result.openEditor };
  }
  return result;
}

export function runShellLine(
  ctx: ShellContext,
  line: string,
): { out: string; err?: string; openEditor?: string } {
  const trimmed = line.trim();
  if (!trimmed) return { out: "" };
  ctx.history.push(trimmed);

  const pipes = trimmed.split("|").map((s) => s.trim());
  let stdin = "";
  let last: { out: string; err?: string; openEditor?: string } = { out: "" };
  for (const seg of pipes) {
    last = runSegment(ctx, seg, stdin);
    if (last.err) return last;
    stdin = last.out;
  }
  return last;
}

export function promptOf(ctx: ShellContext): string {
  return `${ctx.env.USER}@${ctx.env.HOSTNAME}:${ctx.cwd}$ `;
}

export function openEditorFromShell(path: string) {
  useWindowStore.getState().openApp("editor", `Editor — ${basename(path)}`, { path });
}

export { dirname, basename };
