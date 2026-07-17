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
  "chat.expand": "Expand",
  "chat.collapse": "Collapse",
  "chat.newMessages": "{count} new messages",
  "chat.settings": "Settings",
  "chat.screenName": "Screen name",
  "chat.edit": "Edit",

  /* Menu / settings hub */
  "menu.title": "Menu",
  "menu.open": "Menu",
  "menu.howToPlay": "How to Play",
  "menu.soundVideo": "Sound & Video",
  "menu.payouts": "Payouts & Limits",
  "menu.history": "Game History",
  "menu.back": "Back",
  "menu.close": "Close",

  /* How to play */
  "howto.intro": "Bet on whether the Player or Banker hand will total closest to 9. You can also bet on a Tie.",
  "howto.valuesTitle": "Card values",
  "howto.values": "Ace = 1, cards 2–9 = face value, 10s and face cards = 0. Only the last digit of the total counts (7 + 8 = 15 → 5).",
  "howto.flowTitle": "How a round works",
  "howto.flow": "Place bets while betting is open. Two cards go to Player and Banker; a third may be drawn automatically. Closest to 9 wins.",
  "howto.thirdTitle": "Third card",
  "howto.third": "Third-card rules are applied automatically by the dealer — nothing for you to do.",
  "howto.tipsTitle": "Good to know",
  "howto.tips": "Banker wins pay a 5% commission. Side bets (pairs, bonuses) are optional long-shots with bigger payouts.",

  /* Payouts & limits */
  "pay.bet": "Bet",
  "pay.payout": "Payout",
  "pay.limitsTitle": "Table limits",
  "pay.min": "Min",
  "pay.max": "Max",
  "pay.player": "Player",
  "pay.banker": "Banker",
  "pay.bankerNote": "5% commission on wins",
  "pay.tie": "Tie",
  "pay.playerPair": "Player Pair",
  "pay.bankerPair": "Banker Pair",
  "pay.eitherPair": "Either Pair",
  "pay.perfectPair": "Perfect Pair",
  "pay.sideNote": "Side bets are optional and capped at a share of your main bet.",
  "pay.unknown": "—",

  /* Sound & video */
  "sv.soundTitle": "Sound",
  "sv.mute": "Mute",
  "sv.unmute": "Unmute",
  "sv.volume": "Volume",
  "sv.videoTitle": "Video",
  "sv.reload": "Reload stream",
  "sv.reloadHint": "Reconnect if the video stalls or falls behind.",

  /* Game history */
  "hist.empty": "No bets yet.",
  "hist.win": "Win",
  "hist.loss": "Loss",
  "hist.push": "Push",
  "hist.pending": "Pending",
  "hist.void": "Void",

  /* Low balance */
  "low.title": "Low Balance",
  "low.body": "Your balance is below the minimum bet ({min}). Please deposit to keep playing.",
  "low.close": "Close",

  /* Session / idle */
  "session.warn1": "Please place bets to avoid being removed from the table.",
  "session.warn2": "Place a bet now to keep your seat this round.",
  "session.expiredTitle": "Session Expired",
  "session.expiredBody": "You were removed from the table for inactivity. Please return to the site to rejoin.",
  "session.return": "Return to lobby",

  /* Winners marquee */
  "winners.title": "Winners",

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
