"use client";

import { AlertDialog } from "@/components/ui/ConfirmDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { useDialogStore } from "@/store/dialogStore";

export function OsDialogs() {
  const current = useDialogStore((s) => s.current);
  const dismiss = useDialogStore((s) => s.dismissCurrent);

  if (!current) return null;

  if (current.kind === "alert") {
    return (
      <AlertDialog
        title={current.title}
        message={current.message}
        confirmLabel={current.confirmLabel}
        onClose={() => {
          current.resolve();
          dismiss();
        }}
      />
    );
  }

  if (current.kind === "confirm") {
    return (
      <ConfirmDialog
        fixed
        title={current.title}
        message={current.message}
        confirmLabel={current.confirmLabel}
        cancelLabel={current.cancelLabel}
        danger={current.danger}
        onConfirm={() => {
          current.resolve(true);
          dismiss();
        }}
        onCancel={() => {
          current.resolve(false);
          dismiss();
        }}
      />
    );
  }

  return (
    <PromptDialog
      title={current.title}
      message={current.message}
      initialValue={current.initialValue}
      confirmLabel={current.confirmLabel}
      placeholder={current.placeholder}
      onConfirm={(value) => {
        current.resolve(value);
        dismiss();
      }}
      onCancel={() => {
        current.resolve(null);
        dismiss();
      }}
    />
  );
}
