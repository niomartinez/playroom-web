"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Admin-specific state                                               */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  display_name: string;
}

export interface AdminState {
  currentUser: AdminUser | null;
  sidebarCollapsed: boolean;
  loading: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const AdminContext = createContext<AdminState | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setCurrentUser({
          id: data.id || data.sub || "",
          email: data.email || "",
          role: data.role || "viewer",
          display_name: data.display_name || data.name || "",
        });
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value: AdminState = {
    currentUser,
    sidebarCollapsed,
    loading,
    setSidebarCollapsed,
  };

  return <AdminContext value={value}>{children}</AdminContext>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAdmin(): AdminState {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
