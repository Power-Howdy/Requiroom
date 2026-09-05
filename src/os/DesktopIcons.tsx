"use client";

import { GithubIcon } from "./GithubIcon";
import { APP_META, useWindowStore, type AppId } from "@/store/windowStore";
import { AppIcon } from "./AppIcon";
import { openGithubInBrowser } from "./openGithub";
import { siteConfig } from "@/lib/site";

const DESKTOP_ICONS: AppId[] = [
  "browser",
  "files",
  "shell",
  "editor",
  "notes",
  "excel",
  "settings",
  "assistant",
];

export function DesktopIcons() {
  const openApp = useWindowStore((s) => s.openApp);

  return (
    <div className="absolute top-3 left-3 z-[1] flex flex-col gap-1 max-h-[calc(100%-var(--os-taskbar-h)-24px)] overflow-y-auto pr-1">
      {DESKTOP_ICONS.map((id) => (
        <button
          key={id}
          type="button"
          className="os-desktop-icon flex flex-col items-center gap-0.5 w-[72px] p-1.5 rounded-lg"
          onDoubleClick={() => openApp(id)}
          onClick={() => openApp(id)}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `${APP_META[id].color}33`,
              color: APP_META[id].color,
            }}
          >
            <AppIcon appId={id} size={20} />
          </span>
          <span className="text-[11px] leading-tight text-center text-white drop-shadow-md">
            {APP_META[id].title}
          </span>
        </button>
      ))}

      <button
        type="button"
        className="os-desktop-icon flex flex-col items-center gap-0.5 w-[72px] p-1.5 rounded-lg"
        title={siteConfig.githubUrl}
        onDoubleClick={openGithubInBrowser}
        onClick={openGithubInBrowser}
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "#24292f55", color: "#e6edf3" }}
        >
          <GithubIcon size={20} />
        </span>
        <span className="text-[11px] leading-tight text-center text-white drop-shadow-md">
          GitHub
        </span>
      </button>
    </div>
  );
}
