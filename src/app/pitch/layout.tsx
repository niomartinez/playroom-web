import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";

// Scoped display + mono fonts. Applied only under /pitch via the wrapper
// below, so the product's global Inter theme is untouched.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Hidden from search engines and caches. The deck is unlisted and, once the
// per-operator gate lands, will also require a session to reach.
export const metadata: Metadata = {
  title: "Playroom Gaming — Operator Briefing",
  robots: { index: false, follow: false, nocache: true },
};

export default function PitchLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${plexMono.variable}`}>{children}</div>
  );
}
