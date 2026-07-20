"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/lib/toast-context";

const inputStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
} as const;

const EXPIRY_OPTIONS = [7, 14, 30, 90];

interface PitchLinkRow {
  operator: string;
  sent_by: string | null;
  created_at: string;
  expires_at: string | null;
  expiry_label: string | null;
  status: "active" | "expired";
  token: string | null;
  token_preview: string | null;
}

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function PitchLinksPage() {
  const { toast } = useToast();
  const [operator, setOperator] = useState("");
  const [days, setDays] = useState(14);
  const [customHours, setCustomHours] = useState(""); // non-empty → overrides the day preset
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; operator: string; expiresLabel: string } | null>(null);
  const [history, setHistory] = useState<PitchLinkRow[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pitch-links");
      const d = await res.json();
      setHistory(d?.data?.links || []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function generate() {
    if (!operator.trim()) {
      toast({ type: "error", message: "Enter the operator name" });
      return;
    }
    const ch = parseInt(customHours, 10);
    const body =
      customHours.trim() && Number.isFinite(ch) && ch > 0
        ? { operator: operator.trim(), hours: ch }
        : { operator: operator.trim(), days };
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/pitch-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setResult({ url: data.url, operator: data.operator, expiresLabel: data.expiresLabel });
        // Give the audit write a beat, then refresh the history.
        setTimeout(loadHistory, 600);
      } else {
        toast({ type: "error", message: data.error || "Failed to generate link" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", message: "Link copied" });
    } catch {
      toast({ type: "error", message: "Copy failed — select the link and copy manually" });
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Pitch links</h1>
          <p className="text-sm mt-1" style={{ color: "#99a1af" }}>
            Generate a private, expiring link to the operator pitch deck. The
            operator name becomes the watermark and cannot be edited by the
            recipient. The link stops working after it expires.
          </p>
        </div>

        <div
          className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
        >
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Operator name (watermark)
            </label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="e.g. Time2bet"
              maxLength={60}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Expires in
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {EXPIRY_OPTIONS.map((d) => {
                const active = !customHours.trim() && days === d;
                return (
                  <button
                    key={d}
                    onClick={() => { setDays(d); setCustomHours(""); }}
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                    style={{
                      backgroundColor: active ? "#f0b100" : "#0a0a0a",
                      color: active ? "#000" : "#e5e7eb",
                      border: "1px solid #262626",
                    }}
                  >
                    {d} days
                  </button>
                );
              })}
              <span className="text-xs" style={{ color: "#4b5563" }}>or</span>
              <input
                type="number"
                min={1}
                max={2160}
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="custom hrs"
                className="w-28 rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{
                  ...inputStyle,
                  border: customHours.trim() ? "1px solid #f0b100" : "1px solid #262626",
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
              Custom hours override the preset. Max 2160 h (90 days).
            </p>
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "#f0b100" }}
          >
            {busy ? "Generating…" : "Generate link"}
          </button>
        </div>

        {result && (
          <div
            className="rounded-xl p-6 space-y-3"
            style={{ backgroundColor: "#171717", border: "1px solid rgba(5,223,114,0.3)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#05df72" }}>
              Link for {result.operator} · expires in {result.expiresLabel}
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={result.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={inputStyle}
              />
              <button
                onClick={() => copy(result.url)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
                style={{ backgroundColor: "#05df72" }}
              >
                Copy
              </button>
            </div>
            <p className="text-xs" style={{ color: "#6a7282" }}>
              Send this to the operator. Anyone with the link can view the deck
              until it expires — the watermark carries {result.operator}.
            </p>
          </div>
        )}
      </div>

      {/* History + statuses of previously minted pitch links */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Sent links</h2>
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #1f1f1f" }}>
            <table className="w-full text-xs" style={{ color: "#d1d5db" }}>
              <thead style={{ color: "#6b7280" }}>
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Operator</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Link</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Sent by</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Valid for</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Sent</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Expires</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #1a1a1a" }}>
                    <td className="px-3 py-2 whitespace-nowrap">{h.operator}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: "#9ca3af" }}>
                      {h.token_preview || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span style={{ color: h.status === "active" ? "#6ee7b7" : "#9ca3af" }}>
                        ● {h.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{h.sent_by || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{h.expiry_label || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(h.created_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(h.expires_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {h.token ? (
                        <button
                          onClick={() => copy(`${window.location.origin}/pitch?t=${h.token}`)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: "#1f2937", color: "#e5e7eb" }}
                        >
                          Copy link
                        </button>
                      ) : (
                        <span style={{ color: "#4b5563" }} title="expired — no longer works">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
