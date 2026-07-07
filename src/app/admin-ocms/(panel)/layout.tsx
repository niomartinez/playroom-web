import { redirect } from "next/navigation";
import { getOcmsSession } from "@/lib/ocms-auth";
import { OcmsProvider, type OcmsUser } from "@/lib/ocms-context";
import { ToastProvider } from "@/lib/toast-context";
import OcmsSidebar from "@/components/admin/OcmsSidebar";
import OcmsHeader from "@/components/admin/OcmsHeader";
import ToastContainer from "@/components/admin/ui/Toast";

/**
 * Panel shell (RSC). Reads the guard session server-side so:
 *  - unauthenticated users go to /login (defence-in-depth with middleware),
 *  - flagged users are forced to /force-password before any panel page,
 *  - the current user is SEEDED into OcmsProvider — no client /me waterfall.
 */
export default async function OcmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOcmsSession();
  if (!session) {
    redirect("/admin-ocms/login");
  }
  if (session.must_change_password) {
    redirect("/admin-ocms/force-password");
  }

  const initialUser: OcmsUser = {
    id: session.sub,
    email: session.email,
    role: session.role,
    display_name: session.display_name,
    operator_id: session.operator_id,
  };

  return (
    <OcmsProvider initialUser={initialUser}>
      <ToastProvider>
        <div
          className="flex h-screen overflow-hidden"
          style={{ backgroundColor: "#000000" }}
        >
          {/* Sidebar */}
          <OcmsSidebar />

          {/* Main content area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <OcmsHeader />

            {/* Page content */}
            <main
              className="flex-1 overflow-y-auto p-6"
              style={{
                background:
                  "linear-gradient(to right, #000000, #171717, #000000)",
              }}
            >
              {children}
            </main>
          </div>
        </div>
        <ToastContainer />
      </ToastProvider>
    </OcmsProvider>
  );
}
