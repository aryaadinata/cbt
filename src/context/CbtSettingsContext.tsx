"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

export interface CbtSystemSettings {
  id?: number;
  // Branding
  app_name: string;
  app_tagline: string;
  app_description: string;
  logo_url: string;
  favicon_url: string;
  copyright_text: string;
  // Operasional & Umum
  timezone: string;
  maintenance_mode: number;
  maintenance_message: string;
  academic_year: string;
  semester: string;
  default_duration_minutes: number;
  allow_dual_login: number;
  show_score_after_submit: number;
  // Anti-Cheating
  anticheat_enabled: number;
  anticheat_fullscreen: number;
  anticheat_tab_switch: number;
  anticheat_window_blur: number;
  anticheat_block_right_click: number;
  anticheat_block_shortcuts: number;
  anticheat_block_copy_paste: number;
  anticheat_single_device: number;
  anticheat_auto_lock: number;
  anticheat_max_violations: number;
  anticheat_time_away_seconds: number;
  // Sinkronisasi SIAK
  siak_api_url: string;
  siak_pg_host: string;
  siak_pg_port: number;
  siak_pg_user: string;
  siak_pg_dbname: string;
  siak_pg_password_set?: boolean;
  sync_preserve_exam_passwords: number;
  sync_include_students: number;
  sync_include_teachers: number;
  sync_include_classes: number;
  sync_include_school_profile: number;
  updated_at?: string;
  // Profil Sekolah tersinkron SIAK (Read-Only)
  school_name?: string;
  npsn?: string;
  siak_logo?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  district?: string;
  regency?: string;
  province?: string;
  postal_code?: string;
  accreditation?: string;
  headmaster_name?: string;
  headmaster_nip?: string;
  letterhead?: string;
  headmaster_signature?: string;
  school_synced_at?: string;
}

export const DEFAULT_CBT_SETTINGS: CbtSystemSettings = {
  app_name: "CBT SEKOLAH",
  app_tagline: "Ujian Mandiri & SAS",
  app_description:
    "Sistem CBT Mandiri Sekolah Terpadu dengan Fitur Anti-Kecurangan & Isolasi Server Mandiri.",
  logo_url: "",
  favicon_url: "",
  copyright_text: "Sistem CBT Ujian Sekolah Mandiri",
  timezone: "Asia/Makassar",
  maintenance_mode: 0,
  maintenance_message:
    "Sistem CBT sedang dalam pemeliharaan berkala. Silakan coba beberapa saat lagi.",
  academic_year: "2025/2026",
  semester: "Genap",
  default_duration_minutes: 90,
  allow_dual_login: 1,
  show_score_after_submit: 1,
  anticheat_enabled: 1,
  anticheat_fullscreen: 1,
  anticheat_tab_switch: 1,
  anticheat_window_blur: 1,
  anticheat_block_right_click: 1,
  anticheat_block_shortcuts: 1,
  anticheat_block_copy_paste: 1,
  anticheat_single_device: 1,
  anticheat_auto_lock: 1,
  anticheat_max_violations: 3,
  anticheat_time_away_seconds: 5,
  siak_api_url: "http://127.0.0.1:5000",
  siak_pg_host: "localhost",
  siak_pg_port: 5432,
  siak_pg_user: "postgres",
  siak_pg_dbname: "db_sekolah",
  siak_pg_password_set: true,
  sync_preserve_exam_passwords: 1,
  sync_include_students: 1,
  sync_include_teachers: 1,
  sync_include_classes: 1,
  sync_include_school_profile: 1,
};

interface CbtSettingsContextType {
  settings: CbtSystemSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateCbtSettings: (newData: Partial<CbtSystemSettings>) => void;
}

const CbtSettingsContext = createContext<CbtSettingsContextType | undefined>(undefined);

const ROUTE_TITLE_MAP: Record<string, string> = {
  "/": "Dashboard Ujian",
  "/status-tes": "Status Tes",
  "/bank-soal": "Bank Soal",
  "/ruang-ujian": "Ruang Ujian",
  "/pengawas-ujian": "Pengawas Ujian",
  "/jadwal-pengawas": "Jadwal Pengawas",
  "/jadwal-sas": "Jadwal Jaga Saya",
  "/dokumen-administrasi": "Dokumen Administrasi",
  "/hasil-ujian": "Hasil Ujian",
  "/sinkron": "Sinkronisasi SIAK",
  "/pengaturan": "Pengaturan Sistem",
  "/login": "Masuk",
};

