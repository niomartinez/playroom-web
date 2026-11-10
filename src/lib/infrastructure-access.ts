/** Independent, reversible switches for the internal surfaces. OCMS is exempt. */
export type InfrastructureSurface = "admin" | "studio";

export const INFRASTRUCTURE_ERROR_CODE = "infrastructure_unpaid";
export const INFRASTRUCTURE_MESSAGE =
  "This resource is currently down and unavailable due to an unpaid infrastructure bill. " +
  "Please settle the unpaid invoices and contact the developers of this resource or app.";

export function infrastructureSuspended(surface: InfrastructureSurface): boolean {
  const value = surface === "admin"
    ? process.env.ADMIN_INFRASTRUCTURE_SUSPENDED
    : process.env.STUDIO_INFRASTRUCTURE_SUSPENDED;
  return value === "true";
}

/**
 * Whole-site switch for when the backend itself is taken down. Every page and
 * API route (players, OCMS portal, admin, studio) shows the notice; there is no
 * developer exemption because nothing behind the notice can work.
 */
export function siteSuspended(): boolean {
  return process.env.SITE_INFRASTRUCTURE_SUSPENDED === "true";
}

export function developerIdentifier(email: unknown): boolean {
  return typeof email === "string" && ["nio", "heins"].includes(email.trim().toLowerCase());
}

export function infrastructureExempt(payload: Record<string, unknown>): boolean {
  return payload.role === "superadmin" && developerIdentifier(payload.email);
}
