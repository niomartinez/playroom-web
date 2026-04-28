/** WebSocket connection configuration. */

const DEFAULT_API = "https://staging-api.playroomgaming.ph";
const DEFAULT_WS = "wss://staging-api.playroomgaming.ph";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE.replace("https://", "wss://").replace("http://", "ws://") ||
  DEFAULT_WS;

// F-06: LOBBY_API_KEY (the operator's `sk_live_*` key) is no longer
// shipped to browsers. The `/ws/lobby` connection now authenticates
// with a short-lived ticket fetched via `POST /api/lobby-ticket`. See
// `src/lib/lobby-ticket.ts` for the fetch helper and the WS hooks
// (`use-lobby-ws.ts`, `use-studio-ws.ts`) for the connect flow.
//
// The backend still accepts `?api_key=...` as a deprecated fallback
// for non-browser callers (operator integrations / bridge), but no
// browser code paths read NEXT_PUBLIC_API_KEY anymore.
