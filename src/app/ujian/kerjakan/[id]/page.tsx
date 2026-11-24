"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faTriangleExclamation,
  faLock,
  faCheck,
  faArrowLeft,
  faArrowRight,
  faBookmark,
  faExpand,
  faShieldHalved,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/context/AuthContext";
import { useCbtSettings } from "@/context/CbtSettingsContext";
import Swal from "sweetalert2";

interface AntiCheatConfig {
  anticheat_enabled: boolean;
  anticheat_fullscreen: boolean;
  anticheat_tab_switch: boolean;
  anticheat_window_blur: boolean;
  anticheat_block_right_click: boolean;
  anticheat_block_shortcuts: boolean;
  anticheat_block_copy_paste: boolean;
  anticheat_single_device: boolean;
  anticheat_auto_lock: boolean;
  anticheat_max_violations: number;
  anticheat_time_away_seconds: number;
}

function detectClientDevice() {
  if (typeof window === "undefined" || !navigator) {
    return { device: "Laptop/PC (Windows)", browser: "Google Chrome" };
  }
  const ua = navigator.userAgent.toLowerCase();
  let device = "Laptop/PC (Windows)";
  if (/android/i.test(ua)) {
    device = /tablet|sm-t|pad/i.test(ua) ? "Tablet (Android)" : "Smartphone (Android)";
  } else if (/iphone/i.test(ua)) {
    device = "iPhone (iOS)";
  } else if (/ipad/i.test(ua)) {
    device = "iPad (iPadOS)";
  } else if (/macintosh|mac os x/i.test(ua)) {
    device = "MacBook/iMac (macOS)";
  } else if (/linux/i.test(ua)) {
    device = "Komputer (Linux)";
  } else if (/cros/i.test(ua)) {
    device = "Chromebook (ChromeOS)";
  }

  let browser = "Google Chrome";
  if (/edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/firefox/i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Apple Safari";
  } else if (/opr|opera/i.test(ua)) {
    browser = "Opera";
  }

  return { device, browser };
}

