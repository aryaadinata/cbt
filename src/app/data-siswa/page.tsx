"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserGraduate,
  faMagnifyingGlass,
  faFileExcel,
  faPrint,
  faRotate,
  faArrowLeft,
  faFilter,
  faEye,
  faEyeSlash,
  faCopy,
  faCheck,
  faDoorOpen,
  faChalkboardUser,
  faLayerGroup,
  faKey,
  faVenusMars,
  faSchool,
  faIdCard,
  faXmark,
  faUser,
  faCircleCheck,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

interface StudentItem {
  id: number;
  nis?: string;
  nisn?: string;
  nik?: string;
  name: string;
  class_id?: number;
  class_name?: string;
  grade?: number;
  major_code?: string;
  gender?: string;
  photo?: string;
  exam_password?: string;
  synced_at?: string;
  room_name?: string;
  session_name?: string;
  seat_number?: number;
}

interface ClassOption {
  name: string;
  grade?: number;
}

interface SummaryData {
  total_students: number;
  total_male: number;
  total_female: number;
  total_allocated: number;
  total_classes: number;
}

export default function DataSiswaPage() {
  const { token, isTeacher, isAdminOrStaff, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total_students: 0,
    total_male: 0,
    total_female: 0,
    total_allocated: 0,
    total_classes: 0,
  });

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // UI Interactive States
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

  // Fetch Students from CBT Backend
  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedClass && selectedClass !== "all") {
        params.set("class_name", selectedClass);
      }
      if (selectedGrade && selectedGrade !== "all") {
        params.set("grade", selectedGrade);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/cbt-backend/api/cbt/sync/students?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setStudents(json.students || []);
        if (json.classes && Array.isArray(json.classes)) {
          setClasses(json.classes);
        }
        if (json.teacher_classes) {
          setTeacherClasses(json.teacher_classes);
        }
        if (json.summary) {
          setSummary(json.summary);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Gagal mengambil data siswa.");
      }
    } catch (err: any) {
      console.error("Gagal memuat data siswa:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: err.message || "Terjadi kesalahan saat mengambil data siswa dari server CBT.",
      });
    } finally {
      setLoading(false);
    }
  }, [token, selectedClass, selectedGrade, searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Toggle Password Masking
  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Copy Password to Clipboard
  const handleCopyPassword = (id: number, textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  // Download Excel
  const handleExportExcel = async () => {
    if (!token) return;
    try {
      setDownloadingExcel(true);
      const params = new URLSearchParams();
      if (selectedClass && selectedClass !== "all") {
        params.set("class_name", selectedClass);
      }
      if (selectedGrade && selectedGrade !== "all") {
        params.set("grade", selectedGrade);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(
        `/api/cbt-backend/api/cbt/sync/students/export-excel?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Gagal mengunduh berkas Excel.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `Data_Siswa_${selectedClass !== "all" ? selectedClass : "Semua"}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunduh Excel",
        text: err.message || "Terjadi kesalahan saat memproses ekspor Excel.",
      });
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Client-side quick filter jika search query berubah cepat
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        (s.class_name && s.class_name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  return (
    <div className="flex flex-col gap-5 min-w-0 w-full animate-in fade-in duration-200 pb-20">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition shadow-2xs shrink-0 cursor-pointer"
            title="Kembali ke Dashboard Utama"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-6 bg-indigo-600 rounded-full inline-block" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isTeacher ? "Daftar Siswa Kelas Ajar" : "Data Siswa CBT"}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isTeacher
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                }`}
              >
                {isTeacher ? "Role Guru • Khusus Kelas Mengajar" : "Role Admin • Data Induk CBT"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isTeacher
                ? "Menampilkan daftar siswa khusus untuk kelas yang Anda ajar (tersinkronisasi dari SIAK). Berguna untuk presensi & bantuan login ulangan harian."
                : "Kelola dan pantau seluruh data peserta didik CBT hasil sinkronisasi SIAK, alokasi ruang ujian, dan kredensial kartu ujian."}
            </p>
          </div>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={downloadingExcel || loading}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
            title="Unduh data siswa format Microsoft Excel (.xlsx)"
          >
            <FontAwesomeIcon icon={faFileExcel} className={downloadingExcel ? "animate-spin" : ""} />
            <span>{downloadingExcel ? "Mengunduh..." : "Download Excel"}</span>
          </button>

          {/* Tombol Cetak / Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer active:scale-95"
            title="Cetak daftar siswa ini"
          >
            <FontAwesomeIcon icon={faPrint} />
            <span>Cetak</span>
          </button>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={() => fetchStudents()}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Segarkan data live sekarang"
          >
            <FontAwesomeIcon icon={faRotate} className={loading ? "animate-spin text-xs" : "text-xs"} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BANNER INFORMASI KHUSUS GURU */}
      {/* ==================================================================== */}
      {isTeacher && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-indigo-800/40 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Akses Terproteksi Guru
              </span>
            </div>
            <h2 className="text-sm font-bold text-white">
              Menampilkan Peserta Didik di Kelas yang Anda Ampu:
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {teacherClasses.length > 0 ? (
                teacherClasses.map((cls) => (
                  <span
                    key={cls}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-white/10 text-indigo-200 border border-white/10"
                  >
                    {cls}
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-300 italic">
                  Belum ada rombel mengajar yang terhubung dengan akun guru Anda di SIAK.
                </span>
              )}
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-white/10 sm:pl-5 shrink-0">
            <span className="text-[11px] text-slate-300 block">Guru Pengajar</span>
            <span className="text-sm font-bold text-white block">{user?.name || "Guru CBT"}</span>
            <span className="text-[10px] text-indigo-300 font-mono block">
              NIP: {user?.nip || user?.username || "-"}
            </span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. KARTU STATISTIK RINGKAS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Total Siswa */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg shrink-0">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Siswa
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {summary.total_students}
              </span>
              <span className="text-xs text-slate-500 font-medium">Orang</span>
            </div>
          </div>
        </div>

        {/* Siswa Laki-Laki */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg shrink-0">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Laki-Laki (L)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
                {summary.total_male}
              </span>
              <span className="text-xs text-slate-500 font-medium">Siswa</span>
            </div>
          </div>
        </div>

        {/* Siswa Perempuan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 text-lg shrink-0">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Perempuan (P)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-pink-900 font-mono">
                {summary.total_female}
              </span>
              <span className="text-xs text-slate-500 font-medium">Siswi</span>
            </div>
          </div>
        </div>

        {/* Rombel / Alokasi Ruang */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg shrink-0">
            <FontAwesomeIcon icon={faDoorOpen} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isTeacher ? "Jumlah Rombel" : "Teralokasi Ruang"}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
                {isTeacher ? summary.total_classes : summary.total_allocated}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {isTeacher ? "Kelas Ajar" : `/${summary.total_students} Siswa`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. FILTER DAN SEARCH BAR */}
      {/* ==================================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Filter Kelas */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
              <FontAwesomeIcon icon={faFilter} className="text-slate-400" />
              <span>Kelas:</span>
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">
                {isTeacher ? "Semua Kelas Ajar Anda" : "Semua Rombel / Kelas"}
              </option>
              {classes.map((c) => (
                <option key={c.name} value={c.name}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tingkat (Hanya untuk Admin) */}
          {isAdminOrStaff && (
            <div className="flex items-center gap-2 min-w-[150px]">
              <span className="text-xs font-bold text-slate-600 shrink-0">Tingkat:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="all">Semua Tingkat</option>
                <option value="10">Tingkat X (10)</option>
                <option value="11">Tingkat XI (11)</option>
                <option value="12">Tingkat XII (12)</option>
              </select>
            </div>
          )}
        </div>

        {/* Input Pencarian Siswa */}
        <div className="relative w-full md:w-72 shrink-0">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIS, NISN..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. TABEL DATA SISWA */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Tabel Visual */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUserGraduate} className="text-indigo-600 text-sm" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Daftar Peserta Didik
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredStudents.length} Siswa Ditemukan
            </span>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tersinkronisasi otomatis dari SIAK
          </span>
        </div>

        {/* Isi Tabel */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-600">Memuat Data Siswa...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-1">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak Ada Data Siswa Ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {isTeacher
                ? "Tidak ada siswa yang terdaftar di kelas ajar yang Anda pilih, atau belum ada siswa yang tersinkronisasi untuk kelas ini."
                : "Silakan periksa filter kelas, tingkat, atau kata kunci pencarian Anda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 text-center w-12">No</th>
                  <th className="py-3 px-4">Nama Lengkap &amp; Identitas</th>
                  <th className="py-3 px-4 text-center">Kelas / Rombel</th>
                  <th className="py-3 px-4 text-center">L/P</th>
                  <th className="py-3 px-4">Ruang &amp; Sesi Ujian</th>
                  <th className="py-3 px-4">Password Kartu CBT</th>
                  <th className="py-3 px-4 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const isPassVisible = visiblePasswords[s.id] || false;
                  const isCopied = copiedId === s.id;
                  const genderCode = strGender(s.gender);

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Nama & Identitas Siswa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {s.photo ? (
                            <img
                              src={s.photo}
                              alt={s.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              onError={(e) => {
                                (e.target as any).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-100 to-blue-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0 border border-indigo-200 shadow-2xs">
                              {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate group-hover:text-indigo-700 transition">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>NIS: {s.nis || "-"}</span>
                              <span>&bull;</span>
                              <span>NISN: {s.nisn || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kelas & Tingkat */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                          {s.class_name || "-"}
                        </span>
                        {s.grade && (
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                            Tingkat {s.grade}
                          </span>
                        )}
                      </td>

                      {/* Jenis Kelamin */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            genderCode === "L"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : genderCode === "P"
                              ? "bg-pink-50 text-pink-700 border border-pink-200"
                              : "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {genderCode}
                        </span>
                      </td>

                      {/* Ruang & Sesi Ujian */}
                      <td className="py-3 px-4">
                        {s.room_name ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                              <FontAwesomeIcon icon={faDoorOpen} className="text-emerald-600 text-[10px]" />
                              <span>{s.room_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">
                                ({s.session_name || "Sesi 1"})
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              No. Meja: <strong className="text-indigo-600">{s.seat_number ?? "-"}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Belum dialokasikan
                          </span>
                        )}
                      </td>

                      {/* Password Kartu Login CBT */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-800 border border-slate-200">
                            {isPassVisible ? s.exam_password || s.nisn || "-" : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(s.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer text-xs"
                            title={isPassVisible ? "Sembunyikan Password" : "Lihat Password"}
                          >
                            <FontAwesomeIcon icon={isPassVisible ? faEyeSlash : faEye} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(s.id, s.exam_password || s.nisn || "")}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer text-xs ${
                              isCopied
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                            title="Salin Password Ujian"
                          >
                            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                          </button>
                        </div>
                      </td>

                      {/* Tombol Aksi */}
                      <td className="py-3 px-4 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition cursor-pointer shadow-2xs active:scale-95"
                          title="Tinjau Kartu & Detail Siswa"
                        >
                          <FontAwesomeIcon icon={faIdCard} className="mr-1" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 6. MODAL DETAIL / KARTU SISWA */}
      {/* ==================================================================== */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faIdCard} className="text-indigo-400 text-lg" />
                <div>
                  <h3 className="text-sm font-bold text-white">Profil Peserta Didik</h3>
                  <span className="text-[10px] text-indigo-200">Kartu Kredensial Ujian CBT</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Tutup"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                {selectedStudent.photo ? (
                  <img
                    src={selectedStudent.photo}
                    alt={selectedStudent.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-100 text-indigo-600 text-2xl font-black flex items-center justify-center shadow-md">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black text-slate-900">{selectedStudent.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Kelas {selectedStudent.class_name || "-"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Tingkat {selectedStudent.grade || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Detail List */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">NIS</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStudent.nis || "-"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">NISN</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStudent.nisn || "-"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">NIK</span>
                  <span className="font-mono font-bold text-slate-800">{selectedStudent.nik || "-"}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Jenis Kelamin</span>
                  <span className="font-bold text-slate-800">
                    {strGenderFull(selectedStudent.gender)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Ruang Ujian</span>
                  <span className="font-bold text-slate-800">
                    {selectedStudent.room_name || "Belum dialokasikan"}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Sesi &amp; Meja</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedStudent.session_name || "-"} / Meja {selectedStudent.seat_number ?? "-"}
                  </span>
                </div>
              </div>

              {/* Box Kredensial Login Kartu */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faKey} className="text-amber-600" />
                    <span>Password Kartu Login CBT:</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Kredensial Siswa
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200">
                  <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                    {selectedStudent.exam_password || selectedStudent.nisn || "-"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPassword(
                        selectedStudent.id,
                        selectedStudent.exam_password || selectedStudent.nisn || ""
                      )
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={copiedId === selectedStudent.id ? faCheck : faCopy} />
                    <span>{copiedId === selectedStudent.id ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-amber-800">
                  Siswa dapat login menggunakan NISN/NIS dan password kartu di atas saat membuka portal CBT.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. PRINT ONLY STYLING */}
      {/* ==================================================================== */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav,
          aside,
          header {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function strGender(g?: string): string {
  if (!g) return "-";
  const s = g.toLowerCase().trim();
  if (s === "male" || s === "l" || s === "laki-laki") return "L";
  if (s === "female" || s === "p" || s === "perempuan") return "P";
  return g;
}

function strGenderFull(g?: string): string {
  if (!g) return "-";
  const s = g.toLowerCase().trim();
  if (s === "male" || s === "l" || s === "laki-laki") return "Laki-Laki (L)";
  if (s === "female" || s === "p" || s === "perempuan") return "Perempuan (P)";
  return g;
}
