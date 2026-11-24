"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faPlus,
  faFileWord,
  faPaste,
  faTrash,
  faCheckCircle,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faArrowLeft,
  faRotate,
  faFloppyDisk,
  faFileCircleCheck,
  faClipboardList,
  faEye,
  faLink,
  faXmark,
  faClock,
  faGraduationCap,
  faChalkboardUser,
  faLayerGroup,
  faCheck,
  faSliders,
  faGear,
  faMagnifyingGlass,
  faCirclePlay,
  faShieldHalved,
  faFolderOpen,
  faImage,
  faUpload,
  faPen,
  faUserPlus,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function BankSoalPage() {
  const { token, user, isAdminOrStaff, isTeacher } = useAuth();
  const router = useRouter();

  // Mode Tampilan Tab:
  // 1. "per_ujian": Admin memilih Paket Ujian -> Memilih Mapel -> Impor Word / Buat Soal Manual langsung ke mapel tersebut
  // 2. "semua_bank": Koleksi seluruh bank soal mandiri
  // 3. "tugas_ujian": Tugas penyusunan soal yang ditugaskan panitia/admin kepada guru
  const [activeTab, setActiveTab] = useState<"per_ujian" | "semua_bank" | "tugas_ujian">("per_ujian");

  // Jika login sebagai Guru (bukan Admin/Staff), otomatis arahkan ke tab tugas naskah ujian
  useEffect(() => {
    if (!isAdminOrStaff) {
      setActiveTab("tugas_ujian");
    }
  }, [isAdminOrStaff]);

  // =========================================================================
  // STATE TUGAS PEMBUATAN SOAL GURU
  // =========================================================================
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(false);

  // Modal Penugasan Guru Pembuat Soal (Admin)
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignMode, setAssignMode] = useState<"subject" | "bank">("subject");
  const [assignTargetSubject, setAssignTargetSubject] = useState<any | null>(null);
  const [assignTargetBank, setAssignTargetBank] = useState<any | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState<number | null>(null);
  const [assignTeacherName, setAssignTeacherName] = useState<string>("");
  const [savingAssign, setSavingAssign] = useState<boolean>(false);

  // =========================================================================
  // STATE DATA UJIAN & MAPEL (MODE 1)
  // =========================================================================
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [loadingExams, setLoadingExams] = useState<boolean>(true);
  const [loadingExamDetail, setLoadingExamDetail] = useState<boolean>(false);
  const [subjectSearch, setSubjectSearch] = useState<string>("");
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<string>("all");

  // Modal Tambah Mapel Baru ke Ujian
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjName, setNewSubjName] = useState<string>("");
  const [newSubjGrade, setNewSubjGrade] = useState<number>(10);
  const [newSubjTeacherId, setNewSubjTeacherId] = useState<number | null>(null);
  const [newSubjTeacher, setNewSubjTeacher] = useState<string>("");
  const [newSubjDuration, setNewSubjDuration] = useState<number>(90);
  const [newSubjPassingScore, setNewSubjPassingScore] = useState<number>(75);
  const [savingNewSubject, setSavingNewSubject] = useState<boolean>(false);

  // Modal Hubungkan Bank Soal yang Sudah Ada ke Mapel
  const [showLinkBankModal, setShowLinkBankModal] = useState<boolean>(false);
  const [linkTargetSubject, setLinkTargetSubject] = useState<any | null>(null);
  const [selectedExistingBankId, setSelectedExistingBankId] = useState<number | null>(null);
  const [linkingBank, setLinkingBank] = useState<boolean>(false);


  // =========================================================================
  // STATE MASTER BANK SOAL (MODE 2 & UMUM)
  // =========================================================================
  const [banks, setBanks] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState<boolean>(true);
  const [bankCategoryFilter, setBankCategoryFilter] = useState<"all" | "self" | "assignment">("all");
  const [teachers, setTeachers] = useState<any[]>([]);

  // Modal Buat Bank Soal Baru Mandiri
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newBankTitle, setNewBankTitle] = useState<string>("");
  const [newBankSubject, setNewBankSubject] = useState<string>("");
  const [newBankGrade, setNewBankGrade] = useState<number>(10);
  const [newBankTeacherId, setNewBankTeacherId] = useState<number | null>(null);
  const [newBankTeacherName, setNewBankTeacherName] = useState<string>("");
  const [creatingBank, setCreatingBank] = useState<boolean>(false);

  // =========================================================================
  // STATE IMPOR SOAL DARI WORD (.DOCX)
  // =========================================================================
  const [showWordModal, setShowWordModal] = useState<boolean>(false);
  const [selectedDocxFile, setSelectedDocxFile] = useState<File | null>(null);
  const [uploadingDocx, setUploadingDocx] = useState<boolean>(false);

  // Target Konteks Impor / Pembuatan Soal:
  // Apakah sedang untuk mata pelajaran ujian tertentu, atau ke bank soal mandiri
  const [targetSubject, setTargetSubject] = useState<any | null>(null);
  const [targetBankId, setTargetBankId] = useState<number | null>(null);
  const [targetBankTitle, setTargetBankTitle] = useState<string>("");

  // Interactive Live Preview Modal (Hasil Ekstraksi Word Sebelum Disimpan)
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [savingBatch, setSavingBatch] = useState<boolean>(false);

  // =========================================================================
  // STATE PENGATURAN ATURAN UJIAN PER MATA PELAJARAN / BANK SOAL
  // =========================================================================
  const [showExamSettingsModal, setShowExamSettingsModal] = useState<boolean>(false);
  const [selectedTargetForSettings, setSelectedTargetForSettings] = useState<{
    type: "bank" | "subject" | "assignment";
    data: any;
    bankId?: number | null;
    subjectId?: number | null;
    examId?: number | null;
    title: string;
    subjectName: string;
    grade?: number | string;
  } | null>(null);
  const [settingRandomizeQuestions, setSettingRandomizeQuestions] = useState<boolean>(true);
  const [settingRandomizeOptions, setSettingRandomizeOptions] = useState<boolean>(true);
  const [settingShowScore, setSettingShowScore] = useState<boolean>(true);
  const [settingShowExplanation, setSettingShowExplanation] = useState<boolean>(false);
  const [settingDuration, setSettingDuration] = useState<number>(90);
  const [settingPassingScore, setSettingPassingScore] = useState<number>(75);
  const [settingMaxViolations, setSettingMaxViolations] = useState<number>(3);
  const [savingExamSettings, setSavingExamSettings] = useState<boolean>(false);

  // =========================================================================
  // STATE MASTER BANK SOAL & UJIAN
  // =========================================================================

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
        const list = data.exams || [];
        setExams(list);

        // Otomatis pilih paket ujian pertama jika belum ada yang terpilih
        if (!selectedExamId && list.length > 0) {
          setSelectedExamId(list[0].id);
        }
      }
    } catch (e) {
      console.error("Gagal mengambil daftar ujian:", e);
    } finally {
      setLoadingExams(false);
    }
  };

  // 2. Fetch Rincian Paket Ujian & Daftar Mapel di dalamnya
  const fetchExamDetail = async (examId: number) => {
    if (!token || !examId) return;
    try {
      setLoadingExamDetail(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedExam(data.exam || null);
      }
    } catch (e) {
      console.error("Gagal mengambil detail ujian:", e);
    } finally {
      setLoadingExamDetail(false);
    }
  };

  // 3. Fetch Seluruh Bank Soal Mandiri
  const fetchBanks = async () => {
    if (!token) return;
    try {
      setLoadingBanks(true);
      const res = await fetch("/api/cbt-backend/api/cbt/banks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBanks(data.banks || []);
      }
    } catch (e) {
      console.error("Gagal mengambil daftar bank soal:", e);
    } finally {
      setLoadingBanks(false);
    }
  };

  // 4. Fetch Daftar Guru (sinkron dari SIAKAD / cbt_synced_teachers)
  const fetchTeachers = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/sync/teachers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
      } else {
        const fallbackRes = await fetch("/api/cbt-backend/api/cbt/schedule/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          setTeachers(fbData.teachers || []);
        }
      }
    } catch (e) {
      console.error("Gagal mengambil daftar guru:", e);
    }
  };

  // 5. Fetch Tugas Pembuatan Soal Naskah Ujian (untuk Guru)
  const fetchTeacherAssignments = async () => {
    if (!token) return;
    try {
      setLoadingAssignments(true);
      const res = await fetch("/api/cbt-backend/api/cbt/exams/teacher/my-assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherAssignments(data.assignments || []);
      }
    } catch (e) {
      console.error("Gagal mengambil tugas pembuatan soal guru:", e);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchBanks();
    fetchTeachers();
    fetchTeacherAssignments();
  }, [token]);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamDetail(selectedExamId);
    }
  }, [selectedExamId, token]);

  // Handler Buka Modal Tugaskan Guru untuk Mata Pelajaran Ujian
  const handleOpenAssignForSubject = (subj: any) => {
    if (!isAdminOrStaff) return;
    setAssignMode("subject");
    setAssignTargetSubject(subj);
    setAssignTargetBank(null);

    const foundTeacher = teachers.find(
      (t) => (subj.teacher_id && t.id === subj.teacher_id) || (subj.teacher_name && t.name === subj.teacher_name)
    );
    if (foundTeacher) {
      setAssignTeacherId(foundTeacher.id);
      setAssignTeacherName(foundTeacher.name);
    } else {
      setAssignTeacherId(subj.teacher_id || null);
      setAssignTeacherName(subj.teacher_name || "");
    }
    setShowAssignModal(true);
  };

  // Handler Buka Modal Tugaskan Guru untuk Bank Soal Mandiri
  const handleOpenAssignForBank = (b: any) => {
    if (!isAdminOrStaff) return;
    setAssignMode("bank");
    setAssignTargetSubject(null);
    setAssignTargetBank(b);

    const foundTeacher = teachers.find(
      (t) => (b.teacher_id && t.id === b.teacher_id) || (b.teacher_name && t.name === b.teacher_name)
    );
    if (foundTeacher) {
      setAssignTeacherId(foundTeacher.id);
      setAssignTeacherName(foundTeacher.name);
    } else {
      setAssignTeacherId(b.teacher_id || null);
      setAssignTeacherName(b.teacher_name || "");
    }
    setShowAssignModal(true);
  };

  // Handler Simpan Penugasan Guru Pembuat Soal
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!assignTeacherName.trim()) {
      Swal.fire("Pilih Guru", "Silakan pilih guru yang akan ditugaskan.", "warning");
      return;
    }

    try {
      setSavingAssign(true);
      const targetExamId = assignTargetSubject?.exam_id || selectedExamId;
      if (assignMode === "subject" && assignTargetSubject && targetExamId) {
        const res = await fetch(
          `/api/cbt-backend/api/cbt/exams/${targetExamId}/subjects/${assignTargetSubject.id}/assign-teacher`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              teacher_id: assignTeacherId,
              teacher_name: assignTeacherName.trim(),
              create_bank_if_missing: true,
            }),
          }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setShowAssignModal(false);
          fetchExamDetail(targetExamId);
          fetchBanks();
          fetchTeacherAssignments();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("cbt:refresh_notifications"));
          }
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: data.message,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire("Gagal", data.detail || "Gagal menugaskan guru.", "error");
        }
      } else if (assignMode === "bank" && assignTargetBank) {
        const res = await fetch(
          `/api/cbt-backend/api/cbt/banks/${assignTargetBank.id}/assign-teacher`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              teacher_id: assignTeacherId,
              teacher_name: assignTeacherName.trim(),
            }),
          }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setShowAssignModal(false);
          fetchBanks();
          if (selectedExamId) fetchExamDetail(selectedExamId);
          fetchTeacherAssignments();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("cbt:refresh_notifications"));
          }
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: data.message,
            showConfirmButton: false,
            timer: 3000,
          });
        } else {
          Swal.fire("Gagal", data.detail || "Gagal menugaskan guru.", "error");
        }
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Gagal menghubungi server.", "error");
    } finally {
      setSavingAssign(false);
    }
  };

  // Handler Buka Modal Impor Word untuk Mapel Tertentu pada Ujian
  const handleOpenWordImportForSubject = (subj: any) => {
    setTargetSubject(subj);
    setTargetBankId(subj.bank_id || null);
    setTargetBankTitle(subj.bank_title || `${subj.exam_title || selectedExam?.title || "Ujian"} - ${subj.subject_name}`);
    setSelectedDocxFile(null);
    setShowWordModal(true);
  };

  // Handler Buka Modal Impor Word untuk Bank Soal Mandiri
  const handleOpenWordImportForBank = (b: any) => {
    setTargetSubject(null);
    setTargetBankId(b.id);
    setTargetBankTitle(b.title);
    setSelectedDocxFile(null);
    setShowWordModal(true);
  };

  // =========================================================================
  // HANDLER PENGATURAN ATURAN UJIAN PER MATA PELAJARAN / BANK SOAL
  // =========================================================================
  const handleOpenExamSettings = (targetType: "bank" | "subject" | "assignment", item: any) => {
    const isRandQ = item.randomize_questions !== undefined ? Boolean(Number(item.randomize_questions)) : true;
    const isRandOpt = item.randomize_options !== undefined ? Boolean(Number(item.randomize_options)) : true;
    const isShowScore = item.show_score !== undefined ? Boolean(Number(item.show_score)) : true;
    const isShowExp = item.show_explanation !== undefined ? Boolean(Number(item.show_explanation)) : false;
    const dur = Number(item.duration_minutes || 90);
    const pass = Number(item.passing_score || 75);
    const maxVio = Number(item.max_violations !== undefined ? item.max_violations : 3);

    setSelectedTargetForSettings({
      type: targetType,
      data: item,
      bankId: targetType === "bank" ? item.id : item.bank_id,
      subjectId: targetType === "subject" || targetType === "assignment" ? item.id : null,
      examId: item.exam_id || selectedExamId || null,
      title: item.title || item.subject_name || "Mata Pelajaran",
      subjectName: item.subject_name || item.title || "",
      grade: item.grade || (selectedExam ? selectedExam.grade : 10),
    });

    setSettingRandomizeQuestions(isRandQ);
    setSettingRandomizeOptions(isRandOpt);
    setSettingShowScore(isShowScore);
    setSettingShowExplanation(isShowExp);
    setSettingDuration(dur);
    setSettingPassingScore(pass);
    setSettingMaxViolations(maxVio);
    setShowExamSettingsModal(true);
  };

  const handleSaveExamSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !selectedTargetForSettings) return;

    try {
      setSavingExamSettings(true);
      const { bankId, subjectId, examId, subjectName } = selectedTargetForSettings;

      // 1. Jika bankId ada, update lewat /api/cbt-backend/api/cbt/banks/{bank_id}/exam-settings
      if (bankId) {
        const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/exam-settings`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            randomize_questions: settingRandomizeQuestions,
            randomize_options: settingRandomizeOptions,
            show_score: settingShowScore,
            show_explanation: settingShowExplanation,
            duration_minutes: Number(settingDuration),
            passing_score: Number(settingPassingScore),
            max_violations: Number(settingMaxViolations),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Gagal memperbarui pengaturan bank soal.");
        }
      }

      // 2. Jika merupakan subject dalam ujian (type === "subject" atau "assignment")
      if (examId && subjectId) {
        const subjRes = await fetch(`/api/cbt-backend/api/cbt/exams/${examId}/subjects/${subjectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            duration_minutes: Number(settingDuration),
            passing_score: Number(settingPassingScore),
            randomize_questions: settingRandomizeQuestions,
            randomize_options: settingRandomizeOptions,
            show_score: settingShowScore,
            show_explanation: settingShowExplanation,
            max_violations: Number(settingMaxViolations),
          }),
        });

        if (!subjRes.ok && !bankId) {
          const errData = await subjRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Gagal memperbarui pengaturan mata pelajaran.");
        }
      }

      setShowExamSettingsModal(false);
      // Refresh list
      fetchBanks();
      if (selectedExamId) fetchExamDetail(selectedExamId);
      fetchTeacherAssignments();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Aturan ujian mapel "${subjectName}" berhasil disimpan!`,
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire("Gagal", err.message || "Gagal menyimpan pengaturan ujian mapel.", "error");
    } finally {
      setSavingExamSettings(false);
    }
  };

  // =========================================================================
  // HANDLER NAVIGASI KE HALAMAN KELOLA & EDIT SOAL MAPEL
  // =========================================================================
  const handleNavigateToManageQuestions = async (subj?: any, existingBank?: any) => {
    if (existingBank) {
      router.push(`/bank-soal/${existingBank.id}`);
      return;
    }

    if (subj) {
      if (subj.bank_id) {
        router.push(`/bank-soal/${subj.bank_id}`);
        return;
      }

      // Jika mata pelajaran ujian belum memiliki wadah bank soal, buatkan otomatis
      try {
        Swal.fire({
          title: "Menyiapkan Halaman Soal...",
          text: `Membuat wadah bank soal untuk ${subj.subject_name}...`,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const examIdToUse = subj.exam_id || selectedExamId;
        const examTitleToUse = subj.exam_title || selectedExam?.title || "Ujian";

        const res = await fetch("/api/cbt-backend/api/cbt/banks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `${examTitleToUse} - ${subj.subject_name} (Kelas ${subj.grade || 10})`,
            subject_name: subj.subject_name,
            grade: Number(subj.grade || 10),
            teacher_id: subj.teacher_id || null,
            teacher_name: subj.teacher_name || user?.name || null,
            questions: [],
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.detail || "Gagal membuat wadah bank soal.");
        }

        const newBankId = data.bank_id;

        // Kaitkan bank_id baru ke cbt_exam_subjects
        if (examIdToUse) {
          await fetch(`/api/cbt-backend/api/cbt/exams/${examIdToUse}/subjects/${subj.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              bank_id: newBankId,
            }),
          });
        }

        Swal.close();
        router.push(`/bank-soal/${newBankId}`);
      } catch (e: any) {
        Swal.fire("Gagal Menyiapkan Soal", e.message || "Terjadi kesalahan.", "error");
      }
    }
  };

  // 5. Ekstraksi / Parse File Word (.docx)
  const handleParseDocx = async () => {
    if (!token || !selectedDocxFile) {
      Swal.fire("Pilih File", "Silakan pilih file Microsoft Word (.docx) terlebih dahulu.", "warning");
      return;
    }
    try {
      setUploadingDocx(true);
      const formData = new FormData();
      formData.append("file", selectedDocxFile);

      const res = await fetch("/api/cbt-backend/api/cbt/banks/parse-docx", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setParsedQuestions(data.questions || []);
        setShowWordModal(false);
        setSelectedDocxFile(null);
        setShowPreviewModal(true);
      } else {
        Swal.fire("Gagal Membaca Word", data.detail || "Gagal memproses file Word.", "error");
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", e.message || "Gagal menghubungi server saat membaca file Word.", "error");
    } finally {
      setUploadingDocx(false);
    }
  };

  // 6. Simpan Batch Soal dari Pratinjau Word
  const handleSaveParsedQuestions = async () => {
    if (!token) return;
    if (parsedQuestions.length === 0) {
      Swal.fire("Soal Kosong", "Tidak ada butir soal untuk disimpan.", "warning");
      return;
    }

    try {
      setSavingBatch(true);
      let finalBankId = targetBankId;

      const examIdToUse = targetSubject?.exam_id || selectedExamId;
      const examTitleToUse = targetSubject?.exam_title || selectedExam?.title || "Ujian";

      if (targetSubject && (!finalBankId || finalBankId <= 0)) {
        const createRes = await fetch("/api/cbt-backend/api/cbt/banks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `${examTitleToUse} - ${targetSubject.subject_name} (Kelas ${targetSubject.grade || 10})`,
            subject_name: targetSubject.subject_name,
            grade: Number(targetSubject.grade || 10),
            teacher_id: targetSubject.teacher_id || null,
            teacher_name: targetSubject.teacher_name || user?.name || null,
            questions: [],
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          throw new Error(createData.detail || "Gagal membuat wadah bank soal baru.");
        }
        finalBankId = createData.bank_id;

        if (examIdToUse) {
          await fetch(`/api/cbt-backend/api/cbt/exams/${examIdToUse}/subjects/${targetSubject.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              bank_id: finalBankId,
              total_questions: parsedQuestions.length,
            }),
          });
        }
      }

      if (!finalBankId) {
        throw new Error("ID Bank Soal tidak valid.");
      }

      const saveRes = await fetch(`/api/cbt-backend/api/cbt/banks/${finalBankId}/questions/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedQuestions),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.detail || "Gagal menyimpan butir-butir soal.");
      }

      if (targetSubject && examIdToUse) {
        await fetch(`/api/cbt-backend/api/cbt/exams/${examIdToUse}/subjects/${targetSubject.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bank_id: finalBankId,
            total_questions: parsedQuestions.length,
          }),
        });
      }

      setShowPreviewModal(false);
      setParsedQuestions([]);

      if (selectedExamId) fetchExamDetail(selectedExamId);
      fetchBanks();
      fetchTeacherAssignments();

      Swal.fire({
        icon: "success",
        title: "Impor Soal Berhasil!",
        text: `Sebanyak ${parsedQuestions.length} butir soal berhasil diimpor ke ${
          targetSubject ? `mata pelajaran ${targetSubject.subject_name}` : "bank soal"
        }. Buka halaman pembuatan kuis untuk memeriksa atau mengedit butir soal sekarang?`,
        showCancelButton: true,
        confirmButtonText: "Buka & Edit Soal Sekarang",
        cancelButtonText: "Tetap di Menu Bank Soal",
        confirmButtonColor: "#7E22CE",
        cancelButtonColor: "#64748B",
      }).then((result) => {
        if (result.isConfirmed) {
          router.push(`/bank-soal/${finalBankId}`);
        }
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire("Gagal Menyimpan", e.message || "Gagal menyimpan butir soal.", "error");
    } finally {
      setSavingBatch(false);
    }
  };

  // Helper Ganti Kunci Jawaban di Pratinjau Word
  const handleSetCorrectAnswerInPreview = (questionIdx: number, key: string) => {
    const updated = [...parsedQuestions];
    updated[questionIdx].correct_answer = key;
    updated[questionIdx].has_warning = false;
    updated[questionIdx].warning_message = null;
    setParsedQuestions(updated);
  };

  // 7. Handler Tambah Mapel Baru ke Paket Ujian Terpilih
  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedExamId || !newSubjName.trim()) return;

    try {
      setSavingNewSubject(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_name: newSubjName.trim(),
          grade: Number(newSubjGrade),
          teacher_id: !isAdminOrStaff ? (user?.id || null) : (newSubjTeacherId || null),
          teacher_name: !isAdminOrStaff ? (user?.name || null) : (newSubjTeacher.trim() || null),
          duration_minutes: Number(newSubjDuration) || 90,
          passing_score: Number(newSubjPassingScore) || 75,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddSubjectModal(false);
        setNewSubjName("");
        setNewSubjTeacher("");
        setNewSubjTeacherId(null);
        fetchExamDetail(selectedExamId);
        fetchTeacherAssignments();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menambahkan mata pelajaran.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Gagal menghubungi server.", "error");
    } finally {
      setSavingNewSubject(false);
    }
  };

  // 8. Handler Hubungkan Bank Soal yang Sudah Ada ke Mapel
  const handleLinkExistingBank = async () => {
    if (!token || !selectedExamId || !linkTargetSubject || !selectedExistingBankId) return;

    try {
      setLinkingBank(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/subjects/${linkTargetSubject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_id: Number(selectedExistingBankId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowLinkBankModal(false);
        setLinkTargetSubject(null);
        setSelectedExistingBankId(null);
        fetchExamDetail(selectedExamId);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Bank Soal Berhasil Dihubungkan!",
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menghubungkan bank soal.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Gagal menghubungi server.", "error");
    } finally {
      setLinkingBank(false);
    }
  };

  // 9. Handler Lihat / Kelola Butir Soal Terpasang
  const handleViewBankQuestions = (bankId: number) => {
    if (!bankId) return;
    router.push(`/bank-soal/${bankId}`);
  };

  // 11. Handler Hapus Mapel dari Ujian
  const handleDeleteSubject = (subjId: number, subjName: string) => {
    Swal.fire({
      title: "Hapus Mata Pelajaran?",
      text: `Hapus mata pelajaran '${subjName}' dari paket ujian ini?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed && selectedExamId) {
        try {
          const res = await fetch(`/api/cbt-backend/api/cbt/exams/${selectedExamId}/subjects/${subjId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            fetchExamDetail(selectedExamId);
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: data.message,
              showConfirmButton: false,
              timer: 2500,
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // 12. Buat Bank Soal Baru Mandiri (Mode 2)
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newBankTitle.trim()) return;
    try {
      setCreatingBank(true);
      const res = await fetch("/api/cbt-backend/api/cbt/banks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newBankTitle.trim(),
          subject_name: newBankSubject.trim(),
          grade: Number(newBankGrade),
          teacher_id: !isAdminOrStaff ? (user?.id || null) : (newBankTeacherId || null),
          teacher_name: !isAdminOrStaff ? (user?.name || null) : (newBankTeacherName.trim() || null),
          questions: [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setNewBankTitle("");
        setNewBankSubject("");
        setNewBankTeacherId(null);
        setNewBankTeacherName("");
        fetchBanks();
        fetchTeacherAssignments();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Bank Soal Baru Berhasil Dibuat!",
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal membuat bank soal.", "error");
      }
    } catch (e: any) {
      Swal.fire("Error", e.message || "Gagal menghubungi server.", "error");
    } finally {
      setCreatingBank(false);
    }
  };

  // 13. Hapus Bank Soal Mandiri
  const handleDeleteBank = (bankId: number, bankTitle: string) => {
    Swal.fire({
      title: "Hapus Bank Soal?",
      text: `Hapus bank soal '${bankTitle}' beserta seluruh butir soalnya?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            fetchBanks();
            if (selectedExamId) fetchExamDetail(selectedExamId);
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: data.message,
              showConfirmButton: false,
              timer: 2500,
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Filter Mata Pelajaran pada Ujian Terpilih
  const examSubjects: any[] = selectedExam?.subjects || [];
  const filteredSubjects = examSubjects.filter((s) => {
    if (subjectStatusFilter === "ready" && (!s.bank_id || (s.actual_questions || 0) === 0)) return false;
    if (subjectStatusFilter === "pending" && s.bank_id && (s.actual_questions || 0) > 0) return false;
    if (!subjectSearch.trim()) return true;
    const q = subjectSearch.toLowerCase();
    return (
      s.subject_name?.toLowerCase().includes(q) ||
      s.teacher_name?.toLowerCase().includes(q) ||
      s.bank_title?.toLowerCase().includes(q)
    );
  });

  const readySubjectsCount = examSubjects.filter((s) => s.bank_id && (s.actual_questions || 0) > 0).length;
  const pendingSubjectsCount = examSubjects.length - readySubjectsCount;

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* ===================================================================== */}
      {/* 1. HEADER HALAMAN BANK SOAL                                           */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0 shadow-2xs"
            title="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Bank Soal &amp; Naskah Ujian
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Impor Word (.docx) &amp; Buat Soal Manual
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdminOrStaff
                ? "Kelola naskah ujian sekolah, tugaskan guru pembuat soal, buat soal interaktif (6 jenis soal) atau impor file Word"
                : "Input butir soal (6 tipe soal) atau impor naskah Word untuk tugas ujian dari panitia maupun bank soal mandiri"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Tombol Buat Bank Soal Baru */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Buat Bank Soal Baru"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Buat Bank Soal</span>
          </button>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={() => {
              fetchExams();
              if (selectedExamId) fetchExamDetail(selectedExamId);
              fetchBanks();
              fetchTeacherAssignments();
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Segarkan Data"
          >
            <FontAwesomeIcon icon={faRotate} className="text-xs" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TAB NAVIGASI                                                       */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 flex-wrap">
        {!isAdminOrStaff ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("tugas_ujian")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "tugas_ujian"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>🏛️ Penugasan Soal</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  activeTab === "tugas_ujian" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {teacherAssignments.length} Mapel
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("semua_bank")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "semua_bank"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FontAwesomeIcon icon={faBookOpen} />
              <span>📝 Soal Mandiri</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  activeTab === "semua_bank" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {banks.filter((b) => b.category !== "official_assignment" && b.origin !== "official" && (!b.exam_title || b.exam_type === "daily")).length} Bank
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("per_ujian")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "per_ujian"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FontAwesomeIcon icon={faClipboardList} />
              <span>Kelola Soal per Ujian</span>
              {exams.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                    activeTab === "per_ujian" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {exams.length} Ujian
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("semua_bank")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "semua_bank"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FontAwesomeIcon icon={faBookOpen} />
              <span>Koleksi Seluruh Bank Soal</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                  activeTab === "semua_bank" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {banks.length} Bank
              </span>
            </button>

            {teacherAssignments.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("tugas_ujian")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "tugas_ujian"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                }`}
              >
                <FontAwesomeIcon icon={faShieldHalved} />
                <span>🏛️ Tugas Naskah Saya</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                    activeTab === "tugas_ujian" ? "bg-white/20 text-white" : "bg-indigo-200 text-indigo-900"
                  }`}
                >
                  {teacherAssignments.length} Mapel
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. VIEW 1: IMPOR & KELOLA SOAL PER UJIAN (PILIH UJIAN & MAPEL)        */}
      {/* ===================================================================== */}
      {activeTab === "per_ujian" && (
        <div className="space-y-4">
          {/* BAR FILTER: PILIH PAKET UJIAN & RINGKASAN */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Dropdown Pemilihan Ujian */}
              <div className="md:col-span-6 space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Pilih Paket Ujian yang Diisi Soalnya:
                </label>
                <select
                  value={selectedExamId || ""}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {loadingExams ? (
                    <option value="">Memuat daftar paket ujian...</option>
                  ) : exams.length === 0 ? (
                    <option value="">Belum ada paket ujian terdaftar</option>
                  ) : (
                    exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} &bull; ({ex.exam_type?.toUpperCase()}) &bull; Kelas {ex.grade || 10}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Ringkasan Status Soal pada Ujian Ini */}
              <div className="md:col-span-6 flex items-center justify-between md:justify-end gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                    Total: <b>{examSubjects.length} Mapel</b>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    🟢 Siap: <b>{readySubjectsCount}</b>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                    🟡 Belum Siap: <b>{pendingSubjectsCount}</b>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(true)}
                  disabled={!selectedExamId}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Tambah Mata Pelajaran Baru ke Paket Ujian Ini"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Tambah Mapel</span>
                </button>
              </div>
            </div>

            {/* Filter & Pencarian Mapel */}
            {examSubjects.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-sm">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Cari mata pelajaran atau nama guru..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSubjectStatusFilter("all")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      subjectStatusFilter === "all"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({examSubjects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectStatusFilter("ready")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      subjectStatusFilter === "ready"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    Soal Siap ({readySubjectsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectStatusFilter("pending")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      subjectStatusFilter === "pending"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    Belum Ada Soal ({pendingSubjectsCount})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DAFTAR MATA PELAJARAN DALAM PAKET UJIAN */}
          {loadingExamDetail ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Memuat mata pelajaran ujian...
            </div>
          ) : !selectedExam ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Silakan pilih paket ujian terlebih dahulu.
            </div>
          ) : examSubjects.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                <FontAwesomeIcon icon={faFolderOpen} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Belum Ada Mata Pelajaran pada Paket Ujian Ini
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tambahkan mata pelajaran yang akan diujikan (misal: Matematika, Bahasa Indonesia, dll.) agar dapat membuat soal secara manual atau mengimpor dari Word.
              </p>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>Tambah Mata Pelajaran Pertama</span>
              </button>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Tidak ada mata pelajaran yang cocok dengan filter pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSubjects.map((subj) => {
                const hasQuestions = subj.bank_id && (subj.actual_questions || 0) > 0;
                return (
                  <div
                    key={subj.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition flex flex-col justify-between space-y-3.5 ${
                      hasQuestions ? "border-slate-200/90" : "border-amber-200/80 bg-amber-50/10"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Kelas {subj.grade || selectedExam.grade || 10}
                        </span>

                        {hasQuestions ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                            <span>Siap ({subj.actual_questions} Soal)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
                            <span>Belum Ada Soal</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                          {subj.subject_name}
                        </h3>
                        <div className="flex items-center justify-between gap-1.5 mt-1.5 p-2 bg-slate-50/90 rounded-xl border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold">Guru Pembuat Soal:</span>
                            <span className={`text-xs font-bold truncate block ${subj.teacher_name ? "text-indigo-700" : "text-amber-700 italic"}`}>
                              {subj.teacher_name || "Belum Ditugaskan"}
                            </span>
                          </div>
                          {isAdminOrStaff && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignForSubject(subj)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/80 transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                              title="Tugaskan Guru Pembuat Soal"
                            >
                              <FontAwesomeIcon icon={faChalkboardUser} className="text-[10px]" />
                              <span>{subj.teacher_name ? "Ganti Guru" : "Tugaskan Guru"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Durasi Ujian:</span>
                          <span className="font-bold text-slate-800">{subj.duration_minutes || 90} Menit</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KKM / Nilai Lulus:</span>
                          <span className="font-bold text-slate-800">{subj.passing_score || 75}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200/60">
                          <span>Bank Soal:</span>
                          <span className="font-bold text-blue-700 truncate max-w-[150px]" title={subj.bank_title}>
                            {subj.bank_title || "Belum terhubung"}
                          </span>
                        </div>
                      </div>

                      {/* Aturan Ujian Mapel Badges */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${subj.randomize_questions ? "bg-blue-50 text-blue-700 border border-blue-200/70" : "bg-slate-100 text-slate-600"}`}>
                          {subj.randomize_questions ? "🔀 Soal Acak" : "🔢 Urutan Tetap"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${subj.randomize_options ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70" : "bg-slate-100 text-slate-600"}`}>
                          {subj.randomize_options ? "🔠 Opsi Acak" : "🔤 Opsi Tetap"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${subj.show_score ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70" : "bg-amber-50 text-amber-700 border border-amber-200/70"}`}>
                          {subj.show_score ? "🏆 Skor Tampil" : "🔒 Skor Tertutup"}
                        </span>
                        {subj.show_explanation ? (
                          <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                            💡 Pembahasan On
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* TOMBOL AKSI UTAMA PER MAPEL */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {/* Tombol Pengaturan Ujian Mapel */}
                      <button
                        type="button"
                        onClick={() => handleOpenExamSettings("subject", subj)}
                        className="w-full py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer active:scale-95"
                        title="Atur pengacakan soal, acak opsi, skor akhir, durasi, KKM, dan pembahasan untuk mapel ini"
                      >
                        <FontAwesomeIcon icon={faGear} className="text-slate-500 text-xs" />
                        <span>⚙️ Pengaturan Ujian</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Tombol Impor Word (.docx) */}
                        <button
                          type="button"
                          onClick={() => handleOpenWordImportForSubject(subj)}
                          className="py-2 px-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          title="Impor Naskah Soal dari File Word (.docx)"
                        >
                          <FontAwesomeIcon icon={faFileWord} className="text-white text-xs" />
                          <span>Impor Word</span>
                        </button>

                        {/* Tombol Buat Soal Manual (Menggantikan Tempel Teks) */}
                        <button
                          type="button"
                          onClick={() => handleNavigateToManageQuestions(subj)}
                          className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200 active:scale-95"
                          title="Buka halaman kelola & edit soal untuk mata pelajaran ini"
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-emerald-700 text-xs" />
                          <span>Buat Soal</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1">
                        {/* Tombol Lihat Butir Soal (Jika Sudah Terpasang) */}
                        {subj.bank_id ? (
                          <button
                            type="button"
                            onClick={() => handleNavigateToManageQuestions(subj)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            title="Buka halaman kelola & edit butir soal"
                          >
                            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                            <span>Kelola {subj.actual_questions || 0} Soal</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setLinkTargetSubject(subj);
                              setSelectedExistingBankId(banks[0]?.id || null);
                              setShowLinkBankModal(true);
                            }}
                            className="text-[11px] font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                            title="Hubungkan dari bank soal yang sudah dibuat sebelumnya"
                          >
                            <FontAwesomeIcon icon={faLink} className="text-[10px]" />
                            <span>Pilih Bank Ada</span>
                          </button>
                        )}

                        {/* Tombol Hapus Mapel */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(subj.id, subj.subject_name)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Hapus mata pelajaran ini dari ujian"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. VIEW 2: KOLEKSI BANK SOAL                                          */}
      {/* ===================================================================== */}
      {activeTab === "semua_bank" && (() => {
        const isAssignmentBank = (b: any) =>
          b.category === "official_assignment" ||
          b.origin === "official" ||
          (Boolean(b.exam_title) && b.exam_type !== "daily");

        const selfCount = banks.filter((b) => !isAssignmentBank(b)).length;
        const assignmentCount = banks.filter((b) => isAssignmentBank(b)).length;

        // Guru HANYA melihat bank soal mandiri / ulangan harian miliknya.
        // Penugasan resmi ujian sekolah dari admin sudah terisolasi penuh di tab "🏛️ Tugas Ujian Sekolah dari Panitia"
        const displayedBanks = !isAdminOrStaff
          ? banks.filter((b) => !isAssignmentBank(b))
          : banks.filter((b) => {
              const isAssignment = isAssignmentBank(b);
              if (bankCategoryFilter === "self" && isAssignment) return false;
              if (bankCategoryFilter === "assignment" && !isAssignment) return false;
              return true;
            });

        return (
          <div className="space-y-4">
            {/* BANNER GUDANG BANK SOAL */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 sm:p-6 text-white shadow-sm border border-slate-700/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      📝 {!isAdminOrStaff ? "Soal Mandiri" : "Koleksi Bank Soal"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold">
                      {!isAdminOrStaff ? selfCount : banks.length} Bank Tersimpan
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight">
                    {isAdminOrStaff ? "Gudang & Koleksi Seluruh Bank Soal" : "Koleksi Soal Mandiri Guru"}
                  </h2>
                  <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
                    {isAdminOrStaff
                      ? "Daftar seluruh bank soal master yang tersimpan di sistem CBT sekolah, baik naskah ujian sekolah maupun bank soal mandiri guru."
                      : "Koleksi butir soal yang Anda susun secara mandiri untuk ulangan harian kelas yang Anda ampu. Butir soal ini dapat langsung diujikan ke siswa melalui menu Ulangan Harian Saya."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span>Buat Bank Baru</span>
                </button>
              </div>
            </div>

            {/* NOTIFIKASI PENGINGAT UNTUK GURU JIKA ADA TUGAS RESMI DARI PANITIA */}
            {!isAdminOrStaff && teacherAssignments.length > 0 && (
              <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-2xl p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5 text-xs text-indigo-950">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-2xs">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <span>
                    Anda memiliki <b>{teacherAssignments.length} penugasan naskah soal</b> dari Panitia pada tab "Penugasan Soal".
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("tugas_ujian")}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>Buka Penugasan Soal</span>
                  <FontAwesomeIcon icon={faArrowLeft} className="text-[10px] rotate-180" />
                </button>
              </div>
            )}

            {/* FILTER KATEGORI: HANYA DITAMPILKAN DI ROLE ADMIN */}
            {isAdminOrStaff && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 mr-1">Filter Kategori:</span>
                  <button
                    type="button"
                    onClick={() => setBankCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      bankCategoryFilter === "all"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({banks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankCategoryFilter("self")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      bankCategoryFilter === "self"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <span>📝 Mandiri / Ulangan Guru</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                      {selfCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankCategoryFilter("assignment")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      bankCategoryFilter === "assignment"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
                    }`}
                  >
                    <span>🏛️ Tugas Ujian Sekolah</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                      {assignmentCount}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Menampilkan <b>{displayedBanks.length}</b> dari {banks.length} bank soal
                </div>
              </div>
            )}

            {loadingBanks ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
                Memuat daftar seluruh bank soal...
              </div>
            ) : displayedBanks.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faBookOpen} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {bankCategoryFilter === "self"
                    ? "Belum Ada Bank Soal Mandiri"
                    : bankCategoryFilter === "assignment"
                    ? "Belum Ada Naskah Ujian Sekolah"
                    : "Bank Soal Masih Kosong"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Silakan buat bank soal baru atau impor naskah soal langsung dari Microsoft Word (.docx).
                </p>
                {bankCategoryFilter === "self" && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    <span>Buat Bank Soal Mandiri Sekarang</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedBanks.map((b) => {
                  const isOfficial = isAssignmentBank(b);
                  return (
                    <div
                      key={b.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 ${
                        isOfficial ? "border-indigo-200/90 bg-indigo-50/5" : "border-slate-200"
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          {isOfficial ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-950 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                              <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-700 text-[9px]" />
                              <span>🏛️ Tugas Ujian Sekolah</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                              <FontAwesomeIcon icon={faBookOpen} className="text-emerald-700 text-[9px]" />
                              <span>📝 Mandiri (Ulangan Guru)</span>
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Kelas {b.grade}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-500">
                              {b.total_questions || 0} Soal
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                            {b.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mata Pelajaran: <b>{b.subject_name}</b> {b.exam_title && b.exam_type !== "daily" ? `• (${b.exam_title})` : ""}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-50/90 rounded-xl border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold">Penulis / Pengelola:</span>
                            <span className="text-xs font-bold text-slate-800 truncate block">
                              {b.teacher_name || "Admin"}
                            </span>
                          </div>
                          {isAdminOrStaff && (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignForBank(b)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold border border-slate-200 hover:border-indigo-200 transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                              title="Tugaskan / Ganti Guru Penulis Soal"
                            >
                              <FontAwesomeIcon icon={faChalkboardUser} className="text-[10px]" />
                              <span>Tugaskan</span>
                            </button>
                          )}
                        </div>

                        {/* Ringkasan Durasi, KKM & Aturan Ujian */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5 text-slate-600">
                          <div className="flex justify-between text-[11px]">
                            <span>Durasi &amp; KKM:</span>
                            <span className="font-bold text-slate-800">{b.duration_minutes || 90} Mnt / KKM {b.passing_score || 75}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px] pt-0.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold ${b.randomize_questions ? "bg-blue-50 text-blue-700 border border-blue-200/70" : "bg-slate-100 text-slate-600"}`}>
                              {b.randomize_questions ? "🔀 Soal Acak" : "🔢 Urutan Tetap"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-bold ${b.randomize_options ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70" : "bg-slate-100 text-slate-600"}`}>
                              {b.randomize_options ? "🔠 Opsi Acak" : "🔤 Opsi Tetap"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-bold ${b.show_score ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70" : "bg-amber-50 text-amber-700 border border-amber-200/70"}`}>
                              {b.show_score ? "🏆 Skor Tampil" : "🔒 Skor Tertutup"}
                            </span>
                            {b.show_explanation ? (
                              <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                                💡 Pembahasan On
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {/* Tombol Pengaturan Ujian Mapel */}
                        <button
                          type="button"
                          onClick={() => handleOpenExamSettings("bank", b)}
                          className="w-full py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer active:scale-95"
                          title="Atur pengacakan soal, acak opsi, skor akhir, durasi, KKM, dan pembahasan untuk mapel ini"
                        >
                          <FontAwesomeIcon icon={faGear} className="text-slate-500 text-xs" />
                          <span>⚙️ Pengaturan Ujian</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenWordImportForBank(b)}
                            className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200/80 active:scale-95"
                          >
                            <FontAwesomeIcon icon={faFileWord} className="text-blue-700" />
                            <span>Impor Word</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigateToManageQuestions(undefined, b)}
                            className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200/80 active:scale-95"
                            title="Buka halaman kelola & edit butir soal"
                          >
                            <FontAwesomeIcon icon={faPlus} className="text-emerald-700" />
                            <span>Buat Soal</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleNavigateToManageQuestions(undefined, b)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            title="Buka halaman kelola & edit butir soal"
                          >
                            <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                            <span>Kelola {b.total_questions || 0} Soal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(b.id, b.title)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                            title="Hapus Bank Soal Ini"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* 5. VIEW 3: TUGAS PENULISAN SOAL NASKAH UJIAN (UNTUK GURU & PANITIA)    */}
      {/* ===================================================================== */}
      {activeTab === "tugas_ujian" && (
        <div className="space-y-4">
          {/* BANNER TUGAS */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-5 sm:p-6 text-white shadow-sm border border-indigo-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                    🏛️ Penugasan Soal dari Panitia
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold">
                    {teacherAssignments.length} Mata Pelajaran Ujian Sekolah
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Penugasan Pembuatan Soal dari Panitia
                </h2>
                <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
                  Mata pelajaran ujian sekolah resmi yang ditugaskan kepada Anda oleh Administrator / Panitia CBT. Naskah butir soal di sini akan diujikan kepada seluruh peserta ujian sekolah sesuai jadwal resmi.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchTeacherAssignments}
                className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border border-white/20 cursor-pointer"
              >
                <FontAwesomeIcon icon={faRotate} className={`text-xs ${loadingAssignments ? "animate-spin" : ""}`} />
                <span>Segarkan Tugas</span>
              </button>
            </div>
          </div>

          {/* LIST TUGAS GURU */}
          {loadingAssignments ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Memuat daftar tugas penulisan butir soal...
            </div>
          ) : teacherAssignments.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-2xl">
                <FontAwesomeIcon icon={faClipboardList} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Belum Ada Penugasan Soal
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Saat ini belum ada mata pelajaran ujian sekolah yang ditugaskan kepada Anda oleh panitia. Anda dapat membuat soal secara mandiri untuk ulangan harian pada tab "Soal Mandiri".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherAssignments.map((a: any) => {
                const hasQuestions = (a.actual_questions || 0) > 0;
                return (
                  <div
                    key={a.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition flex flex-col justify-between space-y-3.5 ${
                      hasQuestions ? "border-slate-200/90" : "border-amber-200/80 bg-amber-50/10"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-950 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                          <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-700 text-[9px]" />
                          <span>🏛️ Penugasan Resmi Panitia</span>
                        </span>
                        {hasQuestions ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                            <span>Siap ({a.actual_questions} Soal)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 shrink-0">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
                            <span>Belum Ada Soal</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                          Paket: {a.exam_title} {a.exam_type ? `(${a.exam_type.toUpperCase()})` : ""}
                        </div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug mt-0.5">
                          {a.subject_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tingkat Sasaran: <b>Kelas {a.grade || 10}</b>
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Durasi Ujian:</span>
                          <span className="font-bold text-slate-800">{a.duration_minutes || 90} Menit</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KKM / Nilai Lulus:</span>
                          <span className="font-bold text-slate-800">{a.passing_score || 75}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200/60">
                          <span>Status Wadah Bank Soal:</span>
                          <span className="font-bold text-indigo-700 truncate max-w-[150px]" title={a.bank_title}>
                            {a.bank_title || (a.bank_id ? `Tersedia (#${a.bank_id})` : "Dibuat otomatis")}
                          </span>
                        </div>
                      </div>

                      {/* Aturan Ujian Mapel Badges */}
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${a.randomize_questions ? "bg-blue-50 text-blue-700 border border-blue-200/70" : "bg-slate-100 text-slate-600"}`}>
                          {a.randomize_questions ? "🔀 Soal Acak" : "🔢 Urutan Tetap"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${a.randomize_options ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70" : "bg-slate-100 text-slate-600"}`}>
                          {a.randomize_options ? "🔠 Opsi Acak" : "🔤 Opsi Tetap"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${a.show_score ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70" : "bg-amber-50 text-amber-700 border border-amber-200/70"}`}>
                          {a.show_score ? "🏆 Skor Tampil" : "🔒 Skor Tertutup"}
                        </span>
                        {a.show_explanation ? (
                          <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                            💡 Pembahasan On
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* ACTION BUTTONS UNTUK GURU */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {/* Tombol Pengaturan Ujian Mapel */}
                      <button
                        type="button"
                        onClick={() => handleOpenExamSettings("assignment", a)}
                        className="w-full py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer active:scale-95"
                        title="Atur pengacakan soal, acak opsi, skor akhir, durasi, KKM, dan pembahasan untuk mapel ujian ini"
                      >
                        <FontAwesomeIcon icon={faGear} className="text-slate-500 text-xs" />
                        <span>⚙️ Pengaturan Ujian</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenWordImportForSubject(a)}
                          className="py-2.5 px-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          title="Impor naskah soal dari file Word (.docx)"
                        >
                          <FontAwesomeIcon icon={faFileWord} className="text-white text-xs" />
                          <span>Impor Word</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavigateToManageQuestions(a)}
                          className="py-2.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          title="Buka halaman input & editor butir soal"
                        >
                          <FontAwesomeIcon icon={faPen} className="text-white text-xs" />
                          <span>Input Soal</span>
                        </button>
                      </div>

                      {a.bank_id && (
                        <button
                          type="button"
                          onClick={() => handleNavigateToManageQuestions(a)}
                          className="w-full text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 py-1 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                          <span>Lihat &amp; Kelola {a.actual_questions || 0} Soal Terpasang</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: IMPOR SOAL DARI MICROSOFT WORD (.DOCX)                         */}
      {/* ===================================================================== */}
      {showWordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shadow-2xs">
                  <FontAwesomeIcon icon={faFileWord} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Impor Soal dari Microsoft Word (.docx)
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm">
                    {targetSubject
                      ? `Target: ${targetSubject.subject_name} (${selectedExam?.title})`
                      : `Target: ${targetBankTitle}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWordModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFileCircleCheck} className="text-blue-700" />
                <span>Format Penulisan Word yang Didukung:</span>
              </p>
              <ul className="text-[11px] list-disc pl-4 space-y-0.5 text-blue-900 leading-relaxed">
                <li>Gunakan nomor soal biasa (misal: <b>1.</b> atau <b>1)</b>).</li>
                <li>Gunakan pilihan opsi (misal: <b>A.</b>, <b>B.</b>, <b>C.</b>, <b>D.</b>, <b>E.</b>).</li>
                <li>Tandai kunci jawaban dengan:
                  <ul className="list-circle pl-4 mt-0.5 space-y-0.5">
                    <li>Tanda bintang di depan opsi (contoh: <b>*C. Nusantara</b>)</li>
                    <li>Huruf opsi dicetak <b>tebal/bold</b> (contoh: <b>C. Nusantara</b>)</li>
                    <li>Tuliskan <b>Kunci: C</b> di bawah butir soal</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Berkas Word (.docx):
              </label>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setSelectedDocxFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
              />
              {selectedDocxFile && (
                <p className="text-[11px] text-emerald-700 font-bold">
                  ✓ Berkas terpilih: {selectedDocxFile.name} ({(selectedDocxFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWordModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedDocxFile || uploadingDocx}
                onClick={handleParseDocx}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <FontAwesomeIcon icon={faRotate} className={uploadingDocx ? "animate-spin" : ""} />
                <span>{uploadingDocx ? "Mengekstrak Soal..." : "Proses & Buka Pratinjau"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INTERACTIVE LIVE PREVIEW (HASIL EKSTRAKSI WORD SEBELUM SIMPAN) */}
      {/* ===================================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col justify-between space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Pratinjau Butir Soal Hasil Impor Word
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ditemukan: <b>{parsedQuestions.length} Soal</b> &bull; Periksa kunci jawaban atau klik opsi untuk mengubah kunci.
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              {/* Tag Target Penyimpanan */}
              <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-600">Akan Disimpan ke:</span>{" "}
                  <b className="text-blue-900">
                    {targetSubject
                      ? `${selectedExam?.title} ➔ Mata Pelajaran: ${targetSubject.subject_name}`
                      : targetBankTitle}
                  </b>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-bold">
                  {parsedQuestions.length} Butir Soal
                </span>
              </div>
            </div>

            {/* Scrollable Questions List */}
            <div className="overflow-y-auto space-y-3.5 pr-1 max-h-[52vh]">
              {parsedQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className={`p-4 rounded-2xl border transition ${
                    q.has_warning ? "bg-amber-50/60 border-amber-300" : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">
                        {q.content}
                      </p>
                    </div>

                    {q.has_warning && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-1">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                        <span>{q.warning_message}</span>
                      </span>
                    )}
                  </div>

                  {/* Options Grid */}
                  <div className="mt-3 pl-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt: any) => {
                      const isCorrect = q.correct_answer === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSetCorrectAnswerInPreview(qIdx, opt.key)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                            isCorrect
                              ? "bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="truncate">
                            <b>{opt.key}.</b> {opt.text}
                          </span>
                          {isCorrect && (
                            <span className="text-[10px] font-extrabold bg-emerald-700 text-white px-2 py-0.5 rounded-full shrink-0">
                              Kunci ✅
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Bottom */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {targetSubject
                  ? `Mata Pelajaran: ${targetSubject.subject_name} (${selectedExam?.title})`
                  : `Target Bank ID: #${targetBankId || "Baru"}`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveParsedQuestions}
                  disabled={savingBatch || parsedQuestions.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>
                    {savingBatch
                      ? "Menyimpan Soal..."
                      : targetSubject
                      ? "Simpan & Terapkan ke Mapel Ujian"
                      : "Simpan Semua Soal ke Bank"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH MATA PELAJARAN BARU KE PAKET UJIAN                      */}
      {/* ===================================================================== */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Tambah Mata Pelajaran ke Ujian
                </h3>
                <p className="text-xs text-slate-500">
                  Paket: <b>{selectedExam?.title}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleCreateNewSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Mata Pelajaran:
                </label>
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="Contoh: Matematika, Bahasa Indonesia, Biologi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tingkat Kelas:
                  </label>
                  <select
                    value={newSubjGrade}
                    onChange={(e) => setNewSubjGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>Kelas 10</option>
                    <option value={11}>Kelas 11</option>
                    <option value={12}>Kelas 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Durasi (Menit):
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={newSubjDuration}
                    onChange={(e) => setNewSubjDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {isAdminOrStaff && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Guru Penulis Naskah / Pengampu (Opsional):
                  </label>
                  <select
                    value={newSubjTeacherId || (newSubjTeacher ? `name:${newSubjTeacher}` : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setNewSubjTeacherId(null);
                        setNewSubjTeacher("");
                        return;
                      }
                      const found = teachers.find((t) => String(t.id) === val);
                      if (found) {
                        setNewSubjTeacherId(found.id);
                        setNewSubjTeacher(found.name);
                      } else {
                        setNewSubjTeacherId(null);
                        setNewSubjTeacher(val.replace("name:", ""));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Guru Penulis Naskah --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(NIP: ${t.nip})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  KKM / Nilai Kelulusan:
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newSubjPassingScore}
                  onChange={(e) => setNewSubjPassingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewSubject}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingNewSubject ? "Menyimpan..." : "Tambahkan Mapel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: HUBUNGKAN BANK SOAL YANG SUDAH ADA KE MAPEL                    */}
      {/* ===================================================================== */}
      {showLinkBankModal && linkTargetSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hubungkan Bank Soal
                </h3>
                <p className="text-xs text-slate-500">
                  Untuk: <b>{linkTargetSubject.subject_name}</b> (Kelas {linkTargetSubject.grade})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkBankModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Bank Soal dari Koleksi:
              </label>
              {banks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Belum ada bank soal tersimpan. Silakan impor soal dari file Word atau buat soal manual terlebih dahulu.
                </p>
              ) : (
                <select
                  value={selectedExistingBankId || ""}
                  onChange={(e) => setSelectedExistingBankId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Bank Soal --</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.subject_name} &bull; {b.total_questions || 0} Soal)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLinkBankModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={linkingBank || !selectedExistingBankId}
                onClick={handleLinkExistingBank}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {linkingBank ? "Menghubungkan..." : "Hubungkan Bank"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: BUAT BANK SOAL BARU MANDIRI (MODE 2)                           */}
      {/* ===================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Buat Bank Soal Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <form onSubmit={handleCreateBank} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Bank Soal:
                </label>
                <input
                  type="text"
                  required
                  value={newBankTitle}
                  onChange={(e) => setNewBankTitle(e.target.value)}
                  placeholder="Contoh: Soal SAS Ganjil Matematika Kelas 10"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran:
                </label>
                <input
                  type="text"
                  required
                  value={newBankSubject}
                  onChange={(e) => setNewBankSubject(e.target.value)}
                  placeholder="Contoh: Matematika, Biologi, dll."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tingkat Kelas:
                </label>
                <select
                  value={newBankGrade}
                  onChange={(e) => setNewBankGrade(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value={10}>Kelas 10</option>
                  <option value={11}>Kelas 11</option>
                  <option value={12}>Kelas 12</option>
                </select>
              </div>

              {isAdminOrStaff ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tugaskan Guru Penulis (Opsional):
                  </label>
                  <select
                    value={newBankTeacherId || (newBankTeacherName ? `name:${newBankTeacherName}` : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setNewBankTeacherId(null);
                        setNewBankTeacherName("");
                        return;
                      }
                      const found = teachers.find((t) => String(t.id) === val);
                      if (found) {
                        setNewBankTeacherId(found.id);
                        setNewBankTeacherName(found.name);
                      } else {
                        setNewBankTeacherId(null);
                        setNewBankTeacherName(val.replace("name:", ""));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Guru Penulis (Opsional) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(NIP: ${t.nip})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Guru Penyusun:</span>
                  <span className="font-bold text-emerald-950">{user?.name || "Guru"}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingBank}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {creatingBank ? "Menyimpan..." : "Simpan Bank Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TUGASKAN GURU PEMBUAT SOAL                                     */}
      {/* ===================================================================== */}
      {isAdminOrStaff && showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg">
                  <FontAwesomeIcon icon={faChalkboardUser} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tugaskan Guru Pembuat Soal
                  </h3>
                  <p className="text-xs text-slate-500">
                    {assignMode === "subject" ? "Naskah Ujian Sekolah" : "Bank Soal Mandiri"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl text-xs space-y-1">
              <span className="text-indigo-900 font-bold block">Target Penugasan:</span>
              {assignMode === "subject" && assignTargetSubject && (
                <p className="text-slate-700">
                  Paket: <b>{assignTargetSubject.exam_title || selectedExam?.title}</b> <br />
                  Mata Pelajaran: <b className="text-indigo-800">{assignTargetSubject.subject_name}</b> (Kelas {assignTargetSubject.grade || 10})
                </p>
              )}
              {assignMode === "bank" && assignTargetBank && (
                <p className="text-slate-700">
                  Bank Soal: <b className="text-indigo-800">{assignTargetBank.title}</b> <br />
                  Mata Pelajaran: <b>{assignTargetBank.subject_name}</b> (Kelas {assignTargetBank.grade})
                </p>
              )}
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Guru Penulis Naskah Soal:
                </label>
                <select
                  value={assignTeacherId || (assignTeacherName ? `name:${assignTeacherName}` : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setAssignTeacherId(null);
                      setAssignTeacherName("");
                      return;
                    }
                    const found = teachers.find((t) => String(t.id) === val);
                    if (found) {
                      setAssignTeacherId(found.id);
                      setAssignTeacherName(found.name);
                    } else {
                      setAssignTeacherId(null);
                      setAssignTeacherName(val.replace("name:", ""));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Guru Pembuat Soal --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nip ? `(NIP: ${t.nip})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                💡 Guru yang ditugaskan akan otomatis melihat mata pelajaran ini di akun CBT-nya untuk langsung menginput soal interaktif atau mengimpor dari file Word.
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAssign}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>{savingAssign ? "Menyimpan..." : "Simpan Penugasan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PENGATURAN ATURAN UJIAN PER MATA PELAJARAN (SOAL/OPSI/SKOR/DLL) */}
      {/* ===================================================================== */}
      {showExamSettingsModal && selectedTargetForSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg border border-indigo-200/70 shadow-2xs">
                  <FontAwesomeIcon icon={faGear} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pengaturan Aturan Ujian Mapel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mata Pelajaran: <b className="text-indigo-700">{selectedTargetForSettings.subjectName}</b> (Kelas {selectedTargetForSettings.grade || 10})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExamSettingsModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/70 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCircleCheck} className="text-blue-600 text-sm mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                Pengaturan ini berlaku khusus untuk <b>{selectedTargetForSettings.subjectName}</b>. Aturan pengacakan, publikasi skor, dan pembahasan akan diterapkan ke semua sesi pengerjaan ujian mapel ini.
              </div>
            </div>

            <form onSubmit={handleSaveExamSettings} className="space-y-4">
              {/* Toggle 1: Acak Urutan Soal */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">🔀 Acak Urutan Soal</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${settingRandomizeQuestions ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {settingRandomizeQuestions ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Nomor urutan butir soal diacak untuk tiap siswa. Nonaktifkan jika soal memiliki wacana bertingkat/bacaan berurutan (misal: Bahasa Inggris/Indonesia).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settingRandomizeQuestions}
                    onChange={(e) => setSettingRandomizeQuestions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Toggle 2: Acak Opsi Pilihan Jawaban */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">🔠 Acak Pilihan Opsi Jawaban</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${settingRandomizeOptions ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {settingRandomizeOptions ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Letak pilihan jawaban diacak otomatis untuk tiap siswa namun label abjad di layar tetap rapi berurutan A, B, C, D, E.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settingRandomizeOptions}
                    onChange={(e) => setSettingRandomizeOptions(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Toggle 3: Tampilkan Nilai / Skor Akhir */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">🏆 Tampilkan Nilai / Skor Akhir</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${settingShowScore ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {settingShowScore ? "DITAMPILKAN" : "DISEMBUNYIKAN"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Setelah siswa menekan tombol "Selesai Ujian", hasil skor nilai langsung ditampilkan di layar siswa.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settingShowScore}
                    onChange={(e) => setSettingShowScore(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Toggle 4: Tampilkan Pembahasan & Kunci Jawaban */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">💡 Tampilkan Pembahasan &amp; Kunci Soal</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${settingShowExplanation ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {settingShowExplanation ? "DITAMPILKAN" : "DISEMBUNYIKAN"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Siswa dapat meninjau butir soal yang telah dikerjakan lengkap dengan pembahasan dan jawaban yang benar setelah menyelesaikan ujian.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settingShowExplanation}
                    onChange={(e) => setSettingShowExplanation(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Grid: Durasi, KKM, Toleransi Pelanggaran */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    ⏱️ Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={settingDuration}
                    onChange={(e) => setSettingDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block">Waktu ujian siswa</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    🎯 KKM / Batas Lulus
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={settingPassingScore}
                    onChange={(e) => setSettingPassingScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block">Nilai minimum lulus</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    🛡️ Toleransi Curang
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={settingMaxViolations}
                    onChange={(e) => setSettingMaxViolations(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block">Maks pindah tab/layar</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExamSettingsModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingExamSettings}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>{savingExamSettings ? "Menyimpan Aturan..." : "Simpan Aturan Mapel"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
