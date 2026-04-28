/** WebSocket connection configuration. */

import { requireClientEnv } from "./client-env";

const DEFAULT_API = "https://staging-api.playroomgaming.ph";
const DEFAULT_WS = "wss://staging-api.playroomgaming.ph";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace("https://", "wss://").replace("http://", "ws://") ||
  DEFAULT_WS;

// Operator API key for WebSocket lobby auth. Must be provided via env in any
// non-development environment — F-02 removed the hardcoded sk_live fallback.
// F-06 will replace this browser-shipped operator key with per-session lobby
// tickets; until then, the value still ends up in the client bundle (read-only
// scope) and the dev fallback is a non-secret placeholder.
export const LOBBY_API_KEY = requireClientEnv(
  "NEXT_PUBLIC_API_KEY",
  "dev-api-key"
);
