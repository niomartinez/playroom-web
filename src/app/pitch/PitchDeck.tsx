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

function ChromeTop({
  num,
  label,
  pair,
}: {
  num?: string;
  label?: string;
  pair?: [string, string];
}) {
  return (
    <div className="chrome-top">
      <div className="kicker">
        {pair ? (
          <>
            <span className="num">{pair[0]}</span>
            <span className="lbl">{pair[1]}</span>
          </>
        ) : (
          <>
            <span className="num">{num}</span>
            <span className="lbl"> · {label}</span>
          </>
        )}
      </div>
      <span className="badge-18">18+</span>
    </div>
  );
}

/* Footer carries the Playroom logo mark. */
function ChromeFoot({ left }: { left?: ReactNode }) {
  return (
    <div className={`chrome-foot ${left ? "" : "end"}`}>
      {left ? <div className="foot-left">{left}</div> : null}
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

function StageBody({ s, operator }: { s: Slide; operator: string | null }) {
  switch (s.type) {
    case "cover":
      return (
        <>
          <div className="chrome-top">
            <div className="kicker">
              <span className="num">{s.kicker[0]}</span>
              <span className="lbl">{s.kicker[1]}</span>
            </div>
            <span className="badge-18">18+</span>
          </div>
          <div className="cover-center">
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
            <RV i={3}>
              <div className="cover-prepared">
                <span className="chip">
                  {s.preparedForPrefix}
                  {(operator ?? "OPERATOR NAME").toUpperCase()}
                </span>
              </div>
            </RV>
            <RV i={4}>
              <div className="cover-legal">{s.legal}</div>
            </RV>
          </div>
          <div className="ui-strip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pitch/ui-strip.png" alt="Playroom live table interface" />
          </div>
        </>
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
          <div className="live-grid">
            <RV i={1}>
              <div>
                <DemoVideo src={s.video} gateLine={s.gateLine} />
                <div className="media-cap">{s.videoCap}</div>
              </div>
            </RV>
            <div className="show-side">
              {s.crops.map((c, k) => (
                <RV i={k + 2} key={k}>
                  <div>
                    <div className="crop-frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.src} alt="" />
                    </div>
                    <div className="media-cap">{c.cap}</div>
                  </div>
                </RV>
              ))}
            </div>
          </div>
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
                      <li key={j}>
                        {typeof b === "string" ? (
                          b
                        ) : (
                          <span>
                            {b.text}
                            <span className="chip inline">{b.chip}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot left={<span className="chip">{s.chip}</span>} />
        </>
      );

    case "close":
      return (
        <>
          <div className="chrome-top">
            <div className="kicker">
              <span className="num">{s.kicker[0]}</span>
              <span className="lbl">{s.kicker[1]}</span>
            </div>
            <span className="badge-18">18+</span>
          </div>
          <div className="cover-center">
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
            <RV i={3}>
              <div className="close-chips">
                {s.chips.map((c, k) => (
                  <span className="chip" key={k}>
                    {c}
                  </span>
                ))}
              </div>
            </RV>
            <RV i={4}>
              <div className="cover-legal">{s.legal}</div>
            </RV>
          </div>
          <div className="ui-strip short">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pitch/ui-strip.png" alt="Playroom live table interface" />
          </div>
        </>
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

  /* One slide per gesture, no artificial cooldown: a fresh gesture (wheel
     activity after a quiet gap, or a direction change) advances immediately,
     even mid-animation. A single trackpad flick with momentum is one
     continuous stream, so it still moves exactly one slide. The track and
     progress bar move via CSS vars (--active / --progress) with a CSS
     transition, so position is resize-proof (vw units) with no JS math. */
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

    /* Wheel gesture detection: events separated by a quiet gap (or flipping
       direction) start a new gesture; each new gesture = one step. */
    const GAP_MS = 110;
    let lastWheelAt = 0;
    let lastDir = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < 4) return;
      const dir = d > 0 ? 1 : -1;
      const now = performance.now();
      const fresh = now - lastWheelAt > GAP_MS || dir !== lastDir;
      lastWheelAt = now;
      lastDir = dir;
      if (fresh) goTo(activeRef.current + dir);
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
                  <StageBody s={s} operator={operator} />
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