export const applyCbtFavicon = (iconUrl: string) => {
  if (typeof window === "undefined" || !iconUrl) return;
  try {
    const existing = document.querySelectorAll<HTMLLinkElement>(
      "link[rel*='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
    );
    if (existing.length > 0) {
      existing.forEach((el) => {
        el.href = iconUrl;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = iconUrl;
      document.head.appendChild(link);
    }
  } catch (err) {
    console.warn("Gagal menerapkan favicon CBT:", err);
  }
};

export const applyCbtDocumentTitle = (
  appName: string,
  appTagline?: string,
  path?: string
) => {
  if (typeof window === "undefined" || !appName) return;
  try {
    const currentPath = path || window.location.pathname;
    let pageLabel = ROUTE_TITLE_MAP[currentPath];
    if (!pageLabel) {
      const matchedKey = Object.keys(ROUTE_TITLE_MAP)
        .filter((k) => k !== "/")
        .sort((a, b) => b.length - a.length)
        .find((key) => currentPath.startsWith(key));
      if (matchedKey) {
        pageLabel = ROUTE_TITLE_MAP[matchedKey];
      }
    }
    if (pageLabel && currentPath !== "/") {
      document.title = `${pageLabel} | ${appName}`;
    } else {
      document.title = appTagline ? `${appName} - ${appTagline}` : appName;
    }
  } catch (err) {
    console.warn("Gagal menerapkan judul dokumen CBT:", err);
  }
};

export const CbtSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CbtSystemSettings>(DEFAULT_CBT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Hidrasi instan dari localStorage agar branding tidak berkedip
  useEffect(() => {
    try {
      const cached = localStorage.getItem("cbt_system_settings");
      if (cached) {
        const parsed = { ...DEFAULT_CBT_SETTINGS, ...JSON.parse(cached) };
        setSettings(parsed);
        const activeIcon = parsed.favicon_url || parsed.logo_url || parsed.siak_logo;
        if (activeIcon) applyCbtFavicon(activeIcon);
        if (parsed.app_name) {
          applyCbtDocumentTitle(parsed.app_name, parsed.app_tagline, pathname);
        }
      }
    } catch {}
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/settings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings) {
          const merged: CbtSystemSettings = { ...DEFAULT_CBT_SETTINGS, ...json.settings };
          setSettings(merged);
          try {
            localStorage.setItem("cbt_system_settings", JSON.stringify(merged));
          } catch {}
          const activeIcon = merged.favicon_url || merged.logo_url || merged.siak_logo;
          if (activeIcon) applyCbtFavicon(activeIcon);
          if (merged.app_name) {
            applyCbtDocumentTitle(merged.app_name, merged.app_tagline, pathname);
          }
        }
      }
    } catch (err) {
      console.warn("Gagal memuat pengaturan sistem CBT:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Perbarui judul tab browser setiap berpindah rute
  useEffect(() => {
    if (settings?.app_name) {
      applyCbtDocumentTitle(settings.app_name, settings.app_tagline, pathname);
    }
  }, [pathname, settings?.app_name, settings?.app_tagline]);

  const updateCbtSettings = useCallback(
    (newData: Partial<CbtSystemSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newData };
        try {
          localStorage.setItem("cbt_system_settings", JSON.stringify(merged));
        } catch {}
        const activeIcon = merged.favicon_url || merged.logo_url || merged.siak_logo;
        if (activeIcon) applyCbtFavicon(activeIcon);
        if (merged.app_name) {
          applyCbtDocumentTitle(merged.app_name, merged.app_tagline, pathname);
        }
        return merged;
      });
    },
    [pathname]
  );

  return (
    <CbtSettingsContext.Provider
      value={{ settings, isLoading, refreshSettings, updateCbtSettings }}
    >
      {children}
    </CbtSettingsContext.Provider>
  );
};

export const useCbtSettings = () => {
  const ctx = useContext(CbtSettingsContext);
  if (!ctx) {
    throw new Error("useCbtSettings must be used within a CbtSettingsProvider");
  }
  return ctx;
};
