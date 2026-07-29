"use client";

import { AdminProvider } from "@/lib/admin-context";
import { ToastProvider } from "@/lib/toast-context";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ToastContainer from "@/components/admin/ui/Toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <ToastProvider>
        <div
          className="flex min-h-[100dvh] max-h-[100dvh] overflow-hidden"
          style={{ backgroundColor: "#000000" }}
        >
          {/* Sidebar */}
          <AdminSidebar />

          {/* Main content area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <AdminHeader />

            {/* Page content */}
            <main
              className="flex-1 overflow-y-auto p-6 max-md:p-4"
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
    </AdminProvider>
  );
}
