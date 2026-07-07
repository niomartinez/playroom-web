/** OCMS segment layout.
 *
 * Exists to pin the entire /admin-ocms segment (login, force-password, and the
 * (panel) group) to Singapore — Supabase is ap-southeast-1, so co-locating the
 * RSC data fetches with the DB shaves the round-trip. This is set on the
 * SEGMENT layout only; the ROOT layout must stay region-agnostic because it
 * serves the latency-sensitive player UI to a global audience.
 */

export const preferredRegion = "sin1";

export default function AdminOcmsSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
