"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faPalette,
  faShieldHalved,
  faRotate,
  faSliders,
  faDatabase,
  faFloppyDisk,
  faRotateLeft,
  faCloudArrowUp,
  faEye,
  faCheck,
  faCircleCheck,
  faTriangleExclamation,
  faServer,
  faBolt,
  faArrowRotateRight,
  faMicrochip,
  faNetworkWired,
  faClock,
  faTag,
  faLink,
  faLock,
  faSchool,
  faBuilding,
  faCloudArrowDown,
  faDownload,
  faUpload,
  faFileZipper,
  faFileCode,
  faFolderOpen,
  faSpinner,
  faPlug,
  faUsers,
  faChalkboardUser,
  faLayerGroup,
  faExpand,
  faWindowRestore,
  faComputerMouse,
  faKeyboard,
  faCopy,
  faMobileScreen,
  faUserLock,
  faKey,
  faCheckDouble,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import {
  useCbtSettings,
  DEFAULT_CBT_SETTINGS,
  CbtSystemSettings,
  applyCbtFavicon,
  applyCbtDocumentTitle,
} from "@/context/CbtSettingsContext";

type TabType = "branding" | "anticheat" | "siak" | "operasional" | "backup";

interface SyncStatusData {
  total_classes: number;
  total_students: number;
  total_teachers: number;
  last_synced: string | null;
}

interface SiakTestResult {
  api: {
    online: boolean;
    latency_ms: number | null;
    status_code: number | null;
    url: string;
    error: string | null;
  };
  database: {
    online: boolean;
    latency_ms: number | null;
    host: string;
    port: number;
    dbname: string;
    students_count: number | null;
    teachers_count: number | null;
    classes_count: number | null;
    error: string | null;
  };
  checked_at: string;
}

interface BackupStatusData {
  database_name: string;
  database_size: string;
  tables_count: number;
  uploads_size: string;
  uploads_count: number;
  engine_version: string;
  server_time: string;
}

