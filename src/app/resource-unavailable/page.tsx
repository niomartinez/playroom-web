import type { Metadata, Viewport } from "next";
import ResourceUnavailable from "@/components/ResourceUnavailable";

export const metadata: Metadata = {
  title: "Resource unavailable | Playroom Gaming",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true,
};
export const dynamic = "force-dynamic";

export default async function UnavailablePage({ searchParams }: {
  searchParams: Promise<{ surface?: string }>;
}) {
  const params = await searchParams;
  const surface = params.surface === "site" ? "site" : params.surface === "studio" ? "studio" : "admin";
  return <ResourceUnavailable surface={surface} />;
}
