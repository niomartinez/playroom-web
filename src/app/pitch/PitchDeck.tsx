"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import "./pitch.css";
import { DECK, FOOTER, type Slide } from "./content";
import AdultGate from "./AdultGate";
import Watermark from "./Watermark";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

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

function ChromeFoot({ left }: { left?: ReactNode }) {
  return (
    <div className={`chrome-foot ${left ? "" : "end"}`}>
      {left ? <div className="foot-left">{left}</div> : null}
      <span className="foot-brand">{FOOTER}</span>
    </div>
  );
}

/** Demo video: gated, muted, no autoplay; resumes from last position. */
function DemoVideo({ s }: { s: Extract<Slide, { type: "demo" }> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="demo-wrap">
      <div className="demo-frame">
        <video
          ref={ref}
          src={s.video}
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
          line={s.gateLine}
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
      <div className="demo-caps">
        <span>{s.capLeft}</span>
        <span>{s.capRight}</span>
      </div>
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

    case "market":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display" style={{ maxWidth: 1500 }}>
              {fmt(s.title)}
            </h1>
          </RV>
          <div className="market-grid">
            {s.cards.map((c, k) => (
              <RV i={k} big key={k}>
                <div className="mcard">
                  <div className="big grad-text">{c.big}</div>
                  <div className="cap">{c.cap}</div>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot
            left={
              <>
                <span className="foot-note" style={{ letterSpacing: "0.14em" }}>
                  SOURCES:
                </span>
                <span className="chip">{s.sourcesChip}</span>
              </>
            }
          />
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

    case "showcase":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="show-grid">
            <RV i={1}>
              <div>
                <div className="media-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.fullShot.src} alt="Full table view" />
                  <AdultGate line={s.fullShot.gateLine} />
                </div>
                <div className="media-cap">{s.fullShot.cap}</div>
              </div>
            </RV>
            <div className="show-side">
              {s.crops.map((c, k) => (
                <RV i={k + 2} key={k}>
                  <div>
                    <div
                      className={`crop-frame ${c.cropHeight ? "fixed-h" : ""}`}
                      style={c.cropHeight ? { height: c.cropHeight } : undefined}
                    >
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

    case "demo":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <RV i={1}>
            <DemoVideo s={s} />
          </RV>
          <ChromeFoot />
        </>
      );

    case "caseStudy":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="tl-grid">
            {s.steps.map((st, k) => (
              <RV i={k + 1} key={k}>
                <div className="tl">
                  <div className={`dot ${st.bright ? "bright" : ""}`} />
                  <div className={`day ${st.bright ? "bright" : ""}`}>{st.day}</div>
                  <h3>{st.h}</h3>
                  <p>{st.p}</p>
                </div>
              </RV>
            ))}
          </div>
          <div className="cs-stats">
            {s.stats.map((st, k) => (
              <RV i={k + 5} big key={k}>
                <div>
                  <div className="big">{st.big}</div>
                  <div className="cap">{st.cap}</div>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot left={<span className="chip">{s.chip}</span>} />
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

    case "betMenu":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <RV i={1}>
            <p className="lead" style={{ maxWidth: 1100 }}>
              {s.lead}
            </p>
          </RV>
          <div className="bets-main">
            {s.mains.map((b, k) => (
              <RV i={k + 2} big key={k}>
                <div className="bet-main" style={{ "--bet": b.color } as React.CSSProperties}>
                  <div className="lbl">{b.label}</div>
                  <div className="odds">{b.odds}</div>
                </div>
              </RV>
            ))}
          </div>
          <div className="bets-pairs">
            {s.pairs.map((p, k) => (
              <RV i={k + 5} key={k}>
                <div className="bet-pair">
                  <div className="odds">{p.odds}</div>
                  <div className="lbl">{p.label}</div>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot
            left={
              <>
                <span className="foot-note">{s.footNote}</span>
                <span className="chip">{s.chip}</span>
              </>
            }
          />
        </>
      );

    case "integration":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <RV i={1}>
            <div className="arch-strip">
              {s.strip.map((node, k) => (
                <div key={k} style={{ display: "contents" }}>
                  {k > 0 ? <div className="arch-arrow">→</div> : null}
                  <div className={`arch-node ${k === s.stripActive ? "active" : ""}`}>
                    <span>{node}</span>
                  </div>
                </div>
              ))}
            </div>
          </RV>
          <div className="arch-cols">
            {s.cols.map((c, k) => (
              <RV i={k + 2} key={k}>
                <div>
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "wallet":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="wallet-grid">
            {s.panels.map((p, k) => (
              <RV i={k + 1} key={k}>
                <div className="wpanel">
                  <h3>{p.h}</h3>
                  <ul>
                    {p.bullets.map((b, j) => (
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

    case "bigStats":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="vstats">
            {s.stats.map((st, k) => (
              <RV i={k + 1} big key={k}>
                <div>
                  <div className="big grad-text">{st.big}</div>
                  <div className="cap">{st.cap}</div>
                  <p>{st.p}</p>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot left={<span className="chip">{s.chip}</span>} />
        </>
      );

    case "roadmap":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="tl-grid roadmap">
            {s.phases.map((p, k) => (
              <RV i={k + 1} key={k}>
                <div className="tl">
                  <div className={`dot ${p.live ? "bright pulse" : ""}`} />
                  <div className={`day ${p.live ? "bright" : ""}`}>
                    {p.live ? (
                      p.tag
                    ) : (
                      <>
                        <span className="tag-dim">{p.tag}</span>
                        <span className="chip inline">{p.dateChip}</span>
                      </>
                    )}
                  </div>
                  <h3>{p.h}</h3>
                  <p>{p.p}</p>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "compliance":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <RV i={1}>
            <p className="lead" style={{ maxWidth: 1100 }}>
              {s.lead}
            </p>
          </RV>
          <div className="comp-grid">
            {s.items.map((it, k) => (
              <RV i={k + 2} key={k}>
                <div>
                  <h3>{it.h}</h3>
                  <p>
                    {it.p}
                    {it.chip ? <span className="chip inline">{it.chip}</span> : null}
                  </p>
                </div>
              </RV>
            ))}
          </div>
          <ChromeFoot />
        </>
      );

    case "commercials":
      return (
        <>
          <ChromeTop num={s.num} label={s.label} />
          <RV i={0}>
            <h1 className="h-display">{fmt(s.title)}</h1>
          </RV>
          <div className="deal-grid">
            {s.panels.map((p, k) => (
              <RV i={k + 1} key={k}>
                <div className="deal-panel">
                  <h3>{p.h}</h3>
                  <div className="deal-rows">
                    {p.rows.map((r, j) => (
                      <div className="deal-row" key={j}>
                        <span className="k">{r.k}</span>
                        <span className="chip">{r.chip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </RV>
            ))}
          </div>
          <RV i={3}>
            <p className="deal-note">{s.footNote}</p>
          </RV>
          <ChromeFoot />
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
  if (s.type === "statement" || s.type === "demo" || s.type === "bigStats")
    return "bottom";
  return "top";
}

export default function PitchDeck({ operator }: { operator: string | null }) {
  const who = operator && operator.trim() ? operator.trim() : "Do not distribute";
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [motionMode, setMotionMode] = useState<"pan" | "static">("pan");

  /* Stage scale: fit the 1920x1080 canvas to the viewport, before paint. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      root.style.setProperty("--stage-scale", String(s));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  /* Horizontal pan: vertical scroll through a tall spacer drives the sticky
     track left-to-right. No pin (position:fixed), so it prints/captures.
     `?flat` (or reduced-motion) falls back to a plain vertical stack. */
  useEffect(() => {
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      new URLSearchParams(window.location.search).has("flat");
    if (reduce) {
      setMotionMode("static");
      return;
    }
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const setBar = barRef.current
      ? gsap.quickSetter(barRef.current, "scaleX")
      : null;

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: scroller,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 1 / (N - 1),
            duration: { min: 0.2, max: 0.5 },
            delay: 0.06,
            ease: "power1.inOut",
          },
          onRefreshInit: (self) => {
            stRef.current = self;
          },
          onUpdate: (self) => {
            stRef.current = self;
            setBar?.(self.progress);
            const i = Math.round(self.progress * (N - 1));
            if (i !== activeRef.current) {
              activeRef.current = i;
              setActive(i);
            }
          },
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  /* Keyboard: slide navigation + print/save intercept. */
  useEffect(() => {
    const goTo = (i: number) => {
      const st = stRef.current;
      if (!st) return;
      const clamped = Math.max(0, Math.min(N - 1, i));
      const y = st.start + (clamped / (N - 1)) * (st.end - st.start);
      gsap.to(window, { scrollTo: y, duration: 0.6, ease: "power2.inOut" });
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      if (motionMode === "static") return;
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [motionMode]);

  return (
    <div
      className="pitch-root"
      ref={rootRef}
      data-motion={motionMode}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Watermark operator={who} />
      <div className="rotate-hint">ROTATE FOR BEST VIEW · THE DECK IS 16:9</div>

      <div
        className="deck-scroll"
        ref={scrollRef}
        style={motionMode === "pan" ? { height: `${N * 100}vh` } : undefined}
      >
        <div className="deck-viewport">
          <div className="deck-track" ref={trackRef}>
            {DECK.map((s, idx) => (
              <section
                className={`panel ${
                  motionMode === "static" || idx <= active ? "active" : ""
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
      </div>

      <div className="deck-progress" aria-hidden="true">
        <i ref={barRef} />
      </div>
      <div className="deck-counter" aria-hidden="true">
        <b>{String(active + 1).padStart(2, "0")}</b> / {String(N).padStart(2, "0")}
      </div>
    </div>
  );
}
