"use client";

import { useEffect, useState } from "react";
import { Pencil, PinOff, Plus, X } from "lucide-react";
import {
  buildStartLink,
  useStartPinsStore,
} from "@/store/startPinsStore";
import { osConfirm } from "@/store/dialogStore";
import type { StartLink } from "./browserUtils";

function StartCard({
  link,
  onOpen,
  onUnpin,
  onEdit,
}: {
  link: StartLink;
  onOpen: (url: string) => void;
  onUnpin: (href: string) => void;
  onEdit: (link: StartLink) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  let host = link.href;
  try {
    host = new URL(link.href).hostname.replace(/^www\./, "");
  } catch {
    /* keep */
  }

  return (
    <div className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/55 text-left shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-sky-400/40 hover:bg-slate-900/65 hover:shadow-sky-950/30">
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          title="Edit shortcut"
          aria-label="Edit shortcut"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(link);
          }}
          className="rounded-lg border border-white/10 bg-slate-950/80 p-1.5 text-slate-300 backdrop-blur hover:bg-slate-800 hover:text-white"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          title="Unpin from start page"
          aria-label="Unpin from start page"
          onClick={(e) => {
            e.stopPropagation();
            void onUnpin(link.href);
          }}
          className="rounded-lg border border-white/10 bg-slate-950/80 p-1.5 text-slate-300 backdrop-blur hover:bg-rose-950/80 hover:text-rose-200"
        >
          <PinOff size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onOpen(link.href)}
        className="flex w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60"
      >
        <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-slate-900">
          {!imgFailed && link.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote OG previews
            <img
              src={link.image}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 px-4 text-center text-sm font-medium text-slate-400">
              {link.label}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400/80">
            {host}
          </div>
          <h2 className="text-[15px] font-semibold leading-snug text-slate-50 line-clamp-2">
            {link.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-400 line-clamp-3">
            {link.description}
          </p>
        </div>
      </button>
    </div>
  );
}

function ShortcutDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: { name: string; url: string } | null;
  onClose: () => void;
  onSave: (name: string, url: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!initial?.url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e293b] p-5 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="shortcut-dialog-title" className="text-lg font-semibold text-white">
              {editing ? "Edit shortcut" : "Add shortcut"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Pin a site to your start page, like Chrome’s new-tab shortcuts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mb-3 block text-xs font-medium text-slate-400">
          Name
          <input
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
            value={name}
            placeholder="Optional display name"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <label className="mb-4 block text-xs font-medium text-slate-400">
          URL
          <input
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50"
            value={url}
            placeholder="https://example.com"
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim()) {
                e.preventDefault();
                void (async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await onSave(name, url);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not save");
                    setBusy(false);
                  }
                })();
              }
            }}
          />
        </label>

        {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  await onSave(name, url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                  setBusy(false);
                }
              })();
            }}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrowserStartPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const pins = useStartPinsStore((s) => s.pins);
  const ready = useStartPinsStore((s) => s.ready);
  const init = useStartPinsStore((s) => s.init);
  const unpin = useStartPinsStore((s) => s.unpin);
  const pin = useStartPinsStore((s) => s.pin);
  const update = useStartPinsStore((s) => s.update);
  const restoreDefaults = useStartPinsStore((s) => s.restoreDefaults);
  const [dialog, setDialog] = useState<{ name: string; url: string } | null | "new">(null);

  useEffect(() => {
    void init();
  }, [init]);

  const handleUnpin = async (href: string) => {
    const ok = await osConfirm("Remove this shortcut from the start page?", {
      title: "Unpin shortcut",
      confirmLabel: "Unpin",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (ok) unpin(href);
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto text-slate-200">
      <div className="browser-start-bg pointer-events-none absolute inset-0" aria-hidden>
        <div className="os-wallpaper absolute inset-0 scale-[1.04]" />
        <div className="browser-start-scrim absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-10 sm:px-8">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/90 drop-shadow">
            Requiroom Start
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-4xl">
            Pick a destination
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Pin your own shortcuts, edit or unpin anytime — or type an address above.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {(ready ? pins : []).map((link) => (
            <StartCard
              key={link.href}
              link={link}
              onOpen={onNavigate}
              onUnpin={handleUnpin}
              onEdit={(l) => setDialog({ name: l.label, url: l.href })}
            />
          ))}

          <button
            type="button"
            onClick={() => setDialog("new")}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-slate-950/35 text-slate-300 backdrop-blur-md transition hover:border-sky-400/40 hover:bg-slate-900/45 hover:text-sky-100"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/45">
              <Plus size={22} />
            </span>
            <span className="text-sm font-medium">Add shortcut</span>
          </button>
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-2 text-center">
          <p className="text-xs leading-relaxed text-slate-400/90">
            Sites that block embedding (GitHub, Google, …) open in your system browser instead.
          </p>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const ok = await osConfirm("Restore the default start-page shortcuts?", {
                  title: "Restore defaults",
                  confirmLabel: "Restore",
                  cancelLabel: "Cancel",
                });
                if (ok) restoreDefaults();
              })();
            }}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Restore defaults
          </button>
        </div>
      </div>

      {dialog !== null ? (
        <ShortcutDialog
          initial={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={async (name, url) => {
            const link = await buildStartLink(url, name);
            if (dialog !== "new" && dialog.url) {
              update(dialog.url, link);
            } else {
              pin(link);
            }
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
