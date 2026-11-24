"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useCbtSettings } from "@/context/CbtSettingsContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isStudent, isTeacher, isAdminOrStaff, isLoading } = useAuth();
  const { settings } = useCbtSettings();
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Halaman khusus yang tidak memerlukan Sidebar & Navbar:
  // 1. Halaman Login
  // 2. Lembar Ujian Siswa (Fullscreen Lock Screen)
  const isPureFullscreen =
    pathname === "/login" || pathname?.startsWith("/ujian/kerjakan");

  // Guard navigasi: jika selesai memeriksa sesi dan user belum login di halaman proteksi, arahkan ke login
  useEffect(() => {
    if (!isLoading && !user && !isPureFullscreen) {
      window.location.replace("/login");
    }
  }, [isLoading, user, isPureFullscreen]);

  if (isPureFullscreen) {
    return <div className="min-h-screen bg-slate-900">{children}</div>;
  }

  // 1. Jika masih memeriksa sesi CBT
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-600 font-semibold">
            Memeriksa sesi CBT...
          </p>
          <a
            href="/login"
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline mt-1"
          >
            Buka Halaman Login &rarr;
          </a>
        </div>
      </div>
    );
  }

  // 2. Jika belum login di halaman internal, tampilkan status pengalihan
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <h3 className="text-sm font-bold text-slate-800">Sesi CBT Belum Aktif</h3>
          <p className="text-xs text-slate-500">
            Mengalihkan Anda ke halaman login CBT...
          </p>
          <a
            href="/login"
            className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
          >
            Klik di sini jika peramban tidak berpindah otomatis
          </a>
        </div>
      </div>
    );
  }

  const getRoleText = () => {
    if (isStudent) return `Siswa ${user?.class_name ? `(${user.class_name})` : ""}`;
    if (isTeacher) return "Pendidik / Guru";
    return "Panitia Ujian Sekolah (SAS) & Administrator";
  };

  return (
    <div className="min-h-screen flex bg-slate-100/90 text-slate-800 font-sans selection:bg-indigo-600 selection:text-white print:bg-white print:block">
      {/* 1. Sidebar Navigasi Kiri */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* 2. Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen print:min-h-0 print:overflow-visible print:block">
        {/* Header Atas */}
        <div className="print:hidden sticky top-0 z-40">
          <Navbar />
        </div>

        {/* Isi Halaman */}
        <main className="flex-1 p-2.5 sm:p-3.5 md:p-4 w-full min-w-0 print:p-0 print:m-0 print:w-full flex flex-col print:block">
          {children}
        </main>

        {/* Footer Ekosistem Sekolah */}
        <footer className="py-2.5 px-4 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white print:hidden">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              &copy; {currentYear} {settings?.copyright_text || settings?.app_name || "Sistem CBT Ujian Sekolah Mandiri"} &bull; Hak Akses:{" "}
              <strong className="text-slate-600">{getRoleText()}</strong>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Terisolasi Mandiri &bull; Bebas Beban SIAK &bull; Port 5005
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
