"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartColumn,
  faFileExcel,
  faChartPie,
  faEye,
  faRotate,
  faMagnifyingGlass,
  faBookOpen,
  faUsers,
  faCircleCheck,
  faAward,
  faSpinner,
  faTableList,
  faLayerGroup,
  faSchool,
  faArrowLeft,
  faTriangleExclamation,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

interface ExamItem {
  id: number;
  title: string;
  exam_type: string;
  grade: number;
  status: string;
  start_date?: string;
  end_date?: string;
  submitted_count?: number;
  session_count?: number;
}

interface SubjectSummary {
  id: number;
  exam_id: number;
  subject_name: string;
  grade: number;
  teacher_name: string;
  bank_id: number | null;
  exam_date: string | null;
  passing_score: number;
  total_questions: number;
  total_students: number;
  participated_count: number;
  submitted_count: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  passed_count: number;
  pass_rate: number;
  difficulty_summary: {
    mudah: number;
    sedang: number;
    sukar: number;
    belum_ada_data: number;
  };
}

interface StudentResult {
  student_id: number;
  nis: string;
  nisn: string;
  name: string;
  class_name: string;
  grade: number;
  status: string;
  status_label: string;
  participated: boolean;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number | null;
  passed: boolean | null;
  rank: number | null;
  lock_count: number;
  submitted_at: string | null;
}

interface ItemAnalysisRow {
  question_id: number;
  question_number: number;
  question_type: string;
  content_preview: string;
  correct_answer: string;
  points: number;
  total_attempted: number;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  pct_correct: number;
  option_counts: Record<string, number>;
  difficulty_index: number | null;
  difficulty_label: string;
  discrimination_index: number | null;
  discrimination_label: string;
  recommendation: string;
}

interface ClassBreakdownRow {
  class_name: string;
  total_students: number;
  participated_count: number;
  not_started_count: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
}

interface SubjectDetailData {
  subject: {
    id: number;
    subject_name: string;
    grade: number;
    teacher_name: string;
    bank_id: number | null;
    exam_date: string | null;
    passing_score: number;
  };
  scope_label: string;
  stats: {
    total_students: number;
    participated_count: number;
    submitted_count: number;
    not_started_count: number;
    passing_score: number;
    max_score: number;
    total_questions: number;
    avg_score: number;
    highest_score: number;
    lowest_score: number;
    std_dev: number;
    passed_count: number;
    failed_count: number;
    pass_rate: number;
  };
  class_breakdown: ClassBreakdownRow[];
  students: StudentResult[];
  item_analysis: ItemAnalysisRow[];
  difficulty_summary: {
    mudah: number;
    sedang: number;
    sukar: number;
    belum_ada_data: number;
  };
}

const gradeToRoman = (g: number) => {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[g] || String(g);
};

