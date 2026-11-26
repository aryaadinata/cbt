"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardList,
  faBookOpen,
  faPlus,
  faRotate,
  faPen,
  faTrash,
  faXmark,
  faDiagramProject,
  faCalendarDays,
  faDesktop,
  faEye,
  faChalkboardUser,
  faCircleCheck,
  faCircleExclamation,
  faMagnifyingGlass,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function BuatUjianPage() {
  const router = useRouter();
  const { token, user, isTeacher, isAdminOrStaff, isLoading } = useAuth();

  // State Form Judul Ulangan Baru
  const [newExamTitle, setNewExamTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // State Tabel Daftar Ulangan yang Telah Dibuat
  const [exams, setExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State Data Mengajar Guru (untuk rekomendasi judul cepat)
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);

  // State Modal Edit Judul Ulangan
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [editingExamTitle, setEditingExamTitle] = useState("");
  const [updatingExam, setUpdatingExam] = useState(false);

  // Redirect jika belum login atau role siswa
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Fetch data mengajar guru (untuk rekomendasi judul)
  useEffect(() => {
    if (!token || !isTeacher) return;
    const fetchTeaching = async () => {
      try {
        const res = await fetch("/api/cbt-backend/api/cbt/sync/my-teaching-classes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeacherSubjects(data.subjects || []);
        }
      } catch (err) {
        console.error("Gagal memuat info mengajar:", err);
      }
    };
    fetchTeaching();
  }, [token, isTeacher]);

  // Fetch daftar ulangan yang sudah dibuat oleh guru
  const fetchMyExams = async () => {
    if (!token) return;
    try {
      setLoadingExams(true);
      const url = isTeacher
        ? "/api/cbt-backend/api/cbt/exams?exam_type=daily"
        : "/api/cbt-backend/api/cbt/exams";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error("Gagal memuat daftar ulangan:", err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyExams();
    }
  }, [token, isTeacher]);

  // Handler Buat Judul Ulangan Harian (Langkah 1)
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Judul Wajib Diisi",
        text: "Silakan masukkan nama atau judul ulangan harian terlebih dahulu.",
      });
      return;
    }

    try {
      setCreating(true);
      const payload = {
        title: newExamTitle.trim(),
        exam_type: isTeacher ? "daily" : "sas",
      };

      const res = await fetch("/api/cbt-backend/api/cbt/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const createdId = data.exam_id;
        const examName = newExamTitle.trim();
        setNewExamTitle("");
        await fetchMyExams();

        Swal.fire({
          icon: "success",
          title: "Judul Ulangan Berhasil Dibuat!",
          html: `
            <div class="text-left text-xs space-y-2 mt-2">
              <p>Paket ulangan <b>"${examName}"</b> telah terdaftar.</p>
              <p class="text-slate-500">Langkah berikutnya: klik tombol <b>"Atur Mapping"</b> pada tabel untuk menentukan mata pelajaran, rombel kelas sasaran, dan naskah bank soal.</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Atur Mapping Sekarang",
          cancelButtonText: "Tutup",
          confirmButtonColor: "#4F46E5",
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
        Swal.fire("Gagal", data.detail || "Gagal membuat ulangan harian.", "error");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server CBT.", "error");
    } finally {
      setCreating(false);
    }
  };

  // Handler Buka Modal Edit Judul
  const handleOpenEdit = (exam: any) => {
    setEditingExamId(exam.id);
    setEditingExamTitle(exam.title || "");
    setShowEditModal(true);
  };

  // Handler Update Judul Ulangan
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamTitle.trim() || !editingExamId) return;

    try {
      setUpdatingExam(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${editingExamId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editingExamTitle.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        setEditingExamId(null);
        setEditingExamTitle("");
        fetchMyExams();
        Swal.fire({
          icon: "success",
          title: "Judul Berhasil Diperbarui",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal memperbarui judul.", "error");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", "Gagal memperbarui data.", "error");
    } finally {
      setUpdatingExam(false);
    }
  };

  // Handler Hapus Ulangan
  const handleDeleteExam = (examId: number, examTitle: string) => {
    Swal.fire({
      title: "Hapus Ulangan Harian?",
      text: `Paket ulangan "${examTitle}" beserta seluruh mapping mapel dan sesi peserta terkait akan dihapus permanen.`,
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
            Swal.fire({
              icon: "success",
              title: "Berhasil Dihapus",
              text: data.message,
              timer: 1500,
              showConfirmButton: false,
            });
            fetchMyExams();
          } else {
            Swal.fire("Gagal", data.detail || "Gagal menghapus ulangan.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menghapus ulangan.", "error");
        }
      }
    });
  };

  // Format tanggal ramah Indonesia
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

  // Filter ulangan berdasarkan pencarian
  const filteredExams = exams.filter((exam) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = exam.title?.toLowerCase().includes(q);
    const matchSubj = exam.subject_name?.toLowerCase().includes(q);
    const matchToken = exam.token?.toLowerCase().includes(q);
    return matchTitle || matchSubj || matchToken;
  });

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* Header Halaman Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition shrink-0 cursor-pointer"
            title="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full inline-block bg-blue-600" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Buat Ulangan Harian
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                Alur Pembuatan Mandiri Guru
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Konsep alur sama seperti Admin: pertama buat judul ulangan, lalu lakukan <b>Atur Mapping</b> untuk menentukan mata pelajaran, rombel kelas sasaran, dan naskah bank soal.
            </p>
          </div>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold shrink-0">
            <FontAwesomeIcon icon={faChalkboardUser} className="text-blue-600" />
            <span>Guru: {user?.name}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. KARTU ATAS: PERTAMA GURU MEMBUAT JUDUL ULANGAN */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              <FontAwesomeIcon icon={faPlus} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                1. Buat Judul Ulangan Harian Baru
              </h2>
              <p className="text-xs text-slate-500">
                Langkah pertama: Tentukan nama resmi ulangan harian yang akan dilaksanakan.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200/60 hidden sm:inline-block">
            Langkah 1 dari 2
          </span>
        </div>

        <form onSubmit={handleCreateExam} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama / Judul Ulangan Harian <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                required
                autoFocus
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
                placeholder={
                  teacherSubjects.length > 0
                    ? `Contoh: Ulangan Harian 1 - ${teacherSubjects[0]} (Bab 1)`
                    : "Contoh: Ulangan Harian 1 - Stoikiometri & Reaksi Kimia"
                }
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
              <button
                type="submit"
                disabled={creating || !newExamTitle.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {creating ? (
                  <>
                    <FontAwesomeIcon icon={faRotate} className="animate-spin text-xs" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span>Simpan Judul Ulangan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rekomendasi / Preset Judul Cepat */}
          {teacherSubjects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 text-[10px]" />
                <span>Rekomendasi Cepat:</span>
              </span>
              {teacherSubjects.slice(0, 3).map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setNewExamTitle(`Ulangan Harian 1 - ${subj}`)}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/80 transition cursor-pointer"
                >
                  UH 1 - {subj}
                </button>
              ))}
              {teacherSubjects.slice(0, 2).map((subj) => (
                <button
                  key={`${subj}-rem`}
                  type="button"
                  onClick={() => setNewExamTitle(`Remedial & Pengayaan - ${subj}`)}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/80 transition cursor-pointer"
                >
                  Remedial - {subj}
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            💡 <b>Catatan:</b> Token pengerjaan siswa akan dibuat otomatis oleh sistem. Setelah judul disimpan, paket ulangan akan muncul di tabel bawah. Anda cukup mengklik tombol <b>"Atur Mapping"</b> untuk menghubungkan Bank Soal dan kelas sasaran.
          </p>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. KARTU BAWAH: TABEL ULANGAN YANG SUDAH DIBUAT OLEH GURU */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                <FontAwesomeIcon icon={faClipboardList} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  2. Daftar Ulangan Harian yang Sudah Dibuat
                </h2>
                <p className="text-xs text-slate-500">
                  Tabel paket ulangan harian yang telah Anda buat beserta status mapping dan tokennya.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              {exams.length} Ulangan Harian
            </span>
            <button
              type="button"
              onClick={fetchMyExams}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Segarkan Tabel Data"
            >
              <FontAwesomeIcon icon={faRotate} className={`text-xs ${loadingExams ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian Tabel */}
        <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
          <div className="relative flex-1 max-w-md">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama ulangan harian..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
          <div className="text-[11px] text-slate-500 font-semibold hidden sm:block">
            Menampilkan {filteredExams.length} dari {exams.length} ulangan
          </div>
        </div>

        {/* Tabel Data Ulangan Harian (Sama Persis Formatnya dengan Admin) */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          {loadingExams ? (
            <div className="p-10 text-center text-xs text-slate-400 space-y-2">
              <FontAwesomeIcon icon={faRotate} className="animate-spin text-base text-blue-600" />
              <p>Memuat daftar ulangan harian Anda...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="p-10 text-center space-y-2.5 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faClipboardList} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery ? "Tidak ada ulangan yang cocok dengan pencarian" : "Belum Ada Ulangan Harian"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Coba gunakan kata kunci pencarian yang lain."
                  : "Buat ulangan harian pertama Anda dengan mengisi judul pada form di atas."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">NO</th>
                    <th className="py-3 px-4">NAMA ULANGAN HARIAN</th>
                    <th className="py-3 px-4 w-40">TANGGAL DIBUAT</th>
                    <th className="py-3 px-4 w-60 text-center">KONFIGURASI ULANGAN</th>
                    <th className="py-3 px-4 w-20 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((exam, idx) => {
                    const isMapped =
                      (exam.total_subjects || 0) > 0 || (exam.subjects && exam.subjects.length > 0);
                    const subjectCount = exam.total_subjects || exam.subjects?.length || 0;

                    return (
                      <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. NO */}
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* 2. NAMA ULANGAN HARIAN & BADGE MAPPING */}
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

                        {/* 3. TANGGAL DIBUAT */}
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {formatDate(exam.created_at)}
                        </td>

                        {/* 4. KONFIGURASI ULANGAN: ATUR MAPPING, STATUS TES, PANTAU */}
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

                            {/* Tombol Status Tes */}
                            <Link
                              href={`/status-tes?exam_id=${exam.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200/70 transition cursor-pointer shadow-2xs"
                              title="Buka Status Tes untuk Memulai / Menyelesaikan Ulangan & Rilis Token"
                            >
                              <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
                              <span>Status Tes</span>
                            </Link>

                            {/* Tombol Pantau */}
                            <Link
                              href={`/ujian/pantau/${exam.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                              title="Pantau Live Siswa yang Mengerjakan"
                            >
                              <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                              <span>Pantau</span>
                            </Link>
                          </div>
                        </td>

                        {/* 5. AKSI (EDIT & HAPUS) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {/* Edit (Icon) */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exam)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition cursor-pointer shadow-2xs"
                              title="Edit Judul Ulangan"
                            >
                              <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                            </button>

                            {/* Hapus (Icon) */}
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT JUDUL ULANGAN HARIAN */}
      {/* ========================================================================= */}
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
                title="Tutup"
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
