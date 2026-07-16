"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GameProvider } from "@/lib/game-context";
import { useLobbyWs } from "@/lib/use-lobby-ws";
import { useBalanceWs } from "@/lib/use-balance-ws";
import { useStateRecovery } from "@/lib/use-state-recovery";
import { useIdleKick } from "@/lib/use-idle-kick";
import { sendToParent, onParentMessage } from "@/lib/iframe-bridge";
import UsernameModal from "@/components/player/UsernameModal";

/* ------------------------------------------------------------------ */
/*  Username gate                                                      */
/*                                                                     */
/*  On mount (authenticated, non-demo) we fetch /api/me/profile. If    */
/*  the player has never chosen a name (display_name_set === false) we */
/*  render a BLOCKING UsernameModal as a hard gate in front of the     */
/*  game/PlayerLayout. If the profile fetch fails (or times out) we    */
/*  fail OPEN to the game with the auto name — never deadlock.         */
/* ------------------------------------------------------------------ */

interface MeProfile {
  display_name?: string;
  display_name_set?: boolean;
  balance?: number;
  currency_code?: string;
}

function UsernameGate({ children }: { children: ReactNode }) {
  // "loading" while the profile fetch is in flight; "gated" holds the
  // game behind the blocking modal; "open" lets the game render.
  const [status, setStatus] = useState<"loading" | "gated" | "open">("loading");
  const [autoName, setAutoName] = useState("");
  // Non-blocking "change name" dialog toggle (reuses the same modal).
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // Safety valve: if the backend hangs, fail open rather than trap the
    // player on a loader forever.
    const timeout = setTimeout(() => controller.abort(), 6000);

    (async () => {
      try {
        const res = await fetch("/api/me/profile", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          setStatus("open"); // fail-open
          return;
        }
        // Backend wraps payloads in BaseResponse: { error_code, message, data }.
        const json = (await res.json().catch(() => ({}))) as {
          error_code?: string;
          data?: MeProfile;
        };
        const profile = json.data ?? ({} as MeProfile);
        setAutoName(profile.display_name ?? "");
        // Only gate when the backend explicitly says the name isn't chosen yet.
        setStatus(profile.display_name_set === false ? "gated" : "open");
      } catch {
        setStatus("open"); // fail-open (network error / timeout / abort)
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // Hide the floating "change name" affordance while the mobile chat sheet is
  // open so it never overlaps the chat input. MobileChat broadcasts its open
  // state via a window event (decoupled — no shared context needed).
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setChatOpen(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("prg:chat-open", handler as EventListener);
    return () => window.removeEventListener("prg:chat-open", handler as EventListener);
  }, []);

  if (status === "loading") {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "#0a0f1a" }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid #364153",
            borderTopColor: "#f0b100",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "gated") {
    return (
      <UsernameModal
        blocking
        initialName={autoName}
        onSuccess={(name) => {
          setAutoName(name);
          setStatus("open");
        }}
      />
    );
  }

  // status === "open": game renders. A small, self-contained "change name"
  // affordance re-opens the modal in NON-blocking mode.
  //
  // FOLLOW-UP: the primary affordance should live in PlayerHeader (owned by
  // the other FE agent). Wire it to render <UsernameModal blocking={false}
  // initialName={currentName} .../> — the modal is already exported and
  // reusable. This floating control is the interim placeholder.
  return (
    <>
      {children}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChanging(true)}
          // i18n follow-up: translate "Change name"
          style={{
            position: "fixed",
            left: 10,
            bottom: 10,
            zIndex: 900,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "#99a1af",
            background: "rgba(16,24,40,0.85)",
            border: "1px solid #364153",
            borderRadius: 8,
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          Change name
        </button>
      )}
      {changing && (
        <UsernameModal
          blocking={false}
          initialName={autoName}
          onSuccess={(name) => {
            setAutoName(name);
            setChanging(false);
          }}
          onClose={() => setChanging(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner component that activates WebSocket hooks inside GameProvider */
/* ------------------------------------------------------------------ */

function GameConnections({ children }: { children: ReactNode }) {
  useLobbyWs();
  useBalanceWs();
  // One-shot fetch on mount: rehydrates round state + this player's
  // placed bets if they refresh during a live round.
  useStateRecovery();
  // Kick back to operator's lobby after 3 consecutive idle rounds.
  useIdleKick();

  /* Send gameReady on mount, listen for parent commands */
  useEffect(() => {
    sendToParent("gameReady");

    const unsub = onParentMessage((event) => {
      if (event === "closeGame") {
        // Operator requested close — could navigate away
        window.close();
      }
    });

    return unsub;
  }, []);

  return <UsernameGate>{children}</UsernameGate>;
}

/* ------------------------------------------------------------------ */
/*  Wrapper that sets up context + connections                         */
/* ------------------------------------------------------------------ */

interface GameWrapperProps {
  token: string | null;
  gameId: string | null;
  lang: string;
  lobbyUrl: string | null;
  cashierUrl: string | null;
  children: ReactNode;
}

export default function GameWrapper({
  token,
  gameId,
  lang,
  lobbyUrl,
  cashierUrl,
  children,
}: GameWrapperProps) {
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0a0f1a" }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Session Required</div>
          <div className="text-[#6a7282] mb-4">
            No session token provided. Please launch the game from your operator lobby.
          </div>
          <a href="/play/demo" className="px-6 py-2 rounded-lg font-semibold text-black" style={{ backgroundColor: "#f0b100" }}>
            Try Demo Mode
          </a>
        </div>
      </div>
    );
  }

  return (
    <GameProvider
      token={token}
      gameId={gameId}
      lang={lang}
      lobbyUrl={lobbyUrl}
      cashierUrl={cashierUrl}
    >
      <GameConnections>{children}</GameConnections>
    </GameProvider>
  );
}
