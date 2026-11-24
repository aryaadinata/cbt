"use client";

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTableCells,
  faGraduationCap,
  faCoins,
  faBookOpen,
  faBoxesStacked,
  faBriefcase,
  faShieldHalved,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

interface AppInfo {
  id: string;
  name: string;
  tagline: string;
  icon: any;
  color: string;
  url: string;
}

const ECOSYSTEM_APPS: AppInfo[] = [
  {
    id: "siak",
    name: "Cendekia",
    tagline: "Akademik & SIAK",
    icon: faGraduationCap,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    url: "http://localhost:3000",
  },
  {
    id: "keuangan",
    name: "Sipanda",
    tagline: "SPP & Keuangan",
    icon: faCoins,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    url: "http://localhost:3001",
  },
  {
    id: "perpustakaan",
    name: "Pustaloka",
    tagline: "E-Library",
    icon: faBookOpen,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    url: "http://localhost:3002",
  },
  {
    id: "sarpras",
    name: "Sarpras",
    tagline: "Aset & Inventaris",
    icon: faBoxesStacked,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "http://localhost:3003",
  },
  {
    id: "pkl",
    name: "Si-PKL",
    tagline: "Vokasi & DUDI",
    icon: faBriefcase,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    url: "http://localhost:3004",
  },
  {
    id: "cbt",
    name: "CBT Ujian",
    tagline: "Ulangan & SAS",
    icon: faShieldHalved,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    url: "http://localhost:3005",
  },
];

export default function AppSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Buka Aplikasi Sekolah Lainnya"
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition active:scale-95 cursor-pointer border ${
          isOpen
            ? "bg-white text-indigo-700 shadow-md border-white"
            : "bg-white/10 hover:bg-white/20 text-white border-white/15 shadow-xs"
        }`}
      >
        <FontAwesomeIcon icon={faTableCells} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
            <span className="text-xs font-bold text-slate-800">Aplikasi Sekolah Terpadu</span>
            <span className="text-[10px] font-semibold text-slate-400">Single Sign-On</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ECOSYSTEM_APPS.map((app) => {
              const isCurrent = app.id === "cbt";
              return (
                <a
                  key={app.id}
                  href={app.url}
                  className={`p-2 rounded-xl transition flex flex-col items-center text-center group border ${
                    isCurrent
                      ? "bg-blue-50/70 border-blue-200 text-blue-900"
                      : "border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs mb-1.5 border shadow-2xs ${app.color}`}
                  >
                    <FontAwesomeIcon icon={app.icon} />
                  </div>
                  <span className="text-[11px] font-bold truncate max-w-full flex items-center gap-1">
                    {app.name}
                    {isCurrent && <FontAwesomeIcon icon={faCheck} className="text-[8px] text-blue-600" />}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate max-w-full">
                    {app.tagline}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 text-center">
            <a
              href="http://localhost:3000/portal"
              className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
            >
              Lihat Seluruh Portal Layanan &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
