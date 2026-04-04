"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
    setLoading(false);
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-5"
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
            alt="Play Room Gaming"
            className="h-12 object-contain"
          />
        </div>

        <h1
          className="text-2xl font-bold text-center"
          style={{ color: "#f0b100" }}
        >
          Admin Login
        </h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 text-center">
            {error}
          </p>
        )}

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Email
          </label>
          <input
            type="email"
            placeholder="admin@playroom.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
            required
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition"
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
          className="w-full py-3 text-black font-bold rounded-lg disabled:opacity-50 transition hover:brightness-110"
          style={{ backgroundColor: "#f0b100" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
