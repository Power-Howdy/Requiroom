"use client";

import { create } from "zustand";

type AlertReq = {
  kind: "alert";
  title: string;
  message: string;
  confirmLabel?: string;
  resolve: () => void;
};

type ConfirmReq = {
  kind: "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

type PromptReq = {
  kind: "prompt";
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  placeholder?: string;
  resolve: (value: string | null) => void;
};

export type DialogRequest = (AlertReq | ConfirmReq | PromptReq) & { id: string };

interface DialogState {
  queue: DialogRequest[];
  current: DialogRequest | null;
  enqueue: (req: DialogRequest) => string;
  dismissCurrent: () => void;
}

function nid() {
  return `dlg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  queue: [],
  current: null,

  enqueue: (full) => {
    const { current, queue } = get();
    if (!current) set({ current: full });
    else set({ queue: [...queue, full] });
    return full.id;
  },

  dismissCurrent: () => {
    const { queue } = get();
    const [next, ...rest] = queue;
    set({ current: next ?? null, queue: rest });
  },
}));

export function osAlert(
  message: string,
  opts?: { title?: string; confirmLabel?: string },
): Promise<void> {
  return new Promise((resolve) => {
    useDialogStore.getState().enqueue({
      id: nid(),
      kind: "alert",
      title: opts?.title ?? "Notice",
      message,
      confirmLabel: opts?.confirmLabel ?? "OK",
      resolve,
    });
  });
}

export function osConfirm(
  message: string,
  opts?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().enqueue({
      id: nid(),
      kind: "confirm",
      title: opts?.title ?? "Confirm",
      message,
      confirmLabel: opts?.confirmLabel ?? "OK",
      cancelLabel: opts?.cancelLabel ?? "Cancel",
      danger: opts?.danger ?? false,
      resolve,
    });
  });
}

export function osPrompt(
  title: string,
  initialValue = "",
  opts?: { message?: string; confirmLabel?: string; placeholder?: string },
): Promise<string | null> {
  return new Promise((resolve) => {
    useDialogStore.getState().enqueue({
      id: nid(),
      kind: "prompt",
      title,
      message: opts?.message,
      initialValue,
      confirmLabel: opts?.confirmLabel ?? "OK",
      placeholder: opts?.placeholder,
      resolve,
    });
  });
}
