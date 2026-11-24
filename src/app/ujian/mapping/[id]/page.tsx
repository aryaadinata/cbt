"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faArrowLeft,
  faPlus,
  faPen,
  faTrash,
  faXmark,
  faDiagramProject,
  faBookOpen,
  faClock,
  faUsers,
  faCheck,
  faRotate,
  faLayerGroup,
  faCircleCheck,
  faCircleExclamation,
  faMagnifyingGlass,
  faFilter,
  faGraduationCap,
  faChalkboardUser,
  faDesktop,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

interface SyncedClass {
  id: number;
  name: string;
  grade: number;
  major_code?: string | null;
  student_count: number;
}

interface ExamSubject {
  id: number;
  exam_id: number;
  subject_name: string;
  grade: number;
  target_classes: string[];
  duration_minutes: number;
  total_questions: number;
  status: string;
  bank_id?: number | null;
  bank_title?: string;
  actual_questions?: number;
}

const COMMON_SUBJECT_PRESETS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Pendidikan Agama",
  "Pancasila / PKn",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ekonomi",
  "Geografi",
  "Sosiologi",
  "Sejarah",
  "Informatika",
  "Seni Budaya",
  "PJOK",
  "Kimia Tingkat Lanjut",
  "Fisika Tingkat Lanjut",
  "Biologi Tingkat Lanjut",
  "Matematika Tingkat Lanjut",
];

