import ResourceUnavailable from "@/components/ResourceUnavailable";
import { infrastructureSuspended } from "@/lib/infrastructure-access";
import AdminLogin from "./login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<{ developer?: string }>;
}) {
  const params = await searchParams;
  if (infrastructureSuspended("admin") && params.developer !== "1") {
    return <ResourceUnavailable surface="admin" />;
  }
  return <AdminLogin />;
}
