"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faClipboardList,
  faShieldHalved,
  faBookOpen,
  faIdCard,
  faFileLines,
  faRotate,
  faPlus,
  faRightFromBracket,
  faArrowLeft,
  faXmark,
  faGraduationCap,
  faUsers,
  faKey,
  faCalendarDays,
  faDesktop,
  faDoorOpen,
  faChalkboardUser,
  faGear,
  faChartColumn,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useCbtSettings } from "@/context/CbtSettingsContext";
import { useNotifications } from "@/context/NotificationContext";
import Swal from "sweetalert2";

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  tab?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const { user, token, isStudent, isTeacher, isAdminOrStaff, logout } = useAuth();
  const { settings } = useCbtSettings();
  const { unreadCount } = useNotifications();
  const brandLogo = settings?.logo_url || settings?.siak_logo || "";
  const brandName = settings?.app_name || "CBT SEKOLAH";
  const brandTagline = settings?.app_tagline || "Ujian Mandiri & SAS";

  // Status tugas mengawas untuk guru (baca cache awal jika ada agar tidak flicker)
  const [supervisorStatus, setSupervisorStatus] = useState<{
    has_duty: boolean;
    total_duties: number;
    room_duties_count: number;
  } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cbt_supervisor_duty");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (!token || (!isTeacher && !isAdminOrStaff)) return;

    const checkSupervisorDuty = async () => {
      try {
        const res = await fetch("/api/cbt-backend/api/cbt/schedule/my-supervisor-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const isCompleted = Boolean(data.is_exam_completed);
            const statusObj = {
              has_duty: !isCompleted && !!data.has_duty,
              total_duties: isCompleted ? 0 : (data.total_duties || 0),
              room_duties_count: isCompleted ? 0 : (data.room_duties_count || 0),
              is_exam_completed: isCompleted,
            };
            setSupervisorStatus(statusObj);
            try {
              if (isCompleted || !statusObj.has_duty) {
                localStorage.removeItem("cbt_supervisor_duty");
              } else {
                localStorage.setItem("cbt_supervisor_duty", JSON.stringify(statusObj));
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa status penugasan pengawas:", err);
      }
    };

    checkSupervisorDuty();
  }, [token, isTeacher, isAdminOrStaff, user]);

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
        try {
          localStorage.removeItem("cbt_supervisor_duty");
        } catch {}
        logout();
      }
    });
  };

  const getMenuSections = (): MenuSection[] => {
    // 1. Menu Siswa
    if (isStudent) {
      return [
        {
          title: "PORTAL PESERTA",
          items: [
            {
              label: "Ujian Saya",
              href: "/",
              icon: faClipboardList,
            },
          ],
        },
      ];
    }

    // 2. Menu Guru
    if (isTeacher) {
      const teacherSections: MenuSection[] = [
        {
          title: "TES CBT",
          items: [
            {
              label: "Daftar Tes Saya",
              href: "/",
              icon: faClipboardList,
            },
            {
              label: "Proktoring Ulangan",
              href: "/proktoring",
              icon: faEye,
            },
            {
              label: "Hasil & Nilai Ujian",
              href: "/hasil-ujian",
              icon: faChartColumn,
            },
            {
              label: "Daftar Siswa",
              href: "/data-siswa",
              icon: faUsers,
            },
          ],
        },
      ];

      // HANYA MUNCUL JIKA GURU MENDAPAT TUGAS MENGAWAS
      if (supervisorStatus?.has_duty) {
        teacherSections.push({
          title: "PENGAWAS RUANG",
          items: [
            {
              label: "Jadwal Jaga Saya",
              href: "/jadwal-sas",
              icon: faCalendarDays,
              badge: supervisorStatus.room_duties_count > 0 ? `${supervisorStatus.room_duties_count} Tugas` : undefined,
              badgeColor: "bg-blue-50 text-blue-700 border border-blue-200 font-bold",
            },
          ],
        });
      }

      teacherSections.push({
        title: "BANK SOAL",
        items: [
          {
            label: "Bank Soal Saya",
            href: "/bank-soal",
            icon: faBookOpen,
            badge: unreadCount > 0 ? `${unreadCount} Tugas` : undefined,
            badgeColor: "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-bold",
          },
        ],
      });

      return teacherSections;
    }

    // 3. Menu Admin: Menu "Ujian", "Status Tes", "Ruang Ujian"
    return [
      {
        title: "MENU UTAMA",
        items: [
          {
            label: "Ujian",
            href: "/",
            icon: faClipboardList,
          },
          {
            label: "Status Tes",
            href: "/status-tes",
            icon: faDesktop,
          },
          {
            label: "Bank Soal",
            href: "/bank-soal",
            icon: faBookOpen,
            badge: unreadCount > 0 ? `${unreadCount} Tugas` : undefined,
            badgeColor: "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-bold",
          },
          {
            label: "Data Siswa",
            href: "/data-siswa",
            icon: faUsers,
          },
          {
            label: "Ruang Ujian",
            href: "/ruang-ujian",
            icon: faDoorOpen,
          },
          {
            label: "Proktoring Ruang",
            href: "/pengawas-ruang",
            icon: faDesktop,
          },
          {
            label: "Pengawas Ujian",
            href: "/pengawas-ujian",
            icon: faChalkboardUser,
          },
          {
            label: "Jadwal Pengawas",
            href: "/jadwal-pengawas",
            icon: faCalendarDays,
          },
          {
            label: "Dokumen Administrasi",
            href: "/dokumen-administrasi",
            icon: faFileLines,
          },
          {
            label: "Hasil Ujian",
            href: "/hasil-ujian",
            icon: faChartColumn,
          },
        ],
      },
      {
        title: "SISTEM",
        items: [
          {
            label: "Sinkronisasi SIAK",
            href: "/sinkron",
            icon: faRotate,
          },
          {
            label: "Pengaturan Sistem",
            href: "/pengaturan",
            icon: faGear,
          },
        ],
      },
    ];
  };

  const menuSections = getMenuSections();

  const sidebarInner = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Header Brand */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between shrink-0">
        <Link href="/" className="flex items-center gap-3 overflow-hidden" title={brandName}>
          {brandLogo ? (
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              <img src={brandLogo} alt={brandName} className="max-h-7 max-w-7 object-contain" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-indigo-500/20 text-sm">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
          )}
          {!isCollapsed && (
            <div className="truncate">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight truncate uppercase">
                {brandName}
              </h2>
              <span className="text-[11px] text-indigo-600 font-bold block truncate">
                {brandTagline}
              </span>
            </div>
          )}
        </Link>

        {/* Close button Mobile */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
            title="Tutup Menu"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        )}
      </div>

      {/* Nav Items List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed ? (
              <span className="block text-slate-400 font-bold text-[10px] tracking-wider uppercase px-2.5 py-1">
                {section.title}
              </span>
            ) : (
              <div className="h-1.5 border-b border-slate-100 my-1 mx-1.5" />
            )}

            {section.items.map((item) => {
              // Active logic matching pathname and search query
              let isActive = false;
              if (item.tab) {
                isActive = pathname === "/" && currentTab === item.tab;
              } else if (item.href === "/") {
                isActive = (pathname === "/" && !currentTab) || pathname.startsWith("/ujian/mapping") || pathname.startsWith("/jadwal");
              } else if (item.href === "/proktoring") {
                isActive = pathname.startsWith("/proktoring") || pathname.startsWith("/ujian/pantau");
              } else {
                isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    if (isMobileOpen) closeMobile();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2 transition-all group ${
                    isActive
                      ? "bg-indigo-50/80 text-indigo-950 shadow-2xs font-bold border border-indigo-200/80"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors relative ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs shadow-indigo-400/30"
                          : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
                      }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="text-xs" />
                      {isCollapsed && item.badge && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
                      )}
                    </div>

                    {!isCollapsed && (
                      <span className="text-[12px] font-semibold text-slate-700 group-hover:text-slate-900 truncate leading-snug">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                        item.badgeColor || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Launcher & Logout */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 shrink-0 space-y-1">
        <a
          href="http://localhost:3000/portal"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-800 hover:bg-indigo-50/80 transition-colors"
          title="Kembali ke Portal Launcher Utama"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs text-indigo-600" />
          {!isCollapsed && <span className="truncate">Portal Launcher</span>}
        </a>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
          title="Keluar dari akun"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="text-xs text-rose-500" />
          {!isCollapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-200 z-30 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarInner}
          </div>
        </div>
      )}
    </>
  );
}
