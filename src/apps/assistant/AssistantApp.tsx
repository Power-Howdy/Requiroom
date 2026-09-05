"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useWindowStore } from "@/store/windowStore";
import { useNotifStore } from "@/store/notifStore";
import { osConfirm } from "@/store/dialogStore";
import {
  SYSTEM_PROMPT,
  TOOL_DEFINITIONS,
  executeTool,
  isDestructive,
  type ToolCall,
} from "@/agent/tools";
import { AppShell, AppBody, TextInput, ToolButton } from "@/components/ui";
import { ChatMessageList, type ChatMsg } from "./ChatMessageList";

export function AssistantApp({ windowId }: { windowId: string }) {
  const settings = useSettingsStore();
  const openApp = useWindowStore((s) => s.openApp);
  const notify = useNotifStore((s) => s.notify);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi — I can drive Requiroom. Ask me to open apps, write notes, run shell commands, or browse.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void settings.init();
  }, [settings]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const runAgent = async (userText: string, history: ChatMsg[]) => {
    if (!settings.apiKey) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "No API key set. Open Settings → AI & notifications to add one.",
        },
      ]);
      openApp("settings");
      return;
    }

    setBusy(true);
    notify({
      title: "Assistant working",
      body: userText.slice(0, 80),
      level: "info",
      appId: "assistant",
      windowId,
    });

    let msgs: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.filter((m) => m.role !== "system"),
      { role: "user", content: userText },
    ];

    try {
      for (let step = 0; step < 8; step++) {
        const res = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: settings.provider,
            model: settings.model,
            apiKey: settings.apiKey,
            messages: msgs,
            tools: TOOL_DEFINITIONS,
            stream: false,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const choice = data.choices?.[0]?.message || data.message;
        const content = choice?.content || "";
        const toolCallsRaw = choice?.tool_calls || [];

        if (content) {
          setMessages((m) => [...m, { role: "assistant", content }]);
          msgs = [...msgs, { role: "assistant", content }];
        }

        if (!toolCallsRaw.length) break;

        for (const tc of toolCallsRaw) {
          const call: ToolCall = {
            id: tc.id || `call-${step}`,
            name: tc.function?.name || tc.name,
            arguments:
              typeof tc.function?.arguments === "string"
                ? JSON.parse(tc.function.arguments || "{}")
                : tc.arguments || {},
          };

          if (isDestructive(call.name)) {
            const preview =
              call.name === "fs_write"
                ? `${call.arguments.path}\n\n${String(call.arguments.content || "").slice(0, 200)}`
                : JSON.stringify(call.arguments, null, 2).slice(0, 300);
            const ok = await osConfirm(
              `Allow assistant to run ${call.name}?\n\n${preview}`,
              {
                title: "Assistant permission",
                confirmLabel: "Allow",
                cancelLabel: "Deny",
                danger: true,
              },
            );
            if (!ok) {
              msgs = [
                ...msgs,
                { role: "assistant", content: choice?.content || `Skipped ${call.name}` },
                { role: "user", content: `Tool ${call.name} result:\nDenied by user` },
              ];
              continue;
            }
          }

          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: `⚙ ${call.name}(${JSON.stringify(call.arguments).slice(0, 120)})`,
            },
          ]);
          const result = await executeTool(call);
          msgs = [
            ...msgs,
            { role: "assistant", content: choice?.content || `Called ${call.name}` },
            { role: "user", content: `Tool ${call.name} result:\n${result}` },
          ];
        }
      }

      notify({
        title: "Assistant finished",
        body: "Task complete",
        level: "success",
        appId: "assistant",
        windowId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${msg}` }]);
      notify({
        title: "Assistant failed",
        body: msg,
        level: "error",
        appId: "assistant",
        windowId,
      });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    await runAgent(text, messages);
  };

  return (
    <AppShell>
      <AppBody className="p-3 space-y-2 text-sm">
        <ChatMessageList messages={messages} />
        {busy && <div className="text-xs opacity-50 px-2">Thinking…</div>}
        <div ref={bottom} />
      </AppBody>
      <div className="flex gap-2 p-2 border-t border-white/10">
        <TextInput
          className="flex-1 text-sm px-2 py-2"
          placeholder="Ask the OS agent…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <ToolButton className="px-3" disabled={busy} onClick={() => void send()}>
          Send
        </ToolButton>
      </div>
    </AppShell>
  );
}
