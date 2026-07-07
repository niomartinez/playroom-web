"use client";

import { OcmsProvider } from "@/lib/ocms-context";
import { ToastProvider } from "@/lib/toast-context";
import OcmsSidebar from "@/components/admin/OcmsSidebar";
import OcmsHeader from "@/components/admin/OcmsHeader";
import ToastContainer from "@/components/admin/ui/Toast";

export default function OcmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OcmsProvider>
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
