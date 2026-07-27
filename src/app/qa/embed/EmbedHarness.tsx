"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "fill" | "vh";

interface Props {
  token: string;
  game: string;
  lang: string;
  nav: number;
  mode: Mode;
  debug: boolean;
}

const TABLES = [
  "TEST-BAC-TABLE-01",
  "TEST-BAC-TABLE-02",
  "BAC-TABLE-01",
  "BAC-TABLE-02",
];

/**
 * The two iframe sizings operators actually ship.
 *
 *   fill — height is the viewport MINUS their nav. Well-behaved: our frame and
 *          the visible area are the same box.
 *   vh   — height is a flat 100vh (or 100dvh) with the nav stacked ABOVE it, so
 *          the frame is taller than the room left for it and its bottom hangs
 *          off the screen. This is the one that breaks us: everything we pin to
 *          the "bottom of the viewport" pins to a bottom nobody can see, and a
 *          layout that sizes itself to `100vh` overflows by exactly the nav's
 *          height. Test here first.
 */
const MODE_HELP: Record<Mode, string> = {
  fill: "iframe = viewport − nav (well-behaved operator)",
  vh: "iframe = 100dvh under the nav (bottom hangs off — the GameSpot case)",
};

interface Probe {
  frameH: number;
  visibleH: number;
  detectedVh: string;
  overflow: number;
  video: number | null;
  road: number | null;
  roadCell: string | null;
  padsBottom: number | null;
  barBottom: number | null;
  screenBottom: number;
}

