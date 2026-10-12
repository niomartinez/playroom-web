import type { Viewport } from "next";
import ResourceUnavailable from "@/components/ResourceUnavailable";
import { infrastructureSuspended } from "@/lib/infrastructure-access";
import StudioLogin from "./login-form";

export const dynamic = "force-dynamic";
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true,
};

export default async function StudioLoginPage({ searchParams }: {
  searchParams: Promise<{ developer?: string }>;
}) {
  const params = await searchParams;
  if (infrastructureSuspended("studio") && params.developer !== "1") {
    return <ResourceUnavailable surface="studio" />;
  }
  return <StudioLogin />;
}
