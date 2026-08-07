"use client";

import { useState } from "react";

/**
 * Break-glass unlock form.
 *
 * Reachable from any network (exempted from the IP gate in proxy.ts) because
 * the person who needs it is, by definition, on a blocked address — a phone on
 * mobile data, a rotated home connection, a hotel.
 *
 * Deliberately plain: no nav, no data, no session. It holds one field, and
 * everything it can lead to is still behind the normal admin login.
 */
export default function UnlockPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ip: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ ip: json.ip || "" });
        setCode("");
      } else {
        setError(json.error || `Could not unlock (${res.status}).`);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <h1 className="text-xl font-bold text-white">Unlock this device</h1>

        {done ? (
          <>
            <p className="mt-3 text-sm" style={{ color: "#05df72" }}>
              Unlocked for 8 hours{done.ip ? ` from ${done.ip}` : ""}.
            </p>
            {/* The point of the unlock is to fix the cause, not to live in it.
                This link is the next step, not a nicety. */}
            <p className="mt-3 text-sm" style={{ color: "#99a1af" }}>
              Now add{" "}
              <code style={{ color: "#f0b100" }}>{done.ip || "this IP"}</code> in{" "}
              <a href="/admin/ip-allowlist" style={{ color: "#f0b100" }}>
                IP Allowlist
              </a>{" "}
              so the next person on this connection is not locked out — this
              unlock expires, the allowlist entry does not.
            </p>
            <a
              href="/admin"
              className="mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-black w-full min-h-[44px]"
              style={{ backgroundColor: "#f0b100" }}
            >
              Continue to the panel
            </a>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm" style={{ color: "#99a1af" }}>
              Your network is not on the allowlist. The break-glass code lets
              this device through the network check — you will still need to log
              in normally.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Break-glass code"
                autoComplete="off"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none min-h-[44px]"
                style={{
                  backgroundColor: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(208,135,0,0.2)",
                  fontFamily: "ui-monospace, monospace",
                }}
              />
              {error && (
                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: "rgba(251,44,54,0.1)",
                    color: "#fb2c36",
                    border: "1px solid rgba(251,44,54,0.3)",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 min-h-[44px]"
                style={{ backgroundColor: "#f0b100" }}
              >
                {busy ? "Checking…" : "Unlock"}
              </button>
            </form>
            <p className="mt-4 text-xs" style={{ color: "#6a7282" }}>
              Every attempt is logged with its IP, successful or not.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
