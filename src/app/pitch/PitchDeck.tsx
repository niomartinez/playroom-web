"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./pitch.css";
import { DECK, type Slide } from "./content";
import Reveal from "./Reveal";
import Watermark from "./Watermark";
import AdultGate from "./AdultGate";

/** {{placeholder}} -> gold chip, [[emphasis]] -> italic red accent. */
function fmt(text: string): ReactNode[] {
  return text.split(/(\{\{.*?\}\}|\[\[.*?\]\])/g).map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <span className="ph" key={i}>
          {part.slice(2, -2).trim()}
        </span>
      );
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return (
        <span className="em" key={i}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Reveal item with a stagger index. */
function RI({ i, children }: { i: number; children: ReactNode }) {
  return (
    <div className="reveal-item" style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}

/** Product screenshot with a graceful "drop your asset here" fallback. */
function Shot({ src, cap }: { src: string; cap: string }) {
  const [err, setErr] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The <img> is server-rendered, so a 404 can fire its error event before
  // React hydrates and attaches onError. Re-check the broken state on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setErr(true);
  }, []);

  if (err) {
    return (
      <div className="shot">
        <div className="asset-empty">
          <span className="big">Add your screenshot</span>
          <code>public{src}</code>
        </div>
      </div>
    );
  }
  return (
    <div className="shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        onError={() => setErr(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) setErr(true);
        }}
      />
      {cap ? <span className="cap">{cap}</span> : null}
    </div>
  );
}

/** Demo video with 18+ gate + graceful fallback when demo.mp4 is absent. */
function DemoPlayer({ video, poster }: { video: string; poster: string }) {
  const [err, setErr] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="demo-frame">
      {err ? (
        <div className="asset-empty">
          <span className="big">Add your demo clip</span>
          <code>public/pitch/demo.mp4</code>
          <span style={{ fontSize: "0.75rem" }}>
            ffmpeg command in /public/pitch/README.md
          </span>
        </div>
      ) : (
        <video
          ref={ref}
          src={video}
          poster={poster}
          controls={revealed}
          playsInline
          preload="none"
          onError={() => setErr(true)}
        />
      )}
      <AdultGate
        label="Live gameplay · 18+"
        onReveal={() => {
          setRevealed(true);
          ref.current?.play?.().catch(() => {});
        }}
      />
    </div>
  );
}

