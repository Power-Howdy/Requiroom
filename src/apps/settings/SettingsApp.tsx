"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { AppShell, AppBody, SegmentTabs } from "@/components/ui";
import { AppearancePanel } from "./AppearancePanel";
import { AiSettingsPanel } from "./AiSettingsPanel";

type SettingsTab = "appearance" | "ai";

export function SettingsApp() {
  const [tab, setTab] = useState<SettingsTab>("appearance");
  const initTheme = useThemeStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);

  useEffect(() => {
    void initTheme();
    void initSettings();
  }, [initTheme, initSettings]);

  return (
    <AppShell>
      <SegmentTabs
        tabs={[
          { id: "appearance", label: "Appearance" },
          { id: "ai", label: "AI & notifications" },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as SettingsTab)}
      />
      <AppBody className="p-4">
        {tab === "appearance" ? <AppearancePanel /> : <AiSettingsPanel />}
      </AppBody>
    </AppShell>
  );
}