export default function ExamMappingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();
  const { user, token, isAdminOrStaff, isTeacher, isLoading } = useAuth();

  const [exam, setExam] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [allClasses, setAllClasses] = useState<SyncedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSubject, setSearchSubject] = useState("");

  // Data Khusus Guru
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherBanks, setTeacherBanks] = useState<any[]>([]);

  // Modal State Tambah / Edit Mata Pelajaran
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [formSubjectName, setFormSubjectName] = useState("");
  const [formGrade, setFormGrade] = useState<number>(10);
  const [formTargetClasses, setFormTargetClasses] = useState<string[]>([]);
  const [formDuration, setFormDuration] = useState<number>(90);
  const [formBankId, setFormBankId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter rombel di dalam modal
  const [modalGradeFilter, setModalGradeFilter] = useState<number | "all">("all");

  // Redirect if not admin or teacher
  useEffect(() => {
    if (!isLoading && user && !isAdminOrStaff && !isTeacher) {
      router.push("/");
    }
  }, [user, isAdminOrStaff, isTeacher, isLoading, router]);

  // Fetch Exam Data & Synced Classes
  const fetchData = async () => {
    if (!token || !examId) return;
    try {
      setLoading(true);

      let classesList: SyncedClass[] = [];

      if (isTeacher) {
        const [resExam, resTeaching] = await Promise.all([
          fetch(`/api/cbt-backend/api/cbt/exams/${examId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/cbt-backend/api/cbt/sync/my-teaching-classes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (resExam.ok) {
          const dataExam = await resExam.json();
          setExam(dataExam.exam);
          setSubjects(dataExam.exam?.subjects || []);
        } else {
          Swal.fire("Error", "Paket ujian tidak ditemukan.", "error");
          router.push("/");
          return;
        }

        if (resTeaching.ok) {
          const dataTeaching = await resTeaching.json();
          const rawCls = dataTeaching.classes || [];
          classesList = rawCls.map((c: any) => ({
            id: c.id,
            name: c.name,
            grade: c.grade || 10,
            student_count: c.student_count || 0,
          }));
          setTeacherSubjects(dataTeaching.subjects || []);
          setTeacherBanks(dataTeaching.banks || []);
        }

        const resBanks = await fetch("/api/cbt-backend/api/cbt/banks?filter=my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resBanks.ok) {
          const dataBanks = await resBanks.json();
          if (dataBanks.banks && dataBanks.banks.length > 0) {
            setTeacherBanks(dataBanks.banks);
          }
        }
      } else {
        const [resExam, resClasses] = await Promise.all([
          fetch(`/api/cbt-backend/api/cbt/exams/${examId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/cbt-backend/api/cbt/sync/classes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (resExam.ok) {
          const dataExam = await resExam.json();
          setExam(dataExam.exam);
          setSubjects(dataExam.exam?.subjects || []);
        } else {
          Swal.fire("Error", "Paket ujian tidak ditemukan.", "error");
          router.push("/");
          return;
        }

        if (resClasses.ok) {
          const dataClasses = await resClasses.json();
          classesList = dataClasses.classes || [];
        }
      }

      setAllClasses(classesList);
    } catch (err) {
      console.error("Gagal memuat data mapping:", err);
      Swal.fire("Error", "Gagal memuat data dari server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && examId) {
      fetchData();
    }
  }, [token, examId]);

  // Buka Modal Tambah Mapel
  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingSubjectId(null);
    setFormSubjectName(isTeacher && teacherSubjects.length > 0 ? teacherSubjects[0] : "");
    setFormGrade(allClasses[0]?.grade || 10);
    setFormTargetClasses(isTeacher ? allClasses.map((c) => c.name) : []);
    setFormDuration(90);
    setFormBankId(null);
    setModalGradeFilter("all");
    setShowModal(true);
  };

  // Buka Modal Edit Mapel
  const handleOpenEdit = (subj: any) => {
    setIsEditing(true);
    setEditingSubjectId(subj.id);
    setFormSubjectName(subj.subject_name);
    setFormGrade(subj.grade || 10);
    setFormTargetClasses(Array.isArray(subj.target_classes) ? [...subj.target_classes] : []);
    setFormDuration(subj.duration_minutes || 90);
    setFormBankId(subj.bank_id || null);
    setModalGradeFilter(subj.grade || "all");
    setShowModal(true);
  };

  // Toggle Kelas Sasaran
  const handleToggleClass = (className: string) => {
    setFormTargetClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
  };

  // Shortcut Pemilihan Kelas
  const handleSelectAllInGrade = (gradeNumber: number) => {
    const classNamesInGrade = allClasses
      .filter((c) => c.grade === gradeNumber)
      .map((c) => c.name);
    setFormTargetClasses((prev) => {
      const set = new Set([...prev, ...classNamesInGrade]);
      return Array.from(set);
    });
  };

  const handleSelectAllClasses = () => {
    setFormTargetClasses(allClasses.map((c) => c.name));
  };

  const handleClearSelectedClasses = () => {
    setFormTargetClasses([]);
  };

  // Handler Kelola / Input Soal untuk Mata Pelajaran
  const handleManageQuestions = async (subj: any) => {
    if (subj.bank_id) {
      router.push(`/bank-soal/${subj.bank_id}`);
      return;
    }

    try {
      Swal.fire({
        title: "Menyiapkan Halaman Soal...",
        text: `Membuat wadah bank soal untuk ${subj.subject_name}...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await fetch("/api/cbt-backend/api/cbt/banks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${exam?.title || "Ulangan"} - ${subj.subject_name} (Kelas ${subj.grade || 10})`,
          subject_name: subj.subject_name,
          grade: Number(subj.grade || 10),
          teacher_id: user?.teacher_id || user?.id || null,
          teacher_name: user?.name || null,
          questions: [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Gagal membuat wadah bank soal.");
      }

      const newBankId = data.bank_id;

      // Kaitkan bank_id ke cbt_exam_subjects
      await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/subjects/${subj.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_id: newBankId,
        }),
      });

      Swal.close();
      router.push(`/bank-soal/${newBankId}`);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Gagal", err.message || "Gagal menyiapkan bank soal.", "error");
    }
  };

  // Simpan Mapel (POST atau PUT)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectName.trim()) {
      Swal.fire("Peringatan", "Nama mata pelajaran wajib diisi.", "warning");
      return;
    }

    if (formTargetClasses.length === 0) {
      Swal.fire("Peringatan", "Silakan pilih minimal satu rombel kelas sasaran.", "warning");
      return;
    }

    if (!token) return;

    try {
      setSaving(true);
      const selectedClassObj = allClasses.find((c) => formTargetClasses.includes(c.name));
      const resolvedGrade = selectedClassObj?.grade || Number(formGrade) || exam?.grade || 10;

      const payload = {
        subject_name: formSubjectName.trim(),
        grade: resolvedGrade,
        target_classes: formTargetClasses,
        duration_minutes: Number(formDuration) || 90,
        bank_id: formBankId || null,
        teacher_id: isTeacher ? (user?.teacher_id || user?.id) : null,
        teacher_name: isTeacher ? (user?.name || "Guru Pengampu") : null,
      };

      let url = `/api/cbt-backend/api/cbt/exams/${examId}/subjects`;
      let method = "POST";

      if (isEditing && editingSubjectId) {
        url = `/api/cbt-backend/api/cbt/exams/${examId}/subjects/${editingSubjectId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        Swal.fire({
          icon: "success",
          title: isEditing ? "Mata Pelajaran Diperbarui" : "Mata Pelajaran Ditambahkan",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchData();
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menyimpan mata pelajaran.", "error");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat menyimpan mata pelajaran.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Hapus Mata Pelajaran
  const handleDeleteSubject = (subjId: number, subjName: string) => {
    if (!token) return;
    Swal.fire({
      title: "Hapus Mata Pelajaran?",
      text: `Mata pelajaran "${subjName}" akan dihapus dari paket ujian ini.`,
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
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/subjects/${subjId}`, {
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
            fetchData();
          } else {
            Swal.fire("Gagal", data.detail || "Gagal menghapus mata pelajaran.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Terjadi kesalahan saat menghapus data.", "error");
        }
      }
    });
  };

  const filteredSubjects = subjects.filter((s) => {
    if (!searchSubject.trim()) return true;
    const q = searchSubject.toLowerCase();
    const matchName = s.subject_name.toLowerCase().includes(q);
    const matchClass = s.target_classes?.some((c) => c.toLowerCase().includes(q));
    return matchName || matchClass;
  });

  // Pengelompokan kelas untuk selector di modal
  const classesGrade10 = allClasses.filter((c) => c.grade === 10);
  const classesGrade11 = allClasses.filter((c) => c.grade === 11);
  const classesGrade12 = allClasses.filter((c) => c.grade === 12);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <FontAwesomeIcon icon={faRotate} className="animate-spin text-base text-blue-600 mb-2" />
        <p>Memuat konfigurasi mapping ujian...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* Header Halaman Mapping Ujian */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            <span>Kembali ke Menu Ujian</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Pengaturan Mapping Ujian
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-6 bg-indigo-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Mapping Ujian: {exam?.title}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {subjects.length} Mata Pelajaran
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur daftar mata pelajaran yang diujikan dan tentukan kelas mana saja yang dapat mengakses &amp; menjawab soal.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {isTeacher ? (
              <Link
                href={`/status-tes?exam_id=${examId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Buka Status Tes untuk Memulai Ulangan & Rilis Token"
              >
                <FontAwesomeIcon icon={faDesktop} className="text-xs" />
                <span>Buka Status Tes &amp; Token</span>
              </Link>
            ) : (
              <Link
                href={`/jadwal?exam_id=${examId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
                <span>Atur Jadwal Ujian Ini</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Tambah Mata Pelajaran</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Perbarui Data"
            >
              <FontAwesomeIcon icon={faRotate} className={`text-xs ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian Mata Pelajaran */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          />
          <input
            type="text"
            value={searchSubject}
            onChange={(e) => setSearchSubject(e.target.value)}
            placeholder="Cari mata pelajaran atau kelas sasaran..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Total: <span className="font-bold text-slate-800">{filteredSubjects.length}</span> Mapel Terdaftar
        </div>
      </div>

      {/* Tabel Mapping Mata Pelajaran & Kelas Sasaran */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {subjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faDiagramProject} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Belum Ada Mata Pelajaran yang Di-Mapping
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Paket ujian ini belum memiliki daftar mata pelajaran. Tambahkan mata pelajaran pertama dan tentukan kelas mana saja yang berhak mengerjakannya.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Tambah Mata Pelajaran Pertama</span>
            </button>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Tidak ada mata pelajaran yang cocok dengan pencarian "<b>{searchSubject}</b>".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4 w-64">MATA PELAJARAN</th>
                  <th className="py-3 px-4">KELAS SASARAN (YANG DAPAT MENJAWAB)</th>
                  <th className="py-3 px-4 w-28 text-center">DURASI</th>
                  <th className="py-3 px-4 w-36 text-center">STATUS SOAL</th>
                  <th className="py-3 px-4 text-right w-40">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubjects.map((subj, idx) => {
                  const targetList = Array.isArray(subj.target_classes) ? subj.target_classes : [];
                  const isAllClasses = targetList.length === 0 || targetList.includes("all");

                  return (
                    <tr key={subj.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. NO */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 2. MATA PELAJARAN */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {subj.subject_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-slate-600">
                            Tingkat {subj.grade ? `Kelas ${subj.grade}` : "Umum"}
                          </span>
                        </div>
                      </td>

                      {/* 3. KELAS SASARAN */}
                      <td className="py-3.5 px-4">
                        {isAllClasses ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                            <FontAwesomeIcon icon={faUsers} className="text-[10px] text-slate-500" />
                            <span>Semua Kelas (Umum)</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-600">
                                {targetList.length} Kelas Khusus:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xl">
                              {targetList.map((cls, cIdx) => (
                                <span
                                  key={`${cls}-${cIdx}`}
                                  className="text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md shadow-2xs"
                                >
                                  {cls}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 4. DURASI */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <FontAwesomeIcon icon={faClock} className="text-slate-400 text-[10px]" />
                          <span>{subj.duration_minutes || 90} Menit</span>
                        </span>
                      </td>

                      {/* 5. STATUS SOAL */}
                      <td className="py-3.5 px-4 text-center">
                        {subj.bank_title || subj.status === "ready" || subj.bank_id ? (
                          <button
                            type="button"
                            onClick={() => handleManageQuestions(subj)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                            title="Klik untuk membuka editor butir soal"
                          >
                            <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                            <span>Siap ({subj.actual_questions || subj.total_questions || 0} Soal)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleManageQuestions(subj)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer"
                            title="Belum ada butir soal. Klik untuk langsung membuat dan mengisi soal"
                          >
                            <FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" />
                            <span>Menunggu Soal (Klik Input)</span>
                          </button>
                        )}
                      </td>

                      {/* 6. AKSI */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Input Soal */}
                          <button
                            type="button"
                            onClick={() => handleManageQuestions(subj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition cursor-pointer shadow-2xs"
                            title="Buka editor untuk input atau kelola butir soal"
                          >
                            <FontAwesomeIcon icon={faBookOpen} className="text-[10px]" />
                            <span>{subj.bank_id ? "Kelola Soal" : "Input Soal"}</span>
                          </button>

                          {/* Edit Mapel */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(subj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer shadow-2xs"
                            title="Edit Mata Pelajaran & Sasaran Kelas"
                          >
                            <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                            <span>Edit</span>
                          </button>

                          {/* Hapus Mapel */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(subj.id, subj.subject_name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/70 transition cursor-pointer shadow-2xs"
                            title="Hapus Mata Pelajaran dari Ujian"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                            <span>Hapus</span>
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

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT MATA PELAJARAN & MAPPING KELAS SASARAN */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
            {/* Header Modal (Fixed Top) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                  <FontAwesomeIcon icon={isEditing ? faPen : faPlus} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isEditing
                      ? (isTeacher ? "Edit Mata Pelajaran & Kelas Sasaran" : "Edit Mata Pelajaran & Sasaran Kelas")
                      : (isTeacher ? "Tambah Mata Pelajaran Ulangan" : "Tambah Mata Pelajaran Ujian")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isTeacher
                      ? "Pilih mata pelajaran yang Anda ampu, tentukan durasi, dan pilih rombel kelas."
                      : "Tentukan nama mapel, tingkat, durasi, dan rombel/kelas yang dapat mengerjakan."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Form Wrapper (Flex Container with Scrollable Body) */}
            <form onSubmit={handleSaveSubject} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Body Modal (Scrollable Content) */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
                {/* 1. MATA PELAJARAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {isTeacher ? "Mata Pelajaran yang Anda Ampu" : "Nama Mata Pelajaran"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>

                  {isTeacher ? (
                    teacherSubjects.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          required
                          value={formSubjectName}
                          onChange={(e) => setFormSubjectName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition cursor-pointer"
                        >
                          {teacherSubjects.map((subj) => (
                            <option key={subj} value={subj}>
                              {subj}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faChalkboardUser} className="text-indigo-600 text-xs" />
                          <span>Guru Pengampu: <b>{user?.name}</b></span>
                        </p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={formSubjectName}
                        onChange={(e) => setFormSubjectName(e.target.value)}
                        placeholder="Contoh: Kimia"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      />
                    )
                  ) : (
                    // ADMIN MODE: Free text input + Preset buttons
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={formSubjectName}
                        onChange={(e) => setFormSubjectName(e.target.value)}
                        placeholder="Contoh: Matematika, Kimia Tingkat Lanjut, atau Bahasa Indonesia"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      />

                      {/* Preset Cepat Mapel Khusus Admin */}
                      <div className="mt-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Rekomendasi Cepat (Klik untuk memilih):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
                          {COMMON_SUBJECT_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setFormSubjectName(preset)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition cursor-pointer ${
                                formSubjectName === preset
                                  ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/90"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* KHUSUS ADMIN: Tingkat Sasaran & Durasi Berdampingan */}
                {!isTeacher && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tingkat Sasaran
                      </label>
                      <select
                        value={formGrade}
                        onChange={(e) => {
                          const g = Number(e.target.value);
                          setFormGrade(g);
                          setModalGradeFilter(g);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      >
                        <option value={10}>Kelas 10 (Fase E)</option>
                        <option value={11}>Kelas 11 (Fase F)</option>
                        <option value={12}>Kelas 12 (Fase F)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Durasi Pengerjaan (Menit)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={formDuration}
                          onChange={(e) => setFormDuration(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition pr-14"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                          Menit
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* KHUSUS GURU: Durasi Pengerjaan saja (Tingkat Sasaran & Hubungkan Bank Soal Dihilangkan) */}
                {isTeacher && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alokasi Waktu / Durasi Pengerjaan <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min={10}
                        max={300}
                        required
                        value={formDuration}
                        onChange={(e) => setFormDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition pr-14"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                        Menit
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Waktu hitung mundur pengerjaan siswa saat mengerjakan ulangan ini.
                    </p>
                  </div>
                )}

                {/* HUBUNGKAN BANK SOAL (OPSIONAL) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Hubungkan Bank Soal {isTeacher ? "Mandiri" : ""} (Opsional)
                    </label>
                    <Link
                      href="/bank-soal"
                      target="_blank"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      title="Buka Bank Soal di tab baru"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                      <span>Buat Bank Baru</span>
                    </Link>
                  </div>
                  <select
                    value={formBankId || ""}
                    onChange={(e) => setFormBankId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition cursor-pointer"
                  >
                    <option value="">-- Belum ada / Buat otomatis nanti --</option>
                    {teacherBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.subject_name} • Kelas {b.grade} • {b.total_questions || 0} Soal)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pilih bank soal yang sudah Anda siapkan, atau biarkan kosong jika ingin membuat dan mengisi soal secara otomatis setelah mapping.
                  </p>
                </div>

                {/* PEMETAAN KELAS / ROMBEL SASARAN (CHECKLIST) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {isTeacher ? "Pilih Kelas Sasaran (Yang Anda Ajar)" : "Kelas yang Dapat Menjawab"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {isTeacher
                          ? "Hanya menampilkan rombel kelas yang tercatat dalam jadwal mengajar Anda di SIAKAD."
                          : "Pilih rombel yang berhak mengerjakan. Siswa di luar kelas terpilih tidak akan melihat mapel ini."}
                      </span>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto shrink-0">
                      {formTargetClasses.length === 0
                        ? "Belum Ada Kelas Terpilih"
                        : `${formTargetClasses.length} Kelas Terpilih`}
                    </span>
                  </div>

                  {/* Tombol Shortcut Pilihan Cepat */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">Shortcut:</span>
                    {!isTeacher && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInGrade(10)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer shadow-2xs"
                        >
                          Semua Kelas 10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInGrade(11)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer shadow-2xs"
                        >
                          Semua Kelas 11
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAllInGrade(12)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer shadow-2xs"
                        >
                          Semua Kelas 12
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shadow-2xs"
                    >
                      {isTeacher ? "Pilih Semua Kelas Saya" : "Pilih Semua Kelas"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelectedClasses}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer shadow-2xs ml-auto"
                    >
                      Kosongkan
                    </button>
                  </div>

                  {/* Filter Tab Kelas di Modal (Khusus Admin yang Memiliki Banyak Kelas) */}
                  {!isTeacher && (
                    <div className="flex items-center gap-1 mb-2 border-b border-slate-200 pb-1.5">
                      <button
                        type="button"
                        onClick={() => setModalGradeFilter("all")}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          modalGradeFilter === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Semua ({allClasses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalGradeFilter(10)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          modalGradeFilter === 10
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Kelas 10 ({classesGrade10.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalGradeFilter(11)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          modalGradeFilter === 11
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Kelas 11 ({classesGrade11.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalGradeFilter(12)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          modalGradeFilter === 12
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Kelas 12 ({classesGrade12.length})
                      </button>
                    </div>
                  )}

                  {/* Grid Rombel Checkbox */}
                  <div className="max-h-56 sm:max-h-64 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200">
                    {allClasses.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {isTeacher
                          ? "Tidak ada rombel kelas yang terdaftar dalam jadwal mengajar Anda."
                          : "Data kelas belum disinkronkan dari SIAK."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {allClasses
                          .filter((c) =>
                            isTeacher || modalGradeFilter === "all" ? true : c.grade === modalGradeFilter
                          )
                          .map((cls) => {
                            const isSelected = formTargetClasses.includes(cls.name);
                            return (
                              <button
                                key={cls.id || cls.name}
                                type="button"
                                onClick={() => handleToggleClass(cls.name)}
                                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold border transition text-left cursor-pointer ${
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                                }`}
                              >
                                <div className="truncate min-w-0 pr-1">
                                  <span className="block truncate">{cls.name}</span>
                                  {cls.grade && (
                                    <span
                                      className={`text-[10px] block ${
                                        isSelected ? "text-blue-100" : "text-slate-400"
                                      }`}
                                    >
                                      Kelas {cls.grade}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                                    isSelected
                                      ? "bg-white text-blue-600 font-bold"
                                      : "border border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <FontAwesomeIcon icon={faCheck} />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Modal (Fixed Bottom) */}
              <div className="flex items-center justify-end gap-2 p-3 sm:p-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !formSubjectName.trim() || formTargetClasses.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : isEditing
                    ? "Simpan Perubahan"
                    : "Tambahkan Mata Pelajaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
