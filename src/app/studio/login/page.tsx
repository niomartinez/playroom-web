"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudioLogin() {
  const router = useRouter();
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
      router.push("/studio");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--gold-dim)] rounded-xl p-8 flex flex-col gap-5"
      >
        <h1 className="text-2xl font-bold text-[var(--gold)] text-center">
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
          className="w-full px-4 py-3 bg-[var(--bg-panel-inner)] border border-[var(--text-dim)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:border-[var(--gold)] focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-[var(--bg-panel-inner)] border border-[var(--text-dim)] rounded-lg text-white placeholder:text-[var(--text-dim)] focus:border-[var(--gold)] focus:outline-none"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--gold)] text-black font-bold rounded-lg hover:bg-[var(--gold-bright)] disabled:opacity-50 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