export default function EmbedHarness({ token, game, lang, nav, mode, debug }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);

  // Build the launch URL. The token only needs to ride the FIRST load — /play
  // hands it into a cookie and redirects it out of the URL.
  const src = token
    ? `/play?token=${encodeURIComponent(token)}&game=${encodeURIComponent(game)}&lang=${encodeURIComponent(lang)}`
    : "";

  /* Same-origin, so we can measure inside the frame and show whether the
     layout actually fits — the whole point of testing on the real device. */
  useEffect(() => {
    if (!debug || !src) return;
    const id = window.setInterval(() => {
      try {
        const f = frameRef.current;
        const d = f?.contentDocument;
        if (!f || !d) return;
        const el = d.querySelector(".player-layout") as HTMLElement | null;
        if (!el) return;
        const frameTop = f.getBoundingClientRect().top;
        const h = (e: Element | null) =>
          e ? Math.round(e.getBoundingClientRect().height) : null;
        const bottomOnScreen = (e: Element | null) =>
          e ? Math.round(frameTop + e.getBoundingClientRect().bottom) : null;
        const kids = [...el.children].filter(
          (c) => c.getBoundingClientRect().height > 0,
        );
        const grid = d.querySelector(".player-layout .grid");
        const pads = [...d.querySelectorAll("[data-bet-code]")];
        const bar = [...d.querySelectorAll("div")].find(
          (x) =>
            getComputedStyle(x).position === "fixed" &&
            getComputedStyle(x).zIndex === "60",
        );
        setProbe({
          frameH: Math.round(f.getBoundingClientRect().height),
          visibleH: el.clientHeight,
          detectedVh: d.documentElement.style.getPropertyValue("--prg-vh") || "—",
          overflow: el.scrollHeight - el.clientHeight,
          video: h(d.querySelector("video")),
          road: h(kids[2] ?? null),
          roadCell: grid
            ? getComputedStyle(grid).gridTemplateRows.split(" ")[0]
            : null,
          padsBottom: bottomOnScreen(pads[pads.length - 1] ?? null),
          barBottom: bottomOnScreen(bar ?? null),
          screenBottom: window.innerHeight,
        });
      } catch {
        /* frame still navigating */
      }
    }, 1200);
    return () => window.clearInterval(id);
  }, [debug, src]);

  if (!src) return <Setup game={game} lang={lang} nav={nav} mode={mode} />;

  const frameHeight = mode === "vh" ? "100dvh" : `calc(100dvh - ${nav}px)`;

  return (
    <div style={{ margin: 0, background: "#111", overflowX: "hidden" }}>
      {/* Fake operator navigation — same height and feel as GameSpot's. */}
      <div
        style={{
          height: nav,
          background: "linear-gradient(#7a5b12,#3a2a08)",
          color: "#f5d67b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 0.5,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        QA OPERATOR NAV · {nav}px · {mode}
      </div>

      <iframe
        ref={frameRef}
        src={src}
        title="Player UI under test"
        allow="autoplay; fullscreen; encrypted-media"
        style={{ display: "block", width: "100%", height: frameHeight, border: 0 }}
      />

      {debug && probe && <Readout probe={probe} />}
    </div>
  );
}

/** Live numbers, on the device, over the frame. `fits` is the one that matters. */
function Readout({ probe }: { probe: Probe }) {
  const fits = probe.overflow <= 0;
  const barOnScreen =
    probe.barBottom !== null && probe.barBottom <= probe.screenBottom + 1;
  const padsClearBar =
    probe.padsBottom !== null &&
    probe.barBottom !== null &&
    probe.padsBottom <= probe.barBottom;
  return (
    <div
      style={{
        position: "fixed",
        left: 6,
        bottom: 6,
        zIndex: 99999,
        padding: "6px 8px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.82)",
        color: "#e5e7eb",
        font: "600 10px/1.45 ui-monospace, monospace",
        pointerEvents: "none",
        maxWidth: "70vw",
      }}
    >
      <div style={{ color: fits ? "#4ade80" : "#f87171" }}>
        {fits ? "FITS" : `OVERFLOW ${probe.overflow}px`}
      </div>
      <div>frame {probe.frameH} · layout {probe.visibleH} · vh {probe.detectedVh}</div>
      <div>video {probe.video ?? "—"} · road {probe.road ?? "—"} · cell {probe.roadCell ?? "—"}</div>
      <div style={{ color: barOnScreen ? "#4ade80" : "#f87171" }}>
        infobar bottom {probe.barBottom ?? "—"} / screen {probe.screenBottom}
      </div>
      <div style={{ color: padsClearBar ? "#4ade80" : "#f87171" }}>
        pads bottom {probe.padsBottom ?? "—"}
      </div>
    </div>
  );
}

/** Shown when no token is in the URL — build one without typing a query string. */
function Setup({ game, lang, nav, mode }: Omit<Props, "token" | "debug">) {
  const [t, setT] = useState("");
  const [g, setG] = useState(game);
  const [n, setN] = useState(String(nav));
  const [m, setM] = useState<Mode>(mode);
  const [dbg, setDbg] = useState(true);

  const go = () => {
    const q = new URLSearchParams({
      token: t.trim(),
      game: g,
      lang,
      nav: String(Number(n) || 0),
      mode: m,
    });
    if (dbg) q.set("debug", "1");
    window.location.href = `/qa/embed?${q.toString()}`;
  };

  const field: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #364153",
    background: "#0e1420",
    color: "#e5e7eb",
    fontSize: 16, // 16px stops iOS Safari zooming the page on focus
    marginBottom: 12,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#030712",
        color: "#e5e7eb",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        QA embed harness
      </h1>
      <p style={{ fontSize: 12, color: "#99a1af", marginBottom: 18, lineHeight: 1.5 }}>
        Runs the player UI inside a fake operator page so mobile layout can be
        tested the way players actually meet it. Staging only.
      </p>

      <label style={{ fontSize: 12, color: "#99a1af" }}>Session token</label>
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={3}
        placeholder="paste the token from mint_test_tokens"
        style={{ ...field, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
      />

      <label style={{ fontSize: 12, color: "#99a1af" }}>Table</label>
      <select value={g} onChange={(e) => setG(e.target.value)} style={field}>
        {TABLES.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>

      <label style={{ fontSize: 12, color: "#99a1af" }}>Operator nav height (px)</label>
      <input
        value={n}
        onChange={(e) => setN(e.target.value)}
        inputMode="numeric"
        style={field}
      />

      <label style={{ fontSize: 12, color: "#99a1af" }}>iframe sizing</label>
      <select value={m} onChange={(e) => setM(e.target.value as Mode)} style={field}>
        <option value="vh">vh — {MODE_HELP.vh}</option>
        <option value="fill">fill — {MODE_HELP.fill}</option>
      </select>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          marginBottom: 18,
        }}
      >
        <input
          type="checkbox"
          checked={dbg}
          onChange={(e) => setDbg(e.target.checked)}
        />
        Show the fit readout
      </label>

      <button
        onClick={go}
        disabled={!t.trim()}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 10,
          border: "none",
          background: t.trim() ? "#2b7fff" : "#1f2937",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Launch
      </button>
    </div>
  );
}
