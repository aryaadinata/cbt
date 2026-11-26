"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarDays,
  faClock,
  faPlus,
  faPen,
  faTrash,
  faRotate,
  faXmark,
  faBookOpen,
  faUsers,
  faCheck,
  faCircleCheck,
  faCircleExclamation,
  faLayerGroup,
  faArrowRight,
  faDiagramProject,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

interface ExamSubject {
  id: number;
  exam_id: number;
  subject_name: string;
  grade: number;
  target_classes: string[];
  duration_minutes: number;
  total_questions: number;
  status: string;
  exam_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

interface ExamItem {
  id: number;
  title: string;
  exam_type: string;
  status: string;
  created_at: string;
}

const COMMON_TIME_PRESETS = [
  { label: "Sesi 1 (07:30 - 09:00)", start: "07:30", end: "09:00" },
  { label: "Sesi 2 (09:30 - 11:00)", start: "09:30", end: "11:00" },
  { label: "Sesi 3 (11:30 - 13:00)", start: "11:30", end: "13:00" },
  { label: "Sesi Siang (13:30 - 15:00)", start: "13:30", end: "15:00" },
];

export default function ExamSchedulingPage() {
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get("exam_id");

  const { token, user, isAdminOrStaff, isLoading } = useAuth();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal State Jadwal
  const [showModal, setShowModal] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("07:30");
  const [formEndTime, setFormEndTime] = useState("09:00");
  const [formSelectedSubjects, setFormSelectedSubjects] = useState<number[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Helper Formatter Tanggal Indo
  const formatIndoDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getDayName = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", { weekday: "long" });
    } catch {
      return "";
    }
  };

  // 1. Fetch Daftar Paket Ujian
  const fetchExams = async () => {
    if (!token) return;
    try {
      setLoadingExams(true);
      const res = await fetch("/api/cbt-backend/api/cbt/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const examList: ExamItem[] = data.exams || [];
        setExams(examList);

        // Set default selected exam
        if (examList.length > 0) {
          if (initialExamId) {
            const found = examList.find((e) => e.id === Number(initialExamId));
            setSelectedExamId(found ? found.id : examList[0].id);
          } else if (!selectedExamId) {
            setSelectedExamId(examList[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Gagal memuat daftar ujian:", err);
    } finally {
      setLoadingExams(false);
    }
  };

  // 2. Fetch Detail Ujian Terpilih (Mata Pelajaran & Jadwal)
  const fetchExamDetail = async (id: number) => {
    if (!token || !id) return;
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedExam(data.exam);
        setSubjects(data.exam.subjects || []);
      }
    } catch (err) {
      console.error("Gagal memuat detail ujian:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExams();
    }
  }, [token]);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamDetail(selectedExamId);
    }
  }, [selectedExamId]);

  // Buka Modal Tambah Jadwal Baru
  const handleOpenAddSchedule = () => {
    // Default tanggal besok atau hari ini
    const today = new Date().toISOString().split("T")[0];
    setFormDate(today);
    setFormStartTime("07:30");
    setFormEndTime("09:00");
    // Default pilih mapel yang belum terjadwal
    const unscheduledIds = subjects
      .filter((s) => !s.exam_date || s.exam_date.trim() === "")
      .map((s) => s.id);
    setFormSelectedSubjects(unscheduledIds.length > 0 ? unscheduledIds : subjects.map((s) => s.id));
    setShowModal(true);
  };

  // Buka Modal Edit untuk Slot Waktu Tertentu
  const handleOpenEditSlot = (date: string, startTime: string, endTime: string, slotSubjects: ExamSubject[]) => {
    setFormDate(date);
    setFormStartTime(startTime || "07:30");
    setFormEndTime(endTime || "09:00");
    setFormSelectedSubjects(slotSubjects.map((s) => s.id));
    setShowModal(true);
  };

  // Buka Modal Khusus 1 Mapel Tertentu
  const handleOpenScheduleSingle = (subj: ExamSubject) => {
    const defaultDate = subj.exam_date || new Date().toISOString().split("T")[0];
    setFormDate(defaultDate);
    setFormStartTime(subj.start_time || "07:30");
    setFormEndTime(subj.end_time || "09:00");
    setFormSelectedSubjects([subj.id]);
    setShowModal(true);
  };

