"use client";

import { useT } from "@/lib/i18n";
import { useFeatures } from "@/lib/use-features";

/**
 * Circular shortcut icons over the top-right of the video (desktop).
 *
 * Everything here already existed inside the hamburger; this only surfaces the
 * things players reach for mid-hand — payouts, history, sound, chat — so they
 * are one click away instead of two, matching how Evolution presents them.
 *
 * These do NOT duplicate any logic: each button just asks PlayerMenu to open at
 * a given view (`prg:open-menu`), so the panels stay in one place and can't
 * drift apart.
 *
 * Desktop only. On a phone this corner is where the countdown and the dealer
 * are, and five more tap targets over a small video would be worse than the
 * menu they replace.
 */

type MenuView = "howto" | "payouts" | "sound" | "history";

function openMenu(view: MenuView) {
  window.dispatchEvent(new CustomEvent("prg:open-menu", { detail: view }));
}

const ICON_SIZE = 15;

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Dark and translucent so it reads over bright felt as well as a dark
        // studio, without a hard chip that fights the video.
        background: "rgba(3,7,18,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "rgba(255,255,255,0.85)",
        cursor: "pointer",
        padding: 0,
        transition: "background 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(240,177,0,0.22)";
        e.currentTarget.style.color = "#f0b100";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(3,7,18,0.55)";
        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
      }}
    >
      {children}
    </button>
  );
}

const svgProps = {
  width: ICON_SIZE,
  height: ICON_SIZE,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function VideoQuickIcons() {
  const t = useT();
  const { live_chat_enabled: liveChatEnabled } = useFeatures();

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <IconButton label={t("menu.payouts")} onClick={() => openMenu("payouts")}>
        <svg {...svgProps}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </IconButton>

      <IconButton label={t("menu.history")} onClick={() => openMenu("history")}>
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </IconButton>

      <IconButton label={t("menu.howToPlay")} onClick={() => openMenu("howto")}>
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.3" />
          <line x1="12" y1="17" x2="12" y2="17.01" />
        </svg>
      </IconButton>

      <IconButton label={t("menu.soundVideo")} onClick={() => openMenu("sound")}>
        <svg {...svgProps}>
          <path d="M11 5 6 9H3v6h3l5 4z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M19 6.5a8 8 0 0 1 0 11" />
        </svg>
      </IconButton>

      {liveChatEnabled && (
        <IconButton
          label={t("chat.title")}
          onClick={() => window.dispatchEvent(new CustomEvent("prg:toggle-chat"))}
        >
          <svg {...svgProps}>
            <path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </IconButton>
      )}
    </div>
  );
}
