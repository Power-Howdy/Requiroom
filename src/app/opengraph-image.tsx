import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #0b1220 0%, #132337 42%, #0f766e 100%)",
          color: "#f1f5f9",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            letterSpacing: "4px",
            textTransform: "uppercase",
            opacity: 0.85,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              background: "#5eead4",
              boxShadow: "0 0 24px rgba(94, 234, 212, 0.55)",
            }}
          />
          <span>Open source · In-browser OS</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            {siteConfig.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              lineHeight: 1.35,
              maxWidth: 900,
              color: "#cbd5e1",
              fontWeight: 500,
            }}
          >
            {siteConfig.tagline}. Browser, files, shell, and AI — in one room.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            fontSize: 24,
            color: "#94a3b8",
          }}
        >
          <span>Browser · Files · Terminal · Assistant</span>
          <span style={{ color: "#5eead4", fontWeight: 600 }}>requiroom.vercel.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
