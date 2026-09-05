"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import {
  createShellContext,
  openEditorFromShell,
  promptOf,
  runShellLine,
  type ShellContext,
} from "./commands";

export function ShellApp() {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const ctxRef = useRef<ShellContext>(createShellContext());
  const lineRef = useRef("");
  const histIdx = useRef(-1);

  useEffect(() => {
    if (!ref.current || termRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: 13,
      theme: {
        background: "#0b1220",
        foreground: "#e2e8f0",
        cursor: "#3b82f6",
      },
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;

    const writePrompt = () => term.write(promptOf(ctxRef.current));
    term.writeln("Requiroom shell — type `help` for commands.");
    writePrompt();

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);

    const completions = [
      "help",
      "pwd",
      "cd",
      "ls",
      "cat",
      "echo",
      "touch",
      "mkdir",
      "rm",
      "cp",
      "mv",
      "head",
      "tail",
      "grep",
      "wc",
      "clear",
      "whoami",
      "hostname",
      "uname",
      "date",
      "env",
      "tree",
      "code",
      "edit",
    ];

    term.onData((data) => {
      const ctx = ctxRef.current;
      if (data === "\r") {
        term.write("\r\n");
        const line = lineRef.current;
        lineRef.current = "";
        histIdx.current = -1;
        const result = runShellLine(ctx, line);
        if (result.out === "__CLEAR__") {
          term.clear();
        } else {
          if (result.out) term.writeln(result.out);
          if (result.err) term.writeln(`\x1b[31m${result.err}\x1b[0m`);
        }
        if (result.openEditor) openEditorFromShell(result.openEditor);
        writePrompt();
        return;
      }
      if (data === "\u007f") {
        if (lineRef.current.length) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }
      if (data === "\t") {
        const partial = lineRef.current.split(/\s+/).pop() || "";
        const match = completions.find((c) => c.startsWith(partial));
        if (match && partial) {
          const rest = match.slice(partial.length);
          lineRef.current += rest;
          term.write(rest);
        }
        return;
      }
      if (data === "\u001b[A") {
        // up
        const h = ctx.history;
        if (!h.length) return;
        if (histIdx.current < 0) histIdx.current = h.length - 1;
        else histIdx.current = Math.max(0, histIdx.current - 1);
        while (lineRef.current.length) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write("\b \b");
        }
        lineRef.current = h[histIdx.current];
        term.write(lineRef.current);
        return;
      }
      if (data === "\u001b[B") {
        const h = ctx.history;
        if (histIdx.current < 0) return;
        histIdx.current = Math.min(h.length - 1, histIdx.current + 1);
        while (lineRef.current.length) {
          lineRef.current = lineRef.current.slice(0, -1);
          term.write("\b \b");
        }
        lineRef.current = h[histIdx.current] || "";
        term.write(lineRef.current);
        return;
      }
      if (data === "\u0003") {
        term.write("^C\r\n");
        lineRef.current = "";
        writePrompt();
        return;
      }
      if (data >= " " || data === "\t") {
        lineRef.current += data;
        term.write(data);
      }
    });

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return <div ref={ref} className="h-full w-full p-1 bg-[#0b1220]" />;
}
