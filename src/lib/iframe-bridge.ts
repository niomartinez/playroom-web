/** iframe postMessage bridge for operator integration. */

const isInIframe =
  typeof window !== "undefined" && window !== window.parent;

export function sendToParent(event: string, data?: unknown) {
  if (!isInIframe) return;
  window.parent.postMessage({ type: "PLAYROOM", event, data }, "*");
}

export function onParentMessage(
  handler: (event: string, data: unknown) => void,
) {
  if (typeof window === "undefined") return () => {};
  const listener = (e: MessageEvent) => {
    if (e.data?.type === "PLAYROOM") {
      handler(e.data.event, e.data.data);
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

// Standard events:
// sendToParent("gameReady")
// sendToParent("closeGame")
// sendToParent("openCashier")
// sendToParent("balanceUpdate", { balance: 1000 })
// sendToParent("gameError", { code: "SESSION_EXPIRED" })
