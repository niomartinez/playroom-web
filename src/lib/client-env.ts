/** Client-bundle env var helpers.
 *
 * Mirror of `server-env.ts#requireEnv`, but safe to import from client-side
 * modules. Next.js inlines `NEXT_PUBLIC_*` env vars at build time, so the
 * lookup runs once at module load (in the build, then in the browser bundle).
 *
 * In development, falls back to `devFallback` so local dev keeps working.
 * In any non-development env (preview, staging, production — Vercel sets
 * NODE_ENV=production for all of these), throws loudly at module load if the
 * variable is missing.
 *
 * Use this for required `NEXT_PUBLIC_*` config that must never silently default
 * to an empty string or a hardcoded credential in production.
 *
 * NOTE: Never put a real secret in `devFallback`. The fallback is shipped to
 * the browser bundle in development. Use placeholders like `"dev-api-key"`.
 */
export function requireClientEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      `${name} env var is required in non-development environments`
    );
  }
  return devFallback;
}
