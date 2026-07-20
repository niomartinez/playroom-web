"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./pitch.css";
import { DECK, type Slide } from "./content";
import AdultGate from "./AdultGate";
import Watermark from "./Watermark";

const N = DECK.length;

/** [[emphasis]] -> solid red span inside an Anton headline. */
function fmt(text: string): ReactNode[] {
  return text.split(/(\[\[.*?\]\])/g).map((part, i) =>
    part.startsWith("[[") && part.endsWith("]]") ? (
      <span className="em" key={i}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Reveal-on-activation wrapper with stagger index. */
function RV({
  i,
  big = false,
  children,
}: {
  i: number;
  big?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={big ? "rv-big" : "rv"} style={{ "--i": i } as React.CSSProperties}>
      {children}
    </div>
  );
}

function ChromeTop({ num, label }: { num: string; label: string }) {
  return (
    <div className="chrome-top">
      <div className="kicker">
        <span className="num">{num}</span>
        <span className="lbl"> · {label}</span>
      </div>
    </div>
  );
}

/* Footer carries the Playroom logo mark. */
function ChromeFoot() {
  return (
    <div className="chrome-foot end">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="foot-logo" src="/pitch/logo-dark.png" alt="Playroom Gaming" />
    </div>
  );
}

/** Demo video: gated, muted, no autoplay; resumes from last position. */
function DemoVideo({ src, gateLine }: { src: string; gateLine: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="demo-frame">
      <video
        ref={ref}
        src={src}
        preload="none"
        muted
        playsInline
        controls={revealed}
        onTimeUpdate={(e) => {
          try {
            localStorage.setItem(
              "playroom-prg-pos",
              String(e.currentTarget.currentTime),
            );
          } catch {}
        }}
        onLoadedMetadata={(e) => {
          try {
            const t = parseFloat(localStorage.getItem("playroom-prg-pos") ?? "");
            const el = e.currentTarget;
            if (!isNaN(t) && t > 0 && t < el.duration - 1) el.currentTime = t;
          } catch {}
        }}
      />
      <AdultGate
        line={gateLine}
        sub=""
        large
        onReveal={() => {
          setRevealed(true);
          const v = ref.current;
          if (v) {
            v.muted = true;
            v.play().catch(() => {});
          }
        }}
      />
    </div>
  );
}

function StageBody({ s }: { s: Slide }) {
  switch (s.type) {
    case "cover":
      return (
        <div className="cover-center solo">
          <RV i={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cover-logo" src="/pitch/logo-dark.png" alt="Playroom Gaming" />
          </RV>
          <RV i={1}>
            <div className="cover-title">{s.titleTop}</div>
          </RV>
          <RV i={2}>
            <div className="cover-sub grad-text">{s.titleSub}</div>
          </RV>
        </div>
      );

    case "statement":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <div className="stmt-center">
            <RV i={0}>
              <div className="stmt-line">{s.lines[0]}</div>
            </RV>
            <RV i={1}>
              <div className="stmt-line">{s.lines[1]}</div>
            </RV>
            <RV i={2}>
              <div className="stmt-line grad-text grad-glow">{s.lines[2]}</div>
            </RV>
            <RV i={3}>
              <p className="stmt-body">{s.body}</p>
            </RV>
          </div>
          <ChromeFoot />
        </>
      );

    case "product":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display" style={{ maxWidth: 1560 }}>
              {fmt(s.title)}
            </h1>
          </RV>
          <RV i={1}>
            <p className="lead">{s.lead}</p>
          </RV>
          <div className="feat-grid">
            {s.features.map((f, k) => (
              <RV i={k + 2} key={k}>
                <div className="feat">
                  <div className="n">{String(k + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{f.h}</h3>
                    <p>{f.p}</p>
                  </div>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "live":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <RV i={1}>
            <div className="live-solo">
              <DemoVideo src={s.video} gateLine={s.gateLine} />
            </div>
          </RV>
          <ChromeFoot />
        </>
      );

    case "panels3":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="p3-grid">
            {s.panels.map((p, k) => (
              <RV i={k + 1} key={k}>
                <div className="p3">
                  <div className="n">{String(k + 1).padStart(2, "0")}</div>
                  <h3>{p.h}</h3>
                  <p>{p.p}</p>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "ops3":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="p3-grid">
            {s.cols.map((c, k) => (
              <RV i={k + 1} key={k}>
                <div className="p3">
                  <div className="n">{c.tag}</div>
                  <h3>{c.h}</h3>
                  <ul className="ops-list">
                    {c.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "close":
      return (
        <div className="cover-center solo">
          <RV i={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="close-logo" src="/pitch/logo-dark.png" alt="Playroom Gaming" />
          </RV>
          <RV i={1}>
            <div className="close-title">{s.titleTop}</div>
          </RV>
          <RV i={2}>
            <div className="close-sub grad-text grad-glow">{s.titleSub}</div>
          </RV>
        </div>
      );
  }
}

function glowFor(s: Slide): "top" | "bottom" | "both" {
  if (s.type === "cover" || s.type === "close") return "both";
  if (s.type === "statement" || s.type === "live") return "bottom";
  return "top";
}

export default function PitchDeck({ operator }: { operator: string | null }) {
  const who = operator && operator.trim() ? operator.trim() : "Do not distribute";
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set([0]));
  const activeRef = useRef(0);
  const [motionMode, setMotionMode] = useState<"pan" | "static">("pan");

  /* Stage scale: fit the 1920x1080 canvas to the viewport, before paint. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const sc = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      root.style.setProperty("--stage-scale", String(sc));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      new URLSearchParams(window.location.search).has("flat");
    if (reduce) setMotionMode("static");
  }, []);

  /* Track + progress move via CSS vars with a CSS transition, so position is
     resize-proof (vw units) with no JS pixel math. */
  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(N - 1, i));
    if (clamped === activeRef.current) return;
    activeRef.current = clamped;
    setActive(clamped);
    setRevealed((prev) => (prev.has(clamped) ? prev : new Set(prev).add(clamped)));
    const root = rootRef.current;
    if (root) {
      root.style.setProperty("--active", String(clamped));
      root.style.setProperty("--progress", String(N > 1 ? clamped / (N - 1) : 1));
    }
  }, []);

  useEffect(() => {
    if (motionMode !== "pan") return;

    /* One slide per gesture, responsive, no skipping.

       A trackpad flick is a stream of wheel events whose |delta| ramps up to a
       peak then decays through a long inertia tail; the tail is noisy and can
       wobble. We fire once when "armed", then disarm. We only re-arm on a real
       gesture boundary: a genuine silence gap, a direction flip, or a forceful
       RE-ACCELERATION that happens only AFTER the current flick has decayed
       past its peak into its tail (tracked via peak/valley). Mid-flick wobble
       stays below the peak, so it can't re-arm -> one flick = exactly one
       slide. A real second flick spikes hard out of the tail -> it advances
       immediately, even while the first flick's inertia still trails. */
    let armed = true;
    let peak = 0;
    let valley = Infinity;
    let passedPeak = false;
    let lastAt = 0;
    let lastFireAt = 0;
    let lastDir = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const absD = Math.abs(raw);
      if (absD < 2) return;
      const dir = raw > 0 ? 1 : -1;
      const now = performance.now();
      const gap = now - lastAt;
      lastAt = now;

      if (gap > 110 || (dir !== lastDir && lastDir !== 0)) {
        armed = true;
        peak = 0;
        valley = Infinity;
        passedPeak = false;
      }
      lastDir = dir;

      if (!armed) {
        if (absD > peak) peak = absD;
        if (peak > 0 && absD < peak * 0.5) passedPeak = true;
        if (passedPeak) {
          if (absD < valley) valley = absD;
          // a fresh, forceful push out of the inertia tail = a new flick
          if (absD > 45 && absD > valley * 2.2) armed = true;
        }
      }

      if (armed && absD >= 16 && now - lastFireAt > 90) {
        goTo(activeRef.current + dir);
        lastFireAt = now;
        armed = false;
        peak = absD;
        valley = Infinity;
        passedPeak = false;
      }
    };

    // touch: one swipe = one step
    let tsX = 0;
    let tsY = 0;
    let tsActive = false;
    const onTouchStart = (e: TouchEvent) => {
      tsX = e.touches[0].clientX;
      tsY = e.touches[0].clientY;
      tsActive = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tsActive) return;
      tsActive = false;
      const dx = e.changedTouches[0].clientX - tsX;
      const dy = e.changedTouches[0].clientY - tsY;
      const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (Math.abs(d) < 45) return;
      goTo(activeRef.current + (d < 0 ? 1 : -1));
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      const next = ["ArrowRight", "ArrowDown", "PageDown", " "];
      const prev = ["ArrowLeft", "ArrowUp", "PageUp"];
      if (next.includes(e.key)) {
        e.preventDefault();
        goTo(activeRef.current + 1);
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        goTo(activeRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(N - 1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [motionMode, goTo]);

  return (
    <div
      className="pitch-root"
      ref={rootRef}
      data-motion={motionMode}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Watermark operator={who} />
      <div className="rotate-hint">ROTATE FOR BEST VIEW · THE DECK IS 16:9</div>

      <div className="deck-viewport">
        <div className="deck-track">
          {DECK.map((s, idx) => (
            <section
              className={`panel ${
                motionMode === "static" || revealed.has(idx) ? "active" : ""
              }`}
              data-idx={idx}
              key={idx}
            >
              <div className="stage-scaler">
                <div className="stage" data-glow={glowFor(s)}>
                  <StageBody s={s} />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {motionMode === "pan" ? (
        <>
          <div className="deck-progress" aria-hidden="true">
            <i />
          </div>
          <div className="deck-counter" aria-hidden="true">
            <b>{String(active + 1).padStart(2, "0")}</b> / {String(N).padStart(2, "0")}
          </div>
        </>
      ) : null}
    </div>
  );
}