  // Toggle Pilihan Mapel di Modal
  const handleToggleSubject = (subjectId: number) => {
    setFormSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  // Simpan Jadwal Ujian
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) {
      Swal.fire("Peringatan", "Pilih tanggal pelaksanaan ujian.", "warning");
      return;
    }
    if (!formStartTime || !formEndTime) {
      Swal.fire("Peringatan", "Tentukan jam mulai dan jam selesai ujian.", "warning");
      return;
    }
    if (formSelectedSubjects.length === 0) {
      Swal.fire("Peringatan", "Pilih minimal satu mata pelajaran untuk jadwal ini.", "warning");
      return;
    }

    if (!token || !selectedExamId) return;

    try {
      setSavingSchedule(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exam_date: formDate,
          start_time: formStartTime,
          end_time: formEndTime,
          subject_ids: formSelectedSubjects,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        Swal.fire({
          icon: "success",
          title: "Jadwal Disimpan!",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
        });
        fetchExamDetail(selectedExamId);
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menyimpan jadwal ujian.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan saat menyimpan jadwal.", "error");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Hapus Jadwal dari Satu Mapel
  const handleClearSubjectSchedule = (subjId: number, subjName: string) => {
    if (!token || !selectedExamId) return;

    Swal.fire({
      title: "Hapus dari Jadwal?",
      text: `Jadwal tanggal dan jam untuk mata pelajaran "${subjName}" akan dikosongkan.`,
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
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/schedule/${subjId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            Swal.fire({
              icon: "success",
              title: "Jadwal Dikosongkan",
              text: data.message,
              timer: 1500,
              showConfirmButton: false,
            });
            fetchExamDetail(selectedExamId);
          } else {
            Swal.fire("Gagal", data.detail || "Gagal menghapus jadwal.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Terjadi kesalahan saat menghapus jadwal.", "error");
        }
      }
    });
  };

  // Mapel Terjadwal vs Belum Terjadwal
  const scheduledSubjects = subjects.filter((s) => s.exam_date && s.exam_date.trim() !== "");
  const unscheduledSubjects = subjects.filter((s) => !s.exam_date || s.exam_date.trim() === "");

  // Kelompokkan mapel terjadwal per Tanggal, lalu per Jam/Waktu
  const groupedByDate: { [date: string]: { [timeslot: string]: ExamSubject[] } } = {};
  scheduledSubjects.forEach((s) => {
    const d = s.exam_date!;
    const slot = `${s.start_time || "07:30"} - ${s.end_time || "09:00"}`;
    if (!groupedByDate[d]) {
      groupedByDate[d] = {};
    }
    if (!groupedByDate[d][slot]) {
      groupedByDate[d][slot] = [];
    }
    groupedByDate[d][slot].push(s);
  });

  // Urutkan tanggal
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* Header Penjadwalan Ujian */}
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
            Penjadwalan Ujian
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Penjadwalan: {selectedExam?.title || "Memuat..."}
              </h1>
              {selectedExam && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                  Paket #{selectedExam.id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Atur tanggal, jam, dan mata pelajaran yang akan diujikan pada paket ujian ini.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {exams.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 font-semibold hidden md:inline">Ganti Paket:</span>
                <select
                  value={selectedExamId || ""}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedExam && (
              <Link
                href={`/ujian/mapping/${selectedExam.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Atur Mapping Mapel & Kelas"
              >
                <FontAwesomeIcon icon={faDiagramProject} className="text-xs text-indigo-600" />
                <span>Atur Mapping Ujian Ini</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                fetchExams();
                if (selectedExamId) fetchExamDetail(selectedExamId);
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Perbarui Data"
            >
              <FontAwesomeIcon icon={faRotate} className={`text-xs ${loadingDetail ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Pengaturan Jadwal Ujian Paket Terpilih */}
      {selectedExam && (
        <div className="space-y-4">
          {/* Bar Info & Tombol Aksi Tambah Jadwal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-sm font-black text-slate-900 truncate max-w-md">
                  {selectedExam.title}
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                <span className="text-slate-600 font-semibold">
                  Total: <b>{subjects.length}</b> Mapel
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {scheduledSubjects.length} Terjadwal
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {unscheduledSubjects.length} Belum Dijadwalkan
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddSchedule}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Atur Jadwal Ujian</span>
                </button>
              )}
            </div>
          </div>

          {/* Alert Jika Belum Ada Mata Pelajaran yang Di-Mapping */}
          {subjects.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-xl">
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Paket Ujian Ini Belum Memiliki Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sebelum mengatur tanggal dan jam ujian, daftarkan mata pelajaran dan tentukan kelas sasaran terlebih dahulu pada fitur Mapping Ujian.
              </p>
              <Link
                href={`/ujian/mapping/${selectedExam.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <FontAwesomeIcon icon={faDiagramProject} className="text-xs" />
                <span>Buka Mapping Ujian Sekarang</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Section 1: Mapel yang Belum Terjadwal */}
              {unscheduledSubjects.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-600" />
                      <span>
                        Terdapat {unscheduledSubjects.length} Mata Pelajaran Belum Memiliki Jadwal Ujian:
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddSchedule}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer self-start sm:self-auto"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                      <span>Jadwalkan Sekaligus</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {unscheduledSubjects.map((subj) => (
                      <div
                        key={subj.id}
                        className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {subj.subject_name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>Kelas {subj.grade}</span>
                            <span>&bull;</span>
                            <span>{subj.duration_minutes || 90} Menit</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenScheduleSingle(subj)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition shrink-0 cursor-pointer"
                        >
                          Atur Jadwal
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Jadwal yang Sudah Diatur (Dikelompokkan per Tanggal & Jam) */}
              {scheduledSubjects.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-xl">
                    <FontAwesomeIcon icon={faCalendarDays} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Belum Ada Jadwal yang Diatur
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Mata pelajaran dalam paket ini belum memiliki tanggal dan jam ujian. Klik tombol di bawah untuk mulai mengatur jadwal.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddSchedule}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span>Atur Jadwal Ujian Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDates.map((dateStr) => {
                    const timeslots = groupedByDate[dateStr];
                    const totalSubjectsOnDate = Object.values(timeslots).reduce(
                      (acc, arr) => acc + arr.length,
                      0
                    );

                    return (
                      <div
                        key={dateStr}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
                      >
                        {/* Header Tanggal */}
                        <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              <FontAwesomeIcon icon={faCalendarDays} />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                                {formatIndoDate(dateStr)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {totalSubjectsOnDate} Mata Pelajaran Diujikan
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setFormDate(dateStr);
                              setFormStartTime("07:30");
                              setFormEndTime("09:00");
                              setFormSelectedSubjects([]);
                              setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer self-start sm:self-auto shadow-2xs"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                            <span>Tambah Sesi di Tanggal Ini</span>
                          </button>
                        </div>

                        {/* List Sesi Jam pada Tanggal Ini */}
                        <div className="divide-y divide-slate-100 p-3 sm:p-4 space-y-3">
                          {Object.entries(timeslots).map(([timeslot, slotSubjects]) => {
                            const [sTime, eTime] = timeslot.split(" - ");
                            return (
                              <div
                                key={timeslot}
                                className="bg-slate-50/60 rounded-xl p-3 border border-slate-200/60 space-y-2.5"
                              >
                                {/* Baris Jam / Waktu Pelaksanaan */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-xs shadow-2xs">
                                    <FontAwesomeIcon icon={faClock} className="text-indigo-600 text-[10px]" />
                                    <span>Pukul: {timeslot} WIB</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSlot(dateStr, sTime, eTime, slotSubjects)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                                  >
                                    <FontAwesomeIcon icon={faPen} className="text-[9px]" />
                                    <span>Edit Sesi Ini</span>
                                  </button>
                                </div>

                                {/* Tabel Mapel dalam Jam/Sesi Ini */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {slotSubjects.map((subj) => {
                                    const targetList = Array.isArray(subj.target_classes)
                                      ? subj.target_classes
                                      : [];
                                    const isAllClasses = targetList.length === 0 || targetList.includes("all");

                                    return (
                                      <div
                                        key={subj.id}
                                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-2"
                                      >
                                        <div>
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="font-bold text-slate-900 text-xs leading-snug">
                                              {subj.subject_name}
                                            </div>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                                              Kelas {subj.grade}
                                            </span>
                                          </div>

                                          <div className="mt-1.5 text-[11px] text-slate-500 space-y-1">
                                            <div className="flex items-center gap-1">
                                              <FontAwesomeIcon icon={faClock} className="text-[10px] text-slate-400" />
                                              <span>{subj.duration_minutes || 90} Menit</span>
                                            </div>
                                            <div className="flex items-start gap-1">
                                              <FontAwesomeIcon icon={faUsers} className="text-[10px] text-slate-400 mt-0.5 shrink-0" />
                                              <span className="truncate">
                                                {isAllClasses ? "Semua Kelas" : targetList.join(", ")}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-slate-100">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenScheduleSingle(subj)}
                                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                                            title="Ubah Jadwal Mapel Ini"
                                          >
                                            <FontAwesomeIcon icon={faPen} className="text-[9px]" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleClearSubjectSchedule(subj.id, subj.subject_name)}
                                            className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                                            title="Hapus dari Jadwal"
                                          >
                                            <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ATUR JADWAL UJIAN (PILIH TANGGAL, JAM, DAN MAPEL) */}
      {/* ========================================================================= */}
      {showModal && selectedExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modal (Fixed Top) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    Atur Jadwal Pelaksanaan Ujian
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Paket: <b>{selectedExam.title}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shrink-0 ml-2"
                title="Tutup"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Form Modal dengan Scrollable Body & Sticky Footer */}
            <form onSubmit={handleSaveSchedule} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Field 1: Tanggal Pelaksanaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Tanggal Pelaksanaan Ujian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                  {formDate && (
                    <p className="text-xs text-blue-700 font-semibold mt-1">
                      Hari: <b>{formatIndoDate(formDate)}</b>
                    </p>
                  )}
                </div>

                {/* Field 2: Jam Pelaksanaan (Mulai & Selesai) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Jam / Waktu Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block mb-1">Jam Mulai:</span>
                      <input
                        type="time"
                        required
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block mb-1">Jam Selesai:</span>
                      <input
                        type="time"
                        required
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                  </div>

                  {/* Preset Sesi Cepat */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat:</span>
                    {COMMON_TIME_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setFormStartTime(p.start);
                          setFormEndTime(p.end);
                        }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 3: Pilih Mapel Apa Saja yang Diujikan */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        3. Pilih Mata Pelajaran yang Diujikan <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Centang mata pelajaran yang akan dilaksanakan pada tanggal &amp; jam di atas.
                      </span>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {formSelectedSubjects.length} Dipilih
                    </span>
                  </div>

                  {/* Shortcut Pilihan Mapel */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormSelectedSubjects(subjects.map((s) => s.id))}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormSelectedSubjects(
                          subjects
                            .filter((s) => !s.exam_date || s.exam_date.trim() === "")
                            .map((s) => s.id)
                        )
                      }
                      className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                    >
                      Hanya yang Belum Dijadwalkan
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSelectedSubjects([])}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer ml-auto"
                    >
                      Kosongkan
                    </button>
                  </div>

                  {/* List Checklist Mapel */}
                  <div className="max-h-56 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1.5">
                    {subjects.map((subj) => {
                      const isSelected = formSelectedSubjects.includes(subj.id);
                      const isAlreadyScheduled = Boolean(subj.exam_date && subj.exam_date.trim() !== "");

                      return (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => handleToggleSubject(subj.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                              : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200/80"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs truncate">{subj.subject_name}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                Kelas {subj.grade}
                              </span>
                            </div>

                            <div
                              className={`text-[10px] mt-0.5 truncate ${
                                isSelected ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              {isAlreadyScheduled ? (
                                <span>
                                  Jadwal saat ini: {subj.exam_date} ({subj.start_time} - {subj.end_time})
                                </span>
                              ) : (
                                <span>Belum memiliki jadwal</span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-2 text-xs ${
                              isSelected ? "bg-white text-blue-600 font-bold" : "border border-slate-300"
                            }`}
                          >
                            {isSelected && <FontAwesomeIcon icon={faCheck} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Modal (Sticky Bottom, Selalu Terlihat & Tidak Terpotong) */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule || formSelectedSubjects.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingSchedule ? "Menyimpan..." : "Simpan Jadwal Ujian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
