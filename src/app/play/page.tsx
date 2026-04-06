import PlayerLayout from "@/components/player/PlayerLayout";
import GameWrapper from "./GameWrapper";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const token = (typeof params.token === "string" ? params.token : null);
  const gameId = (typeof params.game_id === "string" ? params.game_id : null);
  const lang = (typeof params.lang === "string" ? params.lang : "en");
  const lobbyUrl = (typeof params.lobby_url === "string" ? params.lobby_url : null);
  const cashierUrl = (typeof params.cashier_url === "string" ? params.cashier_url : null);

  return (
    <GameWrapper
      token={token}
      gameId={gameId}
      lang={lang}
      lobbyUrl={lobbyUrl}
      cashierUrl={cashierUrl}
    >
      <PlayerLayout />
    </GameWrapper>
  );
}