function HasilUjianContent() {
  const { token, isAdminOrStaff, isTeacher } = useAuth();
  const searchParams = useSearchParams();
  const qExamId = searchParams.get("exam_id");

  // Filter states
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(() => {
    if (qExamId && !isNaN(Number(qExamId))) {
      return Number(qExamId);
    }
    return null;
  });

  useEffect(() => {
    if (qExamId && !isNaN(Number(qExamId))) {
      setSelectedExamId(Number(qExamId));
    }
  }, [qExamId]);
  const [scope, setScope] = useState<"angkatan" | "kelas">("angkatan");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Options from backend
  const [availableGrades, setAvailableGrades] = useState<number[]>([]);
  const [availableClasses, setAvailableClasses] = useState<{ class_name: string; grade: number }[]>([]);
  const [scopeLabel, setScopeLabel] = useState<string>("Seluruh Angkatan");

  // Summary data
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [overview, setOverview] = useState({
    total_subjects: 0,
    total_students: 0,
    participated_count: 0,
    avg_score: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [searchSubject, setSearchSubject] = useState<string>("");

  // Tabs & Detail preview
  const [activeTab, setActiveTab] = useState<"daftar" | "pratinjau">("daftar");
  const [previewSubTab, setPreviewSubTab] = useState<"nilai" | "analisis" | "kelas">("nilai");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<SubjectDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [searchStudent, setSearchStudent] = useState<string>("");

  // Downloading indicator key
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const buildQueryParams = useCallback(
    (extra?: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      if (selectedExamId) params.set("exam_id", String(selectedExamId));
      params.set("scope", scope);
      if (scope === "angkatan" && selectedGrade !== "all") {
        params.set("grade", selectedGrade);
      }
      if (scope === "kelas" && selectedClass) {
        params.set("class_name", selectedClass);
      }
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });
      }
      return params.toString();
    },
    [selectedExamId, scope, selectedGrade, selectedClass]
  );

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setLoadingSummary(true);
    try {
      const qs = buildQueryParams();
      const res = await fetch(`/api/cbt-backend/api/cbt/results/summary?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Gagal memuat ringkasan hasil ujian.");
      const json = await res.json();
      if (json.success) {
        setExams(json.exams || []);
        if (!selectedExamId && json.selected_exam?.id) {
          setSelectedExamId(json.selected_exam.id);
        }
        setAvailableGrades(json.available_grades || []);
        setAvailableClasses(json.available_classes || []);
        if (scope === "kelas" && !selectedClass && (json.available_classes || []).length > 0) {
          setSelectedClass(json.available_classes[0].class_name);
        }
        setScopeLabel(json.scope_label || "");
        setSubjects(json.subjects || []);
        setOverview(
          json.overview || {
            total_subjects: 0,
            total_students: 0,
            participated_count: 0,
            avg_score: 0,
          }
        );
      }
    } catch (err) {
      console.error("Error fetch summary hasil ujian:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, [token, buildQueryParams, selectedExamId, scope, selectedClass]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch Detail Preview for selected subject
  const fetchDetail = useCallback(
    async (subjId: number) => {
      if (!token || !selectedExamId) return;
      setLoadingDetail(true);
      try {
        const qs = buildQueryParams({ subject_id: subjId });
        const res = await fetch(`/api/cbt-backend/api/cbt/results/detail?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Gagal memuat detail hasil & analisis.");
        const json = await res.json();
        if (json.success) {
          setDetailData(json);
        }
      } catch (err) {
        console.error("Error fetch detail hasil ujian:", err);
      } finally {
        setLoadingDetail(false);
      }
    },
    [token, selectedExamId, buildQueryParams]
  );

  useEffect(() => {
    if (activeTab === "pratinjau" && selectedSubjectId !== null) {
      fetchDetail(selectedSubjectId);
    }
  }, [activeTab, selectedSubjectId, fetchDetail]);

  // Handler Download Excel (Scores / Analysis / Leger)
  const handleDownloadExcel = async (
    type: "scores" | "analysis" | "leger",
    subjId?: number,
    fallbackLabel?: string
  ) => {
    if (!token || !selectedExamId) return;
    const key = `${type}_${subjId ?? "all"}`;
    setDownloadingKey(key);
    try {
      const qs = buildQueryParams(subjId !== undefined ? { subject_id: subjId } : undefined);
      const res = await fetch(`/api/cbt-backend/api/cbt/results/export/${type}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Gagal mengunduh file Excel.");
      }

      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename="?([^"]+)"?/i);
      const filename =
        match?.[1] ||
        `${type === "scores" ? "Hasil_Ujian" : type === "analysis" ? "Analisis_Butir_Soal" : "Leger_Nilai"}_${
          fallbackLabel || "CBT"
        }.xlsx`;

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
      setDownloadingKey(null);
    }
  };

  const openSubjectPreview = (subjId: number, subTab: "nilai" | "analisis" = "nilai") => {
    setSelectedSubjectId(subjId);
    setPreviewSubTab(subTab);
    setActiveTab("pratinjau");
  };

  if (!isAdminOrStaff && !isTeacher) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-10 space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center text-lg">
          <FontAwesomeIcon icon={faLock} />
        </div>
        <h2 className="text-sm font-black text-slate-900">Akses Terbatas</h2>
        <p className="text-xs text-slate-500">
          Menu Hasil Ujian &amp; Analisis hanya dapat diakses oleh Administrator atau Pendidik.
        </p>
      </div>
    );
  }

  const filteredSubjects = subjects.filter((s) => {
    const q = searchSubject.trim().toLowerCase();
    if (!q) return true;
    return (
      s.subject_name.toLowerCase().includes(q) ||
      (s.teacher_name || "").toLowerCase().includes(q)
    );
  });

  const filteredStudents = (detailData?.students || []).filter((s) => {
    const q = searchStudent.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      s.class_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* 1. HEADER & FILTER BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0 text-base shadow-2xs">
              <FontAwesomeIcon icon={faChartColumn} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Hasil Ujian &amp; Analisis Butir Soal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {scopeLabel || "Semua Angkatan"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pratinjau nilai peserta, analisis tingkat kesukaran &amp; daya pembeda soal, serta unduh laporan Excel per kelas atau per angkatan.
              </p>
            </div>
          </div>

          {/* Tombol Aksi Global (Ikon + Hover Tooltip) */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="relative group">
              <button
                type="button"
                onClick={() => handleDownloadExcel("leger", undefined, scopeLabel)}
                disabled={!selectedExamId || subjects.length === 0 || downloadingKey === "leger_all"}
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition cursor-pointer disabled:opacity-40"
                aria-label="Download Leger Semua Mapel (Excel)"
              >
                <FontAwesomeIcon
                  icon={downloadingKey === "leger_all" ? faSpinner : faTableList}
                  className={downloadingKey === "leger_all" ? "animate-spin text-sm" : "text-sm"}
                />
              </button>
              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-full mt-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30">
                Download Leger Semua Mapel (Excel)
              </span>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  fetchSummary();
                  if (activeTab === "pratinjau" && selectedSubjectId !== null) {
                    fetchDetail(selectedSubjectId);
                  }
                }}
                disabled={loadingSummary}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                aria-label="Segarkan Data"
              >
                <FontAwesomeIcon
                  icon={faRotate}
                  className={loadingSummary ? "animate-spin text-blue-600 text-xs" : "text-xs"}
                />
              </button>
              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-full mt-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30">
                Segarkan Data
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar: Paket Ujian + Toggle Per Angkatan / Per Kelas + Dropdown Tingkat/Rombel */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end text-xs">
          {/* Paket Ujian */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">Paket Ujian</label>
            <select
              value={selectedExamId ?? ""}
              onChange={(e) => {
                setSelectedExamId(Number(e.target.value));
                setSelectedSubjectId(null);
                setActiveTab("daftar");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 font-semibold outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
            >
              {exams.length === 0 ? (
                <option value="">Belum ada paket ujian</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.exam_type === "sas" ? "SAS/Ujian Sekolah" : "Ulangan Harian"})
                    {ex.submitted_count !== undefined && ex.submitted_count > 0
                      ? ` • ${ex.submitted_count} Selesai`
                      : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Cakupan: Per Angkatan vs Per Kelas */}
          <div className="md:col-span-3 space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">Cakupan Laporan</label>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setScope("angkatan")}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  scope === "angkatan"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="text-[10px]" />
                <span>Per Angkatan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("kelas");
                  if (!selectedClass && availableClasses.length > 0) {
                    setSelectedClass(availableClasses[0].class_name);
                  }
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  scope === "kelas"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FontAwesomeIcon icon={faSchool} className="text-[10px]" />
                <span>Per Kelas</span>
              </button>
            </div>
          </div>

          {/* Dropdown Tingkat / Kelas */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">
              {scope === "angkatan" ? "Pilih Angkatan / Tingkat" : "Pilih Kelas / Rombel"}
            </label>
            {scope === "angkatan" ? (
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 font-semibold outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
              >
                <option value="all">Semua Angkatan</option>
                {availableGrades.map((g) => (
                  <option key={g} value={String(g)}>
                    Angkatan Kelas {gradeToRoman(g)} (Tingkat {g})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 font-semibold outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
              >
                {availableClasses.length === 0 ? (
                  <option value="">Belum ada kelas tersinkron</option>
                ) : (
                  availableClasses.map((c) => (
                    <option key={c.class_name} value={c.class_name}>
                      Kelas {c.class_name} (Tingkat {c.grade})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI RINGKAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 text-sm">
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran</p>
            <p className="text-base font-black text-slate-900">{overview.total_subjects}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/70 flex items-center justify-center shrink-0 text-sm">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Peserta Sasaran</p>
            <p className="text-base font-black text-slate-900">{overview.total_students}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 text-sm">
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Sudah Mengerjakan</p>
            <p className="text-base font-black text-slate-900">
              {overview.participated_count}
              <span className="text-[11px] font-semibold text-slate-400 ml-1">
                / {overview.total_students}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 text-sm">
            <FontAwesomeIcon icon={faAward} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Rata-rata Nilai</p>
            <p className="text-base font-black text-slate-900">{overview.avg_score.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* 3. COMPACT TAB SWITCHER */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex bg-white rounded-xl border border-slate-200/90 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("daftar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "daftar"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-[11px]" />
            <span>Daftar Mata Pelajaran</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "daftar" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {subjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedSubjectId === null && subjects.length > 0) {
                setSelectedSubjectId(subjects[0].id);
              }
              setActiveTab("pratinjau");
            }}
            disabled={subjects.length === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
              activeTab === "pratinjau"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FontAwesomeIcon icon={faChartPie} className="text-[11px]" />
            <span>Pratinjau &amp; Analisis Mapel</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: DAFTAR MATA PELAJARAN & UNDUH CEPAT EXCEL                  */}
      {/* ================================================================= */}
      {activeTab === "daftar" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Hasil &amp; Analisis Per Mata Pelajaran
              </h2>
              <p className="text-[11px] text-slate-500">
                Unduh file Excel <b>Hasil Ujian</b> atau <b>Analisis Butir Soal</b> untuk setiap mata pelajaran sesuai filter <b>{scopeLabel}</b>.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              />
              <input
                type="text"
                value={searchSubject}
                onChange={(e) => setSearchSubject(e.target.value)}
                placeholder="Cari mata pelajaran / guru..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-bold w-10 text-center">No</th>
                  <th className="py-2.5 px-3 font-bold">Mata Pelajaran &amp; Guru</th>
                  <th className="py-2.5 px-3 font-bold text-center">Tingkat</th>
                  <th className="py-2.5 px-3 font-bold text-center">Soal</th>
                  <th className="py-2.5 px-3 font-bold text-center">Peserta</th>
                  <th className="py-2.5 px-3 font-bold text-center">Rata-rata</th>
                  <th className="py-2.5 px-3 font-bold text-center">Ketuntasan</th>
                  <th className="py-2.5 px-4 font-bold text-right">Aksi &amp; Unduh Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSummary ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 text-blue-600" />
                      Memuat rekap hasil ujian...
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Tidak ada mata pelajaran yang cocok dengan filter <b>{scopeLabel}</b>.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subj, idx) => {
                    const dlScoreKey = `scores_${subj.id}`;
                    const dlAnalysisKey = `analysis_${subj.id}`;
                    return (
                      <tr key={subj.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{subj.subject_name}</p>
                          <p className="text-[11px] text-slate-500">
                            Guru: {subj.teacher_name || "-"} &bull; KKM: {subj.passing_score}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Kelas {gradeToRoman(subj.grade)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                          {subj.total_questions > 0 ? (
                            <span>{subj.total_questions}</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-sans">
                              Belum ada bank
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="font-bold text-slate-800">{subj.participated_count}</span>
                          <span className="text-slate-400">/{subj.total_students}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-black text-slate-900">
                            {subj.participated_count > 0 ? subj.avg_score.toFixed(2) : "-"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {subj.participated_count > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                subj.pass_rate >= 75
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : subj.pass_rate >= 50
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {subj.passed_count}/{subj.participated_count} ({subj.pass_rate}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Pratinjau */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => openSubjectPreview(subj.id, "nilai")}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 flex items-center justify-center transition cursor-pointer"
                                aria-label="Lihat Pratinjau & Analisis"
                              >
                                <FontAwesomeIcon icon={faEye} className="text-xs" />
                              </button>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bottom-full mb-1.5 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30">
                                Lihat Pratinjau &amp; Analisis
                              </span>
                            </div>

                            {/* Tombol Download Hasil Ujian Excel */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => handleDownloadExcel("scores", subj.id, subj.subject_name)}
                                disabled={downloadingKey === dlScoreKey}
                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
                                aria-label="Download Hasil Ujian (Excel)"
                              >
                                <FontAwesomeIcon
                                  icon={downloadingKey === dlScoreKey ? faSpinner : faFileExcel}
                                  className={downloadingKey === dlScoreKey ? "animate-spin text-xs" : "text-xs"}
                                />
                              </button>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bottom-full mb-1.5 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30">
                                Download Hasil Ujian (Excel)
                              </span>
                            </div>

                            {/* Tombol Download Analisis Butir Soal Excel */}
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => handleDownloadExcel("analysis", subj.id, subj.subject_name)}
                                disabled={downloadingKey === dlAnalysisKey || subj.total_questions === 0}
                                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
                                aria-label="Download Analisis Butir Soal (Excel)"
                              >
                                <FontAwesomeIcon
                                  icon={downloadingKey === dlAnalysisKey ? faSpinner : faChartPie}
                                  className={downloadingKey === dlAnalysisKey ? "animate-spin text-xs" : "text-xs"}
                                />
                              </button>
                              <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bottom-full mb-1.5 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold whitespace-nowrap shadow-lg z-30">
                                {subj.total_questions === 0
                                  ? "Bank soal belum ditautkan"
                                  : "Download Analisis Butir Soal (Excel)"}
                              </span>
                            </div>
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
      )}

      {/* ================================================================= */}
      {/* TAB 2: PRATINJAU NILAI & ANALISIS BUTIR SOAL                      */}
      {/* ================================================================= */}
      {activeTab === "pratinjau" && (
        <div className="space-y-4">
          {/* Header Pemilih Mapel & Tombol Download */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("daftar")}
                className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="Kembali ke Daftar Mapel"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
              </button>

              <select
                value={selectedSubjectId ?? ""}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-600 cursor-pointer min-w-[220px]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name} (Kelas {gradeToRoman(s.grade)})
                  </option>
                ))}
              </select>

              {/* Sub-tab kompak */}
              <div className="inline-flex bg-slate-100 rounded-xl p-1 border border-slate-200/70 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewSubTab("nilai")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    previewSubTab === "nilai"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daftar Nilai ({detailData?.students.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubTab("analisis")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    previewSubTab === "analisis"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Analisis Soal ({detailData?.item_analysis.length ?? 0})
                </button>
                {scope === "angkatan" && (detailData?.class_breakdown.length ?? 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab("kelas")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      previewSubTab === "kelas"
                        ? "bg-white text-blue-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Per Kelas ({detailData?.class_breakdown.length ?? 0})
                  </button>
                )}
              </div>
            </div>

            {/* Tombol Download Excel untuk mapel aktif */}
            {detailData && (
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadExcel("scores", detailData.subject.id, detailData.subject.subject_name)
                  }
                  disabled={downloadingKey === `scores_${detailData.subject.id}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon
                    icon={downloadingKey === `scores_${detailData.subject.id}` ? faSpinner : faFileExcel}
                    className={downloadingKey === `scores_${detailData.subject.id}` ? "animate-spin" : ""}
                  />
                  <span>Hasil Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadExcel("analysis", detailData.subject.id, detailData.subject.subject_name)
                  }
                  disabled={
                    downloadingKey === `analysis_${detailData.subject.id}` ||
                    detailData.stats.total_questions === 0
                  }
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon
                    icon={downloadingKey === `analysis_${detailData.subject.id}` ? faSpinner : faChartPie}
                    className={downloadingKey === `analysis_${detailData.subject.id}` ? "animate-spin" : ""}
                  />
                  <span>Analisis Excel</span>
                </button>
              </div>
            )}
          </div>

          {loadingDetail || !detailData ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2 text-blue-600" />
              Memuat pratinjau nilai dan analisis butir soal...
            </div>
          ) : (
            <>
              {/* Strip Statistik Ringkas Mapel */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">RATA-RATA</span>
                  <span className="text-sm font-black text-blue-700 font-mono">
                    {detailData.stats.avg_score.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">TERTINGGI</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {detailData.stats.highest_score.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">TERENDAH</span>
                  <span className="text-sm font-black text-rose-600 font-mono">
                    {detailData.stats.lowest_score.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">STD DEVIASI</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {detailData.stats.std_dev.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    TUNTAS (KKM {detailData.stats.passing_score})
                  </span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {detailData.stats.passed_count} ({detailData.stats.pass_rate}%)
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/90 p-3">
                  <span className="text-[10px] font-bold text-slate-400 block">BELUM MENGERJAKAN</span>
                  <span className="text-sm font-black text-slate-600 font-mono">
                    {detailData.stats.not_started_count}
                  </span>
                </div>
              </div>

              {/* SUB-TAB A: DAFTAR NILAI PESERTA */}
              {previewSubTab === "nilai" && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Daftar Nilai Peserta &bull; {detailData.scope_label}
                    </span>
                    <div className="relative w-full sm:w-64">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                      />
                      <input
                        type="text"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        placeholder="Cari nama / NISN / kelas..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 text-[11px] uppercase">
                          <th className="py-2.5 px-3 text-center w-10">No</th>
                          <th className="py-2.5 px-3">NISN / NIS</th>
                          <th className="py-2.5 px-3">Nama Peserta</th>
                          <th className="py-2.5 px-3 text-center">Kelas</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">B / S / K</th>
                          <th className="py-2.5 px-3 text-center">Nilai</th>
                          <th className="py-2.5 px-3 text-center">Ketuntasan</th>
                          <th className="py-2.5 px-3 text-center">Rank</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              Tidak ada peserta yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((stu, idx) => (
                            <tr key={stu.student_id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                <div>{stu.nisn}</div>
                                <div className="text-[10px] text-slate-400">{stu.nis}</div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">{stu.name}</td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                                {stu.class_name}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    stu.status === "submitted"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : stu.status === "in_progress"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : stu.status === "locked"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {stu.status_label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                                {stu.participated ? (
                                  <>
                                    <span className="text-emerald-700 font-bold">{stu.correct}</span>
                                    <span className="text-slate-300"> / </span>
                                    <span className="text-rose-600 font-bold">{stu.wrong}</span>
                                    <span className="text-slate-300"> / </span>
                                    <span className="text-slate-500">{stu.unanswered}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                                {stu.score !== null ? stu.score.toFixed(2) : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {stu.passed === true ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Tuntas
                                  </span>
                                ) : stu.passed === false ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Belum Tuntas
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {stu.rank !== null ? `#${stu.rank}` : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB B: ANALISIS BUTIR SOAL */}
              {previewSubTab === "analisis" && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Analisis Butir Soal &bull; {detailData.subject.subject_name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Tingkat Kesukaran (P), Daya Pembeda Kelley 27% (D), dan Distribusi Pengecoh Opsi A–E.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Mudah: {detailData.difficulty_summary.mudah}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Sedang: {detailData.difficulty_summary.sedang}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Sukar: {detailData.difficulty_summary.sukar}
                      </span>
                    </div>
                  </div>

                  {detailData.item_analysis.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-lg" />
                      <p>Mata pelajaran ini belum memiliki bank soal / butir soal untuk dianalisis.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 text-[10px] uppercase">
                            <th className="py-2.5 px-3 text-center">No</th>
                            <th className="py-2.5 px-3">Cuplikan Soal</th>
                            <th className="py-2.5 px-2 text-center">Kunci</th>
                            <th className="py-2.5 px-2 text-center">Benar</th>
                            <th className="py-2.5 px-2 text-center">Salah</th>
                            <th className="py-2.5 px-2 text-center">Distribusi A / B / C / D / E</th>
                            <th className="py-2.5 px-2 text-center">Kesukaran (P)</th>
                            <th className="py-2.5 px-2 text-center">Daya Beda (D)</th>
                            <th className="py-2.5 px-3">Rekomendasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.item_analysis.map((item) => {
                            const oc = item.option_counts;
                            return (
                              <tr key={item.question_id} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                  #{item.question_number}
                                </td>
                                <td className="py-2.5 px-3 max-w-xs">
                                  <p className="text-slate-800 line-clamp-2 leading-snug">
                                    {item.content_preview || "-"}
                                  </p>
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono font-black text-blue-700">
                                  {item.correct_answer || "-"}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                                  {item.correct_count}{" "}
                                  <span className="text-[10px] font-normal text-slate-400">
                                    ({item.pct_correct}%)
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-rose-600">
                                  {item.wrong_count}
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                  {oc.A ?? 0} / {oc.B ?? 0} / {oc.C ?? 0} / {oc.D ?? 0} / {oc.E ?? 0}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <div className="font-mono font-bold text-slate-800">
                                    {item.difficulty_index !== null ? item.difficulty_index.toFixed(2) : "-"}
                                  </div>
                                  <span
                                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                                      item.difficulty_label === "Sedang"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : item.difficulty_label === "Mudah"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : item.difficulty_label === "Sukar"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {item.difficulty_label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <div className="font-mono font-bold text-slate-800">
                                    {item.discrimination_index !== null
                                      ? item.discrimination_index.toFixed(2)
                                      : "-"}
                                  </div>
                                  <span
                                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                                      item.discrimination_label === "Sangat Baik" ||
                                      item.discrimination_label === "Baik"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : item.discrimination_label === "Cukup"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : item.discrimination_label === "Jelek"
                                        ? "bg-rose-50 text-rose-700 border-rose-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {item.discrimination_label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[11px] font-medium text-slate-700">
                                  {item.recommendation}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB C: REKAP PER KELAS (SAAT SCOPE ANGKATAN) */}
              {previewSubTab === "kelas" && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      Perbandingan Performa Per Kelas &bull; {detailData.subject.subject_name}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 text-[11px] uppercase">
                          <th className="py-2.5 px-4 text-center w-10">No</th>
                          <th className="py-2.5 px-3">Kelas</th>
                          <th className="py-2.5 px-3 text-center">Total Siswa</th>
                          <th className="py-2.5 px-3 text-center">Mengerjakan</th>
                          <th className="py-2.5 px-3 text-center">Rata-rata</th>
                          <th className="py-2.5 px-3 text-center">Tertinggi</th>
                          <th className="py-2.5 px-3 text-center">Terendah</th>
                          <th className="py-2.5 px-3 text-center">Ketuntasan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.class_breakdown.map((cb, idx) => (
                          <tr key={cb.class_name} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{cb.class_name}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{cb.total_students}</td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {cb.participated_count}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700">
                              {cb.participated_count > 0 ? cb.avg_score.toFixed(2) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-700">
                              {cb.participated_count > 0 ? cb.highest_score.toFixed(2) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-rose-600">
                              {cb.participated_count > 0 ? cb.lowest_score.toFixed(2) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {cb.participated_count > 0
                                ? `${cb.passed_count}/${cb.participated_count} (${cb.pass_rate}%)`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function HasilUjianPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-600 font-bold text-sm">
          Memuat Hasil Ujian...
        </div>
      }
    >
      <HasilUjianContent />
    </Suspense>
  );
}
