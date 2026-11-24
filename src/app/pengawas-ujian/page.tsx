"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChalkboardUser,
  faUsers,
  faRotate,
  faCheck,
  faXmark,
  faMagnifyingGlass,
  faEnvelope,
  faIdBadge,
  faCalendarCheck,
  faShieldHalved,
  faUserCheck,
  faUserMinus,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function PengawasUjianPage() {
  const router = useRouter();
  const { user, token, isAdminOrStaff, isLoading } = useAuth();

  // State Data Guru & Pengawas
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSiak, setSyncingSiak] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // State Pencarian, Filter & Checklist
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "supervisor" | "non_supervisor">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Statistik
  const [stats, setStats] = useState({
    total: 0,
    supervisors: 0,
    nonSupervisors: 0,
  });

  // Redirect jika belum login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // 1. Fetch Daftar Guru & Status Pengawas
  const fetchCandidates = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(
        "/api/cbt-backend/api/cbt/schedule/supervisors/candidates",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.teachers || []);
        setStats({
          total: data.total || 0,
          supervisors: data.total_supervisors || 0,
          nonSupervisors: data.total_non_supervisors || 0,
        });
      }
    } catch (e) {
      console.error("Gagal memuat kandidat pengawas ujian:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdminOrStaff) {
      fetchCandidates();
    }
  }, [token, isAdminOrStaff]);

  // 2. Toggle Status Pengawas Per Guru
  const handleToggleSupervisor = async (teacher: any) => {
    if (!token) return;
    const targetStatus = !teacher.is_supervisor;

    try {
      setTogglingId(teacher.id);

      // Optimistic update di UI
      setCandidates((prev) =>
        prev.map((t) =>
          t.id === teacher.id
            ? { ...t, is_supervisor: targetStatus ? 1 : 0 }
            : t
        )
      );

      const res = await fetch(
        "/api/cbt-backend/api/cbt/schedule/supervisors/toggle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacher_id: teacher.id,
            is_supervisor: targetStatus,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: targetStatus ? "success" : "info",
          title: data.message,
          showConfirmButton: false,
          timer: 2500,
        });
        fetchCandidates();
      } else {
        // Rollback jika gagal
        fetchCandidates();
        Swal.fire("Gagal", data.detail || "Gagal mengubah status pengawas.", "error");
      }
    } catch (e) {
      console.error(e);
      fetchCandidates();
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // 3. Batch Action: Pilih Terpilih Jadi Pengawas
  const handleBatchSetSelected = async (makeSupervisor: boolean) => {
    if (!token || selectedIds.length === 0) return;

    try {
      setBatchProcessing(true);
      // Hitung daftar ID pengawas baru
      let newSupervisorIds: number[];
      if (makeSupervisor) {
        const currentSupervisors = candidates
          .filter((c) => c.is_supervisor === 1)
          .map((c) => c.id);
        newSupervisorIds = Array.from(new Set([...currentSupervisors, ...selectedIds]));
      } else {
        const removeSet = new Set(selectedIds);
        newSupervisorIds = candidates
          .filter((c) => c.is_supervisor === 1 && !removeSet.has(c.id))
          .map((c) => c.id);
      }

      const res = await fetch(
        "/api/cbt-backend/api/cbt/schedule/supervisors/batch-select",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacher_ids: newSupervisorIds,
            action: "set_selected",
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIds([]);
        fetchCandidates();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: makeSupervisor
            ? `${selectedIds.length} Guru berhasil ditetapkan sebagai Pengawas!`
            : `Status Pengawas untuk ${selectedIds.length} Guru berhasil dicabut!`,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal memperbarui status pengawas.", "error");
      }
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setBatchProcessing(false);
    }
  };

  // 4. Batch Action: Jadikan Semua Guru Sebagai Pengawas
  const handleSetAllSupervisors = () => {
    Swal.fire({
      title: "Jadikan Semua Sebagai Pengawas?",
      text: `Apakah Anda yakin ingin menetapkan seluruh ${candidates.length} guru dari SIAK sebagai Pengawas Ujian?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Tetapkan Semua",
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
          setBatchProcessing(true);
          const res = await fetch(
            "/api/cbt-backend/api/cbt/schedule/supervisors/batch-select",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action: "set_all" }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            setSelectedIds([]);
            fetchCandidates();
            Swal.fire({
              icon: "success",
              title: "Berhasil!",
              text: data.message,
              timer: 2500,
              showConfirmButton: false,
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setBatchProcessing(false);
        }
      }
    });
  };

  // 5. Batch Action: Kosongkan Seluruh Pengawas
  const handleClearAllSupervisors = () => {
    Swal.fire({
      title: "Kosongkan Seluruh Pengawas?",
      text: "Apakah Anda yakin ingin mencabut seluruh status Pengawas Ujian? Tidak ada guru yang akan ditetapkan sebagai pengawas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Kosongkan",
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
          setBatchProcessing(true);
          const res = await fetch(
            "/api/cbt-backend/api/cbt/schedule/supervisors/batch-select",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action: "clear_all" }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            setSelectedIds([]);
            fetchCandidates();
            Swal.fire({
              icon: "success",
              title: "Dikosongkan",
              text: data.message,
              timer: 2500,
              showConfirmButton: false,
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setBatchProcessing(false);
        }
      }
    });
  };

  // 6. Sinkron Data Guru Langsung dari SIAK
  const handleSyncFromSiak = async () => {
    try {
      setSyncingSiak(true);
      const res = await fetch("/api/cbt-backend/api/cbt/sync/pull-from-siak", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchCandidates();
        Swal.fire({
          icon: "success",
          title: "Sinkronisasi Berhasil!",
          text: `Data guru dan snapshot SIAK berhasil diperbarui (${data.summary?.total_teachers || 0} guru tersinkron).`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal sinkron data SIAK.", "error");
      }
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Gagal menghubungi server SIAK.", "error");
    } finally {
      setSyncingSiak(false);
    }
  };

  // Filter Data Guru
  const filteredCandidates = candidates.filter((tch) => {
    // Filter status
    if (statusFilter === "supervisor" && tch.is_supervisor !== 1) return false;
    if (statusFilter === "non_supervisor" && tch.is_supervisor === 1) return false;

    // Filter pencarian
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tch.name?.toLowerCase().includes(query) ||
      tch.nip?.toLowerCase().includes(query) ||
      tch.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN PENGAWAS UJIAN */}
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
                Pengawas Ujian
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {stats.supervisors} dari {stats.total} Guru Terpilih
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola data guru sesuai data SIAK dan tentukan siapa saja yang ditugaskan sebagai pengawas ujian
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            disabled={syncingSiak}
            onClick={handleSyncFromSiak}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Tarik & Perbarui Data Guru dari Database SIAK"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`text-xs text-blue-600 ${syncingSiak ? "animate-spin" : ""}`}
            />
            <span>{syncingSiak ? "Menyinkronkan..." : "Sinkron Data SIAK"}</span>
          </button>

          <button
            type="button"
            onClick={fetchCandidates}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Perbarui Tampilan"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`text-xs ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* BANNER STATUS SIAGA KETIKA TER-RESET */}
      {stats.supervisors === 0 && !loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 text-lg mt-0.5 sm:mt-0">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Status Siaga (Standby)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Daftar Pengawas Siap Ditetapkan
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Seluruh pengawas terpilih telah diarsipkan dan di-reset setelah paket ujian sebelumnya selesai. Silakan centang guru-guru yang akan bertugas pada periode ujian berikutnya atau klik <b>"Tetapkan Semua Guru Jadi Pengawas"</b>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSetAllSupervisors}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
          >
            <FontAwesomeIcon icon={faUserCheck} className="text-xs" />
            <span>Tetapkan Semua Guru</span>
          </button>
        </div>
      )}

      {/* 2. RINGKASAN STATISTIK CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Guru SIAK */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-base">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Guru SIAK
            </div>
            <div className="text-xl font-black text-slate-900 leading-tight">
              {stats.total} <span className="text-xs font-semibold text-slate-500">Guru</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pengawas Ujian Terpilih */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-3 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-base">
            <FontAwesomeIcon icon={faUserCheck} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Pengawas Ujian Terpilih
            </div>
            <div className="text-xl font-black text-emerald-900 leading-tight">
              {stats.supervisors} <span className="text-xs font-semibold text-emerald-700">Guru</span>
            </div>
          </div>
        </div>

        {/* Card 3: Guru Non-Pengawas */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-base">
            <FontAwesomeIcon icon={faUserMinus} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Bukan Pengawas
            </div>
            <div className="text-xl font-black text-slate-700 leading-tight">
              {stats.nonSupervisors} <span className="text-xs font-semibold text-slate-400">Guru</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR PENCARIAN, FILTER & AKSI MASSAL */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Kolom Kiri: Search Input */}
          <div className="relative flex-1 max-w-md">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, atau email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          {/* Kolom Kanan: Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("supervisor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "supervisor"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Pengawas ({stats.supervisors})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("non_supervisor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === "non_supervisor"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bukan Pengawas ({stats.nonSupervisors})
            </button>
          </div>
        </div>

        {/* Toolbar Baris 2: Seleksi Checklist Massal & Quick Action */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const ids = filteredCandidates.map((c) => c.id);
                setSelectedIds(ids);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Pilih Semua di Filter Ini ({filteredCandidates.length})
            </button>
            {selectedIds.length > 0 && (
              <>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Batal Pilih ({selectedIds.length} Terpilih)
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length > 0 ? (
              <>
                <button
                  type="button"
                  disabled={batchProcessing}
                  onClick={() => handleBatchSetSelected(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  <span>Jadikan Pengawas ({selectedIds.length})</span>
                </button>
                <button
                  type="button"
                  disabled={batchProcessing}
                  onClick={() => handleBatchSetSelected(false)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-xs" />
                  <span>Cabut Status ({selectedIds.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={batchProcessing || candidates.length === 0}
                  onClick={handleSetAllSupervisors}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Tetapkan Semua Guru Jadi Pengawas
                </button>
                <button
                  type="button"
                  disabled={batchProcessing || stats.supervisors === 0}
                  onClick={handleClearAllSupervisors}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Kosongkan Pengawas
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. TABEL DATA GURU & STATUS PENGAWAS UJIAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <FontAwesomeIcon
              icon={faRotate}
              className="animate-spin text-base mb-2 text-blue-500 block mx-auto"
            />
            Memuat data guru dari SIAK...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faChalkboardUser} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery
                ? "Tidak ada data guru yang cocok dengan pencarian"
                : "Belum Ada Data Guru"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Coba gunakan kata kunci pencarian nama atau NIP yang lain."
                : "Tekan tombol 'Sinkron Data SIAK' untuk mengambil data guru aktif terbaru dari database SIAK."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                disabled={syncingSiak}
                onClick={handleSyncFromSiak}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={faRotate}
                  className={`text-xs ${syncingSiak ? "animate-spin" : ""}`}
                />
                <span>Sinkron Data Guru SIAK Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">PILIH</th>
                  <th className="py-3 px-3 w-12 text-center">NO</th>
                  <th className="py-3 px-4">NAMA GURU &amp; EMAIL</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4 text-center">STATUS PENGAWAS</th>
                  <th className="py-3 px-4 text-center">RIWAYAT JAGA</th>
                  <th className="py-3 px-4 text-right">AKSI CEPAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCandidates.map((tch, idx) => {
                  const isChecked = selectedIds.includes(tch.id);
                  const isSupervisor = tch.is_supervisor === 1;
                  const isToggling = togglingId === tch.id;

                  return (
                    <tr
                      key={tch.id}
                      className={`transition ${
                        isChecked
                          ? "bg-blue-50/60"
                          : isSupervisor
                          ? "hover:bg-emerald-50/30"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, tch.id]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => id !== tch.id)
                              );
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Nomor Urut */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Identitas Guru */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSupervisor
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <FontAwesomeIcon icon={faChalkboardUser} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {tch.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <FontAwesomeIcon icon={faEnvelope} className="text-[9px] text-slate-400" />
                              <span>{tch.email || "Email tidak tercantum"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {tch.nip ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {tch.nip}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status Pengawas Ujian */}
                      <td className="py-3 px-4 text-center">
                        {isSupervisor ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block" />
                            <span>Pengawas Ujian</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                            <span>Bukan Pengawas</span>
                          </span>
                        )}
                      </td>

                      {/* Riwayat Sesi Jaga */}
                      <td className="py-3 px-4 text-center">
                        {tch.duty_count > 0 ? (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 inline-flex items-center gap-1">
                            <FontAwesomeIcon icon={faCalendarCheck} className="text-[10px]" />
                            {tch.duty_count} Sesi Jaga
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Belum Ada</span>
                        )}
                      </td>

                      {/* Tombol Aksi Cepat */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleSupervisor(tch)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50 shadow-2xs ${
                            isSupervisor
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={isToggling ? faRotate : isSupervisor ? faXmark : faCheck}
                            className={`text-xs ${isToggling ? "animate-spin" : ""}`}
                          />
                          <span>
                            {isToggling
                              ? "Menyimpan..."
                              : isSupervisor
                              ? "Batalkan Pengawas"
                              : "Jadikan Pengawas"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. FOOTER INFO */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600 text-sm mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <div className="font-bold">Informasi Penugasan Pengawas CBT</div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Guru yang ditetapkan sebagai <b>Pengawas Ujian</b> pada menu ini akan secara otomatis diprioritaskan saat pembagian jadwal jaga pengawas ruang dan pengawas cadangan di menu jadwal SAS.
          </p>
        </div>
      </div>
    </div>
  );
}
