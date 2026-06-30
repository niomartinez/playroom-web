"use client";

/**
 * Studio Guide — sectioned, keyword-searchable, deep-linkable.
 *
 * Confluence-style replacement for the old UserManualDialog modal:
 *   - Sticky sidebar TOC + search box (matches section titles AND a
 *     per-section keyword list, so "black video" finds Troubleshooting).
 *   - Every section has a hash anchor (#streaming-setup, #video-delay, …)
 *     with a copy-link button, so a URL can be sent straight to a section.
 *   - The Streaming Setup section embeds the OBS publish credentials,
 *     hidden by default: reveal requires the dealer's password (re-auth
 *     against the backend), shows copy buttons, and auto-hides after 90s.
 *
 * Content is audited against the actual studio code — if behavior
 * changes (betting windows, dealing flow, OBS settings), update here.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Table of contents + search keywords                                 */
/* ------------------------------------------------------------------ */

interface TocItem {
  id: string;
  num: number;
  title: string;
  keywords: string[];
}

const TOC: TocItem[] = [
  { id: "setup", num: 1, title: "Setup (Per Shift)", keywords: ["login", "chrome", "shoe", "serial", "connect", "dealer name", "settings", "start of day", "per shift"] },
  { id: "streaming-setup", num: 2, title: "Streaming Setup (OBS)", keywords: ["obs", "whip", "rtmp", "bearer", "token", "stream key", "bitrate", "keyframe", "b-frames", "bframes", "credentials", "password", "audio", "camera", "publish"] },
  { id: "dealing", num: 3, title: "Dealing a Round", keywords: ["new round", "deal", "cards", "no more bets", "countdown", "confirm", "settle", "verification", "misread", "third card"] },
  { id: "table-controls", num: 4, title: "Table Controls", keywords: ["pause", "resume", "close table", "break", "shift"] },
  { id: "betting-window", num: 5, title: "Betting Window", keywords: ["betting time", "countdown", "duration", "10", "16", "20", "25", "30", "seconds"] },
  { id: "video-delay", num: 6, title: "Video Delay (Card Sync)", keywords: ["sync", "delay", "latency", "calibration", "1100", "cards early", "cards late", "video"] },
  { id: "manual-input", num: 7, title: "Manual Input (Fallback)", keywords: ["manual", "fallback", "shoe broken", "card picker", "override"] },
  { id: "emulator", num: 8, title: "Testing with Emulator", keywords: ["emulator", "test", "no hardware", "demo", "fake cards"] },
  { id: "accuracy-testing", num: 9, title: "Accuracy Testing", keywords: ["test", "testing", "accuracy", "qa", "verify", "scenario", "demo", "play money", "payout", "settlement", "commission", "checklist", "sign off", "go live", "TEST table"] },
  { id: "shift-change", num: 10, title: "Shift Change & Accounts", keywords: ["shift", "handover", "dealer change", "logout", "log out", "pause", "password", "change password", "reset password", "account", "forgot"] },
  { id: "troubleshooting", num: 11, title: "Troubleshooting", keywords: ["black video", "disconnected", "wrong card", "browser not supported", "lag", "frozen", "not working", "broken", "issue", "problem"] },
  { id: "emergency", num: 12, title: "Emergency Procedures", keywords: ["power outage", "internet down", "disconnect", "failure", "emergency", "outage"] },
];

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                   */
/* ------------------------------------------------------------------ */

