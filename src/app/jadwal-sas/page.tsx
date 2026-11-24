"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faArrowLeft,
  faClock,
  faDoorOpen,
  faUsers,
  faUserTie,
  faShieldHalved,
  faPrint,
  faRotate,
  faCircleCheck,
  faCircleExclamation,
  faBookOpen,
  faLocationDot,
  faDesktop,
  faFileLines,
  faFilter,
  faChalkboardUser,
  faCircleInfo,
  faSchool,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";

export default function JadwalSayaPage() {
  const { user, token, isTeacher, isAdminOrStaff, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"all" | "room" | "backup">("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  // Fetch data jadwal jaga
  const fetchMySchedule = async (teacherName?: string, isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setLoading(true);
      let url = "/api/cbt-backend/api/cbt/schedule/my-schedule";
      const target = teacherName !== undefined ? teacherName : selectedTeacherName;
      if (target) {
        url += `?teacher_name=${encodeURIComponent(target)}`;
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedTeacherName && json.teacher?.name) {
          setSelectedTeacherName(json.teacher.name);
        }
      } else {
        console.error("Gagal mengambil data jadwal:", await res.text());
      }
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMySchedule();
    }
  }, [token]);

  // Polling otomatis setiap 5 detik agar status tombol langsung aktif tanpa refresh manual
  useEffect(() => {
    if (!token) return;
    const intervalTimer = setInterval(() => {
      fetchMySchedule(selectedTeacherName, true);
    }, 5000);
    return () => clearInterval(intervalTimer);
  }, [token, selectedTeacherName]);

  // Format Tanggal Bahasa Indonesia
  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filter daftar tugas gabungan
  const allDuties = useMemo(() => {
    if (!data) return [];
    const rooms = data.room_assignments || [];
    const backups = data.backup_assignments || [];
    return [...rooms, ...backups].sort((a: any, b: any) => {
      const dComp = (a.exam_date || "").localeCompare(b.exam_date || "");
      if (dComp !== 0) return dComp;
      return (a.session_name || "").localeCompare(b.session_name || "");
    });
  }, [data]);

  const filteredDuties = useMemo(() => {
    return allDuties.filter((item: any) => {
      if (filterTab === "room" && item.type !== "room") return false;
      if (filterTab === "backup" && item.type !== "backup") return false;
      if (filterDate !== "all" && item.exam_date !== filterDate) return false;
      return true;
    });
  }, [allDuties, filterTab, filterDate]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-spin mb-4">
          <FontAwesomeIcon icon={faRotate} className="text-xl" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">Memuat jadwal tugas pengawas...</p>
        <span className="text-slate-400 text-xs mt-1">Menyinkronkan data dari sistem CBT</span>
      </div>
    );
  }

  const teacher = data?.teacher || { name: user?.name || "Bapak/Ibu Guru", nip: "-" };
  const summary = data?.summary || {
    total_duties: 0,
    room_duties_count: 0,
    backup_duties_count: 0,
    distinct_dates_count: 0,
    distinct_dates: [],
  };
  const school = data?.school_profile || {};
  const isSelected = Boolean(data?.is_selected_supervisor);
  const availableDates: string[] = summary.distinct_dates || [];

  return (
    <>
      {/* ============================================================== */}
      {/* 1. TAMPILAN LAYAR APLIKASI (DISEMBUNYIKAN SAAT PRINT)            */}
      {/* ============================================================== */}
      <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6 print:hidden">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              title="Kembali ke Dashboard"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  Jadwal Jaga Saya
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  Read-Only
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Portal informasi penugasan pengawas ruang dan jadwal piket cadangan ujian
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync (Otomatis)
            </span>

            <button
              onClick={() => fetchMySchedule(selectedTeacherName)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Segarkan data jadwal sekarang"
            >
              <FontAwesomeIcon icon={faRotate} className={loading ? "animate-spin" : ""} />
              <span>Segarkan</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={summary.total_duties === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cetak Surat Tugas & Jadwal Pengawas Resmi"
            >
              <FontAwesomeIcon icon={faPrint} />
              <span>Cetak Jadwal</span>
            </button>
          </div>
        </div>

        {/* BANNER KETIKA SELURUH UJIAN TELAH SELESAI */}
        {data?.is_exam_completed && (
          <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Periode Pelaksanaan Ujian Telah Selesai
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Selesai & Tersimpan
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Seluruh sesi ujian sekolah telah ditutup oleh Panitia/Admin. Terima kasih atas dedikasi dan tugas pengawasan Anda. Seluruh berkas nilai, presensi, dan berita acara tetap aman tersimpan di sistem.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Ke Halaman Utama</span>
            </Link>
          </div>
        )}

        {/* Profile Card & Admin Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-200 shrink-0">
                {teacher.name ? teacher.name.charAt(0).toUpperCase() : "G"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {teacher.name}
                  </h2>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
                      Pengawas Terdaftar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <FontAwesomeIcon icon={faCircleInfo} className="text-slate-400" />
                      Bukan Pengawas Inti
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>
                    NIP: <strong className="text-slate-700">{teacher.nip || "-"}</strong>
                  </span>
                  {teacher.email && (
                    <span>
                      Email: <strong className="text-slate-700">{teacher.email}</strong>
                    </span>
                  )}
                  <span>
                    Instansi: <strong className="text-slate-700">{school.school_name || "Sekolah"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Jika User adalah Admin/Staff, sediakan Switcher Guru */}
            {isAdminOrStaff && data?.all_teachers && data.all_teachers.length > 0 && (
              <div className="lg:w-80 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <FontAwesomeIcon icon={faChalkboardUser} className="mr-1 text-blue-600" />
                  Pratinjau Jadwal Guru Lain (Mode Admin)
                </label>
                <select
                  value={selectedTeacherName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSelectedTeacherName(newName);
                    fetchMySchedule(newName);
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {data.all_teachers.map((t: any, idx: number) => (
                    <option key={idx} value={t.name}>
                      {t.name} {t.is_supervisor ? "(★ Pengawas)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Statistik Ringkas Penugasan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Penugasan
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.total_duties}
              </span>
              <span className="text-xs font-medium text-slate-400">Sesi Ujian</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pengawas Ruangan
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faDoorOpen} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.room_duties_count}
              </span>
              <span className="text-xs font-medium text-slate-400">Ruang Ujian</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pengawas Cadangan
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.backup_duties_count}
              </span>
              <span className="text-xs font-medium text-slate-400">Sesi Standby</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hari Bertugas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faClock} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {summary.distinct_dates_count}
              </span>
              <span className="text-xs font-medium text-slate-400">Hari Berbeda</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Tab Kategori */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === "all"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Jadwal ({summary.total_duties})
            </button>
            <button
              onClick={() => setFilterTab("room")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === "room"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pengawas Ruang ({summary.room_duties_count})
            </button>
            <button
              onClick={() => setFilterTab("backup")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterTab === "backup"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cadangan Standby ({summary.backup_duties_count})
            </button>
          </div>

          {/* Filter Tanggal */}
          {availableDates.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <FontAwesomeIcon icon={faFilter} className="text-slate-400 text-xs" />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Semua Tanggal Ujian</option>
                {availableDates.map((d, i) => (
                  <option key={i} value={d}>
                    {formatDateIndo(d)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Daftar Kartu Penugasan */}
        {filteredDuties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Belum Ada Jadwal Jaga Ditemukan
            </h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mt-1 leading-relaxed">
              {isSelected
                ? "Bapak/Ibu sudah terdaftar sebagai pengawas resmi, namun panitia ujian belum menempatkan jadwal sesi atau ruangan untuk Anda."
                : "Nama Bapak/Ibu saat ini belum dialokasikan ke jadwal pengawas ruang atau cadangan. Silakan hubungi Panitia Ujian / Admin CBT jika Anda ditugaskan mengawas."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDuties.map((duty: any, idx: number) => {
              const isRoom = duty.type === "room";
              const isSessionActive = Boolean(duty.is_session_active || duty.session_status === "active");
              const isSessionCompleted = duty.session_status === "completed";

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden shadow-2xs ${
                    isRoom
                      ? isSessionActive
                        ? "border-emerald-300 border-l-4 border-l-emerald-500 shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                        : isSessionCompleted
                        ? "border-slate-200 border-l-4 border-l-slate-400"
                        : "border-slate-200 border-l-4 border-l-blue-600"
                      : "border-slate-200 border-l-4 border-l-amber-500"
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header Kartu: Tanggal, Sesi & Badge Posisi */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Hari & Tanggal
                        </span>
                        <h4 className="text-base font-extrabold text-slate-800 mt-0.5">
                          {formatDateIndo(duty.exam_date)}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        {isRoom && (
                          <>
                            {data?.is_exam_completed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-[10px]" />
                                Selesai & Tersimpan
                              </span>
                            ) : isSessionActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                Sesi Aktif
                              </span>
                            ) : isSessionCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <FontAwesomeIcon icon={faCircleCheck} className="text-slate-400 text-[10px]" />
                                Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Menunggu Admin memulai sesi ujian ini di Status Tes">
                                <FontAwesomeIcon icon={faLock} className="text-[10px] text-amber-500" />
                                Belum Dimulai
                              </span>
                            )}
                          </>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                            isRoom
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={isRoom ? faDoorOpen : faShieldHalved}
                            className="text-[10px]"
                          />
                          {duty.role_label}
                        </span>
                      </div>
                    </div>

                    {/* Sesi & Waktu */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sesi Ujian
                        </span>
                        <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                          {duty.session_name || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Waktu Pelaksanaan
                        </span>
                        <span className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                          {duty.session_time || "- WIB"}
                        </span>
                      </div>
                    </div>

                    {/* Informasi Ruangan & Lokasi */}
                    {isRoom ? (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                            <FontAwesomeIcon icon={faLocationDot} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              Ruang: {duty.room_name}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {duty.room_location} • Kapasitas: {duty.room_capacity} Siswa
                            </span>
                          </div>
                        </div>

                        {/* Rekan Pengawas */}
                        <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                            <FontAwesomeIcon icon={faUsers} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">
                              Rekan Pengawas Ruang:
                            </span>
                            {duty.partners && duty.partners.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {duty.partners.map((pName: string, pIdx: number) => (
                                  <span
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                                  >
                                    <FontAwesomeIcon icon={faUserTie} className="text-[9px] text-slate-400" />
                                    {pName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Pengawas Tunggal di Ruangan Ini
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Proktor Ruang jika ada */}
                        {duty.proctor_name && duty.proctor_name.trim() !== "" && duty.proctor_name !== "-" && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150">
                            <FontAwesomeIcon icon={faDesktop} className="text-blue-500 text-xs" />
                            <span>
                              Proktor: <strong>{duty.proctor_name}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                            <FontAwesomeIcon icon={faLocationDot} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              Lokasi: {duty.location}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Standby di Ruang Panitia / Sekretariat CBT
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCircleInfo} className="text-amber-600" />
                            Petunjuk Pengawas Cadangan
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            {duty.notes || "Harap siap di sekretariat panitia ujian 15 menit sebelum sesi dimulai untuk menggantikan pengawas utama yang berhalangan hadir."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mata Pelajaran yang Diujikan pada Hari Ini */}
                    {duty.subjects && duty.subjects.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Mata Pelajaran yang Diujikan
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {duty.subjects.map((sub: any, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                            >
                              <FontAwesomeIcon icon={faBookOpen} className="text-[10px] text-blue-500" />
                              {sub.subject_name}
                              {sub.start_time ? ` (${sub.start_time} - ${sub.end_time || ""})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Kartu Pengingat & Quick Action */}
                  <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faFileLines} className="text-slate-400" />
                      Wajib isi Berita Acara & Presensi
                    </span>
                    {isRoom ? (
                      <div className="flex items-center gap-2">
                        {data?.is_exam_completed ? (
                          <Link
                            href={`/pengawas-ruang?date=${encodeURIComponent(duty.exam_date || "")}&session=${encodeURIComponent(duty.session_name || "")}&room=${encodeURIComponent(duty.room_name || "")}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                            title="Ujian telah selesai. Klik untuk melihat rekapan presensi dan berita acara (mode arsip)."
                          >
                            <FontAwesomeIcon icon={faFileLines} />
                            <span>Lihat Rekap / Berita Acara</span>
                          </Link>
                        ) : isSessionActive ? (
                          <Link
                            href={`/pengawas-ruang?date=${encodeURIComponent(duty.exam_date || "")}&session=${encodeURIComponent(duty.session_name || "")}&room=${encodeURIComponent(duty.room_name || "")}`}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs hover:shadow-md cursor-pointer animate-pulse"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping inline-block" />
                            <FontAwesomeIcon icon={faDesktop} />
                            <span>Mulai Proktoring & Presensi</span>
                          </Link>
                        ) : isSessionCompleted ? (
                          <Link
                            href={`/pengawas-ruang?date=${encodeURIComponent(duty.exam_date || "")}&session=${encodeURIComponent(duty.session_name || "")}&room=${encodeURIComponent(duty.room_name || "")}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                            title="Sesi ini telah selesai. Klik untuk melihat kembali rekapan presensi dan berita acara."
                          >
                            <FontAwesomeIcon icon={faFileLines} />
                            <span>Lihat Rekap / Berita Acara</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-500 border border-slate-300/80 text-xs font-bold cursor-not-allowed select-none shadow-2xs"
                              title="Tombol ini akan aktif otomatis setelah Admin CBT memulai sesi ujian ini di menu Status Tes."
                            >
                              <FontAwesomeIcon icon={faLock} className="text-slate-400 text-xs" />
                              <span>Menunggu Admin Memulai Sesi</span>
                            </div>
                            {isAdminOrStaff && (
                              <Link
                                href={`/pengawas-ruang?date=${encodeURIComponent(duty.exam_date || "")}&session=${encodeURIComponent(duty.session_name || "")}&room=${encodeURIComponent(duty.room_name || "")}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold border border-blue-200 transition"
                                title="Akses Pratinjau Ruang Khusus Admin/Staff"
                              >
                                <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
                                <span>Preview Admin</span>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-slate-600">
                        Standby di Ruang Panitia
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Petunjuk & Tata Tertib Pengawas Ringkas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faCircleInfo} className="text-blue-600" />
            Tata Tertib & Panduan Pengawas Ruang Asesmen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <strong>Kehadiran Tepat Waktu:</strong> Pengawas wajib hadir di Ruang Sekretariat CBT paling lambat 15 menit sebelum sesi ujian dimulai untuk mengambil berkas administrasi.
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <strong>Pemeriksaan Peserta:</strong> Memeriksa kartu login siswa, mencocokkan identitas peserta, dan memastikan siswa duduk sesuai nomor meja yang ditentukan.
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <strong>Integritas Ujian:</strong> Memastikan peserta tidak membawa catatan, gawai/HP tambahan, atau membuka tab lain selama ujian berlangsung (sistem anti-cheat aktif).
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                4
              </span>
              <div>
                <strong>Penyelesaian Administrasi:</strong> Mengedarkan Daftar Hadir, menandatangani Berita Acara Ujian bersama rekan pengawas, dan mengembalikan berkas ke panitia.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DOKUMEN CETAK RESMI A4 (HANYA MUNCUL SAAT PRINT)            */}
      {/* ============================================================== */}
      <div className="hidden print:block font-serif text-slate-900 bg-white p-8 max-w-[210mm] mx-auto text-sm leading-normal">
        {/* Kop Surat Sekolah Resmi */}
        <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900 mb-6">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt="Logo"
              className="w-20 h-20 object-contain shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-slate-800 flex items-center justify-center text-slate-700 font-bold text-2xl shrink-0">
              <FontAwesomeIcon icon={faSchool} />
            </div>
          )}
          <div className="flex-1 text-center">
            <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-700">
              PEMERINTAH DAERAH PROVINSI / KABUPATEN
            </h2>
            <h1 className="text-xl font-extrabold uppercase text-slate-900 tracking-tight">
              {school.school_name || "SMA NEGERI 1 INDONESIA"}
            </h1>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {school.address || "Jalan Pendidikan No. 1"} • Telp: {school.phone || "(0361) 123456"}
            </p>
            <p className="text-[10px] text-slate-500">
              Website / CBT Portal: {school.website || "http://cbt.sekolah.sch.id"} • Email: {school.email || "info@sekolah.sch.id"}
            </p>
          </div>
        </div>

        {/* Judul Dokumen Cetak */}
        <div className="text-center my-5">
          <h2 className="text-base font-extrabold uppercase tracking-wide underline underline-offset-4">
            JADWAL PENUGASAN PENGAWAS RUANG UJIAN
          </h2>
          <span className="text-xs text-slate-600 block mt-1">
            Tahun Pelajaran {new Date().getFullYear()} / {new Date().getFullYear() + 1}
          </span>
        </div>

        {/* Data Identitas Guru */}
        <div className="my-4 border border-slate-300 p-3.5 rounded-lg bg-slate-50/50">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="w-36 font-semibold py-1">Nama Lengkap Guru</td>
                <td className="w-4">:</td>
                <td className="font-bold text-slate-900">{teacher.name}</td>
              </tr>
              <tr>
                <td className="font-semibold py-1">NIP / ID Guru</td>
                <td>:</td>
                <td>{teacher.nip || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold py-1">Status Penugasan</td>
                <td>:</td>
                <td className="font-semibold text-slate-800">
                  {isSelected ? "Pengawas Resmi Terdaftar" : "Pengawas Cadangan / Guru Mata Pelajaran"}
                </td>
              </tr>
              <tr>
                <td className="font-semibold py-1">Total Beban Tugas</td>
                <td>:</td>
                <td>
                  <strong>{summary.total_duties} Sesi</strong> ({summary.room_duties_count} Ruang Ujian, {summary.backup_duties_count} Cadangan Standby)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel Rincian Jadwal Mengawas */}
        <div className="my-5">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-800">
            Rincian Jadwal Mengawas:
          </h3>
          <table className="w-full text-xs border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                <th className="border border-slate-800 px-2 py-2 w-8">No</th>
                <th className="border border-slate-800 px-3 py-2 w-32">Hari, Tanggal</th>
                <th className="border border-slate-800 px-2 py-2 w-24">Sesi & Jam</th>
                <th className="border border-slate-800 px-2 py-2 w-24">Ruangan</th>
                <th className="border border-slate-800 px-3 py-2 w-28">Posisi Tugas</th>
                <th className="border border-slate-800 px-3 py-2">Rekan Pengawas / Proktor</th>
                <th className="border border-slate-800 px-2 py-2 w-16">Paraf</th>
              </tr>
            </thead>
            <tbody>
              {allDuties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-slate-800 text-center py-4 text-slate-500 italic">
                    Belum ada jadwal penugasan mengawas untuk guru ini.
                  </td>
                </tr>
              ) : (
                allDuties.map((d: any, i: number) => {
                  const isRoom = d.type === "room";
                  const partnersStr = isRoom
                    ? (d.partners && d.partners.length > 0 ? d.partners.join(", ") : "Pengawas Tunggal")
                    : "Standby Sekretariat";

                  return (
                    <tr key={i} className="text-slate-800">
                      <td className="border border-slate-800 text-center py-2">{i + 1}</td>
                      <td className="border border-slate-800 px-2.5 py-2 font-medium">
                        {formatDateIndo(d.exam_date)}
                      </td>
                      <td className="border border-slate-800 text-center px-1 py-2">
                        <div className="font-bold">{d.session_name}</div>
                        <div className="text-[10px] text-slate-600">{d.session_time || "-"}</div>
                      </td>
                      <td className="border border-slate-800 text-center px-2 py-2 font-semibold">
                        {isRoom ? d.room_name : "Sekretariat"}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-2 text-center font-bold">
                        {d.role_label}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-2 text-[11px]">
                        {partnersStr}
                        {d.proctor_name ? ` (Proktor: ${d.proctor_name})` : ""}
                      </td>
                      <td className="border border-slate-800 py-2"></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Catatan Singkat Tata Tertib */}
        <div className="my-4 text-[11px] text-slate-600 border-l-2 border-slate-600 pl-3 space-y-0.5">
          <p className="font-bold text-slate-800">Catatan Pengawas:</p>
          <p>1. Hadir di Ruang Sekretariat CBT selambat-lambatnya 15 menit sebelum sesi dimulai.</p>
          <p>2. Menandatangani Daftar Hadir Pengawas dan Berita Acara Pelaksanaan Ujian pada setiap sesi.</p>
          <p>3. Apabila berhalangan hadir, wajib memberitahukan Panitia Ujian paling lambat H-1 sebelum pelaksanaan.</p>
        </div>

        {/* Bagian Titimangsa & Tanda Tangan */}
        <div className="mt-8 grid grid-cols-2 text-center text-xs break-inside-avoid">
          <div>
            <p className="mb-14">Pengawas Ruang Ujian,</p>
            <p className="font-bold underline underline-offset-2">{teacher.name}</p>
            <p className="text-slate-600">NIP. {teacher.nip || "...................................."}</p>
          </div>
          <div>
            <p className="text-slate-700 mb-1">
              {school.city || "Denpasar"},{" "}
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
            <p className="mb-14">
              Mengetahui,<br />
              <strong>Kepala Sekolah / Ketua Panitia</strong>
            </p>
            <p className="font-bold underline underline-offset-2">
              {school.headmaster_name || "Kepala Sekolah"}
            </p>
            <p className="text-slate-600">
              NIP. {school.headmaster_nip || "...................................."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
