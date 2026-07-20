"use client";

import { useState } from "react";
import { useToast } from "@/lib/toast-context";

const inputStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
} as const;

const EXPIRY_OPTIONS = [7, 14, 30, 90];

export default function PitchLinksPage() {
  const { toast } = useToast();
  const [operator, setOperator] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; operator: string; expiresInDays: number } | null>(null);

  async function generate() {
    if (!operator.trim()) {
      toast({ type: "error", message: "Enter the operator name" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/pitch-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: operator.trim(), days }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setResult({ url: data.url, operator: data.operator, expiresInDays: data.expiresInDays });
      } else {
        toast({ type: "error", message: data.error || "Failed to generate link" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      toast({ type: "success", message: "Link copied" });
    } catch {
      toast({ type: "error", message: "Copy failed — select the link and copy manually" });
    }
  }

  return (
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
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: days === d ? "#f0b100" : "#0a0a0a",
                  color: days === d ? "#000" : "#e5e7eb",
                  border: "1px solid #262626",
                }}
              >
                {d} days
              </button>
            ))}
          </div>
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
            Link for {result.operator} · expires in {result.expiresInDays} days
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
              onClick={copy}
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
  );
}
