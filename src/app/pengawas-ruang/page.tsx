"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDesktop,
  faUsers,
  faDoorOpen,
  faCalendarDays,
  faClock,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faLock,
  faLockOpen,
  faRotate,
  faPrint,
  faFloppyDisk,
  faUserCheck,
  faArrowLeft,
  faMagnifyingGlass,
  faFileLines,
  faPenToSquare,
  faCheckDouble,
  faShieldHalved,
  faLocationDot,
  faLaptopCode,
  faSchool,
  faXmark,
  faCopy,
  faCheck,
  faExpand,
  faLaptop,
  faMobileScreen,
  faWifi,
  faSignal,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

interface StudentAllocation {
  allocation_id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  nisn: string;
  room_name: string;
  session_name: string;
  seat_number: number;
  attendance_status: string; // 'H', 'I', 'S', 'A'
  attendance_notes: string;
  attendance_updated_at?: string;
  session_id?: number | null;
  exam_id?: number | null;
  subject_id?: number | null;
  subject_name?: string | null;
  exam_status: string; // 'not_started', 'in_progress', 'locked', 'submitted'
  lock_reason?: string;
  lock_count?: number;
  unlock_code?: string;
  total_answered?: number;
  score?: number;
  device_id?: string;
  device_info?: string;
  browser_info?: string;
  connection_quality?: string;
  ping_ms?: number;
  last_heartbeat?: string;
  is_suspicious?: boolean;
  ip_address?: string;
  exam_start_time?: string;
  submitted_at?: string;
}

interface RoomDuty {
  id?: number;
  exam_date: string;
  session_name: string;
  session_time?: string;
  room_name: string;
  room_location?: string;
  room_capacity?: number;
  supervisor1_name?: string;
  supervisor2_name?: string;
  supervisor3_name?: string;
  proctor_name?: string;
  notes?: string;
  is_session_active?: boolean;
  session_status?: string;
}

interface BeritaAcaraData {
  id?: number | null;
  exam_date: string;
  session_name: string;
  room_name: string;
  subject_name: string;
  total_registered: number;
  total_present: number;
  total_absent: number;
  absent_students: string;
  supervisor1_name: string;
  supervisor2_name: string;
  proctor_name: string;
  notes: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
}

