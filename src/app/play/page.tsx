import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PlayerLayout from "@/components/player/PlayerLayout";
import GameWrapper from "./GameWrapper";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

/**
 * F-10: the player session token is not kept in the URL after first load.
 * The operator launches us with `?token=...`; we stash it in an HttpOnly
 * cookie and re-render on a clean URL, so the token stops leaking via the
 * address bar, history, Referer and server access logs.
 *
 * That cookie is a THIRD-PARTY cookie whenever an operator iframes us
 * (gamespot88.com → app.playroomgaming.ph). Chrome keeps it because we set
 * `SameSite=None; Partitioned` (CHIPS). WebKit — every browser on iOS, plus
 * desktop Safari — blocks third-party cookie writes outright and does not
 * implement CHIPS, so the cookie silently vanished and the player landed on
 * a token-less /play: "Session Required. Please launch the game from your
 * operator lobby." Relaunching just repeated it. (e2e/proof/iframe-launch
 * .spec.ts reproduces this on both engines.)
 *
 * So we PROVE the cookie stuck before trusting it:
 *
 *   1. `?token=X`             → /api/play/handoff sets the cookie and returns
 *                               to /play with `ck=1` AND the token still on
 *                               the URL — the probe.
 *   2. `?token=X&ck=1`
 *        cookie === X         → the cookie is real. Redirect once to the
 *                               clean URL; from there it's the F-10 flow,
 *                               byte for byte.
 *        cookie missing/stale → the browser refused it. Run "cookieless":
 *                               keep the token on the (iframe-internal) URL
 *                               and have the client send it as
 *                               `X-Session-Token` on every /api call.
 *   3. no `?token=`           → normal load, read the cookie.
 *
 * Cookieless is a deliberate, narrowed regression of F-10: only browsers
 * that block the cookie keep a token in the URL, and only inside the
 * operator's iframe, where that URL is never displayed. Next's default
 * `strict-origin-when-cross-origin` Referrer-Policy still keeps the query
 * string out of cross-origin Referer headers.
 *
 * Demo mode (`/play/demo`) doesn't go through this path.
 */
export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const urlToken = typeof params.token === "string" ? params.token : null;
  const gameId = typeof params.game === "string" ? params.game : null;
  const lang = typeof params.lang === "string" ? params.lang : "en";
  const lobbyUrl = typeof params.lobbyUrl === "string" ? params.lobbyUrl : null;
  const cashierUrl =
    typeof params.cashierUrl === "string" ? params.cashierUrl : null;
  // Set by the handoff bounce: "this browser has already been offered the
  // cookie once" — which is what makes a missing cookie below conclusive
  // rather than merely "first load".
  const probed = params.ck === "1";

  // Everything except the token + probe marker, preserved across the hops.
  const cleanQuery = new URLSearchParams();
  if (gameId) cleanQuery.set("game", gameId);
  if (lang) cleanQuery.set("lang", lang);
  if (lobbyUrl) cleanQuery.set("lobbyUrl", lobbyUrl);
  if (cashierUrl) cleanQuery.set("cashierUrl", cashierUrl);
  const cleanPath = `/play${cleanQuery.toString() ? `?${cleanQuery.toString()}` : ""}`;

  // Hop 1 — first load with `?token=...`: go set the cookie, then come back
  // here with the token still attached so hop 2 can see whether it stuck.
  if (urlToken && !probed) {
    const probeQuery = new URLSearchParams(cleanQuery);
    probeQuery.set("ck", "1");
    probeQuery.set("token", urlToken);

    const handoffParams = new URLSearchParams();
    handoffParams.set("token", urlToken);
    handoffParams.set("ret", `/play?${probeQuery.toString()}`);

    redirect(`/api/play/handoff?${handoffParams.toString()}`);
  }

  const jar = await cookies();
  const cookieToken = jar.get(PLAYER_SESSION_COOKIE)?.value ?? null;

  // Hop 2 — did the cookie survive the round trip?
  if (urlToken) {
    // It must match the token we just wrote. A cookie that merely EXISTS is
    // not enough: a stale one left from an earlier session would otherwise
    // hijack this launch and seat the player on the wrong session.
    if (cookieToken === urlToken) {
      redirect(cleanPath);
    }
    return (
      <GameWrapper
        token={urlToken}
        cookieless
        gameId={gameId}
        lang={lang}
        lobbyUrl={lobbyUrl}
        cashierUrl={cashierUrl}
      >
        <PlayerLayout />
      </GameWrapper>
    );
  }

  // Steady state — the token lives in the HttpOnly cookie.
  return (
    <GameWrapper
      token={cookieToken}
      gameId={gameId}
      lang={lang}
      lobbyUrl={lobbyUrl}
      cashierUrl={cashierUrl}
    >
      <PlayerLayout />
    </GameWrapper>
  );
}
