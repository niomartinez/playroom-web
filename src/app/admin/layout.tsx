import type { Viewport } from "next";

/** Admin segment layout.
 *
 * Exists purely to re-enable pinch-zoom for the back office. The ROOT layout
 * locks the viewport (maximumScale 1, userScalable false) because the player
 * game canvas needs a fixed stage, but that fails WCAG 1.4.4 on a dense admin
 * table and removes the only escape hatch on a phone. This override is scoped
 * to /admin only.
 *
 * Note: no preferredRegion here. Only the /admin-ocms segment is pinned to
 * sin1; this segment stays region-agnostic.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function AdminSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
