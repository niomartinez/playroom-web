import { getOcmsSession } from "@/lib/ocms-auth";
import { getCsUsers } from "@/lib/ocms-server";
import OcmsCsUsersClient from "@/components/admin/OcmsCsUsersClient";

export default async function OcmsCsUsersPage() {
  const session = await getOcmsSession();

  // Role gate (server-side). Only ocms_admin manages CS accounts; the backend
  // also enforces require_admin on every cs-user endpoint.
  if (session?.role !== "ocms_admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>
          You do not have access to CS account management.
        </span>
      </div>
    );
  }

  const users = await getCsUsers();

  return <OcmsCsUsersClient initialUsers={users} />;
}
