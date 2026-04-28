import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PlayerLayout from "@/components/player/PlayerLayout";
import GameWrapper from "./GameWrapper";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

/**
 * F-10: Player session token is no longer kept in the URL after first
 * load. The operator launches the player with `?token=...&...`. This
 * Server Component:
 *
 *   1. If `?token=...` is present:
 *        - Build a "clean" version of the URL with everything EXCEPT
 *          `token` preserved (game, lang, lobbyUrl, cashierUrl, ...).
 *        - Redirect (302) to /api/play/handoff?token=...&ret=<clean>.
 *          The handoff route stashes the token in an HttpOnly cookie
 *          and bounces back to <clean>. From there, the URL bar +
 *          history + Referer headers no longer carry the token.
 *
 *   2. If no `?token=...`:
 *        - Read the token from the `prg_session` cookie and pass it
 *          down to GameWrapper (client) just like before.
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

  // First load with `?token=...` — hand off to the cookie-setting route.
  if (urlToken) {
    const cleanQuery = new URLSearchParams();
    if (gameId) cleanQuery.set("game", gameId);
    if (lang) cleanQuery.set("lang", lang);
    if (lobbyUrl) cleanQuery.set("lobbyUrl", lobbyUrl);
    if (cashierUrl) cleanQuery.set("cashierUrl", cashierUrl);
    const cleanRet = `/play${cleanQuery.toString() ? `?${cleanQuery.toString()}` : ""}`;

    const handoffParams = new URLSearchParams();
    handoffParams.set("token", urlToken);
    handoffParams.set("ret", cleanRet);

    redirect(`/api/play/handoff?${handoffParams.toString()}`);
  }

  // Subsequent loads — read token from the HttpOnly cookie.
  const jar = await cookies();
  const cookieToken = jar.get(PLAYER_SESSION_COOKIE)?.value ?? null;

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
