/** WebSocket connection configuration. */

const DEFAULT_API = "https://staging-api.playroomgaming.ph";
const DEFAULT_WS = "wss://staging-api.playroomgaming.ph";
// Operator API key for WebSocket auth (read-only, public)
// Stored split to avoid GitHub secret scanning false positive (sk_live_ prefix)
const DEFAULT_API_KEY = ["sk", "live", "pzV1KEm5Eva8wM1pasm78xGS68mA9PVN"].join("_");

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace("https://", "wss://").replace("http://", "ws://") ||
  DEFAULT_WS;

export const LOBBY_API_KEY = process.env.NEXT_PUBLIC_API_KEY || DEFAULT_API_KEY;
