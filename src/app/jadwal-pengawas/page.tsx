"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarDays,
  faDoorOpen,
  faClock,
  faChalkboardUser,
  faUsers,
  faBolt,
  faPlus,
  faPen,
  faTrash,
  faRotate,
  faPrint,
  faFilter,
  faCheck,
  faXmark,
  faShieldHalved,
  faDesktop,
  faScaleBalanced,
  faUserShield,
  faTriangleExclamation,
  faBoxArchive,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function JadwalPengawasPage() {
  const router = useRouter();
  const { user, token, isAdminOrStaff, isLoading } = useAuth();

  // State Data Jadwal & Master
  const [assignments, setAssignments] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dutyCounts, setDutyCounts] = useState<{ [name: string]: number }>({});
  const [loading, setLoading] = useState(true);

  // Tab Tampilan Utama
  const [activeTab, setActiveTab] = useState<"ruang" | "cadangan" | "rekap">("ruang");

  // State Filter & Pencarian
  const [filterDate, setFilterDate] = useState<string>("all");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  const [filterSession, setFilterSession] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Manual Pengawas Ruangan
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formSession, setFormSession] = useState("");
  const [formSupervisor1, setFormSupervisor1] = useState("");
  const [formSupervisor2, setFormSupervisor2] = useState("");
  const [formSupervisor3, setFormSupervisor3] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  // Modal Manual Pengawas Cadangan
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [editingBackupId, setEditingBackupId] = useState<number | null>(null);
  const [formBackupDate, setFormBackupDate] = useState("");
  const [formBackupSession, setFormBackupSession] = useState("");
  const [formBackupTeacher, setFormBackupTeacher] = useState("");
  const [formBackupOrder, setFormBackupOrder] = useState<number>(1);
  const [formBackupNotes, setFormBackupNotes] = useState("Standby Sekretariat");
  const [savingBackup, setSavingBackup] = useState(false);

  // Modal Penugasan Otomatis (Auto-Assign)
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoDates, setAutoDates] = useState<string[]>([]);
  const [autoSupPerRoom, setAutoSupPerRoom] = useState<number>(2);
  const [autoBackupPerSession, setAutoBackupPerSession] = useState<number>(1);
  const [autoReplaceExisting, setAutoReplaceExisting] = useState<boolean>(true);
  const [autoProcessing, setAutoProcessing] = useState(false);

  // Modal & View Cetak Jadwal Pengawas
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDateFilter, setPrintDateFilter] = useState<string>("all");
  const [printOrientation, setPrintOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [printIncludeBackups, setPrintIncludeBackups] = useState<boolean>(true);
  const [printIncludeDutySummary, setPrintIncludeDutySummary] = useState<boolean>(true);
  const [printIncludeSignatures, setPrintIncludeSignatures] = useState<boolean>(true);
  const [showAllTeachers, setShowAllTeachers] = useState<boolean>(false);

  // Status Ujian Selesai & Mode Siaga (Standby)
  const [isExamCompleted, setIsExamCompleted] = useState<boolean>(false);
  const [loadedArchiveExam, setLoadedArchiveExam] = useState<{ id: number; title: string } | null>(null);

  // Modal Arsip Jadwal Pengawas
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivesList, setArchivesList] = useState<any[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [selectedArchiveDetail, setSelectedArchiveDetail] = useState<any | null>(null);
  const [loadingArchiveDetail, setLoadingArchiveDetail] = useState(false);

  // Profil Sekolah & KOP Surat Resmi dari SIAK
  const [schoolProfile, setSchoolProfile] = useState<{
    id?: number;
    school_name?: string;
    npsn?: string;
    logo?: string | null;
    address?: string;
    phone?: string;
    email?: string;
    district?: string;
    regency?: string;
    province?: string;
    postal_code?: string;
    accreditation?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
    letterhead?: string | null;
    headmaster_signature?: string | null;
  } | null>({
    school_name: "SMA Negeri 4 Singaraja",
    headmaster_name: "Putu Gede Wartawan, S.Pd., M.Pd.",
    headmaster_nip: "19700224 199503 1 003",
    letterhead: "/static/uploads/school_letterhead_1791255670_0bd00d.png",
    logo: "/static/uploads/school_logo_1790832844.png",
    address: "Jl. Melati, Kelurahan Banjar Jawa",
    regency: "Buleleng",
    province: "Bali",
    phone: "(021) 12345678",
    email: "info@sekolah.sch.id",
  });
  const [useImageLetterhead, setUseImageLetterhead] = useState<boolean>(true);

  // Data Pengesahan & Tanda Tangan Cetak (Default sesuai SIAK)
  const [printCity, setPrintCity] = useState<string>("Singaraja");
  const [printDateSign, setPrintDateSign] = useState<string>(() =>
    new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  );
  const [printPrincipalName, setPrintPrincipalName] = useState<string>("Putu Gede Wartawan, S.Pd., M.Pd.");
  const [printPrincipalNip, setPrintPrincipalNip] = useState<string>("19700224 199503 1 003");
  const [printCommitteeName, setPrintCommitteeName] = useState<string>("Ahmad Fauzi, S.Kom.");
  const [printCommitteeNip, setPrintCommitteeNip] = useState<string>("19850914 201001 1 015");
  const [showSignatureSettings, setShowSignatureSettings] = useState<boolean>(false);

  // Ambil profil sekolah dan Kepala Sekolah langsung dari database SIAK
  useEffect(() => {
    const fetchSchoolProfile = async () => {
      try {
        let sch: any = null;
        // 1. Coba dari CBT backend sync endpoint
        try {
          const res = await fetch("/api/cbt-backend/api/cbt/sync/school-profile");
          if (res.ok) {
            const json = await res.json();
            if (json.school) sch = json.school;
          }
        } catch {}

        // 2. Jika belum, coba langsung dari SIAK backend proxy
        if (!sch) {
          try {
            const res2 = await fetch("/api/siak-backend/api/school-profile");
            if (res2.ok) sch = await res2.json();
          } catch {}
        }

        if (sch) {
          setSchoolProfile(sch);
          if (sch.headmaster_name) {
            setPrintPrincipalName(sch.headmaster_name);
          }
          if (sch.headmaster_nip) {
            const raw = sch.headmaster_nip.replace(/\s+/g, "");
            const formatted =
              raw.length === 18
                ? `${raw.slice(0, 8)} ${raw.slice(8, 14)} ${raw.slice(14, 15)} ${raw.slice(15)}`
                : sch.headmaster_nip;
            setPrintPrincipalNip(formatted);
          }
          if (sch.regency || sch.district) {
            const city = sch.regency || sch.district;
            setPrintCity(city === "Buleleng" ? "Singaraja" : city);
          }
        }
      } catch (err) {
        console.error("Gagal memuat profil sekolah dari SIAK:", err);
      }
    };

    fetchSchoolProfile();
  }, []);

  // Map guru nama ke NIP
  const teacherNipMap: { [name: string]: string } = {};
  teachers.forEach((t) => {
    if (t.name) teacherNipMap[t.name] = t.nip || "-";
  });

  // Set nama pengawas yang dipilih di menu Pengawas Ujian
  const selectedSupervisorNames = new Set(selectedSupervisors.map((s) => s.teacher_name));

  // Pool guru yang dapat dipilih (utamakan hanya pengawas ujian terpilih jika ada)
  const supervisorPool =
    selectedSupervisors.length > 0
      ? teachers.filter((t) => selectedSupervisorNames.has(t.name))
      : teachers;

  // Redirect jika belum login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // 1. Fetch Seluruh Data Penugasan & Master
  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/supervisors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsExamCompleted(Boolean(data.is_exam_completed));
        setAssignments(data.assignments || []);
        setBackups(data.backups || []);
        setTeachers(data.teachers || []);
        setDutyCounts(data.duty_counts || {});
        setRooms(data.rooms || []);
        setSessions(data.sessions || []);
        setSelectedSupervisors(data.selected_supervisors || []);

        const dates = data.available_dates || [];
        setAvailableDates(dates);

        // Inisialisasi default form date jika belum ada
        const defaultDate = dates[0] || new Date().toISOString().split("T")[0];
        if (!formDate) setFormDate(defaultDate);
        if (!formBackupDate) setFormBackupDate(defaultDate);
        if (autoDates.length === 0) setAutoDates(dates.length > 0 ? dates : [defaultDate]);

        // Inisialisasi default room & session
        if (!formRoom && data.rooms && data.rooms.length > 0) {
          setFormRoom(data.rooms[0].name);
        }
        if (!formSession && data.sessions && data.sessions.length > 0) {
          setFormSession(data.sessions[0].session_name);
        }
        if (!formBackupSession && data.sessions && data.sessions.length > 0) {
          setFormBackupSession(data.sessions[0].session_name);
        }
      }
    } catch (e) {
      console.error("Gagal memuat jadwal pengawas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdminOrStaff) {
      fetchData();
    }
  }, [token, isAdminOrStaff]);

  // Buka Modal Arsip Jadwal Pengawas
  const handleOpenArchives = async () => {
    setShowArchiveModal(true);
    setSelectedArchiveDetail(null);
    if (!token) return;
    try {
      setLoadingArchives(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/supervisors/archives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setArchivesList(json.archives || []);
        if (json.archives && json.archives.length > 0) {
          handleSelectArchive(json.archives[0].exam_id);
        }
      }
    } catch (e) {
      console.error("Gagal memuat arsip jadwal:", e);
    } finally {
      setLoadingArchives(false);
    }
  };

  const handleSelectArchive = async (archiveExamId: number) => {
    if (!token) return;
    try {
      setLoadingArchiveDetail(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/schedule/supervisors/archives/${archiveExamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedArchiveDetail(json);
      }
    } catch (e) {
      console.error("Gagal memuat detail arsip:", e);
    } finally {
      setLoadingArchiveDetail(false);
    }
  };

  const handleLoadArchiveToView = (archDetail: any) => {
    if (!archDetail) return;
    setAssignments(archDetail.assignments || []);
    setBackups(archDetail.backups || []);
    setDutyCounts(archDetail.duty_counts || {});
    if (archDetail.selected_supervisors) {
      setSelectedSupervisors(archDetail.selected_supervisors);
    }
    const dates = Array.from(
      new Set([
        ...archDetail.assignments.map((a: any) => a.exam_date),
        ...archDetail.backups.map((b: any) => b.exam_date),
      ])
    ).filter(Boolean) as string[];
    dates.sort();
    setAvailableDates(dates);
    setLoadedArchiveExam({ id: archDetail.exam.id, title: archDetail.exam.title });
    setShowArchiveModal(false);
    Swal.fire({
      icon: "success",
      title: "Arsip Dimuat",
      text: `Jadwal dari "${archDetail.exam.title}" berhasil dimuat ke tampilan. Anda dapat melihat matriks atau mencetak jadwal ini.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleReturnToActiveSchedule = () => {
    setLoadedArchiveExam(null);
    fetchData();
  };

  // Format Tanggal Indonesia
  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getDayName = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("id-ID", { weekday: "long" });
      }
      return "";
    } catch {
      return "";
    }
  };

  // Helper untuk mendeteksi apakah seorang guru bentrok pada tanggal & sesi tertentu
  const checkTeacherConflict = (
    teacherName: string,
    date: string,
    session: string,
    excludeAssignmentId?: number | null,
    excludeBackupId?: number | null
  ) => {
    if (!teacherName || !date || !session) return null;
    const cleanName = teacherName.trim();
    if (!cleanName) return null;

    // 1. Cek apakah sedang bertugas di ruangan lain pada sesi yang sama
    const roomClash = assignments.find(
      (a) =>
        a.exam_date === date &&
        a.session_name === session &&
        (excludeAssignmentId ? a.id !== excludeAssignmentId : true) &&
        (a.supervisor1_name === cleanName ||
          a.supervisor2_name === cleanName ||
          a.supervisor3_name === cleanName)
    );
    if (roomClash) {
      return {
        type: "room" as const,
        location: roomClash.room_name,
        message: `Sedang bertugas di ${roomClash.room_name}`,
      };
    }

    // 2. Cek apakah terdaftar sebagai pengawas cadangan pada sesi yang sama
    const backupClash = backups.find(
      (b) =>
        b.exam_date === date &&
        b.session_name === session &&
        (excludeBackupId ? b.id !== excludeBackupId : true) &&
        b.teacher_name === cleanName
    );
    if (backupClash) {
      return {
        type: "backup" as const,
        location: `Cadangan ${backupClash.order_num || 1}`,
        message: `Terdaftar sebagai Pengawas Cadangan ${backupClash.order_num || 1}`,
      };
    }

    return null;
  };

  // 2. Handler Buka Modal Tambah / Edit Pengawas Ruang
  const handleOpenAddRoom = () => {
    setEditingAssignmentId(null);
    setFormDate(availableDates[0] || new Date().toISOString().split("T")[0]);
    setFormRoom(rooms[0]?.name || "");
    setFormSession(sessions[0]?.session_name || "Sesi 1");
    setFormSupervisor1("");
    setFormSupervisor2("");
    setFormSupervisor3("");
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (item: any) => {
    setEditingAssignmentId(item.id);
    setFormDate(item.exam_date);
    setFormRoom(item.room_name);
    setFormSession(item.session_name);
    setFormSupervisor1(item.supervisor1_name || "");
    setFormSupervisor2(item.supervisor2_name || "");
    setFormSupervisor3(item.supervisor3_name || "");
    setShowRoomModal(true);
  };

  // 3. Simpan Pengawas Ruang (Tambah / Edit)
  const handleSaveRoomAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formRoom || !formSession) {
      Swal.fire("Lengkapi Form", "Tanggal, Ruangan, dan Sesi wajib diisi.", "warning");
      return;
    }

    const s1 = formSupervisor1.trim();
    const s2 = formSupervisor2.trim();

    // Validasi Bentrok 1: Pengawas 1 dan Pengawas 2 sama
    if (s1 && s2 && s1 === s2) {
      Swal.fire({
        title: "Jadwal Bentrok!",
        text: `Guru '${s1}' tidak dapat dipilih sekaligus sebagai Pengawas 1 dan Pengawas 2 di ruangan yang sama.`,
        icon: "warning",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    // Validasi Bentrok 2: Pengawas 1 sedang di ruangan lain atau cadangan
    if (s1) {
      const clash1 = checkTeacherConflict(s1, formDate, formSession, editingAssignmentId);
      if (clash1) {
        Swal.fire({
          title: "Jadwal Bentrok!",
          text: `Pengawas 1 (${s1}) ${clash1.message} pada tanggal ${formDate} (${formSession}). Satu pengawas tidak dapat bertugas di lebih dari 1 posisi pada sesi yang sama.`,
          icon: "warning",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }
    }

    // Validasi Bentrok 3: Pengawas 2 sedang di ruangan lain atau cadangan
    if (s2) {
      const clash2 = checkTeacherConflict(s2, formDate, formSession, editingAssignmentId);
      if (clash2) {
        Swal.fire({
          title: "Jadwal Bentrok!",
          text: `Pengawas 2 (${s2}) ${clash2.message} pada tanggal ${formDate} (${formSession}). Satu pengawas tidak dapat bertugas di lebih dari 1 posisi pada sesi yang sama.`,
          icon: "warning",
          confirmButtonColor: "#3B82F6",
        });
        return;
      }
    }

    try {
      setSavingRoom(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/supervisors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingAssignmentId,
          exam_date: formDate,
          room_name: formRoom,
          session_name: formSession,
          supervisor1_name: s1 || null,
          supervisor2_name: s2 || null,
          supervisor3_name: formSupervisor3.trim() || null,
          proctor_name: null,
          notes: null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowRoomModal(false);
        fetchData();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menyimpan jadwal pengawas.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setSavingRoom(false);
    }
  };

  // 4. Hapus Pengawas Ruang
  const handleDeleteRoomAssignment = (id: number, room: string, date: string, sess: string) => {
    Swal.fire({
      title: "Hapus Penugasan Ruang?",
      text: `Hapus jadwal pengawas untuk ${room} pada ${date} (${sess})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(
            `/api/cbt-backend/api/cbt/schedule/supervisors/${id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            fetchData();
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: data.message,
              showConfirmButton: false,
              timer: 2500,
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // 5. Handler Buka Modal Tambah / Edit Pengawas Cadangan
  const handleOpenAddBackup = () => {
    setEditingBackupId(null);
    setFormBackupDate(availableDates[0] || new Date().toISOString().split("T")[0]);
    setFormBackupSession(sessions[0]?.session_name || "Sesi 1");
    setFormBackupTeacher("");
    setFormBackupOrder(1);
    setFormBackupNotes("Standby Sekretariat Panitia");
    setShowBackupModal(true);
  };

  const handleOpenEditBackup = (item: any) => {
    setEditingBackupId(item.id);
    setFormBackupDate(item.exam_date);
    setFormBackupSession(item.session_name);
    setFormBackupTeacher(item.teacher_name);
    setFormBackupOrder(item.order_num || 1);
    setFormBackupNotes(item.notes || "Standby Sekretariat Panitia");
    setShowBackupModal(true);
  };

  // 6. Simpan Pengawas Cadangan
  const handleSaveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBackupDate || !formBackupSession || !formBackupTeacher) {
      Swal.fire("Lengkapi Form", "Tanggal, Sesi, dan Nama Guru Cadangan wajib diisi.", "warning");
      return;
    }

    const bTeacher = formBackupTeacher.trim();
    const clash = checkTeacherConflict(bTeacher, formBackupDate, formBackupSession, null, editingBackupId);
    if (clash) {
      Swal.fire({
        title: "Jadwal Bentrok!",
        text: `Guru '${bTeacher}' ${clash.message} pada tanggal ${formBackupDate} (${formBackupSession}). Tidak dapat ditugaskan sebagai pengawas cadangan pada sesi yang sama.`,
        icon: "warning",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    try {
      setSavingBackup(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/supervisors/backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingBackupId,
          exam_date: formBackupDate,
          session_name: formBackupSession,
          teacher_name: bTeacher,
          order_num: Number(formBackupOrder) || 1,
          notes: formBackupNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowBackupModal(false);
        fetchData();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menyimpan pengawas cadangan.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setSavingBackup(false);
    }
  };

  // 7. Hapus Pengawas Cadangan
  const handleDeleteBackup = (id: number, teacherName: string) => {
    Swal.fire({
      title: "Hapus Pengawas Cadangan?",
      text: `Hapus ${teacherName} dari daftar pengawas cadangan?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(
            `/api/cbt-backend/api/cbt/schedule/supervisors/backups/${id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            fetchData();
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: data.message,
              showConfirmButton: false,
              timer: 2500,
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // 8. Kosongkan Seluruh Jadwal Pengawas
  const handleClearAll = () => {
    Swal.fire({
      title: "Kosongkan Seluruh Jadwal Pengawas?",
      text: "Seluruh jadwal pengawas ruangan dan pengawas cadangan akan dihapus. Anda dapat membuat ulang secara manual atau menggunakan penugasan otomatis.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Kosongkan Semua",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(
            "/api/cbt-backend/api/cbt/schedule/supervisors/clear-all",
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            fetchData();
            Swal.fire({
              icon: "success",
              title: "Berhasil Dikosongkan",
              text: data.message,
              timer: 2500,
              showConfirmButton: false,
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // 9. Eksekusi Penugasan Otomatis (Auto-Assign)
  const handleExecuteAutoAssign = async () => {
    if (autoDates.length === 0) {
      Swal.fire("Pilih Tanggal", "Pilih minimal satu tanggal pelaksanaan ujian.", "warning");
      return;
    }

    try {
      setAutoProcessing(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/supervisors/auto-assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exam_dates: autoDates,
          supervisors_per_room: Number(autoSupPerRoom) || 2,
          backup_count_per_session: Number(autoBackupPerSession) || 1,
          assign_proctors: false,
          replace_existing: autoReplaceExisting,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAutoModal(false);
        fetchData();
        Swal.fire({
          icon: "success",
          title: "Jadwal Pengawas Otomatis Berhasil Dibuat!",
          text: data.message,
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Selesai",
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal membuat jadwal otomatis.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setAutoProcessing(false);
    }
  };

  // 10. Handler Cetak
  const handlePrint = () => {
    window.print();
  };

  // Filter Data Penugasan Ruangan
  const filteredAssignments = assignments.filter((a) => {
    if (filterDate !== "all" && a.exam_date !== filterDate) return false;
    if (filterRoom !== "all" && a.room_name !== filterRoom) return false;
    if (filterSession !== "all" && a.session_name !== filterSession) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.room_name?.toLowerCase().includes(q) ||
      a.supervisor1_name?.toLowerCase().includes(q) ||
      a.supervisor2_name?.toLowerCase().includes(q) ||
      a.supervisor3_name?.toLowerCase().includes(q) ||
      a.exam_date?.includes(q)
    );
  });

  // Filter Data Pengawas Cadangan
  const filteredBackups = backups.filter((b) => {
    if (filterDate !== "all" && b.exam_date !== filterDate) return false;
    if (filterSession !== "all" && b.session_name !== filterSession) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.teacher_name?.toLowerCase().includes(q) ||
      b.exam_date?.includes(q) ||
      b.session_name?.toLowerCase().includes(q)
    );
  });

  // Data Cetak
  const printableAssignments = assignments.filter((a) => {
    if (printDateFilter !== "all" && a.exam_date !== printDateFilter) return false;
    return true;
  });

  const printableBackups = backups.filter((b) => {
    if (printDateFilter !== "all" && b.exam_date !== printDateFilter) return false;
    return true;
  });

  // 1. Bangun pemetaan kode angka unik untuk setiap guru pengawas
  const activeSupervisorsList = (
    selectedSupervisors.length > 0
      ? teachers.filter((t) => selectedSupervisorNames.has(t.name))
      : teachers.filter((t) => (dutyCounts[t.name] || 0) > 0)
  ).sort((a, b) => a.name.localeCompare(b.name, "id"));

  const teacherCodeMap = new Map<string, number>();
  activeSupervisorsList.forEach((t, idx) => {
    teacherCodeMap.set(t.name, idx + 1);
  });

  // Pastikan guru yang ada di assignment atau backup tapi belum punya kode tetap terpetakan
  assignments.forEach((a) => {
    [a.supervisor1_name, a.supervisor2_name, a.supervisor3_name].forEach((name) => {
      if (name && !teacherCodeMap.has(name)) {
        teacherCodeMap.set(name, teacherCodeMap.size + 1);
      }
    });
  });
  backups.forEach((b) => {
    if (b.teacher_name && !teacherCodeMap.has(b.teacher_name)) {
      teacherCodeMap.set(b.teacher_name, teacherCodeMap.size + 1);
    }
  });

  // Daftar guru dengan kode angka untuk tabel legenda / daftar kode
  const supervisorCodeList = Array.from(teacherCodeMap.entries())
    .map(([name, code]) => {
      const tch = teachers.find((t) => t.name === name);
      return {
        code,
        name,
        nip: tch?.nip || teacherNipMap[name] || "-",
      };
    })
    .sort((a, b) => a.code - b.code);

  // 2. Daftar kolom ruangan mendatar
  const matrixRooms: string[] = [];
  rooms.forEach((r) => {
    if (r.name && !matrixRooms.includes(r.name)) matrixRooms.push(r.name);
  });
  printableAssignments.forEach((a) => {
    if (a.room_name && !matrixRooms.includes(a.room_name)) matrixRooms.push(a.room_name);
  });

  // 3. Slot jadwal (baris matriks)
  const slotKeyMap = new Map<string, { date: string; session: string }>();
  printableAssignments.forEach((a) => {
    const key = `${a.exam_date}__${a.session_name}`;
    if (!slotKeyMap.has(key)) {
      slotKeyMap.set(key, { date: a.exam_date, session: a.session_name });
    }
  });
  if (printIncludeBackups) {
    printableBackups.forEach((b) => {
      const key = `${b.exam_date}__${b.session_name}`;
      if (!slotKeyMap.has(key)) {
        slotKeyMap.set(key, { date: b.exam_date, session: b.session_name });
      }
    });
  }

  const printableSlots = Array.from(slotKeyMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.session.localeCompare(b.session);
  });

  // 4. Daftar tanggal unik untuk baris matriks (1 baris per tanggal, cegah tanggal ganda)
  const printableDates = Array.from(new Set(printableSlots.map((s) => s.date))).sort();

  // 5. Daftar sesi aktif pada penugasan cetak
  const rawSessionList = Array.from(
    new Set([
      ...sessions.map((s) => s.session_name),
      ...printableSlots.map((s) => s.session),
    ])
  ).sort();
  const activeSessionNames = rawSessionList.length > 0 ? rawSessionList : ["Sesi 1", "Sesi 2"];

  // 6. Posisi Pengawas per Ruangan (P1, P2, dan P3 jika ada penugasan P3)
  const supPositions = assignments.some(
    (a) => a.supervisor3_name && a.supervisor3_name.trim() && a.supervisor3_name !== "-"
  )
    ? ["P1", "P2", "P3"]
    : ["P1", "P2"];

  // Helper untuk mendapatkan kode pengawas spesifik per posisi (P1, P2, P3)
  const getRoomSupervisorCodeByPosition = (
    date: string,
    session: string,
    room: string,
    pos: string
  ) => {
    const match = assignments.find(
      (a) => a.exam_date === date && a.session_name === session && a.room_name === room
    );
    if (!match) return "-";
    let teacherName: string | null | undefined = null;
    if (pos === "P1") teacherName = match.supervisor1_name;
    else if (pos === "P2") teacherName = match.supervisor2_name;
    else if (pos === "P3") teacherName = match.supervisor3_name;

    if (!teacherName || !teacherName.trim() || teacherName === "-") return "-";
    return teacherCodeMap.has(teacherName) ? teacherCodeMap.get(teacherName) : "-";
  };

  // Helper untuk mendapatkan kode pengawas cadangan spesifik per posisi urutan
  const getBackupSupervisorCodeByPosition = (
    date: string,
    session: string,
    pos: string
  ) => {
    const orderIndex = pos === "P1" ? 1 : pos === "P2" ? 2 : 3;
    const matches = backups
      .filter((b) => b.exam_date === date && b.session_name === session)
      .sort((a, b) => (a.order_num || 1) - (b.order_num || 1));

    const target =
      matches.find((b) => b.order_num === orderIndex) || matches[orderIndex - 1];

    if (!target || !target.teacher_name || !target.teacher_name.trim()) return "-";
    return teacherCodeMap.has(target.teacher_name)
      ? teacherCodeMap.get(target.teacher_name)
      : "-";
  };

  // Helper untuk mendapatkan daftar sesi aktif pada tanggal tertentu
  const getSessionsForDate = (date: string) => {
    const sessionsFound = Array.from(
      new Set([
        ...assignments.filter((a) => a.exam_date === date).map((a) => a.session_name),
        ...(printIncludeBackups
          ? backups.filter((b) => b.exam_date === date).map((b) => b.session_name)
          : []),
      ])
    ).filter(Boolean);

    if (sessionsFound.length > 0) {
      return sessionsFound.sort((a, b) => {
        const idxA = sessions.findIndex((s) => s.session_name === a);
        const idxB = sessions.findIndex((s) => s.session_name === b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b);
      });
    }
    return activeSessionNames;
  };

  // Helper format label sesi dan jam sesuai contoh gambar (cth: Sesi 1 (7.30 - 09.00))
  const formatSessionLabel = (sessionName: string) => {
    const s = sessions.find((item) => item.session_name === sessionName);
    if (!s || !s.start_time || !s.end_time) return sessionName;
    const start = s.start_time.replace(/^0/, "").replace(":", ".");
    const end = s.end_time.replace(":", ".");
    return `${sessionName} (${start} - ${end})`;
  };

  // Format tanggal tanpa nama hari (karena nama hari diletakkan di baris atasnya)
  const formatDateOnlyIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper untuk mendapatkan kode pengawas di ruangan tertentu pada tanggal & sesi tertentu
  const getRoomSupervisorCodes = (date: string, session: string, room: string) => {
    const match = assignments.find(
      (a) => a.exam_date === date && a.session_name === session && a.room_name === room
    );
    if (!match) return "-";
    const codes: number[] = [];
    if (match.supervisor1_name && teacherCodeMap.has(match.supervisor1_name)) {
      codes.push(teacherCodeMap.get(match.supervisor1_name)!);
    }
    if (match.supervisor2_name && teacherCodeMap.has(match.supervisor2_name)) {
      codes.push(teacherCodeMap.get(match.supervisor2_name)!);
    }
    if (match.supervisor3_name && teacherCodeMap.has(match.supervisor3_name)) {
      codes.push(teacherCodeMap.get(match.supervisor3_name)!);
    }
    return codes.length > 0 ? codes.join(", ") : "-";
  };

  // Helper untuk mendapatkan kode pengawas cadangan pada tanggal & sesi tertentu
  const getBackupSupervisorCodes = (date: string, session: string) => {
    const matches = backups.filter(
      (b) => b.exam_date === date && b.session_name === session
    );
    if (!matches || matches.length === 0) return "-";
    const codes: number[] = [];
    matches.forEach((b) => {
      if (b.teacher_name && teacherCodeMap.has(b.teacher_name)) {
        codes.push(teacherCodeMap.get(b.teacher_name)!);
      }
    });
    return codes.length > 0 ? codes.join(", ") : "-";
  };

  // Helper untuk mengambil jam sesi
  const getSessionTime = (sessionName: string) => {
    const s = sessions.find((item) => item.session_name === sessionName);
    return s ? `${s.start_time} - ${s.end_time}` : "";
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TAMPILAN STANDAR APLIKASI (DISEMBUNYIKAN SAAT CETAK / MEDIA PRINT)     */}
      {/* ========================================================================= */}
      <div className="print:hidden flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
        {/* HEADER HALAMAN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
              title="Kembali ke Menu Ujian"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Jadwal Pengawas
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {assignments.length} Penugasan Ruang &bull; {backups.length} Cadangan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur penugasan pengawas ruang dan cadangan di tiap ruangan &amp; sesi, atau jadwalkan otomatis secara merata
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
            {/* Tombol Buat Jadwal Otomatis */}
            <button
              type="button"
              onClick={() => setShowAutoModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Buat Jadwal Pengawas Otomatis dengan Algoritma Rotasi Bergilir"
            >
              <FontAwesomeIcon icon={faBolt} className="text-xs" />
              <span>Buat Jadwal Otomatis</span>
            </button>

            {/* Tombol Cetak Jadwal Pengawas */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Cetak Jadwal Pengawas Resmi"
            >
              <FontAwesomeIcon icon={faPrint} className="text-xs" />
              <span>Cetak Jadwal</span>
            </button>

            {/* Tombol Arsip Jadwal */}
            <button
              type="button"
              onClick={handleOpenArchives}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              title="Buka Arsip Jadwal Pengawas dari Ujian yang Lalu"
            >
              <FontAwesomeIcon icon={faBoxArchive} className="text-xs text-amber-600" />
              <span>Arsip Jadwal</span>
            </button>

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={fetchData}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Perbarui Data"
            >
              <FontAwesomeIcon
                icon={faRotate}
                className={`text-xs ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* BANNER MODE PREVIEW ARSIP */}
        {loadedArchiveExam && (
          <div className="bg-indigo-50 border border-indigo-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0 text-lg">
                <FontAwesomeIcon icon={faBoxArchive} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Mode Pratinjau Arsip
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {loadedArchiveExam.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Saat ini Anda sedang melihat jadwal riwayat dari arsip ujian. Anda dapat melihat matriks ruangan atau mengklik tombol <b>"Cetak Jadwal"</b> untuk mencetak dokumen jadwal ini.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReturnToActiveSchedule}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            >
              <FontAwesomeIcon icon={faRotate} className="text-xs" />
              <span>Kembali ke Jadwal Aktif</span>
            </button>
          </div>
        )}

        {/* BANNER STATUS SIAGA KETIKA TER-RESET */}
        {isExamCompleted && assignments.length === 0 && !loadedArchiveExam && (
          <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 text-lg mt-0.5 sm:mt-0">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Status Siaga (Standby)
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Jadwal Pengawas Ter-Reset Bersih
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Pelaksanaan paket ujian sebelumnya telah diselesaikan. Seluruh riwayat penugasan pengawas telah diarsipkan secara aman dan tabel operasional aktif telah di-reset bersih untuk persiapan paket ujian berikutnya.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenArchives}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-blue-600" />
              <span>Lihat Arsip Jadwal Lalu</span>
            </button>
          </div>
        )}

        {/* RINGKASAN STATISTIK CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={faDoorOpen} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Penugasan Ruang
              </div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {assignments.length} <span className="text-xs font-semibold text-slate-500">Jadwal</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={faUserShield} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pengawas Cadangan
              </div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {backups.length} <span className="text-xs font-semibold text-slate-500">Sesi</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pengawas Bertugas
              </div>
              <div className="text-xl font-black text-emerald-900 leading-tight">
                {Object.keys(dutyCounts).length}{" "}
                <span className="text-xs font-semibold text-emerald-700">
                  {selectedSupervisors.length > 0
                    ? `dari ${selectedSupervisors.length} Terpilih`
                    : "Guru"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-base">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Hari Pelaksanaan
              </div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {availableDates.length} <span className="text-xs font-semibold text-slate-500">Tanggal</span>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGASI TAB & TOOLBAR FILTER */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Tab Navigasi */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("ruang")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "ruang"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FontAwesomeIcon icon={faDoorOpen} className="text-xs" />
                <span>Pengawas Ruangan ({assignments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cadangan")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "cadangan"
                    ? "bg-white text-amber-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FontAwesomeIcon icon={faUserShield} className="text-xs" />
                <span>Pengawas Cadangan ({backups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rekap")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "rekap"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FontAwesomeIcon icon={faScaleBalanced} className="text-xs" />
                <span>Rekap Beban Guru</span>
              </button>
            </div>

            {/* Aksi Tambah Manual & Kosongkan */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === "ruang" && (
                <button
                  type="button"
                  onClick={handleOpenAddRoom}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Tambah Pengawas Ruang</span>
                </button>
              )}

              {activeTab === "cadangan" && (
                <button
                  type="button"
                  onClick={handleOpenAddBackup}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Tambah Cadangan</span>
                </button>
              )}

              <button
                type="button"
                disabled={assignments.length === 0 && backups.length === 0}
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                title="Kosongkan seluruh jadwal pengawas"
              >
                Kosongkan Jadwal
              </button>
            </div>
          </div>

          {/* Baris Filter: Tanggal, Ruangan, Sesi, Cari */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Filter Tanggal */}
            <div className="sm:col-span-3">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">Semua Tanggal Pelaksanaan</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateIndo(d)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Ruangan (Hanya relevan di tab ruang) */}
            {activeTab === "ruang" && (
              <div className="sm:col-span-3">
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="all">Semua Ruangan</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Sesi */}
            <div className={activeTab === "ruang" ? "sm:col-span-2" : "sm:col-span-3"}>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">Semua Sesi</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.session_name}>
                    {s.session_name} ({s.start_time}-{s.end_time})
                  </option>
                ))}
              </select>
            </div>

            {/* Input Pencarian */}
            <div className={activeTab === "ruang" ? "sm:col-span-4" : "sm:col-span-6"}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari guru pengawas, ruangan, atau sesi..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: TABEL PENGAWAS RUANGAN */}
        {activeTab === "ruang" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <FontAwesomeIcon icon={faRotate} className="animate-spin text-base mb-2 text-blue-500 block mx-auto" />
                Memuat data jadwal pengawas ruangan...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faChalkboardUser} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {searchQuery || filterDate !== "all" || filterRoom !== "all" || filterSession !== "all"
                    ? "Tidak ada jadwal pengawas yang cocok dengan filter"
                    : "Belum Ada Jadwal Pengawas Ruang"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Gunakan tombol <b>"Buat Jadwal Otomatis"</b> untuk membagi pengawas ke seluruh ruangan secara merata, atau tambahkan secara manual.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAutoModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faBolt} className="text-xs" />
                    <span>Jadwalkan Otomatis</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddRoom}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span>Tambah Manual</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">NO</th>
                      <th className="py-3 px-3">TANGGAL &amp; HARI</th>
                      <th className="py-3 px-3">RUANGAN</th>
                      <th className="py-3 px-3">SESI &amp; WAKTU</th>
                      <th className="py-3 px-4">PENGAWAS 1</th>
                      <th className="py-3 px-4">PENGAWAS 2</th>
                      <th className="py-3 px-3 text-center w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAssignments.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{item.exam_date}</div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {getDayName(item.exam_date)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            {item.room_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {item.session_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.supervisor1_name || "-"}
                          </div>
                          {item.supervisor1_name && teacherNipMap[item.supervisor1_name] && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {teacherNipMap[item.supervisor1_name]}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.supervisor2_name || (
                              <span className="text-slate-400 font-normal italic">Tidak Ada</span>
                            )}
                          </div>
                          {item.supervisor2_name && teacherNipMap[item.supervisor2_name] && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {teacherNipMap[item.supervisor2_name]}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRoom(item)}
                              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition cursor-pointer"
                              title="Edit Penugasan Ruang"
                            >
                              <FontAwesomeIcon icon={faPen} className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteRoomAssignment(
                                  item.id,
                                  item.room_name,
                                  item.exam_date,
                                  item.session_name
                                )
                              }
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                              title="Hapus Penugasan Ruang"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TABEL PENGAWAS CADANGAN */}
        {activeTab === "cadangan" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <FontAwesomeIcon icon={faRotate} className="animate-spin text-base mb-2 text-amber-500 block mx-auto" />
                Memuat data pengawas cadangan...
              </div>
            ) : filteredBackups.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faUserShield} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Belum Ada Pengawas Cadangan
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Pengawas cadangan bertugas standby di sekretariat panitia untuk menggantikan pengawas ruangan yang berhalangan hadir.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddBackup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Tambah Pengawas Cadangan</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">NO</th>
                      <th className="py-3 px-4">TANGGAL PELAKSANAAN</th>
                      <th className="py-3 px-4">SESI UJIAN</th>
                      <th className="py-3 px-4">NAMA GURU CADANGAN</th>
                      <th className="py-3 px-4 text-center">POSISI / URUTAN</th>
                      <th className="py-3 px-4">KETERANGAN / STANDBY</th>
                      <th className="py-3 px-3 text-center w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredBackups.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div>{item.exam_date}</div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {getDayName(item.exam_date)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {item.session_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.teacher_name}</div>
                          {teacherNipMap[item.teacher_name] && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP: {teacherNipMap[item.teacher_name]}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                            Cadangan {item.order_num || 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.notes || "Standby Sekretariat Panitia"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBackup(item)}
                              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition cursor-pointer"
                              title="Edit Cadangan"
                            >
                              <FontAwesomeIcon icon={faPen} className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(item.id, item.teacher_name)}
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                              title="Hapus Cadangan"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REKAP BEBAN MENGAWAS PER GURU */}
        {activeTab === "rekap" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Rekapitulasi Beban Penugasan Mengawas
                </h3>
                <p className="text-xs text-slate-500">
                  Distribusi beban tugas pengawas ruang dan cadangan agar pembagian merata dan berimbang
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAllTeachers(false)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    !showAllTeachers
                      ? "bg-white text-emerald-800 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pengawas Terpilih ({selectedSupervisors.length || 8})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllTeachers(true)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    showAllTeachers
                      ? "bg-white text-slate-900 font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Semua Guru SIAK ({teachers.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">NO</th>
                    <th className="py-3 px-4">NAMA GURU</th>
                    <th className="py-3 px-4">NIP</th>
                    <th className="py-3 px-4 text-center">PENGAWAS RUANG</th>
                    <th className="py-3 px-4 text-center">CADANGAN</th>
                    <th className="py-3 px-4 text-center">TOTAL BEBAN</th>
                    <th className="py-3 px-4 text-center">STATUS PENGAWAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(showAllTeachers
                    ? teachers
                    : selectedSupervisors.length > 0
                    ? teachers.filter((t) => selectedSupervisorNames.has(t.name))
                    : teachers
                  )
                    .sort((a, b) => (dutyCounts[b.name] || 0) - (dutyCounts[a.name] || 0))
                    .map((tch, idx) => {
                      const roomDuty = assignments.filter(
                        (a) =>
                          a.supervisor1_name === tch.name ||
                          a.supervisor2_name === tch.name ||
                          a.supervisor3_name === tch.name
                      ).length;
                      const backupDuty = backups.filter(
                        (b) => b.teacher_name === tch.name
                      ).length;
                      const totalDuty = roomDuty + backupDuty;
                      const isDesignated = selectedSupervisors.some(
                        (s) => s.teacher_name === tch.name
                      );

                      return (
                        <tr
                          key={tch.id}
                          className={`hover:bg-slate-50/70 transition ${
                            totalDuty > 0 ? "bg-white" : "opacity-60"
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {tch.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {tch.nip || "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {roomDuty > 0 ? (
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                                {roomDuty} Sesi
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {backupDuty > 0 ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                                {backupDuty} Sesi
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black inline-block ${
                                totalDuty > 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {totalDuty} Sesi
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isDesignated ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Pengawas Terpilih
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Guru Biasa</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 1: TAMBAH / EDIT PENGAWAS RUANG MANUAL                          */}
        {/* ===================================================================== */}
        {showRoomModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faDoorOpen} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {editingAssignmentId ? "Edit Penugasan Ruang" : "Tambah Penugasan Pengawas Ruang"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tentukan pengawas 1 dan pengawas 2 pada ruangan &amp; sesi yang dipilih
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              <form onSubmit={handleSaveRoomAssignment} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tanggal Ujian:
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Sesi Ujian:
                    </label>
                    <select
                      value={formSession}
                      onChange={(e) => setFormSession(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.session_name}>
                          {s.session_name} ({s.start_time} - {s.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Ruang Ujian / Lab:
                  </label>
                  <select
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} (Kapasitas: {r.capacity} Kursi)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indikator Real-Time Bentrok Jadwal Pengawas Ruang */}
                {formSupervisor1 && formSupervisor2 && formSupervisor1.trim() === formSupervisor2.trim() && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-600 text-sm shrink-0" />
                    <span><b>Peringatan Bentrok:</b> Pengawas 1 dan Pengawas 2 tidak boleh orang yang sama di ruangan yang sama.</span>
                  </div>
                )}
                {formSupervisor1 && checkTeacherConflict(formSupervisor1, formDate, formSession, editingAssignmentId) && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-sm shrink-0" />
                    <span><b>Jadwal Bentrok (Pengawas 1):</b> {formSupervisor1} {checkTeacherConflict(formSupervisor1, formDate, formSession, editingAssignmentId)?.message} pada sesi ini.</span>
                  </div>
                )}
                {formSupervisor2 && checkTeacherConflict(formSupervisor2, formDate, formSession, editingAssignmentId) && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-sm shrink-0" />
                    <span><b>Jadwal Bentrok (Pengawas 2):</b> {formSupervisor2} {checkTeacherConflict(formSupervisor2, formDate, formSession, editingAssignmentId)?.message} pada sesi ini.</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pengawas 1 (Utama):
                    </label>
                    <select
                      value={formSupervisor1}
                      onChange={(e) => setFormSupervisor1(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                    >
                      <option value="">-- Pilih Pengawas 1 --</option>
                      {supervisorPool.map((t) => {
                        const clash = checkTeacherConflict(t.name, formDate, formSession, editingAssignmentId);
                        return (
                          <option key={t.id} value={t.name}>
                            {t.name} (Beban: {dutyCounts[t.name] || 0} Sesi){clash ? ` [⚠️ ${clash.location}]` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pengawas 2 (Pendamping):
                    </label>
                    <select
                      value={formSupervisor2}
                      onChange={(e) => setFormSupervisor2(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
                    >
                      <option value="">-- Tidak Ada / Kosongkan --</option>
                      {supervisorPool.map((t) => {
                        const clash = checkTeacherConflict(t.name, formDate, formSession, editingAssignmentId);
                        return (
                          <option key={t.id} value={t.name}>
                            {t.name} (Beban: {dutyCounts[t.name] || 0} Sesi){clash ? ` [⚠️ ${clash.location}]` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRoomModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoom}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{savingRoom ? "Menyimpan..." : "Simpan Penugasan"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 2: TAMBAH / EDIT PENGAWAS CADANGAN MANUAL                       */}
        {/* ===================================================================== */}
        {showBackupModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faUserShield} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {editingBackupId ? "Edit Pengawas Cadangan" : "Tambah Pengawas Cadangan"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tentukan pengawas standby sekretariat panitia pada sesi tertentu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              <form onSubmit={handleSaveBackup} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Tanggal Pelaksanaan:
                  </label>
                  <input
                    type="date"
                    value={formBackupDate}
                    onChange={(e) => setFormBackupDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Sesi Ujian:
                  </label>
                  <select
                    value={formBackupSession}
                    onChange={(e) => setFormBackupSession(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.session_name}>
                        {s.session_name} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Indikator Real-Time Bentrok Pengawas Cadangan */}
                {formBackupTeacher && checkTeacherConflict(formBackupTeacher, formBackupDate, formBackupSession, null, editingBackupId) && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-sm shrink-0" />
                    <span><b>Jadwal Bentrok:</b> Guru '{formBackupTeacher}' {checkTeacherConflict(formBackupTeacher, formBackupDate, formBackupSession, null, editingBackupId)?.message} pada sesi ini.</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nama Guru Cadangan:
                  </label>
                  <select
                    value={formBackupTeacher}
                    onChange={(e) => setFormBackupTeacher(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Guru Cadangan --</option>
                    {supervisorPool.map((t) => {
                      const clash = checkTeacherConflict(t.name, formBackupDate, formBackupSession, null, editingBackupId);
                      return (
                        <option key={t.id} value={t.name}>
                          {t.name} (Beban: {dutyCounts[t.name] || 0} Sesi){clash ? ` [⚠️ ${clash.location}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Urutan Cadangan:
                    </label>
                    <select
                      value={formBackupOrder}
                      onChange={(e) => setFormBackupOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value={1}>Cadangan 1</option>
                      <option value={2}>Cadangan 2</option>
                      <option value={3}>Cadangan 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Keterangan / Posisi:
                    </label>
                    <input
                      type="text"
                      value={formBackupNotes}
                      onChange={(e) => setFormBackupNotes(e.target.value)}
                      placeholder="Standby Sekretariat"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBackupModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingBackup}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{savingBackup ? "Menyimpan..." : "Simpan Cadangan"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 3: PENUGASAN OTOMATIS (AUTO-ASSIGNMENT)                         */}
        {/* ===================================================================== */}
        {showAutoModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-base font-bold">
                    <FontAwesomeIcon icon={faBolt} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Penugasan Pengawas Otomatis
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sistem akan membagi guru ke seluruh ruangan dan sesi secara berimbang dan bergilir
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-amber-700" />
                  <span>Pool Pengawas Ujian Terpilih:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sistem memprioritaskan <b>{selectedSupervisors.length} guru</b> yang telah ditetapkan pada menu <b>Pengawas Ujian</b>. Jika belum mencukupi, guru aktif lain dari SIAK akan diikutsertakan otomatis.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Pilihan Tanggal */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Pilih Tanggal Pelaksanaan Ujian:
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {availableDates.length === 0 ? (
                      <div className="text-slate-400 text-center py-2 text-[11px]">
                        Tidak ada tanggal ujian terdaftar. Gunakan tanggal hari ini:
                      </div>
                    ) : (
                      availableDates.map((d) => {
                        const isChecked = autoDates.includes(d);
                        return (
                          <label
                            key={d}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAutoDates((prev) => [...prev, d]);
                                } else {
                                  setAutoDates((prev) => prev.filter((item) => item !== d));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-800 text-xs">
                              {formatDateIndo(d)} ({d})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Konfigurasi Parameter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pengawas per Ruangan:
                    </label>
                    <select
                      value={autoSupPerRoom}
                      onChange={(e) => setAutoSupPerRoom(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value={1}>1 Pengawas per Ruang</option>
                      <option value={2}>2 Pengawas per Ruang (Standar)</option>
                      <option value={3}>3 Pengawas per Ruang</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pengawas Cadangan per Sesi:
                    </label>
                    <select
                      value={autoBackupPerSession}
                      onChange={(e) => setAutoBackupPerSession(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value={0}>Tidak Ada Cadangan</option>
                      <option value={1}>1 Pengawas Cadangan per Sesi</option>
                      <option value={2}>2 Pengawas Cadangan per Sesi</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoReplaceExisting}
                      onChange={(e) => setAutoReplaceExisting(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Ganti / Bersihkan jadwal lama pada tanggal-tanggal terpilih
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={autoProcessing || autoDates.length === 0}
                  onClick={handleExecuteAutoAssign}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faBolt} className="text-xs" />
                  <span>{autoProcessing ? "Memproses Plotting..." : "Jadwalkan Sekarang"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 4: OPSI CETAK JADWAL PENGAWAS RESMI (FORMAT MATRIKS)            */}
        {/* ===================================================================== */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faPrint} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Cetak Jadwal Pengawas (Format Matriks Ruangan)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Kolom vertikal adalah jadwal, kolom horizontal adalah ruangan, dan nama pengawas berupa kode angka
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              {/* Pengaturan Filter Cetak */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="sm:col-span-6 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Pilih Tanggal yang Dicetak:
                  </label>
                  <select
                    value={printDateFilter}
                    onChange={(e) => setPrintDateFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Tanggal Pelaksanaan ({availableDates.length} Hari)</option>
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        {getDayName(d)}, {formatDateIndo(d)} ({d})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pengaturan Orientasi Kertas Cetak */}
                <div className="sm:col-span-6 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Orientasi Kertas Cetak:
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPrintOrientation("auto")}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                        printOrientation === "auto"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Mode fleksibel: Anda bebas memilih Potret atau Lanskap langsung pada menu dialog cetak printer browser"
                    >
                      Fleksibel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintOrientation("landscape")}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                        printOrientation === "landscape"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Format lanskap mendatar (ideal untuk matriks dengan banyak kolom ruangan)"
                    >
                      Lanskap
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintOrientation("portrait")}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                        printOrientation === "portrait"
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Format potret tegak standar A4"
                    >
                      Potret
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {printOrientation === "auto"
                      ? "✓ Mode Fleksibel: Pilihan tata letak Potret / Lanskap terbuka bebas diatur di dialog cetak browser."
                      : printOrientation === "landscape"
                      ? "✓ Mode Lanskap: Format mendatar lebar otomatis diterapkan saat mencetak."
                      : "✓ Mode Potret: Format tegak standar diterapkan saat mencetak."}
                  </p>
                </div>

                <div className="sm:col-span-12 flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-200/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeBackups}
                      onChange={(e) => setPrintIncludeBackups(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-700 font-semibold text-xs">Sertakan Kolom Pengawas Cadangan di Matriks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printIncludeSignatures}
                      onChange={(e) => setPrintIncludeSignatures(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-slate-700 font-semibold text-xs">Cantumkan Lembar Pengesahan &amp; Tanda Tangan</span>
                  </label>
                  {schoolProfile?.letterhead && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useImageLetterhead}
                        onChange={(e) => setUseImageLetterhead(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-slate-700 font-semibold text-xs">Gunakan Banner KOP Gambar Resmi SIAK</span>
                    </label>
                  )}
                </div>

                <div className="sm:col-span-12">

                  {/* Pengaturan Tambahan Nama & NIP Pengesahan */}
                  {printIncludeSignatures && (
                    <div className="mt-1 pt-1.5 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowSignatureSettings(!showSignatureSettings)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                        <span>{showSignatureSettings ? "Tutup Pengaturan Nama / NIP" : "Sesuaikan Nama & NIP Pejabat Pengesahan"}</span>
                      </button>

                      {showSignatureSettings && (
                        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 text-[11px] shadow-2xs animate-in fade-in duration-150">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-500 font-medium block">Kota:</span>
                              <input
                                type="text"
                                value={printCity}
                                onChange={(e) => setPrintCity(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold mt-0.5"
                                placeholder="Kota (cth: Denpasar)"
                              />
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block">Tanggal Pengesahan:</span>
                              <input
                                type="text"
                                value={printDateSign}
                                onChange={(e) => setPrintDateSign(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold mt-0.5"
                                placeholder="Tanggal Pengesahan"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-500 font-medium block">Kepala Sekolah:</span>
                              <input
                                type="text"
                                value={printPrincipalName}
                                onChange={(e) => setPrintPrincipalName(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold mt-0.5"
                                placeholder="Nama Kepala Sekolah"
                              />
                              <input
                                type="text"
                                value={printPrincipalNip}
                                onChange={(e) => setPrintPrincipalNip(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono mt-1"
                                placeholder="NIP Kepala Sekolah"
                              />
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium block">Ketua Panitia Ujian:</span>
                              <input
                                type="text"
                                value={printCommitteeName}
                                onChange={(e) => setPrintCommitteeName(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold mt-0.5"
                                placeholder="Nama Ketua Panitia"
                              />
                              <input
                                type="text"
                                value={printCommitteeNip}
                                onChange={(e) => setPrintCommitteeNip(e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono mt-1"
                                placeholder="NIP Ketua Panitia"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pratinjau Langsung Matriks Cetak (Live Preview) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wide">
                    Pratinjau Lembar Cetak (Sesuai Kertas A4):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-semibold text-[11px]">
                      {matrixRooms.length} Ruangan &bull; {supervisorCodeList.length} Guru
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        printOrientation === "landscape"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : printOrientation === "portrait"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {printOrientation === "landscape"
                        ? "Orientasi: Lanskap"
                        : printOrientation === "portrait"
                        ? "Orientasi: Potret"
                        : "Orientasi: Fleksibel"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        printIncludeSignatures
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {printIncludeSignatures ? "✓ Pengesahan Aktif" : "Tanpa Pengesahan"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-xs text-black font-sans text-xs space-y-4 max-h-[50vh] overflow-y-auto">
                  {/* Kop Surat Pratinjau dari SIAK */}
                  {useImageLetterhead && schoolProfile?.letterhead ? (
                    <div className="w-full flex justify-center pb-2 mb-2 border-b-2 border-black">
                      <img
                        src={schoolProfile.letterhead}
                        alt="Kop Surat Resmi Sekolah"
                        className="w-full max-h-24 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 border-b-2 border-black pb-2 mb-2">
                      {schoolProfile?.logo && (
                        <img
                          src={schoolProfile.logo}
                          alt="Logo Sekolah"
                          className="w-12 h-12 object-contain shrink-0"
                        />
                      )}
                      <div className="text-center space-y-0.5 font-sans">
                        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                          {schoolProfile?.province ? `PEMERINTAH PROVINSI ${schoolProfile.province.toUpperCase()}` : "PEMERINTAH PROVINSI BALI"}
                        </div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                          DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA
                        </div>
                        <div className="text-xs font-black tracking-wider uppercase text-blue-900">
                          {schoolProfile?.school_name || "SMA NEGERI 4 SINGARAJA"}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {schoolProfile?.address || "Jl. Melati, Kelurahan Banjar Jawa"}, {schoolProfile?.regency || "Buleleng"} &bull; Telp: {schoolProfile?.phone || "(0362) 123456"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Judul Pratinjau */}
                  <div className="text-center space-y-0.5 border-b pb-3">
                    <div className="font-black text-sm uppercase tracking-wider">
                      MATRIKS JADWAL PENGAWAS RUANG UJIAN
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600">
                      {printDateFilter === "all"
                        ? `Seluruh Hari Pelaksanaan (${availableDates.length} Tanggal)`
                        : `Pelaksanaan: ${formatDateIndo(printDateFilter)}`}
                    </div>
                  </div>

                  {/* TABEL I: MATRIKS JADWAL */}
                  <div className="space-y-1.5 overflow-x-auto">
                    <div className="font-bold text-[11px] uppercase tracking-wide text-slate-800">
                      I. MATRIKS PENUGASAN RUANGAN (KODE PENGAWAS)
                    </div>
                    <table className="w-full border-collapse border border-black text-[11px]">
                      <thead>
                        {/* Header Tingkat 1: Hari/tanggal, Sesi, Ruang */}
                        <tr className="bg-slate-100 font-bold text-center">
                          <th
                            rowSpan={3}
                            className="border border-black p-2 text-center align-middle w-36"
                          >
                            Hari/tanggal
                          </th>
                          <th
                            rowSpan={3}
                            className="border border-black p-2 text-center align-middle w-44"
                          >
                            Sesi
                          </th>
                          <th
                            colSpan={
                              matrixRooms.length * supPositions.length +
                              (printIncludeBackups ? supPositions.length : 0)
                            }
                            className="border border-black p-1.5 text-center font-bold"
                          >
                            Ruang
                          </th>
                        </tr>
                        {/* Header Tingkat 2: Nama Ruangan (G1, G2, ...) & Cad */}
                        <tr className="bg-slate-100 font-bold text-center">
                          {matrixRooms.map((rm) => (
                            <th
                              key={rm}
                              colSpan={supPositions.length}
                              className="border border-black p-1 text-center font-bold uppercase tracking-wider"
                            >
                              {rm}
                            </th>
                          ))}
                          {printIncludeBackups && (
                            <th
                              colSpan={supPositions.length}
                              className="border border-black p-1 text-center font-bold uppercase tracking-wider bg-slate-50"
                            >
                              Cad
                            </th>
                          )}
                        </tr>
                        {/* Header Tingkat 3: Posisi Pengawas (P1, P2) */}
                        <tr className="bg-slate-50 font-bold text-center text-[10px]">
                          {matrixRooms.map((rm) =>
                            supPositions.map((pos) => (
                              <th
                                key={`${rm}_${pos}`}
                                className="border border-black p-1 text-center font-bold"
                              >
                                {pos}
                              </th>
                            ))
                          )}
                          {printIncludeBackups &&
                            supPositions.map((pos) => (
                              <th
                                key={`cad_${pos}`}
                                className="border border-black p-1 text-center font-bold bg-slate-100"
                              >
                                {pos}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {printableDates.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                2 +
                                matrixRooms.length * supPositions.length +
                                (printIncludeBackups ? supPositions.length : 0)
                              }
                              className="border border-black p-3 text-center italic text-slate-500"
                            >
                              Belum ada penugasan pengawas pada tanggal yang dipilih.
                            </td>
                          </tr>
                        ) : (
                          printableDates.map((date) => {
                            const dateSessions = getSessionsForDate(date);
                            return (
                              <Fragment key={date}>
                                {dateSessions.map((sess, sessIdx) => (
                                  <tr
                                    key={`${date}_${sess}`}
                                    className="text-center align-middle hover:bg-slate-50/50"
                                  >
                                    {sessIdx === 0 && (
                                      <td
                                        rowSpan={dateSessions.length}
                                        className="border border-black p-2 text-left align-middle font-medium"
                                      >
                                        <div className="font-bold text-[11px] text-slate-900 leading-tight">
                                          {getDayName(date)},
                                        </div>
                                        <div className="text-[10px] text-slate-600 leading-tight">
                                          {formatDateOnlyIndo(date)}
                                        </div>
                                      </td>
                                    )}
                                    <td className="border border-black p-2 text-left align-middle font-medium text-[11px] whitespace-nowrap">
                                      {formatSessionLabel(sess)}
                                    </td>
                                    {matrixRooms.map((rm) =>
                                      supPositions.map((pos) => {
                                        const val = getRoomSupervisorCodeByPosition(date, sess, rm, pos);
                                        return (
                                          <td
                                            key={`${rm}_${pos}`}
                                            className="border border-black p-2 text-center font-bold text-xs"
                                          >
                                            {val}
                                          </td>
                                        );
                                      })
                                    )}
                                    {printIncludeBackups &&
                                      supPositions.map((pos) => {
                                        const val = getBackupSupervisorCodeByPosition(date, sess, pos);
                                        return (
                                          <td
                                            key={`cad_${pos}`}
                                            className="border border-black p-2 text-center font-bold text-xs bg-slate-50"
                                          >
                                            {val}
                                          </td>
                                        );
                                      })}
                                  </tr>
                                ))}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* TABEL II: DAFTAR KODE PENGAWAS */}
                  <div className="space-y-1.5 pt-2">
                    <div className="font-bold text-[11px] uppercase tracking-wide text-slate-800">
                      II. DAFTAR KODE PENGAWAS UJIAN
                    </div>
                    <table className="w-full border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-black p-1 w-12">KODE</th>
                          <th className="border border-black p-1 text-left pl-2">NAMA GURU PENGAWAS</th>
                          <th className="border border-black p-1 w-36">NIP</th>
                          <th className="border border-black p-1 w-20">JAGA RUANG</th>
                          {printIncludeBackups && <th className="border border-black p-1 w-20">CADANGAN</th>}
                          <th className="border border-black p-1 w-20">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supervisorCodeList.map((sup) => {
                          const roomDuty = assignments.filter(
                            (a) =>
                              (printDateFilter === "all" || a.exam_date === printDateFilter) &&
                              (a.supervisor1_name === sup.name ||
                                a.supervisor2_name === sup.name ||
                                a.supervisor3_name === sup.name)
                          ).length;
                          const backupDuty = backups.filter(
                            (b) =>
                              (printDateFilter === "all" || b.exam_date === printDateFilter) &&
                              b.teacher_name === sup.name
                          ).length;
                          return (
                            <tr key={sup.code}>
                              <td className="border border-black p-1 text-center font-bold">{sup.code}</td>
                              <td className="border border-black p-1 text-left pl-2 font-semibold">{sup.name}</td>
                              <td className="border border-black p-1 text-center font-mono">{sup.nip}</td>
                              <td className="border border-black p-1 text-center">{roomDuty} Sesi</td>
                              {printIncludeBackups && (
                                <td className="border border-black p-1 text-center">{backupDuty} Sesi</td>
                              )}
                              <td className="border border-black p-1 text-center font-bold">{roomDuty + backupDuty} Sesi</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* III. LEMBAR PENGESAHAN & TANDA TANGAN (PRATINJAU LANGSUNG) */}
                  {printIncludeSignatures && (
                    <div className="space-y-2 pt-4 border-t-2 border-dashed border-slate-300">
                      <div className="font-bold text-[11px] uppercase tracking-wide text-slate-800">
                        III. LEMBAR PENGESAHAN &amp; TANDA TANGAN
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex justify-between items-start text-xs pt-2">
                          <div className="text-center w-52 sm:w-64 space-y-12">
                            <div>
                              Mengetahui,<br />
                              <span className="font-bold">Kepala Sekolah</span>
                            </div>
                            <div>
                              <div className="font-bold underline text-slate-900">{printPrincipalName}</div>
                              <div className="text-[10px] text-slate-600 font-mono">NIP. {printPrincipalNip}</div>
                            </div>
                          </div>

                          <div className="text-center w-52 sm:w-64 space-y-12">
                            <div>
                              {printCity}, {printDateSign}<br />
                              <span className="font-bold">Ketua Panitia Ujian</span>
                            </div>
                            <div>
                              <div className="font-bold underline text-slate-900">{printCommitteeName}</div>
                              <div className="text-[10px] text-slate-600 font-mono">NIP. {printCommitteeNip}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintModal(false);
                    setTimeout(() => handlePrint(), 300);
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPrint} className="text-xs" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 5: ARSIP JADWAL PENGAWAS DARI PAKET UJIAN YANG LALU             */}
        {/* ===================================================================== */}
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faBoxArchive} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Arsip Jadwal Pengawas Ujian
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pusat penyimpanan riwayat penugasan pengawas ruang &amp; cadangan dari paket ujian yang telah diselesaikan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                  title="Tutup"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              {/* Konten Modal: Split 2 Kolom */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                {/* Kolom Kiri: Daftar Arsip */}
                <div className="md:col-span-5 space-y-2 border-r border-slate-100 pr-0 md:pr-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Pilih Paket Ujian
                  </span>
                  {loadingArchives ? (
                    <div className="p-8 text-center text-slate-400">
                      <FontAwesomeIcon icon={faRotate} className="animate-spin text-base mb-1 block mx-auto text-blue-500" />
                      Memuat daftar arsip...
                    </div>
                  ) : archivesList.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500">
                      <FontAwesomeIcon icon={faBoxArchive} className="text-xl mb-1 text-slate-400 block mx-auto" />
                      Belum ada jadwal yang diarsipkan.
                    </div>
                  ) : (
                    archivesList.map((arc) => {
                      const isSelected = selectedArchiveDetail?.exam?.id === arc.exam_id;
                      return (
                        <div
                          key={arc.exam_id}
                          onClick={() => handleSelectArchive(arc.exam_id)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20"
                              : "bg-white border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-slate-900 leading-snug">
                              {arc.exam_title}
                            </span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                              Selesai
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span><b>{arc.assignments_count}</b> Penugasan Ruang</span>
                            <span>&bull;</span>
                            <span><b>{arc.backups_count}</b> Cadangan</span>
                          </div>
                          {arc.archived_at && (
                            <span className="text-[10px] text-slate-400">
                              Diarsipkan: {new Date(arc.archived_at).toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Kolom Kanan: Detail Arsip */}
                <div className="md:col-span-7 flex flex-col justify-between">
                  {loadingArchiveDetail ? (
                    <div className="p-12 text-center text-slate-400 my-auto">
                      <FontAwesomeIcon icon={faRotate} className="animate-spin text-lg mb-2 block mx-auto text-blue-500" />
                      Memuat detail jadwal arsip...
                    </div>
                  ) : !selectedArchiveDetail ? (
                    <div className="p-12 text-center text-slate-400 my-auto">
                      Pilih paket ujian di sebelah kiri untuk melihat detail arsip.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Kartu Ringkasan Arsip */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Paket Ujian
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {selectedArchiveDetail.exam.title}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-center">
                          <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Total Penugasan
                            </span>
                            <span className="text-base font-black text-blue-600">
                              {selectedArchiveDetail.assignments.length} Jadwal
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Pengawas Cadangan
                            </span>
                            <span className="text-base font-black text-amber-600">
                              {selectedArchiveDetail.backups.length} Sesi
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sampel Tabel Penugasan */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Pratinjau Penugasan ({selectedArchiveDetail.assignments.length})
                        </span>
                        <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200/80 bg-white">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 text-[10px] font-black text-slate-600 uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-2">TGL</th>
                                <th className="p-2">RUANG</th>
                                <th className="p-2">SESI</th>
                                <th className="p-2">PENGAWAS 1</th>
                                <th className="p-2">PENGAWAS 2</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedArchiveDetail.assignments.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-2 whitespace-nowrap">{item.exam_date}</td>
                                  <td className="p-2 font-bold whitespace-nowrap">{item.room_name}</td>
                                  <td className="p-2 whitespace-nowrap">{item.session_name}</td>
                                  <td className="p-2 font-semibold text-blue-700">{item.supervisor1_name || "-"}</td>
                                  <td className="p-2 font-semibold text-emerald-700">{item.supervisor2_name || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Tombol Aksi Load Arsip */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleLoadArchiveToView(selectedArchiveDetail)}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-xs" />
                          <span>Muat ke Tampilan &amp; Cetak Matriks</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. AREA DOKUMEN CETAK RESMI (HANYA TAMPIL SAAT PRINT / WINDOW.PRINT())     */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-black bg-white p-6 font-sans text-[11px] leading-relaxed">
        {/* KOP SURAT RESMI DARI SIAK */}
        {useImageLetterhead && schoolProfile?.letterhead ? (
          <div className="w-full flex justify-center pb-2 mb-4 border-b-2 border-black">
            <img
              src={schoolProfile.letterhead}
              alt="Kop Surat Resmi Sekolah"
              className="w-full max-h-28 object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 border-b-4 border-double border-black pb-3 mb-4">
            {schoolProfile?.logo && (
              <img
                src={schoolProfile.logo}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain shrink-0"
              />
            )}
            <div className="text-center space-y-0.5">
              <div className="text-[12px] font-bold tracking-widest uppercase">
                {schoolProfile?.province ? `PEMERINTAH PROVINSI ${schoolProfile.province.toUpperCase()}` : "PEMERINTAH PROVINSI BALI"}
              </div>
              <div className="text-[12px] font-bold tracking-widest uppercase">
                DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA
              </div>
              <div className="text-base font-black tracking-wider uppercase">
                {schoolProfile?.school_name || "SMA NEGERI 4 SINGARAJA"}
              </div>
              <div className="text-[10px] text-gray-700">
                {schoolProfile?.address || "Jl. Melati, Kelurahan Banjar Jawa"}, {schoolProfile?.regency || "Buleleng"} &bull; Telp: {schoolProfile?.phone || "(0362) 123456"} &bull; Email: {schoolProfile?.email || "cbt@sekolah.sch.id"}
              </div>
            </div>
          </div>
        )}

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-4 space-y-1">
          <h2 className="text-sm font-black uppercase underline tracking-wider">
            MATRIKS JADWAL PENGAWAS RUANG UJIAN
          </h2>
          <div className="text-xs font-bold uppercase">
            UJIAN SEKOLAH / SUMATIF AKHIR SEMESTER (SAS) TAHUN PELAJARAN 2026/2027
          </div>
          <div className="text-[10px] italic text-gray-700">
            {printDateFilter === "all"
              ? `Seluruh Hari Pelaksanaan (${availableDates.length} Tanggal)`
              : `Pelaksanaan: ${formatDateIndo(printDateFilter)}`}
          </div>
        </div>

        {/* TABEL I: MATRIKS JADWAL PENGAWAS RUANGAN */}
        <div className="space-y-2 mb-6">
          <div className="font-bold text-xs uppercase tracking-wide">
            I. MATRIKS PENUGASAN RUANGAN (KODE PENGAWAS)
          </div>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              {/* Header Tingkat 1: Hari/tanggal, Sesi, Ruang */}
              <tr className="bg-gray-100 font-bold text-center">
                <th
                  rowSpan={3}
                  className="border border-black p-2 text-center align-middle w-36"
                >
                  Hari/tanggal
                </th>
                <th
                  rowSpan={3}
                  className="border border-black p-2 text-center align-middle w-44"
                >
                  Sesi
                </th>
                <th
                  colSpan={
                    matrixRooms.length * supPositions.length +
                    (printIncludeBackups ? supPositions.length : 0)
                  }
                  className="border border-black p-1.5 text-center font-bold"
                >
                  Ruang
                </th>
              </tr>
              {/* Header Tingkat 2: Nama Ruangan (G1, G2, ...) & Cad */}
              <tr className="bg-gray-100 font-bold text-center">
                {matrixRooms.map((rm) => (
                  <th
                    key={rm}
                    colSpan={supPositions.length}
                    className="border border-black p-1 text-center font-bold uppercase tracking-wider"
                  >
                    {rm}
                  </th>
                ))}
                {printIncludeBackups && (
                  <th
                    colSpan={supPositions.length}
                    className="border border-black p-1 text-center font-bold uppercase tracking-wider bg-gray-50"
                  >
                    Cad
                  </th>
                )}
              </tr>
              {/* Header Tingkat 3: Posisi Pengawas (P1, P2) */}
              <tr className="bg-gray-50 font-bold text-center text-[10px]">
                {matrixRooms.map((rm) =>
                  supPositions.map((pos) => (
                    <th
                      key={`${rm}_${pos}`}
                      className="border border-black p-1 text-center font-bold"
                    >
                      {pos}
                    </th>
                  ))
                )}
                {printIncludeBackups &&
                  supPositions.map((pos) => (
                    <th
                      key={`cad_${pos}`}
                      className="border border-black p-1 text-center font-bold bg-gray-100"
                    >
                      {pos}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {printableDates.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      2 +
                      matrixRooms.length * supPositions.length +
                      (printIncludeBackups ? supPositions.length : 0)
                    }
                    className="border border-black p-4 text-center italic"
                  >
                    Belum ada penugasan pengawas untuk tanggal yang dipilih.
                  </td>
                </tr>
              ) : (
                printableDates.map((date) => {
                  const dateSessions = getSessionsForDate(date);
                  return (
                    <Fragment key={date}>
                      {dateSessions.map((sess, sessIdx) => (
                        <tr key={`${date}_${sess}`} className="text-center align-middle">
                          {sessIdx === 0 && (
                            <td
                              rowSpan={dateSessions.length}
                              className="border border-black p-2 text-left align-middle font-medium"
                            >
                              <div className="font-bold text-[11px] text-black leading-tight">
                                {getDayName(date)},
                              </div>
                              <div className="text-[10px] text-gray-700 leading-tight">
                                {formatDateOnlyIndo(date)}
                              </div>
                            </td>
                          )}
                          <td className="border border-black p-2 text-left align-middle font-medium text-[11px] whitespace-nowrap">
                            {formatSessionLabel(sess)}
                          </td>
                          {matrixRooms.map((rm) =>
                            supPositions.map((pos) => {
                              const val = getRoomSupervisorCodeByPosition(date, sess, rm, pos);
                              return (
                                <td
                                  key={`${rm}_${pos}`}
                                  className="border border-black p-2 text-center font-bold text-xs"
                                >
                                  {val}
                                </td>
                              );
                            })
                          )}
                          {printIncludeBackups &&
                            supPositions.map((pos) => {
                              const val = getBackupSupervisorCodeByPosition(date, sess, pos);
                              return (
                                <td
                                  key={`cad_${pos}`}
                                  className="border border-black p-2 text-center font-bold text-xs bg-gray-50/40"
                                >
                                  {val}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABEL II: DAFTAR KODE PENGAWAS UJIAN & REKAP BEBAN */}
        <div className="space-y-2 mb-6 page-break-inside-avoid">
          <div className="font-bold text-xs uppercase tracking-wide">
            II. DAFTAR KODE PENGAWAS UJIAN
          </div>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold text-center">
                <th className="border border-black p-1.5 w-16">KODE</th>
                <th className="border border-black p-1.5 text-left pl-3">NAMA GURU PENGAWAS</th>
                <th className="border border-black p-1.5 w-44">NIP</th>
                <th className="border border-black p-1.5 w-24">JAGA RUANG</th>
                {printIncludeBackups && (
                  <th className="border border-black p-1.5 w-24">CADANGAN</th>
                )}
                <th className="border border-black p-1.5 w-24">TOTAL SESI</th>
                <th className="border border-black p-1.5 w-32">TANDA TANGAN</th>
              </tr>
            </thead>
            <tbody>
              {supervisorCodeList.map((sup) => {
                const roomDuty = assignments.filter(
                  (a) =>
                    (printDateFilter === "all" || a.exam_date === printDateFilter) &&
                    (a.supervisor1_name === sup.name ||
                      a.supervisor2_name === sup.name ||
                      a.supervisor3_name === sup.name)
                ).length;
                const backupDuty = backups.filter(
                  (b) =>
                    (printDateFilter === "all" || b.exam_date === printDateFilter) &&
                    b.teacher_name === sup.name
                ).length;
                const totalDuty = roomDuty + backupDuty;

                return (
                  <tr key={sup.code} className="align-middle">
                    <td className="border border-black p-1.5 text-center font-black text-xs">
                      {sup.code}
                    </td>
                    <td className="border border-black p-1.5 font-bold text-left pl-3">
                      {sup.name}
                    </td>
                    <td className="border border-black p-1.5 font-mono text-center text-[10px]">
                      {sup.nip}
                    </td>
                    <td className="border border-black p-1.5 text-center">
                      {roomDuty} Sesi
                    </td>
                    {printIncludeBackups && (
                      <td className="border border-black p-1.5 text-center">
                        {backupDuty} Sesi
                      </td>
                    )}
                    <td className="border border-black p-1.5 text-center font-bold">
                      {totalDuty} Sesi
                    </td>
                    <td className="border border-black p-1.5 text-left text-[9px] text-gray-500 pl-2">
                      {sup.code}. ....................
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* LEMBAR PENGESAHAN & TANDA TANGAN RESMI */}
        {printIncludeSignatures && (
          <div
            className="mt-8 pt-4 break-inside-avoid print-signature-section"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <div className="w-full flex justify-between items-start text-xs">
              <div className="text-center w-64 space-y-16">
                <div>
                  Mengetahui,<br />
                  <b>Kepala Sekolah</b>
                </div>
                <div>
                  <b className="underline">{printPrincipalName}</b>
                  <div>NIP. {printPrincipalNip}</div>
                </div>
              </div>

              <div className="text-center w-64 space-y-16">
                <div>
                  {printCity}, {printDateSign}<br />
                  <b>Ketua Panitia Ujian</b>
                </div>
                <div>
                  <b className="underline">{printCommitteeName}</b>
                  <div>NIP. {printCommitteeNip}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Rules Khusus Pencetakan Dokumen Resmi */}
      <style>{`
        @media print {
          @page {
            ${printOrientation === "auto" ? "size: auto;" : `size: ${printOrientation};`}
            margin: 8mm 10mm 10mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            display: block !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .print-signature-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
