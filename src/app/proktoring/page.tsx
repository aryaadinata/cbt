"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEye,
  faDesktop,
  faCircleCheck,
  faClock,
  faUsers,
  faKey,
  faMagnifyingGlass,
  faRotate,
  faPlus,
  faShieldHalved,
  faClipboardList,
  faBookOpen,
  faCheck,
  faChartColumn,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";

export default function ProktoringHubPage() {
  const router = useRouter();
  const { user, token, isTeacher, isAdminOrStaff, isStudent, isLoading } = useAuth();

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

  // Redirect jika belum login atau jika role siswa
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (isStudent) {
        router.push("/");
      }
    }
  }, [user, isStudent, isLoading, router]);

  // Fetch daftar ujian
  const fetchExams = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/cbt-backend/api/cbt/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Untuk guru: tampilkan seluruh ujian miliknya. Untuk admin: tampilkan ulangan harian.
        let list = data.exams || [];
        if (isTeacher) {
          list = list.filter((e: any) => (e.exam_type || "daily").toLowerCase() === "daily" || e.created_by === user?.id);
        }
        setExams(list);
      }
    } catch (e) {
      console.error("Gagal memuat daftar ujian proktoring:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && !isStudent) {
      fetchExams();
    }
  }, [token, isStudent]);

  // Filter daftar ujian
  const filteredExams = exams.filter((exam) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      exam.title?.toLowerCase().includes(q) ||
      exam.token?.toLowerCase().includes(q) ||
      exam.subject_name?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? exam.status === "active"
        : exam.status !== "active";

    return matchSearch && matchStatus;
  });

  const activeExams = exams.filter((e) => e.status === "active");

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN PROKTORING */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            title="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-slate-900 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Proktoring Ulangan Harian
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white shadow-2xs">
                Live Monitoring
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pusat pengawasan ujian kelas, buka kunci siswa, pantau status waktu, dan deteksi kecurangan secara langsung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchExams}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Segarkan Data"
          >
            <FontAwesomeIcon icon={faRotate} className={`text-xs ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. BANNER JIKA ADA ADMIN */}
      {isAdminOrStaff && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Mode Administrator: Pengawasan Ulangan Guru &amp; Ruangan SAS
              </span>
              <p className="text-[11px] text-slate-600">
                Untuk pengawasan ujian berbasis ruangan sekolah (SAS), silakan buka menu <b>Proktoring Ruang</b>.
              </p>
            </div>
          </div>
          <Link
            href="/pengawas-ruang"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition shrink-0"
          >
            <FontAwesomeIcon icon={faDesktop} className="text-xs" />
            <span>Buka Proktoring Ruangan SAS</span>
          </Link>
        </div>
      )}

      {/* 3. TOOLBAR PENCARIAN & FILTER */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ulangan harian atau kode token..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === "active" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-emerald-700"
            }`}
          >
            Sedang Aktif ({activeExams.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === "completed" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Selesai / Draft ({exams.length - activeExams.length})
          </button>
        </div>
      </div>

      {/* 4. DAFTAR KARTU ULANGAN HARIAN */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-2xs text-center text-xs text-slate-400">
          <FontAwesomeIcon icon={faRotate} className="animate-spin text-base mb-2 text-slate-600 block mx-auto" />
          Memuat daftar ulangan harian...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
            <FontAwesomeIcon icon={faClipboardList} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {searchQuery ? "Tidak ada ulangan yang cocok dengan pencarian" : "Belum Ada Ulangan Harian"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? "Coba gunakan kata kunci pencarian yang lain."
              : "Buat ulangan harian baru untuk kelas Anda, kemudian buka meja proktoring untuk memantau siswa saat mengerjakan."}
          </p>
          {!searchQuery && isTeacher && (
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>Buka Menu Tes untuk Buat Ulangan</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredExams.map((exam) => {
            const isActive = exam.status === "active";
            const isCompleted = exam.status === "completed";
            const subjectCount = exam.total_subjects || exam.subjects?.length || 0;

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between gap-3.5 hover:shadow-xs ${
                  isActive
                    ? "border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/20"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* Header Kartu */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCompleted
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                      {isActive ? "Live Aktif" : isCompleted ? "Selesai" : "Draft"}
                    </span>

                    {exam.token && (
                      <span className="font-mono font-bold text-[11px] bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-2xs">
                        Token: {exam.token}
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2" title={exam.title}>
                    {exam.title}
                  </h3>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBookOpen} className="text-slate-400 text-[10px]" />
                      <span>{subjectCount > 0 ? `${subjectCount} Mata Pelajaran` : "1 Mata Pelajaran"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                      <span>Dibuat: {formatDate(exam.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href={`/ujian/pantau/${exam.id}`}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 ${
                      isActive
                        ? "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                        : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                  >
                    <FontAwesomeIcon icon={faEye} className="text-[11px]" />
                    <span>Meja Proktoring</span>
                  </Link>

                  <Link
                    href={`/hasil-ujian?exam_id=${exam.id}`}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200/80 active:scale-95"
                    title="Lihat & Download Rekap Nilai Siswa (Excel)"
                  >
                    <FontAwesomeIcon icon={faChartColumn} className="text-[10px]" />
                    <span>Hasil Nilai</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
