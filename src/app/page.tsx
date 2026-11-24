"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faPlay,
  faClock,
  faLayerGroup,
  faBookOpen,
  faLock,
  faKey,
  faCheckCircle,
  faTriangleExclamation,
  faPlus,
  faEye,
  faRotateRight,
  faShieldHalved,
  faShareFromSquare,
  faArrowRight,
  faIdCard,
  faFileLines,
  faUsers,
  faSchool,
  faServer,
  faUnlock,
  faCircleCheck,
  faRotate,
  faUserGraduate,
  faChalkboardUser,
  faCalendarDays,
  faCircleExclamation,
  faFileWord,
  faBolt,
  faPen,
  faTrash,
  faXmark,
  faDiagramProject,
  faDesktop,
  faFlagCheckered,
  faRotateLeft,
  faCheck,
  faChartColumn,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabQuery = searchParams.get("tab"); // 'sas' | 'daily' | null

  const { user, token, isStudent, isTeacher, isAdminOrStaff, isLoading } = useAuth();

  // State Siswa
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExamForToken, setSelectedExamForToken] = useState<any | null>(null);
  const [inputToken, setInputToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [startingExam, setStartingExam] = useState(false);
  const [studentFilter, setStudentFilter] = useState<"all" | "live" | "scheduled" | "completed">("all");

  // State Guru & Admin
  const [examsList, setExamsList] = useState<any[]>([]);
  const [loadingExamsList, setLoadingExamsList] = useState(true);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

  // State Admin / Panitia SAS
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [lockedStudents, setLockedStudents] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  // State Khusus Admin: Buat, Edit, Hapus, Mapping Ujian
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newTokenInterval, setNewTokenInterval] = useState<number>(15);
  const [creatingExam, setCreatingExam] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [editingExamTitle, setEditingExamTitle] = useState("");
  const [updatingExam, setUpdatingExam] = useState(false);

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedMappingExam, setSelectedMappingExam] = useState<any | null>(null);

  // State Pencarian & Filter Status
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");

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

  // Redirect ke login jika belum login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Fetch ujian untuk Siswa
  const fetchStudentExams = async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoadingExams(true);
      const res = await fetch("/api/cbt-backend/api/cbt/student/available-exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentExams(data.exams || []);
      }
    } catch (e) {
      console.error("Gagal memuat ujian siswa:", e);
    } finally {
      if (!isSilent) setLoadingExams(false);
    }
  };

  // Fetch ujian untuk Guru / Admin
  const fetchExams = async () => {
    if (!token) return;
    try {
      setLoadingExamsList(true);
      const res = await fetch("/api/cbt-backend/api/cbt/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExamsList(data.exams || []);
      }

      // Ambil tugas penulisan soal untuk guru jika bukan siswa
      if (!isStudent) {
        const resAssign = await fetch("/api/cbt-backend/api/cbt/exams/teacher/my-assignments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resAssign.ok) {
          const dataAssign = await resAssign.json();
          setTeacherAssignments(dataAssign.assignments || []);
        }
      }
    } catch (e) {
      console.error("Gagal memuat daftar ujian:", e);
    } finally {
      setLoadingExamsList(false);
    }
  };

  // Fetch data khusus Admin / Panitia
  const fetchAdminData = async () => {
    if (!token) return;
    try {
      setLoadingAdmin(true);
      const [resOverview, resLocked] = await Promise.all([
        fetch("/api/cbt-backend/api/cbt/proctor/system-overview", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/cbt-backend/api/cbt/proctor/locked-students", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resOverview.ok) {
        const data = await resOverview.json();
        setAdminStats(data.stats);
      }
      if (resLocked.ok) {
        const data = await resLocked.json();
        setLockedStudents(data.locked_students || []);
      }
    } catch (e) {
      console.error("Gagal memuat overview admin:", e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      if (isStudent) {
        fetchStudentExams();
        const poll = setInterval(() => {
          fetchStudentExams(true);
        }, 15000);
        return () => clearInterval(poll);
      } else if (isAdminOrStaff) {
        fetchExams();
        fetchAdminData();
      } else {
        fetchExams();
      }
    }
  }, [user, token, isStudent, isAdminOrStaff]);

  // Handler Buka Kunci Siswa Massal (Admin)
  const handleUnlockAll = async () => {
    if (!confirm("Buka kunci seluruh peserta yang sedang terkunci di seluruh ujian?")) return;
    try {
      setUnlocking(true);
      const res = await fetch("/api/cbt-backend/api/cbt/proctor/unlock-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAdminData();
        fetchExams();
      }
    } catch (e: any) {
      alert(e.message || "Gagal membuka kunci.");
    } finally {
      setUnlocking(false);
    }
  };

  // Handler Masuk Ujian Siswa
  const handleStartExam = async (exam: any) => {
    if (!exam.is_session_active) {
      Swal.fire({
        icon: "warning",
        title: "Soal Belum Dibuka",
        text: "Sesi ujian ini belum dibuka atau telah dihentikan oleh guru/pengawas.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }
    setTokenError(null);
    // Jika sesi siswa sedang berlangsung atau terkunci, langsung lanjutkan tanpa meminta token lagi
    if (exam.session_status === "in_progress" || exam.session_status === "locked") {
      await executeStartExam(exam.id, exam.subject_id, "");
      return;
    }
    if (exam.requires_token) {
      setSelectedExamForToken(exam);
      setInputToken("");
      return;
    }
    await executeStartExam(exam.id, exam.subject_id, "");
  };

  const executeStartExam = async (examId: number, subjectId?: number, tokenCode: string = "") => {
    try {
      setStartingExam(true);
      setTokenError(null);

      let deviceId = localStorage.getItem("cbt_device_id");
      if (!deviceId) {
        deviceId = "dev_" + Math.random().toString(36).substring(2, 12);
        localStorage.setItem("cbt_device_id", deviceId);
      }

      if (tokenCode) {
        sessionStorage.setItem(`cbt_token_${examId}_${subjectId || 0}`, tokenCode);
      }

      const res = await fetch("/api/cbt-backend/api/cbt/student/start-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exam_id: examId,
          subject_id: subjectId || undefined,
          token: tokenCode,
          device_id: deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.detail || "Gagal memulai ujian.";
        setTokenError(errorMsg);
        if (!selectedExamForToken) {
          Swal.fire({
            icon: "warning",
            title: "Tidak Dapat Masuk Ujian",
            text: errorMsg,
            confirmButtonColor: "#2563EB",
          });
        }
        return;
      }

      const queryParams = new URLSearchParams();
      queryParams.set("session_id", String(data.session_id));
      if (subjectId || data.subject_id) {
        queryParams.set("subject_id", String(subjectId || data.subject_id));
      }
      router.push(`/ujian/kerjakan/${examId}?${queryParams.toString()}`);
    } catch (e: any) {
      const errorMsg = e.message || "Gagal menghubungi server ujian.";
      setTokenError(errorMsg);
      if (!selectedExamForToken) {
        Swal.fire({
          icon: "error",
          title: "Koneksi Terputus",
          text: errorMsg,
          confirmButtonColor: "#2563EB",
        });
      }
    } finally {
      setStartingExam(false);
    }
  };

  // Handler Buat Paket Ujian Baru (Hanya Input Nama Ujian Saja)
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) {
      alert("Masukkan nama paket ujian terlebih dahulu.");
      return;
    }
    if (!token) return;

    try {
      setCreatingExam(true);
      const res = await fetch("/api/cbt-backend/api/cbt/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newExamTitle.trim(),
          exam_type: isTeacher ? "daily" : "sas",
          token_refresh_interval: newTokenInterval,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const createdId = data.exam_id;
        const examName = newExamTitle.trim();
        setNewExamTitle("");
        setNewTokenInterval(15);
        setShowCreateModal(false);
        await fetchExams();

        if (isTeacher) {
          Swal.fire({
            icon: "success",
            title: "Judul Ulangan Berhasil Dibuat!",
            html: `
              <div class="text-left text-xs space-y-2 mt-2">
                <p>Ulangan harian <b>"${examName}"</b> telah terdaftar.</p>
                <p class="text-slate-500">Langkah berikutnya: klik tombol <b>"Atur Mapping"</b> untuk menentukan mata pelajaran, rombel kelas sasaran, dan naskah bank soal.</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Atur Mapping Sekarang",
            cancelButtonText: "Nanti Saja",
            confirmButtonColor: "#2563EB",
            cancelButtonColor: "#64748B",
            customClass: {
              popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
              title: "text-base font-bold text-gray-800",
              confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
              cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
            },
          }).then((result) => {
            if (result.isConfirmed && createdId) {
              router.push(`/ujian/mapping/${createdId}`);
            }
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Paket Ujian Berhasil Dibuat!",
            text: `Paket "${examName}" telah terdaftar.`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } else {
        Swal.fire("Gagal", data.detail || "Gagal membuat paket ujian.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat membuat paket ujian.", "error");
    } finally {
      setCreatingExam(false);
    }
  };

  // Handler Buka Edit Modal
  const handleOpenEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setEditingExamTitle(exam.title);
    setShowEditModal(true);
  };

  // Handler Simpan Perubahan Nama Ujian
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamTitle.trim() || !editingExamId) {
      alert("Masukkan nama paket ujian.");
      return;
    }
    if (!token) return;

    try {
      setUpdatingExam(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${editingExamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editingExamTitle.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        setEditingExamId(null);
        setEditingExamTitle("");
        fetchExams();
      } else {
        alert(data.detail || "Gagal memperbarui paket ujian.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat memperbarui paket ujian.");
    } finally {
      setUpdatingExam(false);
    }
  };

  // Handler Hapus Paket Ujian
  const handleDeleteExam = (examId: number, examTitle: string) => {
    if (!token) return;
    Swal.fire({
      title: "Hapus Paket Ujian?",
      text: `Apakah Anda yakin ingin menghapus ujian "${examTitle}"? Tindakan ini tidak dapat dibatalkan.`,
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
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            fetchExams();
          } else {
            alert(data.detail || "Gagal menghapus ujian.");
          }
        } catch (err) {
          console.error(err);
          alert("Gagal menghapus paket ujian.");
        }
      }
    });
  };

  // Handler Selesaikan Seluruh Ujian (Menutup Periode Ujian Tanpa Menghapus Data)
  const handleFinishExam = async (exam: any) => {
    if (!token) return;

    // 1. Tampilkan loading sebentar selagi memeriksa kesiapan ujian
    Swal.fire({
      title: "Memeriksa Status Ujian...",
      text: "Sedang memeriksa status sesi dan pengerjaan siswa...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    let checkData: any = null;
    try {
      const checkRes = await fetch(
        `/api/cbt-backend/api/cbt/exams/${exam.id}/completion-check`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (checkRes.ok) {
        checkData = await checkRes.json();
      }
    } catch (e) {
      console.error("Gagal memeriksa completion check:", e);
    }

    const hasWarnings = Boolean(checkData?.has_warnings);
    const unstarted = checkData?.unstarted_sessions || [];
    const unattempted = checkData?.unattempted_summary || [];
    const inProgressCount = checkData?.in_progress_count || 0;
    const lockedCount = checkData?.locked_count || 0;

    let warningHtml = "";

    if (hasWarnings) {
      warningHtml = `
        <div class="text-left text-xs text-slate-700 space-y-3 mt-1 max-h-[60vh] overflow-y-auto pr-1">
          <div class="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-1">
            <p class="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
              <span>⚠️</span> PERHATIAN: Paket Ujian Belum Sepenuhnya Selesai!
            </p>
            <p class="text-[11px] text-rose-800 leading-relaxed">
              Sistem mendeteksi masih ada sesi yang belum pernah dimulai atau siswa yang belum menyelesaikan pengerjaan soal.
            </p>
          </div>

          ${
            unstarted.length > 0
              ? `
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
              <p class="font-bold text-amber-950 text-xs flex items-center justify-between">
                <span>🚨 Sesi Belum Pernah Dimulai (${unstarted.length} Mapel):</span>
              </p>
              <ul class="list-disc list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed">
                ${unstarted
                  .map(
                    (s: any) =>
                      `<li><b>${s.subject_name}</b> ${
                        s.exam_date ? `(${s.exam_date} ${s.session_time || ""})` : ""
                      } - <i class="text-rose-700 font-semibold">Belum Pernah Dimulai</i></li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            unattempted.length > 0
              ? `
            <div class="p-3 bg-orange-50 rounded-xl border border-orange-200 space-y-1.5">
              <p class="font-bold text-orange-950 text-xs">
                <span>⚠️ Siswa Belum Mengerjakan Soal (${unattempted.length} Mapel):</span>
              </p>
              <div class="space-y-1.5 text-[11px] text-orange-900 leading-relaxed">
                ${unattempted
                  .map(
                    (u: any) => `
                  <div class="border-b border-orange-200/60 pb-1.5 last:border-0 last:pb-0">
                    <div class="flex items-center justify-between font-bold text-slate-800">
                      <span>• ${u.subject_name}</span>
                      <span class="text-rose-700 font-extrabold">${u.unattempted_count} dari ${u.total_target} siswa belum ikut</span>
                    </div>
                    ${
                      u.unattempted_samples && u.unattempted_samples.length > 0
                        ? `<p class="text-[10px] text-slate-500 mt-0.5 italic">Contoh siswa: ${u.unattempted_samples.join(", ")}${u.unattempted_count > u.unattempted_samples.length ? " dan lainnya..." : ""}</p>`
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            inProgressCount > 0 || lockedCount > 0
              ? `
            <div class="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-[11px]">
              ⏳ <b>${inProgressCount} siswa</b> saat ini masih dalam status pengerjaan aktif ${
                  lockedCount > 0 ? `dan <b>${lockedCount} siswa</b> sedang terkunci` : ""
                }.
            </div>
          `
              : ""
          }

          <div class="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 text-[11px] space-y-1">
            <p class="font-bold text-slate-900">Dampak jika tetap diselesaikan:</p>
            <ul class="list-disc list-inside space-y-0.5 leading-relaxed text-slate-600">
              <li>Paket ujian akan <b>ditutup permanen</b> dan masuk ke mode standby.</li>
              <li>Siswa yang belum mengerjakan <b>tidak akan bisa mengakses soal lagi</b>.</li>
              <li>Siswa yang masih aktif mengerjakan akan otomatis dikumpulkan (submit paksa).</li>
              <li>Seluruh nilai yang sudah masuk, presensi, dan berita acara tetap <b>aman tersimpan</b>.</li>
            </ul>
          </div>
        </div>
      `;
    } else {
      warningHtml = `
        <div class="text-left text-xs text-slate-600 space-y-2">
          <p>Anda akan menyelesaikan dan menutup paket ujian <strong>"${exam.title}"</strong>.</p>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
            <p class="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>✅</span> Seluruh Sesi & Peserta Siap Ditutup
            </p>
            <p class="text-[11px] leading-relaxed">
              Seluruh mata pelajaran telah dimulai dan seluruh peserta telah menyelesaikan ujian.
            </p>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1 text-[11px]">
            <p class="font-bold text-slate-900">Dampak tindakan ini:</p>
            <ul class="list-disc list-inside space-y-0.5 leading-relaxed text-slate-600">
              <li>Menu <b>Jadwal Jaga Saya</b> di akun guru akan otomatis dinonaktifkan (standby).</li>
              <li>Status sesi ujian dan token akan di-reset ke mode standby.</li>
              <li>Seluruh data nilai, presensi, dan Berita Acara tetap aman tersimpan.</li>
            </ul>
          </div>
        </div>
      `;
    }

    Swal.fire({
      title: hasWarnings ? "Peringatan: Selesaikan Ujian?" : "Selesaikan Seluruh Ujian?",
      html: warningHtml,
      icon: hasWarnings ? "warning" : "question",
      showCancelButton: true,
      confirmButtonColor: hasWarnings ? "#EF4444" : "#D97706",
      cancelButtonColor: "#64748B",
      confirmButtonText: hasWarnings ? "Tetap Selesaikan Paket Ujian" : "Ya, Selesaikan Seluruh Ujian",
      cancelButtonText: "Batal (Periksa Kembali)",
      focusCancel: hasWarnings,
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5 max-w-lg",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${exam.id}/finish-all`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (res.ok && d.success) {
            Swal.fire({
              icon: "success",
              title: "Ujian Selesai",
              text: d.message || "Seluruh sesi telah ditutup dan sistem dalam mode standby.",
              timer: 2500,
              showConfirmButton: false,
            });
            fetchExams();
          } else {
            Swal.fire("Gagal", d.detail || "Gagal menyelesaikan ujian.", "error");
          }
        } catch (err: any) {
          console.error(err);
          Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
        }
      }
    });
  };

  // Handler Buka / Aktifkan Kembali Ujian
  const handleReopenExam = (exam: any) => {
    if (!token) return;
    Swal.fire({
      title: "Aktifkan Kembali Ujian?",
      text: `Paket ujian "${exam.title}" akan diaktifkan kembali. Menu jadwal jaga di guru dan kontrol proktoring akan kembali dibuka.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Aktifkan Kembali",
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
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${exam.id}/reopen`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (res.ok && d.success) {
            Swal.fire({
              icon: "success",
              title: "Ujian Diaktifkan",
              text: d.message || "Paket ujian kini aktif kembali.",
              timer: 2000,
              showConfirmButton: false,
            });
            fetchExams();
          } else {
            Swal.fire("Gagal", d.detail || "Gagal mengaktifkan ujian.", "error");
          }
        } catch (err: any) {
          console.error(err);
          Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
        }
      }
    });
  };

  // Handler Atur Mapping Ujian
  const handleOpenMapping = (exam: any) => {
    router.push(`/ujian/mapping/${exam.id}`);
  };

  if (isLoading || !user) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Memuat sesi CBT...
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: KHUSUS SISWA (PORTAL UJIAN SISWA DENGAN SISTEM HYBRID CERDAS)
  // =========================================================================
  if (isStudent) {
    const liveCount = studentExams.filter(
      (e) => Boolean(e.is_session_active) && e.session_status !== "submitted"
    ).length;
    const scheduledCount = studentExams.filter(
      (e) => !e.is_session_active && e.session_status !== "submitted"
    ).length;
    const completedCount = studentExams.filter(
      (e) => e.session_status === "submitted" || e.display_status === "completed"
    ).length;

    const filteredStudentExams = studentExams
      .filter((exam) => {
        const isSubmitted = exam.session_status === "submitted";
        const isSessionRunning = Boolean(exam.is_session_active);
        const isLive = isSessionRunning && !isSubmitted;
        const isScheduled = !isSessionRunning && !isSubmitted;
        const isDone = isSubmitted || exam.display_status === "completed";

        if (studentFilter === "live") return isLive;
        if (studentFilter === "scheduled") return isScheduled;
        if (studentFilter === "completed") return isDone;
        return true;
      })
      .sort((a, b) => {
        const getPriority = (e: any) => {
          if (e.is_session_active && e.session_status === "in_progress") return 1;
          if (e.is_session_active && e.session_status !== "submitted") return 2;
          if (!e.is_session_active && e.session_status !== "submitted") return 3;
          return 4;
        };
        return getPriority(a) - getPriority(b);
      });

    return (
      <div className="flex flex-col gap-3.5 sm:gap-4 min-w-0 w-full animate-in fade-in duration-200">
        {/* Header Siswa Minimalis */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-indigo-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Portal Ujian Siswa (CBT)
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                Kelas {user.class_name || "-"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Selamat datang, <b>{user.name}</b> &bull; NISN: {user.nisn || user.nis || "-"} &bull; Pantau jadwal dan ujian Anda di bawah ini.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchStudentExams(false)}
              disabled={loadingExams}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${loadingExams ? "animate-spin" : ""}`} />
              <span>Segarkan Status</span>
            </button>
          </div>
        </div>

        {/* Layout 2 Kolom: Kiri (2/3 Ujian) & Kanan (1/3 Tata Tertib) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {/* KOLOM KIRI (2/3): DAFTAR UJIAN SISWA */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-3.5">
            {/* Filter Tabs Siswa */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setStudentFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  studentFilter === "all"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Semua Ujian ({studentExams.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter("live")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                  studentFilter === "live"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${liveCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`} />
                <span>Sedang Dibuka ({liveCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter("scheduled")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  studentFilter === "scheduled"
                    ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Terjadwal ({scheduledCount})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter("completed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  studentFilter === "completed"
                    ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Selesai ({completedCount})
              </button>
            </div>

            {loadingExams ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <FontAwesomeIcon icon={faRotate} className="animate-spin text-base text-indigo-600 mb-2 block mx-auto" />
                Memeriksa status ujian...
              </div>
            ) : studentExams.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-xl shadow-2xs">
                  <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Tidak Ada Ujian Aktif Saat Ini
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Seluruh pelaksanaan ujian sekolah/ulangan telah selesai atau belum dimulai oleh pihak sekolah. Silakan beristirahat atau menunggu instruksi dari pengawas dan panitia ujian.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    onClick={() => fetchStudentExams(false)}
                    disabled={loadingExams}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${loadingExams ? "animate-spin" : ""}`} />
                    <span>Periksa Kembali Status Ujian</span>
                  </button>
                </div>
              </div>
            ) : filteredStudentExams.length === 0 ? (
              <div className="p-10 text-center space-y-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faClipboardList} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {studentFilter === "live"
                    ? "Belum Ada Ujian yang Dibuka Saat Ini"
                    : studentFilter === "scheduled"
                    ? "Tidak Ada Ujian yang Terjadwal"
                    : studentFilter === "completed"
                    ? "Belum Ada Ujian yang Diselesaikan"
                    : "Tidak Ada Ujian yang Tersedia"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {studentFilter === "live"
                    ? "Pengawas atau guru belum menekan tombol mulai sesi. Begitu pengawas membuka sesi di ruang kelas, ujian akan otomatis aktif di sini."
                    : "Jika Anda merasa harus mengikuti ujian saat ini, silakan hubungi pengawas ruangan."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                {filteredStudentExams.map((exam) => {
                  const status = exam.session_status;
                  const isSubmitted = status === "submitted";
                  const isSessionRunning = Boolean(exam.is_session_active);
                  const isLocked = isSessionRunning && status === "locked";
                  const isInProgress = isSessionRunning && status === "in_progress";
                  const isLive = isSessionRunning && !isSubmitted;
                  const isScheduled = !isSessionRunning && !isSubmitted;
                  const isDone = isSubmitted || exam.display_status === "completed";

                  return (
                    <div
                      key={`${exam.id}-${exam.subject_id || 0}`}
                      className={`rounded-2xl border p-4 transition flex flex-col justify-between space-y-3 ${
                        isLive
                          ? "bg-white border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs"
                          : isLocked
                          ? "bg-rose-50/30 border-rose-200 shadow-2xs"
                          : isDone
                          ? "bg-slate-50/60 border-slate-200/80 shadow-2xs"
                          : "bg-white border-slate-200/90 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header Badge Status */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              exam.exam_type === "sas"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                            }`}
                          >
                            {exam.exam_type === "sas" ? "Ujian Sekolah (SAS)" : "Ulangan Harian"}
                          </span>

                          {isSubmitted ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Sudah Selesai
                            </span>
                          ) : !isSessionRunning ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <FontAwesomeIcon icon={faLock} className="text-[9px]" />
                              <span>Soal Belum Dibuka</span>
                            </span>
                          ) : isLocked ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <FontAwesomeIcon icon={faLock} /> Terkunci
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                              <span>Sedang Dikerjakan</span>
                            </span>
                          ) : isLive ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>Sedang Berlangsung</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Selesai
                            </span>
                          )}
                        </div>

                        {/* Judul & Detail Mapel */}
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {exam.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mapel: <b className="text-slate-800">{exam.subject_name || "Mata Pelajaran"}</b> &bull; Kelas {exam.grade || "-"}
                          </p>
                        </div>

                        {/* Info Jadwal Pelaksanaan (Jika Terjadwal) */}
                        {exam.schedule_info?.exam_date && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                            <FontAwesomeIcon icon={faCalendarDays} className="text-slate-400 text-[10px]" />
                            <span>
                              Jadwal: <b>{exam.schedule_info.exam_date}</b>
                              {exam.schedule_info.start_time && ` (${exam.schedule_info.start_time} - ${exam.schedule_info.end_time || "Selesai"})`}
                            </span>
                          </div>
                        )}

                        {/* Info Durasi, Jumlah Soal & Token */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                            {exam.duration_minutes} Menit
                          </span>
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faBookOpen} className="text-slate-400 text-[10px]" />
                            {exam.total_questions || 0} Soal
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <FontAwesomeIcon icon={faKey} className="text-[9px]" />
                            {exam.requires_token ? "Wajib Token" : "Tanpa Token"}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Aksi Kerjakan Cerdas */}
                      <div className="pt-1">
                        {isSubmitted ? (
                          <div className="w-full py-2.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl text-center border border-slate-200 select-none">
                            ✓ Ujian Telah Selesai Dikerjakan
                          </div>
                        ) : !isSessionRunning ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              disabled
                              className="w-full py-2.5 bg-slate-100 border border-slate-200/90 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 select-none cursor-not-allowed"
                            >
                              <FontAwesomeIcon icon={faLock} className="text-xs text-slate-400" />
                              <span>Soal Belum Dibuka</span>
                            </button>
                            <p className="text-[10px] text-slate-400 text-center leading-tight">
                              💡 Tombol otomatis aktif saat sesi ujian dibuka.
                            </p>
                          </div>
                        ) : isLocked ? (
                          <button
                            type="button"
                            disabled={startingExam}
                            onClick={() => handleStartExam(exam)}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-rose-300/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <FontAwesomeIcon icon={startingExam ? faRotateRight : faLock} className={`text-xs ${startingExam ? "animate-spin" : ""}`} />
                            <span>{startingExam ? "Membuka Lembar Ujian..." : "Ujian Terkunci - Buka Lembar Ujian"}</span>
                          </button>
                        ) : isInProgress ? (
                          <button
                            type="button"
                            disabled={startingExam}
                            onClick={() => handleStartExam(exam)}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-indigo-300/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <FontAwesomeIcon icon={startingExam ? faRotateRight : faPlay} className={`text-[10px] ${startingExam ? "animate-spin" : ""}`} />
                            <span>{startingExam ? "Menghubungkan Sesi..." : "Lanjutkan Ujian Sekarang"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={startingExam}
                            onClick={() => handleStartExam(exam)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-emerald-400/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <FontAwesomeIcon icon={startingExam ? faRotateRight : faPlay} className={`text-[10px] ${startingExam ? "animate-spin" : ""}`} />
                            <span>{startingExam ? "Menyiapkan Ujian..." : "Mulai Kerjakan Sekarang"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KOLOM KANAN (1/3): TATA TERTIB & INFO PESERTA */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-3.5">
            {/* Info Kartu Peserta */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FontAwesomeIcon icon={faIdCard} className="text-blue-600" />
                <span>Identitas Peserta Ujian</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-800 text-right">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NISN / NIS:</span>
                  <span className="font-mono font-bold text-slate-800">{user.nisn || user.nis || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kelas:</span>
                  <span className="font-bold text-slate-800">Kelas {user.class_name || "-"}</span>
                </div>
              </div>
            </div>

            {/* Panduan & Anti-Curang */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-600" />
                <span>Tata Tertib &amp; Sistem Anti-Curang</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Ujian otomatis berjalan dalam mode <b>Layar Penuh (Fullscreen)</b>.</li>
                <li>Dilarang berpindah tab browser, membuka browser lain, atau meminimize layar.</li>
                <li>Setiap pelanggaran tab akan tercatat oleh pengawas ruang. Jika melebihi batas, layar Anda akan <b>terkunci otomatis</b>.</li>
                <li>Jawaban tersimpan otomatis ke server CBT setiap kali Anda memilih opsi.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Token */}
        {selectedExamForToken && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/80 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mx-auto flex items-center justify-center text-2xl shadow-inner">
                  <FontAwesomeIcon icon={faKey} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Masukkan Token Ujian
                </h3>
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium inline-flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="font-bold text-slate-800">{selectedExamForToken.title}</span>
                  {selectedExamForToken.subject_name && (
                    <>
                      <span>&bull;</span>
                      <span className="text-indigo-600 font-semibold">{selectedExamForToken.subject_name}</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Dapatkan 5-6 digit kode token dari Pengawas Ruang Anda.
                </p>
              </div>

              {tokenError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-start gap-2 text-left">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-500 mt-0.5 text-xs shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-800">Token Tidak Sesuai</p>
                    <p className="text-[11px] text-rose-600">{tokenError}</p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputToken.trim() && !startingExam) {
                    executeStartExam(selectedExamForToken.id, selectedExamForToken.subject_id, inputToken.trim());
                  }
                }}
                className="space-y-3.5"
              >
                <div>
                  <input
                    type="text"
                    autoFocus
                    maxLength={10}
                    value={inputToken}
                    onChange={(e) => {
                      setInputToken(e.target.value.toUpperCase());
                      setTokenError(null);
                    }}
                    placeholder="Contoh: BK9XT"
                    className="w-full text-center tracking-[0.25em] font-mono font-black text-xl py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition uppercase shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExamForToken(null);
                      setTokenError(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!inputToken.trim() || startingExam}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {startingExam ? (
                      <span>Memverifikasi...</span>
                    ) : (
                      <>
                        <span>Mulai Ujian</span>
                        <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: KHUSUS ADMINISTRATOR CBT (MENU UTAMA: UJIAN)
  // =========================================================================
  if (isAdminOrStaff) {
    const filteredExams = examsList.filter((exam) => {
      if (!searchQuery.trim()) return true;
      return exam.title?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
        {/* Header Halaman Ujian */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Ujian
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {examsList.length} Paket Ujian
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola paket ujian sekolah, buat ujian baru, dan atur mapping ujian
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/status-tes"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Buka Menu Status Tes & Token"
            >
              <FontAwesomeIcon icon={faDesktop} className="text-xs text-indigo-600" />
              <span>Status Tes</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setNewExamTitle("");
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Buat Paket Ujian</span>
            </button>
            <button
              type="button"
              onClick={() => fetchExams()}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Perbarui Data"
            >
              <FontAwesomeIcon icon={faRotate} className={`text-xs ${loadingExamsList ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian Sederhana */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <FontAwesomeIcon icon={faClipboardList} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama paket ujian..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Tabel Data Paket Ujian */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loadingExamsList ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Memuat data ujian...
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl">
                <FontAwesomeIcon icon={faClipboardList} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery ? "Tidak ada paket ujian yang cocok dengan pencarian" : "Belum Ada Paket Ujian"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Coba gunakan kata kunci pencarian yang lain."
                  : "Buat paket ujian pertama Anda dengan menekan tombol di bawah ini."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setNewExamTitle("");
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Buat Paket Ujian Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">NO</th>
                    <th className="py-3 px-4">NAMA PAKET UJIAN</th>
                    <th className="py-3 px-4 w-28 text-center">STATUS</th>
                    <th className="py-3 px-4 w-36">TANGGAL DIBUAT</th>
                    <th className="py-3 px-4 w-52 text-center">KONFIGURASI UJIAN</th>
                    <th className="py-3 px-4 w-44 text-center">STATUS & AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((exam, idx) => {
                    const isMapped = (exam.total_subjects || 0) > 0 || (exam.subjects && exam.subjects.length > 0);
                    const subjectCount = exam.total_subjects || exam.subjects?.length || 0;
                    const isActiveExam = exam.status === "active";
                    const isCompletedExam = exam.status === "completed";

                    return (
                      <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. NO */}
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* 2. NAMA PAKET UJIAN */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {exam.title}
                          </div>
                          <div className="text-[11px] font-normal text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {isMapped ? (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                                ✓ {subjectCount} Mapel Ter-mapping
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80">
                                Belum Ada Mapel
                              </span>
                            )}
                            {exam.token && (
                              <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                Token: {exam.token}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. STATUS UJIAN */}
                        <td className="py-3 px-4 text-center">
                          {isActiveExam ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                              Aktif
                            </span>
                          ) : isCompletedExam ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                              Selesai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* 4. TANGGAL DIBUAT */}
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {formatDate(exam.created_at)}
                        </td>

                        {/* 5. KONFIGURASI UJIAN: ATUR MAPPING & ATUR JADWAL */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Atur Mapping */}
                            <Link
                              href={`/ujian/mapping/${exam.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/70 transition cursor-pointer shadow-2xs"
                              title="Atur Mapping Mata Pelajaran & Kelas Sasaran"
                            >
                              <FontAwesomeIcon icon={faDiagramProject} className="text-[10px]" />
                              <span>Atur Mapping</span>
                            </Link>

                            {/* Tombol Atur Jadwal */}
                            {isMapped ? (
                              <Link
                                href={`/jadwal?exam_id=${exam.id}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200/70 transition cursor-pointer shadow-2xs"
                                title="Atur Jadwal Pelaksanaan Ujian"
                              >
                                <FontAwesomeIcon icon={faCalendarDays} className="text-[10px]" />
                                <span>Atur Jadwal</span>
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  Swal.fire({
                                    icon: "info",
                                    title: "Mapping Belum Dilakukan",
                                    text: `Silakan lakukan "Atur Mapping" untuk mendaftarkan mata pelajaran terlebih dahulu sebelum mengatur jadwal pelaksanaan ujian "${exam.title}".`,
                                    confirmButtonText: "Buka Mapping Sekarang",
                                    showCancelButton: true,
                                    cancelButtonText: "Tutup",
                                    confirmButtonColor: "#4F46E5",
                                    customClass: {
                                      popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
                                      title: "text-base font-bold text-gray-800",
                                      confirmButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
                                      cancelButton: "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
                                    },
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      router.push(`/ujian/mapping/${exam.id}`);
                                    }
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-[11px] font-semibold border border-slate-200/60 transition cursor-pointer shadow-2xs hover:bg-slate-200/70"
                                title="Lakukan Atur Mapping terlebih dahulu untuk mengaktifkan jadwal"
                              >
                                <FontAwesomeIcon icon={faCalendarDays} className="text-[10px]" />
                                <span>Atur Jadwal</span>
                              </button>
                            )}

                            {/* Tombol Status Tes */}
                            {isMapped && (
                              <Link
                                href={`/status-tes?exam_id=${exam.id}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200/70 transition cursor-pointer shadow-2xs"
                                title="Buka Kontrol Status Tes & Token"
                              >
                                <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
                                <span>Status Tes</span>
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* 6. STATUS & AKSI (SAKLAR SELESAIKAN, EDIT & HAPUS) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Saklar Selesaikan Ujian / Aktifkan Kembali */}
                            {isActiveExam ? (
                              <button
                                type="button"
                                onClick={() => handleFinishExam(exam)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                                title="Selesaikan & Tutup Seluruh Ujian (Menyembunyikan menu pengawas di guru dan mereset status tes ke mode standby)"
                              >
                                <FontAwesomeIcon icon={faFlagCheckered} className="text-[10px] text-amber-600" />
                                <span>Selesaikan</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReopenExam(exam)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 hover:border-emerald-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                                title="Buka Kembali Periode Ujian Ini"
                              >
                                <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                                <span>Aktifkan</span>
                              </button>
                            )}

                            {/* Edit (Hanya Icon) */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exam)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition cursor-pointer shadow-2xs"
                              title="Edit Nama Ujian"
                            >
                              <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                            </button>

                            {/* Hapus (Hanya Icon) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(exam.id, exam.title)}
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 flex items-center justify-center border border-rose-200/70 transition cursor-pointer shadow-2xs"
                              title="Hapus Paket Ujian"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal 1: Buat Paket Ujian Baru (Hanya Input Nama Ujian Saja) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faPlus} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Buat Paket Ujian Baru</h3>
                    <p className="text-xs text-slate-500">Masukkan nama paket ujian untuk memulai</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Paket Ujian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    placeholder="Contoh: Penilaian Akhir Semester Ganjil 2026/2027"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Interval Rilis Token Otomatis</span>
                    <span className="text-[10px] text-blue-600 font-semibold lowercase">opsional</span>
                  </label>
                  <select
                    value={newTokenInterval}
                    onChange={(e) => setNewTokenInterval(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer"
                  >
                    <option value={15}>15 Menit (Standar Rekomendasi)</option>
                    <option value={5}>5 Menit (Sangat Ketat)</option>
                    <option value={10}>10 Menit</option>
                    <option value={20}>20 Menit</option>
                    <option value={30}>30 Menit</option>
                    <option value={0}>Manual (Token tidak otomatis berganti)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Token acak baru akan otomatis dibuat setiap interval waktu ini selama ujian berjalan.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creatingExam || !newExamTitle.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {creatingExam ? "Menyimpan..." : "Simpan Paket Ujian"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Edit Paket Ujian */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                    <FontAwesomeIcon icon={faPen} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Edit Nama Paket Ujian</h3>
                    <p className="text-xs text-slate-500">Perbarui nama paket ujian</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExamId(null);
                    setEditingExamTitle("");
                  }}
                  className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
              </div>

              <form onSubmit={handleUpdateExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Paket Ujian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editingExamTitle}
                    onChange={(e) => setEditingExamTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExamId(null);
                      setEditingExamTitle("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={updatingExam || !editingExamTitle.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {updatingExam ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>
    );
  }

  // =========================================================================
  // VIEW 3: KHUSUS GURU MATA PELAJARAN (ULANGAN HARIAN & BANK SOAL)
  // =========================================================================
  const teacherExams = examsList.filter((e) => e.exam_type === "daily");
  const filteredTeacherExams = teacherExams.filter((exam) => {
    const matchSearch =
      !searchQuery.trim() ||
      exam.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.token?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.target_classes || []).some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? exam.status === "active"
        : exam.status !== "active";

    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* Header Dashboard Guru Sederhana & Bersih */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Ulangan Harian &amp; Naskah Guru
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              {teacherExams.length} Ulangan Harian
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Selamat datang, <b>{user.name}</b> &bull; Buat dan kelola ulangan harian untuk kelas yang Anda ampu
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setNewExamTitle("");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Buat Ulangan Harian</span>
          </button>
          <Link
            href="/bank-soal"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-xs" />
            <span>Bank Soal Saya</span>
          </Link>
          <button
            type="button"
            onClick={fetchExams}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Segarkan Data"
          >
            <FontAwesomeIcon icon={faRotate} className={`text-xs ${loadingExamsList ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toolbar Pencarian & Filter Ulangan Harian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <FontAwesomeIcon icon={faClipboardList} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ulangan harian, mapel, atau kelas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "all" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            Semua ({teacherExams.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "active" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            Aktif ({teacherExams.filter((e) => e.status === "active").length})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "completed" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            Selesai ({teacherExams.filter((e) => e.status !== "active").length})
          </button>
        </div>
      </div>

      {/* Tabel Bersih Ulangan Harian Guru (Full Width) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loadingExamsList ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Memuat data ulangan...
          </div>
        ) : filteredTeacherExams.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg">
              <FontAwesomeIcon icon={faClipboardList} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery ? "Tidak ada ulangan yang cocok dengan pencarian" : "Belum Ada Ulangan Harian"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Coba gunakan kata kunci lain untuk mencari ulangan."
                : "Buat ulangan harian baru untuk kelas yang Anda ampu dengan memilih bank soal yang sudah disiapkan."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setNewExamTitle("");
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                <span>Buat Ulangan Harian Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4">NAMA ULANGAN HARIAN</th>
                  <th className="py-3 px-4 w-28 text-center">STATUS</th>
                  <th className="py-3 px-4 w-36">TANGGAL DIBUAT</th>
                  <th className="py-3 px-4 w-52 text-center">KONFIGURASI ULANGAN</th>
                  <th className="py-3 px-4 w-44 text-center">STATUS & AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeacherExams.map((exam, idx) => {
                  const isMapped =
                    (exam.total_subjects || 0) > 0 || (exam.subjects && exam.subjects.length > 0);
                  const subjectCount = exam.total_subjects || exam.subjects?.length || 0;
                  const isActiveExam = exam.status === "active";
                  const isCompletedExam = exam.status === "completed";

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. NO */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 2. NAMA ULANGAN HARIAN & STATUS MAPPING */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {exam.title}
                        </div>
                        <div className="text-[11px] font-normal text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          {isMapped ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-1">
                              <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                              <span>{subjectCount} Mapel Ter-mapping</span>
                            </span>
                          ) : (
                            <Link
                              href={`/ujian/mapping/${exam.id}`}
                              className="text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1 transition"
                              title="Klik untuk melengkapi mata pelajaran & kelas sasaran"
                            >
                              <FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" />
                              <span>Belum Ada Mapel (Klik Atur Mapping)</span>
                            </Link>
                          )}

                          {exam.token && (
                            <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              Token: {exam.token}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. STATUS */}
                      <td className="py-3 px-4 text-center">
                        {isActiveExam ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                            Aktif
                          </span>
                        ) : isCompletedExam ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* 4. TANGGAL DIBUAT */}
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {formatDate(exam.created_at)}
                      </td>

                      {/* 5. KONFIGURASI ULANGAN: ATUR MAPPING, STATUS TES, PANTAU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Tombol Atur Mapping */}
                          <Link
                            href={`/ujian/mapping/${exam.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/70 transition cursor-pointer shadow-2xs"
                            title="Atur Mapping Mata Pelajaran & Kelas Sasaran"
                          >
                            <FontAwesomeIcon icon={faDiagramProject} className="text-[10px]" />
                            <span>Atur Mapping</span>
                          </Link>

                          {/* Tombol Bank Soal / Input Soal */}
                          <Link
                            href="/bank-soal"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 transition cursor-pointer shadow-2xs"
                            title="Buka Bank Soal Saya untuk input & kelola butir soal"
                          >
                            <FontAwesomeIcon icon={faBookOpen} className="text-[10px]" />
                            <span>Bank Soal</span>
                          </Link>

                          {/* Tombol Proktoring / Pantau Live */}
                          <Link
                            href={`/ujian/pantau/${exam.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            title="Buka Meja Proktoring: Mulai Sesi, Pantau Live & Kunci Siswa"
                          >
                            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                            <span>Proktoring</span>
                          </Link>

                          {/* Tombol Hasil & Download Nilai */}
                          <Link
                            href={`/hasil-ujian?exam_id=${exam.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/70 transition cursor-pointer shadow-2xs"
                            title="Lihat & Download Rekap Nilai Siswa (Excel)"
                          >
                            <FontAwesomeIcon icon={faChartColumn} className="text-[10px]" />
                            <span>Hasil Nilai</span>
                          </Link>
                        </div>
                      </td>

                      {/* 6. STATUS & AKSI */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Saklar Selesaikan Ujian / Aktifkan Kembali */}
                          {isActiveExam ? (
                            <button
                              type="button"
                              onClick={() => handleFinishExam(exam)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                              title="Selesaikan & Tutup Ulangan Harian Ini"
                            >
                              <FontAwesomeIcon icon={faFlagCheckered} className="text-[10px] text-amber-600" />
                              <span>Selesaikan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReopenExam(exam)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 hover:border-emerald-300 transition cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                              title="Buka Kembali Ulangan Ini"
                            >
                              <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                              <span>Aktifkan</span>
                            </button>
                          )}

                          {/* Edit (Hanya Icon) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exam)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition cursor-pointer shadow-2xs"
                            title="Edit Judul Ulangan"
                          >
                            <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                          </button>

                          {/* Hapus (Hanya Icon) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id, exam.title)}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 flex items-center justify-center border border-rose-200/70 transition cursor-pointer shadow-2xs"
                            title="Hapus Ulangan Harian"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Buat Ulangan Harian Baru (Khusus Guru) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Buat Ulangan Harian Baru</h3>
                  <p className="text-xs text-slate-500">Pertama masukkan judul ulangan harian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama / Judul Ulangan Harian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="Contoh: Ulangan Harian 1 - Stoikiometri & Reaksi Kimia"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Setelah disimpan, Anda dapat melengkapi mata pelajaran dan kelas sasaran via <b>Atur Mapping</b>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Waktu Rilis Token Otomatis</span>
                  <span className="text-[10px] text-blue-600 font-semibold lowercase">dapat diatur live di meja proktoring</span>
                </label>
                <select
                  value={newTokenInterval}
                  onChange={(e) => setNewTokenInterval(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer"
                >
                  <option value={15}>15 Menit (Standar Rekomendasi)</option>
                  <option value={5}>5 Menit (Sangat Ketat)</option>
                  <option value={10}>10 Menit</option>
                  <option value={20}>20 Menit</option>
                  <option value={30}>30 Menit</option>
                  <option value={0}>Manual (Token tidak pernah berganti otomatis)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pilih seberapa sering token berganti acak. Di Meja Proktoring, Anda tetap bisa menggantinya sewaktu-waktu.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !newExamTitle.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creatingExam ? "Menyimpan..." : "Simpan Ulangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Ulangan Harian (Khusus Guru) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                  <FontAwesomeIcon icon={faPen} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Edit Judul Ulangan</h3>
                  <p className="text-xs text-slate-500">Perbarui nama atau judul ulangan harian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExamId(null);
                  setEditingExamTitle("");
                }}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama / Judul Ulangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editingExamTitle}
                  onChange={(e) => setEditingExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExamId(null);
                    setEditingExamTitle("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingExam || !editingExamTitle.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingExam ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
