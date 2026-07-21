import { Suspense } from "react";
import { notFound } from "next/navigation";
import PlayerLayout from "@/components/player/PlayerLayout";
import DemoWrapper from "./DemoWrapper";

export default function DemoPage() {
  // DECOMMISSIONED (2026-07-22). Demo played the live stream WITHOUT a session
  // token — a tokenless free-watch bypass of the idle stream-cut. Now 404 on
  // ALL environments. Code kept for reference; real players use /play with a
  // minted session token.
  notFound();

  return (
    // DemoWrapper reads the ?lang= param via useSearchParams, which requires a
    // Suspense boundary during prerender.
    <Suspense fallback={null}>
      <DemoWrapper>
        <PlayerLayout />
      </DemoWrapper>
    </Suspense>
  );
}
