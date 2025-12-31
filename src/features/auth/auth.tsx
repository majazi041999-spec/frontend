import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export type Me = { email: string; roles: string[] } | null;

type AuthCtx = {
  user: Me;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await apiFetch<Me>("/api/auth/me", { method: "GET" });
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // هم وضعیت سشن رو می‌گیره هم XSRF cookie رو ست می‌کند
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    await refresh(); // گرفتن XSRF
    await apiFetch<void>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await refresh();
  };

  const logout = async () => {
    await apiFetch<void>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, refresh, login, logout }), [user, isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
