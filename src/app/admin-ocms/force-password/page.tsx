"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCMS_MIN_PASSWORD_LENGTH } from "@/lib/ocms-constants";

export default function OcmsForcePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < OCMS_MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${OCMS_MIN_PASSWORD_LENGTH} characters`
      );
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin-ocms/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (res.ok) {
        // Guard cookie is now cleared server-side; refresh so the middleware
        // re-reads it, then land on the dashboard.
        router.replace("/admin-ocms");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to change password");
      setLoading(false);
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(208,135,0,0.2)",
  } as const;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
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
          Set a New Password
        </h1>
        <p className="text-xs text-center -mt-3" style={{ color: "#6a7282" }}>
          Your password was reset. Choose a new one to continue.
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 text-center">
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="ocms-new-password"
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            New Password
          </label>
          <input
            id="ocms-new-password"
            type="password"
            placeholder={`Min ${OCMS_MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label
            htmlFor="ocms-confirm-password"
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Confirm Password
          </label>
          <input
            id="ocms-confirm-password"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder:text-[#6a7282] focus:outline-none transition"
            style={inputStyle}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-black font-bold rounded-lg disabled:opacity-50 transition hover:brightness-110"
          style={{ backgroundColor: "#f0b100" }}
        >
          {loading ? "Saving..." : "Set Password & Continue"}
        </button>
      </form>
    </main>
  );
}
