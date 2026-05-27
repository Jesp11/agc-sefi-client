"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  curp?: string | null;
  cumpleanos?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = async () => {
    try {
      const res = await apiFetch("/auth/me", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!loading && !token && pathname.startsWith("/dashboard")) {
      router.push("/login");
    }
  }, [loading, pathname, router]);

  const login = async (token: string) => {
    localStorage.setItem("auth_token", token);
    await fetchMe();
    router.push("/dashboard/clientes");
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