export default function PengaturanSistemCbtPage() {
  const { token, isAdminOrStaff } = useAuth();
  const { settings, refreshSettings, updateCbtSettings } = useCbtSettings();

  const [activeTab, setActiveTab] = useState<TabType>("branding");
  const [formData, setFormData] = useState<CbtSystemSettings>(DEFAULT_CBT_SETTINGS);
  const [siakPgPasswordInput, setSiakPgPasswordInput] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sinkronisasi SIAK states
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTestingSiak, setIsTestingSiak] = useState<boolean>(false);
  const [siakTestResult, setSiakTestResult] = useState<SiakTestResult | null>(null);

  // Server diagnostic states
  const [serverPing, setServerPing] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Backup & Restore states
  const [backupStatus, setBackupStatus] = useState<BackupStatusData | null>(null);
  const [loadingBackupStatus, setLoadingBackupStatus] = useState<boolean>(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState<boolean>(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileFaviconRef = useRef<HTMLInputElement>(null);
  const fileRestoreRef = useRef<HTMLInputElement>(null);

  // Sinkronkan formData dengan context settings
  useEffect(() => {
    if (settings) {
      setFormData({ ...DEFAULT_CBT_SETTINGS, ...settings });
      setLogoPreview(settings.logo_url || "");
      setFaviconPreview(settings.favicon_url || "");
    }
  }, [settings]);

  // Fetch status sinkronisasi lokal CBT
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/sync/status", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSyncStatus({
          total_classes: json.total_classes ?? 0,
          total_students: json.total_students ?? 0,
          total_teachers: json.total_teachers ?? 0,
          last_synced: json.last_synced ?? null,
        });
      }
    } catch (err) {
      console.error("Gagal memuat status sinkronisasi:", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "siak") {
      fetchSyncStatus();
    }
  }, [activeTab, fetchSyncStatus]);

  // Uji Koneksi SIAK (API + PostgreSQL)
  const handleTestSiak = async () => {
    if (!token) return;
    setIsTestingSiak(true);
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/settings/test-siak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siak_api_url: formData.siak_api_url,
          siak_pg_host: formData.siak_pg_host,
          siak_pg_port: Number(formData.siak_pg_port) || 5432,
          siak_pg_user: formData.siak_pg_user,
          siak_pg_password: siakPgPasswordInput || undefined,
          siak_pg_dbname: formData.siak_pg_dbname,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSiakTestResult(json);
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Menguji Koneksi",
          text: json.detail || "Tidak dapat menguji koneksi ke server SIAK.",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Gagal Terhubung",
        text: "Backend CBT tidak merespons pengujian koneksi SIAK.",
      });
    } finally {
      setIsTestingSiak(false);
    }
  };

  // Eksekusi Tarik Data dari SIAK sekarang
  const handlePullFromSiak = async () => {
    if (!token) return;
    const confirm = await Swal.fire({
      icon: "question",
      title: "Sinkronisasi Data dari SIAK?",
      html: `<p class="text-xs text-slate-600">Sistem akan menarik data sesuai cakupan yang diaktifkan (${
        [
          formData.sync_include_classes ? "Kelas" : null,
          formData.sync_include_students ? "Siswa" : null,
          formData.sync_include_teachers ? "Guru" : null,
          formData.sync_include_school_profile ? "Profil & Kop Sekolah" : null,
        ]
          .filter(Boolean)
          .join(", ") || "Tidak ada yang dipilih"
      }).</p>`,
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Tarik Sekarang",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setIsSyncing(true);
    try {
      // Simpan dulu konfigurasi sinkronisasi terbaru agar pull memakai setting terkini
      await saveSettingsInternal(false);

      const res = await fetch("/api/cbt-backend/api/cbt/sync/pull-from-siak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchSyncStatus();
        await refreshSettings();
        Swal.fire({
          icon: "success",
          title: "Sinkronisasi Berhasil!",
          text: `Berhasil menyinkronkan ${json.summary?.total_classes ?? 0} kelas, ${json.summary?.total_students ?? 0} siswa, dan ${json.summary?.total_teachers ?? 0} guru dari SIAK.`,
          timer: 2200,
          showConfirmButton: false,
        });
      } else {
        throw new Error(json.detail || "Gagal menarik data dari SIAK.");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Sinkronisasi Gagal",
        text: err.message || "Pastikan server database SIAK aktif dan konfigurasi sudah benar.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Ping Server API CBT
  const handlePingServer = useCallback(async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/settings", { cache: "no-store" });
      const elapsed = Math.round(performance.now() - start);
      setServerPing(res.ok ? elapsed : -1);
    } catch {
      setServerPing(-1);
    } finally {
      setIsPinging(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "operasional" && serverPing === null) {
      handlePingServer();
    }
  }, [activeTab, serverPing, handlePingServer]);

  // Fetch Backup Status
  const fetchBackupStatus = useCallback(async () => {
    setLoadingBackupStatus(true);
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/settings/backup/status", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setBackupStatus(json);
      }
    } catch (err) {
      console.error("Gagal memuat status cadangan CBT:", err);
    } finally {
      setLoadingBackupStatus(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "backup") {
      fetchBackupStatus();
    }
  }, [activeTab, fetchBackupStatus]);

  // Upload & Kompresi Logo via Canvas (seperti modul Sarpras/Keuangan/Perpustakaan)
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Format Tidak Sesuai",
        text: "Silakan pilih file gambar (PNG, JPG, WEBP, atau SVG).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/png", 0.9);
          setLogoPreview(dataUrl);
          setFormData((prev) => ({
            ...prev,
            logo_url: dataUrl,
            favicon_url: prev.favicon_url || dataUrl,
          }));
          if (!faviconPreview) {
            setFaviconPreview(dataUrl);
          }
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Upload Favicon
  const handleFaviconFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Format Tidak Sesuai",
        text: "Silakan pilih file gambar (PNG, ICO, SVG, atau JPG).",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFaviconPreview(dataUrl);
      setFormData((prev) => ({ ...prev, favicon_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Simpan Pengaturan ke Backend
  const saveSettingsInternal = async (showAlert = true) => {
    if (!token) return false;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        app_name: formData.app_name,
        app_tagline: formData.app_tagline,
        app_description: formData.app_description,
        logo_url: logoPreview,
        favicon_url: faviconPreview,
        copyright_text: formData.copyright_text,
        timezone: formData.timezone,
        maintenance_mode: formData.maintenance_mode ? 1 : 0,
        maintenance_message: formData.maintenance_message,
        academic_year: formData.academic_year,
        semester: formData.semester,
        default_duration_minutes: Number(formData.default_duration_minutes) || 90,
        allow_dual_login: formData.allow_dual_login ? 1 : 0,
        show_score_after_submit: formData.show_score_after_submit ? 1 : 0,
        anticheat_enabled: formData.anticheat_enabled ? 1 : 0,
        anticheat_fullscreen: formData.anticheat_fullscreen ? 1 : 0,
        anticheat_tab_switch: formData.anticheat_tab_switch ? 1 : 0,
        anticheat_window_blur: formData.anticheat_window_blur ? 1 : 0,
        anticheat_block_right_click: formData.anticheat_block_right_click ? 1 : 0,
        anticheat_block_shortcuts: formData.anticheat_block_shortcuts ? 1 : 0,
        anticheat_block_copy_paste: formData.anticheat_block_copy_paste ? 1 : 0,
        anticheat_single_device: formData.anticheat_single_device ? 1 : 0,
        anticheat_auto_lock: formData.anticheat_auto_lock ? 1 : 0,
        anticheat_max_violations: Number(formData.anticheat_max_violations) || 0,
        anticheat_time_away_seconds: Number(formData.anticheat_time_away_seconds) || 5,
        siak_api_url: formData.siak_api_url,
        siak_pg_host: formData.siak_pg_host,
        siak_pg_port: Number(formData.siak_pg_port) || 5432,
        siak_pg_user: formData.siak_pg_user,
        siak_pg_dbname: formData.siak_pg_dbname,
        sync_preserve_exam_passwords: formData.sync_preserve_exam_passwords ? 1 : 0,
        sync_include_students: formData.sync_include_students ? 1 : 0,
        sync_include_teachers: formData.sync_include_teachers ? 1 : 0,
        sync_include_classes: formData.sync_include_classes ? 1 : 0,
        sync_include_school_profile: formData.sync_include_school_profile ? 1 : 0,
      };
      if (siakPgPasswordInput.trim() !== "") {
        payload.siak_pg_password = siakPgPasswordInput;
      }

      const res = await fetch("/api/cbt-backend/api/cbt/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.detail || json.message || "Gagal menyimpan pengaturan.");
      }

      updateCbtSettings(json.settings);
      setSiakPgPasswordInput("");
      const activeIcon = faviconPreview || logoPreview || settings?.siak_logo || "";
      if (activeIcon) applyCbtFavicon(activeIcon);
      if (formData.app_name) {
        applyCbtDocumentTitle(formData.app_name, formData.app_tagline);
      }

      if (showAlert) {
        Swal.fire({
          icon: "success",
          title: "Pengaturan Tersimpan!",
          text: "Konfigurasi sistem CBT berhasil diperbarui dan langsung berlaku.",
          timer: 1700,
          showConfirmButton: false,
        });
      }
      return true;
    } catch (err: any) {
      if (showAlert) {
        Swal.fire({
          icon: "error",
          title: "Gagal Menyimpan",
          text: err.message || "Terjadi kesalahan saat menyimpan pengaturan sistem.",
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Unduh Backup (.zip)
  const handleDownloadBackup = async () => {
    if (!token) return;
    setIsDownloadingBackup(true);
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/settings/backup/download", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh berkas cadangan dari server CBT.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `backup_cbt_${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunduh Cadangan",
        text: err.message || "Terjadi kesalahan saat mengunduh cadangan CBT.",
      });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // Restore Backup (.zip / .sql)
  const handleRestoreFileSelect = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".zip") && !lower.endsWith(".sql")) {
      Swal.fire({
        icon: "warning",
        title: "Format Berkas Tidak Valid",
        text: "Pilih berkas arsip cadangan .zip atau dump PostgreSQL .sql.",
      });
      return;
    }
    setSelectedRestoreFile(file);
  };

  const handleRestoreBackup = async () => {
    if (!selectedRestoreFile || !token) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Pulihkan Database CBT?",
      html: `<p class="text-xs text-slate-600">Seluruh data bank soal, jadwal ujian, ruang, dan sesi saat ini akan <b>ditimpa</b> oleh isi file <code>${selectedRestoreFile.name}</code>. Lanjutkan?</p>`,
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Pulihkan Sekarang",
      cancelButtonText: "Batal",
    });
    if (!confirm.isConfirmed) return;

    setIsRestoring(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedRestoreFile);
      const res = await fetch("/api/cbt-backend/api/cbt/settings/backup/restore", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.detail || "Gagal memulihkan data CBT.");
      }
      setSelectedRestoreFile(null);
      await fetchBackupStatus();
      await refreshSettings();
      Swal.fire({
        icon: "success",
        title: "Pemulihan Berhasil!",
        text: json.message || "Database CBT berhasil dipulihkan.",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Pemulihan Gagal",
        text: err.message || "Terjadi kesalahan saat memulihkan data.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Preset Cepat Anti-Cheating
  const applyAntiCheatPreset = (preset: "strict" | "moderate" | "off") => {
    if (preset === "strict") {
      setFormData((prev) => ({
        ...prev,
        anticheat_enabled: 1,
        anticheat_fullscreen: 1,
        anticheat_tab_switch: 1,
        anticheat_window_blur: 1,
        anticheat_block_right_click: 1,
        anticheat_block_shortcuts: 1,
        anticheat_block_copy_paste: 1,
        anticheat_single_device: 1,
        anticheat_auto_lock: 1,
        anticheat_max_violations: 3,
        anticheat_time_away_seconds: 5,
      }));
    } else if (preset === "moderate") {
      setFormData((prev) => ({
        ...prev,
        anticheat_enabled: 1,
        anticheat_fullscreen: 0,
        anticheat_tab_switch: 1,
        anticheat_window_blur: 0,
        anticheat_block_right_click: 1,
        anticheat_block_shortcuts: 1,
        anticheat_block_copy_paste: 1,
        anticheat_single_device: 1,
        anticheat_auto_lock: 1,
        anticheat_max_violations: 5,
        anticheat_time_away_seconds: 10,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        anticheat_enabled: 0,
        anticheat_fullscreen: 0,
        anticheat_tab_switch: 0,
        anticheat_window_blur: 0,
        anticheat_block_right_click: 0,
        anticheat_block_shortcuts: 0,
        anticheat_block_copy_paste: 0,
        anticheat_single_device: 0,
        anticheat_auto_lock: 0,
      }));
    }
  };

  // Hitung skor keamanan anti-cheating untuk panel ringkasan
  const antiCheatItems: {
    key: keyof CbtSystemSettings;
    label: string;
    desc: string;
    icon: any;
    badge: string;
  }[] = [
    {
      key: "anticheat_fullscreen",
      label: "Wajib Mode Layar Penuh (Fullscreen)",
      desc: "Menampilkan tombol masuk layar penuh dan mendeteksi pelanggaran bila siswa keluar dari mode fullscreen (ESC).",
      icon: faExpand,
      badge: "Layar",
    },
    {
      key: "anticheat_tab_switch",
      label: "Deteksi Pindah Tab Browser",
      desc: "Mencatat pelanggaran secara otomatis saat siswa berpindah tab atau me-minimize peramban.",
      icon: faWindowRestore,
      badge: "Tab",
    },
    {
      key: "anticheat_window_blur",
      label: "Deteksi Pindah Aplikasi / Split-Screen",
      desc: "Mendeteksi ketika jendela ujian kehilangan fokus karena siswa membuka aplikasi lain atau notifikasi melayang.",
      icon: faTriangleExclamation,
      badge: "Fokus",
    },
    {
      key: "anticheat_block_right_click",
      label: "Blokir Klik Kanan (Context Menu)",
      desc: "Menonaktifkan klik kanan pada lembar ujian agar siswa tidak dapat membuka Inspect Element atau terjemahan.",
      icon: faComputerMouse,
      badge: "Mouse",
    },
    {
      key: "anticheat_block_shortcuts",
      label: "Blokir Shortcut Terlarang (F12, DevTools, Print)",
      desc: "Memblokir kombinasi tombol F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+P, tombol Alt, dan tombol Windows/Meta.",
      icon: faKeyboard,
      badge: "Keyboard",
    },
    {
      key: "anticheat_block_copy_paste",
      label: "Blokir Copy, Cut, Paste & Seleksi Teks",
      desc: "Mencegah siswa memblokir, menyalin teks soal (Ctrl+C/A), atau menempel jawaban dari clipboard.",
      icon: faCopy,
      badge: "Clipboard",
    },
    {
      key: "anticheat_single_device",
      label: "Kunci 1 Perangkat per Sesi (Single Device)",
      desc: "Mencegah satu akun peserta login dan mengerjakan ujian dari dua perangkat berbeda secara bersamaan.",
      icon: faMobileScreen,
      badge: "Perangkat",
    },
    {
      key: "anticheat_auto_lock",
      label: "Kunci Layar Otomatis Saat Mencapai Batas",
      desc: "Mengunci lembar ujian siswa dan menunggu buka kunci dari Pengawas saat jumlah pelanggaran mencapai batas. Jika mati, pelanggaran tetap dicatat di log tanpa mengunci layar.",
      icon: faUserLock,
      badge: "Auto-Lock",
    },
  ];

  const activeAntiCheatCount = formData.anticheat_enabled
    ? antiCheatItems.filter((item) => Boolean(formData[item.key])).length
    : 0;

  const securityLevel = !formData.anticheat_enabled
    ? { label: "Nonaktif", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
    : activeAntiCheatCount >= 7
    ? { label: "Sangat Ketat (SAS)", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" }
    : activeAntiCheatCount >= 4
    ? { label: "Sedang (Standar)", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" }
    : { label: "Minimal", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };

  if (!isAdminOrStaff) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-10 space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center text-lg">
          <FontAwesomeIcon icon={faLock} />
        </div>
        <h2 className="text-sm font-black text-slate-900">Akses Terbatas</h2>
        <p className="text-xs text-slate-500">
          Menu Pengaturan Sistem CBT hanya dapat diakses oleh Administrator / Panitia Ujian Sekolah.
        </p>
      </div>
    );
  }

  const effectiveLogo = logoPreview || settings?.siak_logo || "";
  const effectiveFavicon = faviconPreview || effectiveLogo || "";

  const tabs: { id: TabType; label: string; icon: any; badge?: string }[] = [
    { id: "branding", label: "Branding Sistem", icon: faPalette },
    {
      id: "anticheat",
      label: "Anti-Cheating",
      icon: faShieldHalved,
      badge: formData.anticheat_enabled ? `${activeAntiCheatCount}/8` : "OFF",
    },
    { id: "siak", label: "Sinkronisasi SIAK", icon: faRotate },
    { id: "operasional", label: "Operasional & Server", icon: faSliders },
    { id: "backup", label: "Cadangan & Pemulihan", icon: faDatabase },
  ];

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs text-base">
            <FontAwesomeIcon icon={faGear} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pengaturan Sistem CBT
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                  formData.maintenance_mode
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    formData.maintenance_mode ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <span>{formData.maintenance_mode ? "Mode Perbaikan" : "Aktif"}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola branding aplikasi, proteksi anti-cheating ujian, integrasi sinkronisasi SIAK, operasional server, dan cadangan database.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {activeTab === "backup" ? (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={fetchBackupStatus}
              disabled={loadingBackupStatus}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <FontAwesomeIcon
                icon={faArrowRotateRight}
                className={loadingBackupStatus ? "animate-spin text-blue-600" : ""}
              />
              <span>Segarkan Status</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => {
                refreshSettings();
                setSiakPgPasswordInput("");
              }}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => saveSettingsInternal(true)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <FontAwesomeIcon
                icon={isSaving ? faSpinner : faFloppyDisk}
                className={isSaving ? "animate-spin" : ""}
              />
              <span>{isSaving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. COMPACT TAB NAVIGATION */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-2xs flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-[11px]" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.badge === "OFF"
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KOLOM KIRI (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* =============================================================== */}
          {/* TAB 1: BRANDING SISTEM                                          */}
          {/* =============================================================== */}
          {activeTab === "branding" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FontAwesomeIcon icon={faPalette} className="text-blue-600" />
                  <span>Identitas &amp; Visual Branding Sistem CBT</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atur nama aplikasi, tagline, logo, footer, dan favicon yang tampil di Sidebar, Navbar, Tab Browser, serta Halaman Login.
                </p>
              </div>

              {/* Logo Upload */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Logo Sistem CBT</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {effectiveLogo ? (
                      <img
                        src={effectiveLogo}
                        alt="Logo CBT"
                        className="object-contain max-h-16 w-auto h-auto"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl">
                        <FontAwesomeIcon icon={faShieldHalved} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={fileLogoRef}
                        onChange={handleLogoFileSelect}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileLogoRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faCloudArrowUp} />
                        <span>Unggah Logo Baru</span>
                      </button>
                      {settings?.siak_logo && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(settings.siak_logo || "");
                            setFormData((prev) => ({ ...prev, logo_url: settings.siak_logo || "" }));
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faSchool} className="mr-1" />
                          <span>Pakai Logo SIAK</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview("");
                          setFormData((prev) => ({ ...prev, logo_url: "" }));
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faRotateLeft} className="mr-1" />
                        <span>Ikon Standar</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Format: PNG, JPG, WEBP, atau SVG. Otomatis dikompresi via Canvas (maks 400&times;400px).
                    </p>
                  </div>
                </div>
              </div>

              {/* Nama & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Sistem / Aplikasi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                      <FontAwesomeIcon icon={faTag} />
                    </div>
                    <input
                      type="text"
                      value={formData.app_name}
                      onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                      placeholder="Contoh: CBT SMAN 4 SINGARAJA"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Tagline / Subjudul</label>
                  <input
                    type="text"
                    value={formData.app_tagline}
                    onChange={(e) => setFormData({ ...formData, app_tagline: e.target.value })}
                    placeholder="Contoh: Ujian Mandiri & SAS"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Deskripsi Sistem</label>
                <textarea
                  rows={2}
                  value={formData.app_description}
                  onChange={(e) => setFormData({ ...formData, app_description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none leading-relaxed"
                />
              </div>

              {/* Footer / Copyright */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Teks Footer / Copyright</label>
                <input
                  type="text"
                  value={formData.copyright_text}
                  onChange={(e) => setFormData({ ...formData, copyright_text: e.target.value })}
                  placeholder="Contoh: Sistem CBT Ujian Sekolah Mandiri"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Favicon */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Favicon Tab Browser</label>
                  <span className="text-[11px] text-slate-400">Ikon tab browser</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    {effectiveFavicon ? (
                      <img src={effectiveFavicon} alt="Favicon" className="w-6 h-6 object-contain" />
                    ) : (
                      <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600 text-sm" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileFaviconRef}
                    onChange={handleFaviconFileSelect}
                    accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileFaviconRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Ganti Favicon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFaviconPreview(effectiveLogo);
                      setFormData((prev) => ({ ...prev, favicon_url: effectiveLogo }));
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Samakan dengan Logo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: ANTI-CHEATING (HIDUPKAN / MATIKAN PER FITUR)             */}
          {/* =============================================================== */}
          {activeTab === "anticheat" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
                    <span>Pengaturan Proteksi Anti-Cheating Ujian</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih fitur pengamanan mana saja yang ingin dihidupkan atau dimatikan pada lembar ujian peserta.
                  </p>
                </div>

                {/* Preset Cepat */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyAntiCheatPreset("strict")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
                    title="Aktifkan seluruh proteksi untuk Ujian Resmi / SAS"
                  >
                    <FontAwesomeIcon icon={faCheckDouble} className="mr-1" />
                    Ketat (SAS)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAntiCheatPreset("moderate")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition cursor-pointer"
                    title="Aktifkan proteksi dasar tanpa fullscreen wajib & tanpa window blur"
                  >
                    Sedang (UH)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAntiCheatPreset("off")}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition cursor-pointer"
                    title="Nonaktifkan semua fitur anti-cheating untuk uji coba / latihan"
                  >
                    <FontAwesomeIcon icon={faBan} className="mr-1" />
                    Matikan Semua
                  </button>
                </div>
              </div>

              {/* Master Switch Anti-Cheating */}
              <div
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  formData.anticheat_enabled
                    ? "bg-blue-50/70 border-blue-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                      formData.anticheat_enabled
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      Master Switch Sistem Anti-Cheating
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Matikan tombol ini jika ingin menonaktifkan seluruh pengawasan anti-curang secara global (cocok untuk simulasi, uji coba perangkat, atau latihan soal terbuka).
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.anticheat_enabled)}
                    onChange={(e) =>
                      setFormData({ ...formData, anticheat_enabled: e.target.checked ? 1 : 0 })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Daftar Fitur Anti-Cheating Individual */}
              <div
                className={`space-y-2.5 transition-opacity ${
                  formData.anticheat_enabled ? "opacity-100" : "opacity-50 pointer-events-none"
                }`}
              >
                {antiCheatItems.map((item) => {
                  const isOn = Boolean(formData[item.key]);
                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isOn
                          ? "bg-white border-blue-200/80 shadow-2xs"
                          : "bg-slate-50/60 border-slate-200/70"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                            isOn
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          <FontAwesomeIcon icon={item.icon} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">{item.label}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isOn
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {isOn ? "AKTIF" : "MATI"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked ? 1 : 0,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Batas Maksimal Pelanggaran */}
              <div
                className={`p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  formData.anticheat_enabled && formData.anticheat_auto_lock
                    ? "opacity-100"
                    : "opacity-50"
                }`}
              >
                <div>
                  <label className="block text-xs font-bold text-amber-950">
                    Batas Maksimal Pelanggaran Sebelum Kunci Layar
                  </label>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Jumlah toleransi peringatan (tab switch / keluar fullscreen / blur) sebelum lembar ujian dikunci otomatis. Isi <b>0</b> agar tidak pernah mengunci otomatis.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formData.anticheat_max_violations}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        anticheat_max_violations: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-20 px-3 py-2 text-xs font-mono font-black text-center rounded-xl border border-amber-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <span className="text-xs font-semibold text-amber-900">kali</span>
                </div>
              </div>

              {/* Durasi Maksimal Berada di Luar Tab (Time-Away Lockout) */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  formData.anticheat_enabled &&
                  formData.anticheat_auto_lock &&
                  formData.anticheat_max_violations > 1
                    ? "bg-rose-50/70 border-rose-200/90 opacity-100"
                    : "bg-slate-50 border-slate-200 opacity-50 pointer-events-none"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="block text-xs font-bold text-rose-950">
                      Batas Durasi di Luar Tab (Time-Away Lockout)
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold border border-rose-300">
                      Anti-Cari Jawaban di Tab Lain
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900/80 mt-1 max-w-xl">
                    Jika kuota pelanggaran &gt; 1, siswa yang meninggalkan lembar ujian lebih lama dari durasi ini akan <b>langsung dikunci otomatis seketika</b>. Mencegah siswa keluar tab sekali lalu membuka AI/Google tanpa terkunci.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    disabled={
                      !formData.anticheat_enabled ||
                      !formData.anticheat_auto_lock ||
                      formData.anticheat_max_violations <= 1
                    }
                    value={formData.anticheat_time_away_seconds ?? 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        anticheat_time_away_seconds: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-20 px-3 py-2 text-xs font-mono font-black text-center rounded-xl border border-rose-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/30 shadow-2xs"
                  />
                  <span className="text-xs font-semibold text-rose-900">detik</span>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: SINKRONISASI DENGAN SIAK                                 */}
          {/* =============================================================== */}
          {activeTab === "siak" && (
            <div className="space-y-4">
              {/* Kartu 1: Status Data Tersinkron & Tombol Tarik Langsung */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FontAwesomeIcon icon={faRotate} className="text-blue-600" />
                      <span>Sinkronisasi Data Master SIAK &rarr; CBT</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      CBT bekerja terisolasi menggunakan snapshot lokal agar ujian tidak membebani server SIAK.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePullFromSiak}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <FontAwesomeIcon icon={faRotate} className={isSyncing ? "animate-spin" : ""} />
                    <span>{isSyncing ? "Menyinkronkan..." : "Tarik Data SIAK Sekarang"}</span>
                  </button>
                </div>

                {/* Ringkasan Jumlah Data Lokal */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                      <span>KELAS</span>
                      <FontAwesomeIcon icon={faLayerGroup} className="text-blue-500" />
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      {syncStatus ? syncStatus.total_classes : "-"}
                    </p>
                    <p className="text-[10px] text-slate-400">Rombel tersinkron</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                      <span>PESERTA / SISWA</span>
                      <FontAwesomeIcon icon={faUsers} className="text-emerald-500" />
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      {syncStatus ? syncStatus.total_students : "-"}
                    </p>
                    <p className="text-[10px] text-slate-400">Siswa aktif</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                      <span>GURU / PENGAWAS</span>
                      <FontAwesomeIcon icon={faChalkboardUser} className="text-indigo-500" />
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      {syncStatus ? syncStatus.total_teachers : "-"}
                    </p>
                    <p className="text-[10px] text-slate-400">Pendidik aktif</p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                  <span>Sinkronisasi terakhir:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {syncStatus?.last_synced || "Belum pernah disinkronkan"}
                  </span>
                </div>
              </div>

              {/* Kartu 2: Konfigurasi Endpoint & Database SIAK */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FontAwesomeIcon icon={faPlug} className="text-blue-600" />
                      <span>Koneksi Server &amp; Database SIAK</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Alamat API SIAK (untuk autentikasi akun SIAK) dan koneksi PostgreSQL SIAK (untuk penarikan data master).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestSiak}
                    disabled={isTestingSiak}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <FontAwesomeIcon
                      icon={isTestingSiak ? faSpinner : faBolt}
                      className={isTestingSiak ? "animate-spin" : ""}
                    />
                    <span>{isTestingSiak ? "Menguji..." : "Uji Koneksi SIAK"}</span>
                  </button>
                </div>

                {/* Hasil Uji Koneksi Live */}
                {siakTestResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div
                      className={`p-3 rounded-xl border ${
                        siakTestResult.api.online
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/70 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>SIAK API (HTTP)</span>
                        <span className="font-mono text-[11px]">
                          {siakTestResult.api.online
                            ? `ONLINE • ${siakTestResult.api.latency_ms} ms`
                            : "OFFLINE"}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80 mt-1 truncate font-mono">
                        {siakTestResult.api.online
                          ? siakTestResult.api.url
                          : siakTestResult.api.error || "Tidak dapat dihubungi"}
                      </p>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        siakTestResult.database.online
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/70 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>PostgreSQL SIAK</span>
                        <span className="font-mono text-[11px]">
                          {siakTestResult.database.online
                            ? `TERHUBUNG • ${siakTestResult.database.latency_ms} ms`
                            : "GAGAL"}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80 mt-1">
                        {siakTestResult.database.online
                          ? `${siakTestResult.database.classes_count} kelas • ${siakTestResult.database.students_count} siswa • ${siakTestResult.database.teachers_count} guru`
                          : siakTestResult.database.error || "Koneksi ditolak"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Form Endpoint & PostgreSQL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block font-bold text-slate-700">URL API Backend SIAK</label>
                    <input
                      type="text"
                      value={formData.siak_api_url}
                      onChange={(e) => setFormData({ ...formData, siak_api_url: e.target.value })}
                      placeholder="http://127.0.0.1:5000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Host Database PostgreSQL</label>
                    <input
                      type="text"
                      value={formData.siak_pg_host}
                      onChange={(e) => setFormData({ ...formData, siak_pg_host: e.target.value })}
                      placeholder="localhost"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Port PostgreSQL</label>
                    <input
                      type="number"
                      value={formData.siak_pg_port}
                      onChange={(e) =>
                        setFormData({ ...formData, siak_pg_port: parseInt(e.target.value) || 5432 })
                      }
                      placeholder="5432"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Nama Database SIAK</label>
                    <input
                      type="text"
                      value={formData.siak_pg_dbname}
                      onChange={(e) => setFormData({ ...formData, siak_pg_dbname: e.target.value })}
                      placeholder="db_sekolah"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Username PostgreSQL</label>
                    <input
                      type="text"
                      value={formData.siak_pg_user}
                      onChange={(e) => setFormData({ ...formData, siak_pg_user: e.target.value })}
                      placeholder="postgres"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="block font-bold text-slate-700">
                      Password PostgreSQL{" "}
                      <span className="font-normal text-slate-400">
                        (Kosongkan jika tidak ingin mengubah password tersimpan)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={siakPgPasswordInput}
                      onChange={(e) => setSiakPgPasswordInput(e.target.value)}
                      placeholder={formData.siak_pg_password_set ? "•••••••• (tersimpan)" : "Masukkan password DB..."}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Kartu 3: Kebijakan & Cakupan Sinkronisasi */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Cakupan &amp; Kebijakan Sinkronisasi
                </h3>

                {[
                  {
                    key: "sync_include_classes" as keyof CbtSystemSettings,
                    label: "Sinkron Data Kelas / Rombel",
                    desc: "Memperbarui daftar rombongan belajar aktif dari SIAK.",
                  },
                  {
                    key: "sync_include_students" as keyof CbtSystemSettings,
                    label: "Sinkron Data Peserta Didik (Siswa)",
                    desc: "Menarik daftar siswa aktif beserta NIS, NISN, NIK, kelas, dan foto.",
                  },
                  {
                    key: "sync_include_teachers" as keyof CbtSystemSettings,
                    label: "Sinkron Data Pendidik (Guru & Pengawas)",
                    desc: "Menarik daftar guru aktif untuk bank soal dan penjadwalan pengawas.",
                  },
                  {
                    key: "sync_include_school_profile" as keyof CbtSystemSettings,
                    label: "Sinkron Profil Sekolah, Kop Surat & Scan TTD Kepsek",
                    desc: "Menyalin kop surat resmi dan tanda tangan Kepala Sekolah dari SIAK ke penyimpanan lokal CBT.",
                  },
                  {
                    key: "sync_preserve_exam_passwords" as keyof CbtSystemSettings,
                    label: "Pertahankan Password Kartu Login Siswa Saat Sinkron Ulang",
                    desc: "Password kartu acak siswa yang sudah dicetak tidak akan berubah saat melakukan re-sync data.",
                  },
                ].map((opt) => (
                  <div
                    key={opt.key}
                    className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                      <p className="text-[11px] text-slate-500">{opt.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[opt.key])}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [opt.key]: e.target.checked ? 1 : 0,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: OPERASIONAL & SERVER (SAMA SEPERTI MODUL LAIN)           */}
          {/* =============================================================== */}
          {activeTab === "operasional" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FontAwesomeIcon icon={faSliders} className="text-blue-600" />
                  <span>Pengaturan Operasional &amp; Status Server CBT</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Konfigurasi periode akademik, kebijakan login ujian, zona waktu, mode pemeliharaan, serta diagnosa kesehatan server.
                </p>
              </div>

              {/* Bagian 1: Pengaturan Umum Ujian */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                  <FontAwesomeIcon icon={faKey} className="text-blue-600" />
                  <span>Konfigurasi Umum Pelaksanaan Ujian</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Tahun Ajaran Aktif</label>
                    <input
                      type="text"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="2025/2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Durasi Default (Menit)</label>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={formData.default_duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_duration_minutes: parseInt(e.target.value) || 90,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Toggle Dual-Login & Tampilkan Skor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Aktifkan Dual-Login Siswa</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Siswa boleh login memakai Kartu Login lokal CBT selain akun SIAK.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.allow_dual_login)}
                        onChange={(e) =>
                          setFormData({ ...formData, allow_dual_login: e.target.checked ? 1 : 0 })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Tampilkan Nilai Setelah Submit</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pengaturan default untuk menampilkan skor otomatis setelah ujian selesai.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.show_score_after_submit)}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            show_score_after_submit: e.target.checked ? 1 : 0,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Zona Waktu & Mode Pemeliharaan */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="text-blue-600" />
                  <span>Zona Waktu &amp; Mode Pemeliharaan</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Zona Waktu Sistem (Timezone)
                  </label>
                  <select
                    value={formData.timezone || "Asia/Makassar"}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 cursor-pointer font-medium outline-none focus:border-blue-600"
                  >
                    <option value="Asia/Makassar">
                      WITA - Waktu Indonesia Tengah (Bali, NTB, NTT, Sulawesi)
                    </option>
                    <option value="Asia/Jakarta">
                      WIB - Waktu Indonesia Barat (Jawa, Sumatera, Kalbar, Kalteng)
                    </option>
                    <option value="Asia/Jayapura">
                      WIT - Waktu Indonesia Timur (Maluku, Papua)
                    </option>
                  </select>
                </div>

                {/* Mode Pemeliharaan */}
                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/60 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600" />
                        <span>Mode Pemeliharaan (Maintenance Mode)</span>
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Jika aktif, siswa dan guru tidak dapat login sementara waktu. Hanya Administrator yang tetap dapat masuk untuk perbaikan atau persiapan ujian.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.maintenance_mode)}
                        onChange={(e) =>
                          setFormData({ ...formData, maintenance_mode: e.target.checked ? 1 : 0 })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {Boolean(formData.maintenance_mode) && (
                    <div className="space-y-1 pt-1">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Pesan Pemberitahuan Pemeliharaan
                      </label>
                      <input
                        type="text"
                        value={formData.maintenance_message}
                        onChange={(e) =>
                          setFormData({ ...formData, maintenance_message: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white text-slate-800 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bagian 3: Diagnosa Server & Lingkungan */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                  <FontAwesomeIcon icon={faServer} className="text-blue-600" />
                  <span>Diagnosa Server &amp; Status Lingkungan</span>
                </h3>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base shrink-0">
                      <FontAwesomeIcon icon={faBolt} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Status Latensi API Backend CBT</h4>
                      <p className="text-[11px] text-slate-500">
                        Respon komunikasi antara antarmuka Next.js (Port 3005) dan FastAPI Python (Port 5005).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">LATENCY</span>
                      <span className="text-xs font-bold font-mono text-blue-600">
                        {isPinging
                          ? "Menguji..."
                          : serverPing !== null && serverPing >= 0
                          ? `${serverPing} ms (Sangat Cepat)`
                          : serverPing === -1
                          ? "Offline"
                          : "Normal"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePingServer}
                      disabled={isPinging}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon
                        icon={faArrowRotateRight}
                        className={isPinging ? "animate-spin" : ""}
                      />
                      <span>Uji Respon</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>FRONTEND</span>
                      <FontAwesomeIcon icon={faMicrochip} />
                    </div>
                    <span className="font-bold text-slate-800 block text-xs">Next.js 16</span>
                    <span className="text-[10px] text-slate-400 font-mono">Port 3005</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>BACKEND</span>
                      <FontAwesomeIcon icon={faServer} />
                    </div>
                    <span className="font-bold text-slate-800 block text-xs">FastAPI (Python)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Port 5005</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>DATABASE</span>
                      <FontAwesomeIcon icon={faDatabase} />
                    </div>
                    <span className="font-bold text-slate-800 block text-xs">PostgreSQL 18</span>
                    <span className="text-[10px] text-slate-400 font-mono">Port 5432 (db_cbt)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>ARSITEKTUR</span>
                      <FontAwesomeIcon icon={faNetworkWired} />
                    </div>
                    <span className="font-bold text-slate-800 block text-xs">Terisolasi</span>
                    <span className="text-[10px] text-slate-400 font-mono">Bebas Beban SIAK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: CADANGAN & PEMULIHAN (BACKUP & RESTORE)                  */}
          {/* =============================================================== */}
          {activeTab === "backup" && (
            <div className="space-y-4">
              {/* 4 Snapshot Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Basis Data</span>
                    <FontAwesomeIcon icon={faDatabase} className="text-blue-600 text-xs" />
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {loadingBackupStatus ? "..." : backupStatus?.database_size || "0 KB"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {backupStatus?.database_name || "db_cbt (Terpisah dari db_sekolah)"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Total Tabel</span>
                    <FontAwesomeIcon icon={faFileCode} className="text-indigo-500 text-xs" />
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {loadingBackupStatus ? "..." : `${backupStatus?.tables_count ?? 15} Tabel`}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Skema cbt_*</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Media Uploads</span>
                    <FontAwesomeIcon icon={faFolderOpen} className="text-amber-500 text-xs" />
                  </div>
                  <div className="text-base font-black text-slate-800">
                    {loadingBackupStatus ? "..." : backupStatus?.uploads_size || "0 KB"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {backupStatus?.uploads_count ?? 0} gambar soal &amp; aset
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Mesin Server</span>
                    <FontAwesomeIcon icon={faServer} className="text-emerald-500 text-xs" />
                  </div>
                  <div className="text-xs font-black text-slate-800 truncate mt-1">
                    {loadingBackupStatus ? "..." : backupStatus?.engine_version || "PostgreSQL 18"}
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Aktif &amp; Normal</span>
                  </p>
                </div>
              </div>

              {/* Card 1: Full Backup */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FontAwesomeIcon icon={faCloudArrowDown} className="text-blue-600" />
                      <span>Pencadangan Penuh Modul CBT (.zip)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ekspor seluruh database CBT (bank soal, ujian, jawaban siswa, jadwal, ruang, pengawas, pengaturan) beserta seluruh gambar soal dan kop surat dalam satu arsip ZIP.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    Online Backup
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    Waktu server:{" "}
                    <span className="font-mono text-slate-700 font-bold">
                      {backupStatus?.server_time || "-"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isDownloadingBackup}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={isDownloadingBackup ? faSpinner : faDownload}
                      className={isDownloadingBackup ? "animate-spin" : ""}
                    />
                    <span>
                      {isDownloadingBackup
                        ? "Membuat Arsip Cadangan..."
                        : "Unduh Cadangan Lengkap (.zip)"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 2: Restore */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FontAwesomeIcon icon={faUpload} className="text-rose-600" />
                      <span>Pemulihan Data CBT (Restore)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pulihkan basis data CBT dan berkas media soal dari arsip cadangan sebelumnya.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                    Aksi Kritis
                  </span>
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Pemulihan akan <strong>menimpa database PostgreSQL <code>db_cbt</code> saat ini</strong>. Database <code>db_sekolah</code> (SIAKAD, Keuangan, Sarpras, Perpustakaan) sepenuhnya terpisah dan tidak terpengaruh.
                  </p>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleRestoreFileSelect(f);
                  }}
                  onClick={() => fileRestoreRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50"
                      : selectedRestoreFile
                      ? "border-blue-300 bg-blue-50/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileRestoreRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleRestoreFileSelect(f);
                    }}
                    accept=".zip,.sql"
                    className="hidden"
                  />
                  {selectedRestoreFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
                        <FontAwesomeIcon icon={faFileZipper} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 break-all">
                        {selectedRestoreFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {(selectedRestoreFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-11 h-11 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-lg">
                        <FontAwesomeIcon icon={faFileZipper} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Klik untuk memilih berkas atau seret berkas cadangan ke sini
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Mendukung arsip lengkap <strong>.zip</strong> atau berkas dump PostgreSQL <strong>.sql</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRestoreBackup}
                    disabled={!selectedRestoreFile || isRestoring}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={isRestoring ? faSpinner : faUpload}
                      className={isRestoring ? "animate-spin" : ""}
                    />
                    <span>{isRestoring ? "Memulihkan..." : "Mulai Pemulihan Data"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* KOLOM KANAN (1/3): LIVE PREVIEW & RINGKASAN KONTEKSTUAL           */}
        {/* ================================================================= */}
        <div className="space-y-4">
          {activeTab === "branding" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 sticky top-20">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faEye} className="text-blue-600" />
                  <span>Pratinjau Langsung (Live Preview)</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
              </div>

              {/* Preview Header Sidebar */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Tampilan Header Sidebar:
                </span>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-2.5">
                  {effectiveLogo ? (
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img src={effectiveLogo} alt="Preview" className="max-h-7 max-w-7 object-contain" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 text-sm">
                      <FontAwesomeIcon icon={faShieldHalved} />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate uppercase">
                      {formData.app_name || "CBT SEKOLAH"}
                    </h4>
                    <p className="text-[10px] text-blue-700 font-semibold truncate">
                      {formData.app_tagline || "Ujian Mandiri & SAS"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Tab Browser */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Tampilan Tab Browser:
                </span>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                  {effectiveFavicon ? (
                    <img src={effectiveFavicon} alt="Favicon" className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600 text-xs shrink-0" />
                  )}
                  <span className="text-[11px] text-slate-700 font-medium truncate">
                    {formData.app_name || "CBT SEKOLAH"} - {formData.app_tagline || "Ujian Mandiri"}
                  </span>
                </div>
              </div>

              {/* Preview Mini Login Card */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Tampilan Header Login:
                </span>
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                  <div className="bg-white rounded-xl p-3.5 text-center space-y-1.5 shadow-md">
                    {effectiveLogo ? (
                      <img src={effectiveLogo} alt="Login Logo" className="h-9 mx-auto object-contain" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto flex items-center justify-center text-sm">
                        <FontAwesomeIcon icon={faShieldHalved} />
                      </div>
                    )}
                    <p className="text-xs font-black text-slate-900 truncate">
                      {formData.app_name || "Portal Ujian CBT"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formData.app_tagline || "Ujian Mandiri & SAS"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "anticheat" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 sticky top-20">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
                  <span>Ringkasan Proteksi Ujian</span>
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${securityLevel.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${securityLevel.dot}`} />
                  <span>{securityLevel.label}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status Global:</span>
                  <span className="font-bold text-slate-800">
                    {formData.anticheat_enabled ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Fitur Aktif:</span>
                  <span className="font-mono font-bold text-blue-700">{activeAntiCheatCount} / 8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Batas Pelanggaran:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formData.anticheat_enabled && formData.anticheat_auto_lock && formData.anticheat_max_violations > 0
                      ? `${formData.anticheat_max_violations}x (Auto-Lock)`
                      : "Tanpa Kunci Otomatis"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">Status Per Modul:</span>
                <div className="space-y-1">
                  {antiCheatItems.map((item) => {
                    const active = Boolean(formData.anticheat_enabled) && Boolean(formData[item.key]);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-50/70"
                      >
                        <span className="text-slate-600 truncate pr-2">{item.badge}</span>
                        <span
                          className={`font-bold text-[10px] ${
                            active ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {active ? "ON" : "OFF"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                Perubahan akan langsung diterapkan pada seluruh sesi ujian baru maupun saat siswa memuat ulang lembar ujian.
              </p>
            </div>
          )}

          {activeTab === "siak" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 sticky top-20">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faBuilding} className="text-blue-600" />
                  <span>Identitas Sekolah (SIAK)</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <FontAwesomeIcon icon={faLink} />
                  <span>Tersinkron</span>
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold text-slate-400 block">NAMA SEKOLAH</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {settings?.school_name || "Belum tersinkron"}
                  </p>
                  {settings?.npsn && (
                    <p className="text-[10px] font-mono text-slate-500">NPSN: {settings.npsn}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold text-slate-400 block">KEPALA SEKOLAH</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {settings?.headmaster_name || "-"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    NIP: {settings?.headmaster_nip || "-"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold text-slate-400 block">ALAMAT</span>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                    {settings?.school_address || "-"}
                    {settings?.regency ? `, ${settings.regency}` : ""}
                  </p>
                </div>

                {settings?.letterhead && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      PRATINJAU KOP SURAT DOKUMEN
                    </span>
                    <div className="p-2 rounded-xl border border-slate-200 bg-white">
                      <img
                        src={settings.letterhead}
                        alt="Kop Surat SIAK"
                        className="w-full max-h-20 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                <FontAwesomeIcon icon={faCircleCheck} className="text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Data lembaga, kop surat, dan scan TTD Kepala Sekolah dikelola terpusat di <b>Profil Sekolah SIAK</b> dan otomatis disalin lokal ke CBT.
                </span>
              </div>
            </div>
          )}

          {activeTab === "operasional" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 sticky top-20">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faServer} className="text-blue-600" />
                  <span>Pratinjau Operasional</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Live Info</span>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-900 font-semibold">Periode Aktif:</span>
                  <span className="font-bold text-blue-800">
                    {formData.academic_year} ({formData.semester})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-900 font-semibold">Zona Waktu:</span>
                  <span className="font-bold text-blue-800">
                    {formData.timezone === "Asia/Jakarta"
                      ? "WIB"
                      : formData.timezone === "Asia/Jayapura"
                      ? "WIT"
                      : "WITA"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-900 font-semibold">Metode Login:</span>
                  <span className="font-bold text-blue-800">
                    {formData.allow_dual_login ? "Dual-Login (SIAK + Kartu)" : "Hanya SIAK"}
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  formData.maintenance_mode
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>
                    {formData.maintenance_mode ? "Mode Perbaikan Aktif" : "Sistem Beroperasi Normal"}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      formData.maintenance_mode ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  {formData.maintenance_mode
                    ? formData.maintenance_message
                    : "Seluruh portal peserta, guru, dan proktor aktif melayani ujian."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 sticky top-20">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
                  <span>Panduan Cadangan CBT</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Pedoman</span>
              </div>
              <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                <p>
                  <strong>1. Sebelum &amp; Sesudah SAS:</strong> Unduh cadangan lengkap (<code>.zip</code>) sebelum ujian dimulai dan setelah seluruh sesi selesai sebagai arsip nilai resmi.
                </p>
                <p>
                  <strong>2. Konsisten Saat Ujian Berjalan:</strong> Fitur backup menggunakan <i>PostgreSQL pg_dump</i> (snapshot konsisten MVCC) sehingga aman diunduh kapan saja tanpa menghentikan server CBT.
                </p>
                <p>
                  <strong>3. Terisolasi Penuh:</strong> Arsip hanya mencakup database khusus <code>db_cbt</code> dan folder <code>uploads/</code> — terpisah penuh dari database <code>db_sekolah</code> milik SIAK &amp; modul lainnya.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
