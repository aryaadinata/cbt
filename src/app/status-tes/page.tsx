"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faPlay,
  faStop,
  faRotate,
  faRotateRight,
  faCopy,
  faCheck,
  faClock,
  faSliders,
  faCalendarDays,
  faUsers,
  faCircleCheck,
  faTriangleExclamation,
  faLock,
  faEye,
  faArrowLeft,
  faDesktop,
  faCirclePlay,
  faCircleStop,
  faDiagramProject,
  faCheckCircle,
  faPen,
  faFlagCheckered,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function StatusTesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("exam_id");

  const { user, token, isAdminOrStaff, isTeacher, isStudent, isLoading } = useAuth();

  // State Daftar Ujian & Ujian Terpilih
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(
    examIdParam ? parseInt(examIdParam, 10) : null
  );

  // State Detail Status Tes
  const [testStatus, setTestStatus] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State Countdown Timer Token
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [copiedToken, setCopiedToken] = useState(false);

  // State Interval Perubahan Token
  const [customInterval, setCustomInterval] = useState<number>(15);
  const [savingInterval, setSavingInterval] = useState(false);

  // Redirect jika belum login atau jika role adalah siswa
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (isStudent) {
        router.replace("/");
      }
    }
  }, [user, isLoading, isStudent, router]);

  // 1. Fetch Daftar Paket Ujian
  const fetchExams = async () => {
    if (!token) return;
    try {
      setLoadingExams(true);
      const url = isTeacher
        ? "/api/cbt-backend/api/cbt/exams?exam_type=daily"
        : "/api/cbt-backend/api/cbt/exams?exam_type=sas";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.exams || [];
        setExams(list);

        // Jika belum ada ujian yang dipilih, pilih yang pertama atau dari URL param
        if (list.length > 0) {
          const matched = examIdParam
            ? list.find((e: any) => e.id === parseInt(examIdParam, 10))
            : null;
          setSelectedExamId(matched ? matched.id : list[0].id);
        } else {
          setSelectedExamId(null);
          setTestStatus(null);
        }
      }
    } catch (e) {
      console.error("Gagal mengambil daftar ujian:", e);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExams();
    }
  }, [token, isTeacher]);

  // 2. Fetch Detail Status Tes untuk Ujian Terpilih
  const fetchTestStatus = async (examId: number, isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoadingStatus(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/exams/${examId}/test-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTestStatus(data);
        setRemainingSeconds(data.remaining_seconds || 0);
        setCustomInterval(data.token_refresh_interval ?? 15);
      }
    } catch (e) {
      console.error("Gagal mengambil status tes:", e);
    } finally {
      if (!isSilent) setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchTestStatus(selectedExamId);
    }
  }, [selectedExamId, token]);

  // 3. Interval Timer Countdown Token (Setiap 1 detik)
  useEffect(() => {
    if (!testStatus || testStatus.token_refresh_interval <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Token habis waktunya! Segarkan status secara otomatis di background
          if (selectedExamId) {
            fetchTestStatus(selectedExamId, true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testStatus?.token_refresh_interval, selectedExamId]);

  // 4. Background Polling Status Peserta (Setiap 15 detik)
  useEffect(() => {
    if (!selectedExamId) return;

    const pollInterval = setInterval(() => {
      fetchTestStatus(selectedExamId, true);
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedExamId]);

  // Handler Salin Token
  const handleCopyToken = () => {
    if (!testStatus?.token) return;
    navigator.clipboard.writeText(testStatus.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Handler Rilis Token Baru Secara Manual
  const handleRefreshToken = async () => {
    if (!selectedExamId) return;

    Swal.fire({
      title: "Rilis Token Baru?",
      text: "Token ujian saat ini akan segera diganti dengan token acak baru. Siswa yang baru mulai ujian wajib menggunakan token baru ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Rilis Token Baru",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setActionLoading(true);
          const res = await fetch(
            `/api/cbt-backend/api/cbt/exams/${selectedExamId}/refresh-token`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            Swal.fire({
              icon: "success",
              title: "Token Baru Dirilis!",
              html: `Token aktif sekarang: <b class="font-mono text-xl text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">${data.token}</b>`,
              timer: 3000,
              showConfirmButton: false,
              customClass: {
                popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
                title: "text-base font-bold text-gray-800",
              },
            });
            fetchTestStatus(selectedExamId, true);
          } else {
            Swal.fire("Gagal", data.detail || "Gagal merilis token baru.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Terjadi kesalahan koneksi server.", "error");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Handler Selesaikan Seluruh Paket Ujian dari Menu Status Tes
  const handleFinishExamPackage = async () => {
    if (!token || !selectedExamId) return;

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
        `/api/cbt-backend/api/cbt/exams/${selectedExamId}/completion-check`,
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
          <p>Anda akan menyelesaikan dan menutup paket ujian <strong>"${testStatus?.title || "Paket Ujian"}"</strong>.</p>
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
          setActionLoading(true);
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/finish-all`, {
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
            fetchTestStatus(selectedExamId, true);
          } else {
            Swal.fire("Gagal", d.detail || "Gagal menyelesaikan ujian.", "error");
          }
        } catch (err: any) {
          console.error(err);
          Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Handler Ubah Interval Token (Berapa Menit Token Berubah)
  const handleUpdateInterval = async (minutes: number) => {
    if (!selectedExamId) return;
    try {
      setSavingInterval(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/exams/${selectedExamId}/token-config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token_refresh_interval: minutes }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomInterval(minutes);
        fetchTestStatus(selectedExamId, true);
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
        });
      } else {
        alert(data.detail || "Gagal memperbarui interval token.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui interval token.");
    } finally {
      setSavingInterval(false);
    }
  };

  // Handler Waktu Refresh Token Kustom (Bebas Tentukan Menit)
  const handleSetCustomInterval = () => {
    if (!selectedExamId) return;

    Swal.fire({
      title: "Waktu Refresh Token Kustom",
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mb-2">
          <p>Tentukan interval pergantian token otomatis (dalam menit) sesuai kebutuhan Anda:</p>
          <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            💡 Masukkan angka <b>0</b> jika ingin mode <b>Manual</b> (token tidak akan otomatis berganti).
          </div>
        </div>
      `,
      input: "number",
      inputValue: testStatus?.token_refresh_interval ?? 15,
      inputPlaceholder: "Contoh: 25 (dalam menit)",
      inputAttributes: {
        min: "0",
        max: "360",
        step: "1",
      },
      showCancelButton: true,
      confirmButtonText: "Terapkan Waktu",
      cancelButtonText: "Batal",
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        input: "text-center font-mono font-bold text-base py-2",
        confirmButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
      preConfirm: (value) => {
        if (value === "" || value === null || isNaN(Number(value))) {
          Swal.showValidationMessage("Masukkan angka menit yang valid (minimal 0)!");
          return false;
        }
        const val = parseInt(value, 10);
        if (val < 0) {
          Swal.showValidationMessage("Waktu menit tidak boleh negatif!");
          return false;
        }
        return val;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value !== undefined && result.value !== null) {
        handleUpdateInterval(result.value);
      }
    });
  };

  // Handler Toggle Status Token (Aktif / Nonaktif)
  const handleToggleTokenActive = async () => {
    if (!selectedExamId || !testStatus) return;
    const nextState = !testStatus.is_token_active;

    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/exams/${selectedExamId}/token-config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_token_active: nextState }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        fetchTestStatus(selectedExamId, true);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: nextState
            ? "Token DIAKTIFKAN (Siswa wajib input token)"
            : "Token DINONAKTIFKAN (Siswa bisa langsung mulai tanpa token)",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler Custom Token Manual
  const handleSetCustomToken = () => {
    if (!selectedExamId || !testStatus) return;

    Swal.fire({
      title: "Ubah Token Ujian Manual",
      text: "Masukkan kode token kustom yang Anda inginkan (misal: CBT26):",
      input: "text",
      inputValue: testStatus.token || "",
      inputPlaceholder: "Contoh: CBT01",
      showCancelButton: true,
      confirmButtonText: "Simpan Token",
      cancelButtonText: "Batal",
      confirmButtonColor: "#4F46E5",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage("Token tidak boleh kosong!");
          return false;
        }
        return value.trim().toUpperCase();
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          setActionLoading(true);
          const res = await fetch(
            `/api/cbt-backend/api/cbt/exams/${selectedExamId}/token-config`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ token: result.value }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            Swal.fire({
              icon: "success",
              title: "Token Berhasil Diubah!",
              html: `Token aktif: <b class="font-mono text-xl text-indigo-600">${result.value}</b>`,
              timer: 2000,
              showConfirmButton: false,
            });
            fetchTestStatus(selectedExamId, true);
          } else {
            Swal.fire("Gagal", data.detail || "Gagal mengubah token.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menghubungi server.", "error");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const isDailyExam =
    testStatus?.exam_type === "daily" ||
    selectedExam?.exam_type === "daily" ||
    isTeacher;

  // Helper Format Waktu Countdown
  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Helper Format Tanggal
  const formatExamDate = (dStr: string) => {
    if (!dStr) return "-";
    try {
      const d = new Date(dStr);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dStr;
    }
  };

  // Group subjects by date and session/time into single session rows
  const groupedSessions = useMemo(() => {
    if (!testStatus?.subjects || testStatus.subjects.length === 0) return [];

    const groups: { [key: string]: any } = {};
    const sessionList = testStatus.sessions || [];

    testStatus.subjects.forEach((subj: any, index: number) => {
      let key = "";
      let sessionName = "";

      if (isDailyExam && !subj.exam_date && !subj.start_time) {
        // Daily exam without specific schedule: each mapel stands on its own
        key = `daily_${subj.id}`;
        sessionName = "Ulangan Harian";
      } else if (!subj.exam_date && !subj.start_time) {
        // Unscheduled subject
        key = `unscheduled_${subj.id}`;
        sessionName = "Belum Dijadwalkan";
      } else {
        // Scheduled: Group by exam_date and time window (start_time - end_time)
        const d = subj.exam_date || "nodate";
        const st = subj.start_time || "notime";
        const et = subj.end_time || "notime";
        key = `${d}_${st}_${et}`;

        // Find matching session in sessionList if available
        const matched = sessionList.find((s: any) => s.start_time === subj.start_time);
        if (matched) {
          sessionName = matched.session_name;
        } else if (subj.start_time && subj.end_time) {
          sessionName = `Sesi (${subj.start_time} - ${subj.end_time})`;
        } else {
          sessionName = `Sesi ${index + 1}`;
        }
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          sessionName,
          exam_date: subj.exam_date,
          start_time: subj.start_time,
          end_time: subj.end_time,
          subjects: [],
          subject_ids: [],
          target_classes_set: new Set<string>(),
          duration_minutes: subj.duration_minutes,
        };
      }

      groups[key].subjects.push(subj);
      groups[key].subject_ids.push(subj.id);

      if (Array.isArray(subj.target_classes)) {
        subj.target_classes.forEach((c: string) => groups[key].target_classes_set.add(c));
      }
    });

    return Object.values(groups).map((g: any, idx: number) => {
      const isAnyActive = g.subjects.some(
        (s: any) =>
          s.session_status === "active" ||
          s.id === testStatus.active_subject_id
      );
      const isAllCompleted =
        g.subjects.length > 0 &&
        g.subjects.every((s: any) => s.session_status === "completed");

      const targetClasses = Array.from(g.target_classes_set) as string[];

      return {
        ...g,
        sessionIndex: idx + 1,
        target_classes: targetClasses,
        isSessionActive: isAnyActive,
        isSessionCompleted: isAllCompleted,
      };
    });
  }, [testStatus, isDailyExam]);

  const activeGroupedSession = groupedSessions.find((g: any) => g.isSessionActive);

  // Handler Mulai Sesi Ujian (Start Session)
  const handleStartSession = async (sessionOrSubject: any) => {
    if (!selectedExamId) return;

    const subjectIds: number[] = sessionOrSubject.subject_ids || [sessionOrSubject.id];
    const sessionLabel = sessionOrSubject.sessionName || "Sesi Ujian";

    Swal.fire({
      title: isDailyExam && !sessionOrSubject.exam_date ? "Mulai Ulangan Harian?" : `Mulai ${sessionLabel}?`,
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <p><b>Sesi Ujian:</b> ${sessionLabel}</p>
          ${sessionOrSubject.exam_date ? `<p><b>Waktu Pelaksanaan:</b> ${formatExamDate(sessionOrSubject.exam_date)} (${sessionOrSubject.start_time || "-"} - ${sessionOrSubject.end_time || "-"} WIB)</p>` : ""}
        </div>
        <p class="text-xs text-slate-500 mt-3 text-left">
          Sesi ujian akan langsung <b>DIMULAI</b>. Siswa pada rombel/ruangan terkait dapat langsung memasukkan token aktif dan mulai mengerjakan soal.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16A34A",
      cancelButtonColor: "#64748B",
      confirmButtonText: isDailyExam && !sessionOrSubject.exam_date ? "Ya, Mulai Ulangan Sekarang" : "Ya, Mulai Sesi Sekarang",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setActionLoading(true);
          const res = await fetch(
            `/api/cbt-backend/api/cbt/exams/${selectedExamId}/start-session`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ subject_ids: subjectIds, action: "active" }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            Swal.fire({
              icon: "success",
              title: isDailyExam && !sessionOrSubject.exam_date ? "Ulangan Harian Dimulai!" : "Sesi Ujian Dimulai!",
              text: data.message,
              timer: 3000,
              showConfirmButton: false,
              customClass: {
                popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
                title: "text-base font-bold text-gray-800",
              },
            });
            fetchTestStatus(selectedExamId, true);
          } else {
            Swal.fire("Gagal", data.detail || "Gagal memulai sesi ujian.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menghubungi server.", "error");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Handler Hentikan Sesi Ujian (Stop Session)
  const handleStopSession = async (sessionOrSubject: any) => {
    if (!selectedExamId) return;

    const subjectIds: number[] = sessionOrSubject.subject_ids || [sessionOrSubject.id];
    const sessionLabel = sessionOrSubject.sessionName || "Sesi Ujian";

    Swal.fire({
      title: isDailyExam && !sessionOrSubject.exam_date ? "Selesaikan Ulangan Harian?" : `Hentikan ${sessionLabel}?`,
      html: `
        <div class="text-left text-xs text-slate-600 space-y-2 mt-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <p><b>Sesi Ujian:</b> ${sessionLabel}</p>
          ${sessionOrSubject.exam_date ? `<p><b>Waktu Pelaksanaan:</b> ${formatExamDate(sessionOrSubject.exam_date)} (${sessionOrSubject.start_time || "-"} - ${sessionOrSubject.end_time || "-"} WIB)</p>` : ""}
        </div>
        <p class="text-xs text-slate-500 mt-3 text-left">
          ${
            isDailyExam && !sessionOrSubject.exam_date
              ? `Apakah Anda yakin ingin menyelesaikan ulangan ini? Sesi pengerjaan akan dihentikan dan siswa baru tidak dapat mulai lagi.`
              : `Apakah Anda yakin ingin menghentikan / menyelesaikan sesi ujian ini? Siswa baru tidak akan dapat memulai ujian lagi.`
          }
        </p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: isDailyExam && !sessionOrSubject.exam_date ? "Ya, Selesaikan Ulangan" : "Ya, Hentikan Sesi",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
        title: "text-base font-bold text-gray-800",
        confirmButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
        cancelButton:
          "px-5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setActionLoading(true);
          const res = await fetch(
            `/api/cbt-backend/api/cbt/exams/${selectedExamId}/stop-session`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ subject_ids: subjectIds, action: "completed" }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            Swal.fire({
              icon: "success",
              title: isDailyExam && !sessionOrSubject.exam_date ? "Ulangan Harian Selesai" : "Sesi Ujian Selesai",
              text: data.message,
              timer: 2500,
              showConfirmButton: false,
              customClass: {
                popup: "rounded-2xl shadow-2xl border border-gray-100 p-5",
                title: "text-base font-bold text-gray-800",
              },
            });
            fetchTestStatus(selectedExamId, true);
          } else {
            Swal.fire("Gagal", data.detail || "Gagal menghentikan sesi.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menghubungi server.", "error");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN STATUS TES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
            title="Kembali ke Menu Utama"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-6 rounded-full inline-block ${
                  isTeacher ? "bg-emerald-600" : "bg-indigo-600"
                }`}
              />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isTeacher
                  ? "Status Tes & Token Ulangan Harian"
                  : "Pusat Status Tes & Token Ujian Sekolah"}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isTeacher
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200/60"
                }`}
              >
                {isTeacher ? "Kendali Mandiri Guru" : "Pusat Kontrol Ujian (Admin)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isTeacher
                ? "Kendalikan sesi ulangan harian Anda secara mandiri: mulai ulangan, rilis token ke siswa rombel Anda, dan pantau progres pengerjaannya."
                : "Pusat kendali sesi ujian SAS satu sekolah: aktifkan sesi ujian mata pelajaran dan rilis token resmi untuk seluruh ruangan."}
            </p>
          </div>
        </div>

        {/* Pemilih Paket Ujian & Tombol Segarkan */}
        {exams.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {isTeacher ? "Ulangan Harian:" : "Paket Ujian:"}
              </span>
              <select
                value={selectedExamId || ""}
                onChange={(e) => {
                  const newId = parseInt(e.target.value, 10);
                  setSelectedExamId(newId);
                  router.replace(`/status-tes?exam_id=${newId}`);
                }}
                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer pr-2"
                disabled={loadingExams}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => selectedExamId && fetchTestStatus(selectedExamId)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Segarkan Data Status Tes"
            >
              <FontAwesomeIcon
                icon={faRotate}
                className={`text-xs ${loadingStatus ? "animate-spin" : ""}`}
              />
            </button>

            {isAdminOrStaff && testStatus?.status === "active" && (
              <button
                type="button"
                onClick={handleFinishExamPackage}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Selesaikan & Tutup Seluruh Paket Ujian Ini"
              >
                <FontAwesomeIcon icon={faFlagCheckered} className="text-amber-600 text-xs" />
                <span className="hidden sm:inline">Selesaikan Paket Ujian</span>
              </button>
            )}
          </div>
        )}
      </div>

      {loadingExams ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center text-xs text-slate-400">
          <FontAwesomeIcon icon={faRotate} className="animate-spin text-base text-indigo-600 mb-2 block mx-auto" />
          Memuat data paket ulangan...
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-xl">
            <FontAwesomeIcon icon={faCalendarDays} />
          </div>
          <h2 className="text-base font-extrabold text-slate-800">
            {isTeacher
              ? "Belum Ada Paket Ulangan Harian"
              : "Belum Ada Paket Ujian Sekolah (SAS)"}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isTeacher
              ? "Anda belum memiliki paket ulangan harian aktif. Buat paket ulangan harian terlebih dahulu untuk mengontrol jadwal, rilis token, dan memantau siswa rombel Anda."
              : "Belum ada paket ujian sekolah (SAS) yang dibuat oleh panitia. Buat paket ujian baru di menu Manajemen Ujian."}
          </p>
          <div className="pt-2">
            <Link
              href={isTeacher ? "/ujian/buat" : "/ujian"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlay} className="text-xs" />
              <span>{isTeacher ? "Buat Ulangan Harian Baru" : "Kelola Paket Ujian"}</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* BANNER JIKA PAKET UJIAN SUDAH SELESAI / DITUTUP OLEH ADMIN */}
          {testStatus?.status === "completed" && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                  <FontAwesomeIcon icon={faFlagCheckered} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-950">
                      Seluruh Ujian Telah Selesai (Standby Mode)
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      Ujian Ditutup
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Paket ujian ini telah diselesaikan dan ditutup oleh Admin. Seluruh sesi mapel dan token berada dalam status standby menunggu pelaksanaan periode ujian selanjutnya. Semua hasil nilai dan arsip presensi tetap aman tersimpan.
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>Kelola di Menu Ujian</span>
              </Link>
            </div>
          )}

          {/* 2. GRID UTAMA: TOKEN AKTIF & SESI BERJALAN (COMPACT HEIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* ============================================================== */}
        {/* CARD 1: TOKEN UJIAN AKTIF (5/12) */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2.5">
          <div>
            {/* Header Token */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">
                  <FontAwesomeIcon icon={faKey} />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 tracking-tight">
                    Token Ujian Aktif
                  </h2>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">
                    Wajib diinput siswa saat login
                  </span>
                </div>
              </div>

              {/* Status Token Badge & Toggle */}
              <button
                type="button"
                onClick={handleToggleTokenActive}
                disabled={actionLoading}
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border transition cursor-pointer shadow-2xs ${
                  testStatus?.is_token_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
                title="Klik untuk Mengaktifkan/Menonaktifkan Token"
              >
                {testStatus?.is_token_active ? "● Aktif" : "○ Nonaktif"}
              </button>
            </div>

            {/* Display Token Ringkas */}
            <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 border border-indigo-100/90 text-center relative overflow-hidden">
              <span className="text-[9px] font-extrabold text-indigo-600 tracking-wider uppercase block">
                KODE TOKEN SAAT INI
              </span>

              <div className="flex items-center justify-center gap-2 my-0.5">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-indigo-950 select-all">
                  {testStatus?.token || "-----"}
                </span>

                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
                  title="Salin Token"
                >
                  <FontAwesomeIcon
                    icon={copiedToken ? faCheck : faCopy}
                    className="text-xs"
                  />
                </button>

                <button
                  type="button"
                  onClick={handleSetCustomToken}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
                  title="Ubah Kode Token Manual (misal CBT26)"
                >
                  <FontAwesomeIcon icon={faPen} className="text-xs" />
                </button>
              </div>

              {copiedToken && (
                <div className="text-[10px] font-bold text-emerald-600 animate-in fade-in duration-150">
                  ✓ Token berhasil disalin!
                </div>
              )}

              {/* Countdown Ticker Ringkas */}
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[10px] shadow-2xs">
                <FontAwesomeIcon
                  icon={faClock}
                  className={`text-[10px] ${
                    testStatus?.token_refresh_interval > 0
                      ? "text-indigo-600 animate-pulse"
                      : "text-slate-400"
                  }`}
                />
                {testStatus?.token_refresh_interval > 0 ? (
                  <span className="text-slate-700 font-medium">
                    Ganti otomatis dalam:{" "}
                    <b className="font-mono font-bold text-indigo-700 text-[11px]">
                      {formatCountdown(remainingSeconds)}
                    </b>
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">
                    Mode Token Manual
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pengaturan Interval Perubahan Token & Aksi */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Ubah Otomatis Setiap:
                </span>
                <button
                  type="button"
                  onClick={handleSetCustomInterval}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-1"
                  title="Atur Waktu Custom (Bebas tentukan menit)"
                >
                  <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                  <span>Waktu Custom</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    disabled={savingInterval}
                    onClick={() => handleUpdateInterval(mins)}
                    className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border ${
                      testStatus?.token_refresh_interval === mins
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  type="button"
                  disabled={savingInterval}
                  onClick={handleSetCustomInterval}
                  className={`py-1 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer border truncate ${
                    ![5, 10, 15, 20].includes(testStatus?.token_refresh_interval)
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-extrabold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="Waktu Custom (Bebas pilih menit sesuai keinginan, atau 0 untuk manual)"
                >
                  {![5, 10, 15, 20].includes(testStatus?.token_refresh_interval)
                    ? testStatus?.token_refresh_interval === 0
                      ? "0m (Manual)"
                      : `${testStatus?.token_refresh_interval}m`
                    : "Custom"}
                </button>
              </div>
            </div>

            {/* Tombol Rilis Token Baru Sekarang */}
            <button
              type="button"
              onClick={handleRefreshToken}
              disabled={actionLoading}
              className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FontAwesomeIcon
                icon={faRotateRight}
                className={`text-[10px] ${actionLoading ? "animate-spin" : ""}`}
              />
              <span>Rilis Token Baru Sekarang</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 2: SESI SEDANG AKTIF & MONITORING PESERTA (7/12) */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2.5">
          <div>
            {/* Header Sesi */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">
                  <FontAwesomeIcon icon={faDesktop} />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 tracking-tight">
                    Sesi Ujian yang Sedang Berjalan
                  </h2>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">
                    Siswa hanya dapat mengerjakan mapel pada sesi yang aktif
                  </span>
                </div>
              </div>

              {activeGroupedSession && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE BERLANGSUNG</span>
                </span>
              )}
            </div>

            {/* Kotak Info Sesi Aktif */}
            {activeGroupedSession ? (
              <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-blue-50/50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                      SESI UJIAN AKTIF:
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {activeGroupedSession.sessionName}
                      {activeGroupedSession.exam_date && (
                        <span className="text-[11px] font-bold text-slate-500 ml-1.5">
                          ({formatExamDate(activeGroupedSession.exam_date)})
                        </span>
                      )}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStopSession(activeGroupedSession)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <FontAwesomeIcon icon={faStop} className="text-[10px]" />
                    <span>{isDailyExam && !activeGroupedSession.exam_date ? "Selesai" : "Hentikan Sesi"}</span>
                  </button>
                </div>

                <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-500 font-semibold block uppercase">
                      Waktu Pelaksanaan
                    </span>
                    <span className="font-bold text-slate-800">
                      {activeGroupedSession.start_time || "-"} - {activeGroupedSession.end_time || "-"} WIB
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Sesi Sedang Berlangsung</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                <div className="w-7 h-7 rounded-lg bg-slate-200/60 text-slate-500 mx-auto flex items-center justify-center text-xs">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <h4 className="text-[11px] font-extrabold text-slate-700">
                  Belum Ada Sesi yang Sedang Berjalan
                </h4>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                  {isDailyExam
                    ? "Pilih mata pelajaran ulangan di bawah, lalu klik \"Mulai Ulangan\"."
                    : "Pilih salah satu jadwal di bawah, lalu klik \"Mulai Sesi Ujian\"."}
                </p>
              </div>
            )}
          </div>

          {/* Quick Metrics Peserta Real-time Ringkas */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Monitoring Peserta:
              </span>
              {selectedExamId && (isTeacher || isDailyExam) && (
                <Link
                  href={`/ujian/pantau/${selectedExamId}`}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faEye} className="text-[9px]" />
                  <span>Buka Meja Proktoring &rarr;</span>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <div className="p-1.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-center">
                <span className="text-[9px] font-bold text-blue-700 block uppercase">
                  Mengerjakan
                </span>
                <span className="text-base sm:text-lg font-black text-blue-900 leading-tight block">
                  {testStatus?.summary?.in_progress || 0}
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-300 text-center">
                <span className="text-[9px] font-bold text-rose-700 block uppercase">
                  Dicurigai
                </span>
                <span className="text-base sm:text-lg font-black text-rose-900 leading-tight block">
                  {testStatus?.summary?.suspicious_count || 0}
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-rose-50/60 border border-rose-200/60 text-center">
                <span className="text-[9px] font-bold text-rose-700 block uppercase">
                  Terkunci
                </span>
                <span className="text-base sm:text-lg font-black text-rose-900 leading-tight block">
                  {testStatus?.summary?.locked || 0}
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-center">
                <span className="text-[9px] font-bold text-emerald-700 block uppercase">
                  Selesai
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-900 leading-tight block">
                  {testStatus?.summary?.submitted || 0}
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] font-bold text-slate-600 block uppercase">
                  Total
                </span>
                <span className="text-base sm:text-lg font-black text-slate-800 leading-tight block">
                  {testStatus?.summary?.total_participants || 0}
                </span>
              </div>
            </div>

            {selectedExamId && (isTeacher || isDailyExam) && (
              <Link
                href={`/ujian/pantau/${selectedExamId}`}
                className="w-full mt-2.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                title="Buka Meja Proktoring & Live Monitoring Siswa Lengkap"
              >
                <FontAwesomeIcon icon={faEye} className="text-xs text-emerald-400" />
                <span>🖥️ Buka Meja Proktoring &amp; Pantau Live Siswa</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. SECTION DAFTAR JADWAL UJIAN: PILIH JADWAL UNTUK MEMULAI SESI */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  {isDailyExam ? "Daftar Ulangan & Kontrol Sesi" : "Jadwal Pelaksanaan & Kontrol Sesi"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isDailyExam
                    ? "Tekan \"Mulai Ulangan\" untuk membuka pengerjaan siswa sasaran, dan tekan \"Selesai\" untuk mengakhiri."
                    : "Pilih jadwal mata pelajaran yang akan diujikan, lalu tekan \"Mulai Sesi Ujian\""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isDailyExam && (
              <Link
                href={`/jadwal?exam_id=${selectedExamId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Atur Waktu Pelaksanaan di Menu Penjadwalan"
              >
                <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
                <span>Atur / Ubah Jadwal</span>
              </Link>
            )}

            <Link
              href={`/ujian/mapping/${selectedExamId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/70 transition cursor-pointer shadow-2xs"
              title="Atur Mapping Mata Pelajaran & Kelas Sasaran"
            >
              <FontAwesomeIcon icon={faDiagramProject} className="text-xs" />
              <span>Atur Mapping</span>
            </Link>
          </div>
        </div>

        {/* Tabel Jadwal Ujian */}
        {loadingStatus ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Memuat jadwal sesi ujian...
          </div>
        ) : !testStatus?.subjects || testStatus.subjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-lg">
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Belum Ada Sesi Ujian yang Dijadwalkan
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Paket ujian ini belum memiliki jadwal pelaksanaan sesi ujian.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href={`/jadwal?exam_id=${selectedExamId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
                <span>Atur Jadwal Ujian</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-slate-600 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-12 text-center">NO</th>
                  <th className="py-3.5 px-4">SESI UJIAN</th>
                  <th className="py-3.5 px-4">HARI &amp; TANGGAL</th>
                  <th className="py-3.5 px-4">WAKTU PELAKSANAAN</th>
                  <th className="py-3.5 px-4 text-center">STATUS SESI</th>
                  <th className="py-3.5 px-4 text-center w-48">KONTROL SESI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {groupedSessions.map((session: any, index: number) => {
                  const isScheduled = Boolean(session.exam_date && session.start_time);
                  const isSessionActive = session.isSessionActive;
                  const isSessionCompleted = session.isSessionCompleted;

                  return (
                    <tr
                      key={session.key}
                      className={`hover:bg-slate-50/70 transition ${
                        isSessionActive ? "bg-emerald-50/30 font-semibold" : ""
                      }`}
                    >
                      {/* NO */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      {/* SESI UJIAN */}
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200/70 inline-block shadow-2xs">
                          {session.sessionName}
                        </span>
                      </td>

                      {/* HARI & TANGGAL */}
                      <td className="py-3.5 px-4">
                        {isDailyExam && !isScheduled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                            <FontAwesomeIcon icon={faPlay} className="text-[9px] text-emerald-600" />
                            <span>Fleksibel Guru</span>
                          </span>
                        ) : isScheduled ? (
                          <span className="font-extrabold text-slate-800 text-xs">
                            {formatExamDate(session.exam_date)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Belum Dijadwalkan
                          </span>
                        )}
                      </td>

                      {/* WAKTU PELAKSANAAN */}
                      <td className="py-3.5 px-4">
                        {isDailyExam && !isScheduled ? (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {isSessionActive
                              ? "Sedang Berjalan"
                              : isSessionCompleted
                              ? "Selesai"
                              : "Langsung via Tombol Mulai"}
                          </span>
                        ) : isScheduled ? (
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/70 inline-block">
                            {session.start_time} - {session.end_time} WIB
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            -
                          </span>
                        )}
                      </td>

                      {/* STATUS SESI */}
                      <td className="py-3.5 px-4 text-center">
                        {isSessionActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Sedang Berlangsung</span>
                          </span>
                        ) : isSessionCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                            <FontAwesomeIcon
                              icon={faCircleCheck}
                              className="text-[10px] text-slate-400"
                            />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200/80 text-[11px] font-medium">
                            <span>Belum Dimulai</span>
                          </span>
                        )}
                      </td>

                      {/* KONTROL SESI (TOMBOL AKSI) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isSessionActive ? (
                            <button
                              type="button"
                              onClick={() => handleStopSession(session)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                              title={isDailyExam && !isScheduled ? "Selesaikan ulangan ini" : `Hentikan sesi ${session.sessionName} ini`}
                            >
                              <FontAwesomeIcon icon={faStop} className="text-[10px]" />
                              <span>{isDailyExam && !isScheduled ? "Selesai" : "Hentikan Sesi"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartSession(session)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                              title={isDailyExam && !isScheduled ? "Mulai ulangan langsung untuk siswa" : `Mulai sesi ${session.sessionName} ini`}
                            >
                              <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                              <span>
                                {isDailyExam && !isScheduled
                                  ? isSessionCompleted
                                    ? "Mulai Ulang"
                                    : "Mulai Ulangan"
                                  : isSessionCompleted
                                  ? "Mulai Ulang Sesi"
                                  : "Mulai Sesi Ujian"}
                              </span>
                            </button>
                          )}
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
      </>
      )}
    </div>
  );
}
