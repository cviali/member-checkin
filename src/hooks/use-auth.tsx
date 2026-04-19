"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { isAuthorized, type Role } from "@/lib/routes";
import { toast } from "sonner";

export interface User {
  id: string;
  username: string | null;
  role: Role;
  name: string;
  phoneNumber: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User, redirectTo?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const decoded = jwtDecode<{ exp: number }>(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser(JSON.parse(storedUser));
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.error("Session expired. Please log in again.");
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (
      pathname === "/" ||
      pathname === "/admin/login" ||
      pathname === "/customer/login"
    ) {
      return;
    }

    if (!user) {
      if (pathname.startsWith("/customer")) {
        router.replace("/customer/login");
      } else if (pathname.startsWith("/dashboard")) {
        router.replace(
          `/admin/login?redirect=${encodeURIComponent(pathname)}`
        );
      }
      return;
    }

    if (!isAuthorized(user.role, pathname)) {
      if (user.role === "customer") {
        router.replace("/customer");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    (token: string, userData: User, redirectTo?: string) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      if (redirectTo) {
        router.push(redirectTo);
      } else if (userData.role === "customer") {
        router.push("/customer");
      } else {
        router.push("/dashboard");
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
