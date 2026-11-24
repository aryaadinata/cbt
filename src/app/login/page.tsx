"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faUser,
  faLock,
  faArrowRight,
  faRotate,
  faCircleExclamation,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import { useCbtSettings } from "@/context/CbtSettingsContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const { settings } = useCbtSettings();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jika sudah terautentikasi / sesi aktif, alihkan langsung ke halaman utama CBT
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = "/";
    }
  }, [authLoading, user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    setError(null);

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setError("Mohon isi username dan kata sandi.");
      return;
    }

    setIsLoading(true);
    const res = await login(u, p);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "Gagal masuk. Silakan periksa kembali data Anda.");
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20 backdrop-blur-md">
        {/* Header Logo */}
        <div className="text-center mb-6">
          {settings?.logo_url || settings?.siak_logo ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 mx-auto flex items-center justify-center shadow-sm mb-3">
              <img
                src={settings.logo_url || settings.siak_logo}
                alt={settings.app_name || "Logo CBT"}
                className="max-h-12 max-w-12 object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20 mb-3">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
          )}
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {settings?.app_name || "Portal Ujian CBT"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {settings?.app_tagline || "Ulangan Harian & Sumatif Akhir Semester (SAS)"}
          </p>
        </div>

        {/* Mode Pemeliharaan Warning */}
        {Boolean(settings?.maintenance_mode) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 text-xs text-amber-900 flex items-start gap-2.5">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-600 text-sm mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <p className="font-bold">Mode Pemeliharaan Sedang Aktif</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {settings?.maintenance_message || "Sistem sedang dalam pemeliharaan. Hanya Administrator yang dapat masuk."}
              </p>
            </div>
          </div>
        )}

        {/* Info Box Single Identity & Dual-Login */}
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3.5 mb-5 text-xs text-indigo-950 flex items-start gap-2.5">
          <FontAwesomeIcon icon={faCheckCircle} className="text-indigo-600 text-sm mt-0.5 shrink-0" />
          <div className="leading-relaxed space-y-1">
            {Boolean(settings?.allow_dual_login ?? 1) ? (
              <p>
                <b>Dual-Login Tersedia:</b> Siswa dapat masuk menggunakan <b>Akun SIAK</b> atau <b>Kredensial pada Kartu Login</b>
              </p>
            ) : (
              <p>
                <b>Autentikasi SIAK:</b> Masuk menggunakan akun SIAK resmi
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-5 text-xs text-rose-800 flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-rose-600 text-sm shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faUser}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Masukkan NISN atau Username..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi:
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faLock}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Masukkan kata sandi..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faRotate} spin />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Ujian CBT</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4">
          {settings?.copyright_text || "Layanan Ujian Mandiri"} &bull;{" "}
          {Boolean(settings?.anticheat_enabled ?? 1)
            ? "Dilindungi Sistem Anti-Kecurangan"
            : "Sistem Ujian CBT Mandiri"}
        </div>
      </div>
    </div>
  );
}
