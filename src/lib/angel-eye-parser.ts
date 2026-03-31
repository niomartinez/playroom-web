/**
 * Angel Eye II-EX Protocol Parser (TypeScript)
 *
 * Ported from angel_bridge.py. Parses the binary serial protocol
 * from the Angel Eye baccarat card-reading shoe.
 *
 * Protocol: ENQ(05h) + SeqCt(1 byte) + Data(variable) + ETX(03h) + BCC(2 bytes)
 * Data types:
 *   'S' (53h) = Communication start (shoe boot/reset)
 *   'P' (50h) = Standby (between rounds)
 *   'G' (47h) = Game result (1 byte: outcome + pairs)
 *   'D' (44h) = Card dealt (2 bytes: intention + card)
 *   'R' (52h) = Re-deal
 *   'E' (45h) = Error
 *   'e' (65h) = Error cancelled
 *   'd' (64h) = Card dealt outside game flow
 */

// --- Protocol Constants ---
const ENQ = 0x05;
const ETX = 0x03;

const CMD_START = 0x53;    // 'S'
const CMD_STANDBY = 0x50;  // 'P'
const CMD_RESULT = 0x47;   // 'G'
const CMD_DEAL = 0x44;     // 'D'
const CMD_DEAL_OUT = 0x64; // 'd'
const CMD_REDEAL = 0x52;   // 'R'
const CMD_ERROR = 0x45;    // 'E'
const CMD_ERROR_CANCEL = 0x65; // 'e'

// --- Card Decoding ---

/** Suit from bits 6-4 of card byte */
const SUIT_MAP: Record<number, string | null> = {
  0b000: null,
  0b001: "D", // Diamond
  0b010: "C", // Club
  0b011: "S", // Spade
  0b100: "H", // Heart
};

/** Rank from bits 3-0 of card byte */
const RANK_MAP: Record<number, string | null> = {
  0: null, 1: "A", 2: "2", 3: "3", 4: "4", 5: "5",
  6: "6", 7: "7", 8: "8", 9: "9", 10: "T",
  11: "J", 12: "Q", 13: "K",
};

/** Baccarat card values */
const CARD_VALUES: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, T: 0, J: 0, Q: 0, K: 0,
};

function decodeCard(cardByte: number): string | null {
  const suitBits = (cardByte >> 4) & 0b111;
  const rankBits = cardByte & 0b1111;
  const suit = SUIT_MAP[suitBits];
  const rank = RANK_MAP[rankBits];
  if (!suit || !rank) return null;
  return `${rank}${suit}`;
}

function decodeIntention(intentionByte: number): "player" | "banker" | "unknown" {
  const direction = (intentionByte >> 4) & 0b111;
  if (direction === 0b000) return "player";
  if (direction === 0b001) return "banker";
  return "unknown";
}

function decodeResult(resultByte: number): {
  outcome: "Player" | "Banker" | "Tie" | null;
  playerPair: boolean;
  bankerPair: boolean;
} {
  const outcomeBits = (resultByte >> 4) & 0b111;
  const pairBits = resultByte & 0b11;

  const outcomeMap: Record<number, "Player" | "Banker" | "Tie" | null> = {
    0b001: "Player",
    0b010: "Tie",
    0b100: "Banker",
    0b111: null, // forced exit
  };

  return {
    outcome: outcomeMap[outcomeBits] ?? null,
    playerPair: pairBits === 0b01 || pairBits === 0b11,
    bankerPair: pairBits === 0b10 || pairBits === 0b11,
  };
}

function cardScore(card: string): number {
  if (!card || card.length < 2) return 0;
  return CARD_VALUES[card.slice(0, -1)] ?? 0;
}

function handScore(cards: string[]): number {
  return cards.reduce((sum, c) => sum + cardScore(c), 0) % 10;
}

// --- Event Types ---

export type AngelEyeEvent =
  | { type: "start" }
  | { type: "standby" }
  | { type: "card_dealt"; side: "player" | "banker"; card: string; playerCards: string[]; bankerCards: string[]; playerScore: number; bankerScore: number }
  | { type: "result"; outcome: "Player" | "Banker" | "Tie"; playerCards: string[]; bankerCards: string[]; playerScore: number; bankerScore: number; playerPair: boolean; bankerPair: boolean; roundNumber: number }
  | { type: "redeal" }
  | { type: "error" }
  | { type: "error_cancel" }
  | { type: "forced_exit" };

