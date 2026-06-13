"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Allow only same-origin paths to avoid open-redirect via ?next=https://evil.
function safeNext(raw: string | null): string {
  if (!raw) return "/studio";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/studio";
  return raw;
}

export default function StudioLogin() {
  return (
    <Suspense fallback={null}>
      <StudioLoginForm />
    </Suspense>
  );
}

function StudioLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/studio/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      // Persist the role so role-gated UI (superadmin password reset in
      // Settings) can render without exposing the httpOnly JWT.
      // Wrapped in try/catch: some in-app browsers (Messenger/Telegram
      // webviews, private mode) throw on localStorage access, which would
      // otherwise abort the handler and strand the user on this page after
      // a successful login. The role write is non-essential — navigate
      // regardless.
      const data = await res.json().catch(() => ({}));
      try {
        if (data?.role) localStorage.setItem("studioRole", data.role);
        else localStorage.removeItem("studioRole");
      } catch {
        /* storage unavailable in this browser — role UI gracefully hides */
      }
      // Re-attach the URL hash so deep links like /studio/guide#streaming-setup
      // survive the login round-trip (the proxy's ?next= carries only the path;
      // the browser keeps the fragment on this page's URL).
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      router.push(`${next}${hash}`);
    } else {
      const data = await res.json().catch(() => ({}));
      // Coerce to a string no matter what the API returns. Rendering a
      // non-string error object as a React child throws React error #31
      // and crashes the whole login page (seen in prod on failed logins).
      const raw = data?.error ?? data?.message;
      const msg =
        typeof raw === "string"
          ? raw
          : typeof raw?.message === "string"
            ? raw.message
            : "Invalid username or password";
      setError(msg);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--gold-border)] rounded-xl p-8 flex flex-col gap-5"
      >
        <h1 className="text-2xl font-bold text-[var(--gold-text)] text-center">
          Studio Login
        </h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 text-center">
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-panel-inner)] border border-[var(--text-dim)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:border-[var(--gold-text)] focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-panel-inner)] border border-[var(--text-dim)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:border-[var(--gold-text)] focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--gold-text)] text-black font-bold rounded-lg hover:brightness-110 disabled:opacity-50 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