function SlideBody({ s }: { s: Slide }) {
  switch (s.type) {
    case "cover":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <div className="cover-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Playroom Gaming" />
            </div>
          </RI>
          <RI i={1}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={2}>
            <h1 className="display d-xl">{fmt(s.title)}</h1>
          </RI>
          <RI i={3}>
            <p className="lead eyebrow-lead">{s.sub}</p>
          </RI>
          <RI i={4}>
            <div className="cover-foot">
              {s.foot.map((f, k) => (
                <span key={k}>
                  {f.k} <b>{fmt(f.v)}</b>
                </span>
              ))}
            </div>
          </RI>
          <RI i={5}>
            <div className="cover-note">{s.note}</div>
          </RI>
        </Reveal>
      );

    case "market":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="market-grid">
              {s.cards.map((c, k) => (
                <div className="mcard" key={k}>
                  <div className="big">{c.big}</div>
                  <div className="cap">{c.cap}</div>
                </div>
              ))}
            </div>
          </RI>
          <RI i={3}>
            <p
              className="market-insight"
              dangerouslySetInnerHTML={{ __html: s.insight }}
            />
          </RI>
          <RI i={4}>
            <p className="source-note">{s.source}</p>
          </RI>
        </Reveal>
      );

    case "statement":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <p className="lead">{s.body}</p>
          </RI>
        </Reveal>
      );

    case "pillars":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="grid-3">
              {s.cards.map((c, k) => (
                <div className="card" key={k}>
                  <span className="idx">{c.idx}</span>
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          </RI>
        </Reveal>
      );

    case "feature":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          {s.lead ? (
            <RI i={2}>
              <p className="lead">{s.lead}</p>
            </RI>
          ) : null}
          <RI i={3}>
            <ul className="feat-list">
              {s.items.map((it, k) => (
                <li key={k}>{fmt(it)}</li>
              ))}
            </ul>
          </RI>
        </Reveal>
      );

    case "showcase":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="gated">
              <div className="showcase">
                {s.shots.map((sh, k) => (
                  <Shot key={k} src={sh.src} cap={sh.cap} />
                ))}
              </div>
              <AdultGate label="Live product · 18+" />
            </div>
          </RI>
          <RI i={3}>
            <p className="lead" style={{ fontSize: "0.85rem" }}>
              {s.note}
            </p>
          </RI>
        </Reveal>
      );

    case "demo":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <DemoPlayer video={s.video} poster={s.poster} />
          </RI>
          <RI i={3}>
            <p className="lead" style={{ fontSize: "0.85rem" }}>
              {s.note}
            </p>
          </RI>
        </Reveal>
      );

    case "odds":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="odds-grid">
              {s.odds.map((o, k) => (
                <div className="odd" data-accent={o.accent} key={k}>
                  <span className="name">{o.name}</span>
                  <span className="pay">{o.pay}</span>
                </div>
              ))}
            </div>
          </RI>
          <RI i={3}>
            <p className="lead" style={{ fontSize: "0.9rem" }}>
              {s.note}
            </p>
          </RI>
        </Reveal>
      );

    case "split":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="split">
              {s.cols.map((c, k) => (
                <div className="col" key={k}>
                  <span className="tag">{c.tag}</span>
                  <h3>{c.h}</h3>
                  <p>{fmt(c.p)}</p>
                </div>
              ))}
            </div>
          </RI>
          {s.foot ? (
            <RI i={3}>
              <p className="lead" style={{ fontSize: "0.92rem" }}>
                {fmt(s.foot)}
              </p>
            </RI>
          ) : null}
        </Reveal>
      );

    case "stats":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          {s.lead ? (
            <RI i={2}>
              <p className="lead">{s.lead}</p>
            </RI>
          ) : null}
          <RI i={3}>
            <div className="stats">
              {s.stats.map((st, k) => (
                <div className="stat" key={k}>
                  <div className="num">{fmt(st.num)}</div>
                  <div className="lbl">{fmt(st.lbl)}</div>
                </div>
              ))}
            </div>
          </RI>
        </Reveal>
      );

    case "phases":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="phases">
              {s.items.map((p, k) => (
                <div className="phase" key={k}>
                  <span className="p-tag">{p.tag}</span>
                  <h4>{p.h}</h4>
                  <ul>
                    {p.points.map((pt, j) => (
                      <li key={j}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </RI>
        </Reveal>
      );

    case "steps":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-lg">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="steps">
              {s.steps.map((st, k) => (
                <div className="step" key={k}>
                  <h4>{st.h}</h4>
                  <p>{st.p}</p>
                </div>
              ))}
            </div>
          </RI>
        </Reveal>
      );

    case "close":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <span className="kicker">{s.kicker}</span>
          </RI>
          <RI i={1}>
            <h2 className="display d-xl">{fmt(s.title)}</h2>
          </RI>
          <RI i={2}>
            <div className="cta-row">
              {s.contacts.map((c, k) => (
                <div className="item" key={k}>
                  <span className="k">{c.k}</span>
                  <span className="v">{fmt(c.v)}</span>
                </div>
              ))}
            </div>
          </RI>
        </Reveal>
      );
  }
}

export default function PitchDeck({ operator }: { operator: string | null }) {
  const who = operator && operator.trim() ? operator.trim() : "Do not distribute";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(DECK.length - 1, i));
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRefs.current[clamped]?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root, threshold: [0.5, 0.75] },
    );
    for (const el of sectionRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      const next = ["ArrowDown", "PageDown", " ", "ArrowRight"];
      const prev = ["ArrowUp", "PageUp", "ArrowLeft"];
      if (next.includes(e.key)) {
        e.preventDefault();
        setActive((a) => {
          const n = Math.min(DECK.length - 1, a + 1);
          scrollToIndex(n);
          return n;
        });
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        setActive((a) => {
          const n = Math.max(0, a - 1);
          scrollToIndex(n);
          return n;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(DECK.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToIndex]);

  return (
    <div className="pitch-root" onContextMenu={(e) => e.preventDefault()}>
      <div className="pitch-atmos" aria-hidden="true" />
      <div className="pitch-grain" aria-hidden="true" />
      <div className="age-badge">18+</div>
      <Watermark operator={who} />

      <nav className="rail" aria-label="Slides">
        {DECK.map((_, i) => (
          <button
            key={i}
            aria-current={active === i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => {
              setActive(i);
              scrollToIndex(i);
            }}
          />
        ))}
      </nav>

      <div className="pitch-scroller" ref={scrollerRef} tabIndex={0}>
        {DECK.map((s, idx) => (
          <section
            className="slide"
            key={idx}
            data-idx={idx}
            ref={(el) => {
              sectionRefs.current[idx] = el;
            }}
          >
            <span className="slide-tag">
              <b>{String(idx + 1).padStart(2, "0")}</b> /{" "}
              {String(DECK.length).padStart(2, "0")}
            </span>
            <SlideBody s={s} />
            {s.type === "cover" ? (
              <div className="scroll-hint" aria-hidden="true">
                <span>Scroll</span>
                <span className="line" />
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
