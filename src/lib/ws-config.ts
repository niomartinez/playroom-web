/** WebSocket connection configuration. */

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL
    ?.replace("https://", "wss://")
    .replace("http://", "ws://") ||
  "ws://localhost:8001";
// force rebuild 1774964671