// --- Parser State Machine ---

export class AngelEyeParser {
  private playerCards: string[] = [];
  private bankerCards: string[] = [];
  private roundCount = 0;
  private lastSeq: number | null = null;
  private lastCmd: number | null = null;

  // Byte buffer for streaming serial data
  private buffer: number[] = [];
  private state: "idle" | "reading" = "idle";

  /** Feed raw bytes from Web Serial. Returns events parsed from the data. */
  feed(chunk: Uint8Array): AngelEyeEvent[] {
    const events: AngelEyeEvent[] = [];

    for (const byte of chunk) {
      if (this.state === "idle") {
        if (byte === ENQ) {
          this.state = "reading";
          this.buffer = [];
        }
        // Skip bytes until ENQ
      } else {
        this.buffer.push(byte);

        // Check if we have ETX + 2 BCC bytes
        // Find ETX position
        const etxIdx = this.buffer.indexOf(ETX);
        if (etxIdx >= 0 && this.buffer.length >= etxIdx + 3) {
          // We have: [seq, ...data, ETX, BCC1, BCC2]
          const seqNum = this.buffer[0];
          const data = this.buffer.slice(1, etxIdx);
          // BCC bytes consumed but not validated (same as Python bridge)

          const event = this.processFrame(seqNum, data);
          if (event) events.push(event);

          this.state = "idle";
          this.buffer = [];
        }

        // Safety: if buffer gets too large without ETX, reset
        if (this.buffer.length > 64) {
          this.state = "idle";
          this.buffer = [];
        }
      }
    }

    return events;
  }

  /** Reset parser state (e.g., on reconnect) */
  reset(): void {
    this.playerCards = [];
    this.bankerCards = [];
    this.lastSeq = null;
    this.lastCmd = null;
    this.buffer = [];
    this.state = "idle";
  }

  private processFrame(seqNum: number, data: number[]): AngelEyeEvent | null {
    if (data.length < 1) return null;

    const cmd = data[0];
    const payload = data.slice(1);

    // Deduplicate: Angel Eye sends each message 3 times
    if (seqNum === this.lastSeq && cmd === this.lastCmd) {
      return null;
    }
    this.lastSeq = seqNum;
    this.lastCmd = cmd;

    return this.processMessage(cmd, payload);
  }

  private newRound(): void {
    this.playerCards = [];
    this.bankerCards = [];
  }

  private processMessage(cmd: number, payload: number[]): AngelEyeEvent | null {
    switch (cmd) {
      case CMD_START:
        this.newRound();
        this.lastSeq = null;
        return { type: "start" };

      case CMD_STANDBY:
        this.newRound();
        return { type: "standby" };

      case CMD_DEAL: {
        if (payload.length < 2) return null;
        const side = decodeIntention(payload[0]);
        const card = decodeCard(payload[1]);
        if (!card || side === "unknown") return null;

        if (side === "player") this.playerCards.push(card);
        else this.bankerCards.push(card);

        return {
          type: "card_dealt",
          side,
          card,
          playerCards: [...this.playerCards],
          bankerCards: [...this.bankerCards],
          playerScore: handScore(this.playerCards),
          bankerScore: handScore(this.bankerCards),
        };
      }

      case CMD_RESULT: {
        if (payload.length < 1) return null;
        const result = decodeResult(payload[0]);
        if (!result.outcome) {
          this.newRound();
          return { type: "forced_exit" };
        }

        this.roundCount++;
        const event: AngelEyeEvent = {
          type: "result",
          outcome: result.outcome,
          playerCards: [...this.playerCards],
          bankerCards: [...this.bankerCards],
          playerScore: handScore(this.playerCards),
          bankerScore: handScore(this.bankerCards),
          playerPair: result.playerPair,
          bankerPair: result.bankerPair,
          roundNumber: this.roundCount,
        };

        this.newRound();
        return event;
      }

      case CMD_REDEAL:
        this.newRound();
        return { type: "redeal" };

      case CMD_ERROR:
        return { type: "error" };

      case CMD_ERROR_CANCEL:
        return { type: "error_cancel" };

      case CMD_DEAL_OUT:
        // Card dealt outside game flow — ignore
        return null;

      default:
        return null;
    }
  }
}
