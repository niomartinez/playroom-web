"use client";

import { useEffect, useRef, useState } from "react";

/*
 * i18n FOLLOW-UP: all copy in this file is hard-coded English. The i18n
 * scaffold (English + zh-Hans) is owned by the other FE agent — once it
 * lands, replace the literal strings below (labels, helper text, errors,
 * buttons) with translation lookups. Search for `// i18n:` markers.
 */

/** Charset contract shared with the backend: 3–16 of [A-Za-z0-9_]. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export interface UsernameModalProps {
  /**
   * Pre-fill value — the player's current (auto-generated) display name.
   * This is only a suggestion; the player may overwrite it.
   */
  initialName: string;
  /**
   * Blocking mode (default). When true the modal is a hard gate: there is
   * no close affordance and no backdrop-dismiss — the player MUST pick a
   * name. Used on first login (display_name_set === false).
   *
   * When false the modal is a normal, dismissible "change name" dialog
   * (reused later from PlayerHeader — wiring owned by the other FE agent).
   */
  blocking?: boolean;
  /** Called with the confirmed display_name after a successful save. */
  onSuccess: (displayName: string) => void;
  /** Only used in non-blocking mode (dismiss without saving). */
  onClose?: () => void;
}

type BackendError = {
  message?: string;
  detail?: string | { msg?: string }[];
  error?: string;
};

function extractErrorMessage(data: BackendError, status: number): string {
  // Try the common FastAPI / app shapes in priority order.
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof data?.detail === "string" && data.detail) return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
    return data.detail[0].msg as string;
  }
  if (typeof data?.error === "string" && data.error) return data.error;
  // i18n: fallback copy
  if (status === 409) return "That name is already taken.";
  if (status === 400 || status === 422) return "That name is not allowed.";
  return "Could not save your name. Please try again.";
}

export default function UsernameModal({
  initialName,
  blocking = true,
  onSuccess,
  onClose,
}: UsernameModalProps) {
  const [value, setValue] = useState(initialName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus + select the pre-filled name so overwriting is one keystroke.
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const trimmed = value.trim();
  const clientValid = USERNAME_PATTERN.test(trimmed);
  // Only show the charset hint as an error once the user has typed something
  // that is non-empty but invalid — avoids yelling at an empty field.
  const showCharsetError = trimmed.length > 0 && !clientValid;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setServerError(null);
    if (!clientValid || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/me/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      // Backend uses BaseResponse: { error_code, message, data }. App-level
      // rejections (name taken / reserved / invalid) come back as HTTP 200 with
      // error_code != "0", so gating on res.ok alone treats failures as success.
      const json = (await res.json().catch(() => ({}))) as BackendError & {
        error_code?: string;
        message?: string;
        data?: { display_name?: string };
      };
      const failed = !res.ok || (json.error_code != null && json.error_code !== "0");
      if (failed) {
        const msg =
          typeof json.message === "string" && json.message
            ? json.message
            : extractErrorMessage(json, res.status);
        setServerError(msg);
        return;
      }
      const displayName =
        typeof json.data?.display_name === "string"
          ? json.data.display_name
          : trimmed;
      onSuccess(displayName);
    } catch {
      // i18n: network fallback copy
      setServerError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = clientValid && !submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-modal-title"
      onMouseDown={(e) => {
        // Backdrop click: dismiss only in non-blocking mode.
        if (!blocking && e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(3, 7, 18, 0.78)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "linear-gradient(to bottom, #101828, #0a0f1a)",
          border: "1px solid #364153",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          {/* i18n: title */}
          <h2 id="username-modal-title" style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
            {blocking ? "Choose your name" : "Change your name"}
          </h2>
          {!blocking && (
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                color: "#6a7282",
                fontSize: 22,
                lineHeight: 1,
                cursor: "pointer",
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* i18n: helper text */}
        <p style={{ fontSize: 13, color: "#99a1af", margin: "0 0 16px" }}>
          {blocking
            ? "This is the name other players will see at the table and in chat. You can change it later."
            : "This is the name other players will see at the table and in chat."}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (serverError) setServerError(null);
          }}
          maxLength={16}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          // i18n: placeholder
          placeholder="Your name"
          aria-invalid={showCharsetError || !!serverError}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            fontSize: 16,
            color: "#ffffff",
            background: "#0a0f1a",
            border: `1px solid ${showCharsetError || serverError ? "#fb2c36" : "#364153"}`,
            borderRadius: 10,
            outline: "none",
          }}
        />

        {/* Live validation / error line */}
        <div style={{ minHeight: 20, marginTop: 8 }}>
          {serverError ? (
            <span style={{ fontSize: 12.5, color: "#fb2c36" }}>{serverError}</span>
          ) : showCharsetError ? (
            // i18n: charset rule
            <span style={{ fontSize: 12.5, color: "#fb2c36" }}>
              Use 3–16 letters, numbers, or underscores.
            </span>
          ) : (
            // i18n: charset hint
            <span style={{ fontSize: 12.5, color: "#6a7282" }}>
              3–16 characters: letters, numbers, or underscores.
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px 14px",
            fontSize: 15,
            fontWeight: 700,
            color: "#000000",
            background: canSubmit ? "#f0b100" : "#4a3f10",
            border: "none",
            borderRadius: 10,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.7,
            transition: "background 0.15s ease, opacity 0.15s ease",
          }}
        >
          {/* i18n: submit button */}
          {submitting ? "Saving…" : blocking ? "Continue" : "Save"}
        </button>
      </form>
    </div>
  );
}
