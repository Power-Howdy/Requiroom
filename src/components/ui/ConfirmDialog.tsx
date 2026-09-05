"use client";

import { useEffect, useRef } from "react";
import { ToolButton } from "@/components/ui/ToolButton";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  fixed = false,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Use fixed overlay (OS-level). Default absolute for in-app shells. */
  fixed?: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className={`${fixed ? "fixed" : "absolute"} inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/15 bg-[var(--os-panel)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rq-confirm-title"
        aria-describedby="rq-confirm-msg"
      >
        <p id="rq-confirm-title" className="text-sm font-medium text-slate-100">
          {title}
        </p>
        <p id="rq-confirm-msg" className="mt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <ToolButton size="sm" className="px-3" onClick={onCancel}>
            {cancelLabel}
          </ToolButton>
          <ToolButton
            ref={confirmRef}
            size="sm"
            className={`px-3 ${
              danger ? "bg-red-600/90 hover:bg-red-500 text-white border-red-500/40" : ""
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

export function AlertDialog({
  title,
  message,
  confirmLabel = "OK",
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/15 bg-[var(--os-panel)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <p className="text-sm font-medium text-slate-100">{title}</p>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="mt-4 flex justify-end">
          <ToolButton ref={okRef} size="sm" className="px-3" onClick={onClose}>
            {confirmLabel}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