export default function PengawasRuangPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, isTeacher, isAdminOrStaff, isLoading: authLoading } = useAuth();

  // Tab yang aktif: 'proctoring' | 'attendance' | 'berita_acara'
  const [activeTab, setActiveTab] = useState<"proctoring" | "attendance" | "berita_acara">("proctoring");

  // Query parameter
  const qDate = searchParams.get("date");
  const qSession = searchParams.get("session");
  const qRoom = searchParams.get("room");

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [duty, setDuty] = useState<RoomDuty | null>(null);
  const [availableDuties, setAvailableDuties] = useState<RoomDuty[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentAllocation[]>([]);
  const [beritaAcara, setBeritaAcara] = useState<BeritaAcaraData | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [isExamCompleted, setIsExamCompleted] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total_registered: 0,
    total_present: 0,
    total_absent: 0,
    in_progress: 0,
    locked: 0,
    submitted: 0,
    not_started: 0,
    suspicious_count: 0,
  });

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isSavingAttendance, setIsSavingAttendance] = useState<boolean>(false);
  const [isSavingBA, setIsSavingBA] = useState<boolean>(false);

  // Token Ujian Aktif dari Admin Pusat
  const [activeToken, setActiveToken] = useState<{
    token: string;
    is_active: boolean;
    exam_title: string;
    active_subject?: string;
    token_refresh_interval?: number;
  } | null>(null);
  const [showTokenFullscreen, setShowTokenFullscreen] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  const handleCopyToken = () => {
    if (!activeToken?.token || activeToken.token === "-") return;
    navigator.clipboard.writeText(activeToken.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Print Mode
  const [printType, setPrintType] = useState<"attendance" | "berita_acara" | null>(null);

  // Timer Ref for Auto-refresh
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper Format Tanggal
  const formatDateIndo = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Fetch Proctoring Data
  const fetchProctoringData = async (isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setLoading(true);

      const params = new URLSearchParams();
      if (qDate) params.append("exam_date", qDate);
      if (qSession) params.append("session_name", qSession);
      if (qRoom) params.append("room_name", qRoom);

      const res = await fetch(`/api/cbt-backend/api/cbt/schedule/room-proctoring?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          Swal.fire({
            icon: "warning",
            title: "Akses Terbatas",
            text: "Anda belum memiliki jadwal tugas sebagai pengawas di ruangan ini atau belum ditugaskan.",
            confirmButtonColor: "#3B82F6",
          }).then(() => {
            router.push("/jadwal-sas");
          });
          return;
        }
        throw new Error("Gagal mengambil data proktoring ruangan");
      }

      const data = await res.json();
      if (data.success) {
        setIsExamCompleted(Boolean(data.is_exam_completed));
        setDuty(data.duty);
        setAvailableDuties(data.available_duties || []);
        if (data.rooms) setAllRooms(data.rooms);
        if (data.sessions) setAllSessions(data.sessions);
        if (data.dates) setAllDates(data.dates);
        setSubjects(data.subjects || []);
        setStudents(data.students || []);
        setActiveToken(data.active_token || null);
        setBeritaAcara(data.berita_acara || null);
        setSchoolProfile(data.school_profile || null);
        setStats(data.stats || {
          total_registered: 0,
          total_present: 0,
          total_absent: 0,
          in_progress: 0,
          locked: 0,
          submitted: 0,
          not_started: 0,
          suspicious_count: 0,
        });
      }
    } catch (err: any) {
      console.error("Error fetching proctoring data:", err);
      if (!isBackground) {
        Swal.fire({
          icon: "error",
          title: "Gagal Memuat Data",
          text: err.message || "Terjadi kesalahan saat memuat data ruangan.",
        });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Inisialisasi awal
  useEffect(() => {
    if (!authLoading && token) {
      fetchProctoringData();
    }
  }, [authLoading, token, qDate, qSession, qRoom]);

  // Auto-refresh interval (setiap 8 detik khusus di tab proctoring)
  useEffect(() => {
    if (!autoRefresh || activeTab !== "proctoring" || !duty) {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
      return;
    }

    autoRefreshTimerRef.current = setInterval(() => {
      fetchProctoringData(true);
    }, 8000);

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, activeTab, duty, qDate, qSession, qRoom]);

  // Daftar Opsi Tanggal Ujian Unik
  const dateOptions = useMemo(() => {
    const list: string[] = [];
    if (allDates.length > 0) {
      allDates.forEach((d) => {
        if (d && !list.includes(d)) list.push(d);
      });
    }
    availableDuties.forEach((d) => {
      if (d.exam_date && !list.includes(d.exam_date)) list.push(d.exam_date);
    });
    if (duty?.exam_date && !list.includes(duty.exam_date)) {
      list.unshift(duty.exam_date);
    }
    return list;
  }, [allDates, availableDuties, duty]);

  // Handler Ganti Tanggal / Hari Ujian
  const handleDateChange = (selectedDate: string) => {
    if (!selectedDate) return;
    const curRoom = duty?.room_name || qRoom || roomOptions[0] || "";
    const curSession = duty?.session_name || qSession || sessionOptions[0] || "Sesi 1";

    if (isAdminOrStaff) {
      router.push(
        `/pengawas-ruang?date=${encodeURIComponent(selectedDate)}&session=${encodeURIComponent(curSession)}&room=${encodeURIComponent(curRoom)}`
      );
      return;
    }

    // 1. Cek apakah ada tugas guru pada tanggal tersebut di ruangan yang sama
    const matchSameDuty = availableDuties.find(
      (d) => d.exam_date === selectedDate && d.room_name === curRoom
    );
    // 2. Jika tidak, ambil tugas guru mana pun pada tanggal tersebut
    const matchAnyDuty = availableDuties.find(
      (d) => d.exam_date === selectedDate
    );

    const targetRoom = matchSameDuty?.room_name || matchAnyDuty?.room_name || curRoom;
    const targetSession = matchSameDuty?.session_name || matchAnyDuty?.session_name || curSession;

    router.push(
      `/pengawas-ruang?date=${encodeURIComponent(selectedDate)}&session=${encodeURIComponent(targetSession)}&room=${encodeURIComponent(targetRoom)}`
    );
  };

  // Daftar Opsi Ruangan Unik
  const roomOptions = useMemo(() => {
    const list: string[] = [];
    // Masukkan seluruh ruangan dari database (allRooms) agar pengawas dapat berpindah ke ruangan mana saja
    if (allRooms.length > 0) {
      allRooms.forEach((r) => {
        const rName = r.name || r.room_name;
        if (rName && !list.includes(rName)) list.push(rName);
      });
    }
    // Pastikan ruangan dari penugasan pribadi dan ruangan aktif saat ini juga ada
    availableDuties.forEach((d) => {
      if (d.room_name && !list.includes(d.room_name)) list.push(d.room_name);
    });
    if (duty?.room_name && !list.includes(duty.room_name)) {
      list.unshift(duty.room_name);
    }
    return list;
  }, [allRooms, availableDuties, duty]);

  // Daftar Opsi Sesi Unik
  const sessionOptions = useMemo(() => {
    const list: string[] = [];
    if (allSessions.length > 0) {
      allSessions.forEach((s) => {
        const sName = s.session_name || s.name;
        if (sName && !list.includes(sName)) list.push(sName);
      });
    }
    availableDuties.forEach((d) => {
      if (d.session_name && !list.includes(d.session_name)) list.push(d.session_name);
    });
    if (duty?.session_name && !list.includes(duty.session_name)) {
      list.unshift(duty.session_name);
    }
    if (list.length === 0) {
      list.push("Sesi 1", "Sesi 2");
    }
    return list;
  }, [allSessions, availableDuties, duty]);

  // Handler Ganti Ruangan
  const handleRoomChange = (selectedRoom: string) => {
    if (!selectedRoom) return;
    const curDate = duty?.exam_date || qDate || dateOptions[0] || "";
    const curSession = duty?.session_name || qSession || sessionOptions[0] || "Sesi 1";

    if (isAdminOrStaff) {
      router.push(
        `/pengawas-ruang?date=${encodeURIComponent(curDate)}&session=${encodeURIComponent(curSession)}&room=${encodeURIComponent(selectedRoom)}`
      );
      return;
    }

    // 1. Cek apakah ada penugasan guru di ruangan ini pada sesi yang sama
    const matchSameSession = availableDuties.find(
      (d) => d.room_name === selectedRoom && d.session_name === curSession
    );
    // 2. Jika tidak ada di sesi yang sama, cek apakah ada tugas di ruangan ini pada sesi lain
    const matchOtherSession = availableDuties.find(
      (d) => d.room_name === selectedRoom
    );

    const targetDate = matchSameSession?.exam_date || matchOtherSession?.exam_date || curDate;
    const targetSession = matchSameSession?.session_name || matchOtherSession?.session_name || curSession;

    router.push(
      `/pengawas-ruang?date=${encodeURIComponent(targetDate)}&session=${encodeURIComponent(targetSession)}&room=${encodeURIComponent(selectedRoom)}`
    );
  };

  // Handler Ganti Sesi Ujian
  const handleSessionChange = (selectedSession: string) => {
    if (!selectedSession) return;
    const curRoom = duty?.room_name || qRoom || roomOptions[0] || "";
    const curDate = duty?.exam_date || qDate || dateOptions[0] || "";

    if (isAdminOrStaff) {
      router.push(
        `/pengawas-ruang?date=${encodeURIComponent(curDate)}&session=${encodeURIComponent(selectedSession)}&room=${encodeURIComponent(curRoom)}`
      );
      return;
    }

    const match = availableDuties.find(
      (d) => d.room_name === curRoom && d.session_name === selectedSession
    );
    const targetDate = match?.exam_date || curDate;

    router.push(
      `/pengawas-ruang?date=${encodeURIComponent(targetDate)}&session=${encodeURIComponent(selectedSession)}&room=${encodeURIComponent(curRoom)}`
    );
  };

  // --------------------------------------------------------------------------
  // ACTIONS PROKTORING: UNLOCK, RESET LOGIN, FORCE SUBMIT
  // --------------------------------------------------------------------------

  // Buka Kunci Siswa (Individual)
  const handleUnlockStudent = async (student: StudentAllocation) => {
    if (!student.session_id) return;

    const result = await Swal.fire({
      title: "Buka Kunci Siswa?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Nama:</strong> ${student.student_name}</p>
          <p><strong>Kelas / No:</strong> ${student.class_name} • Meja ${student.seat_number}</p>
          <p><strong>Alasan Kunci:</strong> <span class="text-rose-600 font-semibold">${student.lock_reason || "Pelanggaran Ujian"}</span></p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Buka Kunci",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-proctoring/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.session_id }),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Kunci Terbuka",
          text: `Kunci ujian untuk ${student.student_name} berhasil dibuka.`,
          timer: 1800,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      } else {
        throw new Error(d.detail || "Gagal membuka kunci");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Buka Kunci Semua Siswa Terkunci Sekaligus
  const handleUnlockAll = async () => {
    const lockedStudents = students.filter((s) => s.exam_status === "locked" && s.session_id);
    if (lockedStudents.length === 0) {
      Swal.fire({ icon: "info", title: "Info", text: "Tidak ada siswa yang sedang terkunci di ruangan ini." });
      return;
    }

    const result = await Swal.fire({
      title: `Buka Kunci Semua (${lockedStudents.length} Siswa)?`,
      text: "Seluruh siswa yang saat ini terkunci di ruangan ini akan dapat melanjutkan ujian kembali.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Buka Semua Kunci",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const sessionIds = lockedStudents.map((s) => s.session_id as number);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-proctoring/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_ids: sessionIds }),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: `Berhasil membuka kunci seluruh ${d.unlocked || lockedStudents.length} siswa di ruangan ini.`,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Reset Sesi Login / Perangkat (Siswa ganti HP / Komputer)
  const handleResetLogin = async (student: StudentAllocation) => {
    if (!student.session_id) return;

    const result = await Swal.fire({
      title: "Reset Login / Perangkat?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Nama:</strong> ${student.student_name}</p>
          <p>Tindakan ini akan mengizinkan siswa login kembali dari komputer / HP lain tanpa kehilangan jawaban yang telah tersimpan.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#F59E0B",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Reset Login",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-proctoring/reset-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.session_id }),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Login Direset",
          text: `Siswa ${student.student_name} sekarang dapat login kembali di perangkat baru.`,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      } else {
        throw new Error(d.detail || "Gagal mereset login");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Paksa Selesai / Submit Ujian Siswa
  const handleForceSubmit = async (student: StudentAllocation) => {
    if (!student.session_id) return;

    const result = await Swal.fire({
      title: "Selesaikan Ujian Siswa?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Nama:</strong> ${student.student_name}</p>
          <p><strong>Status Saat Ini:</strong> ${student.exam_status}</p>
          <p class="text-rose-600 font-semibold mt-1">Ujian siswa akan dihentikan dan seluruh jawaban dikumpulkan ke sistem secara permanen.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Selesaikan Ujian",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-proctoring/submit-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.session_id }),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Ujian Diselesaikan",
          text: `Ujian siswa ${student.student_name} telah selesai dikumpulkan.`,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      } else {
        throw new Error(d.detail || "Gagal mengumpulkan ujian");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS PRESENSI: UBAH STATUS, TANDAI SEMUA HADIR, SIMPAN
  // --------------------------------------------------------------------------

  const handleAttendanceChange = (studentId: number, status: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, attendance_status: status } : s))
    );
  };

  const handleAttendanceNotesChange = (studentId: number, notes: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, attendance_notes: notes } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        attendance_status: "H",
      }))
    );
    Swal.fire({
      icon: "info",
      title: "Semua Ditandai Hadir",
      text: "Seluruh siswa berhasil diubah statusnya menjadi Hadir (H). Klik 'Simpan Presensi' untuk menyimpan perubahan.",
      timer: 1800,
      showConfirmButton: false,
    });
  };

  const handleSaveAttendance = async () => {
    if (!duty) return;
    try {
      setIsSavingAttendance(true);

      const subjectName = activeToken?.active_subject || beritaAcara?.subject_name || (subjects.length > 0 ? subjects[0].subject_name : "Mata Pelajaran");
      const payload = {
        exam_date: duty.exam_date,
        session_name: duty.session_name,
        room_name: duty.room_name,
        subject_name: subjectName,
        attendances: students.map((s) => ({
          student_id: s.student_id,
          student_name: s.student_name,
          class_name: s.class_name,
          nisn: s.nisn,
          status: s.attendance_status || "H",
          notes: s.attendance_notes || "",
        })),
      };

      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Presensi Disimpan!",
          text: d.message || "Daftar hadir peserta ujian berhasil diperbarui ke database.",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      } else {
        throw new Error(d.detail || "Gagal menyimpan daftar hadir");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal Menyimpan", text: err.message });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS BERITA ACARA: SIMPAN BERITA ACARA
  // --------------------------------------------------------------------------

  const handleSaveBeritaAcara = async () => {
    if (!duty || !beritaAcara) return;
    try {
      setIsSavingBA(true);

      const payload = {
        exam_date: duty.exam_date,
        session_name: duty.session_name,
        room_name: duty.room_name,
        subject_name: beritaAcara.subject_name || (subjects[0]?.subject_name || "Mata Pelajaran"),
        total_registered: beritaAcara.total_registered,
        total_present: beritaAcara.total_present,
        total_absent: beritaAcara.total_absent,
        absent_students: beritaAcara.absent_students,
        supervisor1_name: beritaAcara.supervisor1_name,
        supervisor2_name: beritaAcara.supervisor2_name,
        proctor_name: beritaAcara.proctor_name,
        notes: beritaAcara.notes,
      };

      const res = await fetch("/api/cbt-backend/api/cbt/schedule/room-berita-acara", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (d.success) {
        Swal.fire({
          icon: "success",
          title: "Berita Acara Tersimpan!",
          text: "Berita Acara pelaksanaan ujian di ruangan ini telah berhasil disimpan.",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchProctoringData(true);
      } else {
        throw new Error(d.detail || "Gagal menyimpan Berita Acara");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal Menyimpan", text: err.message });
    } finally {
      setIsSavingBA(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTER SISWA PADA TAB PROKTORING
  // --------------------------------------------------------------------------

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Filter Status
      if (statusFilter !== "all") {
        if (statusFilter === "suspicious") {
          const isSusp = Boolean(s.is_suspicious || s.exam_status === "locked" || (s.lock_count && s.lock_count > 0));
          if (!isSusp) return false;
        } else if (statusFilter === "in_progress" && s.exam_status !== "in_progress") {
          return false;
        } else if (statusFilter === "locked" && s.exam_status !== "locked") {
          return false;
        } else if (statusFilter === "submitted" && s.exam_status !== "submitted") {
          return false;
        } else if (statusFilter === "not_started" && s.exam_status !== "not_started") {
          return false;
        }
      }
      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.student_name.toLowerCase().includes(q);
        const matchNisn = (s.nisn || "").toLowerCase().includes(q);
        const matchClass = (s.class_name || "").toLowerCase().includes(q);
        const matchSeat = String(s.seat_number).includes(q);
        const matchDevice = (s.device_info || "").toLowerCase().includes(q);
        const matchIp = (s.ip_address || "").toLowerCase().includes(q);
        return matchName || matchNisn || matchClass || matchSeat || matchDevice || matchIp;
      }
      return true;
    });
  }, [students, statusFilter, searchQuery]);

  // Loading Screen
  if (authLoading || (loading && !duty)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg mb-4 animate-bounce">
          <FontAwesomeIcon icon={faDesktop} />
        </div>
        <p className="text-slate-700 font-bold text-base">Memuat Ruang Proktoring Pengawas...</p>
        <span className="text-slate-400 text-xs mt-1">Mengambil data penugasan, presensi, dan status siswa</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 pb-20 print:p-0 print:bg-white">
      {/* ==================================================================== */}
      {/* TOP BAR / HEADER HALAMAN */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto space-y-5 print:hidden">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={isAdminOrStaff ? "/" : "/jadwal-sas"}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 hover:text-slate-800 transition text-sm shadow-2xs"
              title={isAdminOrStaff ? "Kembali ke Menu Ujian" : "Kembali ke Jadwal Jaga"}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  Proktoring & Pengawas Ruangan
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {duty?.room_name ? `Ruang ${duty.room_name}` : "Ruangan Ujian"}
                </span>
                {isAdminOrStaff && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                    Mode Pengawas Pusat (Admin)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdminOrStaff
                  ? "Pengawasan terpusat seluruh ruangan ujian, pergantian sesi live, dan manajemen peserta ujian."
                  : "Pemantauan live ujian siswa, pengisian daftar hadir, dan pengesahan Berita Acara ujian."}
              </p>
            </div>
          </div>

          {/* Info Penugasan: Jika Admin, tampilkan Dropdown Pemilihan Ruangan, Sesi & Tanggal. Jika Guru, tampilkan badge statis */}
          {isAdminOrStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Hari & Tanggal */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="select-exam-date" className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                    Pilih Tanggal
                  </label>
                  <select
                    id="select-exam-date"
                    value={duty?.exam_date || qDate || ""}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer mt-0.5 pr-1 font-sans"
                  >
                    {dateOptions.map((d) => (
                      <option key={d} value={d}>
                        {formatDateIndo(d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropdown Ruangan Ujian */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="select-exam-room" className="text-[9px] font-black text-blue-500 uppercase tracking-wider leading-none">
                    Pilih Ruangan
                  </label>
                  <select
                    id="select-exam-room"
                    value={duty?.room_name || qRoom || ""}
                    onChange={(e) => handleRoomChange(e.target.value)}
                    className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer mt-0.5 pr-1 font-sans"
                  >
                    {roomOptions.map((r) => (
                      <option key={r} value={r}>
                        Ruang {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropdown Sesi Ujian */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faClock} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="select-exam-session" className="text-[9px] font-black text-indigo-500 uppercase tracking-wider leading-none">
                    Pilih Sesi
                  </label>
                  <select
                    id="select-exam-session"
                    value={duty?.session_name || qSession || ""}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer mt-0.5 pr-1 font-sans"
                  >
                    {sessionOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* TAMPILAN GURU: STATIS TANPA DROPDOWN (Sesuai tugas dari jadwal jaga) */
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Hari & Tanggal */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                    Hari & Tanggal
                  </span>
                  <span className="text-xs font-black text-slate-800 mt-0.5">
                    {formatDateIndo(duty?.exam_date || qDate)}
                  </span>
                </div>
              </div>

              {/* Ruangan */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                    Ruangan Ujian
                  </span>
                  <span className="text-xs font-black text-slate-800 mt-0.5">
                    Ruang {duty?.room_name || qRoom || "-"}
                  </span>
                </div>
              </div>

              {/* Sesi */}
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0">
                  <FontAwesomeIcon icon={faClock} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                    Sesi Ujian
                  </span>
                  <span className="text-xs font-black text-slate-800 mt-0.5">
                    {duty?.session_name || qSession || "Sesi 1"}
                    {duty?.session_time ? ` (${duty.session_time})` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BANNER JIKA PAKET UJIAN SUDAH SELESAI / DITUTUP OLEH ADMIN */}
        {isExamCompleted && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Periode Ujian Sekolah Telah Selesai (Standby Mode)
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                    Standby / Arsip
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Admin telah menyelesaikan/menghentikan paket ujian sekolah. Halaman proktoring ini berada dalam status siaga (standby) menunggu periode ujian berikutnya. Seluruh riwayat presensi, Berita Acara, dan nilai siswa tersimpan aman di sistem.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Ke Halaman Utama</span>
            </Link>
          </div>
        )}

        {/* ==================================================================== */}
        {/* KARTU INFORMASI PENUGASAN RUANG & PENGAWAS */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Ruangan & Sesi */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ruangan & Sesi
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-800 block">
                    {duty?.room_name} &bull; {duty?.session_name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {duty?.room_location || "Gedung Sekolah"} (Kapasitas {duty?.room_capacity} Siswa)
                  </span>
                </div>
              </div>
            </div>

            {/* Waktu & Tanggal Ujian */}
            <div className="space-y-1 md:pl-4 pt-3 md:pt-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hari & Waktu Pelaksanaan
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shrink-0">
                  <FontAwesomeIcon icon={faClock} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {formatDateIndo(duty?.exam_date)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Pukul: {duty?.session_time || "Sesuai Jadwal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tim Pengawas & Proktor */}
            <div className="space-y-1 md:pl-4 pt-3 md:pt-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pengawas & Proktor
              </span>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-slate-800 truncate" title={duty?.supervisor1_name}>
                  Pengawas 1: <span className="font-semibold text-slate-700">{duty?.supervisor1_name || "-"}</span>
                </p>
                {duty?.supervisor2_name && duty.supervisor2_name !== "-" && (
                  <p className="font-bold text-slate-800 truncate" title={duty.supervisor2_name}>
                    Pengawas 2: <span className="font-semibold text-slate-700">{duty.supervisor2_name}</span>
                  </p>
                )}
                <p className="text-[11px] text-slate-500 truncate">
                  Proktor: <strong>{duty?.proctor_name || "Panitia CBT"}</strong>
                </p>
              </div>
            </div>

            {/* Mata Pelajaran yang Diujikan */}
            <div className="space-y-1 md:pl-4 pt-3 md:pt-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Mata Pelajaran Ujian
              </span>
              {subjects.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {subjects.map((sub: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200"
                    >
                      {sub.subject_name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">Mata Pelajaran SAS</span>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* BANNER TOKEN UJIAN RESMI DARI PUSAT/ADMIN (UNTUK DIBAGIKAN KE SISWA) */}
        {/* ==================================================================== */}
        {(() => {
          const isTokenLive = !isExamCompleted && Boolean(duty?.is_session_active) && Boolean(activeToken?.is_active);

          return (
            <div
              className={`rounded-2xl text-white p-4 sm:p-5 shadow-lg border transition-all ${
                isExamCompleted
                  ? "bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-slate-700/60"
                  : isTokenLive
                  ? "bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border-indigo-800/40"
                  : "bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border-slate-800"
              } flex flex-wrap items-center justify-between gap-4`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isExamCompleted ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                      <FontAwesomeIcon icon={faShieldHalved} className="text-amber-400 text-[10px]" />
                      Ujian Telah Selesai &bull; Standby Mode
                    </span>
                  ) : isTokenLive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      Token Aktif &bull; Dikendalikan Admin Pusat
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Sesi Standby &bull; Belum Dimulai
                    </span>
                  )}
                  <span className="text-xs text-indigo-200 font-medium">
                    {isExamCompleted
                      ? "Arsip & Rekap Pelaksanaan"
                      : isTokenLive
                      ? activeToken?.active_subject || "Mata Pelajaran Ujian"
                      : "Menunggu Sesi Dimulai"}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  {isExamCompleted
                    ? "Pelaksanaan Ujian Telah Ditutup / Selesai (Status Siaga)"
                    : isTokenLive
                    ? "Bagikan token ujian resmi ini kepada siswa di ruangan untuk memulai pengerjaan:"
                    : "Menunggu Admin Memulai Sesi Ujian di Status Tes"}
                </h2>
                <p className="text-[11px] text-slate-300">
                  {isExamCompleted
                    ? "Seluruh sesi ujian sekolah telah ditutup oleh Admin. Meja proktoring ini berada dalam status siaga. Anda dapat mencetak Presensi dan Berita Acara sebagai arsip resmi."
                    : isTokenLive
                    ? "Mulai dan selesainya sesi ujian dikendalikan penuh oleh Admin Pusat. Pengawas cukup membagikan token dan memantau siswa."
                    : `Sesi ujian pada ruangan ini (${duty?.room_name || "G1"}, ${duty?.session_name || "Sesi 1"}) belum aktif. Token resmi akan otomatis aktif begitu Admin mengklik "Mulai Sesi Ujian" di menu Status Tes.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Box Token */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2 flex items-center gap-3 shadow-inner">
                  <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider hidden sm:inline">
                    TOKEN:
                  </span>
                  <span
                    className={`text-2xl sm:text-3xl font-black font-mono tracking-widest select-all ${
                      isTokenLive ? "text-amber-300" : "text-slate-400 opacity-60"
                    }`}
                  >
                    {isTokenLive ? activeToken?.token || "- - - - -" : "- - - - -"}
                  </span>
                </div>

                {/* Tombol Salin */}
                <button
                  onClick={handleCopyToken}
                  disabled={!isTokenLive}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
                    isTokenLive
                      ? "bg-white/15 hover:bg-white/25 text-white border-white/20 cursor-pointer"
                      : "bg-white/5 text-slate-500 border-white/5 cursor-not-allowed opacity-50"
                  }`}
                  title={isTokenLive ? "Salin Token Ujian" : "Token belum aktif"}
                >
                  <FontAwesomeIcon icon={copiedToken ? faCheck : faCopy} />
                  <span>{copiedToken ? "Tersalin!" : "Salin"}</span>
                </button>

                {/* Tombol Tampilkan Besar di Proyektor / Layar Penuh */}
                {isTokenLive && (
                  <button
                    onClick={() => setShowTokenFullscreen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                    title="Tampilkan Token Ukuran Raksasa di Layar Penuh / Proyektor Kelas"
                  >
                    <FontAwesomeIcon icon={faExpand} />
                    <span>Layar Penuh Token</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ==================================================================== */}
        {/* TABS UTAMA: PROKTORING | DAFTAR HADIR | BERITA ACARA */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab("proctoring")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 border-x ${
              activeTab === "proctoring"
                ? "bg-white text-blue-600 border-t-blue-600 border-x-slate-200 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            <FontAwesomeIcon icon={faDesktop} />
            <span>🖥️ Proktoring & Pemantauan Live</span>
            {stats.locked > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                {stats.locked} Terkunci
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 border-x ${
              activeTab === "attendance"
                ? "bg-white text-blue-600 border-t-blue-600 border-x-slate-200 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            <FontAwesomeIcon icon={faUserCheck} />
            <span>📋 Daftar Hadir (Presensi)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {stats.total_present} / {stats.total_registered}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("berita_acara")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t-2 border-x ${
              activeTab === "berita_acara"
                ? "bg-white text-blue-600 border-t-blue-600 border-x-slate-200 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            <FontAwesomeIcon icon={faFileLines} />
            <span>📝 Berita Acara Ujian</span>
            {beritaAcara?.submitted_at && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Tersimpan
              </span>
            )}
          </button>
        </div>

        {/* ==================================================================== */}
        {/* KONTEN TAB 1: PROKTORING & PEMANTAUAN LIVE */}
        {/* ==================================================================== */}
        {activeTab === "proctoring" && (
          <div className="space-y-4">
            {/* Banner Mode Arsip jika Ujian Telah Selesai */}
            {isExamCompleted && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-center gap-3 shadow-2xs text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div className="leading-relaxed">
                  <span className="font-black text-amber-950 block">Meja Proktoring dalam Mode Arsip & Peninjauan</span>
                  Pelaksanaan ujian telah diselesaikan/ditutup oleh Admin Pusat. Seluruh aksi kontrol live (Reset Login, Buka Kunci, Selesaikan) dinonaktifkan. Data peserta dan pengerjaan tetap tersimpan utuh dan dapat ditinjau di bawah ini.
                </div>
              </div>
            )}

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div
                onClick={() => setStatusFilter("all")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-slate-100/90 border-slate-300 ring-2 ring-slate-400/20"
                    : "bg-white border-slate-200/90 hover:bg-slate-50"
                }`}
                title="Tampilkan semua peserta"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Peserta
                </span>
                <span className="text-xl font-black text-slate-800 mt-0.5 block">
                  {stats.total_registered}
                </span>
                <span className="text-[10px] text-slate-400">Teralokasi di ruangan</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "in_progress"
                    ? "bg-blue-100/80 border-blue-400 ring-2 ring-blue-500/20"
                    : "bg-white border-blue-200/90 bg-blue-50/20 hover:bg-blue-50/50"
                }`}
                title="Filter siswa yang sedang mengerjakan"
              >
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Sedang Ujian
                </span>
                <span className="text-xl font-black text-blue-700 mt-0.5 block">
                  {stats.in_progress}
                </span>
                <span className="text-[10px] text-blue-600/80">Aktif mengerjakan</span>
              </div>

              {/* Card Dicurigai Curang */}
              <div
                onClick={() => setStatusFilter(statusFilter === "suspicious" ? "all" : "suspicious")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "suspicious"
                    ? "bg-rose-100 border-rose-500 ring-2 ring-rose-500/30"
                    : (stats.suspicious_count || 0) > 0
                    ? "bg-rose-50 border-rose-300 hover:bg-rose-100/70"
                    : "bg-white border-slate-200/90 hover:bg-slate-50"
                }`}
                title="Filter siswa yang dicurigai curang (pernah/sedang terkunci)"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    Dicurigai Curang
                  </span>
                  {(stats.suspicious_count || 0) > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">
                  {stats.suspicious_count || 0}
                </span>
                <span className="text-[10px] text-rose-600 font-medium">Melanggar / Curang</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "locked" ? "all" : "locked")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "locked"
                    ? "bg-rose-100 border-rose-400 ring-2 ring-rose-500/20"
                    : stats.locked > 0
                    ? "bg-rose-50 border-rose-300 animate-pulse hover:bg-rose-100/70"
                    : "bg-white border-slate-200/90 hover:bg-slate-50"
                }`}
                title="Filter siswa yang saat ini terkunci"
              >
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                  Terkunci
                </span>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">
                  {stats.locked}
                </span>
                <span className="text-[10px] text-rose-600">Perlu buka kunci</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "submitted" ? "all" : "submitted")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "submitted"
                    ? "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500/20"
                    : "bg-white border-emerald-200/90 bg-emerald-50/20 hover:bg-emerald-50/50"
                }`}
                title="Filter siswa yang sudah mengumpulkan"
              >
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Selesai
                </span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                  {stats.submitted}
                </span>
                <span className="text-[10px] text-emerald-600/80">Sudah mengumpulkan</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === "not_started" ? "all" : "not_started")}
                className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
                  statusFilter === "not_started"
                    ? "bg-slate-200 border-slate-400 ring-2 ring-slate-400/20"
                    : "bg-white border-slate-200/90 hover:bg-slate-50"
                }`}
                title="Filter siswa yang belum mulai"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Belum Mulai
                </span>
                <span className="text-xl font-black text-slate-600 mt-0.5 block">
                  {stats.not_started}
                </span>
                <span className="text-[10px] text-slate-400">Belum klik mulai</span>
              </div>
            </div>

            {/* Action Bar & Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px]">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa, NISN, atau kelas..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">Semua Status ({students.length})</option>
                  <option value="suspicious">🚨 Dicurigai Curang ({stats.suspicious_count || 0})</option>
                  <option value="locked">Terkunci ({stats.locked})</option>
                  <option value="in_progress">Sedang Ujian ({stats.in_progress})</option>
                  <option value="submitted">Selesai ({stats.submitted})</option>
                  <option value="not_started">Belum Mulai ({stats.not_started})</option>
                </select>
              </div>

              {/* Action Buttons: Bulk Unlock, Auto-refresh, Manual Refresh */}
              <div className="flex items-center gap-2 shrink-0">
                {stats.locked > 0 && !isExamCompleted && (
                  <button
                    onClick={handleUnlockAll}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Buka seluruh siswa yang saat ini terkunci di ruangan ini"
                  >
                    <FontAwesomeIcon icon={faLockOpen} />
                    <span>Buka Kunci Semua ({stats.locked})</span>
                  </button>
                )}

                {/* Auto Refresh Toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    autoRefresh
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                  title="Pembaruan data otomatis setiap 8 detik"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      autoRefresh ? "bg-emerald-500 animate-ping" : "bg-slate-300"
                    }`}
                  />
                  <span>Auto Refresh {autoRefresh ? "ON" : "OFF"}</span>
                </button>

                {/* Manual Refresh */}
                <button
                  onClick={() => fetchProctoringData()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Segarkan data sekarang"
                >
                  <FontAwesomeIcon icon={faRotate} className={loading ? "animate-spin" : ""} />
                  <span className="hidden sm:inline ml-1.5">Refresh</span>
                </button>
              </div>
            </div>

            {/* Tabel Live Siswa */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">Meja</th>
                      <th className="px-4 py-3">Peserta Ujian</th>
                      <th className="px-3 py-3">Kelas & NISN</th>
                      <th className="px-3 py-3">Mapel Ujian</th>
                      <th className="px-3 py-3 text-center">Presensi</th>
                      <th className="px-4 py-3">Status Ujian</th>
                      <th className="px-3 py-3">Soal Terjawab</th>
                      <th className="px-3 py-3">Perangkat</th>
                      <th className="px-3 py-3 text-center">Koneksi & Ping</th>
                      <th className="px-4 py-3 text-right">Aksi Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          <FontAwesomeIcon icon={faUsers} className="text-3xl text-slate-300 mb-2 block" />
                          <p className="font-semibold">Tidak ada peserta yang cocok dengan filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const isLocked = st.exam_status === "locked";
                        const isInProgress = st.exam_status === "in_progress";
                        const isSubmitted = st.exam_status === "submitted";
                        const isSuspicious = Boolean(
                          st.is_suspicious || isLocked || (st.lock_count && st.lock_count > 0)
                        );

                        // Device icon detection
                        const devName = (st.device_info || "").toLowerCase();
                        const isMobile =
                          devName.includes("hp") ||
                          devName.includes("android") ||
                          devName.includes("iphone") ||
                          devName.includes("phone");
                        const isTablet = devName.includes("ipad") || devName.includes("tablet");

                        // Connection status detection
                        const connQuality = (st.connection_quality || "stabil").toLowerCase();
                        const pingMs = st.ping_ms !== undefined && st.ping_ms !== null ? st.ping_ms : 25;

                        return (
                          <tr
                            key={st.allocation_id}
                            className={`transition border-b border-slate-100 ${
                              isSuspicious
                                ? "bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-600 shadow-2xs font-medium"
                                : isLocked
                                ? "bg-rose-50/40 hover:bg-rose-100/50"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Nomor Meja */}
                            <td className="px-4 py-3 text-center font-black text-slate-800">
                              <span
                                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black ${
                                  isSuspicious
                                    ? "bg-rose-200 text-rose-900 border border-rose-300"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {st.seat_number}
                              </span>
                            </td>

                            {/* Nama Siswa */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-bold block text-xs ${
                                    isSuspicious ? "text-rose-950 font-black" : "text-slate-800"
                                  }`}
                                >
                                  {st.student_name}
                                </span>
                                {isSuspicious && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white shrink-0 shadow-2xs animate-pulse flex items-center gap-1"
                                    title={`Terdeteksi indikasi kecurangan (${st.lock_count || 1}x pelanggaran)`}
                                  >
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />
                                    <span>Dicurigai ({st.lock_count || 1}x)</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                ID: #{st.student_id}
                              </span>
                            </td>

                            {/* Kelas & NISN */}
                            <td className="px-3 py-3">
                              <span className="font-bold text-slate-700 block">
                                {st.class_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                NISN: {st.nisn || "-"}
                              </span>
                            </td>

                            {/* Mapel Ujian yang Dikerjakan */}
                            <td className="px-3 py-3">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs max-w-[160px] truncate"
                                title={st.subject_name || (subjects[0]?.subject_name || "-")}
                              >
                                <FontAwesomeIcon icon={faDesktop} className="text-[10px] text-blue-600 shrink-0" />
                                <span className="truncate">{st.subject_name || (subjects[0]?.subject_name || "-")}</span>
                              </span>
                            </td>

                            {/* Status Presensi */}
                            <td className="px-3 py-3 text-center">
                              {st.attendance_status === "H" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Hadir
                                </span>
                              )}
                              {st.attendance_status === "I" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Izin
                                </span>
                              )}
                              {st.attendance_status === "S" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Sakit
                                </span>
                              )}
                              {st.attendance_status === "A" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Alpa
                                </span>
                              )}
                            </td>

                            {/* Status Ujian Live */}
                            <td className="px-4 py-3">
                              {isLocked ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                                      <FontAwesomeIcon icon={faLock} />
                                      TERKUNCI
                                    </span>
                                    {Boolean(st.lock_count && st.lock_count > 0) && (
                                      <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                        {st.lock_count}x Melanggar
                                      </span>
                                    )}
                                  </div>

                                  {/* KODE BUKA KUNCI UNTUK DIBERIKAN KE SISWA */}
                                  {st.unlock_code && (
                                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-1.5 shadow-2xs">
                                      <span className="text-[9px] font-bold text-amber-800 uppercase block tracking-wider">
                                        Kode Buka Kunci Siswa:
                                      </span>
                                      <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                        <span className="font-mono font-black text-amber-950 text-sm tracking-widest">
                                          {st.unlock_code}
                                        </span>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(st.unlock_code || "");
                                            setCopiedCodeId(st.allocation_id);
                                            setTimeout(() => setCopiedCodeId(null), 2000);
                                          }}
                                          className="text-[9px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                                          title="Salin kode ini untuk dibagikan ke siswa"
                                        >
                                          <FontAwesomeIcon icon={copiedCodeId === st.allocation_id ? faCheck : faCopy} className="text-[8px]" />
                                          <span>{copiedCodeId === st.allocation_id ? "Tersalin!" : "Salin Kode"}</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {st.lock_reason && (
                                    <span className="text-[10px] text-rose-700 block font-bold leading-tight bg-rose-100/70 p-1 rounded border border-rose-200">
                                      {st.lock_reason}
                                    </span>
                                  )}
                                </div>
                              ) : isInProgress ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                    Mengerjakan
                                  </span>
                                  {Boolean(st.lock_count && st.lock_count > 0) && (
                                    <span className="block text-[9px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded">
                                      ⚠️ Riwayat Pelanggaran ({st.lock_count}x)
                                    </span>
                                  )}
                                </div>
                              ) : isSubmitted ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <FontAwesomeIcon icon={faCircleCheck} />
                                    Selesai
                                  </span>
                                  {Boolean(st.lock_count && st.lock_count > 0) && (
                                    <span className="block text-[9px] font-bold text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded">
                                      ⚠️ Riwayat Pelanggaran ({st.lock_count}x)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  Belum Mulai
                                </span>
                              )}
                            </td>

                            {/* Progres Soal Terjawab */}
                            <td className="px-3 py-3">
                              {st.session_id ? (
                                <div className="space-y-1 w-28">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                    <span>{st.total_answered} Soal</span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {isSubmitted ? "100%" : `${Math.min(100, Math.round(((st.total_answered || 0) / 40) * 100))}%`}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isSubmitted
                                          ? "bg-emerald-500"
                                          : isLocked
                                          ? "bg-rose-500"
                                          : "bg-blue-600"
                                      }`}
                                      style={{
                                        width: isSubmitted
                                          ? "100%"
                                          : `${Math.min(100, Math.max(5, ((st.total_answered || 0) / 40) * 100))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Perangkat yang Digunakan */}
                            <td className="px-3 py-3 text-[11px]">
                              {st.session_id && (st.device_info || st.browser_info || st.ip_address) ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <FontAwesomeIcon
                                      icon={isMobile ? faMobileScreen : isTablet ? faMobileScreen : faLaptop}
                                      className={`${isMobile ? "text-amber-600" : "text-blue-600"} text-xs shrink-0`}
                                    />
                                    <span className="truncate max-w-[130px]" title={st.device_info || "Perangkat Ujian"}>
                                      {st.device_info || "Perangkat Ujian"}
                                    </span>
                                  </div>
                                  {st.browser_info && (
                                    <div
                                      className="text-[10px] text-slate-500 truncate max-w-[130px]"
                                      title={st.browser_info}
                                    >
                                      🌐 {st.browser_info}
                                    </div>
                                  )}
                                  {st.ip_address && (
                                    <span className="font-mono text-[9px] text-slate-400 block">
                                      IP: {st.ip_address}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[10px]">-</span>
                              )}
                            </td>

                            {/* Kualitas Koneksi & Ping */}
                            <td className="px-3 py-3 text-center">
                              {st.session_id ? (
                                connQuality === "offline" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Terputus
                                  </span>
                                ) : connQuality === "stabil" || pingMs < 60 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <FontAwesomeIcon icon={faWifi} className="text-[9px]" />
                                      {pingMs} ms
                                    </span>
                                    <span className="text-[9px] font-medium text-emerald-600 mt-0.5">
                                      Stabil
                                    </span>
                                  </div>
                                ) : connQuality === "sedang" || pingMs < 180 ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <FontAwesomeIcon icon={faSignal} className="text-[9px]" />
                                      {pingMs} ms
                                    </span>
                                    <span className="text-[9px] font-medium text-amber-600 mt-0.5">
                                      Sedang
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                      <FontAwesomeIcon icon={faSignal} className="text-[9px]" />
                                      {pingMs} ms
                                    </span>
                                    <span className="text-[9px] font-medium text-orange-600 mt-0.5">
                                      Lemah
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-300 italic text-[10px]">-</span>
                              )}
                            </td>

                            {/* Aksi Pengawas */}
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {isExamCompleted ? (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    Tersimpan
                                  </span>
                                ) : (
                                  <>
                                    {isLocked && (
                                      <button
                                        onClick={() => handleUnlockStudent(st)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                                        title="Buka kunci siswa agar bisa melanjutkan ujian"
                                      >
                                        <FontAwesomeIcon icon={faLockOpen} />
                                        <span>Buka Kunci</span>
                                      </button>
                                    )}

                                    {st.session_id && !isSubmitted && (
                                      <>
                                        <button
                                          onClick={() => handleResetLogin(st)}
                                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                          title="Reset Perangkat / Ganti PC (Izinkan login dari perangkat lain)"
                                        >
                                          Reset Login
                                        </button>

                                        <button
                                          onClick={() => handleForceSubmit(st)}
                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                          title="Kumpulkan ujian siswa secara paksa"
                                        >
                                          Selesaikan
                                        </button>
                                      </>
                                    )}

                                    {!st.session_id && (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Standby
                                      </span>
                                    )}
                                  </>
                                )}
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

        {/* ==================================================================== */}
        {/* KONTEN TAB 2: DAFTAR HADIR (PRESENSI SISWA) */}
        {/* ==================================================================== */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            {/* Action Bar Presensi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">
                  Presensi Peserta Ujian Ruang {duty?.room_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Total {students.length} peserta. Ubah status dan klik &quot;Simpan Presensi&quot; untuk mengupdate sistem.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faCheckDouble} className="text-blue-600" />
                  <span>Tandai Semua Hadir</span>
                </button>

                <button
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>{isSavingAttendance ? "Menyimpan..." : "Simpan Presensi"}</span>
                </button>

                <button
                  onClick={() => setPrintType("attendance")}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faPrint} />
                  <span>Cetak Presensi (A4)</span>
                </button>
              </div>
            </div>

            {/* Rekap Ringkas Kehadiran */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Hadir (H)
                </span>
                <span className="text-lg font-black text-emerald-800">
                  {students.filter((s) => s.attendance_status === "H").length}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Izin (I)
                </span>
                <span className="text-lg font-black text-amber-800">
                  {students.filter((s) => s.attendance_status === "I").length}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Sakit (S)
                </span>
                <span className="text-lg font-black text-blue-800">
                  {students.filter((s) => s.attendance_status === "S").length}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Alpa (A)
                </span>
                <span className="text-lg font-black text-rose-800">
                  {students.filter((s) => s.attendance_status === "A").length}
                </span>
              </div>
            </div>

            {/* Tabel Daftar Hadir Siswa */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-center w-14">Meja</th>
                      <th className="px-4 py-3">NISN</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-center w-48">Status Kehadiran</th>
                      <th className="px-4 py-3">Catatan Khusus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-center font-bold text-slate-700">
                          {st.seat_number}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          {st.nisn || "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {st.student_name}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          {st.class_name}
                        </td>
                        {/* Radio Status Kehadiran: H, I, S, A */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            {(["H", "I", "S", "A"] as const).map((stat) => {
                              const isChecked = (st.attendance_status || "H") === stat;
                              let activeColor = "bg-white text-slate-800 shadow-2xs";
                              if (isChecked && stat === "H") activeColor = "bg-emerald-600 text-white shadow-2xs";
                              if (isChecked && stat === "I") activeColor = "bg-amber-500 text-white shadow-2xs";
                              if (isChecked && stat === "S") activeColor = "bg-blue-600 text-white shadow-2xs";
                              if (isChecked && stat === "A") activeColor = "bg-rose-600 text-white shadow-2xs";

                              return (
                                <button
                                  key={stat}
                                  type="button"
                                  onClick={() => handleAttendanceChange(st.student_id, stat)}
                                  className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                    isChecked ? activeColor : "text-slate-500 hover:text-slate-800"
                                  }`}
                                  title={`Tandai ${stat === "H" ? "Hadir" : stat === "I" ? "Izin" : stat === "S" ? "Sakit" : "Alpa"}`}
                                >
                                  {stat}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        {/* Catatan Presensi */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={st.attendance_notes || ""}
                            onChange={(e) => handleAttendanceNotesChange(st.student_id, e.target.value)}
                            placeholder="Catatan..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* KONTEN TAB 3: BERITA ACARA UJIAN */}
        {/* ==================================================================== */}
        {activeTab === "berita_acara" && (
          <div className="space-y-4">
            {/* Header & Aksi Berita Acara */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">
                  Berita Acara Pelaksanaan Ujian Ruang {duty?.room_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Dokumen resmi laporan pelaksanaan ujian yang ditandatangani oleh Pengawas Ruang dan Proktor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveBeritaAcara}
                  disabled={isSavingBA}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>{isSavingBA ? "Menyimpan..." : "Simpan Berita Acara"}</span>
                </button>

                <button
                  onClick={() => setPrintType("berita_acara")}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faPrint} />
                  <span>Cetak Berita Acara (A4)</span>
                </button>
              </div>
            </div>

            {/* Form Isian Berita Acara */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
              {/* Rincian Waktu & Ruangan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari & Tanggal Ujian
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatDateIndo(duty?.exam_date)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ruangan & Sesi
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${duty?.room_name} - ${duty?.session_name} (${duty?.session_time || ""})`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran yang Diujikan
                  </label>
                  <input
                    type="text"
                    value={beritaAcara?.subject_name || ""}
                    onChange={(e) =>
                      setBeritaAcara((prev) => (prev ? { ...prev, subject_name: e.target.value } : null))
                    }
                    placeholder="Mata pelajaran..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Rincian Kehadiran Peserta (Auto-Sync dari Presensi) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Statistik Kehadiran Peserta (Otomatis dari Presensi):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Jumlah Peserta Terdaftar
                    </label>
                    <input
                      type="number"
                      value={beritaAcara?.total_registered || 0}
                      onChange={(e) =>
                        setBeritaAcara((prev) =>
                          prev ? { ...prev, total_registered: Number(e.target.value) } : null
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Jumlah Peserta Hadir
                    </label>
                    <input
                      type="number"
                      value={beritaAcara?.total_present || 0}
                      onChange={(e) =>
                        setBeritaAcara((prev) =>
                          prev ? { ...prev, total_present: Number(e.target.value) } : null
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Jumlah Peserta Tidak Hadir
                    </label>
                    <input
                      type="number"
                      value={beritaAcara?.total_absent || 0}
                      onChange={(e) =>
                        setBeritaAcara((prev) =>
                          prev ? { ...prev, total_absent: Number(e.target.value) } : null
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Daftar Nama Peserta yang Tidak Hadir & Alasan
                  </label>
                  <input
                    type="text"
                    value={beritaAcara?.absent_students || "-"}
                    onChange={(e) =>
                      setBeritaAcara((prev) =>
                        prev ? { ...prev, absent_students: e.target.value } : null
                      )
                    }
                    placeholder="Contoh: Budi (Sakit), Ani (Izin)"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Rincian Petugas Ruangan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Pengawas 1 (Utama)
                  </label>
                  <input
                    type="text"
                    value={beritaAcara?.supervisor1_name || ""}
                    onChange={(e) =>
                      setBeritaAcara((prev) =>
                        prev ? { ...prev, supervisor1_name: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Pengawas 2
                  </label>
                  <input
                    type="text"
                    value={beritaAcara?.supervisor2_name || ""}
                    onChange={(e) =>
                      setBeritaAcara((prev) =>
                        prev ? { ...prev, supervisor2_name: e.target.value } : null
                      )
                    }
                    placeholder="Nama pengawas 2 jika ada..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Proktor Ruangan
                  </label>
                  <input
                    type="text"
                    value={beritaAcara?.proctor_name || ""}
                    onChange={(e) =>
                      setBeritaAcara((prev) =>
                        prev ? { ...prev, proctor_name: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Catatan Kejadian Pelaksanaan Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Kejadian Selama Pelaksanaan Ujian
                </label>
                <textarea
                  rows={4}
                  value={beritaAcara?.notes || ""}
                  onChange={(e) =>
                    setBeritaAcara((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="Catatan pelaksanaan ujian, kejadian khusus, kendala teknis, dll..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Contoh: &quot;Ujian berlangsung tertib, aman, dan lancar. Tidak ada kendala jaringan maupun perangkat.&quot;
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL CETAK (A4 STANDARD RESMI) */}
      {/* ==================================================================== */}
      {printType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 print:p-0 print:static print:bg-white print:overflow-visible">
          {/* Top Control Bar in Modal (Hidden when printing) */}
          <div className="w-full max-w-[210mm] bg-white rounded-xl shadow-md p-3 mb-4 flex items-center justify-between print:hidden">
            <span className="text-xs font-bold text-slate-800">
              Pratinjau Cetak Lembar {printType === "attendance" ? "Daftar Hadir" : "Berita Acara"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPrint} />
                <span>Cetak Sekarang (A4)</span>
              </button>
              <button
                onClick={() => setPrintType(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          {/* Lembar A4 Cetak */}
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white rounded-2xl shadow-2xl p-8 sm:p-[12mm] border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0 text-black font-serif">
            {/* KOP Surat Resmi */}
            <div className="flex items-center gap-4 pb-2 border-b-4 border-black">
              {schoolProfile?.logo ? (
                <img
                  src={schoolProfile.logo}
                  alt="Logo Sekolah"
                  className="w-16 h-16 object-contain shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs shrink-0">
                  LOGO
                </div>
              )}
              <div className="flex-1 text-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  PEMERINTAH PROVINSI {schoolProfile?.province || "BALI"}
                </h3>
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA
                </h3>
                <h1 className="text-lg font-black uppercase tracking-tight text-black leading-tight">
                  {schoolProfile?.school_name || "SMA NEGERI CBT"}
                </h1>
                <p className="text-[11px] leading-snug mt-0.5 text-black">
                  {schoolProfile?.address || "Jl. Pendidikan No. 1"} &bull; Telp:{" "}
                  {schoolProfile?.phone || "(0361) 123456"}
                </p>
              </div>
            </div>

            {/* KONTEN DOKUMEN 1: DAFTAR HADIR */}
            {printType === "attendance" && (
              <div className="space-y-4 pt-3">
                <div className="text-center font-sans">
                  <h2 className="text-base font-black uppercase tracking-wide">
                    DAFTAR HADIR PESERTA UJIAN
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    TAHUN PELAJARAN {new Date().getFullYear()} / {new Date().getFullYear() + 1}
                  </p>
                </div>

                {/* Metadata Header */}
                <table className="w-full text-xs font-sans">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 font-semibold">Mata Pelajaran</td>
                      <td className="w-3">:</td>
                      <td className="font-bold">
                        {subjects.length > 0
                          ? subjects.map((s: any) => s.subject_name).join(", ")
                          : "Sesuai Jadwal"}
                      </td>
                      <td className="w-24 py-0.5 font-semibold">Hari / Tgl</td>
                      <td className="w-3">:</td>
                      <td>{formatDateIndo(duty?.exam_date)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold">Ruangan</td>
                      <td>:</td>
                      <td className="font-bold">{duty?.room_name}</td>
                      <td className="py-0.5 font-semibold">Sesi / Waktu</td>
                      <td>:</td>
                      <td>
                        {duty?.session_name} ({duty?.session_time || "-"})
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Siswa & Tanda Tangan */}
                <table className="w-full border-collapse border border-black text-[11px] font-sans mt-3">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black px-2 py-1 w-10">No</th>
                      <th className="border border-black px-2 py-1 w-24">NISN</th>
                      <th className="border border-black px-2 py-1">Nama Peserta</th>
                      <th className="border border-black px-2 py-1 w-16">Kelas</th>
                      <th className="border border-black px-2 py-1 w-32" colSpan={2}>
                        Tanda Tangan
                      </th>
                      <th className="border border-black px-2 py-1 w-20">Ket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, idx) => (
                      <tr key={st.student_id}>
                        <td className="border border-black text-center py-1">{st.seat_number}</td>
                        <td className="border border-black text-center py-1 font-mono text-[10px]">
                          {st.nisn || "-"}
                        </td>
                        <td className="border border-black px-2 py-1 font-semibold">
                          {st.student_name}
                        </td>
                        <td className="border border-black text-center py-1">{st.class_name}</td>
                        {idx % 2 === 0 ? (
                          <>
                            <td className="border border-black px-2 py-1 text-left w-16">
                              {idx + 1}. .........
                            </td>
                            <td className="border border-black px-2 py-1 w-16"></td>
                          </>
                        ) : (
                          <>
                            <td className="border border-black px-2 py-1 w-16"></td>
                            <td className="border border-black px-2 py-1 text-left w-16">
                              {idx + 1}. .........
                            </td>
                          </>
                        )}
                        <td className="border border-black text-center py-1 text-[10px]">
                          {st.attendance_status === "H" ? "" : st.attendance_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tanda Tangan Pengawas */}
                <div className="grid grid-cols-2 text-center text-xs mt-8 font-sans">
                  <div>
                    <p className="mb-14">Pengawas 2,</p>
                    <p className="font-bold underline">
                      {duty?.supervisor2_name && duty.supervisor2_name !== "-"
                        ? duty.supervisor2_name
                        : "...................................."}
                    </p>
                    <p className="text-slate-600 text-[10px]">NIP. ....................................</p>
                  </div>
                  <div>
                    <p className="mb-14">Pengawas 1,</p>
                    <p className="font-bold underline">
                      {duty?.supervisor1_name || "...................................."}
                    </p>
                    <p className="text-slate-600 text-[10px]">NIP. ....................................</p>
                  </div>
                </div>
              </div>
            )}

            {/* KONTEN DOKUMEN 2: BERITA ACARA */}
            {printType === "berita_acara" && (
              <div className="space-y-4 pt-3 font-sans">
                <div className="text-center">
                  <h2 className="text-base font-black uppercase tracking-wide">
                    BERITA ACARA PELAKSANAAN UJIAN
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    TAHUN PELAJARAN {new Date().getFullYear()} / {new Date().getFullYear() + 1}
                  </p>
                </div>

                <div className="text-xs space-y-2 leading-relaxed text-justify">
                  <p>
                    Pada hari ini <strong>{formatDateIndo(duty?.exam_date)}</strong>, telah diselenggarakan
                    Ujian Berbasis Komputer (CBT) untuk mata pelajaran{" "}
                    <strong>{beritaAcara?.subject_name || "Mata Pelajaran"}</strong> dari pukul{" "}
                    <strong>{duty?.session_time || "07:30 - 09:30"}</strong> di:
                  </p>

                  <div className="pl-6 space-y-0.5">
                    <p>Ruangan Ujian : <strong>{duty?.room_name}</strong></p>
                    <p>Sesi Ujian &nbsp;&nbsp;&nbsp;&nbsp;: <strong>{duty?.session_name}</strong></p>
                  </div>

                  <p className="pt-1">
                    Dengan rincian kehadiran peserta sebagai berikut:
                  </p>

                  <table className="w-full text-xs font-sans border-collapse border border-black my-2">
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-semibold w-64">
                          1. Jumlah Peserta Terdaftar
                        </td>
                        <td className="border border-black px-3 py-1 font-bold">
                          {beritaAcara?.total_registered || students.length} Orang
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-semibold">
                          2. Jumlah Peserta Hadir
                        </td>
                        <td className="border border-black px-3 py-1 font-bold">
                          {beritaAcara?.total_present || 0} Orang
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-semibold">
                          3. Jumlah Peserta Tidak Hadir
                        </td>
                        <td className="border border-black px-3 py-1 font-bold">
                          {beritaAcara?.total_absent || 0} Orang
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-semibold">
                          4. Nama Siswa Tidak Hadir
                        </td>
                        <td className="border border-black px-3 py-1">
                          {beritaAcara?.absent_students || "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="pt-1">
                    <strong>Catatan Kejadian Selama Ujian:</strong>
                  </p>
                  <div className="p-3 border border-black rounded-sm min-h-[60px] text-xs leading-relaxed">
                    {beritaAcara?.notes || "Ujian berjalan tertib, aman, dan lancar."}
                  </div>

                  <p className="pt-1">
                    Demikian Berita Acara ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
                  </p>
                </div>

                {/* Tanda Tangan 3 Kolom: Proktor, Pengawas 2, Pengawas 1 */}
                <div className="grid grid-cols-3 text-center text-xs mt-10 font-sans">
                  <div>
                    <p className="mb-14">Proktor Ruang,</p>
                    <p className="font-bold underline">
                      {beritaAcara?.proctor_name || duty?.proctor_name || "...................................."}
                    </p>
                    <p className="text-slate-600 text-[10px]">NIP. ....................................</p>
                  </div>
                  <div>
                    <p className="mb-14">Pengawas Ruang 2,</p>
                    <p className="font-bold underline">
                      {beritaAcara?.supervisor2_name || duty?.supervisor2_name || "...................................."}
                    </p>
                    <p className="text-slate-600 text-[10px]">NIP. ....................................</p>
                  </div>
                  <div>
                    <p className="mb-14">Pengawas Ruang 1,</p>
                    <p className="font-bold underline">
                      {beritaAcara?.supervisor1_name || duty?.supervisor1_name || "...................................."}
                    </p>
                    <p className="text-slate-600 text-[10px]">NIP. ....................................</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL FULLSCREEN TOKEN UNTUK DITAMPILKAN DI PROYEKTOR / LAYAR KELAS */}
      {/* ==================================================================== */}
      {showTokenFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in select-none">
          <button
            onClick={() => setShowTokenFullscreen(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition cursor-pointer"
            title="Tutup Tampilan Penuh"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>

          <div className="max-w-2xl w-full space-y-6">
            <div className="space-y-1">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500 text-slate-950 inline-block shadow-md">
                TOKEN UJIAN AKTIF &bull; PUSAT CBT
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-white mt-3 tracking-tight">
                {activeToken?.active_subject || "Mata Pelajaran Ujian"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {duty?.room_name} &bull; {duty?.session_name} ({duty?.session_time || "Sesuai Jadwal"})
              </p>
            </div>

            {/* Kotak Token Ukuran Raksasa */}
            <div className="bg-slate-900/90 border-2 border-amber-400/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-amber-500/20">
              <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest block mb-2">
                MASUKKAN TOKEN INI PADA LAYAR PESERTA:
              </span>
              <span className="text-6xl sm:text-8xl font-black font-mono tracking-widest text-amber-300 block select-all">
                {activeToken?.token || "- - - - -"}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Token ini dirilis dan dikendalikan sepenuhnya oleh Admin Pusat. Silakan masukkan token di atas pada kolom token pengerjaan soal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
