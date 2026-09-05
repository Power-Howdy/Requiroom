"use client";

import { useState } from "react";
import { useSettingsStore, DEFAULT_MODELS, type LlmProvider } from "@/store/settingsStore";
import { useNotifStore } from "@/store/notifStore";
import { Field, TextInput, SelectInput, ToolButton } from "@/components/ui";

export function AiSettingsPanel() {
  const settings = useSettingsStore();
  const notify = useNotifStore((s) => s.notify);
  const showToasts = useNotifStore((s) => s.showToasts);
  const setShowToasts = useNotifStore((s) => s.setShowToasts);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    if (!settings.apiKey) {
      notify({
        title: "Missing API key",
        body: "Paste a key first.",
        level: "warning",
        appId: "settings",
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
          messages: [{ role: "user", content: "Reply with OK" }],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      notify({
        title: "Connection OK",
        body: `${settings.provider} / ${settings.model}`,
        level: "success",
        appId: "settings",
      });
    } catch (e) {
      notify({
        title: "Connection failed",
        body: e instanceof Error ? e.message : "Error",
        level: "error",
        appId: "settings",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Provider">
        <SelectInput
          value={settings.provider}
          onChange={(e) => {
            const provider = e.target.value as LlmProvider;
            settings.setSettings({ provider, model: DEFAULT_MODELS[provider] });
          }}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Gemini</option>
          <option value="nvidia">NVIDIA NIM</option>
        </SelectInput>
      </Field>
      <Field label="API key (stored only in this browser)">
        <TextInput
          type="password"
          className="w-full"
          value={settings.apiKey}
          onChange={(e) => settings.setSettings({ apiKey: e.target.value })}
          placeholder={
            settings.provider === "nvidia" ? "nvapi-…" : "sk-…"
          }
        />
      </Field>
      <Field label="Model">
        <TextInput
          className="w-full"
          value={settings.model}
          onChange={(e) => settings.setSettings({ model: e.target.value })}
        />
      </Field>
      <div className="flex gap-2">
        <ToolButton className="px-3" onClick={testConnection} disabled={testing}>
          {testing ? "Testing…" : "Test connection"}
        </ToolButton>
        <ToolButton className="px-3" onClick={() => settings.clearKey()}>
          Clear key
        </ToolButton>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showToasts}
          onChange={(e) => setShowToasts(e.target.checked)}
        />
        Show toast notifications
      </label>
    </div>
  );
}
