import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isProdEnv } from "@/lib/server-env";
import PlayerLayout from "@/components/player/PlayerLayout";
import DemoWrapper from "./DemoWrapper";

export default function DemoPage() {
  // Demo plays the live stream WITHOUT a session token, so on prod it's a
  // tokenless free-watch bypass of the idle stream-cut (the MediaMTX shim
  // fail-opens on no token, so a demo viewer is un-kickable). Test-only: 404
  // on production. Real players use /play with a minted session token.
  if (isProdEnv()) notFound();

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
