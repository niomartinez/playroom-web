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

/**
 * Renders {{placeholder}} as a gold "fill me in" chip and [[emphasis]]
 * as an italic gold accent inside a headline. Everything else is plain.
 */
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

function SlideBody({ s }: { s: Slide }) {
  switch (s.type) {
    case "cover":
      return (
        <Reveal className="slide-inner stack">
          <RI i={0}>
            <div className="cover-brand">
              <span>{s.brand[0]}</span>
              <span className="dot">.</span>
              <span className="thin">{s.brand[1]}</span>
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

  // Track which slide is centered for the progress rail.
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

  // Keyboard navigation + print/save deterrent hardening.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Deterrent hardening: block quick save / print.
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
