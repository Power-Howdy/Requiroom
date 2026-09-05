"use client";

export function FrameBlockedView({
  url,
  onOpenExternal,
  onGoHome,
}: {
  url: string;
  onOpenExternal: () => void;
  onGoHome: () => void;
}) {
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep raw */
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-10 bg-[#0f172a] text-slate-200 text-center">
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-white">Can&apos;t embed this site</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          <span className="text-slate-300">{host}</span> (including Google, GitHub, and similar
          sites) blocks embedding via X-Frame-Options / CSP, so it can&apos;t render in this frame.
          We open it in your system browser instead — use the button below if a pop-up was blocked.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-500/90 hover:bg-sky-400 text-slate-950 text-sm font-medium px-4 py-2"
          onClick={onOpenExternal}
        >
          Open in system browser
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 hover:bg-white/15 text-sm px-4 py-2"
          onClick={onGoHome}
        >
          Back to Start
        </button>
      </div>
      <p className="text-xs text-slate-500 max-w-sm break-all">{url}</p>
    </div>
  );
}
