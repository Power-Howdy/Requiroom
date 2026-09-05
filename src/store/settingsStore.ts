"use client";

import { create } from "zustand";
import { idbGet, idbSet } from "@/lib/idb";

export type LlmProvider = "openai" | "anthropic" | "gemini" | "nvidia";

export interface AiSettings {
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

interface SettingsState extends AiSettings {
  ready: boolean;
  init: () => Promise<void>;
  setSettings: (partial: Partial<AiSettings>) => void;
  clearKey: () => void;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash",
  nvidia: "meta/llama-3.3-70b-instruct",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  provider: "openai",
  apiKey: "",
  model: DEFAULT_MODELS.openai,
  ready: false,

  init: async () => {
    const saved = await idbGet<AiSettings>("settings", "ai");
    if (saved) {
      set({
        provider: saved.provider || "openai",
        apiKey: saved.apiKey || "",
        model: saved.model || DEFAULT_MODELS[saved.provider || "openai"],
        ready: true,
      });
    } else {
      set({ ready: true });
    }
  },

  setSettings: (partial) => {
    const next = {
      provider: partial.provider ?? get().provider,
      apiKey: partial.apiKey ?? get().apiKey,
      model:
        partial.model ??
        (partial.provider ? DEFAULT_MODELS[partial.provider] : get().model),
    };
    set(next);
    void idbSet("settings", "ai", next);
  },

  clearKey: () => {
    const next = { ...get(), apiKey: "" };
    set({ apiKey: "" });
    void idbSet("settings", "ai", {
      provider: next.provider,
      apiKey: "",
      model: next.model,
    });
  },
}));

export { DEFAULT_MODELS };
