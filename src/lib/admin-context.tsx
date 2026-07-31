"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Admin-specific state                                               */
/* ------------------------------------------------------------------ */

/** What a role may do with one back-office section. */
export type PermissionLevel = "none" | "read" | "write";

/** Section -> level, as returned by the backend for the signed-in account. */
export type Permissions = Record<string, PermissionLevel>;

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  display_name: string;
  /** Straight from `/api/admin/me`. The panel never derives this from `role` —
   *  the matrix lives in the backend (app/permissions.py) and is served, so the
   *  nav cannot offer something the API will refuse. */
  permissions: Permissions;
}

export interface AdminState {
  currentUser: AdminUser | null;
  sidebarCollapsed: boolean;
  loading: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Below lg the sidebar is an off-canvas drawer; this is its open state.
   *  Desktop ignores it entirely. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** Whether the signed-in account may read a section. */
  canRead: (section: string) => boolean;
  /** Whether the signed-in account may change anything in a section. */
  canWrite: (section: string) => boolean;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
          // No fallback map on purpose. An older backend that does not send
          // this leaves every section denied, which hides nav items — the safe
          // way to be wrong. Inventing permissions client-side is not.
          permissions: (data.permissions || {}) as Permissions,
        });
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const permissions = currentUser?.permissions;
  const canRead = useCallback(
    (section: string) => {
      const level = permissions?.[section];
      return level === "read" || level === "write";
    },
    [permissions],
  );
  const canWrite = useCallback(
    (section: string) => permissions?.[section] === "write",
    [permissions],
  );

  const value: AdminState = {
    currentUser,
    sidebarCollapsed,
    loading,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    canRead,
    canWrite,
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
