"use client";

import { PromptDialog } from "@/components/ui";

/** @deprecated Prefer PromptDialog — kept for local absolute overlays in Apps */
export function NameDialog({
  title,
  initialValue,
  confirmLabel = "Create",
  onConfirm,
  onCancel,
}: {
  title: string;
  initialValue: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <PromptDialog
      fixed={false}
      title={title}
      initialValue={initialValue}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
