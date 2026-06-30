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
/*  Environment-aware links                                             */
/* ------------------------------------------------------------------ */

/** Link to a page in THIS app. The relative href resolves to the current
 *  origin, so it points at staging when viewed on staging and at prod
 *  when viewed on prod — no hardcoded host. */
function AppLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a href={path} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>
      {children}
    </a>
  );
}

/** Link to the backend API host, derived from the current host
 *  (app.* → api.*, staging-app.* → staging-api.*). Computed on the
 *  client; falls back to the relative path until mounted. */
function ApiLink({ path, children }: { path: string; children: React.ReactNode }) {
  const [href, setHref] = useState(path);
  useEffect(() => {
    try {
      const { protocol, host } = window.location;
      setHref(`${protocol}//${host.replace("app.", "api.")}${path}`);
    } catch {
      /* keep relative fallback */
    }
  }, [path]);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Accuracy sign-off — interactive, persisted to this browser          */
/* ------------------------------------------------------------------ */

const SIGNOFF_CASES = [
  "TC-01 Player win",
  "TC-02 Banker win + commission",
  "TC-03 Tie",
  "TC-04 Push on tie",
  "TC-05 Player draws 3rd",
  "TC-06 Banker-7 invalid-draw block",
  "TC-07 Side bet (pair)",
  "TC-08 Loss path",
  "TC-09 Opposing-bet block",
  "TC-10 Mis-read correction",
  "10-round loop clean",
  "Stream stayed in sync",
  "Console clean (no red / no 500)",
];

const SIGNOFF_KEY = "studioAccuracySignoff.v1";

type SignoffStatus = "" | "pass" | "fail";
interface SignoffState {
  meta: { date: string; env: string; dealer: string; method: string };
  rows: Record<string, { status: SignoffStatus; notes: string }>;
}

function emptySignoff(): SignoffState {
  const rows: SignoffState["rows"] = {};
  SIGNOFF_CASES.forEach((c) => {
    rows[c] = { status: "", notes: "" };
  });
  return { meta: { date: "", env: "", dealer: "", method: "" }, rows };
}

const signoffInput: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  color: "#d1d5db",
  padding: "6px 8px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

function StatusToggle({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        border: `1px solid ${color}`,
        background: active ? color : "transparent",
        color: active ? "#0a0a0a" : color,
        opacity: active ? 1 : 0.65,
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}

function SignOffChecklist() {
  const [state, setState] = useState<SignoffState>(emptySignoff);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Load saved results once on mount (tolerates a stale/partial payload).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIGNOFF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SignoffState>;
        const base = emptySignoff();
        base.meta = { ...base.meta, ...(parsed.meta || {}) };
        SIGNOFF_CASES.forEach((c) => {
          const r = parsed.rows?.[c];
          if (r) base.rows[c] = { status: r.status ?? "", notes: r.notes ?? "" };
        });
        setState(base);
      }
    } catch {
      /* ignore corrupt payload */
    }
    setLoaded(true);
  }, []);

  // Auto-save on every change once the initial load is done.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SIGNOFF_KEY, JSON.stringify(state));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [state, loaded]);

  const setMeta = (k: keyof SignoffState["meta"], v: string) =>
    setState((s) => ({ ...s, meta: { ...s.meta, [k]: v } }));
  const setStatus = (c: string, status: SignoffStatus) =>
    setState((s) => ({
      ...s,
      rows: { ...s.rows, [c]: { ...s.rows[c], status: s.rows[c].status === status ? "" : status } },
    }));
  const setNotes = (c: string, notes: string) =>
    setState((s) => ({ ...s, rows: { ...s.rows, [c]: { ...s.rows[c], notes } } }));
  const clearAll = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all saved sign-off results on this device?")) return;
    setState(emptySignoff());
  };
  const copyResults = () => {
    const m = state.meta;
    const lines = [
      "Accuracy sign-off",
      `Date: ${m.date || "—"}  ·  Env: ${m.env || "—"}  ·  Dealer: ${m.dealer || "—"}  ·  Deal: ${m.method || "—"}`,
      "",
      ...SIGNOFF_CASES.map((c) => {
        const r = state.rows[c];
        const mark = r.status === "pass" ? "[PASS]" : r.status === "fail" ? "[FAIL]" : "[ -- ]";
        return `${mark} ${c}${r.notes ? "  — " + r.notes : ""}`;
      }),
    ];
    void navigator.clipboard.writeText(lines.join("\n"));
  };

  const passed = SIGNOFF_CASES.filter((c) => state.rows[c].status === "pass").length;
  const failed = SIGNOFF_CASES.filter((c) => state.rows[c].status === "fail").length;
  const pending = SIGNOFF_CASES.length - passed - failed;

  const btn: React.CSSProperties = {
    padding: "5px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid rgba(208,135,0,0.3)",
    background: "rgba(208,135,0,0.12)",
    color: GOLD,
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16, margin: "12px 0", background: "rgba(255,255,255,0.015)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        <input style={signoffInput} placeholder="Date" value={state.meta.date} onChange={(e) => setMeta("date", e.target.value)} />
        <input style={signoffInput} placeholder="Environment (staging / prod TEST)" value={state.meta.env} onChange={(e) => setMeta("env", e.target.value)} />
        <input style={signoffInput} placeholder="Dealer" value={state.meta.dealer} onChange={(e) => setMeta("dealer", e.target.value)} />
        <input style={signoffInput} placeholder="Deal method (shoe / manual)" value={state.meta.method} onChange={(e) => setMeta("method", e.target.value)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SIGNOFF_CASES.map((c) => {
          const r = state.rows[c];
          return (
            <div
              key={c}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(150px, 1.5fr) auto minmax(110px, 1.2fr)",
                gap: 10,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ fontSize: 13, color: r.status === "pass" ? "#7ddfb0" : r.status === "fail" ? "#fb8080" : "#d1d5db" }}>{c}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <StatusToggle active={r.status === "pass"} color="#05df72" label="PASS" onClick={() => setStatus(c, "pass")} />
                <StatusToggle active={r.status === "fail"} color="#fb2c36" label="FAIL" onClick={() => setStatus(c, "fail")} />
              </div>
              <input style={signoffInput} placeholder="Notes" value={r.notes} onChange={(e) => setNotes(c, e.target.value)} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 12, color: "#99a1af" }}>
          <strong style={{ color: "#7ddfb0" }}>{passed} pass</strong> · <strong style={{ color: "#fb8080" }}>{failed} fail</strong> · {pending} pending — saved on this device{savedAt ? ` · ${savedAt}` : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={btn} onClick={copyResults}>Copy results</button>
          <button type="button" style={btn} onClick={clearAll}>Clear all</button>
        </div>
      </div>
    </div>
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
            .guide-content h3 { font-size: 15px; font-weight: 700; color: #d08700; margin: 24px 0 10px; }
            .guide-content input { font-family: inherit; }
            .guide-content input::placeholder { color: #6a7282; }
            .guide-content a code { text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
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
            <p>A structured plan for the studio team to verify <strong>operations accuracy</strong> — dealing, scoring, settlement, and stream sync — by running real rounds and checking every outcome against what the rules say should happen. Run it before going live and after any change to a table, the shoe, or the stream. It uses play money on a TEST table, so nothing here can reach a real player or real funds.</p>

            <div className="info"><strong>Where to run it.</strong> Studio: open <AppLink path="/studio"><code>/studio</code></AppLink> and select a <strong>TEST-</strong> table (never a live one). Players: open <AppLink path="/play/demo"><code>/play/demo</code></AppLink> in another tab — it only ever lists TEST- tables, starts with a <strong>10,000</strong> play-money balance, and connects read-only, so a demo bet can never reach a real table. These links follow whichever site you opened this guide on (staging or production). No TEST table yet? Create one in Studio Settings, or use the <AppLink path="/emulator">Emulator</AppLink> as a software shoe. Keep the browser console open (F12) on both tabs — you are watching for red errors all session.</div>

            <h3>Pre-flight (5 min)</h3>
            <div className="step"><span className="step-num">1</span><span className="step-text">API health is green — open <ApiLink path="/health"><code>/health</code></ApiLink>, expect <code>{`{"status":"ok"}`}</code>.</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text">Studio login works; dealer name set, <strong>TEST-</strong> table selected, Saved.</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Demo tab shows the <strong>10,000</strong> balance and the same TEST table; live video is visible.</span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text">Dealing the shoe? Connect it first (<a href="#setup" style={{ color: GOLD }}>Setup</a>). No shoe? Use <a href="#manual-input" style={{ color: GOLD }}>Manual Input</a> or the <a href="#emulator" style={{ color: GOLD }}>Emulator</a> to force exact cards.</span></div>

            <h3>The round loop (every test case uses this)</h3>
            <p>Full detail in <a href="#dealing" style={{ color: GOLD }}>Dealing a Round</a> — the short version per round:</p>
            <div className="step"><span className="step-num">1</span><span className="step-text"><strong>NEW ROUND</strong> → status reads <strong>PLACE BETS</strong>, countdown starts.</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text">Place demo bet(s) before the countdown ends.</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Countdown hits 0 → <strong>NO MORE BETS</strong>; the card verification screen opens by itself. (No card should ever show before this point.)</span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text">Deal <strong>Player 1 · Banker 1 · Player 2 · Banker 2</strong>, then a 3rd card only if the rules call for it.</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text">Wrong card? <strong>Tap the slot</strong> and pick the correct one.</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text"><strong>CONFIRM &amp; SETTLE</strong> → result recorded, winners paid, losers cleared, roads advance, in one step.</span></div>

            <h3>Card values &amp; scoring</h3>
            <p>Ace = 1; 2–9 = face value; 10/J/Q/K = 0. A hand&apos;s score is the <strong>last digit</strong> of the sum (e.g. 7+8 = 15 → <strong>5</strong>). Card codes are rank+suit: <code>AS</code>, <code>TD</code>, <code>9H</code>, <code>KC</code>.</p>

            <h3>Third-card rules (enforced automatically)</h3>
            <p><strong>Natural:</strong> if Player or Banker has <strong>8 or 9</strong> on the first two cards, no third card for anyone — higher score wins, equal is a Tie. Otherwise: <strong>Player</strong> draws on 0–5, stands on 6–7. <strong>Banker</strong> (when Player stood) draws on 0–5, stands on 6–7. When Player drew a third card, Banker follows:</p>
            <table>
              <thead><tr><th>Banker total</th><th>Banker draws if Player&apos;s 3rd card is…</th></tr></thead>
              <tbody>
                <tr><td>0, 1, 2</td><td>always draws</td></tr>
                <tr><td>3</td><td>any except <strong>8</strong></td></tr>
                <tr><td>4</td><td><strong>2–7</strong></td></tr>
                <tr><td>5</td><td><strong>4–7</strong></td></tr>
                <tr><td>6</td><td><strong>6–7</strong></td></tr>
                <tr><td>7</td><td>stands (never draws)</td></tr>
              </tbody>
            </table>

            <h3>Payouts (defaults — confirm live values in Admin → Payout Odds)</h3>
            <table>
              <thead><tr><th>Bet</th><th>Pays</th></tr></thead>
              <tbody>
                <tr><td>PLAYER</td><td>1 : 1 — 100 returns 200</td></tr>
                <tr><td>BANKER</td><td>1 : 1 minus 5% commission — 100 returns <strong>195</strong></td></tr>
                <tr><td>TIE</td><td>8 : 1 — 100 returns 900</td></tr>
                <tr><td>Player/Banker bet on a Tie</td><td><strong>Push</strong> — stake refunded</td></tr>
                <tr><td>PERFECT PAIR</td><td>25 : 1</td></tr>
                <tr><td>EITHER PAIR</td><td>5 : 1</td></tr>
                <tr><td>PLAYER PAIR / BANKER PAIR</td><td>11 : 1</td></tr>
              </tbody>
            </table>

            <h3>Test cases</h3>
            <p>Run each as a full round loop. Use <a href="#manual-input" style={{ color: GOLD }}>Manual Input</a> to force the exact cards, then mark <strong>Pass/Fail</strong> for it in the tracker below — results save automatically on this device.</p>
            <table>
              <thead><tr><th>#</th><th>Bet (demo)</th><th>Force</th><th>Expect</th></tr></thead>
              <tbody>
                <tr><td>TC-01</td><td>100 PLAYER</td><td>Player <strong>natural</strong> (e.g. 9♥9♠=8) vs 7</td><td>PLAYER wins, no third cards, net <strong>+100</strong></td></tr>
                <tr><td>TC-02</td><td>100 BANKER</td><td>Banker high (e.g. 9♣K♦=9) vs 7</td><td>BANKER wins, returns <strong>195</strong> (5% comm.), net +95</td></tr>
                <tr><td>TC-03</td><td>100 TIE</td><td>equal scores (e.g. both 9)</td><td>TIE, pays 8:1, net <strong>+800</strong></td></tr>
                <tr><td>TC-04</td><td>100 PLAYER</td><td>a Tie</td><td><strong>Push</strong> — stake back, net 0, no win flash</td></tr>
                <tr><td>TC-05</td><td>100 PLAYER</td><td>Player 5 draws a 3rd card</td><td>Player draws correctly, Banker follows the table, right winner</td></tr>
                <tr><td>TC-06</td><td>—</td><td>Manual Input: Banker total <strong>7</strong>, add a 3rd Banker card</td><td>System <strong>refuses</strong> it (7 always stands)</td></tr>
                <tr><td>TC-07</td><td>100 PLAYER + 100 PERFECT PAIR</td><td>Player a pair (e.g. 8♥8♦)</td><td>Main settles by outcome; pair pays per odds; both hit balance</td></tr>
                <tr><td>TC-08</td><td>100 PLAYER</td><td>a Banker win</td><td>Loss — chips clear, <strong>no</strong> win flash, net −100</td></tr>
                <tr><td>TC-09</td><td>PLAYER then BANKER, same round</td><td>—</td><td>2nd bet <strong>rejected</strong> — can&apos;t back both sides (check Network tab)</td></tr>
                <tr><td>TC-10</td><td>any</td><td>deal, tap a slot to change a card, then Confirm &amp; Settle</td><td>Overlay updates live; settlement uses the <strong>corrected</strong> hand</td></tr>
              </tbody>
            </table>

            <h3>Multi-round loop &amp; stream sync</h3>
            <p>Run <strong>10 rounds back-to-back without reloading</strong>, varying bets to cover every path (win / loss / tie / push / pair / opposing-bet). Each round, before moving on:</p>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Card accuracy</strong> — cards on screen = cards dealt = cards on the live video, in deal order.</span></div>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Score &amp; winner</strong> correct; <strong>settlement correct to the peso</strong>; roadmap advanced by one.</span></div>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Stream sync</strong> — on WebRTC the card overlay lands within ~1–2s of the table on video. On HLS a 2–4s lead is normal. Off consistently? Calibrate <a href="#video-delay" style={{ color: GOLD }}>Video Delay</a>.</span></div>
            <div className="step"><span className="step-num">✓</span><span className="step-text"><strong>Recovery</strong> — reload the demo tab mid-round; video reconnects and the round state (bets, phase, cards) comes back correct.</span></div>

            <h3>Sign-off sheet — tap PASS / FAIL, add notes (saved on this device)</h3>
            <p>Fill the header, then mark each case. Everything you enter is saved in this browser automatically, so you can close the tab and come back to review it. <strong>Copy results</strong> exports a text summary to paste into chat; <strong>Clear all</strong> wipes it.</p>
            <SignOffChecklist />

            <div className="warn">A settlement looks wrong? Open <strong>Admin → Rounds → that round</strong> and compare cards, scores, <code>betPosition</code>, <code>actualBetAmt</code>, <code>validBetAmt</code>, <code>winAmt</code> against what you expected. Capture a screenshot + the round id for the dev/admin team.</div>
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
