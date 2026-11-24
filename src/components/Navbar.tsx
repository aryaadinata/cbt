"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCalendarDays,
  faClock,
  faRightFromBracket,
  faUserGear,
  faChevronDown,
  faShieldHalved,
  faSchool,
  faBell,
  faCheck,
  faCheckDouble,
  faArrowRight,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useCbtSettings } from "@/context/CbtSettingsContext";
import { useNotifications } from "@/context/NotificationContext";
import Swal from "sweetalert2";

export default function Navbar() {
  const pathname = usePathname();
  const { toggleSidebar, toggleMobile } = useSidebar();
  const { user, isStudent, isTeacher, isAdminOrStaff, logout } = useAuth();
  const { settings } = useCbtSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [currentDate, setCurrentDate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(now)
      );
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: "Konfirmasi Logout",
      text: "Apakah Anda yakin ingin keluar dari sistem CBT?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  const getRoleLabel = () => {
    if (isStudent) return `Siswa ${user?.class_name ? `(${user.class_name})` : ""}`;
    if (isTeacher) return "Pendidik / Guru";
    return "Panitia Ujian / Admin";
  };

  const getRoleBadgeColor = () => {
    if (isStudent) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (isTeacher) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-purple-50 text-purple-700 border-purple-200";
  };

  const getPageBreadcrumb = () => {
    if (pathname === "/") {
      if (isTeacher) return "Ulangan Harian Saya";
      if (isStudent) return "Ujian Saya";
      return "Ujian";
    }
    if (pathname.startsWith("/status-tes")) return "Ujian > Status Tes";
    if (pathname.startsWith("/ruang-ujian")) return "Ujian > Ruang Ujian";
    if (pathname.startsWith("/pengawas-ujian")) return "Ujian > Pengawas Ujian";
    if (pathname.startsWith("/jadwal-pengawas")) return "Ujian > Jadwal Pengawas";
    if (pathname.startsWith("/jadwal")) return "Ujian > Penjadwalan Ujian";
    if (pathname.startsWith("/ujian/mapping")) return "Ujian > Atur Mapping Ujian";
    if (pathname.startsWith("/ujian/pantau")) return "Ulangan Harian > Proktoring & Pantau Live";
    if (pathname.startsWith("/proktoring")) return "Ulangan Harian > Proktoring";
    if (pathname.startsWith("/ujian/buat")) return isTeacher ? "Buat Ulangan Harian" : "Rilis Ujian Baru";
    if (pathname.startsWith("/jadwal-sas")) return "Jadwal Jaga Saya";
    if (pathname.startsWith("/bank-soal")) return "Bank Soal & Naskah";
    if (pathname.startsWith("/cetak-kartu")) return "Cetak Kartu Login";
    if (pathname.startsWith("/dokumen-ujian")) return "Presensi & Berita Acara";
    if (pathname.startsWith("/dokumen-administrasi")) return "Dokumen Administrasi";
    if (pathname.startsWith("/hasil-ujian")) return "Hasil Ujian";
    if (pathname.startsWith("/pengaturan")) return "Pengaturan Sistem";
    if (pathname.startsWith("/sinkron")) return "Sinkronisasi Data SIAK";
    return settings?.app_name || "CBT Sekolah";
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-600 text-white border-b border-indigo-950/40 sticky top-0 z-30 shadow-md select-none backdrop-blur-md">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & App Title / Breadcrumb */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Buka Menu"
          >
            <FontAwesomeIcon icon={faBars} className="text-sm" />
          </button>

          {/* Desktop sidebar collapse toggle */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden md:flex w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Persempit/Perlebar Menu"
          >
            <FontAwesomeIcon icon={faBars} className="text-sm" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-xs font-black text-white tracking-wider uppercase drop-shadow-xs">
              {settings?.app_name || "CBT SEKOLAH"}
            </span>
            <span className="text-white/40">/</span>
            <span className="font-extrabold text-white bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20 text-[11px] shadow-2xs backdrop-blur-xs">
              {getPageBreadcrumb()}
            </span>
            {Boolean(settings?.maintenance_mode) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Maintenance</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Date/Clock, AppSwitcher & Profile Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Real-time Date & Clock */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 shadow-2xs backdrop-blur-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <FontAwesomeIcon icon={faCalendarDays} className="text-indigo-200 text-[11px]" />
              <span>{currentDate}</span>
            </span>
            <span className="text-white/30">&bull;</span>
            <span className="flex items-center gap-1.5 font-mono font-bold text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentTime}</span>
            </span>
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative w-9 h-9 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center border ${
                isNotifOpen
                  ? "bg-white text-indigo-700 shadow-md border-white"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/15 shadow-xs"
              }`}
              title="Notifikasi Penugasan"
            >
              <FontAwesomeIcon icon={faBell} className="text-sm" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse ring-2 ring-indigo-800">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                      Notifikasi
                    </h3>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {unreadCount} Baru
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Semua terbaca
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                      title="Tandai semua telah dibaca"
                    >
                      <FontAwesomeIcon icon={faCheckDouble} className="text-[10px]" />
                      <span>Tandai dibaca</span>
                    </button>
                  )}
                </div>

                {/* Notif Items List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2 text-sm">
                        <FontAwesomeIcon icon={faBell} />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Belum Ada Notifikasi</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Notifikasi penugasan pembuatan soal akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const isUnread = !item.is_read;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 transition-colors flex items-start gap-2.5 ${
                            isUnread ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isUnread
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <FontAwesomeIcon icon={faBookOpen} className="text-xs" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`text-xs truncate ${isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                                {item.title}
                              </p>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Baru saja"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isUnread && (
                                  <button
                                    type="button"
                                    onClick={() => markAsRead(item.id)}
                                    className="text-[10px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded hover:bg-white transition cursor-pointer"
                                    title="Tandai sudah dibaca"
                                  >
                                    <FontAwesomeIcon icon={faCheck} className="mr-1 text-[9px]" />
                                    <span>Sudah dibaca</span>
                                  </button>
                                )}
                                <Link
                                  href={item.link || "/bank-soal"}
                                  onClick={() => {
                                    if (isUnread) markAsRead(item.id);
                                    setIsNotifOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100/70 hover:bg-indigo-200/80 px-2 py-0.5 rounded-lg transition flex items-center gap-1"
                                >
                                  <span>Buka Soal</span>
                                  <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer link to bank-soal */}
                <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50 rounded-b-xl">
                  <Link
                    href="/bank-soal"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition flex items-center justify-center gap-1.5 py-1"
                  >
                    <span>Buka Seluruh Bank Soal</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/20" />

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl transition active:scale-95 cursor-pointer border ${
                isProfileOpen
                  ? "bg-white/25 border-white/30 text-white shadow-md"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white shadow-xs"
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-white text-indigo-700 font-black text-xs flex items-center justify-center shadow-xs uppercase ring-2 ring-white/30">
                {user.name ? user.name.charAt(0) : "U"}
              </div>

              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white truncate max-w-[130px] leading-tight drop-shadow-xs">
                  {user.name}
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {getRoleLabel()}
                </span>
              </div>

              <FontAwesomeIcon
                icon={faChevronDown}
                className={`text-[10px] text-white/70 transition-transform ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {user.username || user.nisn || "-"}
                  </p>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1.5 ${getRoleBadgeColor()}`}
                  >
                    {getRoleLabel()}
                  </span>
                </div>

                <div className="p-1">
                  <a
                    href="http://localhost:3000/portal"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition"
                  >
                    <FontAwesomeIcon icon={faSchool} className="text-slate-400 text-xs w-4" />
                    <span>Portal Sekolah</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-rose-500 text-xs w-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
