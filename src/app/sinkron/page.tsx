"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotate,
  faArrowLeft,
  faUsers,
  faLayerGroup,
  faChalkboardUser,
  faCheckCircle,
  faCircleExclamation,
  faShieldHalved,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";

export default function SyncPage() {
  const { token, user, isAdminOrStaff, isTeacher } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cbt-backend/api/cbt/sync/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrStaff) {
      fetchStatus();
    }
  }, [isAdminOrStaff]);

  if (user && isTeacher && !isAdminOrStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-lg mx-auto my-12 space-y-4 shadow-sm animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-2xl">
          <FontAwesomeIcon icon={faShieldHalved} />
        </div>
        <h3 className="text-base font-bold text-slate-800">Menu Khusus Administrator / Panitia</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Fitur Sinkronisasi Data SIAK dikelola secara terpusat oleh Administrator atau Panitia CBT Sekolah. Bapak/Ibu Guru tidak perlu melakukan sinkronisasi data secara manual.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    );
  }

  const handlePullFromSiak = async () => {
    if (!token) return;
    try {
      setSyncing(true);
      setResultMsg(null);
      const res = await fetch("/api/cbt-backend/api/cbt/sync/pull-from-siak", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultMsg({
          type: "success",
          text: `Berhasil menyinkronkan ${data.summary.total_classes} kelas, ${data.summary.total_students} siswa, dan ${data.summary.total_teachers} guru dari SIAK!`,
        });
        fetchStatus();
      } else {
        setResultMsg({ type: "error", text: data.detail || "Gagal menyinkronkan data dari SIAK." });
      }
    } catch (e: any) {
      setResultMsg({ type: "error", text: e.message || "Gagal menghubungi server CBT." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-3.5 sm:gap-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-6 bg-purple-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Sinkronisasi Data SIAK
              </h1>
              {status?.academic_year && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                  T.A. {status.academic_year} &bull; {status.semester}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui snapshot data siswa, rombel kelas, dan pembagian mengajar guru dari database SIAK
            </p>
          </div>
        </div>

        <button
          onClick={handlePullFromSiak}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={faRotate} className={syncing ? "animate-spin" : ""} />
          <span>{syncing ? "Menyinkronkan..." : "Tarik Data dari SIAK"}</span>
        </button>
      </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 text-blue-300">
              <FontAwesomeIcon icon={faShieldHalved} />
            </span>
            <h2 className="text-base font-bold">Mekanisme Isolasi Beban CBT</h2>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">
            Data siswa dan kelas hanya disentuh saat Anda mengeklik tombol <b>"Tarik Data dari SIAK"</b> di halaman ini. Setelah disinkronkan, seluruh proses pengerjaan ujian, autosave jawaban, timer, dan penguncian anti-curang berjalan <b>100% di server lokal CBT</b> tanpa membebani server utama SIAK sama sekali.
          </p>
        </div>

        {resultMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 ${
              resultMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                : "bg-rose-50 border border-rose-200 text-rose-900"
            }`}
          >
            <FontAwesomeIcon
              icon={resultMsg.type === "success" ? faCheckCircle : faCircleExclamation}
              className="text-base shrink-0"
            />
            <span>{resultMsg.text}</span>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Rombel Kelas
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {loading ? "..." : status?.total_classes || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faLayerGroup} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Siswa Aktif
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {loading ? "..." : status?.total_students || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faUsers} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Guru
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {loading ? "..." : status?.total_teachers || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faChalkboardUser} />
            </div>
          </div>
        </div>

        {/* Sync Action Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Tarik Snapshot Data Terbaru
              </h3>
              <p className="text-xs text-slate-500">
                Terakhir disinkronkan:{" "}
                <b>{status?.last_synced ? new Date(status.last_synced).toLocaleString("id-ID") : "Belum pernah"}</b>
              </p>
            </div>

            <button
              onClick={handlePullFromSiak}
              disabled={syncing}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faRotate} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Sedang Menyinkronkan..." : "Tarik Data dari SIAK Sekarang"}</span>
            </button>
          </div>
        </div>
    </div>
  );
}
