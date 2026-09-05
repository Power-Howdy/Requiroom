"use client";

export function SearchView({
  query,
  onSearchExternal,
  onGoHome,
}: {
  query: string;
  onSearchExternal: (engine: "duckduckgo" | "google" | "bing") => void;
  onGoHome: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-10 bg-[#0f172a] text-slate-200 text-center">
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold text-white">Search</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Search engines block embedding in other apps, so results open in your system browser.
        </p>
        {query ? (
          <p className="text-base text-slate-100 font-medium break-words pt-1">
            &ldquo;{query}&rdquo;
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-sky-500/90 hover:bg-sky-400 text-slate-950 text-sm font-medium px-4 py-2"
          onClick={() => onSearchExternal("duckduckgo")}
        >
          DuckDuckGo
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 hover:bg-white/15 text-sm px-4 py-2"
          onClick={() => onSearchExternal("google")}
        >
          Google
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 hover:bg-white/15 text-sm px-4 py-2"
          onClick={() => onSearchExternal("bing")}
        >
          Bing
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/5 hover:bg-white/10 text-sm px-4 py-2 text-slate-400"
          onClick={onGoHome}
        >
          Back to Start
        </button>
      </div>
    </div>
  );
}
