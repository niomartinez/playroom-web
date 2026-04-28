/** Server-side env var helpers.
 *
 * `requireEnv` resolves a required env var. In development, it falls back to
 * `devFallback` so local dev keeps working. In any non-development env
 * (preview, staging, production — Vercel sets NODE_ENV=production for all of
 * these), it throws loudly at module load if the variable is missing.
 *
 * This is the fail-loud pattern for required secrets. Never silently default
 * a credential to "" in production — that turns missing config into a 401
 * cascade that's hard to diagnose.
 */
export function requireEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      `${name} env var is required in non-development environments`
    );
  }
  return devFallback;
}
