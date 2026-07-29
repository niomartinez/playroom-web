/** OCMS segment layout.
 *
 * Exists to pin the entire /admin-ocms segment (login, force-password, and the
 * (panel) group) to Singapore — Supabase is ap-southeast-1, so co-locating the
 * RSC data fetches with the DB shaves the round-trip. This is set on the
 * SEGMENT layout only; the ROOT layout must stay region-agnostic because it
 * serves the latency-sensitive player UI to a global audience.
 */

import type { Viewport } from "next";

export const preferredRegion = "sin1";

/** Re-enable pinch-zoom for the back office. The ROOT layout locks the viewport
 *  (maximumScale 1, userScalable false) for the player game canvas, which fails
 *  WCAG 1.4.4 on a dense admin table. Scoped to /admin-ocms only. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AdminOcmsSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
