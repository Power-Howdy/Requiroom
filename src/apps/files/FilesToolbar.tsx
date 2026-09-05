"use client";

import {
  ArrowLeft,
  ArrowRight,
  Download,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { ToolButton, TextInput } from "@/components/ui";

export function FilesToolbar({
  cwd,
  onCwdChange,
  onNavigateEnter,
  canBack,
  canForward,
  onBack,
  onForward,
  onRefresh,
  onNewFolder,
  onUploadClick,
  onImportFolderClick,
  fsa,
  onOpenFromDisk,
  onImportDirFromDisk,
  canSaveToDisk,
  onSaveToDisk,
  canDownload,
  onDownload,
  canDelete,
  onDelete,
  view,
  onToggleView,
}: {
  cwd: string;
  onCwdChange: (v: string) => void;
  onNavigateEnter: () => void;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onUploadClick: () => void;
  onImportFolderClick: () => void;
  fsa: boolean;
  onOpenFromDisk: () => void;
  onImportDirFromDisk: () => void;
  canSaveToDisk: boolean;
  onSaveToDisk: () => void;
  canDownload: boolean;
  onDownload: () => void;
  canDelete: boolean;
  onDelete: () => void;
  view: "list" | "icons";
  onToggleView: () => void;
}) {
  return (
    <>
      <ToolButton onClick={onBack} disabled={!canBack} aria-label="Back">
        <ArrowLeft size={16} />
      </ToolButton>
      <ToolButton onClick={onForward} disabled={!canForward} aria-label="Forward">
        <ArrowRight size={16} />
      </ToolButton>
      <ToolButton onClick={onRefresh} aria-label="Refresh">
        <RefreshCw size={16} />
      </ToolButton>
      <TextInput
        className="flex-1 min-w-[120px] text-sm px-2 py-1"
        value={cwd}
        onChange={(e) => onCwdChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onNavigateEnter();
        }}
      />
      <ToolButton title="New folder" onClick={onNewFolder}>
        <FolderPlus size={16} />
      </ToolButton>
      <ToolButton title="Upload" onClick={onUploadClick}>
        <Upload size={16} />
      </ToolButton>
      <ToolButton title="Import folder" onClick={onImportFolderClick}>
        <HardDrive size={16} />
      </ToolButton>
      {fsa && (
        <>
          <ToolButton size="sm" onClick={onOpenFromDisk}>
            Open…
          </ToolButton>
          <ToolButton size="sm" onClick={onImportDirFromDisk}>
            Import folder…
          </ToolButton>
          {canSaveToDisk && (
            <ToolButton size="sm" onClick={onSaveToDisk}>
              Save to disk…
            </ToolButton>
          )}
        </>
      )}
      <ToolButton title="Download" onClick={onDownload} disabled={!canDownload}>
        <Download size={16} />
      </ToolButton>
      <ToolButton title="Delete" onClick={onDelete} disabled={!canDelete}>
        <Trash2 size={16} />
      </ToolButton>
      <ToolButton onClick={onToggleView} aria-label="Toggle view">
        {view === "list" ? <LayoutGrid size={16} /> : <List size={16} />}
      </ToolButton>
    </>
  );
}
