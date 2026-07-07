"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  OCMS partner-portal state                                          */
/* ------------------------------------------------------------------ */

export interface OcmsUser {
  id: string;
  email: string;
  role: string; // ocms_admin | ocms_cs
  display_name: string;
  operator_id: string;
}

export interface OcmsState {
  currentUser: OcmsUser | null;
  sidebarCollapsed: boolean;
  loading: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const OcmsContext = createContext<OcmsState | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function OcmsProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<OcmsUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-ocms/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setCurrentUser({
          id: data.id || data.sub || "",
          email: data.email || "",
          role: data.role || "ocms_cs",
          display_name: data.display_name || data.name || "",
          operator_id: data.operator_id || "",
        });
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value: OcmsState = {
    currentUser,
    sidebarCollapsed,
    loading,
    setSidebarCollapsed,
  };

  return <OcmsContext value={value}>{children}</OcmsContext>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useOcms(): OcmsState {
  const ctx = useContext(OcmsContext);
  if (!ctx) {
    throw new Error("useOcms must be used within an OcmsProvider");
  }
  return ctx;
}
