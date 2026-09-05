"use client";

import { useEffect, useState } from "react";
import { SPLASH_TIPS } from "@/os/splashTips";

export type SplashPhase = "loading" | "fading" | "done";

export function SplashScreen({ phase }: { phase: SplashPhase }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    if (phase === "done") return;
    const id = window.setInterval(() => {
      setTipVisible(false);
      window.setTimeout(() => {
        setTipIndex((i) => (i + 1) % SPLASH_TIPS.length);
        setTipVisible(true);
      }, 220);
    }, 3200);
    return () => window.clearInterval(id);
  }, [phase]);

  if (phase === "done") return null;

  const tip = SPLASH_TIPS[tipIndex];

  return (
    <div
      className={`os-splash fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 ${
        phase === "fading" ? "os-splash--out" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-busy={phase === "loading"}
    >
      <div className="os-splash-bg" aria-hidden />
      <div className="os-splash-scrim" aria-hidden />
      <div className="os-splash-glow" aria-hidden />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p
          className="os-splash-brand text-5xl sm:text-6xl tracking-tight text-white"
          style={{ fontFamily: "var(--font-outfit), ui-sans-serif, system-ui, sans-serif" }}
        >
          Requiroom
        </p>
        <p className="mt-3 text-sm text-slate-300/90 max-w-sm leading-relaxed">
          Your in-browser desktop — windows, files, shell, and an AI that can drive it.
        </p>

        <div className="os-splash-bar mt-10 w-48" aria-hidden>
          <span className="os-splash-bar-fill" />
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Preparing workspace
        </p>

        <div
          className={`mt-12 min-h-[5.5rem] w-full transition-opacity duration-200 ${
            tipVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--os-primary)]">
            Tip
          </p>
          <p className="mt-2 text-base font-medium text-slate-100">{tip.title}</p>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{tip.body}</p>
        </div>
      </div>
    </div>
  );
}
