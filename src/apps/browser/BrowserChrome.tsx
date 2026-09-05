"use client";

import { ArrowLeft, ArrowRight, Eraser, Lock, Plus, RotateCw } from "lucide-react";
import { TabStrip, ToolButton, TextInput, AppToolbar } from "@/components/ui";
import type { BrowserTab } from "./browserUtils";

export function BrowserChrome({
  tabs,
  activeId,
  address,
  canBack,
  canForward,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onBack,
  onForward,
  onReload,
  onAddressChange,
  onNavigate,
  onClearData,
}: {
  tabs: BrowserTab[];
  activeId: string;
  address: string;
  canBack: boolean;
  canForward: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onAddressChange: (v: string) => void;
  onNavigate: () => void;
  onClearData: () => void;
}) {
  return (
    <>
      <TabStrip
        tabs={tabs.map((t) => ({ id: t.id, label: t.title }))}
        activeId={activeId}
        onSelect={onSelectTab}
        onClose={onCloseTab}
        trailing={
          <ToolButton className="p-1" onClick={onNewTab} aria-label="New tab">
            <Plus size={14} />
          </ToolButton>
        }
      />
      <AppToolbar>
        <ToolButton onClick={onBack} disabled={!canBack} aria-label="Back">
          <ArrowLeft size={16} />
        </ToolButton>
        <ToolButton onClick={onForward} disabled={!canForward} aria-label="Forward">
          <ArrowRight size={16} />
        </ToolButton>
        <ToolButton onClick={onReload} aria-label="Reload">
          <RotateCw size={16} />
        </ToolButton>
        <Lock size={14} className="opacity-50 ml-1" />
        <TextInput
          className="flex-1 text-sm px-2 py-1 min-w-[120px]"
          value={address}
          placeholder="Search or enter address"
          onChange={(e) => onAddressChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onNavigate();
          }}
        />
        <ToolButton
          title="Clear cookies & cache"
          onClick={onClearData}
          aria-label="Clear browsing data"
        >
          <Eraser size={16} />
        </ToolButton>
      </AppToolbar>
    </>
  );
}
