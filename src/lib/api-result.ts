/**
 * Did a backend call actually succeed?
 *
 * The API wraps everything in `BaseResponse`, which returns HTTP 200 with an
 * `error_code` string — `"0"` meaning success (app/schemas/common.py). Two
 * different mistakes follow from that, and both have shipped here:
 *
 *   `if (res.ok)` alone
 *       treats an application-level failure as success, because a rejected
 *       request (duplicate IP, validation error, not found) still comes back
 *       200 with a non-zero error_code.
 *
 *   `if (res.ok && !json.error_code)`
 *       treats every success as a failure, because `"0"` is a NON-EMPTY string
 *       and therefore truthy in JavaScript. This one is nastier: the UI shows an
 *       error toast carrying the backend's own `message` — literally a red
 *       "Success" — while the write has already gone through.
 *
 * So: success is `error_code` absent (a plain JSON route) or exactly `"0"`.
 */
export interface ApiEnvelope {
  error_code?: string | null;
  message?: string | null;
  data?: unknown;
  error?: string | null;
}

/** True when the HTTP call succeeded AND the envelope reports success. */
export function isApiOk(res: { ok: boolean }, body: ApiEnvelope | null | undefined): boolean {
  if (!res.ok) return false;
  if (!body) return true; // no envelope (204 / empty body) — trust the status
  if (body.error) return false; // some Next route handlers return { error }
  const code = body.error_code;
  return code == null || code === "0";
}

/** The most useful message to show when {@link isApiOk} is false.
 *
 *  Never returns the backend's success text: when a call fails without an
 *  explanatory message, "Success" would be the single most misleading thing to
 *  put in an error toast — which is exactly what the truthy-"0" bug produced. */
export function apiErrorMessage(
  body: ApiEnvelope | null | undefined,
  fallback = "Something went wrong",
): string {
  const msg = body?.error || body?.message;
  if (!msg || msg.toLowerCase() === "success") return fallback;
  return msg;
}
