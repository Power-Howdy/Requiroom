"use client";

import { useEffect, useRef } from "react";
import { TextInput } from "@/components/ui/TextInput";
import { ToolButton } from "@/components/ui/ToolButton";

export function PromptDialog({
  title,
  message,
  initialValue = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  placeholder,
  fixed = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  fixed?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const submit = () => {
    const v = (ref.current?.value ?? "").trim();
    if (!v) return;
    onConfirm(v);
  };

  return (
    <div
      className={`${fixed ? "fixed z-[12000]" : "absolute z-20"} inset-0 flex items-center justify-center bg-black/50 p-4`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/15 bg-[var(--os-panel)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className="text-sm font-medium text-slate-100">{title}</p>
        {message && <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{message}</p>}
        <TextInput
          ref={ref}
          className="mt-3 w-full"
          defaultValue={initialValue}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <ToolButton size="sm" className="px-3" onClick={onCancel}>
            {cancelLabel}
          </ToolButton>
          <ToolButton size="sm" className="px-3" onClick={submit}>
            {confirmLabel}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
