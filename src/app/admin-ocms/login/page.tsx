"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OcmsLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin-ocms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Wire field stays `email` for backend compatibility; it accepts
        // either a username or an email address.
        body: JSON.stringify({ email: identifier.trim(), password }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        router.push(
          data.must_change_password
            ? "/admin-ocms/force-password"
            : "/admin-ocms"
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Login failed");
      setLoading(false);
    } catch {
      setError("Network error - please try again.");
      setLoading(false);
    }
  }

  return (
    // `min-h-[100dvh]` (not `h-screen`) so iOS Safari's collapsing address bar
    // does not clip the card, and `m-auto` on the form rather than
    // `items-center` so the card falls back to the top - instead of overflowing
    // above it - when the on-screen keyboard shrinks the viewport.
    <main
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="m-auto w-full max-w-sm rounded-xl p-8 max-md:p-6 flex flex-col gap-5"
        style={{
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          border: "1px solid rgba(208,135,0,0.3)",
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img
            src="/logo.png"
            alt="Playroom Gaming"
            className="h-12 object-contain"
          />
        </div>

        <h1
          className="text-2xl font-bold text-center"
          style={{ color: "#f0b100" }}
        >
          Partner Portal
        </h1>
        <p className="text-xs text-center -mt-3" style={{ color: "#6a7282" }}>
          Back-office access for partner staff
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 text-center">
            {error}
          </p>
        )}

        {/* Mobile: 44px touch height, and `text-base` keeps the field at 16px
            so iOS Safari does not auto-zoom the form on focus. */}
        <div>
          <label
            htmlFor="ocms-identifier"
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Username or Email
          </label>
          <input
            id="ocms-identifier"
            type="text"
            placeholder="username or you@example.com"
            autoComplete="username"
            autoFocus
            spellCheck={false}
            autoCapitalize="none"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition max-md:min-h-[44px] max-md:text-base"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
            required
          />
        </div>

        <div>
          <label
            htmlFor="ocms-password"
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Password
          </label>
          <input
            id="ocms-password"
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition max-md:min-h-[44px] max-md:text-base"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-black font-bold rounded-lg disabled:opacity-50 transition hover:brightness-110 max-md:min-h-[44px]"
          style={{ backgroundColor: "#f0b100" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
