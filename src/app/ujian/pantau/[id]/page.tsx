"use client";

import { useState, useEffect, use, useMemo, useRef } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEye,
  faRotateRight,
  faLock,
  faUnlock,
  faLockOpen,
  faKey,
  faRotate,
  faTriangleExclamation,
  faCircleCheck,
  faUsers,
  faClock,
  faUserTie,
  faXmark,
  faShieldHalved,
  faFloppyDisk,
  faExpand,
  faCopy,
  faCheck,
  faMagnifyingGlass,
  faLaptop,
  faMobileScreen,
  faWifi,
  faSignal,
  faTableList,
  faGrip,
  faDesktop,
  faFileExcel,
  faChartColumn,
  faPlay,
  faStop,
  faCirclePlay,
  faCircleStop,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

interface Participant {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  nisn?: string;
  seat_number?: number;
  status: string; // 'in_progress', 'locked', 'submitted', 'not_started'
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
  start_time?: string;
  submitted_at?: string;
  violation_count?: number;
}

export default function LiveMonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const { token } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // State Token Fullscreen & Copy
  const [showTokenFullscreen, setShowTokenFullscreen] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);
  const [downloadingScores, setDownloadingScores] = useState<boolean>(false);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);

  // State Token Interval & Countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [tokenInterval, setTokenInterval] = useState<number>(15);
  const [savingInterval, setSavingInterval] = useState<boolean>(false);

  // Handler Download Hasil Nilai Excel
  const handleDownloadScoresExcel = async () => {
    if (!token || !examId) return;
    try {
      setDownloadingScores(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/results/export/scores?exam_id=${examId}&scope=angkatan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Gagal mengunduh file Excel.");
      }

      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `Hasil_Ulangan_${examId}.xlsx`;

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
        text: err.message || "Terjadi kesalahan saat membuat berkas Excel.",
      });
    } finally {
      setDownloadingScores(false);
    }
  };

  // State Anti-Kecurangan Live
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);
  const [antiCheatSaving, setAntiCheatSaving] = useState(false);
  const [antiCheatSuccess, setAntiCheatSuccess] = useState<string | null>(null);
  const [antiCheatForm, setAntiCheatForm] = useState({
    randomize_questions: true,
    randomize_options: true,
    show_results: true,
    max_violations: 3,
  });

  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sinkronisasi data anti-kecurangan dari server saat data ujian termuat
  useEffect(() => {
    if (data?.exam) {
      setAntiCheatForm({
        randomize_questions: data.exam.randomize_questions !== undefined ? Boolean(data.exam.randomize_questions) : true,
        randomize_options: data.exam.randomize_options !== undefined ? Boolean(data.exam.randomize_options) : true,
        show_results: data.exam.show_results !== undefined ? Boolean(data.exam.show_results) : true,
        max_violations: data.exam.max_violations !== undefined && data.exam.max_violations !== null ? Number(data.exam.max_violations) : 3,
      });
      if (data.exam.remaining_seconds !== undefined) {
        setRemainingSeconds(data.exam.remaining_seconds || 0);
      }
      if (data.exam.token_refresh_interval !== undefined) {
        setTokenInterval(data.exam.token_refresh_interval ?? 15);
      }
    }
  }, [
    data?.exam?.randomize_questions,
    data?.exam?.randomize_options,
    data?.exam?.show_results,
    data?.exam?.max_violations,
    data?.exam?.token,
    data?.exam?.remaining_seconds,
    data?.exam?.token_refresh_interval,
  ]);

  // Interval Countdown Timer Sisa Waktu Token (Tiap 1 detik)
  useEffect(() => {
    if (tokenInterval <= 0 || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          fetchMonitoring(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenInterval, remainingSeconds]);

  // Helper format countdown MM:SS
  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return "00:00";
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Fetch Data Monitoring Ujian
  const fetchMonitoring = async (isBackground = false) => {
    if (!token) return;
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/monitoring`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Gagal mengambil data monitoring ujian:", e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, [token, examId]);

  // Auto-refresh interval (tiap 6 detik jika autoRefresh aktif)
  useEffect(() => {
    if (!autoRefresh) {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
      return;
    }

    autoRefreshTimerRef.current = setInterval(() => {
      fetchMonitoring(true);
    }, 6000);

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, token, examId]);

  // --------------------------------------------------------------------------
  // ACTIONS GURU: BUKA KUNCI, BUKA SEMUA, RESET LOGIN, FORCE SUBMIT
  // --------------------------------------------------------------------------

  // Buka Kunci Siswa Individual
  const handleUnlockStudent = async (student: Participant) => {
    if (!token) return;
    if (!student.id) {
      Swal.fire("Info", "Siswa ini belum mulai ujian.", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Buka Kunci Siswa?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Nama:</strong> ${student.student_name}</p>
          <p><strong>Kelas:</strong> ${student.class_name}</p>
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
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/unlock-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.id }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Kunci Terbuka",
          text: `Kunci ujian untuk ${student.student_name} berhasil dibuka.`,
          timer: 1800,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal membuka kunci");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Buka Kunci Semua Siswa Terkunci Sekaligus (Bulk Unlock)
  const handleUnlockAll = async () => {
    const participants: Participant[] = data?.participants || [];
    const lockedStudents = participants.filter((p) => p.status === "locked");
    if (lockedStudents.length === 0) {
      Swal.fire({ icon: "info", title: "Info", text: "Tidak ada siswa yang sedang terkunci." });
      return;
    }

    const result = await Swal.fire({
      title: `Buka Kunci Semua (${lockedStudents.length} Siswa)?`,
      text: "Seluruh siswa yang saat ini terkunci akan dapat melanjutkan ujian kembali.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Buka Semua Kunci",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const sessionIds = lockedStudents.map((s) => s.id);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/unlock-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_ids: sessionIds }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: `Berhasil membuka kunci seluruh ${d.unlocked || lockedStudents.length} siswa.`,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal membuka kunci");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Reset Sesi Login / Perangkat (Siswa ganti HP / Komputer)
  const handleResetDevice = async (student: Participant) => {
    if (!token) return;
    if (!student.id) {
      Swal.fire("Info", "Siswa ini belum mulai ujian.", "info");
      return;
    }

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
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/reset-device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.id }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil Direset",
          text: `Siswa ${student.student_name} sekarang dapat login kembali dari perangkat lain.`,
          timer: 1800,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal mereset perangkat");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Selesaikan Ujian Siswa Secara Paksa (Force Submit)
  const handleForceSubmit = async (student: Participant) => {
    if (!token) return;
    if (!student.id) {
      Swal.fire("Info", "Siswa ini belum mulai ujian.", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Kumpulkan Ujian Siswa?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Nama:</strong> ${student.student_name}</p>
          <p class="text-rose-600 font-bold">Ujian siswa akan diselesaikan dan dikumpulkan secara paksa dengan jawaban terakhir yang telah tersimpan.</p>
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
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/submit-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: student.id }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Ujian Dikumpulkan",
          text: `Ujian ${student.student_name} berhasil diselesaikan.`,
          timer: 1800,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal mengumpulkan ujian");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    }
  };

  // Rilis Token Baru Secara Manual
  const handleRefreshToken = async () => {
    if (!token) return;

    Swal.fire({
      title: "Rilis Token Baru?",
      text: "Token ujian saat ini akan diganti dengan token acak baru. Siswa yang baru mulai ujian wajib menggunakan token baru ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Rilis Token Baru",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/refresh-token`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (res.ok && d.success) {
            Swal.fire({
              icon: "success",
              title: "Token Baru Dirilis!",
              html: `Token aktif sekarang: <b class="font-mono text-xl text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">${d.token}</b>`,
              timer: 2500,
              showConfirmButton: false,
            });
            fetchMonitoring(true);
          } else {
            Swal.fire("Gagal", d.detail || "Gagal merilis token baru.", "error");
          }
        } catch (err) {
          Swal.fire("Error", "Gagal menghubungi server.", "error");
        }
      }
    });
  };

  // Salin Token Ujian
  const handleCopyToken = () => {
    const tkn = data?.exam?.token;
    if (!tkn || tkn === "-") return;
    navigator.clipboard.writeText(tkn);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Update Interval Release Token Otomatis ke Server
  const handleUpdateInterval = async (minutes: number) => {
    if (!token || !examId) return;
    try {
      setSavingInterval(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/token-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token_refresh_interval: minutes }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setTokenInterval(minutes);
        await fetchMonitoring(true);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            minutes === 0
              ? "Token diatur ke mode Manual (tidak otomatis berganti)"
              : `Token akan otomatis berganti setiap ${minutes} menit`,
          showConfirmButton: false,
          timer: 3000,
          customClass: {
            popup: "rounded-xl shadow-lg border border-gray-100",
            title: "text-xs font-bold text-gray-800",
          },
        });
      } else {
        Swal.fire("Gagal", d.detail || "Gagal mengubah interval token.", "error");
      }
    } catch (e) {
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setSavingInterval(false);
    }
  };

  // Dialog Pemilihan Waktu Release Token Otomatis
  const handleConfigureTokenInterval = () => {
    if (!token || !examId) return;

    Swal.fire({
      title: "Pengaturan Waktu Release Token Otomatis",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-3 mt-1">
          <p>Tentukan seberapa sering sistem akan merilis kode token acak baru secara otomatis:</p>
          <div class="grid grid-cols-3 gap-2 pt-1">
            <button type="button" id="btn-interval-0" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 0 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              0m (Manual)
            </button>
            <button type="button" id="btn-interval-5" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 5 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              5 Menit
            </button>
            <button type="button" id="btn-interval-10" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 10 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              10 Menit
            </button>
            <button type="button" id="btn-interval-15" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 15 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              15 Menit ⭐
            </button>
            <button type="button" id="btn-interval-20" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 20 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              20 Menit
            </button>
            <button type="button" id="btn-interval-30" class="px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 text-slate-700 cursor-pointer ${tokenInterval === 30 ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200" : "border-slate-200"}">
              30 Menit
            </button>
          </div>
          <div class="pt-2 border-t border-slate-100">
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Atau Bebas Masukkan Menit Kustom:
            </label>
            <input type="number" id="input-custom-interval" min="0" max="360" value="${tokenInterval}" placeholder="Contoh: 45" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800" />
            <p class="text-[10px] text-slate-400 mt-1">Masukkan <b>0</b> jika ingin mode Manual tanpa ganti otomatis.</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Pengaturan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
      didOpen: () => {
        const input = document.getElementById("input-custom-interval") as HTMLInputElement;
        [0, 5, 10, 15, 20, 30].forEach((m) => {
          const btn = document.getElementById(`btn-interval-${m}`);
          if (btn && input) {
            btn.addEventListener("click", () => {
              input.value = m.toString();
              [0, 5, 10, 15, 20, 30].forEach((other) => {
                const otherBtn = document.getElementById(`btn-interval-${other}`);
                if (otherBtn) {
                  otherBtn.className = otherBtn.className.replace(/bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200/g, "border-slate-200");
                }
              });
              btn.className = "px-2.5 py-2 rounded-xl border text-xs font-bold transition hover:bg-slate-100 bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-200";
            });
          }
        });
      },
      preConfirm: () => {
        const input = document.getElementById("input-custom-interval") as HTMLInputElement;
        if (!input || input.value === "" || isNaN(Number(input.value))) {
          Swal.showValidationMessage("Masukkan angka menit yang valid!");
          return false;
        }
        const val = parseInt(input.value, 10);
        if (val < 0) {
          Swal.showValidationMessage("Menit tidak boleh negatif!");
          return false;
        }
        return val;
      },
    }).then((res) => {
      if (res.isConfirmed && res.value !== undefined && res.value !== null) {
        handleUpdateInterval(res.value);
      }
    });
  };

  // Handler Mulai Sesi Ulangan Harian Langsung dari Meja Proktoring
  const handleStartSession = async () => {
    if (!token) return;

    const result = await Swal.fire({
      title: "Mulai Sesi Ulangan Harian?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mt-1">
          <p>Setelah sesi dibuka, siswa pada kelas sasaran dapat memasukkan token <b>"${data?.exam?.token || "..."}"</b> dan langsung membuka butir soal.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Buka Sesi Sekarang",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSessionLoading(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/start-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "active" }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Sesi Ulangan Aktif!",
          text: d.message || "Siswa sekarang dapat memasukkan token dan mengerjakan soal.",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal membuka sesi ulangan.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setSessionLoading(false);
    }
  };

  // Handler Hentikan Sesi Ulangan Harian Langsung dari Meja Proktoring
  const handleStopSession = async () => {
    if (!token) return;

    const result = await Swal.fire({
      title: "Hentikan / Selesaikan Sesi?",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mt-1">
          <p>Sesi pengerjaan akan dihentikan dan siswa baru tidak dapat memulai ulangan lagi.</p>
          <p class="text-slate-500">Siswa yang sedang aktif dapat menyelesaikan pengiriman lembar jawaban.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hentikan Sesi",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton: "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSessionLoading(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/stop-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "completed" }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        Swal.fire({
          icon: "success",
          title: "Sesi Telah Dihentikan",
          text: d.message || "Sesi ulangan harian telah selesai.",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchMonitoring(true);
      } else {
        throw new Error(d.detail || "Gagal menghentikan sesi.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setSessionLoading(false);
    }
  };

  // Simpan Aturan Anti-Kecurangan Live
  const handleSaveAntiCheat = async () => {
    if (!token) return;
    try {
      setAntiCheatSaving(true);
      setAntiCheatSuccess(null);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/anti-cheat`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          randomize_questions: antiCheatForm.randomize_questions,
          randomize_options: antiCheatForm.randomize_options,
          show_results: antiCheatForm.show_results,
          max_violations: Number(antiCheatForm.max_violations),
        }),
      });

      if (res.ok) {
        setAntiCheatSuccess("Pengaturan anti-kecurangan berhasil diperbarui dan langsung aktif!");
        await fetchMonitoring(true);
        setTimeout(() => {
          setAntiCheatSuccess(null);
          setShowAntiCheatModal(false);
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.detail || "Gagal memperbarui aturan anti-kecurangan.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat menyimpan pengaturan.");
    } finally {
      setAntiCheatSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERING & SEARCH SISWA
  // --------------------------------------------------------------------------

  const exam = data?.exam;
  const isSessionActive = useMemo(() => {
    if (!exam) return false;
    if (exam.is_session_active !== undefined) return Boolean(exam.is_session_active);
    if (exam.subjects && Array.isArray(exam.subjects) && exam.subjects.length > 0) {
      return exam.subjects.some((s: any) => s.session_status === "active" || s.id === exam.active_subject_id);
    }
    return exam.status === "active";
  }, [exam]);
  const summary = data?.summary || { total_participants: 0, in_progress: 0, locked: 0, submitted: 0, suspicious_count: 0 };
  const participants: Participant[] = data?.participants || [];

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const isLocked = p.status === "locked";
      const isSusp = Boolean(p.is_suspicious || isLocked || (p.lock_count && p.lock_count > 0));

      // Filter Status
      if (selectedFilter !== "all") {
        if (selectedFilter === "suspicious" && !isSusp) return false;
        if (selectedFilter === "in_progress" && p.status !== "in_progress") return false;
        if (selectedFilter === "locked" && p.status !== "locked") return false;
        if (selectedFilter === "submitted" && p.status !== "submitted") return false;
        if (selectedFilter === "not_started" && p.status !== "not_started") return false;
      }

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.student_name || "").toLowerCase().includes(q);
        const matchNisn = (p.nisn || "").toLowerCase().includes(q);
        const matchClass = (p.class_name || "").toLowerCase().includes(q);
        const matchDevice = (p.device_info || "").toLowerCase().includes(q);
        const matchIp = (p.ip_address || "").toLowerCase().includes(q);
        return matchName || matchNisn || matchClass || matchDevice || matchIp;
      }
      return true;
    });
  }, [participants, selectedFilter, searchQuery]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg mb-4 animate-bounce">
          <FontAwesomeIcon icon={faDesktop} />
        </div>
        <p className="text-slate-700 font-bold text-base">Memuat Meja Proktoring Ulangan Harian...</p>
        <span className="text-slate-400 text-xs mt-1">Mengambil data peserta ujian, koneksi live, dan status anti-kecurangan</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200 pb-20">
      {/* ==================================================================== */}
      {/* 1. TOP BAR: BREADCRUMB & HEADER */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition shadow-2xs shrink-0 cursor-pointer"
            title="Kembali ke Dashboard Utama"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Proktoring Ulangan Harian
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {exam?.title || "Ulangan Harian"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                &bull; Auto-refresh {autoRefresh ? "6s" : "Mati"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kendali proktoring mandiri guru: pantau pengerjaan siswa, deteksi kecurangan, kualitas koneksi, dan buka kunci ujian.
            </p>
          </div>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Tombol Pengaturan Anti-Kecurangan Live */}
          <button
            onClick={() => setShowAntiCheatModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer active:scale-95"
            title="Ubah aturan anti-kecurangan secara live"
          >
            <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-600" />
            <span>Anti-Kecurangan ({exam?.max_violations === 0 ? "Nonaktif" : `${exam?.max_violations ?? 3}x`})</span>
          </button>

          {/* Tombol Proyektor Layar Penuh Token */}
          <button
            onClick={() => setShowTokenFullscreen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Tampilkan Token Ukuran Raksasa di Layar Penuh / Proyektor Kelas"
          >
            <FontAwesomeIcon icon={faExpand} />
            <span>Layar Penuh Token</span>
          </button>

          {/* Tombol Download Excel Nilai */}
          <button
            type="button"
            onClick={handleDownloadScoresExcel}
            disabled={downloadingScores}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download Rekap Nilai Peserta Format Excel (.xlsx)"
          >
            <FontAwesomeIcon icon={faFileExcel} className={downloadingScores ? "animate-spin" : ""} />
            <span>{downloadingScores ? "Mengunduh..." : "Download Excel"}</span>
          </button>

          {/* Tombol Halaman Lengkap Hasil Nilai */}
          <Link
            href={`/hasil-ujian?exam_id=${examId}`}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Buka Analisis Butir Soal & Leger Lengkap"
          >
            <FontAwesomeIcon icon={faChartColumn} />
            <span>Hasil &amp; Analisis</span>
          </Link>

          {/* Tombol Manual Refresh */}
          <button
            onClick={() => fetchMonitoring()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Segarkan data live sekarang"
          >
            <FontAwesomeIcon icon={faRotate} className={loading ? "animate-spin text-xs" : "text-xs"} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BANNER KENDALI SESI & TOKEN RESMI GURU (ALL-IN-ONE) */}
      {/* ==================================================================== */}
      <div
        className={`rounded-2xl text-white p-4 sm:p-5 shadow-lg border transition-all flex flex-wrap items-center justify-between gap-4 ${
          isSessionActive
            ? "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-800/40"
            : "bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 border-amber-800/40"
        }`}
      >
        <div className="space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            {isSessionActive ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                Sesi Berlangsung &bull; Token Aktif
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                Sesi Standby &bull; Belum Dimulai
              </span>
            )}
            <span className="text-xs text-indigo-200 font-medium">
              {exam?.subject_name ? `Mata Pelajaran: ${exam.subject_name}` : "Ulangan Harian"}
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {isSessionActive
              ? "Siswa saat ini dapat memasukkan token dan membuka butir soal:"
              : "Sesi ulangan belum dibuka. Klik 'Mulai Sesi' agar siswa dapat mulai mengerjakan:"}
          </h2>
          <p className="text-[11px] text-slate-300">
            {isSessionActive
              ? "Bagikan token resmi di bawah kepada siswa atau klik 'Layar Penuh Token' untuk menampilkan di proyektor kelas."
              : "Ketika sesi belum dimulai, siswa di kelas tidak dapat memasukkan token atau membuka soal."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SAKLAR UTAMA: MULAI SESI / HENTIKAN SESI */}
          {isSessionActive ? (
            <button
              type="button"
              onClick={handleStopSession}
              disabled={sessionLoading}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Hentikan / Selesaikan Sesi Ulangan Harian"
            >
              <FontAwesomeIcon
                icon={sessionLoading ? faRotate : faCircleStop}
                className={sessionLoading ? "animate-spin" : ""}
              />
              <span>{sessionLoading ? "Memproses..." : "Hentikan Sesi"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={sessionLoading}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 animate-pulse hover:animate-none"
              title="Buka & Mulai Sesi Ulangan Sekarang"
            >
              <FontAwesomeIcon
                icon={sessionLoading ? faRotate : faCirclePlay}
                className={sessionLoading ? "animate-spin" : "text-sm"}
              />
              <span>{sessionLoading ? "Memproses..." : "Mulai Sesi Ulangan"}</span>
            </button>
          )}

          {/* Box Token Raksasa */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-inner">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider hidden sm:inline">
              TOKEN:
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-amber-300 select-all">
              {exam?.token || "- - - - -"}
            </span>
          </div>

          {/* Tombol Salin */}
          <button
            type="button"
            onClick={handleCopyToken}
            className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white border border-white/20 shadow-2xs active:scale-95"
            title="Salin Token Ujian"
          >
            <FontAwesomeIcon icon={copiedToken ? faCheck : faCopy} />
            <span>{copiedToken ? "Tersalin!" : "Salin"}</span>
          </button>

          {/* Tombol Ganti Token Manual */}
          <button
            type="button"
            onClick={handleRefreshToken}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white shadow-xs active:scale-95"
            title="Rilis Token Baru Acak Secara Manual"
          >
            <FontAwesomeIcon icon={faRotateRight} />
            <span>Rilis Baru</span>
          </button>

          {/* Countdown & Mode Interval Token */}
          {tokenInterval > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/80 border border-indigo-400/40 rounded-xl text-xs shadow-inner">
              <span className={`w-2 h-2 rounded-full ${remainingSeconds <= 60 ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-300">
                  Otomatis ({tokenInterval}m)
                </span>
                <span className={`font-mono font-black text-xs ${remainingSeconds <= 60 ? "text-amber-300 animate-pulse" : "text-white"}`}>
                  ⏱️ {formatCountdown(remainingSeconds)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs shadow-inner text-slate-300">
              <FontAwesomeIcon icon={faLock} className="text-[11px] text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                  Mode Token
                </span>
                <span className="font-bold text-xs text-slate-200">
                  Manual (Tetap)
                </span>
              </div>
            </div>
          )}

          {/* Tombol Atur Waktu Release Token Otomatis */}
          <button
            type="button"
            onClick={handleConfigureTokenInterval}
            disabled={savingInterval}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-white border border-white/20 shadow-2xs active:scale-95 disabled:opacity-50"
            title="Atur Waktu Release Token Otomatis (Menit)"
          >
            <FontAwesomeIcon icon={faClock} className="text-amber-300" />
            <span>{savingInterval ? "Menyimpan..." : "Atur Waktu Rilis"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. METRIC SUMMARY CARDS (6 KARTU DENGAN FILTER KLIK) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Peserta */}
        <div
          onClick={() => setSelectedFilter("all")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "all"
              ? "bg-slate-100/90 border-slate-300 ring-2 ring-slate-400/20"
              : "bg-white border-slate-200/90 hover:bg-slate-50"
          }`}
          title="Tampilkan semua peserta"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Peserta
          </span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">
            {summary.total_participants}
          </span>
          <span className="text-[10px] text-slate-400">Telah masuk sesi</span>
        </div>

        {/* Sedang Mengerjakan */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === "in_progress" ? "all" : "in_progress")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "in_progress"
              ? "bg-blue-100/80 border-blue-400 ring-2 ring-blue-500/20"
              : "bg-white border-blue-200/90 bg-blue-50/20 hover:bg-blue-50/50"
          }`}
          title="Filter siswa yang sedang aktif mengerjakan"
        >
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Sedang Ujian
          </span>
          <span className="text-xl font-black text-blue-700 mt-0.5 block">
            {summary.in_progress}
          </span>
          <span className="text-[10px] text-blue-600/80">Aktif mengerjakan</span>
        </div>

        {/* Dicurigai Curang */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === "suspicious" ? "all" : "suspicious")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "suspicious"
              ? "bg-rose-100 border-rose-500 ring-2 ring-rose-500/30"
              : (summary.suspicious_count || 0) > 0
              ? "bg-rose-50 border-rose-300 hover:bg-rose-100/70"
              : "bg-white border-slate-200/90 hover:bg-slate-50"
          }`}
          title="Filter siswa yang dicurigai curang (pernah/sedang terkunci)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
              Dicurigai Curang
            </span>
            {(summary.suspicious_count || 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <span className="text-xl font-black text-rose-700 mt-0.5 block">
            {summary.suspicious_count || 0}
          </span>
          <span className="text-[10px] text-rose-600 font-medium">Melanggar / Curang</span>
        </div>

        {/* Layar Terkunci */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === "locked" ? "all" : "locked")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "locked"
              ? "bg-rose-100 border-rose-400 ring-2 ring-rose-500/20"
              : summary.locked > 0
              ? "bg-rose-50 border-rose-300 animate-pulse hover:bg-rose-100/70"
              : "bg-white border-slate-200/90 hover:bg-slate-50"
          }`}
          title="Filter siswa yang saat ini layarnya terkunci"
        >
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Terkunci
          </span>
          <span className="text-xl font-black text-rose-700 mt-0.5 block">
            {summary.locked}
          </span>
          <span className="text-[10px] text-rose-600">Perlu buka kunci</span>
        </div>

        {/* Selesai / Dikumpulkan */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === "submitted" ? "all" : "submitted")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "submitted"
              ? "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500/20"
              : "bg-white border-emerald-200/90 bg-emerald-50/20 hover:bg-emerald-50/50"
          }`}
          title="Filter siswa yang sudah selesai mengumpulkan"
        >
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Selesai
          </span>
          <span className="text-xl font-black text-emerald-700 mt-0.5 block">
            {summary.submitted}
          </span>
          <span className="text-[10px] text-emerald-600/80">Sudah mengumpulkan</span>
        </div>

        {/* Belum Mulai */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === "not_started" ? "all" : "not_started")}
          className={`p-3.5 rounded-2xl border shadow-2xs transition cursor-pointer ${
            selectedFilter === "not_started"
              ? "bg-slate-200 border-slate-400 ring-2 ring-slate-400/20"
              : "bg-white border-slate-200/90 hover:bg-slate-50"
          }`}
          title="Filter siswa yang belum mulai"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Belum Mulai
          </span>
          <span className="text-xl font-black text-slate-600 mt-0.5 block">
            {summary.not_started}
          </span>
          <span className="text-[10px] text-slate-400">Belum klik mulai</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. ACTION BAR & KONTROL PENCARIAN / FILTER / TAMPILAN */}
      {/* ==================================================================== */}
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
              placeholder="Cari siswa, NISN, kelas, perangkat, IP..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Semua Status ({participants.length})</option>
            <option value="suspicious">🚨 Dicurigai Curang ({summary.suspicious_count || 0})</option>
            <option value="locked">Terkunci ({summary.locked})</option>
            <option value="in_progress">Sedang Ujian ({summary.in_progress})</option>
            <option value="submitted">Selesai ({summary.submitted})</option>
            <option value="not_started">Belum Mulai ({summary.not_started})</option>
          </select>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {summary.locked > 0 && (
            <button
              onClick={handleUnlockAll}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Buka seluruh siswa yang saat ini layarnya terkunci"
            >
              <FontAwesomeIcon icon={faLockOpen} />
              <span>Buka Kunci Semua ({summary.locked})</span>
            </button>
          )}

          {/* Toggle View Mode: Tabel vs Grid */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Tabel Proktoring Lengkap"
            >
              <FontAwesomeIcon icon={faTableList} className="text-xs" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Grid Kartu Peserta"
            >
              <FontAwesomeIcon icon={faGrip} className="text-xs" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              autoRefresh
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
            title="Pembaruan data otomatis setiap 6 detik"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-ping" : "bg-slate-300"
              }`}
            />
            <span>Auto Refresh {autoRefresh ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. TABEL PROKTORING LIVE (SAMA SEPERTI PENGAWAS RUANGAN ADMIN)       */}
      {/* ==================================================================== */}
      {viewMode === "table" ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Peserta Ujian</th>
                  <th className="px-3 py-3">Kelas & NISN</th>
                  <th className="px-4 py-3">Status Ujian</th>
                  <th className="px-3 py-3">Soal Terjawab</th>
                  <th className="px-3 py-3">Perangkat</th>
                  <th className="px-3 py-3 text-center">Koneksi & Ping</th>
                  <th className="px-4 py-3 text-right">Aksi Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <FontAwesomeIcon icon={faUsers} className="text-3xl text-slate-300 mb-2 block" />
                      <p className="font-semibold">Belum ada siswa yang cocok dengan filter</p>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((st, index) => {
                    const isLocked = st.status === "locked";
                    const isInProgress = st.status === "in_progress";
                    const isSubmitted = st.status === "submitted";
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
                        key={st.id || `not_started_${st.student_id}`}
                        className={`transition border-b border-slate-100 ${
                          isSuspicious
                            ? "bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-600 shadow-2xs font-medium"
                            : isLocked
                            ? "bg-rose-50/40 hover:bg-rose-100/50"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Nomor Urut */}
                        <td className="px-4 py-3 text-center font-black text-slate-800">
                          <span
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-black ${
                              isSuspicious
                                ? "bg-rose-200 text-rose-900 border border-rose-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {index + 1}
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
                                        setCopiedCodeId(st.id);
                                        setTimeout(() => setCopiedCodeId(null), 2000);
                                      }}
                                      className="text-[9px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1"
                                      title="Salin kode ini untuk dibagikan ke siswa"
                                    >
                                      <FontAwesomeIcon icon={copiedCodeId === st.id ? faCheck : faCopy} className="text-[8px]" />
                                      <span>{copiedCodeId === st.id ? "Tersalin!" : "Salin Kode"}</span>
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
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FontAwesomeIcon icon={faCircleCheck} />
                                  Selesai
                                </span>
                                {st.score !== undefined && st.score !== null && (
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Nilai: {st.score}
                                  </span>
                                )}
                              </div>
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
                          {st.id ? (
                            <div className="space-y-1 w-28">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span>{st.total_answered || 0} Soal</span>
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
                          {st.status !== "not_started" && (st.device_info || st.browser_info || st.ip_address) ? (
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
                          {st.id ? (
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

                        {/* Aksi Guru */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isLocked && (
                              <button
                                onClick={() => handleUnlockStudent(st)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                                title="Buka kunci siswa agar bisa melanjutkan ujian"
                              >
                                <FontAwesomeIcon icon={faLockOpen} />
                                <span>Buka Kunci</span>
                              </button>
                            )}

                            {st.id && !isSubmitted && (
                              <>
                                <button
                                  onClick={() => handleResetDevice(st)}
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

                            {!st.id && (
                              <span className="text-[10px] text-slate-400 italic">
                                Standby
                              </span>
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
      ) : (
        /* ==================================================================== */
        /* TAMPILAN GRID KARTU (MODERN KARTU SISWA)                             */
        /* ==================================================================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredParticipants.map((p) => {
            const isLocked = p.status === "locked";
            const isSubmitted = p.status === "submitted";
            const isInProgress = p.status === "in_progress";
            const isSuspicious = Boolean(p.is_suspicious || isLocked || (p.lock_count && p.lock_count > 0));

            const devName = (p.device_info || "").toLowerCase();
            const isMobile = devName.includes("hp") || devName.includes("android") || devName.includes("iphone") || devName.includes("phone");

            return (
              <div
                key={p.id || `not_started_${p.student_id}`}
                className={`p-4 rounded-3xl border transition flex flex-col justify-between space-y-3 shadow-xs ${
                  isSuspicious
                    ? "bg-rose-50/90 border-rose-400 shadow-rose-200 border-l-4 border-l-rose-600"
                    : isLocked
                    ? "bg-rose-50/80 border-rose-300"
                    : isSubmitted
                    ? "bg-white border-emerald-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {p.class_name}
                    </span>

                    {isLocked ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                        <FontAwesomeIcon icon={faLock} />
                        <span>TERKUNCI</span>
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Selesai
                      </span>
                    ) : p.status === "in_progress" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Mengerjakan
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Belum Mulai
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-900 truncate" title={p.student_name}>
                      {p.student_name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      NISN: {p.nisn || "-"}
                    </p>
                  </div>

                  {/* Perangkat & Koneksi Ringkas */}
                  {p.status !== "not_started" ? (
                    <div className="text-[10px] text-slate-600 space-y-0.5 bg-white/70 p-2 rounded-xl border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 truncate font-bold text-slate-800">
                          <FontAwesomeIcon icon={isMobile ? faMobileScreen : faLaptop} className="text-slate-500" />
                          <span className="truncate max-w-[120px]">{p.device_info || "Laptop/PC"}</span>
                        </span>
                        <span className="font-mono text-[9px] text-emerald-700 font-bold">
                          {p.ping_ms || 25} ms
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {p.browser_info || "Chrome"} &bull; {p.ip_address || "127.0.0.1"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      Belum masuk ujian
                    </div>
                  )}

                  {/* Kode Buka Kunci Siswa jika Terkunci */}
                  {isLocked && p.unlock_code && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-2 text-center">
                      <span className="text-[9px] font-bold text-amber-800 uppercase block">
                        Kode Buka Kunci Siswa:
                      </span>
                      <span className="font-mono font-black text-base text-amber-950 tracking-widest block select-all">
                        {p.unlock_code}
                      </span>
                    </div>
                  )}

                  {/* Detail Pelanggaran jika Terkunci */}
                  {isLocked && p.lock_reason && (
                    <div className="p-2 bg-rose-100 text-rose-900 rounded-xl text-[10px] font-semibold space-y-0.5">
                      <p className="font-bold flex items-center gap-1 text-rose-800">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                        <span>Melanggar {p.lock_count}x</span>
                      </p>
                      <p className="truncate text-rose-950">{p.lock_reason}</p>
                    </div>
                  )}

                  {/* Info Nilai jika Selesai */}
                  {isSubmitted && (
                    <div className="p-2 bg-emerald-50 text-emerald-900 rounded-xl text-[10px] font-bold flex items-center justify-between">
                      <span>Nilai Akhir:</span>
                      <span className="text-sm font-black text-emerald-700">{p.score ?? "-"}</span>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Guru */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  {isLocked && (
                    <button
                      onClick={() => handleUnlockStudent(p)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <FontAwesomeIcon icon={faUnlock} />
                      <span>BUKA KUNCI</span>
                    </button>
                  )}

                  {p.id ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleResetDevice(p)}
                        className="py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Gunakan jika HP/komputer siswa mati dan ingin pindah ke perangkat cadangan"
                      >
                        <span>Reset Login</span>
                      </button>

                      {!isSubmitted ? (
                        <button
                          onClick={() => handleForceSubmit(p)}
                          className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                          title="Kumpulkan ujian secara paksa"
                        >
                          <span>Selesaikan</span>
                        </button>
                      ) : (
                        <span className="py-1.5 text-center text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-xl">
                          Tersimpan
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="py-1.5 text-center text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-xl">
                      Standby (Belum Mulai)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. MODAL LAYAR PENUH TOKEN (PROJECTOR MODE)                          */}
      {/* ==================================================================== */}
      {showTokenFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-200 select-none">
          {/* Tombol Tutup */}
          <button
            onClick={() => setShowTokenFullscreen(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition cursor-pointer border border-white/20"
            title="Tutup Layar Penuh (Esc)"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>

          <div className="max-w-3xl w-full space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-widest animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Token Ulangan Harian Aktif</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {exam?.title || "Ulangan Harian"}
              </h1>
              <p className="text-sm sm:text-base text-slate-400">
                {exam?.subject_name ? `Mata Pelajaran: ${exam.subject_name}` : "Silakan masukkan token di bawah untuk mulai ujian"}
              </p>
            </div>

            {/* Display Token Raksasa */}
            <div className="p-8 sm:p-12 bg-white/5 backdrop-blur-md rounded-3xl border-2 border-white/20 shadow-2xl relative overflow-hidden">
              <span className="text-xs sm:text-sm font-bold text-indigo-300 uppercase tracking-widest block mb-2">
                KODE TOKEN UJIAN:
              </span>
              <div className="text-6xl sm:text-8xl md:text-9xl font-mono font-black tracking-widest text-amber-300 select-all drop-shadow-lg">
                {exam?.token || "-----"}
              </div>
            </div>

            {/* Countdown di Projector */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-xs sm:text-sm">
              <FontAwesomeIcon
                icon={faClock}
                className={tokenInterval > 0 && remainingSeconds <= 60 ? "text-amber-400 animate-spin" : "text-amber-300"}
              />
              {tokenInterval > 0 ? (
                <span>
                  Token otomatis berganti dalam:{" "}
                  <b className="font-mono text-amber-300 text-base sm:text-lg font-black tracking-wider ml-1">
                    {formatCountdown(remainingSeconds)}
                  </b>
                  <span className="text-xs text-indigo-200 ml-1.5 font-normal">({tokenInterval} menit)</span>
                </span>
              ) : (
                <span className="text-slate-300">
                  Mode Token: <b className="text-white">Manual</b> (Tetap selama ujian berlangsung)
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Perhatian: Siswa dilarang berpindah tab atau membuka aplikasi lain selama ujian berlangsung. Pelanggaran akan mengunci layar ujian secara otomatis.
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. MODAL PENGATURAN ANTI-KECURANGAN LIVE                             */}
      {/* ==================================================================== */}
      {showAntiCheatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pengaturan Anti-Kecurangan (Live)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ubah aturan keamanan sewaktu-waktu saat ujian sedang berjalan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAntiCheatModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                title="Tutup"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {antiCheatSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600" />
                <span>{antiCheatSuccess}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <label className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer transition select-none">
                <div className="pr-3">
                  <p className="font-bold text-slate-900">Acak Urutan Nomor Soal</p>
                  <p className="text-[10px] text-slate-500">Urutan butir soal acak otomatis berbeda antar setiap layar siswa</p>
                </div>
                <input
                  type="checkbox"
                  checked={antiCheatForm.randomize_questions}
                  onChange={(e) =>
                    setAntiCheatForm({ ...antiCheatForm, randomize_questions: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
                />
              </label>

              <label className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer transition select-none">
                <div className="pr-3">
                  <p className="font-bold text-slate-900">Acak Pilihan Opsi Jawaban (A / B / C / D / E)</p>
                  <p className="text-[10px] text-slate-500">Pilihan ganda diacak sehingga siswa sebelahan tidak bisa mencontek huruf opsi</p>
                </div>
                <input
                  type="checkbox"
                  checked={antiCheatForm.randomize_options}
                  onChange={(e) =>
                    setAntiCheatForm({ ...antiCheatForm, randomize_options: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
                />
              </label>

              <label className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer transition select-none">
                <div className="pr-3">
                  <p className="font-bold text-slate-900">Tampilkan Nilai / Skor Akhir ke Siswa</p>
                  <p className="text-[10px] text-slate-500">Siswa dapat langsung melihat skor setelah menekan tombol Selesai Ujian</p>
                </div>
                <input
                  type="checkbox"
                  checked={antiCheatForm.show_results}
                  onChange={(e) =>
                    setAntiCheatForm({ ...antiCheatForm, show_results: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
                />
              </label>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="block font-bold text-slate-900">
                  Sensitivitas Penguncian Layar Saat Pelanggaran Tab:
                </label>
                <select
                  value={antiCheatForm.max_violations}
                  onChange={(e) =>
                    setAntiCheatForm({ ...antiCheatForm, max_violations: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value={0}>0 - Nonaktifkan Penguncian (Catat log pelanggaran saja, jangan pernah kunci layar)</option>
                  <option value={1}>1x Pelanggaran - Sangat Ketat (1x pindah tab langsung terkunci)</option>
                  <option value={2}>2x Pelanggaran - Ketat (Peringatan ke-1, pelanggaran ke-2 langsung terkunci)</option>
                  <option value={3}>3x Pelanggaran - Standar Rekomendasi (Toleransi 2x, ke-3 terkunci)</option>
                  <option value={5}>5x Pelanggaran - Longgar (Toleransi tinggi untuk perangkat lab bermasalah)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Jika siswa tidak sengaja memencet notifikasi, Anda bisa memilih <b>Nonaktifkan Penguncian</b> atau menaikkan toleransi secara live tanpa perlu merestart ujian.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAntiCheatModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAntiCheat}
                disabled={antiCheatSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <FontAwesomeIcon icon={faFloppyDisk} />
                <span>{antiCheatSaving ? "Menyimpan..." : "Simpan & Terapkan Langsung"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
