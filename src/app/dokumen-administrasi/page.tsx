"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPrint,
  faFileLines,
  faClipboardCheck,
  faIdCard,
  faBuilding,
  faKey,
  faMagnifyingGlass,
  faShieldHalved,
  faDoorOpen,
  faLayerGroup,
  faCalendarDays,
  faFolderOpen,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

type PrintItem = {
  room: any;
  session: any;
  students: any[];
  supervisor1: string;
  supervisor2: string;
  examTime: string;
  subjectName: string;
};

type ActivePrintJob = {
  mode: "presensi" | "berita_acara" | "paket_harian" | "kartu_login";
  title: string;
  subtitle: string;
  items: PrintItem[];
} | null;

// Helper format tanggal ISO YYYY-MM-DD -> "Senin, 23 November 2026"
function formatDateIndoFull(isoDate: string): string {
  if (!isoDate) return "-";
  try {
    const parts = isoDate.split("-");
    const d =
      parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        : new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatDateIndoShort(isoDate: string): string {
  if (!isoDate) return "-";
  try {
    const parts = isoDate.split("-");
    const d =
      parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        : new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatDateSignature(isoDate: string): string {
  if (!isoDate) {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  try {
    const parts = isoDate.split("-");
    const d =
      parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        : new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DokumenAdministrasiPage() {
  const { token } = useAuth();

  // Tab Utama (Opsi 1):
  // - "harian": Daftar Hadir & Berita Acara (per Hari, Mapel, Sesi, Ruangan)
  // - "kartu" : Kartu Login Peserta (Sekali Cetak per Ruangan)
  const [activeTab, setActiveTab] = useState<"harian" | "kartu">("harian");
  const [cbtServerUrl, setCbtServerUrl] = useState<string>("http://localhost:3005");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCbtServerUrl(window.location.origin);
    }
  }, []);

  // State Data Master
  const [loading, setLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allAllocations, setAllAllocations] = useState<any[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);

  // Filter Global (Paket Ujian)
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("SUMATIF AKHIR SEMESTER (SAS) GANJIL");

  // Filter Khusus Tab 1 (Dokumen Harian — Mapel & Pengawas otomatis dari jadwal)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(getTodayIso());
  const [harianSessionFilter, setHarianSessionFilter] = useState<string>("all");
  const [harianSearch, setHarianSearch] = useState<string>("");

  // Filter Khusus Tab 2 (Kartu Login Sekali Cetak — Default: Username NISN & Password 6 digit acak + 1 karakter)
  const [kartuSearch, setKartuSearch] = useState<string>("");
  const [kartuGridMode, setKartuGridMode] = useState<"4" | "8">("4");
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [stuId: number]: string }>({});

  // Modal Pratinjau Cetak (Mendukung 1 Ruangan maupun Cetak Massal Banyak Ruangan)
  const [activePrintJob, setActivePrintJob] = useState<ActivePrintJob>(null);

  // Opsi Berita Acara & KOP Sekolah
  const [showHeadmasterSignature, setShowHeadmasterSignature] = useState<boolean>(true);
  const [eventNotes] = useState<string>(
    "Ujian berlangsung dengan tertib, aman, dan lancar. Seluruh koneksi server CBT dan perangkat peserta berfungsi normal tanpa kendala teknis."
  );
  const [academicYear] = useState<string>("2026/2027");

  // Profil Sekolah & Aset SIAK
  const [schoolProfile, setSchoolProfile] = useState<any>({
    school_name: "SMA Negeri 4 Singaraja",
    npsn: "12345678",
    address: "Jl. Melati, Kelurahan Banjar Jawa, Buleleng",
    phone: "(0362) 22845",
    email: "sma4singaraja@gmail.com",
    district: "Buleleng",
    regency: "Buleleng",
    province: "Bali",
    postal_code: "81113",
    headmaster_name: "Putu Gede Wartawan, S.Pd., M.Pd.",
    headmaster_nip: "197002241995031003",
    logo: "/static/uploads/school_logo_1790832844.png",
    letterhead: "/static/uploads/school_letterhead_1791255670_0bd00d.png",
    headmaster_signature: "/static/uploads/headmaster_sig_1791257072_4fd983.png",
  });

  // Helper kredensial kartu login (Default: Username = NISN, Password = 6 digit acak + 1 karakter unik)
  const getStudentCredentials = (stu: any) => {
    const sId = stu.student_id || stu.id;
    const uName = stu.nisn || stu.nis || `siswa_${sId}`;

    let pwd = stu.exam_password;
    if (!pwd) {
      const seed = Math.abs((Number(sId || 1) * 9301 + 49297) % 233280);
      const digits = String(100000 + (seed % 900000));
      const chars = ["@", "#", "$", "%", "&", "*", "!", "?"];
      const special = chars[Number(sId || 0) % chars.length];
      pwd = `${digits}${special}`;
    }

    return { uName, pwd };
  };

  // Helper KOP Surat Resmi sesuai SIAK
  const renderOfficialLetterhead = (compact: boolean = false) => {
    if (schoolProfile.letterhead) {
      return (
        <div className={`w-full flex justify-center ${compact ? "mb-1" : "mb-2"}`}>
          <img
            src={schoolProfile.letterhead}
            alt="Kop Surat Resmi Sekolah"
            className={`w-full object-contain ${compact ? "max-h-14" : "max-h-36"}`}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex items-center border-black ${
          compact ? "gap-2 pb-1.5 border-b-2" : "gap-4 pb-2 border-b-4"
        }`}
      >
        {schoolProfile.logo ? (
          <img
            src={schoolProfile.logo}
            alt="Logo Sekolah"
            className={`${compact ? "w-10 h-10" : "w-20 h-20"} object-contain shrink-0`}
          />
        ) : (
          <div
            className={`${
              compact ? "w-8 h-8 text-[8px] border" : "w-16 h-16 text-xs border-2"
            } rounded-full border-black flex items-center justify-center font-bold shrink-0`}
          >
            LOGO
          </div>
        )}
        <div className="flex-1 text-center font-serif">
          {!compact && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                PEMERINTAH PROVINSI {schoolProfile.province || "BALI"}
              </h3>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA
              </h3>
            </>
          )}
          <h1
            className={`${
              compact ? "text-xs" : "text-lg"
            } font-black uppercase tracking-tight text-black leading-tight`}
          >
            {schoolProfile.school_name || "SMA NEGERI 4 SINGARAJA"}
          </h1>
          {!compact && (
            <p className="text-[11px] leading-snug mt-0.5 text-black">
              {schoolProfile.address || "Jl. Melati, Singaraja"} &bull; Telp:{" "}
              {schoolProfile.phone || "(0362) 22845"} &bull; Pos:{" "}
              {schoolProfile.postal_code || "81113"}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Helper Blok Tanda Tangan Kepala Sekolah (hanya untuk Berita Acara, dengan opsi scan TTD SIAK)
  const renderHeadmasterSignatureBlock = () => (
    <div className="inline-flex flex-col items-center text-center">
      <div>
        <p className="font-semibold">Mengetahui,</p>
        <p className="font-semibold">
          Kepala {schoolProfile.school_name || "SMA Negeri 4 Singaraja"},
        </p>
      </div>
      <div className="h-20 flex items-center justify-center relative my-1">
        {showHeadmasterSignature && schoolProfile.headmaster_signature ? (
          <img
            src={schoolProfile.headmaster_signature}
            alt="Scan Tanda Tangan & Stempel Kepala Sekolah"
            style={{ mixBlendMode: "multiply" }}
            className="h-24 w-auto max-w-none object-contain pointer-events-none select-none"
          />
        ) : null}
      </div>
      <div>
        <p className="font-bold underline">
          {schoolProfile.headmaster_name || "Putu Gede Wartawan, S.Pd., M.Pd."}
        </p>
        <p className="text-[11px] text-slate-700">
          NIP. {schoolProfile.headmaster_nip || "197002241995031003"}
        </p>
      </div>
    </div>
  );

  // 1. Fetch Master Data
  const fetchAllData = async () => {
    try {
      setLoading(true);

      // A. Profil Sekolah & Aset SIAK
      try {
        const resSch = await fetch("/api/cbt-backend/api/cbt/sync/school-profile");
        if (resSch.ok) {
          const dataSch = await resSch.json();
          if (dataSch.school) {
            setSchoolProfile((prev: any) => ({ ...prev, ...dataSch.school }));
          }
        }
      } catch (e) {
        console.warn("Gagal memuat profil sekolah:", e);
      }

      // B. Daftar Paket Ujian
      if (token) {
        try {
          const resExams = await fetch("/api/cbt-backend/api/cbt/exams", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resExams.ok) {
            const dataExams = await resExams.json();
            const exList = dataExams.exams || [];
            setExams(exList);
            if (exList.length > 0 && !selectedExamId) {
              const firstEx = exList[0];
              setSelectedExamId(firstEx.id);
              setSelectedExamTitle(firstEx.title || "SUMATIF AKHIR SEMESTER (SAS) GANJIL");
              if (firstEx.subjects && firstEx.subjects.length > 0 && firstEx.subjects[0].exam_date) {
                setSelectedDateIso(firstEx.subjects[0].exam_date.slice(0, 10));
              } else if (firstEx.start_date) {
                setSelectedDateIso(firstEx.start_date.slice(0, 10));
              }
            }
          }
        } catch (e) {
          console.warn("Gagal memuat ujian:", e);
        }

        // C. Ruangan, Sesi, Pengawas, Alokasi
        try {
          const [resRooms, resSessions, resSup, resAlloc] = await Promise.all([
            fetch("/api/cbt-backend/api/cbt/schedule/rooms", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/cbt-backend/api/cbt/schedule/sessions", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/cbt-backend/api/cbt/schedule/supervisors", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("/api/cbt-backend/api/cbt/schedule/allocations", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          if (resRooms.ok) {
            const d = await resRooms.json();
            setRooms(d.rooms || []);
          }
          if (resSessions.ok) {
            const d = await resSessions.json();
            setSessions(d.sessions || []);
          }
          if (resSup.ok) {
            const d = await resSup.json();
            setSupervisorsList(d.assignments || []);
          }
          if (resAlloc.ok) {
            const d = await resAlloc.json();
            setAllAllocations(d.allocations || []);
          }
        } catch (e) {
          console.warn("Gagal memuat jadwal/ruangan:", e);
        }
      }
    } catch (err) {
      console.error("Gagal inisialisasi dokumen administrasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Paket Ujian Aktif & Daftar Mapelnya
  const activeExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId),
    [exams, selectedExamId]
  );
  const activeExamSubjects: any[] = activeExam?.subjects || [];

  // Kumpulan Tanggal Ujian yang Terjadwal (dari mapel paket ujian + jadwal pengawas)
  const scheduledDates = useMemo(() => {
    const dateSet = new Set<string>();
    activeExamSubjects.forEach((sub: any) => {
      if (sub.exam_date) dateSet.add(sub.exam_date.slice(0, 10));
    });
    supervisorsList.forEach((sup: any) => {
      if (sup.exam_date) dateSet.add(sup.exam_date.slice(0, 10));
    });
    return Array.from(dateSet).sort();
  }, [activeExamSubjects, supervisorsList]);

  // Sinkronkan tanggal terpilih agar selalu cocok dengan jadwal yang dibuat
  useEffect(() => {
    if (scheduledDates.length > 0 && !scheduledDates.includes(selectedDateIso)) {
      setSelectedDateIso(scheduledDates[0]);
    }
  }, [scheduledDates, selectedDateIso]);

  // Handler Ganti Paket Ujian
  const handleExamChange = (examIdStr: string) => {
    const eId = Number(examIdStr);
    setSelectedExamId(eId);
    const chosen = exams.find((e) => e.id === eId);
    if (chosen) {
      setSelectedExamTitle(chosen.title);
      if (chosen.subjects && chosen.subjects.length > 0 && chosen.subjects[0].exam_date) {
        setSelectedDateIso(chosen.subjects[0].exam_date.slice(0, 10));
      } else if (chosen.start_date) {
        setSelectedDateIso(chosen.start_date.slice(0, 10));
      }
    }
  };

  // Helper otomatis tentukan semua Mata Pelajaran yang diujikan di ruangan pada sesi & tanggal tsb
  const resolveSubjectFromSchedule = (session: any, students: any[]): string => {
    const subsOnDate = activeExamSubjects.filter(
      (s: any) => s.exam_date && s.exam_date.slice(0, 10) === selectedDateIso
    );

    if (subsOnDate.length === 0) {
      return activeExam?.subject_name || "Sesuai Jadwal Ujian";
    }

    const normTime = (t?: string) => (t || "").replace(".", ":").trim().slice(0, 5);
    const sessStart = normTime(session?.start_time);
    const sessEnd = normTime(session?.end_time);

    // 1. Cocokkan jam sesi (sama persis atau beririsan rentang waktu) pada tanggal terpilih
    const timeMatched = subsOnDate.filter((s: any) => {
      const subStart = normTime(s.start_time);
      const subEnd = normTime(s.end_time);
      if (sessStart && subStart === sessStart) return true;
      if (sessEnd && subEnd === sessEnd) return true;
      if (subStart && subEnd && sessStart && sessEnd) {
        return subStart < sessEnd && subEnd > sessStart;
      }
      return false;
    });

    const candidates = timeMatched.length > 0 ? timeMatched : subsOnDate;

    // 2. Saring berdasarkan rombel/kelas peserta yang ada di ruangan tersebut (case-insensitive)
    //    Jika 1 ruangan berisi beberapa peminatan (misal IPA & Bahasa), semua mapel yang relevan akan ditampilkan sekaligus
    if (candidates.length > 1 && students.length > 0) {
      const roomClasses = new Set(
        students.map((st: any) => (st.class_name || "").trim().toLowerCase()).filter(Boolean)
      );
      if (roomClasses.size > 0) {
        const classMatched = candidates.filter((s: any) => {
          const targets: string[] = Array.isArray(s.target_classes) ? s.target_classes : [];
          if (targets.length === 0) return true;
          return targets.some((tc) => {
            const norm = String(tc).trim().toLowerCase();
            return norm === "all" || roomClasses.has(norm);
          });
        });
        if (classMatched.length > 0) {
          return Array.from(new Set(classMatched.map((s: any) => s.subject_name))).join(", ");
        }
      }
    }

    return Array.from(new Set(candidates.map((s: any) => s.subject_name))).join(", ");
  };

  // Helper cari pengawas sesuai tanggal, ruang, sesi (prioritas cocok tanggal, fallback ruang+sesi)
  const findSupervisorForRow = (roomName: string, sessionName: string) => {
    const exact = supervisorsList.find(
      (sp: any) =>
        sp.room_name === roomName &&
        sp.session_name === sessionName &&
        sp.exam_date?.slice(0, 10) === selectedDateIso
    );
    if (exact) return exact;
    return supervisorsList.find(
      (sp: any) => sp.room_name === roomName && sp.session_name === sessionName
    );
  };

  // Helper ambil siswa untuk ruangan & sesi tertentu (terurut nomor meja)
  const getStudentsForRoomSession = (room: any, sessionName?: string) => {
    const list = allAllocations.filter((a: any) => {
      const roomMatch = a.room_id === room.id || a.room_name === room.name;
      const sessMatch = !sessionName || sessionName === "all" || a.session_name === sessionName;
      return roomMatch && sessMatch;
    });
    return [...list].sort((a: any, b: any) => (a.seat_number || 999) - (b.seat_number || 999));
  };

  // =========================================================================
  // DATA BARIS TAB 1: DOKUMEN HARIAN (Per Ruangan & Sesi pada Tanggal Terpilih)
  // =========================================================================
  const harianRows = useMemo(() => {
    const rows: Array<{
      room: any;
      session: any;
      students: any[];
      sup: any;
      subjectName: string;
    }> = [];

    const targetSessions =
      harianSessionFilter === "all"
        ? sessions.length > 0
          ? sessions
          : [{ id: 1, session_name: "Sesi 1", start_time: "07:30", end_time: "09:00" }]
        : sessions.filter((s) => s.session_name === harianSessionFilter);

    rooms.forEach((r) => {
      if (harianSearch.trim()) {
        const q = harianSearch.toLowerCase();
        const match =
          r.name?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q);
        if (!match) return;
      }

      targetSessions.forEach((s) => {
        const students = getStudentsForRoomSession(r, s.session_name);
        const sup = findSupervisorForRow(r.name, s.session_name);
        const subjectName = resolveSubjectFromSchedule(s, students);
        rows.push({ room: r, session: s, students, sup, subjectName });
      });
    });

    return rows;
  }, [
    rooms,
    sessions,
    allAllocations,
    supervisorsList,
    activeExam,
    activeExamSubjects,
    harianSessionFilter,
    harianSearch,
    selectedDateIso,
  ]);

  // =========================================================================
  // DATA BARIS TAB 2: KARTU LOGIN (1 Baris per Ruangan — Sekali Cetak)
  // =========================================================================
  const kartuRows = useMemo(() => {
    return rooms
      .filter((r) => {
        if (!kartuSearch.trim()) return true;
        const q = kartuSearch.toLowerCase();
        return r.name?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q);
      })
      .map((r) => {
        const students = getStudentsForRoomSession(r, "all");
        return {
          room: r,
          students,
        };
      });
  }, [rooms, allAllocations, kartuSearch]);

  // Generate QR Codes untuk sekumpulan siswa
  const buildQrCodesForStudents = async (studentsList: any[]) => {
    const qrMap: { [id: number]: string } = {};
    for (const s of studentsList) {
      const sId = s.student_id || s.id;
      if (qrMap[sId]) continue;
      const { uName, pwd } = getStudentCredentials(s);
      try {
        const qrData = JSON.stringify({
          cbt_app: "SMA4_SINGARAJA",
          username: uName,
          password: pwd,
        });
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 140,
          margin: 1,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        });
        qrMap[sId] = dataUrl;
      } catch (e) {
        console.warn("QR generation error:", e);
      }
    }
    setQrCodeUrls(qrMap);
  };

  // Re-generate QR codes jika toggle QR berubah saat modal kartu terbuka
  useEffect(() => {
    if (activePrintJob && activePrintJob.mode === "kartu_login" && showQrCode) {
      const allStu = activePrintJob.items.flatMap((it) => it.students);
      buildQrCodesForStudents(allStu);
    }
  }, [activePrintJob, showQrCode]);

  // Buka Pratinjau Cetak Harian (1 Ruangan atau Cetak Massal Semua Ruangan)
  const openHarianPrintJob = (
    mode: "presensi" | "berita_acara" | "paket_harian",
    rowsToPrint: typeof harianRows,
    labelScope: string
  ) => {
    if (rowsToPrint.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Tidak Ada Ruangan",
        text: "Tidak ada baris ruangan yang tersedia untuk dicetak pada filter saat ini.",
      });
      return;
    }

    const items: PrintItem[] = rowsToPrint.map((row) => ({
      room: row.room,
      session: row.session,
      students: row.students,
      supervisor1: row.sup?.supervisor1_name || "Guru Pengawas 1",
      supervisor2: row.sup?.supervisor2_name || "Guru Pengawas 2",
      examTime:
        row.session?.start_time && row.session?.end_time
          ? `${row.session.start_time} - ${row.session.end_time}`
          : "07:30 - 09:00",
      subjectName: row.subjectName,
    }));

    const modeTitle =
      mode === "presensi"
        ? "Daftar Hadir Peserta"
        : mode === "berita_acara"
        ? "Berita Acara Ujian"
        : "Paket Amplop Ruang (Daftar Hadir + Berita Acara)";

    setActivePrintJob({
      mode,
      title: `${modeTitle} — ${labelScope}`,
      subtitle: `${formatDateIndoFull(selectedDateIso)} • ${items.length} Ruangan/Sesi`,
      items,
    });
  };

  // Buka Pratinjau Cetak Kartu Login (1 Ruangan atau Semua Ruangan Sekaligus)
  const openKartuPrintJob = async (
    rowsToPrint: typeof kartuRows,
    labelScope: string
  ) => {
    const validRows =
      rowsToPrint.length > 1
        ? rowsToPrint.filter((r) => r.students.length > 0)
        : rowsToPrint;

    if (validRows.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Belum Ada Peserta",
        text: "Belum ada siswa yang dialokasikan pada ruangan terpilih.",
      });
      return;
    }

    const items: PrintItem[] = validRows.map((row) => ({
      room: row.room,
      session: { session_name: "" },
      students: row.students,
      supervisor1: "",
      supervisor2: "",
      examTime: "",
      subjectName: "",
    }));

    const allStu = items.flatMap((it) => it.students);
    if (showQrCode && allStu.length > 0) {
      await buildQrCodesForStudents(allStu);
    }

    setActivePrintJob({
      mode: "kartu_login",
      title: `Kartu Login Peserta — ${labelScope}`,
      subtitle: `${selectedExamTitle} • ${items.length} Ruangan • Total ${allStu.length} Peserta`,
      items,
    });
  };

  // =========================================================================
  // SUB-RENDERER LEMBAR DOKUMEN A4 (Dipakai untuk Satuan maupun Cetak Massal)
  // =========================================================================
  const renderDaftarHadirSheet = (item: PrintItem) => {
    const formattedDate = formatDateIndoFull(selectedDateIso);
    const sigDate = formatDateSignature(selectedDateIso);

    return (
      <div className="space-y-4 text-black font-serif print:text-black">
        {/* KOP Surat Resmi Sekolah (Sesuai SIAK) */}
        {renderOfficialLetterhead(false)}

        {/* Judul Dokumen */}
        <div className="text-center pt-1 pb-1 font-sans">
          <h2 className="text-base font-black uppercase tracking-wide">
            DAFTAR HADIR PESERTA UJIAN
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {selectedExamTitle} &bull; TAHUN AJARAN {academicYear}
          </p>
        </div>

        {/* Identitas Pelaksanaan */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-sans pb-2 border-b border-black">
          <div className="flex items-start">
            <span className="w-32 font-bold shrink-0">Mata Pelajaran</span>
            <span className="w-4 shrink-0">:</span>
            <span className="font-semibold uppercase leading-snug">{item.subjectName}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">Ruangan Ujian</span>
            <span className="w-4">:</span>
            <span className="font-semibold">
              {item.room.name} ({item.room.location || "Gedung Ujian"})
            </span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">Hari, Tanggal</span>
            <span className="w-4">:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold">Sesi Ujian</span>
            <span className="w-4">:</span>
            <span className="font-semibold">
              {item.session.session_name} ({item.examTime})
            </span>
          </div>
        </div>

        {/* Tabel Presensi Siswa */}
        <table className="w-full text-xs border border-black border-collapse font-sans mt-3">
          <thead>
            <tr className="bg-slate-100 text-center font-bold border-b border-black print:bg-transparent">
              <th className="border border-black py-2 px-1 w-8">No</th>
              <th className="border border-black py-2 px-1 w-14">No. Meja</th>
              <th className="border border-black py-2 px-2 w-24">NISN</th>
              <th className="border border-black py-2 px-2 w-20">NIS</th>
              <th className="border border-black py-2 px-2 text-left">Nama Lengkap Peserta</th>
              <th className="border border-black py-2 px-2 w-20 text-center">Kelas</th>
              <th className="border border-black py-2 px-2 w-44 text-center">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {item.students.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-black py-6 text-center text-slate-500 italic">
                  Belum ada peserta yang dialokasikan di ruangan ini.
                </td>
              </tr>
            ) : (
              item.students.map((stu: any, idx: number) => {
                const isOdd = (idx + 1) % 2 !== 0;
                return (
                  <tr key={stu.id || idx} className="border-b border-black">
                    <td className="border border-black py-2 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-black py-2 text-center font-bold">
                      {stu.seat_number ? `0${stu.seat_number}`.slice(-2) : "-"}
                    </td>
                    <td className="border border-black py-2 px-2 text-center">
                      {stu.nisn || "-"}
                    </td>
                    <td className="border border-black py-2 px-2 text-center">
                      {stu.nis || "-"}
                    </td>
                    <td className="border border-black py-2 px-2 font-bold uppercase">
                      {stu.student_name || stu.name}
                    </td>
                    <td className="border border-black py-2 text-center font-semibold">
                      {stu.class_name || "-"}
                    </td>
                    <td className="border border-black py-2 px-2 h-10">
                      <div className="flex items-center text-[11px] font-bold">
                        {isOdd ? (
                          <span className="w-1/2 text-left pl-1">{idx + 1}. .........</span>
                        ) : (
                          <span className="w-full text-right pr-2">{idx + 1}. .........</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Rekap & Tanda Tangan Pengawas Ruang (Tanpa Pengesahan Kepsek) */}
        <div className="pt-3 font-sans text-xs space-y-4">
          <div className="flex justify-between items-start text-xs border border-black p-2 rounded print:border-black">
            <div>
              <span className="font-bold">Rekapitulasi Kehadiran:</span>
              <div className="flex gap-4 mt-1">
                <span>
                  Terdaftar: <b>{item.students.length}</b> Orang
                </span>
                <span>
                  Hadir: <b>........</b> Orang
                </span>
                <span>
                  Tidak Hadir: <b>........</b> Orang
                </span>
              </div>
            </div>
            <div className="text-right italic text-[11px]">
              Ruang {item.room.name} &bull; {item.session.session_name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-2">
            <div className="text-center space-y-16">
              <div>
                <p className="font-semibold">&nbsp;</p>
                <p className="font-semibold">Pengawas Ruang 1,</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{item.supervisor1}</p>
                <p className="text-[11px] text-slate-600">
                  NIP. ........................................
                </p>
              </div>
            </div>

            <div className="text-center space-y-16">
              <div>
                <p className="font-semibold">Singaraja, {sigDate}</p>
                <p className="font-semibold">Pengawas Ruang 2,</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{item.supervisor2}</p>
                <p className="text-[11px] text-slate-600">
                  NIP. ........................................
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBeritaAcaraSheet = (item: PrintItem) => {
    const formattedDate = formatDateIndoFull(selectedDateIso);
    const sigDate = formatDateSignature(selectedDateIso);

    return (
      <div className="space-y-4 text-black font-serif print:text-black max-w-4xl mx-auto">
        {/* KOP Surat Resmi Sekolah (Sesuai SIAK) */}
        {renderOfficialLetterhead(false)}

        {/* Judul Dokumen */}
        <div className="text-center pt-1 pb-2 font-sans">
          <h2 className="text-base font-black uppercase tracking-wide">
            BERITA ACARA PELAKSANAAN UJIAN
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {selectedExamTitle} &bull; TAHUN AJARAN {academicYear}
          </p>
        </div>

        {/* Narasi Resmi Berita Acara */}
        <div className="space-y-3 text-xs leading-relaxed font-serif text-justify">
          <p>
            Pada hari ini <b>{formattedDate}</b>, bertempat di{" "}
            <b>{schoolProfile.school_name || "SMA NEGERI 4 SINGARAJA"}</b>, telah
            diselenggarakan Ujian Berbasis Komputer (Computer Based Test) untuk:
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-sans bg-slate-50 p-3 border border-black rounded print:bg-transparent">
            <div className="flex items-start">
              <span className="w-36 font-bold shrink-0">Mata Pelajaran</span>
              <span className="w-4 shrink-0">:</span>
              <span className="font-semibold uppercase leading-snug">{item.subjectName}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">Ruangan Ujian</span>
              <span className="w-4">:</span>
              <span className="font-semibold">
                {item.room.name} ({item.room.location || "Gedung Ujian"})
              </span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">Sesi Ujian</span>
              <span className="w-4">:</span>
              <span>
                {item.session.session_name} ({item.examTime})
              </span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">Alamat Server CBT</span>
              <span className="w-4">:</span>
              <span className="font-mono">{cbtServerUrl}</span>
            </div>
          </div>

          <p className="pt-1">
            Pelaksanaan ujian telah diawasi oleh pengawas yang bertugas dengan rincian
            kehadiran peserta sebagai berikut:
          </p>

          {/* Rekapitulasi Kehadiran */}
          <table className="w-full text-xs border border-black border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 text-center font-bold border-b border-black print:bg-transparent">
                <th className="border border-black py-2 px-2">Jumlah Peserta Terdaftar</th>
                <th className="border border-black py-2 px-2">Jumlah Peserta Hadir</th>
                <th className="border border-black py-2 px-2">Jumlah Peserta Tidak Hadir</th>
              </tr>
            </thead>
            <tbody className="text-center font-bold text-sm">
              <tr>
                <td className="border border-black py-2.5">{item.students.length} Orang</td>
                <td className="border border-black py-2.5 text-emerald-800 print:text-black">
                  ............ Orang
                </td>
                <td className="border border-black py-2.5 text-rose-800 print:text-black">
                  ............ Orang
                </td>
              </tr>
            </tbody>
          </table>

          <div className="space-y-1 pt-1 font-sans">
            <span className="font-bold">Catatan Khusus Selama Pelaksanaan Ujian:</span>
            <div className="border border-black p-2.5 rounded min-h-[60px] text-xs font-serif italic bg-slate-50 print:bg-transparent">
              {eventNotes}
            </div>
          </div>

          <p className="pt-1">
            Demikian Berita Acara ini dibuat dengan sebenarnya dalam rangkap secukupnya
            untuk dipergunakan sebagaimana mestinya.
          </p>
        </div>

        {/* Tanda Tangan: Pengawas 1, Pengawas 2, dan Kepala Sekolah (dengan opsi scan TTD SIAK) */}
        <div className="pt-4 font-sans text-xs">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div className="space-y-16">
              <div>
                <p className="font-semibold">&nbsp;</p>
                <p className="font-semibold">Pengawas Ruang 1,</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{item.supervisor1}</p>
                <p className="text-[11px] text-slate-600">
                  NIP. ........................................
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="font-semibold">Singaraja, {sigDate}</p>
                <p className="font-semibold">Pengawas Ruang 2,</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{item.supervisor2}</p>
                <p className="text-[11px] text-slate-600">
                  NIP. ........................................
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-6">{renderHeadmasterSignatureBlock()}</div>
        </div>
      </div>
    );
  };

  const renderKartuLoginSheet = (item: PrintItem, showRoomHeaderBanner: boolean) => (
    <div className="space-y-3 font-sans">
      {showRoomHeaderBanner && (
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5 mb-2 text-xs font-bold text-slate-900">
          <span>
            RUANG UJIAN: {item.room.name} ({item.room.location || "Gedung Ujian"})
          </span>
          <span>{item.students.length} Peserta</span>
        </div>
      )}

      {item.students.length === 0 ? (
        <div className="text-center py-12 text-slate-500 space-y-2">
          <FontAwesomeIcon icon={faIdCard} className="text-4xl text-slate-300" />
          <p className="text-sm font-bold">
            Belum ada siswa yang dialokasikan di ruangan {item.room.name}.
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-3.5 ${
            kartuGridMode === "4"
              ? "grid-cols-1 md:grid-cols-2 print:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 print:grid-cols-2 text-[11px]"
          }`}
        >
          {item.students.map((stu: any, idx: number) => {
            const sId = stu.student_id || stu.id;
            const { uName, pwd } = getStudentCredentials(stu);
            const qrUrl = qrCodeUrls[sId];

            return (
              <div
                key={`${item.room.id}-${sId || idx}`}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-3.5 bg-white print:border-black print:rounded-none relative overflow-hidden flex flex-col justify-between shadow-2xs break-inside-avoid page-break-inside-avoid"
              >
                {/* Header KOP Kartu (Sesuai Kop Surat SIAK) */}
                <div className="pb-1.5 border-b border-slate-200 print:border-black">
                  {renderOfficialLetterhead(true)}
                  <div className="text-center mt-0.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-black">
                      KARTU LOGIN PESERTA CBT
                    </div>
                    <div className="text-[9px] font-semibold text-slate-600">
                      {selectedExamTitle} &bull; T.A {academicYear}
                    </div>
                  </div>
                </div>

                {/* Konten Kartu: Foto, Biodata & QR Code */}
                <div className="py-2 flex items-start gap-2.5">
                  <div className="w-14 h-[72px] bg-slate-100 border border-slate-300 rounded-lg shrink-0 flex flex-col items-center justify-center text-slate-400 text-[9px] p-1 text-center font-semibold overflow-hidden">
                    {stu.photo ? (
                      <img
                        src={stu.photo}
                        alt={stu.student_name || stu.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <span>FOTO</span>
                        <span>2 x 3</span>
                      </>
                    )}
                  </div>

                  <div className="flex-1 space-y-1 text-xs min-w-0">
                    <div>
                      <span className="text-[9px] text-slate-500 font-medium block">
                        Nama Lengkap:
                      </span>
                      <span className="font-black text-slate-900 uppercase leading-snug line-clamp-1">
                        {stu.student_name || stu.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-500 block">NISN:</span>
                        <span className="font-bold text-slate-800">{stu.nisn || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Kelas:</span>
                        <span className="font-bold text-blue-700">{stu.class_name || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Ruang / Meja:</span>
                        <span className="font-bold text-slate-800">
                          {stu.room_name || item.room.name} /{" "}
                          {stu.seat_number ? `No.${stu.seat_number}` : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Sesi:</span>
                        <span className="font-bold text-slate-800">
                          {stu.session_name || item.session.session_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {showQrCode && qrUrl && (
                    <div className="shrink-0 flex flex-col items-center">
                      <img
                        src={qrUrl}
                        alt="QR Login"
                        className="w-16 h-16 border border-slate-200 rounded-md p-0.5 bg-white"
                      />
                      <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                        Scan QR
                      </span>
                    </div>
                  )}
                </div>

                {/* Box Kredensial Login */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2 print:border-black print:bg-transparent">
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon
                      icon={faShieldHalved}
                      className="text-blue-600 text-[10px]"
                    />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">
                        Username (NISN):
                      </span>
                      <span className="font-black text-slate-900 tracking-wider">{uName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faKey} className="text-emerald-600 text-[10px]" />
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">
                        Password Ujian:
                      </span>
                      <span className="font-black text-indigo-950 tracking-wider font-mono text-sm print:text-black">
                        {pwd}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Ringkas Kartu (Tanpa Pengesahan Kepsek) */}
                <div className="pt-1.5 mt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 text-[9px] text-slate-600">
                  <span className="font-semibold text-slate-700">
                    Alamat CBT: {cbtServerUrl}
                  </span>
                  <span className="text-[8px] text-slate-400 italic print:text-[7px]">
                    * Dual-Login: Kartu ini / Akun SIAK
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 space-y-5 print:min-h-0 print:bg-white print:p-0 print:m-0 print:space-y-0">
      {/* ===================================================================== */}
      {/* 1. HEADER GLOBAL & PEMILIHAN PAKET UJIAN                              */}
      {/* ===================================================================== */}
      <div className="no-print print:hidden bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Kembali ke Dashboard"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>Dokumen Administrasi Ujian</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Standar A4 &bull; Kop SIAK
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pencetakan dokumen harian (Daftar Hadir &amp; Berita Acara) terpisah dari Kartu Login sekali cetak.
            </p>
          </div>
        </div>

        {/* Selector Global Paket Ujian */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
            <FontAwesomeIcon icon={faLayerGroup} className="text-blue-600 text-xs shrink-0" />
            <select
              value={selectedExamId || ""}
              onChange={(e) => handleExamChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[260px]"
              title="Pilih Paket Ujian"
            >
              {exams.length === 0 ? (
                <option value="">Belum ada paket ujian</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. NAVIGASI 2 TAB RINGKAS (DOKUMEN HARIAN vs KARTU LOGIN)             */}
      {/* ===================================================================== */}
      <div className="no-print print:hidden flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("harian")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === "harian"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>Dokumen Harian</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                activeTab === "harian" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              Per Hari
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kartu")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === "kartu"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <FontAwesomeIcon icon={faIdCard} />
            <span>Kartu Login</span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                activeTab === "kartu" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              Sekali Cetak
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DOKUMEN HARIAN (DAFTAR HADIR & BERITA ACARA)                   */}
      {/* ===================================================================== */}
      {activeTab === "harian" && (
        <div className="no-print print:hidden space-y-4">
          {/* Panel Filter Harian (Tanggal + Sesi + Cari + Cetak Massal) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
            {/* Baris 1: Pilih Tanggal (Dropdown Jadwal) & Tombol Cetak Massal (Icon + Hover Tooltip) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-blue-600" />
                  <span>Tanggal Ujian:</span>
                </span>
                <select
                  value={selectedDateIso}
                  onChange={(e) => setSelectedDateIso(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[220px]"
                >
                  {scheduledDates.length === 0 ? (
                    <option value={selectedDateIso}>
                      Belum ada jadwal ({formatDateIndoFull(selectedDateIso)})
                    </option>
                  ) : (
                    scheduledDates.map((dIso, i) => (
                      <option key={dIso} value={dIso}>
                        Hari ke-{i + 1} &bull; {formatDateIndoFull(dIso)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Tombol Cetak Massal Seluruh Ruangan (Icon Saja + Tooltip Saat Hover) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">
                  Cetak Semua:
                </span>

                {/* Icon Cetak Semua Daftar Hadir */}
                <div className="relative group/btn">
                  <button
                    type="button"
                    aria-label="Cetak Semua Daftar Hadir"
                    onClick={() =>
                      openHarianPrintJob("presensi", harianRows, `Semua Ruangan (${harianRows.length})`)
                    }
                    className="w-9 h-9 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-sm transition inline-flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faFileLines} />
                  </button>
                  <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                    Cetak Semua Daftar Hadir
                  </span>
                </div>

                {/* Icon Cetak Semua Berita Acara */}
                <div className="relative group/btn">
                  <button
                    type="button"
                    aria-label="Cetak Semua Berita Acara"
                    onClick={() =>
                      openHarianPrintJob("berita_acara", harianRows, `Semua Ruangan (${harianRows.length})`)
                    }
                    className="w-9 h-9 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl text-sm transition inline-flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faClipboardCheck} />
                  </button>
                  <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                    Cetak Semua Berita Acara
                  </span>
                </div>

                {/* Icon Cetak Semua Paket (Daftar Hadir & Berita Acara) */}
                <div className="relative group/btn">
                  <button
                    type="button"
                    aria-label="Cetak Semua Paket (Daftar Hadir & Berita Acara)"
                    onClick={() =>
                      openHarianPrintJob("paket_harian", harianRows, `Semua Ruangan (${harianRows.length})`)
                    }
                    className="w-9 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faFolderOpen} />
                  </button>
                  <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                    Cetak Semua Paket (Daftar Hadir &amp; Berita Acara)
                  </span>
                </div>
              </div>
            </div>

            {/* Baris 2: Filter Sesi & Cari Ruangan */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 mr-1">Sesi:</span>
                <button
                  type="button"
                  onClick={() => setHarianSessionFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    harianSessionFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Semua Sesi
                </button>
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setHarianSessionFilter(s.session_name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      harianSessionFilter === s.session_name
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {s.session_name}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  value={harianSearch}
                  onChange={(e) => setHarianSearch(e.target.value)}
                  placeholder="Cari ruangan / gedung..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tabel Ruangan Harian */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-3.5 px-4 w-12 text-center rounded-tl-2xl">No</th>
                    <th className="py-3.5 px-4">Ruangan &amp; Lokasi</th>
                    <th className="py-3.5 px-4">Sesi &amp; Mapel (Otomatis Jadwal)</th>
                    <th className="py-3.5 px-4 text-center">Peserta</th>
                    <th className="py-3.5 px-4">
                      Pengawas ({formatDateIndoShort(selectedDateIso)})
                    </th>
                    <th className="py-3.5 px-4 text-center w-36 rounded-tr-2xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Memuat data ruangan...
                      </td>
                    </tr>
                  ) : harianRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <FontAwesomeIcon
                          icon={faDoorOpen}
                          className="text-3xl text-slate-300 mb-2 block mx-auto"
                        />
                        <p className="font-bold text-sm text-slate-600">
                          Tidak ada ruangan yang ditemukan.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    harianRows.map((row, idx) => {
                      const { room, session, students, sup, subjectName } = row;
                      return (
                        <tr
                          key={`${room.id}-${session.session_name}-${idx}`}
                          className="hover:bg-blue-50/30 transition group"
                        >
                          <td className="py-3 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center text-sm shrink-0">
                                <FontAwesomeIcon icon={faDoorOpen} />
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block text-sm group-hover:text-blue-700 transition">
                                  {room.name}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <FontAwesomeIcon icon={faBuilding} className="text-[10px]" />
                                  <span>{room.location || "Gedung Ujian"}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {session.session_name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {session.start_time} - {session.end_time}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-blue-800 mt-0.5 line-clamp-1">
                              {subjectName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                                students.length > 0
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {students.length} / {room.capacity}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs space-y-0.5">
                              <div className="font-semibold text-slate-800 line-clamp-1">
                                1. {sup?.supervisor1_name || "Belum ditentukan"}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                2. {sup?.supervisor2_name || "-"}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              {/* Icon Cetak Daftar Hadir + Tooltip Hover */}
                              <div className="relative group/btn">
                                <button
                                  type="button"
                                  aria-label="Cetak Daftar Hadir"
                                  onClick={() =>
                                    openHarianPrintJob(
                                      "presensi",
                                      [row],
                                      `${room.name} (${session.session_name})`
                                    )
                                  }
                                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={faFileLines} />
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                                  Cetak Daftar Hadir
                                </span>
                              </div>

                              {/* Icon Cetak Berita Acara + Tooltip Hover */}
                              <div className="relative group/btn">
                                <button
                                  type="button"
                                  aria-label="Cetak Berita Acara"
                                  onClick={() =>
                                    openHarianPrintJob(
                                      "berita_acara",
                                      [row],
                                      `${room.name} (${session.session_name})`
                                    )
                                  }
                                  className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={faClipboardCheck} />
                                </button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                                  Cetak Berita Acara
                                </span>
                              </div>

                              {/* Icon Cetak Paket Daftar Hadir & Berita Acara + Tooltip Hover */}
                              <div className="relative group/btn">
                                <button
                                  type="button"
                                  aria-label="Cetak Daftar Hadir & Berita Acara"
                                  onClick={() =>
                                    openHarianPrintJob(
                                      "paket_harian",
                                      [row],
                                      `${room.name} (${session.session_name})`
                                    )
                                  }
                                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs transition inline-flex items-center justify-center cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={faFolderOpen} />
                                </button>
                                <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                                  Cetak Daftar Hadir &amp; Berita Acara
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: KARTU LOGIN PESERTA (SEKALI CETAK PER RUANGAN)                 */}
      {/* ===================================================================== */}
      {activeTab === "kartu" && (
        <div className="no-print print:hidden space-y-4">
          {/* Panel Ringkas Khusus Kartu Login (Cari Ruangan & Cetak Semua) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              />
              <input
                type="text"
                value={kartuSearch}
                onChange={(e) => setKartuSearch(e.target.value)}
                placeholder="Cari ruangan / gedung..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="relative group/btn">
              <button
                type="button"
                aria-label="Cetak Kartu Semua Ruangan"
                onClick={() =>
                  openKartuPrintJob(kartuRows, `Semua Ruangan (${kartuRows.length})`)
                }
                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm transition inline-flex items-center justify-center shadow-xs cursor-pointer"
              >
                <FontAwesomeIcon icon={faPrint} />
              </button>
              <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                Cetak Kartu Semua Ruangan
              </span>
            </div>
          </div>

          {/* Tabel Ringkas 1 Baris per Ruangan */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-3.5 px-4 w-12 text-center rounded-tl-2xl">No</th>
                    <th className="py-3.5 px-4">Ruangan &amp; Lokasi</th>
                    <th className="py-3.5 px-4 text-center">Total Peserta / Kapasitas</th>
                    <th className="py-3.5 px-4 text-center w-24 rounded-tr-2xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        Memuat data ruangan...
                      </td>
                    </tr>
                  ) : kartuRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <FontAwesomeIcon
                          icon={faDoorOpen}
                          className="text-3xl text-slate-300 mb-2 block mx-auto"
                        />
                        <p className="font-bold text-sm text-slate-600">
                          Tidak ada ruangan yang ditemukan.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    kartuRows.map((row, idx) => {
                      const { room, students } = row;
                      return (
                        <tr key={room.id} className="hover:bg-indigo-50/30 transition group">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-sm shrink-0">
                                <FontAwesomeIcon icon={faDoorOpen} />
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block text-sm group-hover:text-indigo-700 transition">
                                  {room.name}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <FontAwesomeIcon icon={faBuilding} className="text-[10px]" />
                                  <span>{room.location || "Gedung Ujian"}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                                students.length > 0
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {students.length} Peserta (Kap. {room.capacity})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="relative inline-block group/btn">
                              <button
                                type="button"
                                aria-label="Cetak Kartu Login"
                                onClick={() => openKartuPrintJob([row], `Ruang ${room.name}`)}
                                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faIdCard} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 shadow-lg z-30">
                                Cetak Kartu Login
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. MODAL PRATINJAU CETAK A4 (SATUAN MAUPUN MASSAL BANYAK RUANGAN)     */}
      {/* ===================================================================== */}
      {activePrintJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 print:static print:inset-auto print:z-auto print:overflow-visible print:bg-white print:p-0 print:m-0 print:block">
          {/* Bar Aksi Modal (Otomatis Hilang Saat Cetak) */}
          <div className="no-print print:hidden sticky top-2 z-60 w-full max-w-[210mm] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  activePrintJob.mode === "presensi"
                    ? "bg-blue-600"
                    : activePrintJob.mode === "berita_acara"
                    ? "bg-emerald-600"
                    : activePrintJob.mode === "paket_harian"
                    ? "bg-slate-900"
                    : "bg-indigo-600"
                }`}
              >
                <FontAwesomeIcon
                  icon={
                    activePrintJob.mode === "presensi"
                      ? faFileLines
                      : activePrintJob.mode === "berita_acara"
                      ? faClipboardCheck
                      : activePrintJob.mode === "paket_harian"
                      ? faFolderOpen
                      : faIdCard
                  }
                />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">
                  {activePrintJob.title}
                </h2>
                <p className="text-xs text-slate-500">
                  {activePrintJob.subtitle} &bull; Kertas A4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(activePrintJob.mode === "berita_acara" ||
                activePrintJob.mode === "paket_harian") && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-xl cursor-pointer text-slate-700 font-bold text-xs select-none transition">
                  <input
                    type="checkbox"
                    checked={showHeadmasterSignature}
                    onChange={(e) => setShowHeadmasterSignature(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Cantumkan Scan TTD Kepsek</span>
                </label>
              )}

              {activePrintJob.mode === "kartu_login" && (
                <>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setKartuGridMode("4")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        kartuGridMode === "4"
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      4 / Hal
                    </button>
                    <button
                      type="button"
                      onClick={() => setKartuGridMode("8")}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        kartuGridMode === "8"
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      8 / Hal
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-semibold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={showQrCode}
                      onChange={(e) => setShowQrCode(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>QR Code</span>
                  </label>
                </>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faPrint} />
                <span>Cetak Sekarang (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePrintJob(null)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shrink-0"
                title="Tutup Pratinjau"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>
          </div>

          {/* Lembar Kertas Dokumen A4 (Multi-Halaman dengan Page Break per Ruangan) */}
          <div className="w-full max-w-[210mm] space-y-6 print:space-y-0 print:max-w-none print:w-full">
            {activePrintJob.items.map((item, idx) => {
              const isLast = idx === activePrintJob.items.length - 1;
              const isBatch = activePrintJob.items.length > 1;

              if (activePrintJob.mode === "paket_harian") {
                return (
                  <Fragment key={`${item.room.id}-${item.session.session_name}-${idx}`}>
                    {/* Halaman 1 Ruangan: Daftar Hadir */}
                    <div className="print-sheet page-break w-full min-h-[297mm] bg-white rounded-2xl shadow-2xl p-6 sm:p-[12mm] border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0">
                      {renderDaftarHadirSheet(item)}
                    </div>
                    {/* Halaman 2 Ruangan: Berita Acara */}
                    <div
                      className={`print-sheet ${
                        !isLast ? "page-break" : ""
                      } w-full min-h-[297mm] bg-white rounded-2xl shadow-2xl p-6 sm:p-[12mm] border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0`}
                    >
                      {renderBeritaAcaraSheet(item)}
                    </div>
                  </Fragment>
                );
              }

              return (
                <div
                  key={`${item.room.id}-${item.session.session_name}-${idx}`}
                  className={`print-sheet ${
                    !isLast ? "page-break" : ""
                  } w-full min-h-[297mm] bg-white rounded-2xl shadow-2xl p-6 sm:p-[12mm] border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0`}
                >
                  {activePrintJob.mode === "presensi" && renderDaftarHadirSheet(item)}
                  {activePrintJob.mode === "berita_acara" && renderBeritaAcaraSheet(item)}
                  {activePrintJob.mode === "kartu_login" &&
                    renderKartuLoginSheet(item, isBatch)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