const GOLD = "#d08700";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80 shrink-0"
      style={{ backgroundColor: "rgba(208,135,0,0.15)", color: GOLD, border: "1px solid rgba(208,135,0,0.3)" }}
      aria-label={label ?? "Copy"}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#05df72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Section({ item, children }: { item: TocItem; children: React.ReactNode }) {
  const [linkCopied, setLinkCopied] = useState(false);
  return (
    <section id={item.id} className="mb-12" style={{ scrollMarginTop: 80 }}>
      <div className="group flex items-center gap-3 mb-4">
        <h2 className="font-bold text-white" style={{ fontSize: 20 }}>
          <span style={{ color: GOLD }}>{item.num}.</span> {item.title}
        </h2>
        <button
          onClick={() => {
            const url = `${window.location.origin}/studio/guide#${item.id}`;
            void navigator.clipboard.writeText(url).then(() => {
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 1500);
            });
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px]"
          style={{ color: linkCopied ? "#05df72" : "#6a7282" }}
          aria-label={`Copy link to ${item.title}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {linkCopied ? "Link copied" : "Copy link"}
        </button>
      </div>
      <div className="h-[2px] w-16 rounded-full mb-5" style={{ backgroundColor: "rgba(208,135,0,0.5)" }} />
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Credentials panel — hidden by default, password re-auth to reveal   */
/* ------------------------------------------------------------------ */

interface TableCreds {
  path: string;
  whip_url: string;
  whip_bearer: string;
  rtmp_url: string;
  rtmp_key: string;
}

const AUTO_HIDE_SECONDS = 90;

function CredentialsPanel() {
  const [mode, setMode] = useState<"hidden" | "prompt" | "loading" | "revealed">("hidden");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableCreds[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTables([]);
    setPassword("");
    setMode("hidden");
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const reveal = async () => {
    if (!password) return;
    setMode("loading");
    setError(null);
    try {
      const res = await fetch("/api/studio/stream-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || String(data.error_code ?? "0") !== "0") {
        setError(data.message || "Could not reveal credentials.");
        setMode("prompt");
        return;
      }
      setTables(data.data?.tables ?? []);
      setPassword("");
      setMode("revealed");
      setSecondsLeft(AUTO_HIDE_SECONDS);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { hide(); return AUTO_HIDE_SECONDS; }
          return s - 1;
        });
      }, 1000);
    } catch {
      setError("Network error — try again.");
      setMode("prompt");
    }
  };

  return (
    <div
      className="rounded-xl p-4 my-4"
      style={{ backgroundColor: "rgba(208,135,0,0.06)", border: "1px solid rgba(208,135,0,0.25)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Publish Credentials
          </div>
          <div className="text-xs mt-1" style={{ color: "#99a1af" }}>
            Server URLs, bearer tokens and stream keys for OBS. Requires your studio password to view.
          </div>
        </div>

        {mode === "hidden" && (
          <button
            onClick={() => setMode("prompt")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80 shrink-0"
            style={{ backgroundColor: "rgba(208,135,0,0.2)", color: GOLD, border: "1px solid rgba(208,135,0,0.4)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            Reveal
          </button>
        )}
        {mode === "revealed" && (
          <button
            onClick={hide}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80 shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#99a1af", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            Hide ({secondsLeft}s)
          </button>
        )}
      </div>

      {(mode === "prompt" || mode === "loading") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void reveal();
          }}
          className="mt-4 flex items-center gap-2 flex-wrap"
        >
          {/* Hidden username target: gives the browser's password manager a field to
              pair with the password, so it stops hijacking the sidebar search box. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            readOnly
            value="studio"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
          <input
            type="password"
            name="studio-password"
            id="studio-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your studio password"
            autoFocus
            className="rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(208,135,0,0.3)", minWidth: 220 }}
          />
          <button
            type="submit"
            disabled={mode === "loading" || !password}
            className="rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: GOLD, color: "#000" }}
          >
            {mode === "loading" ? "Checking…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={hide}
            className="rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ color: "#6a7282" }}
          >
            Cancel
          </button>
          {error && <div className="w-full text-xs" style={{ color: "#fb8080" }}>{error}</div>}
        </form>
      )}

      {mode === "revealed" && (
        <div className="mt-4 space-y-4">
          {tables.map((t) => (
            <div key={t.path} className="rounded-lg p-3" style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: GOLD }}>
                {t.path === "studio1" ? "Baccarat Table 1" : "Baccarat Table 2"} — {t.path}
              </div>
              {[
                { label: "WHIP Server (preferred — carries audio)", value: t.whip_url },
                { label: "WHIP Bearer Token", value: t.whip_bearer },
                { label: "RTMP Server (fallback — no audio for players)", value: t.rtmp_url },
                { label: "RTMP Stream Key", value: t.rtmp_key },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-[11px] w-56 shrink-0" style={{ color: "#99a1af" }}>{row.label}</div>
                  <code className="text-[12px] flex-1 break-all" style={{ color: "#f0b100" }}>{row.value}</code>
                  <CopyButton text={row.value} label={`Copy ${row.label}`} />
                </div>
              ))}
            </div>
          ))}
          <div className="text-[11px]" style={{ color: "#6a7282" }}>
            Auto-hides in {secondsLeft}s. Don&apos;t paste these into chat or email — OBS only.
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function GuideContent() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOC.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  const goTo = useCallback((id: string) => {
    setQuery("");
    setActiveId(id);
    history.replaceState(null, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Deep link: scroll to the hash section on load (#streaming-setup etc.)
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) {
      setActiveId(id);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to right, #000000, #171717, #000000)" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <h1 className="font-bold text-white" style={{ fontSize: 17 }}>Studio Guide</h1>
          <span className="text-xs" style={{ color: "#6a7282" }}>Play Room Gaming</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(208,135,0,0.15)", color: GOLD, border: "1px solid rgba(208,135,0,0.3)" }}
          >
            Print / PDF
          </button>
          <a
            href="/studio"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#d1d5db", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            ← Back to Studio
          </a>
        </div>
      </header>

      <div className="mx-auto flex gap-8 px-6 py-6" style={{ maxWidth: 1100 }}>
        {/* Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky" style={{ top: 70 }}>
            <div className="relative mb-3">
              <input
                type="search"
                name="guide-search"
                id="guide-search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the guide…"
                className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(208,135,0,0.25)" }}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6a7282" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {results.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-30"
                  style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.3)", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}
                >
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => goTo(r.id)}
                      className="block w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{ color: "#d1d5db" }}
                    >
                      <span style={{ color: GOLD }}>{r.num}.</span> {r.title}
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg px-3 py-2 text-xs z-30" style={{ backgroundColor: "#171717", border: "1px solid rgba(255,255,255,0.1)", color: "#6a7282" }}>
                  No matches — try &quot;black video&quot;, &quot;obs&quot;, &quot;sync&quot;…
                </div>
              )}
            </div>

            <nav className="space-y-0.5">
              {TOC.map((item) => (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  className="block w-full text-left rounded px-3 py-1.5 text-[13px] transition-colors hover:bg-white/5"
                  style={{
                    color: activeId === item.id ? GOLD : "#99a1af",
                    backgroundColor: activeId === item.id ? "rgba(208,135,0,0.1)" : undefined,
                  }}
                >
                  <span className="opacity-60">{item.num}.</span> {item.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 guide-content" style={{ color: "#d1d5db" }}>
          <style>{`
            .guide-content p { font-size: 14px; line-height: 1.7; margin: 0 0 12px; }
            .guide-content ul, .guide-content ol { font-size: 14px; line-height: 1.7; margin: 0 0 12px; padding-left: 20px; }
            .guide-content li { margin: 4px 0; }
            .guide-content code { background: rgba(208,135,0,0.1); color: #f0b100; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
            .guide-content .step { display: flex; gap: 12px; margin: 8px 0; }
            .guide-content .step-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; background: rgba(208,135,0,0.2); color: #d08700; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
            .guide-content .step-text { font-size: 14px; line-height: 1.6; padding-top: 2px; }
            .guide-content .warn { background: rgba(251,44,54,0.1); border: 1px solid rgba(251,44,54,0.3); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #fb8080; margin: 12px 0; }
            .guide-content .info { background: rgba(5,223,114,0.08); border: 1px solid rgba(5,223,114,0.2); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #7ddfb0; margin: 12px 0; }
            .guide-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
            .guide-content th { text-align: left; color: #d08700; padding: 8px; border-bottom: 1px solid rgba(208,135,0,0.2); font-weight: 600; }
            .guide-content td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            @media print {
              .guide-content { color: #222 !important; }
              aside, header { display: none !important; }
            }
          `}</style>

          <Section item={TOC[0]}>
            <div className="step"><span className="step-num">1</span><span className="step-text">Open <strong>Chrome</strong> on the Studio PC</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text">Navigate to the Studio URL and <strong>log in</strong> with your dealer credentials</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Open <strong>Settings</strong> (gear icon, top-right) — set your <strong>dealer name</strong> and select the <strong>table</strong></span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text">In Settings, scroll to <strong>Angel Eye Shoe</strong> — click <strong>&quot;Connect Shoe&quot;</strong> and select the serial port</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text">Click <strong>Save</strong> — your name will appear in the player UI</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text">Open <strong>OBS Studio</strong> and start the camera stream — see <strong>Section 2</strong> for exact settings</span></div>
            <div className="info">You only need to grant serial port permission once per session. If Chrome asks &quot;Allow this site to access a serial port?&quot; — click Allow. Chrome or Edge only (Web Serial is not in Safari/Firefox).</div>
          </Section>

          <Section item={TOC[1]}>
            <p>OBS pushes the table camera to our streaming server. Use <strong>WHIP</strong> — it carries your microphone audio to players. RTMP is the fallback if your network blocks WHIP (players then get video only).</p>

            <div className="step"><span className="step-num">1</span><span className="step-text">OBS → Settings → Stream → Service: <strong>WHIP</strong></span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text">Server + Bearer Token: copy from the <strong>Publish Credentials</strong> panel below (Table 1 = studio1, Table 2 = studio2)</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Settings → Output (Advanced): Rate Control <strong>CBR</strong>, Bitrate <strong>6000 Kbps</strong>, Keyframe Interval <strong>2s</strong>, <strong>B Frames: 0</strong> (x264: add <code>bframes=0</code> in the options field)</span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text">Settings → Video: 1920×1080, 30 FPS</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text">Click <strong>Start Streaming</strong> — the indicator turns green within ~3s</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text">Verify on a player page — video appears within ~5 seconds</span></div>

            <CredentialsPanel />

            <div className="warn"><strong>B-frames MUST be 0</strong> — otherwise players see black video with no error anywhere. This is the #1 streaming mistake.</div>
            <div className="info">RTMP fallback: if OBS can&apos;t connect via WHIP, switch Service to <strong>Custom</strong> and use the RTMP Server + Stream Key from the credentials panel (&quot;Use authentication&quot; unchecked). Players get no dealer audio on RTMP — tell Nio so we can fix the network.</div>
          </Section>

          <Section item={TOC[2]}>
            <div className="step"><span className="step-num">1</span><span className="step-text">Click <strong>&quot;NEW ROUND&quot;</strong> — betting opens, players see countdown timer</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text"><strong>Wait for countdown</strong> — DO NOT deal cards yet. Players are placing bets.</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Countdown hits 0 — <strong>&quot;NO MORE BETS&quot;</strong> appears. Bets are locked, and the <strong>card verification screen</strong> opens automatically.</span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text"><strong>Deal cards through the shoe</strong> — Player 1, Banker 1, Player 2, Banker 2, then third cards if rules require. Each card appears on the verification screen as the shoe reads it — and on player screens, timed to match the live video.</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text"><strong>Check the cards on screen against the table.</strong> Misread? Tap the wrong slot and pick the correct card — player screens update too.</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text">Click <strong>&quot;Confirm &amp; Settle&quot;</strong> — result is recorded, bets settle, roads update</span></div>
            <div className="step"><span className="step-num">7</span><span className="step-text">Click <strong>&quot;NEW ROUND&quot;</strong> again for the next round</span></div>
          </Section>

          <Section item={TOC[3]}>
            <table>
              <thead><tr><th>Button</th><th>When to Use</th><th>What Happens</th></tr></thead>
              <tbody>
                <tr><td><strong>NEW ROUND</strong></td><td>Start a new round</td><td>Opens betting, starts countdown</td></tr>
                <tr><td><strong>PAUSE TABLE</strong></td><td>Break, shift change</td><td>No new rounds. Current round finishes.</td></tr>
                <tr><td><strong>RESUME TABLE</strong></td><td>After pause</td><td>Table active again</td></tr>
                <tr><td><strong>CLOSE TABLE</strong></td><td>End of session</td><td>Players see &quot;Table Closed&quot;</td></tr>
              </tbody>
            </table>
          </Section>

          <Section item={TOC[4]}>
            <p>The betting window duration is configurable (10s, 16s, 20s, 25s, 30s — default 16s). Use the buttons at the bottom of the Round Controls panel. Takes effect on the next round.</p>
          </Section>

          <Section item={TOC[5]}>
            <p>Cards and results are delayed by the table&apos;s <strong>Video Delay</strong> so they appear on player screens at the same moment the action shows on the video stream (the video takes ~1–2 seconds to reach viewers; card data would otherwise arrive first).</p>
            <ol>
              <li>Settings (gear icon, top-right) → <strong>Video Delay (ms)</strong>, directly under the Dealer Name field — preset to <strong>1100</strong>, usually close. Select a table first or the field is disabled.</li>
              <li>To fine-tune: watch a player screen next to the table while dealing — if the card flips on screen <strong>before</strong> it shows on video, increase the value; if <strong>after</strong>, decrease</li>
              <li>Click Apply — takes effect immediately, no refresh needed</li>
            </ol>
          </Section>

          <Section item={TOC[6]}>
            <p>If the Angel Eye shoe malfunctions or a card isn&apos;t read correctly:</p>
            <ol>
              <li>Click the <strong>&quot;Manual Input&quot;</strong> button (bottom-right)</li>
              <li>Select cards manually using the card picker</li>
              <li>The system enforces baccarat third-card rules</li>
              <li>Submit to record the round</li>
            </ol>
            <div className="warn">Manual input should only be used when the shoe fails. Normal dealing should always go through the shoe.</div>
          </Section>

          <Section item={TOC[7]}>
            <p>When no physical shoe is available, use the Emulator page:</p>
            <ol>
              <li>Open <code>/emulator</code> in a separate tab</li>
              <li>Studio: click <strong>New Round</strong> — betting opens</li>
              <li>Player: places bets during countdown</li>
              <li>Emulator: click <strong>&quot;Deal Cards&quot;</strong> — cards dealt for the active round</li>
              <li>Result auto-settles, all clients return to waiting</li>
            </ol>
          </Section>

          <Section item={TOC[8]}>
            <p>Run this before going live — or after any change to a table, the shoe, or the stream — to confirm a table <strong>deals, settles, and stays in sync</strong> correctly. It uses play money on a TEST table, so nothing here can reach a real player or real funds.</p>

            <div className="info"><strong>Where to run it.</strong> Studio: open <code>/studio</code> and select a <strong>TEST-</strong> table (never a live one). Players: open <code>/play/demo</code> in another tab — it only ever lists TEST- tables, starts with a <strong>10,000</strong> play-money balance, and connects read-only, so a demo bet can never reach a real table. Works on staging <em>and</em> production. No TEST table yet? Create one in Studio Settings, or use the <a href="#emulator" style={{ color: GOLD }}>Emulator</a>.</div>

            <p><strong>How:</strong> run a normal round (see <a href="#dealing" style={{ color: GOLD }}>Dealing a Round</a>), place a demo bet each time, then check the result and payout against the table below. To force an exact result, enter the cards by hand with <a href="#manual-input" style={{ color: GOLD }}>Manual Input</a>.</p>

            <table>
              <thead><tr><th>Bet (demo)</th><th>Force this result</th><th>Expect after Confirm &amp; Settle</th></tr></thead>
              <tbody>
                <tr><td>100 on PLAYER</td><td>Player wins</td><td>Returns 200 — net <strong>+100</strong> (pays 1:1)</td></tr>
                <tr><td>100 on BANKER</td><td>Banker wins</td><td>Returns 195 — net <strong>+95</strong> (1:1 minus 5% commission)</td></tr>
                <tr><td>100 on TIE</td><td>Tie</td><td>Returns 900 — net <strong>+800</strong> (pays 8:1)</td></tr>
                <tr><td>100 on PLAYER</td><td>Tie</td><td><strong>Push</strong> — stake refunded, net 0 (Player/Banker bets tie back)</td></tr>
                <tr><td>100 on PLAYER</td><td>Banker wins</td><td>Loss — chips clear, no win flash, net <strong>−100</strong></td></tr>
                <tr><td>100 on PLAYER PAIR</td><td>Deal Player a pair</td><td>Pays <strong>11:1</strong> (Perfect Pair 25:1, Either Pair 5:1)</td></tr>
                <tr><td>PLAYER then BANKER, same round</td><td>—</td><td>Second bet <strong>rejected</strong> — you can&apos;t back both sides</td></tr>
              </tbody>
            </table>

            <p><strong>Rules are enforced for you.</strong> The third-card rules run automatically. To prove it, open Manual Input, give the Banker a two-card total of <strong>7</strong>, and try to add a third Banker card — the system refuses it (a 7 always stands).</p>

            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Card accuracy</strong> — every card on screen matches the physical card, in deal order (Player 1, Banker 1, Player 2, Banker 2…).</span></div>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Stream sync</strong> — cards appear on the player at the same moment as the video. Off? Calibrate <a href="#video-delay" style={{ color: GOLD }}>Video Delay</a>.</span></div>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>10 rounds back-to-back</strong> without reloading — every result, payout, and the roadmap advance correctly, with no red errors in the browser console (F12).</span></div>

            <div className="warn">Confirm the live <strong>payout odds</strong> in the Admin panel before trusting the numbers above — they are the standard defaults but are configurable per table.</div>
          </Section>

          <Section item={TOC[9]}>
            <ol>
              <li>Current dealer: Click <strong>PAUSE TABLE</strong> (wait for current round to finish)</li>
              <li>Current dealer: <strong>Log out</strong> (door icon, top-right of the studio header)</li>
              <li>New dealer: Log in → Connect Shoe → RESUME TABLE</li>
              <li>Click <strong>NEW ROUND</strong> to begin</li>
            </ol>
            <p><strong>Accounts:</strong> one account per table (<code>dealer.table1</code>, <code>dealer.table2</code>) — set the on-screen dealer name in Settings, no separate account needed per person. Usernames are not case-sensitive.</p>
            <p><strong>Passwords:</strong> change your own under Settings → <strong>Account</strong> (needs your current password). Forgot it? The supervisor logs in as <code>SuperAdmin</code> and resets it from the same Account section.</p>
          </Section>

          <Section item={TOC[10]}>
            <table>
              <thead><tr><th>Issue</th><th>Solution</th></tr></thead>
              <tbody>
                <tr><td>Shoe shows &quot;Disconnected&quot;</td><td>Check USB cable. Click &quot;Connect Shoe&quot; and re-select port. Try different USB port.</td></tr>
                <tr><td>Wrong card read</td><td>Re-slide card. If persistent, tap the slot on the verification screen to correct it, or use Manual Input for that round.</td></tr>
                <tr><td>&quot;Browser Not Supported&quot;</td><td>Use Chrome or Edge (not Safari/Firefox). Must be HTTPS.</td></tr>
                <tr><td>Players report BLACK video</td><td>OBS B-frames must be 0 — see <a href="#streaming-setup" style={{ color: GOLD }}>Section 2</a>. Apply, Stop Streaming, Start Streaming.</td></tr>
                <tr><td>Cards on player screens out of sync with video</td><td>Settings → Video Delay (ms) — see <a href="#video-delay" style={{ color: GOLD }}>Section 6</a>.</td></tr>
                <tr><td>Video stream lag</td><td>Check upload bandwidth (need 15+ Mbps). Lower bitrate in OBS (6000 → 4000 Kbps).</td></tr>
                <tr><td>Page frozen</td><td>Refresh (F5). Reconnect shoe. In-progress round is preserved on server.</td></tr>
              </tbody>
            </table>
          </Section>

          <Section item={TOC[11]}>
            <p><strong>Power outage:</strong> All bets preserved in database. Log back in, reconnect shoe, resume table.</p>
            <p><strong>Internet disconnection:</strong> Players auto-reconnect. Video resumes. No bets lost.</p>
            <p><strong>Angel Eye failure:</strong> Switch to Manual Input for remaining rounds. Contact hardware support.</p>
          </Section>
        </main>
      </div>
    </div>
  );
}
