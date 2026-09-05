"use client";

import {
  Globe,
  Folder,
  Terminal,
  Code2,
  FileText,
  Table2,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "@/store/windowStore";
import { useThemeStore } from "@/store/themeStore";

const ICONS: Record<AppId, LucideIcon> = {
  browser: Globe,
  files: Folder,
  shell: Terminal,
  editor: Code2,
  notes: FileText,
  excel: Table2,
  settings: Settings,
  assistant: Sparkles,
};

export function AppIcon({
  appId,
  size = 20,
  className = "",
}: {
  appId: AppId;
  size?: number;
  className?: string;
}) {
  const iconStyle = useThemeStore((s) => s.iconStyle);
  const Icon = ICONS[appId];
  const stroke = iconStyle === "filled" ? 0 : iconStyle === "duotone" ? 1.5 : 2;
  const fill =
    iconStyle === "filled"
      ? "currentColor"
      : iconStyle === "duotone"
        ? "currentColor"
        : "none";
  const fillOpacity = iconStyle === "duotone" ? 0.25 : iconStyle === "filled" ? 1 : 0;

  return (
    <Icon
      size={size}
      strokeWidth={stroke || 2}
      fill={fill}
      fillOpacity={fillOpacity}
      className={className}
    />
  );
}
