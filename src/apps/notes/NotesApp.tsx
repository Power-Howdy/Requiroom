"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useFsStore } from "@/store/fsStore";
import { basename, joinPath } from "@/fs/virtualFs";
import { useWindowStore } from "@/store/windowStore";
import { osPrompt } from "@/store/dialogStore";
import {
  AppShell,
  AppSidebar,
  AppSplit,
  AppBody,
  EmptyState,
  ListRowButton,
  ToolButton,
} from "@/components/ui";

function mdToHtml(md: string): string {
  return md
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function htmlToMd(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function NotesApp({ windowId, initialPath }: { windowId: string; initialPath?: string }) {
  const tree = useFsStore((s) => s.tree);
  const ls = useFsStore((s) => s.ls);
  const readText = useFsStore((s) => s.readText);
  const writeText = useFsStore((s) => s.writeText);
  const updateTitle = useWindowStore((s) => s.updateTitle);

  const notes = useMemo(() => {
    try {
      void tree["/home/user/Notes"];
      return ls("/home/user/Notes").filter((n) => n.type === "file" && n.name.endsWith(".md"));
    } catch {
      return [];
    }
  }, [ls, tree]);

  const [path, setPath] = useState(initialPath || notes[0]?.path || "");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm",
      },
    },
  });

  useEffect(() => {
    if (!path || !editor) return;
    try {
      editor.commands.setContent(mdToHtml(readText(path)));
      updateTitle(windowId, `Notes — ${basename(path)}`);
    } catch {
      /* empty */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, editor]);

  useEffect(() => {
    if (!editor || !path) return;
    const t = setInterval(() => {
      writeText(path, htmlToMd(editor.getHTML()), "text/markdown");
    }, 1500);
    return () => clearInterval(t);
  }, [editor, path, writeText]);

  return (
    <AppShell>
      <AppSplit>
        <AppSidebar>
          <ToolButton
            size="sm"
            className="w-full mb-2"
            onClick={() => {
              void (async () => {
                const name = await osPrompt("New note", `note-${Date.now()}.md`, {
                  confirmLabel: "Create",
                });
                if (!name) return;
                const p = joinPath(
                  "/home/user/Notes",
                  name.endsWith(".md") ? name : `${name}.md`,
                );
                writeText(p, `# ${basename(p).replace(/\.md$/, "")}\n\n`, "text/markdown");
                setPath(p);
              })();
            }}
          >
            + New note
          </ToolButton>
          {notes.map((n) => (
            <ListRowButton key={n.path} active={n.path === path} onClick={() => setPath(n.path)}>
              {n.name}
            </ListRowButton>
          ))}
        </AppSidebar>
        <AppBody>
          {path ? <EditorContent editor={editor} /> : <EmptyState>Create or select a note.</EmptyState>}
        </AppBody>
      </AppSplit>
    </AppShell>
  );
}
