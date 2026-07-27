import { Suspense } from "react";
import { notFound } from "next/navigation";

import { isProdEnv } from "@/lib/server-env";
import EmbedHarness from "./EmbedHarness";

/**
 * QA harness: the player UI inside a fake operator page.
 *
 * The mobile layout bugs we keep chasing only exist INSIDE an operator's site.
 * On a phone, the visible height is the screen minus the browser's URL bar and
 * toolbar, minus the operator's own navigation, minus whatever their iframe
 * sizing gets wrong — and none of that is reproducible by opening /play
 * directly. Testing there is why "it fits" and "the player is still scrolling"
 * were both true at the same time.
 *
 * This page reproduces the GameSpot/OCMS embed on a real device: an operator
 * nav bar of a given height, then the game in an iframe, with the two iframe
 * sizing modes operators actually ship (see `mode` below).
 *
 * STAGING ONLY — 404s against the prod backend, same rule as the other
 * test-only surfaces.
 *
 * NOT identical to the real thing in one respect: here the operator page and
 * the game are the SAME origin, so the launch cookie is first-party. The real
 * embed is cross-site. Use this for LAYOUT; use a real operator launch for
 * session/cookie behaviour.
 */
export default async function QaEmbedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (isProdEnv()) notFound();

  const params = await searchParams;
  const one = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  return (
    <Suspense fallback={null}>
      <EmbedHarness
        token={one("token") ?? ""}
        game={one("game") ?? "TEST-BAC-TABLE-01"}
        lang={one("lang") ?? "en"}
        nav={Number(one("nav") ?? 52)}
        mode={one("mode") === "vh" ? "vh" : "fill"}
        debug={one("debug") === "1"}
      />
    </Suspense>
  );
}
