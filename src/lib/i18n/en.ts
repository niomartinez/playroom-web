/**
 * English strings for the player UI. Flat Record keyed by dot-namespaced ids.
 * `{var}` placeholders are filled by the useT() interpolation in ./index.ts.
 */
const en: Record<string, string> = {
  /* Main bets */
  "bet.player": "PLAYER",
  "bet.tie": "TIE",
  "bet.banker": "BANKER",
  "bet.closed": "Closed",

  /* Side bets */
  "bet.perfectPair": "PERFECT PAIR",
  "bet.eitherPair": "EITHER PAIR",
  "bet.playerPair": "PLAYER PAIR",
  "bet.bankerPair": "BANKER PAIR",
  "bet.placed": "Bet placed",
  "bet.placedShort": "PLACED",

  /* Player counts */
  "players.one": "{count} player",
  "players.many": "{count} players",

  /* Balance bar */
  "balance.label": "Balance",
  "balance.clearBets": "CLEAR BETS",
  "balance.chipAria": "{amount} chip",

  /* Round-status pill (PlayerHeader) */
  "status.waiting": "Waiting",
  "status.placeBets": "Place Bets",
  "status.placeBetsCountdown": "PLACE BETS ({seconds}s)",
  "status.dealing": "Dealing",
  "status.result": "Result",
  "status.live": "LIVE",

  /* Header */
  "header.liveBaccarat": "Live Baccarat",
  "header.noRound": "No round",
  "header.round": "Round #{n}",
  "header.language": "Language",

  /* Deal visualizer banner */
  "viz.placeBets": "PLACE BETS",
  "viz.placeBetsCountdown": "PLACE BETS  {seconds}s",
  "viz.noMoreBets": "NO MORE BETS",
  "viz.dealing": "DEALING",
  "viz.result": "RESULT",
  "viz.waitingNextRound": "WAITING FOR NEXT ROUND",
  "viz.waitingNextRoundDots": "Waiting for next round...",

  /* Player / banker sides */
  "side.player": "PLAYER",
  "side.banker": "BANKER",
  "side.vs": "VS",

  /* Results */
  "result.playerWins": "PLAYER WINS",
  "result.bankerWins": "BANKER WINS",
  "result.tie": "TIE",

  /* Video player */
  "video.connecting": "Connecting to live stream…",
  "video.reconnecting": "Reconnecting to live stream…",
  "video.hlsUnavailable": "HLS stream unavailable",
  "video.mute": "Mute",
  "video.unmute": "Unmute",
  "video.volume": "Volume",

  /* Roadmap */
  "roadmap.bigRoad": "Big Road",
  "roadmap.next": "Next",
  "roadmap.nextPrediction": "Next Prediction",
  "roadmap.player": "Player",
  "roadmap.tie": "Tie",
  "roadmap.banker": "Banker",

  /* Live chat */
  "chat.title": "Live Chat",
  "chat.empty": "No messages yet — say hi!",
  "chat.placeholder": "Type a message…",
  "chat.send": "Send",
  "chat.open": "Chat",
  "chat.connecting": "Connecting...",
  "chat.onlineOne": "{count} player online",
  "chat.onlineMany": "{count} players online",
  "chat.close": "Close chat",
  "chat.opacity": "Chat opacity",
  "chat.emoji": "Emoji",

  /* Win flash */
  "win.youWon": "YOU WON {amount}",

  /* Baccarat table (score cards) */
  "table.waitingBets": "Waiting for bets...",
  "table.placeYourBets": "Place your bets!",
  "table.dealingCards": "Dealing cards...",
  "table.playerWins": "Player Wins!",
  "table.bankerWins": "Banker Wins!",
  "table.tie": "Tie!",
  "table.result": "Result",
  "table.player": "PLAYER",
  "table.banker": "BANKER",

  /* Tips */
  "tip.send": "SEND",
  "tip.sent": "SENT!",
  "tip.sendAmount": "SEND {amount}",
  "tip.title": "Send Tip to Dealer",
};

export default en;
