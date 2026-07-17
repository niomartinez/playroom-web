/**
 * Simplified Chinese (zh-Hans) strings for the player UI. Keys mirror ./en.ts.
 * `{var}` placeholders are filled by the useT() interpolation in ./index.ts.
 */
const zhHans: Record<string, string> = {
  /* Main bets */
  "bet.player": "闲",
  "bet.tie": "和",
  "bet.banker": "庄",
  "bet.closed": "已封盘",

  /* Side bets */
  "bet.perfectPair": "完美对子",
  "bet.eitherPair": "任意对子",
  "bet.playerPair": "闲对",
  "bet.bankerPair": "庄对",
  "bet.placed": "已下注",
  "bet.placedShort": "已下注",

  /* Player counts */
  "players.one": "{count} 位玩家",
  "players.many": "{count} 位玩家",

  /* Balance bar */
  "balance.label": "余额",
  "balance.clearBets": "清除下注",
  "balance.chipAria": "{amount} 筹码",

  /* Round-status pill (PlayerHeader) */
  "status.waiting": "等待中",
  "status.placeBets": "请下注",
  "status.placeBetsCountdown": "请下注（{seconds}秒）",
  "status.dealing": "发牌中",
  "status.result": "结果",
  "status.live": "直播",

  /* Header */
  "header.liveBaccarat": "真人百家乐",
  "header.noRound": "暂无局",
  "header.round": "第 {n} 局",
  "header.language": "语言",

  /* Deal visualizer banner */
  "viz.placeBets": "请下注",
  "viz.placeBetsCountdown": "请下注  {seconds}秒",
  "viz.noMoreBets": "停止下注",
  "viz.dealing": "发牌中",
  "viz.result": "结果",
  "viz.waitingNextRound": "等待下一局",
  "viz.waitingNextRoundDots": "等待下一局…",

  /* Player / banker sides */
  "side.player": "闲",
  "side.banker": "庄",
  "side.vs": "对",

  /* Results */
  "result.playerWins": "闲家胜",
  "result.bankerWins": "庄家胜",
  "result.tie": "和局",

  /* Video player */
  "video.connecting": "正在连接直播…",
  "video.reconnecting": "正在重新连接直播…",
  "video.hlsUnavailable": "HLS 直播不可用",
  "video.mute": "静音",
  "video.unmute": "取消静音",
  "video.volume": "音量",

  /* Roadmap */
  "roadmap.bigRoad": "大路",
  "roadmap.next": "预测",
  "roadmap.nextPrediction": "下局预测",
  "roadmap.player": "闲",
  "roadmap.tie": "和",
  "roadmap.banker": "庄",

  /* Live chat */
  "chat.title": "在线聊天",
  "chat.empty": "还没有消息 — 打个招呼吧！",
  "chat.placeholder": "输入消息…",
  "chat.send": "发送",
  "chat.open": "聊天",
  "chat.connecting": "连接中…",
  "chat.onlineOne": "{count} 位玩家在线",
  "chat.onlineMany": "{count} 位玩家在线",
  "chat.close": "关闭聊天",
  "chat.opacity": "聊天透明度",
  "chat.emoji": "表情",
  "chat.expand": "展开",
  "chat.collapse": "收起",
  "chat.newMessages": "{count} 条新消息",
  "chat.settings": "设置",
  "chat.screenName": "昵称",
  "chat.edit": "修改",

  /* Menu / settings hub */
  "menu.title": "菜单",
  "menu.open": "菜单",
  "menu.howToPlay": "玩法说明",
  "menu.soundVideo": "声音与视频",
  "menu.payouts": "赔付与限额",
  "menu.history": "游戏记录",
  "menu.back": "返回",
  "menu.close": "关闭",

  /* How to play */
  "howto.intro": "押注“闲家”或“庄家”哪一方点数最接近 9，也可以押“和”。",
  "howto.valuesTitle": "点数计算",
  "howto.values": "A = 1，2–9 为面值，10 和人头牌 = 0。只取总和的个位数（7 + 8 = 15 → 5）。",
  "howto.flowTitle": "回合流程",
  "howto.flow": "下注时间内进行下注。闲家与庄家各发两张牌，必要时自动补第三张，最接近 9 者获胜。",
  "howto.thirdTitle": "第三张牌",
  "howto.third": "补牌规则由荷官自动执行，您无需操作。",
  "howto.tipsTitle": "小提示",
  "howto.tips": "庄家获胜需缴 5% 佣金。边注（对子、奖金）为可选高赔率玩法。",

  /* Payouts & limits */
  "pay.bet": "投注",
  "pay.payout": "赔付",
  "pay.limitsTitle": "台桌限额",
  "pay.min": "最低",
  "pay.max": "最高",
  "pay.player": "闲家",
  "pay.banker": "庄家",
  "pay.bankerNote": "获胜收取 5% 佣金",
  "pay.tie": "和",
  "pay.playerPair": "闲对子",
  "pay.bankerPair": "庄对子",
  "pay.eitherPair": "任意对子",
  "pay.perfectPair": "完美对子",
  "pay.sideNote": "边注为可选玩法，且限制为主注的一部分。",
  "pay.unknown": "—",

  /* Sound & video */
  "sv.soundTitle": "声音",
  "sv.mute": "静音",
  "sv.unmute": "取消静音",
  "sv.volume": "音量",
  "sv.videoTitle": "视频",
  "sv.reload": "重新加载视频",
  "sv.reloadHint": "画面卡顿或延迟时重新连接。",

  /* Game history */
  "hist.empty": "暂无投注记录。",
  "hist.win": "赢",
  "hist.loss": "输",
  "hist.push": "和局退还",
  "hist.pending": "结算中",
  "hist.void": "已作废",

  /* Low balance */
  "gate.minimum": "台面最低",
  "gate.short": "还差",
  "gate.addFunds": "充值",

  /* Session / idle */
  "session.warn1": "请下注，以免被移出牌桌。",
  "session.warn2": "本局请立即下注以保留您的座位。",
  "session.expiredTitle": "会话已过期",
  "session.expiredBody": "由于长时间未操作，您已被移出牌桌。请返回站点重新加入。",
  "session.return": "返回大厅",

  /* Winners marquee */
  "winners.title": "本局赢家",

  /* Win flash */
  "win.youWon": "赢得 {amount}",

  /* Baccarat table (score cards) */
  "table.waitingBets": "等待下注…",
  "table.placeYourBets": "请下注！",
  "table.dealingCards": "发牌中…",
  "table.playerWins": "闲家胜！",
  "table.bankerWins": "庄家胜！",
  "table.tie": "和局！",
  "table.result": "结果",
  "table.player": "闲",
  "table.banker": "庄",

  /* Tips */
  "tip.send": "打赏",
  "tip.sent": "已送出！",
  "tip.sendAmount": "打赏 {amount}",
  "tip.title": "打赏荷官",
};

export default zhHans;