export default function KerjakanUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = Number(resolvedParams.id);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const { settings } = useCbtSettings();

  // Konfigurasi Anti-Cheating aktif (diambil dari start-exam / Pengaturan Sistem)
  const [antiCheat, setAntiCheat] = useState<AntiCheatConfig>({
    anticheat_enabled: Boolean(settings?.anticheat_enabled ?? 1),
    anticheat_fullscreen: Boolean(settings?.anticheat_fullscreen ?? 1),
    anticheat_tab_switch: Boolean(settings?.anticheat_tab_switch ?? 1),
    anticheat_window_blur: Boolean(settings?.anticheat_window_blur ?? 1),
    anticheat_block_right_click: Boolean(settings?.anticheat_block_right_click ?? 1),
    anticheat_block_shortcuts: Boolean(settings?.anticheat_block_shortcuts ?? 1),
    anticheat_block_copy_paste: Boolean(settings?.anticheat_block_copy_paste ?? 1),
    anticheat_single_device: Boolean(settings?.anticheat_single_device ?? 1),
    anticheat_auto_lock: Boolean(settings?.anticheat_auto_lock ?? 1),
    anticheat_max_violations: Number(settings?.anticheat_max_violations ?? 3),
    anticheat_time_away_seconds: Number(settings?.anticheat_time_away_seconds ?? 5),
  });
  const [warningNotice, setWarningNotice] = useState<string | null>(null);

  // State Blackout & Time-Away Lockout
  const [isOffscreen, setIsOffscreen] = useState<boolean>(false);
  const timeAwayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOffscreenRef = useRef<boolean>(false);

  // Redirect ke login jika user belum login
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace("/login");
    }
  }, [authLoading, token, router]);

  // State Ujian
  const [examData, setExamData] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [qId: number]: { answer: string; is_doubtful: boolean } }>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // State Penguncian Anti-Kecurangan (Lock Screen)
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [lockCount, setLockCount] = useState<number>(0);
  const [unlockInputCode, setUnlockInputCode] = useState<string>("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockingWithCode, setUnlockingWithCode] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State Review Pembahasan Soal
  const [reviewQuestions, setReviewQuestions] = useState<any[] | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Ujian & Start Session
  const initExam = async () => {
    if (!token) return;
    try {
      setLoading(true);
      let deviceId = localStorage.getItem("cbt_device_id") || "dev_" + Math.random().toString(36).substring(2);
      localStorage.setItem("cbt_device_id", deviceId);
      const clientDev = detectClientDevice();

      const sId = searchParams.get("subject_id") ? Number(searchParams.get("subject_id")) : undefined;
      let savedToken = "";
      try {
        savedToken = (sId ? sessionStorage.getItem(`cbt_token_${examId}_${sId}`) : null) || sessionStorage.getItem(`cbt_token_${examId}_0`) || "";
      } catch (err) {
        // ignore storage error
      }

      const startReq = performance.now();
      const res = await fetch("/api/cbt-backend/api/cbt/student/start-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exam_id: examId,
          subject_id: sId,
          token: savedToken,
          device_id: deviceId,
          device_info: clientDev.device,
          browser_info: clientDev.browser,
        }),
      });

      const initRtt = Math.max(1, Math.round(performance.now() - startReq));
      try {
        sessionStorage.setItem("cbt_last_ping", String(initRtt));
      } catch {}

      const data = await res.json();
      if (!res.ok || !data.success) {
        await Swal.fire({
          title: "Gagal Membuka Ujian",
          text: data.detail || "Lembar ujian tidak dapat dimuat atau sesi tidak valid.",
          icon: "warning",
          iconColor: "#D97706",
          confirmButtonText: "Kembali ke Beranda",
          confirmButtonColor: "#2563EB",
          customClass: {
            popup: "rounded-3xl shadow-2xl border border-slate-100 p-6",
            title: "text-base font-extrabold text-slate-800",
            confirmButton: "px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer",
          },
        });
        router.push("/");
        return;
      }

      setExamData(data);
      const loadedQuestions: any[] = data.questions || [];
      setQuestions(loadedQuestions);
      setAnswers(data.saved_answers || {});
      setRemainingSeconds(data.remaining_seconds || 3600);

      // Pulihkan nomor soal terakhir yang dikerjakan siswa
      let resumeIdx = -1;
      const sIdKey = sId || 0;
      const storageKeyQId = `cbt_last_qid_${examId}_${sIdKey}`;
      const storageKeyIdx = `cbt_last_idx_${examId}_${sIdKey}`;

      // 1. Prioritas 1: Ambil dari localStorage (posisi persis sebelum siswa menutup tab / refresh)
      try {
        const savedQId = localStorage.getItem(storageKeyQId);
        if (savedQId) {
          const foundIdx = loadedQuestions.findIndex((q) => String(q.id) === savedQId);
          if (foundIdx >= 0) {
            resumeIdx = foundIdx;
          }
        }
        if (resumeIdx < 0) {
          const savedIdx = localStorage.getItem(storageKeyIdx);
          if (savedIdx !== null && !isNaN(Number(savedIdx))) {
            const idxNum = Number(savedIdx);
            if (idxNum >= 0 && idxNum < loadedQuestions.length) {
              resumeIdx = idxNum;
            }
          }
        }
      } catch {}

      // 2. Prioritas 2: Ambil dari server (butir soal terakhir yang dijawab di database)
      if (resumeIdx < 0 && data.last_answered_question_id) {
        const serverFoundIdx = loadedQuestions.findIndex(
          (q) => q.id === data.last_answered_question_id
        );
        if (serverFoundIdx >= 0) {
          resumeIdx = serverFoundIdx;
        }
      }

      // 3. Prioritas 3: Cari soal belum dijawab pertama (agar siswa langsung siap lanjut)
      if (resumeIdx < 0 && data.saved_answers && Object.keys(data.saved_answers).length > 0) {
        const firstUnansweredIdx = loadedQuestions.findIndex(
          (q) => !data.saved_answers[q.id]?.answer
        );
        if (firstUnansweredIdx >= 0) {
          resumeIdx = firstUnansweredIdx;
        }
      }

      if (resumeIdx > 0 && resumeIdx < loadedQuestions.length) {
        setCurrentIdx(resumeIdx);
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        Toast.fire({
          icon: "info",
          title: `Melanjutkan ujian ke Soal No. ${resumeIdx + 1}`,
        });
      }

      if (data.anticheat) {
        setAntiCheat({
          anticheat_enabled: Boolean(data.anticheat.anticheat_enabled),
          anticheat_fullscreen: Boolean(data.anticheat.anticheat_fullscreen),
          anticheat_tab_switch: Boolean(data.anticheat.anticheat_tab_switch),
          anticheat_window_blur: Boolean(data.anticheat.anticheat_window_blur),
          anticheat_block_right_click: Boolean(data.anticheat.anticheat_block_right_click),
          anticheat_block_shortcuts: Boolean(data.anticheat.anticheat_block_shortcuts),
          anticheat_block_copy_paste: Boolean(data.anticheat.anticheat_block_copy_paste),
          anticheat_single_device: Boolean(data.anticheat.anticheat_single_device),
          anticheat_auto_lock: Boolean(data.anticheat.anticheat_auto_lock),
          anticheat_max_violations: Number(data.anticheat.anticheat_max_violations ?? 3),
          anticheat_time_away_seconds: Number(data.anticheat.anticheat_time_away_seconds ?? 5),
        });
      }

      if (data.status === "locked") {
        setIsLocked(true);
      }
    } catch (e: any) {
      await Swal.fire({
        title: "Koneksi Terputus",
        text: e.message || "Gagal menghubungi server CBT. Periksa koneksi internet Anda.",
        icon: "error",
        iconColor: "#EF4444",
        confirmButtonText: "Kembali ke Beranda",
        confirmButtonColor: "#2563EB",
        customClass: {
          popup: "rounded-3xl shadow-2xl border border-slate-100 p-6",
          title: "text-base font-extrabold text-slate-800",
          confirmButton: "px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer",
        },
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      initExam();
    }
  }, [token, examId]);

  // Simpan posisi nomor soal terakhir yang sedang aktif di layar siswa
  useEffect(() => {
    if (questions.length > 0 && currentIdx >= 0 && currentIdx < questions.length) {
      const activeQ = questions[currentIdx];
      const sId = searchParams.get("subject_id") ? Number(searchParams.get("subject_id")) : 0;
      try {
        localStorage.setItem(`cbt_last_idx_${examId}_${sId}`, String(currentIdx));
        if (activeQ?.id) {
          localStorage.setItem(`cbt_last_qid_${examId}_${sId}`, String(activeQ.id));
        }
      } catch {}
    }
  }, [currentIdx, questions, examId, searchParams]);

  // 2. Countdown Timer & Sinkronisasi Sisa Waktu
  const remainingSecondsRef = useRef<number>(remainingSeconds);
  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    if (loading || isLocked) return;

    countdownTimerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [loading, isLocked]);

  // 3. Heartbeat berkala & cek status unlock pengawas (Pengukuran Ping Latensi Nyata)
  const lastPingMsRef = useRef<number>(0);

  useEffect(() => {
    if (!token || !examData?.session_id) return;

    // Ambil ping awal dari sesi sebelumnya jika ada
    try {
      const initPing = Number(sessionStorage.getItem("cbt_last_ping") || 0);
      if (initPing > 0) lastPingMsRef.current = initPing;
    } catch {}

    const sendHeartbeat = async () => {
      try {
        const clientDev = detectClientDevice();
        const currentPing = lastPingMsRef.current > 0 ? lastPingMsRef.current : 25;
        const currentConn = currentPing < 60 ? "stabil" : currentPing < 180 ? "sedang" : "lemah";

        const pingStart = performance.now();
        const res = await fetch("/api/cbt-backend/api/cbt/student/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: examData.session_id,
            remaining_seconds: remainingSecondsRef.current,
            ping_ms: currentPing,
            connection_quality: currentConn,
            device_info: clientDev.device,
            browser_info: clientDev.browser,
          }),
        });

        // Ukur Round-Trip Time (RTT) nyata dari jaringan siswa ke server CBT
        const rtt = Math.max(1, Math.round(performance.now() - pingStart));
        lastPingMsRef.current = Math.min(9999, rtt);
        try {
          sessionStorage.setItem("cbt_last_ping", String(lastPingMsRef.current));
        } catch {}

        if (res.ok) {
          const json = await res.json();
          // Jika status di-unlock oleh pengawas secara remote
          if (json.status === "in_progress" && isLocked) {
            setIsLocked(false);
            setLockReason(null);
            Swal.close();
            Swal.fire({
              title: "Ujian Dibuka Pengawas",
              text: "Pengawas telah membuka kunci ujian Anda. Silakan lanjutkan pengerjaan soal.",
              icon: "success",
              iconColor: "#059669",
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false,
              customClass: {
                popup: "rounded-3xl shadow-2xl border border-emerald-100 p-5",
                title: "text-base font-extrabold text-slate-800",
              },
            });
            requestFullscreen();
          } else if (json.status === "locked" && !isLocked) {
            setIsLocked(true);
            setLockReason(json.lock_reason);
            setLockCount(json.lock_count || 1);
            Swal.close();
          }
        }
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    };

    // Segera kirim heartbeat awal
    sendHeartbeat();

    // Jalankan interval reguler (tiap 10 detik saat pengerjaan normal, tiap 3 detik saat terkunci)
    const intervalMs = isLocked ? 3000 : 10000;
    heartbeatTimerRef.current = setInterval(sendHeartbeat, intervalMs);

    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [token, examData?.session_id, isLocked]);

  // 4. SISTEM DETEKSI ANTI-KECURANGAN (MENGHORMATI PENGATURAN SISTEM)
  const lastViolationRef = useRef<{ time: number; type: string }>({ time: 0, type: "" });

  const reportViolation = async (violationType: string) => {
    if (!token || !examData?.session_id || isLocked || !antiCheat.anticheat_enabled) return;

    // Debounce 1000ms agar event tab_switch dan window_blur tidak memicu dobel request saat berpindah tab
    const now = Date.now();
    if (now - lastViolationRef.current.time < 1000) {
      return;
    }
    lastViolationRef.current = { time: now, type: violationType };

    try {
      const res = await fetch("/api/cbt-backend/api/cbt/student/report-violation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: examData.session_id,
          violation_type: violationType,
          details: `Pelanggaran terdeteksi: ${violationType}`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setLockCount(json.lock_count || 1);
        if (json.is_locked) {
          setIsLocked(true);
          setLockReason(json.lock_reason);
          Swal.close();
        } else if (json.message) {
          setWarningNotice(json.message);
          setTimeout(() => {
            setWarningNotice((prev) => (prev === json.message ? null : prev));
          }, 8000);

          Swal.fire({
            title: `<span class="text-amber-600 font-extrabold text-lg">Peringatan Anti-Kecurangan!</span>`,
            html: `
              <div class="space-y-3 text-center text-slate-700 font-sans">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                  <span>⚠️ Pelanggaran ke-${json.lock_count || 1} dari ${antiCheat.anticheat_max_violations}</span>
                </div>
                <p class="text-xs sm:text-sm font-semibold text-slate-800">
                  ${json.message}
                </p>
                <div class="p-3 bg-amber-50/90 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                  <p class="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-800">
                    Aturan Penting:
                  </p>
                  <ul class="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                    <li>Tetap berada di halaman lembar ujian hingga selesai.</li>
                    <li>Dilarang membuka tab lain, berpindah aplikasi, atau keluar dari layar penuh.</li>
                    <li>Jika pelanggaran mencapai batas (${antiCheat.anticheat_max_violations}x), ujian akan <b>terkunci otomatis</b>.</li>
                  </ul>
                </div>
              </div>
            `,
            icon: "warning",
            iconColor: "#D97706",
            confirmButtonText: "Saya Mengerti & Lanjutkan",
            confirmButtonColor: "#D97706",
            allowOutsideClick: false,
            customClass: {
              popup: "rounded-3xl shadow-2xl border border-amber-200 p-6 max-w-md w-full",
              confirmButton: "w-full py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer mt-1",
            },
          }).then(() => {
            requestFullscreen();
          });
        }
      }
    } catch (e) {
      console.error("Gagal melapor pelanggaran:", e);
    }
  };

  // Siswa memasukkan kode buka kunci yang diberikan Pengawas Ruangan
  const handleStudentUnlockWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !examData?.session_id || !unlockInputCode.trim()) return;

    try {
      setUnlockingWithCode(true);
      setUnlockError(null);

      const res = await fetch("/api/cbt-backend/api/cbt/student/unlock-with-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: examData.session_id,
          unlock_code: unlockInputCode.trim(),
        }),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setIsLocked(false);
        setLockReason(null);
        setUnlockInputCode("");
        requestFullscreen();
        Swal.fire({
          icon: "success",
          iconColor: "#059669",
          title: "Ujian Berhasil Dibuka!",
          text: "Silakan lanjutkan pengerjaan soal ujian dengan tertib.",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
          customClass: {
            popup: "rounded-3xl shadow-2xl border border-emerald-100 p-5",
            title: "text-base font-extrabold text-slate-800",
          },
        });
      } else {
        setUnlockError(d.detail || "Kode buka kunci salah atau tidak valid. Silakan tanyakan kepada Pengawas.");
      }
    } catch (err: any) {
      setUnlockError(err.message || "Gagal memproses kode buka kunci.");
    } finally {
      setUnlockingWithCode(false);
    }
  };

  useEffect(() => {
    if (loading || isLocked || !antiCheat.anticheat_enabled) return;

    const handleAwayStart = (violationType: string) => {
      // 1. Munculkan blackout overlay seketika
      setIsOffscreen(true);
      isOffscreenRef.current = true;

      // 2. Laporkan pelanggaran ke server
      reportViolation(violationType);

      // 3. Jika kuota pelanggaran > 1 dan auto lock aktif, pasang timer time-away lockout
      if (antiCheat.anticheat_auto_lock && antiCheat.anticheat_max_violations > 1) {
        if (timeAwayTimerRef.current) clearTimeout(timeAwayTimerRef.current);
        const limitSec = Math.max(1, antiCheat.anticheat_time_away_seconds || 5);
        timeAwayTimerRef.current = setTimeout(() => {
          if (isOffscreenRef.current && !isLocked) {
            reportViolation("time_away_timeout");
          }
        }, limitSec * 1000);
      }
    };

    const handleAwayEnd = () => {
      setIsOffscreen(false);
      isOffscreenRef.current = false;
      if (timeAwayTimerRef.current) {
        clearTimeout(timeAwayTimerRef.current);
        timeAwayTimerRef.current = null;
      }
    };

    // A. Deteksi Pindah Tab (Visibility API)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (antiCheat.anticheat_tab_switch) {
          handleAwayStart("tab_switch");
        }
      } else {
        handleAwayEnd();
      }
    };

    // B. Deteksi Kehilangan Fokus Jendela / Buka Aplikasi Lain (Window Blur)
    const handleBlur = () => {
      if (antiCheat.anticheat_window_blur) {
        handleAwayStart("window_blur");
      }
    };

    const handleFocus = () => {
      handleAwayEnd();
    };

    // C. Deteksi Keluar Fullscreen
    const handleFullscreenChange = () => {
      const inFs = Boolean(document.fullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs && !isLocked && antiCheat.anticheat_fullscreen) {
        handleAwayStart("fullscreen_exit");
      } else if (inFs) {
        handleAwayEnd();
      }
    };

    // D. Blokir Shortcut Keyboard & Copy/Paste sesuai pengaturan
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (antiCheat.anticheat_block_copy_paste) {
        if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "v" || key === "x" || key === "a")) {
          e.preventDefault();
          return false;
        }
      }
      if (antiCheat.anticheat_block_shortcuts) {
        if (
          e.key === "F12" ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
          ((e.ctrlKey || e.metaKey) && (key === "u" || key === "p" || key === "s")) ||
          e.altKey ||
          e.key === "Meta"
        ) {
          e.preventDefault();
          return false;
        }
      }
    };

    // E. Blokir Klik Kanan
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // F. Blokir Copy/Cut/Paste event langsung
    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    if (antiCheat.anticheat_tab_switch) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (antiCheat.anticheat_window_blur) {
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
    }
    if (antiCheat.anticheat_fullscreen) {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
    }
    if (antiCheat.anticheat_block_shortcuts || antiCheat.anticheat_block_copy_paste) {
      window.addEventListener("keydown", handleKeyDown);
    }
    if (antiCheat.anticheat_block_right_click) {
      window.addEventListener("contextmenu", handleContextMenu);
    }
    if (antiCheat.anticheat_block_copy_paste) {
      document.addEventListener("copy", handleClipboard);
      document.addEventListener("cut", handleClipboard);
      document.addEventListener("paste", handleClipboard);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
      if (timeAwayTimerRef.current) {
        clearTimeout(timeAwayTimerRef.current);
        timeAwayTimerRef.current = null;
      }
    };
  }, [loading, isLocked, token, examData, antiCheat]);

  // Permintaan Masuk Mode Fullscreen
  const requestFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // 5. Handler Pilih Jawaban (Autosave Instan)
  const handleSelectOption = async (qId: number, optionKey: string) => {
    const isCurrentDoubtful = answers[qId]?.is_doubtful || false;
    const updated = {
      ...answers,
      [qId]: { answer: optionKey, is_doubtful: isCurrentDoubtful },
    };
    setAnswers(updated);

    // Kirim autosave ke backend
    if (token && examData?.session_id) {
      fetch("/api/cbt-backend/api/cbt/student/save-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: examData.session_id,
          question_id: qId,
          student_answer: optionKey,
          is_doubtful: isCurrentDoubtful,
        }),
      }).catch((e) => console.error("Autosave error:", e));
    }
  };

  // Toggle Ragu-ragu
  const handleToggleDoubtful = (qId: number) => {
    const current = answers[qId] || { answer: "", is_doubtful: false };
    const nextDoubtful = !current.is_doubtful;
    const updated = {
      ...answers,
      [qId]: { answer: current.answer, is_doubtful: nextDoubtful },
    };
    setAnswers(updated);

    // Toast elegan di sudut kanan atas
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: false,
      customClass: {
        popup: "rounded-2xl shadow-lg border border-slate-200 text-xs py-2 px-3 font-medium",
      },
    });

    if (nextDoubtful) {
      Toast.fire({
        icon: "warning",
        title: `Soal No. ${currentIdx + 1} ditandai Ragu-ragu`,
      });
    } else {
      Toast.fire({
        icon: "success",
        title: `Tanda Ragu-ragu No. ${currentIdx + 1} dilepas`,
      });
    }

    if (token && examData?.session_id) {
      fetch("/api/cbt-backend/api/cbt/student/save-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: examData.session_id,
          question_id: qId,
          student_answer: current.answer,
          is_doubtful: nextDoubtful,
        }),
      }).catch((e) => console.error(e));
    }
  };

  // 6. Submit Ujian
  const handleManualSubmit = async () => {
    const totalCount = questions.length;
    const answeredCount = Object.values(answers).filter((a) => a.answer).length;
    const doubtfulCount = Object.values(answers).filter((a) => a.is_doubtful).length;
    const unansweredCount = Math.max(0, totalCount - answeredCount);

    const hasWarnings = doubtfulCount > 0 || unansweredCount > 0;

    const result = await Swal.fire({
      title: `<span class="text-slate-900 font-black text-lg">Konfirmasi Selesai Ujian</span>`,
      html: `
        <div class="space-y-4 text-left font-sans text-xs">
          <p class="text-slate-600 text-center">
            Periksa ringkasan lembar jawaban Anda sebelum menyelesaikan sesi ujian:
          </p>

          <!-- 3 Kartu Metrik Jawaban -->
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div class="text-2xl font-black text-emerald-600">${answeredCount}</div>
              <div class="text-[11px] font-bold text-emerald-800 mt-0.5">Sudah Dijawab</div>
            </div>
            <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div class="text-2xl font-black text-amber-600">${doubtfulCount}</div>
              <div class="text-[11px] font-bold text-amber-800 mt-0.5">Ragu-ragu</div>
            </div>
            <div class="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <div class="text-2xl font-black text-rose-600">${unansweredCount}</div>
              <div class="text-[11px] font-bold text-rose-800 mt-0.5">Belum Dijawab</div>
            </div>
          </div>

          <!-- Alert Kotak Peringatan jika ada yang belum terjawab/ragu -->
          ${
            hasWarnings
              ? `
            <div class="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
              <p class="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                <span>⚠️ Perhatian Penting:</span>
              </p>
              <ul class="list-disc list-inside text-[11px] space-y-0.5 text-amber-900">
                ${unansweredCount > 0 ? `<li>Masih ada <b>${unansweredCount} butir soal</b> yang belum dijawab.</li>` : ""}
                ${doubtfulCount > 0 ? `<li>Masih ada <b>${doubtfulCount} butir soal</b> yang ditandai ragu-ragu.</li>` : ""}
              </ul>
              <p class="text-[10px] text-amber-700 pt-1 italic">
                Anda disarankan memeriksa kembali sebelum menekan tombol kumpulkan.
              </p>
            </div>
          `
              : `
            <div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center font-semibold">
              ✅ Luar biasa! Seluruh <b>${totalCount} butir soal</b> telah selesai Anda jawab.
            </div>
          `
          }

          <p class="text-slate-500 text-center text-[11px]">
            Setelah dikumpulkan, sesi ujian berakhir dan lembar jawaban <b>tidak dapat diubah kembali</b>.
          </p>
        </div>
      `,
      icon: hasWarnings ? "warning" : "question",
      iconColor: hasWarnings ? "#D97706" : "#059669",
      showCancelButton: true,
      confirmButtonText: "Ya, Kumpulkan Ujian",
      cancelButtonText: "Periksa Kembali Soal",
      confirmButtonColor: hasWarnings ? "#D97706" : "#059669",
      cancelButtonColor: "#64748B",
      reverseButtons: true,
      customClass: {
        popup: "rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-md w-full",
        confirmButton: "px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer",
        cancelButton: "px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer",
      },
    });

    if (result.isConfirmed) {
      await executeSubmit();
    }
  };

  const handleAutoSubmit = async () => {
    Swal.fire({
      title: `<span class="text-rose-600 font-black text-lg">Waktu Ujian Telah Habis!</span>`,
      html: `
        <div class="space-y-3 text-center text-slate-700 font-sans text-xs sm:text-sm">
          <p class="font-medium text-slate-800">
            Sesi ujian Anda telah berakhir. Sistem CBT secara otomatis mengumpulkan dan menyimpan seluruh lembar jawaban Anda ke server.
          </p>
          <div class="p-3 rounded-2xl bg-slate-100 text-slate-600 text-xs">
            Mohon menunggu sejenak, mengalihkan...
          </div>
        </div>
      `,
      icon: "info",
      iconColor: "#E11D48",
      timer: 3500,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      customClass: {
        popup: "rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-md w-full",
      },
    });

    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (!token || !examData?.session_id) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/cbt-backend/api/cbt/student/submit-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: examData.session_id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Bersihkan tracking soal terakhir di localStorage
        try {
          const sIdKey = searchParams.get("subject_id") ? Number(searchParams.get("subject_id")) : 0;
          localStorage.removeItem(`cbt_last_idx_${examId}_${sIdKey}`);
          localStorage.removeItem(`cbt_last_qid_${examId}_${sIdKey}`);
        } catch {}

        const showScore = data.score !== null && data.score !== undefined;
        const hasReview = Boolean(data.show_explanation && data.review_questions && data.review_questions.length > 0);

        if (hasReview) {
          setReviewQuestions(data.review_questions);
        }

        const swalRes = await Swal.fire({
          title: `<span class="text-emerald-600 font-black text-xl">Ujian Berhasil Dikumpulkan! 🎉</span>`,
          html: `
            <div class="space-y-4 text-center font-sans">
              <p class="text-xs sm:text-sm text-slate-600">
                Terima kasih, lembar jawaban Anda telah diterima dan tersimpan dengan aman di server CBT.
              </p>

              ${
                showScore
                  ? `
                <div class="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-xs">
                  <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Skor / Nilai Anda</div>
                  <div class="text-4xl font-black text-emerald-600 my-1">${data.score}</div>
                  <div class="text-xs text-slate-500">
                    Benar <b>${data.total_correct ?? "-"}</b> dari <b>${data.total_questions ?? questions.length}</b> butir soal
                  </div>
                </div>
              `
                  : `
                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-1">
                  <p class="font-bold text-slate-800">Status: Selesai (Submitted)</p>
                  <p class="text-[11px] text-slate-500">Hasil dan nilai ujian akan diproses serta diumumkan oleh pihak sekolah atau guru mata pelajaran.</p>
                </div>
              `
              }

              ${
                hasReview
                  ? `
                <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-900 text-xs font-semibold leading-relaxed">
                  💡 Guru mengaktifkan pembahasan soal untuk mata pelajaran ini. Anda dapat melihat kunci jawaban dan pembahasannya sekarang!
                </div>
              `
                  : ""
              }

              <div class="text-[11px] text-slate-400 font-mono">
                Waktu submit: ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
              </div>
            </div>
          `,
          icon: "success",
          iconColor: "#059669",
          showDenyButton: hasReview,
          denyButtonText: "💡 Lihat Pembahasan Soal",
          denyButtonColor: "#4F46E5",
          confirmButtonText: "Kembali ke Beranda Ujian",
          confirmButtonColor: "#059669",
          allowOutsideClick: false,
          customClass: {
            popup: "rounded-3xl shadow-2xl border border-emerald-100 p-6 max-w-md w-full",
            confirmButton: "w-full py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer",
            denyButton: "w-full py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer mb-2",
          },
        });

        if (swalRes.isDenied && hasReview) {
          setShowReviewModal(true);
        } else {
          router.push("/");
        }
      } else {
        await Swal.fire({
          title: "Gagal Mengumpulkan Ujian",
          text: data.detail || "Terjadi kendala saat mengirim lembar jawaban ke server.",
          icon: "error",
          iconColor: "#EF4444",
          confirmButtonText: "Coba Lagi",
          confirmButtonColor: "#EF4444",
          customClass: {
            popup: "rounded-3xl shadow-2xl border border-rose-100 p-6",
            title: "text-base font-extrabold text-slate-800",
            confirmButton: "px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer",
          },
        });
      }
    } catch (e: any) {
      await Swal.fire({
        title: "Koneksi Terputus",
        text: e.message || "Gagal menghubungi server ujian. Pastikan koneksi internet Anda tetap terhubung.",
        icon: "error",
        iconColor: "#EF4444",
        confirmButtonText: "Coba Lagi",
        confirmButtonColor: "#EF4444",
        customClass: {
          popup: "rounded-3xl shadow-2xl border border-rose-100 p-6",
          title: "text-base font-extrabold text-slate-800",
          confirmButton: "px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !examData) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xs">
        Mempersiapkan lembar soal ujian...
      </div>
    );
  }

  // Format Timer Jam:Menit:Detik
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${hours > 0 ? `${hours}:` : ""}${minutes < 10 ? "0" : ""}${minutes}:${
    seconds < 10 ? "0" : ""
  }${seconds}`;

  const currentQ = questions[currentIdx];
  const currentAnswer = currentQ ? answers[currentQ.id]?.answer : "";
  const isDoubtful = currentQ ? answers[currentQ.id]?.is_doubtful : false;

  return (
    <div
      className={`min-h-screen bg-slate-100 flex flex-col justify-between ${
        antiCheat.anticheat_enabled && antiCheat.anticheat_block_copy_paste ? "no-select select-none" : ""
      }`}
    >
      {/* Banner Peringatan Pelanggaran (sebelum batas kunci tercapai) */}
      {warningNotice && !isLocked && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-md z-30 animate-pulse">
          <div className="flex items-center gap-2.5 mx-auto">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
            </span>
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-100 text-sm" />
            <span className="tracking-wide">{warningNotice}</span>
          </div>
          <button
            onClick={() => setWarningNotice(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 cursor-pointer transition shrink-0"
            title="Tutup banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header Bar Ujian */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center text-sm shadow-xs shadow-indigo-500/20">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                {examData.exam_title}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                {examData.subject_name} &bull; Peserta: <b>{user?.name}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tombol Fullscreen jika proteksi fullscreen aktif & belum fullscreen */}
            {antiCheat.anticheat_enabled && antiCheat.anticheat_fullscreen && !isFullscreen && (
              <button
                onClick={requestFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer animate-pulse"
              >
                <FontAwesomeIcon icon={faExpand} className="text-xs" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>
            )}

            {/* Countdown Timer Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-xs shadow-2xs ${
                remainingSeconds < 300
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-slate-900 text-white"
              }`}
            >
              <FontAwesomeIcon icon={faClock} />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area: Soal & Navigasi */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Kolom Kiri: Lembar Soal Aktif */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              {/* Nomor Soal & Tag Ragu */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-extrabold text-slate-900">
                  Soal Nomor #{currentIdx + 1}
                </span>

                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(isDoubtful)}
                    onChange={() => handleToggleDoubtful(currentQ.id)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <span>Ragu-ragu</span>
                </label>
              </div>

              {/* Teks Pertanyaan */}
              <div className="text-sm text-slate-800 leading-relaxed font-medium space-y-4">
                <div dangerouslySetInnerHTML={{ __html: currentQ.content || currentQ.question_text || "" }} />
                {currentQ.image_url && (
                  <div className="max-w-md mx-auto my-3">
                    <img
                      src={currentQ.image_url}
                      alt="Gambar Soal"
                      className="rounded-2xl border border-slate-200 max-h-64 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Opsi Pilihan Jawaban */}
              <div
                className={`pt-2 ${
                  currentQ.layout === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                    : "space-y-2.5"
                }`}
              >
                {currentQ.options.map((opt: any, oIdx: number) => {
                  const displayLabel = opt.display_key || String.fromCharCode(65 + oIdx);
                  const isSelected = currentAnswer === opt.key;
                  return (
                    <div
                      key={opt.key || oIdx}
                      onClick={() => handleSelectOption(currentQ.id, opt.key)}
                      className={`p-3.5 rounded-2xl border text-xs sm:text-sm cursor-pointer transition flex items-center gap-3.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm shadow-indigo-300/30"
                          : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? "bg-white text-indigo-700 shadow-2xs" : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        {displayLabel}
                      </span>
                      <div className="flex-1 space-y-1">
                        <span className="leading-snug">{opt.text}</span>
                        {opt.image_url && (
                          <div className="mt-1 max-w-xs">
                            <img
                              src={opt.image_url}
                              alt="Gambar Opsi"
                              className="rounded-lg border border-slate-200 max-h-32 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-xs text-slate-400">Tidak ada soal.</div>
          )}

          {/* Tombol Navigasi Bawah */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Sebelumnya</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs shadow-indigo-300/30 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            ) : (
              <button
                onClick={handleManualSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{submitting ? "Mengumpulkan..." : "Kumpulkan Ujian"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Grid Navigasi Nomor Soal */}
        <div className="w-full md:w-80 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 self-start">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">Daftar Nomor Soal</h3>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {Object.values(answers).filter((a) => a.answer).length}/{questions.length} Terjawab
            </span>
          </div>

          {/* Grid Tombol Nomor */}
          <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const ansInfo = answers[q.id];
              const isAnswered = Boolean(ansInfo?.answer);
              const isDoubt = Boolean(ansInfo?.is_doubtful);
              const isCurrent = currentIdx === idx;

              let btnStyle = "bg-slate-100 text-slate-700 border-slate-200";
              if (isDoubt) {
                btnStyle = "bg-amber-400 text-amber-950 border-amber-500 font-bold";
              } else if (isAnswered) {
                btnStyle = "bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs";
              }

              // Label opsi yang dipilih siswa sesuai urutan tampilan pada lembar soal
              const selectedOpt = q.options?.find((o: any) => o.key === ansInfo?.answer);
              const displayedAns = selectedOpt
                ? (selectedOpt.display_key || (q.options ? String.fromCharCode(65 + q.options.indexOf(selectedOpt)) : ansInfo?.answer))
                : ansInfo?.answer;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-xl text-xs font-mono transition flex items-center justify-center border cursor-pointer relative ${btnStyle} ${
                    isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 font-black" : ""
                  }`}
                >
                  <span>{idx + 1}</span>
                  {ansInfo?.answer && !isDoubt && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center font-sans">
                      {displayedAns}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda Keterangan Warna */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-600 shrink-0" />
              <span>Sudah Terjawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-400 shrink-0" />
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-200 shrink-0" />
              <span>Belum Dijawab</span>
            </div>
          </div>

          <button
            onClick={handleManualSubmit}
            disabled={submitting}
            className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faCheck} />
            <span>Selesai &amp; Kumpulkan</span>
          </button>
        </div>
      </main>

      {/* =============================================================== */}
      {/* 2b. BLACKOUT OVERLAY SAAT KELUAR DARI JENDELA UJIAN             */}
      {/* =============================================================== */}
      {isOffscreen && !isLocked && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-100">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-rose-500/20 animate-pulse">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mb-1.5">
            Layar Ujian Disembunyikan!
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
            Anda terdeteksi keluar dari jendela lembar ujian. Seluruh konten soal disembunyikan demi keamanan.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>Segera klik kembali ke jendela ujian sebelum batas waktu toleransi berakhir ({antiCheat.anticheat_time_away_seconds}s)!</span>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 3. MODAL PENGUNCIAN ANTI-KECURANGAN (LOCKOUT OVERLAY)            */}
      {/* =============================================================== */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in select-none">
          <div className="max-w-md w-full space-y-5 bg-slate-900/90 p-8 rounded-3xl border border-rose-500/40 shadow-2xl">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-3xl bg-rose-500/30"></span>
              <div className="relative w-20 h-20 rounded-3xl bg-rose-600/20 text-rose-500 border border-rose-500/40 flex items-center justify-center text-3xl shadow-lg shadow-rose-500/20">
                <FontAwesomeIcon icon={faLock} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                <span>Pelanggaran Terdeteksi (ke-{lockCount})</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                UJIAN ANDA TERKUNCI!
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lockReason || "Terdeteksi membuka tab lain atau berpindah ke aplikasi lain di luar lembar ujian."}
              </p>
              <p className="text-[11px] text-slate-400">
                Peserta: <b className="text-slate-200">{user?.name}</b> &bull; {examData?.subject_name}
              </p>
            </div>

            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs text-slate-300 space-y-1.5 text-left">
              <p className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>Petunjuk Membuka Kunci:</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                1. Angkat tangan Anda dan minta <b>Kode Buka Kunci</b> kepada Pengawas Ruangan.<br />
                2. Masukkan kode tersebut pada kolom di bawah ini lalu tekan tombol <b>Buka Ujian</b>.
              </p>
            </div>

            {/* Form Input Kode Buka Kunci dari Pengawas */}
            <form onSubmit={handleStudentUnlockWithCode} className="space-y-3 pt-1">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Kode Buka Kunci dari Pengawas:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={unlockInputCode}
                    onChange={(e) => {
                      setUnlockInputCode(e.target.value.toUpperCase());
                      setUnlockError(null);
                    }}
                    placeholder="Contoh: 849201"
                    className="flex-1 px-4 py-2.5 bg-slate-800 border-2 border-slate-700 rounded-xl text-center text-base font-mono font-black text-amber-300 tracking-[0.2em] placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={unlockingWithCode || !unlockInputCode.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {unlockingWithCode ? "Memeriksa..." : "Buka Ujian"}
                  </button>
                </div>
              </div>

              {unlockError && (
                <div className="text-xs font-semibold text-rose-300 bg-rose-950/80 p-3 rounded-xl border border-rose-800 text-left flex items-start gap-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-400 mt-0.5 text-xs shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}
            </form>

            <div className="text-[10px] text-slate-400 font-mono">
              Atau tunggu Pengawas membuka kunci secara langsung dari layar pengawas...
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: REVIEW PEMBAHASAN SOAL & KUNCI JAWABAN                         */}
      {/* ===================================================================== */}
      {showReviewModal && reviewQuestions && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg border border-indigo-200">
                  <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Review &amp; Pembahasan Soal Ujian
                  </h3>
                  <p className="text-xs text-slate-500">
                    {examData?.title} • {reviewQuestions.length} Butir Soal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  router.push("/");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Tutup &amp; Keluar
              </button>
            </div>

            {/* List Review Soal */}
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {reviewQuestions.map((q: any, idx: number) => {
                const studentAns = answers[q.id]?.answer || null;
                const isCorrect = studentAns && studentAns === q.correct_answer;
                return (
                  <div
                    key={q.id || idx}
                    className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900">
                        Soal No. {idx + 1}
                      </span>
                      {studentAns ? (
                        isCorrect ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                            <span>Jawaban Anda Benar ({studentAns})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                            <span>Jawaban Anda: {studentAns} (Salah)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Tidak Dijawab
                        </span>
                      )}
                    </div>

                    <div
                      className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: q.question_text || "" }}
                    />

                    {/* Opsi Jawaban */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt: any) => {
                          const isCorrectOpt = opt.key === q.correct_answer;
                          const isStudentSelected = opt.key === studentAns;
                          return (
                            <div
                              key={opt.key}
                              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                                isCorrectOpt
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                                  : isStudentSelected
                                  ? "bg-rose-50 border-rose-300 text-rose-950"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                  isCorrectOpt
                                    ? "bg-emerald-600 text-white"
                                    : isStudentSelected
                                    ? "bg-rose-500 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {opt.key}
                              </span>
                              <div
                                className="flex-1"
                                dangerouslySetInnerHTML={{ __html: opt.text || "" }}
                              />
                              {isCorrectOpt && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 shrink-0">
                                  Kunci Benar
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pembahasan */}
                    {q.explanation && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-950">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900">
                          <span>💡 Pembahasan:</span>
                        </div>
                        <div
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: q.explanation }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  router.push("/");
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Selesai &amp; Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
