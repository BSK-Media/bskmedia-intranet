"use client";

import React from "react";

export type Role = "ADMIN" | "EMPLOYEE";
export type MeUser = { id: string; email: string; name: string; role: Role } | null;
export type AdminUser = { id: string; email: string; name: string; role: Role } | null;

type Ctx = {
  user: MeUser;
  adminUser: AdminUser;
  impersonating: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<MeUser>(null);
  const [adminUser, setAdminUser] = React.useState<AdminUser>(null);
  const [impersonating, setImpersonating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json().catch(() => ({ user: null }));
    setUser(data.user ?? null);
    setAdminUser(data.adminUser ?? null);
    setImpersonating(!!data.impersonating);
    setLoading(false);
  }, []);

  const logout = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setAdminUser(null);
    setImpersonating(false);
    window.location.href = "/login";
  }, []);

  const stopImpersonation = React.useCallback(async () => {
    await fetch("/api/admin/impersonation", { method: "DELETE" });
    await refresh();
    window.location.href = "/admin/employees";
  }, [refresh]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, adminUser, impersonating, loading, refresh, logout, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
