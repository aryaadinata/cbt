"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: string;
  nip?: string;
  student_id?: number;
  teacher_id?: number;
  class_name?: string;
  nis?: string;
  nisn?: string;
  photo?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: string;
  isStudent: boolean;
  isTeacher: boolean;
  isAdminOrStaff: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper decode JWT
  const decodeJwt = (jwtToken: string): any => {
    try {
      const parts = jwtToken.split(".");
      if (parts.length >= 2) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        return JSON.parse(jsonPayload);
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper cookie
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  useEffect(() => {
    try {
      let savedToken: string | null = null;

      // 1. Cek parameter URL (SSO dari AppSwitcher ekosistem sekolah / SIAK / Pustaloka)
      if (typeof window !== "undefined") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlToken = urlParams.get("token") || urlParams.get("sso_token") || urlParams.get("jwt");
          if (urlToken) {
            savedToken = urlToken;
            localStorage.setItem("cbt_token", urlToken);
            sessionStorage.setItem("cbt_token", urlToken);
            document.cookie = `cbt_token=${urlToken}; path=/; max-age=86400; SameSite=Lax`;

            // Bersihkan query param token dari URL tanpa reload halaman agar URL rapi & aman
            urlParams.delete("token");
            urlParams.delete("sso_token");
            urlParams.delete("jwt");
            const cleanQuery = urlParams.toString();
            const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : "") + window.location.hash;
            window.history.replaceState({}, "", cleanUrl);
          }
        } catch (errUrl) {
          console.warn("Gagal membaca parameter SSO dari URL:", errUrl);
        }
      }

      // 2. Cek token CBT tersimpan di Storage & Cookie jika tidak ada dari URL (Sesi Mandiri CBT)
      if (!savedToken) {
        savedToken =
          localStorage.getItem("cbt_token") ||
          sessionStorage.getItem("cbt_token") ||
          getCookie("cbt_token");
      }

      if (savedToken) {
        const payload = decodeJwt(savedToken);
        if (payload) {
          // Cek masa berlaku
          const nowSec = Math.floor(Date.now() / 1000);
          if (!payload.exp || payload.exp > nowSec) {
            setToken(savedToken);
            setUser({
              id: payload.id || Number(payload.sub),
              name: payload.name || payload.username || "Pengguna",
              username: payload.username || "",
              role: (payload.role || "student").toLowerCase(),
              student_id: payload.student_id,
              teacher_id: payload.teacher_id,
              nip: payload.nip || (payload.role === "teacher" ? payload.username : undefined),
              class_name: payload.class_name,
              nis: payload.nis,
              nisn: payload.nisn,
              photo: payload.photo || null,
            });
            // Pastikan tersimpan di cbt_token
            try {
              localStorage.setItem("cbt_token", savedToken);
              document.cookie = `cbt_token=${savedToken}; path=/; max-age=86400; SameSite=Lax`;
            } catch {}
            setIsLoading(false);
            return;
          } else {
            console.warn("Sesi token CBT telah kadaluarsa.");
            try {
              localStorage.removeItem("cbt_token");
              sessionStorage.removeItem("cbt_token");
              document.cookie = "cbt_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            } catch {}
          }
        }
      }

      // Jika tidak ada token valid
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error("Gagal membaca sesi CBT:", e);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/cbt-backend/api/cbt/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonPayload(username, password),
      });

      let data: any = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        // Respons bukan JSON (misal HTML 500/502 dari proxy Next.js saat backend mati)
      }

      if (!res.ok || !data?.success) {
        let errorMsg = data?.detail || data?.error;
        if (!errorMsg) {
          if (res.status === 500 || res.status === 502 || res.status === 504) {
            errorMsg = "Gagal terhubung ke Backend CBT (Port 5005). Pastikan server Backend CBT sudah menyala.";
          } else {
            errorMsg = "Gagal masuk. Periksa kembali username & password.";
          }
        }
        return { success: false, error: errorMsg };
      }

      const newToken = data.token;
      const newUser = data.user;

      setToken(newToken);
      setUser(newUser);

      localStorage.setItem("cbt_token", newToken);
      document.cookie = `cbt_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;

      // Set cookie di server Next.js melalui route handler agar HP / mobile browser 100% menerima cookie
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: newToken }),
        });
      } catch (e) {
        console.warn("Gagal set cookie sesi server:", e);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Gagal menghubungi server CBT." };
    } finally {
      setIsLoading(false);
    }
  };

  const jsonPayload = (u: string, p: string) => {
    return JSON.stringify({ username: u, password: p });
  };

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("cbt_token");
      sessionStorage.removeItem("cbt_token");
      document.cookie = "cbt_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: null }),
      }).catch(() => {});
    } catch {}
    setToken(null);
    setUser(null);
    window.location.replace("/login");
  }, []);

  const role = (user?.role || "").toLowerCase();
  const isStudent = role === "student" || role === "siswa";
  const isTeacher = role === "teacher" || role === "guru";
  const isAdminOrStaff = !isStudent && !isTeacher;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isStudent,
        isTeacher,
        isAdminOrStaff,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};
