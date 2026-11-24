"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlus,
  faTrash,
  faCopy,
  faCheck,
  faCheckCircle,
  faImage,
  faUpload,
  faRotate,
  faFileWord,
  faBookOpen,
  faXmark,
  faKey,
  faFloppyDisk,
  faEye,
  faPen,
  faCircleDot,
  faSquareCheck,
  faLightbulb,
  faLayerGroup,
  faAward,
  faScaleBalanced,
  faLink,
  faAlignLeft,
  faParagraph,
  faCheckDouble,
  faGraduationCap,
  faArrowUp,
  faCircleCheck,
  faCircleExclamation,
  faSliders,
  faLock,
  faTag,
  faGripVertical,
  faChevronUp,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

// Definisi 6 Jenis Soal CBT
const QUESTION_TYPES = [
  {
    id: "multiple_choice",
    label: "Pilihan Ganda",
    icon: faCircleDot,
    desc: "Satu pilihan jawaban benar (A, B, C, D, E)",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "checkbox",
    label: "Kotak Centang",
    icon: faSquareCheck,
    desc: "Pilihan ganda kompleks (bisa lebih dari satu jawaban benar)",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "true_false",
    label: "Benar / Salah",
    icon: faScaleBalanced,
    desc: "Pernyataan bernilai Benar (B) atau Salah (S)",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "matching",
    label: "Menjodohkan",
    icon: faLink,
    desc: "Memasangkan premis di kolom kiri dengan jawaban di kolom kanan",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "short_answer",
    label: "Jawaban Singkat",
    icon: faAlignLeft,
    desc: "Siswa mengetikkan jawaban pendek kata/angka",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "paragraph",
    label: "Paragraf / Esai",
    icon: faParagraph,
    desc: "Siswa mengetikkan uraian / esai panjang",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

export default function BankSoalEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bankId = resolvedParams.id;
  const router = useRouter();
  const { token, user, isAdminOrStaff, isLoading: authLoading } = useAuth();

  // State Utama Bank Soal
  const [bank, setBank] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved">("idle");

  // State Header Metadata (Judul, Mapel, Kelas)
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [quizSubject, setQuizSubject] = useState<string>("");
  const [quizGrade, setQuizGrade] = useState<number>(10);
  const [editingHeader, setEditingHeader] = useState<boolean>(false);

  // State Kartu Soal yang Sedang Aktif (Inline Editing ala Google Form)
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  // State Mode Kunci Jawaban & Skor pada Kartu Aktif
  const [isAnswerKeyMode, setIsAnswerKeyMode] = useState<boolean>(false);

  // State Form Edit Soal Aktif (Draft Lokal saat diedit)
  const [draftNumber, setDraftNumber] = useState<number>(1);
  const [draftType, setDraftType] = useState<string>("multiple_choice");
  const [draftContent, setDraftContent] = useState<string>("");
  const [draftImageUrl, setDraftImageUrl] = useState<string>("");
  const [draftPoints, setDraftPoints] = useState<number>(1.0);
  const [draftOptions, setDraftOptions] = useState<
    { key: string; text: string; image_url?: string; match?: string }[]
  >([]);
  const [draftCorrectAnswer, setDraftCorrectAnswer] = useState<string>("A");
  const [draftExplanation, setDraftExplanation] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState<number | null>(null);

  // Mode Pratinjau Tampilan Siswa
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  // State Modal Impor Word (.docx)
  const [showWordModal, setShowWordModal] = useState<boolean>(false);
  const [selectedDocxFile, setSelectedDocxFile] = useState<File | null>(null);
  const [parsingWord, setParsingWord] = useState<boolean>(false);
  const [wordPreviewQuestions, setWordPreviewQuestions] = useState<any[]>([]);

  // State Drag & Drop Urutan Soal & Urutan Opsi
  const [draggedQuestionIdx, setDraggedQuestionIdx] = useState<number | null>(null);
  const [dragOverQuestionIdx, setDragOverQuestionIdx] = useState<number | null>(null);
  const [dragHandleQuestionId, setDragHandleQuestionId] = useState<number | null>(null);
  const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);
  const [dragOverOptionIdx, setDragOverOptionIdx] = useState<number | null>(null);
  const [dragHandleOptionIdx, setDragHandleOptionIdx] = useState<number | null>(null);

  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const optionFileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // State Modal Pengaturan Butir Soal (Per-Question Settings)
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [selectedQuestionForSetting, setSelectedQuestionForSetting] = useState<any | null>(null);
  const [settingLockOrder, setSettingLockOrder] = useState<boolean>(false);
  const [settingRandomizeOptions, setSettingRandomizeOptions] = useState<string>("default");
  const [settingDifficulty, setSettingDifficulty] = useState<string>("sedang");
  const [settingTopic, setSettingTopic] = useState<string>("");
  const [settingLayout, setSettingLayout] = useState<string>("vertical");
  const [settingIsRequired, setSettingIsRequired] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Buka Modal Pengaturan Soal
  const handleOpenSettingsModal = (q: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedQuestionForSetting(q);
    setSettingLockOrder(Boolean(q.lock_order));
    setSettingRandomizeOptions(q.randomize_options_mode || "default");
    setSettingDifficulty(q.difficulty || "sedang");
    setSettingTopic(q.topic || "");
    setSettingLayout(q.layout || "vertical");
    setSettingIsRequired(Boolean(q.is_required));
    setShowSettingsModal(true);
  };

  // Simpan Pengaturan Soal ke Server
  const handleSaveQuestionSettings = async () => {
    if (!token || !bankId || !selectedQuestionForSetting) return;
    try {
      setSavingSettings(true);
      const payload = {
        lock_order: settingLockOrder ? 1 : 0,
        randomize_options_mode: settingRandomizeOptions,
        difficulty: settingDifficulty,
        topic: settingTopic.trim(),
        layout: settingLayout,
        is_required: settingIsRequired ? 1 : 0,
      };

      const res = await fetch(
        `/api/cbt-backend/api/cbt/banks/${bankId}/questions/${selectedQuestionForSetting.id}/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setBank((prev: any) => {
          if (!prev) return prev;
          const updated = (prev.questions || []).map((item: any) =>
            item.id === selectedQuestionForSetting.id
              ? {
                  ...item,
                  lock_order: payload.lock_order,
                  randomize_options_mode: payload.randomize_options_mode,
                  difficulty: payload.difficulty,
                  topic: payload.topic,
                  layout: payload.layout,
                  is_required: payload.is_required,
                }
              : item
          );
          return { ...prev, questions: updated };
        });

        setShowSettingsModal(false);

        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: false,
          customClass: {
            popup: "rounded-2xl shadow-lg border border-slate-200 text-xs py-2 px-3 font-medium",
          },
        });
        Toast.fire({
          icon: "success",
          title: `Pengaturan Soal #${selectedQuestionForSetting.question_number} berhasil disimpan!`,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menyimpan pengaturan butir soal.", "error");
      }
    } catch (err: any) {
      Swal.fire("Error", err.message || "Terjadi kesalahan saat menyimpan pengaturan.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Cek Login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch Data Bank Soal
  const fetchBankDetail = async () => {
    if (!token || !bankId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const b = data.bank || null;
        setBank(b);
        if (b) {
          setQuizTitle(b.title || "Bank Soal Baru");
          setQuizSubject(b.subject_name || "Mata Pelajaran");
          setQuizGrade(b.grade || 10);
        }
      } else {
        const err = await res.json();
        Swal.fire("Gagal", err.detail || "Bank soal tidak ditemukan.", "error");
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", "Gagal menghubungi server CBT.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && bankId) {
      fetchBankDetail();
    }
  }, [token, bankId]);

  // Simpan Perubahan Header (Judul, Mapel, Tingkat Kelas)
  const handleSaveHeader = async () => {
    if (!token || !bankId) return;
    try {
      setSavingStatus("saving");
      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: quizTitle.trim() || "Bank Soal",
          subject_name: quizSubject.trim() || "Mata Pelajaran",
          grade: Number(quizGrade) || 10,
        }),
      });
      if (res.ok) {
        setSavingStatus("saved");
        setEditingHeader(false);
        fetchBankDetail();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Informasi bank soal diperbarui",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pilih & Aktifkan Kartu Soal untuk Diedit Inline
  const handleSelectQuestion = (q: any) => {
    if (activeQuestionId === q.id) return;

    if (activeQuestionId !== null && activeQuestionId !== q.id) {
      handleSaveActiveQuestion(false);
    }

    setActiveQuestionId(q.id);
    setIsAnswerKeyMode(false);
    setDraftNumber(q.question_number || 1);
    setDraftType(q.question_type || "multiple_choice");
    setDraftContent(q.content || "");
    setDraftImageUrl(q.image_url || "");
    setDraftPoints(Number(q.points) || 1.0);
    setDraftExplanation(q.explanation || "");

    const type = q.question_type || "multiple_choice";
    if (type === "matching") {
      setDraftOptions(
        q.options && q.options.length > 0
          ? q.options
          : [
              { key: "1", text: "Premis 1", match: "Jawaban A" },
              { key: "2", text: "Premis 2", match: "Jawaban B" },
            ]
      );
    } else if (type === "short_answer" || type === "paragraph") {
      setDraftOptions([]);
    } else {
      setDraftOptions(
        q.options && q.options.length > 0
          ? q.options
          : [
              { key: "A", text: "Opsi 1" },
              { key: "B", text: "Opsi 2" },
              { key: "C", text: "Opsi 3" },
              { key: "D", text: "Opsi 4" },
            ]
      );
    }

    setDraftCorrectAnswer(q.correct_answer || (type === "checkbox" ? "A" : "A"));
  };

  // Ubah Tipe Soal pada Kartu Aktif
  const handleChangeDraftType = (newType: string) => {
    setDraftType(newType);
    if (newType === "true_false") {
      setDraftOptions([
        { key: "B", text: "Benar" },
        { key: "S", text: "Salah" },
      ]);
      setDraftCorrectAnswer("B");
    } else if (newType === "matching") {
      if (!draftOptions || draftOptions.length === 0 || !draftOptions[0].match) {
        setDraftOptions([
          { key: "1", text: "Pernyataan / Premis 1", match: "Jawaban Pasangan 1" },
          { key: "2", text: "Pernyataan / Premis 2", match: "Jawaban Pasangan 2" },
          { key: "3", text: "Pernyataan / Premis 3", match: "Jawaban Pasangan 3" },
        ]);
      }
      setDraftCorrectAnswer("matching");
    } else if (newType === "short_answer" || newType === "paragraph") {
      setDraftOptions([]);
      if (newType === "paragraph") {
        setDraftCorrectAnswer(draftCorrectAnswer || "Rubrik Penilaian");
      }
    } else if (newType === "checkbox") {
      if (draftOptions.length === 0 || draftOptions[0].match) {
        setDraftOptions([
          { key: "A", text: "Pilihan 1" },
          { key: "B", text: "Pilihan 2" },
          { key: "C", text: "Pilihan 3" },
          { key: "D", text: "Pilihan 4" },
        ]);
      }
      setDraftCorrectAnswer("A");
    } else {
      // multiple_choice
      if (draftOptions.length === 0 || draftOptions[0].match) {
        setDraftOptions([
          { key: "A", text: "Opsi 1" },
          { key: "B", text: "Opsi 2" },
          { key: "C", text: "Opsi 3" },
          { key: "D", text: "Opsi 4" },
        ]);
      }
      setDraftCorrectAnswer("A");
    }
  };

  // Simpan Kartu Soal yang Sedang Aktif
  const handleSaveActiveQuestion = async (notify: boolean = true) => {
    if (!token || !bankId || activeQuestionId === null) return;
    if (!draftContent.trim()) {
      if (notify) Swal.fire("Lengkapi Soal", "Teks pertanyaan wajib diisi.", "warning");
      return;
    }

    try {
      setSavingStatus("saving");
      let cleanedOptions = draftOptions;

      if (draftType === "true_false") {
        cleanedOptions = [
          { key: "B", text: "Benar" },
          { key: "S", text: "Salah" },
        ];
      } else if (draftType === "short_answer" || draftType === "paragraph") {
        cleanedOptions = [];
      } else if (draftType === "matching") {
        cleanedOptions = draftOptions.filter((o) => o.text.trim() || (o.match && o.match.trim()));
      } else {
        cleanedOptions = draftOptions.filter((o) => o.text.trim() || o.image_url);
      }

      const existingQ = bank?.questions?.find((it: any) => it.id === activeQuestionId);

      const payload = {
        question_number: draftNumber,
        question_type: draftType,
        content: draftContent.trim(),
        image_url: draftImageUrl.trim() || null,
        audio_url: null,
        points: Number(draftPoints) || 1.0,
        options: cleanedOptions,
        correct_answer: (draftCorrectAnswer || "").trim(),
        explanation: draftExplanation.trim() || null,
        lock_order: existingQ?.lock_order ?? 0,
        randomize_options_mode: existingQ?.randomize_options_mode ?? "default",
        difficulty: existingQ?.difficulty ?? "sedang",
        topic: existingQ?.topic ?? "",
        layout: existingQ?.layout ?? "vertical",
        is_required: existingQ?.is_required ?? 0,
      };

      const res = await fetch(
        `/api/cbt-backend/api/cbt/banks/${bankId}/questions/${activeQuestionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setSavingStatus("saved");
        if (notify) {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: `Soal #${draftNumber} berhasil disimpan!`,
            showConfirmButton: false,
            timer: 1500,
          });
        }
        fetchBankDetail();
      }
    } catch (e: any) {
      console.error(e);
      if (notify) Swal.fire("Gagal", e.message || "Gagal menyimpan butir soal.", "error");
    }
  };

  // Tambah Pertanyaan Baru Secara Cepat (Langsung Muncul & Masuk Mode Edit Inline)
  const handleAddNewQuestion = async () => {
    if (!token || !bankId) return;
    try {
      if (activeQuestionId !== null) {
        await handleSaveActiveQuestion(false);
      }

      setSavingStatus("saving");
      const currentQuestions = bank?.questions || [];
      const nextNum = currentQuestions.length + 1;

      const newQuestionPayload = {
        question_number: nextNum,
        question_type: "multiple_choice",
        content: `Pertanyaan baru #${nextNum}`,
        image_url: null,
        audio_url: null,
        points: 1.0,
        options: [
          { key: "A", text: "Pilihan A" },
          { key: "B", text: "Pilihan B" },
          { key: "C", text: "Pilihan C" },
          { key: "D", text: "Pilihan D" },
        ],
        correct_answer: "A",
        explanation: null,
      };

      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newQuestionPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavingStatus("saved");
        const newQId = data.question_id;

        const bankRes = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (bankRes.ok) {
          const bData = await bankRes.json();
          setBank(bData.bank || null);

          setActiveQuestionId(newQId);
          setIsAnswerKeyMode(false);
          setDraftNumber(nextNum);
          setDraftType("multiple_choice");
          setDraftContent(`Pertanyaan baru #${nextNum}`);
          setDraftImageUrl("");
          setDraftPoints(1.0);
          setDraftExplanation("");
          setDraftOptions([
            { key: "A", text: "Pilihan A" },
            { key: "B", text: "Pilihan B" },
            { key: "C", text: "Pilihan C" },
            { key: "D", text: "Pilihan D" },
          ]);
          setDraftCorrectAnswer("A");

          setTimeout(() => {
            const el = cardRefs.current[newQId];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 150);
        }
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Gagal", e.message || "Gagal menambah pertanyaan.", "error");
    }
  };

  // Duplikat Pertanyaan
  const handleDuplicateQuestion = async (q: any) => {
    if (!token || !bankId) return;
    try {
      setSavingStatus("saving");
      const currentQuestions = bank?.questions || [];
      const nextNum = currentQuestions.length + 1;

      const dupPayload = {
        question_number: nextNum,
        question_type: q.question_type || "multiple_choice",
        content: `${q.content} (Salinan)`,
        image_url: q.image_url || null,
        audio_url: q.audio_url || null,
        points: Number(q.points) || 1.0,
        options: q.options || [],
        correct_answer: q.correct_answer || "A",
        explanation: q.explanation || null,
        lock_order: q.lock_order ?? 0,
        randomize_options_mode: q.randomize_options_mode ?? "default",
        difficulty: q.difficulty ?? "sedang",
        topic: q.topic ?? "",
        layout: q.layout ?? "vertical",
        is_required: q.is_required ?? 0,
      };

      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dupPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavingStatus("saved");
        fetchBankDetail();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Soal #${q.question_number} berhasil diduplikasi!`,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Hapus Pertanyaan
  const handleDeleteQuestion = async (qId: number, qNum: number) => {
    Swal.fire({
      title: `Hapus Soal #${qNum}?`,
      text: "Pertanyaan ini akan dihapus secara permanen dari bank soal.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/questions/${qId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            if (activeQuestionId === qId) {
              setActiveQuestionId(null);
            }
            fetchBankDetail();
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: `Soal #${qNum} berhasil dihapus.`,
              showConfirmButton: false,
              timer: 1500,
            });
          }
        } catch (e: any) {
          console.error(e);
        }
      }
    });
  };

  // Upload Gambar untuk Pertanyaan Utama
  const handleUploadImageForDraft = async (file: File) => {
    if (!token || !file) return;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cbt-backend/api/cbt/banks/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDraftImageUrl(data.image_url);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Gambar soal berhasil diunggah",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload Gambar untuk Opsi Pilihan Jawaban
  const handleUploadImageForOption = async (file: File, optIdx: number) => {
    if (!token || !file) return;
    try {
      setUploadingOptionIdx(optIdx);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cbt-backend/api/cbt/banks/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newOpts = [...draftOptions];
        newOpts[optIdx] = { ...newOpts[optIdx], image_url: data.image_url };
        setDraftOptions(newOpts);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Gambar opsi ${newOpts[optIdx].key} berhasil diunggah!`,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setUploadingOptionIdx(null);
    }
  };

  // Hapus Gambar Opsi
  const handleRemoveOptionImage = (optIdx: number) => {
    const newOpts = [...draftOptions];
    newOpts[optIdx] = { ...newOpts[optIdx], image_url: undefined };
    setDraftOptions(newOpts);
  };

  // Tambah Opsi Jawaban Baru pada Kartu Aktif
  const handleAddOption = () => {
    if (draftType === "matching") {
      const nextNum = draftOptions.length + 1;
      setDraftOptions([
        ...draftOptions,
        { key: String(nextNum), text: `Premis ${nextNum}`, match: `Pasangan ${nextNum}` },
      ]);
    } else {
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const nextKey = letters[draftOptions.length] || `O${draftOptions.length + 1}`;
      const nextNum = draftOptions.length + 1;
      setDraftOptions([...draftOptions, { key: nextKey, text: `Pilihan ${nextKey}` }]);
    }
  };

  const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  // Pindah Urutan Opsi Jawaban (Drag & Drop atau Tombol Naik/Turun) sekaligus menjaga Kunci Jawaban
  const handleReorderOptions = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= draftOptions.length ||
      toIdx >= draftOptions.length
    ) {
      return;
    }

    const oldCorrectKeys = new Set(
      (draftCorrectAnswer || "")
        .split(",")
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean)
    );

    const tagged = draftOptions.map((opt) => ({
      ...opt,
      _wasCorrect: oldCorrectKeys.has(String(opt.key).toUpperCase()),
    }));

    const [moved] = tagged.splice(fromIdx, 1);
    tagged.splice(toIdx, 0, moved);

    const reindexed = tagged.map((item, idx) => ({
      key:
        draftType === "matching"
          ? String(idx + 1)
          : OPTION_LETTERS[idx] || `O${idx + 1}`,
      text: item.text,
      image_url: item.image_url,
      match: item.match,
      _wasCorrect: item._wasCorrect,
    }));

    setDraftOptions(reindexed.map(({ _wasCorrect, ...rest }) => rest));

    if (draftType === "multiple_choice") {
      const correctItem = reindexed.find((it) => it._wasCorrect);
      if (correctItem) setDraftCorrectAnswer(correctItem.key);
    } else if (draftType === "checkbox") {
      const newKeys = reindexed.filter((it) => it._wasCorrect).map((it) => it.key);
      if (newKeys.length > 0) setDraftCorrectAnswer(newKeys.join(","));
    }
  };

  // Pindah Urutan Butir Soal (Drag & Drop atau Tombol Naik/Turun) & Simpan ke Backend
  const handleReorderQuestions = async (fromIdx: number, toIdx: number) => {
    const currentQuestions: any[] = bank?.questions || [];
    if (
      !token ||
      !bankId ||
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= currentQuestions.length ||
      toIdx >= currentQuestions.length
    ) {
      return;
    }

    const reordered = [...currentQuestions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const renumbered = reordered.map((qItem, idx) => ({
      ...qItem,
      question_number: idx + 1,
    }));

    // Update UI langsung secara optimis
    setBank((prev: any) => (prev ? { ...prev, questions: renumbered } : prev));
    if (activeQuestionId !== null) {
      const activeIdx = renumbered.findIndex((item) => item.id === activeQuestionId);
      if (activeIdx !== -1) setDraftNumber(activeIdx + 1);
    }

    try {
      setSavingStatus("saving");
      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/questions/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_ids: renumbered.map((item) => item.id),
        }),
      });
      if (res.ok) {
        setSavingStatus("saved");
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Urutan soal diperbarui",
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        fetchBankDetail();
      }
    } catch (e) {
      console.error("Gagal memperbarui urutan soal:", e);
      fetchBankDetail();
    }
  };

  // Hapus Salah Satu Opsi Jawaban (Sekaligus Merapikan Label A, B, C... & Kunci Jawaban)
  const handleRemoveOption = (index: number) => {
    if (draftOptions.length <= 2) {
      Swal.fire("Minimal 2 Pilihan", "Pilihan jawaban minimal harus memiliki 2 opsi.", "info");
      return;
    }

    const oldCorrectKeys = new Set(
      (draftCorrectAnswer || "")
        .split(",")
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean)
    );

    const remaining = draftOptions
      .filter((_, i) => i !== index)
      .map((opt, idx) => ({
        key:
          draftType === "matching"
            ? String(idx + 1)
            : OPTION_LETTERS[idx] || `O${idx + 1}`,
        text: opt.text,
        image_url: opt.image_url,
        match: opt.match,
        _wasCorrect: oldCorrectKeys.has(String(opt.key).toUpperCase()),
      }));

    setDraftOptions(remaining.map(({ _wasCorrect, ...rest }) => rest));

    if (draftType === "multiple_choice") {
      const stillCorrect = remaining.find((it) => it._wasCorrect);
      setDraftCorrectAnswer(stillCorrect ? stillCorrect.key : remaining[0]?.key || "A");
    } else if (draftType === "checkbox") {
      const newKeys = remaining.filter((it) => it._wasCorrect).map((it) => it.key);
      setDraftCorrectAnswer(newKeys.length > 0 ? newKeys.join(",") : remaining[0]?.key || "A");
    }
  };

  // Toggle Kunci Jawaban Checkbox
  const handleToggleCheckboxKey = (key: string) => {
    const currentKeys = draftCorrectAnswer
      ? draftCorrectAnswer
          .split(",")
          .map((k) => k.trim().toUpperCase())
          .filter(Boolean)
      : [];

    const keyUpper = key.toUpperCase();
    let updated: string[];
    if (currentKeys.includes(keyUpper)) {
      updated = currentKeys.filter((k) => k !== keyUpper);
      if (updated.length === 0) updated = [keyUpper];
    } else {
      updated = [...currentKeys, keyUpper].sort();
    }
    setDraftCorrectAnswer(updated.join(","));
  };

  // Handler Parse File Word .docx
  const handleParseDocx = async () => {
    if (!token || !selectedDocxFile) return;
    try {
      setParsingWord(true);
      const formData = new FormData();
      formData.append("file", selectedDocxFile);
      const res = await fetch("/api/cbt-backend/api/cbt/banks/parse-docx", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWordPreviewQuestions(data.questions || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setParsingWord(false);
    }
  };

  // Simpan Hasil Impor Word
  const handleSaveWordQuestions = async () => {
    if (!token || wordPreviewQuestions.length === 0) return;
    try {
      setParsingWord(true);
      const res = await fetch(`/api/cbt-backend/api/cbt/banks/${bankId}/questions/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(wordPreviewQuestions),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire(
          "Impor Berhasil",
          `Sebanyak ${wordPreviewQuestions.length} butir soal dari Word berhasil ditambahkan ke bank soal ini.`,
          "success"
        );
        setShowWordModal(false);
        setSelectedDocxFile(null);
        setWordPreviewQuestions([]);
        fetchBankDetail();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setParsingWord(false);
    }
  };

  const questions: any[] = bank?.questions || [];
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1.0), 0);

  return (
    <div className="flex flex-col gap-5 min-w-0 w-full animate-in fade-in duration-200">
      {/* ===================================================================== */}
      {/* 1. HEADER HALAMAN ELEGAN KHAS CBT & SIAK                             */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/bank-soal"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0 shadow-2xs"
            title="Kembali ke Daftar Bank Soal"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {quizTitle || "Bank Soal"}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                {quizSubject} &bull; Kelas {quizGrade}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>{questions.length} Butir Soal Terpasang</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700">Total Bobot: {totalPoints.toFixed(1)} Poin</span>
              <span>&bull;</span>
              <span className="text-[11px] font-semibold text-slate-400">
                {savingStatus === "saving" && "Menyimpan perubahan..."}
                {savingStatus === "saved" && "✓ Tersimpan"}
                {savingStatus === "idle" && "Tersimpan"}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Tombol Pratinjau Tampilan Siswa */}
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              previewMode
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
            title="Pratinjau tampilan kuis seperti yang dilihat siswa"
          >
            <FontAwesomeIcon icon={faEye} className="text-xs" />
            <span>{previewMode ? "Mode Edit Soal" : "Pratinjau Siswa"}</span>
          </button>

          {/* Tombol Impor Word */}
          <button
            type="button"
            onClick={() => {
              setSelectedDocxFile(null);
              setWordPreviewQuestions([]);
              setShowWordModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Impor soal dari file Microsoft Word (.docx)"
          >
            <FontAwesomeIcon icon={faFileWord} className="text-blue-600 text-xs" />
            <span>Impor Word</span>
          </button>

          {/* Tombol Tambah Soal Cepat */}
          {!previewMode && (
            <button
              type="button"
              onClick={handleAddNewQuestion}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Tambah Soal</span>
            </button>
          )}

          {/* Segarkan Data */}
          <button
            type="button"
            onClick={fetchBankDetail}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Segarkan data bank soal"
          >
            <FontAwesomeIcon icon={faRotate} className={`text-xs ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. KARTU INFORMASI BANK SOAL (METADATA)                               */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
              <FontAwesomeIcon icon={faSliders} />
            </span>
            <h2 className="text-sm font-bold text-slate-900">Pengaturan Informasi Bank Soal</h2>
          </div>
          {!editingHeader ? (
            <button
              type="button"
              onClick={() => setEditingHeader(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={faPen} className="text-[11px]" />
              <span>Ubah Informasi</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveHeader}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Simpan
              </button>
            </div>
          )}
        </div>

        {editingHeader ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Judul Bank Soal:
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Contoh: STS Ganjil Matematika Kelas X"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Mata Pelajaran:
              </label>
              <input
                type="text"
                value={quizSubject}
                onChange={(e) => setQuizSubject(e.target.value)}
                placeholder="Contoh: Matematika"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tingkat Kelas:
              </label>
              <select
                value={quizGrade}
                onChange={(e) => setQuizGrade(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
              >
                <option value={10}>Kelas 10 (Fase E)</option>
                <option value={11}>Kelas 11 (Fase F)</option>
                <option value={12}>Kelas 12 (Fase F)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 font-medium mr-1.5">Judul:</span>
              <span className="font-bold text-slate-900">{quizTitle || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1.5">Mata Pelajaran:</span>
              <span className="font-bold text-slate-900">{quizSubject || "-"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1.5">Tingkat:</span>
              <span className="font-bold text-slate-900">Kelas {quizGrade}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1.5">Jumlah Soal:</span>
              <span className="font-bold text-blue-600">{questions.length} butir</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1.5">Total Bobot:</span>
              <span className="font-bold text-emerald-600">{totalPoints.toFixed(1)} poin</span>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. AREA KELOLA BUTIR SOAL (DIBERI JARAK KANAN AGAR TOOLBAR AMAN)      */}
      {/* ===================================================================== */}
      <div className={`space-y-4 pb-10 ${!previewMode ? "pr-16 sm:pr-20" : ""}`}>
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <FontAwesomeIcon icon={faRotate} className="text-2xl text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Memuat butir soal...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Belum Ada Butir Soal</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Mulai membuat butir soal secara langsung dengan mengklik tombol di bawah, atau impor langsung seluruh soal dari file Microsoft Word (.docx).
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddNewQuestion}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Buat Soal Pertama</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDocxFile(null);
                  setWordPreviewQuestions([]);
                  setShowWordModal(true);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faFileWord} className="text-blue-600" />
                <span>Impor File Word</span>
              </button>
            </div>
          </div>
        ) : (
          questions.map((q: any, qIdx: number) => {
            const isActive = activeQuestionId === q.id && !previewMode;
            const isDragTarget =
              dragOverQuestionIdx === qIdx &&
              draggedQuestionIdx !== null &&
              draggedQuestionIdx !== qIdx;

            return (
              <div
                key={q.id}
                ref={(el) => {
                  cardRefs.current[q.id] = el;
                }}
                draggable={!previewMode && dragHandleQuestionId === q.id}
                onDragStart={(e) => {
                  setDraggedQuestionIdx(qIdx);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(qIdx));
                }}
                onDragOver={(e) => {
                  if (draggedQuestionIdx === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverQuestionIdx !== qIdx) setDragOverQuestionIdx(qIdx);
                }}
                onDragLeave={() => {
                  if (dragOverQuestionIdx === qIdx) setDragOverQuestionIdx(null);
                }}
                onDrop={(e) => {
                  if (draggedQuestionIdx === null) return;
                  e.preventDefault();
                  const fromIdx = draggedQuestionIdx;
                  setDraggedQuestionIdx(null);
                  setDragOverQuestionIdx(null);
                  setDragHandleQuestionId(null);
                  if (fromIdx !== qIdx) {
                    handleReorderQuestions(fromIdx, qIdx);
                  }
                }}
                onDragEnd={() => {
                  setDraggedQuestionIdx(null);
                  setDragOverQuestionIdx(null);
                  setDragHandleQuestionId(null);
                }}
                onClick={() => {
                  if (!isActive && !previewMode) handleSelectQuestion(q);
                }}
                className={`bg-white rounded-2xl transition overflow-hidden relative ${
                  isDragTarget
                    ? "border-2 border-dashed border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/30"
                    : isActive
                    ? "border-2 border-blue-600 ring-4 ring-blue-500/10 shadow-lg"
                    : "border border-slate-200/90 hover:border-blue-400 hover:shadow-xs shadow-2xs cursor-pointer"
                } ${draggedQuestionIdx === qIdx ? "opacity-50 scale-[0.99]" : ""}`}
              >
                {/* ------------------------------------------------------------- */}
                {/* A. JIKA KARTU INI AKTIF (MODE EDIT INLINE ALA GOOGLE FORM)    */}
                {/* ------------------------------------------------------------- */}
                {isActive ? (
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Header Kartu Aktif: Drag Handle, Urutan, Nomor Soal & Dropdown Tipe Soal */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {/* Drag Handle & Tombol Pindah Urutan Soal */}
                        <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200">
                          <span
                            onMouseDown={() => setDragHandleQuestionId(q.id)}
                            onMouseUp={() => setDragHandleQuestionId(null)}
                            className="w-7 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-grab active:cursor-grabbing transition"
                            title="Seret untuk memindahkan urutan soal"
                          >
                            <FontAwesomeIcon icon={faGripVertical} className="text-xs" />
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={qIdx === 0}
                              onClick={() => handleReorderQuestions(qIdx, qIdx - 1)}
                              className="w-6 h-4 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[9px] transition cursor-pointer"
                              title="Pindahkan soal ke atas"
                            >
                              <FontAwesomeIcon icon={faChevronUp} />
                            </button>
                            <button
                              type="button"
                              disabled={qIdx === questions.length - 1}
                              onClick={() => handleReorderQuestions(qIdx, qIdx + 1)}
                              className="w-6 h-4 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[9px] transition cursor-pointer"
                              title="Pindahkan soal ke bawah"
                            >
                              <FontAwesomeIcon icon={faChevronDown} />
                            </button>
                          </div>
                        </div>

                        <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                          {draftNumber}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-900">
                            Mengedit Soal Nomor #{draftNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Seret ikon titik atau klik panah untuk mengubah urutan soal
                          </span>
                        </div>
                      </div>

                      {/* Dropdown 6 Tipe Soal */}
                      <div className="w-full sm:w-64">
                        <select
                          value={draftType}
                          onChange={(e) => handleChangeDraftType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition"
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* SUB-MODE 1: EDIT PERTANYAAN & OPSI JAWABAN */}
                    {!isAnswerKeyMode ? (
                      <>
                        {/* Input Teks Pertanyaan Utama & Tombol Sisipkan Gambar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                              Teks Pertanyaan / Soal:
                            </label>
                            {/* Tombol Sisipkan Gambar ke Soal Utama */}
                            <label
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-blue-50 transition"
                              title="Sisipkan gambar pada pertanyaan"
                            >
                              <FontAwesomeIcon icon={faImage} />
                              <span>{draftImageUrl ? "Ganti Gambar Soal" : "Sisipkan Gambar"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadImageForDraft(file);
                                }}
                              />
                            </label>
                          </div>

                          <textarea
                            rows={3}
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            placeholder="Tuliskan butir pertanyaan di sini..."
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm leading-relaxed focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition resize-y"
                          />
                        </div>

                        {/* Preview Gambar Pertanyaan Utama jika ada */}
                        {draftImageUrl && (
                          <div className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 inline-block relative group">
                            <img
                              src={draftImageUrl}
                              alt="Gambar Soal"
                              className="max-h-56 max-w-full rounded-lg object-contain bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setDraftImageUrl("")}
                              className="absolute top-4 right-4 w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center shadow-xs cursor-pointer hover:bg-rose-700 transition"
                              title="Hapus gambar ini"
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </button>
                          </div>
                        )}

                        {uploadingImage && (
                          <div className="text-xs font-bold text-blue-600 flex items-center gap-2">
                            <FontAwesomeIcon icon={faRotate} className="animate-spin" />
                            <span>Mengunggah gambar pertanyaan...</span>
                          </div>
                        )}

                        {/* INPUT OPSI SESUAI TIPE SOAL */}
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-bold text-slate-700 block">
                            Pilihan Jawaban:
                          </label>

                          {/* 1 & 2. Pilihan Ganda & Kotak Centang */}
                          {(draftType === "multiple_choice" || draftType === "checkbox") && (
                            <div className="space-y-2">
                              {draftOptions.map((opt, oIdx) => {
                                const isOptDragTarget =
                                  dragOverOptionIdx === oIdx &&
                                  draggedOptionIdx !== null &&
                                  draggedOptionIdx !== oIdx;
                                return (
                                  <div
                                    key={`${opt.key}-${oIdx}`}
                                    draggable={dragHandleOptionIdx === oIdx}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptionIdx(oIdx);
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData("text/plain", String(oIdx));
                                    }}
                                    onDragOver={(e) => {
                                      if (draggedOptionIdx === null) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = "move";
                                      if (dragOverOptionIdx !== oIdx) setDragOverOptionIdx(oIdx);
                                    }}
                                    onDragLeave={(e) => {
                                      e.stopPropagation();
                                      if (dragOverOptionIdx === oIdx) setDragOverOptionIdx(null);
                                    }}
                                    onDrop={(e) => {
                                      if (draggedOptionIdx === null) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const fromIdx = draggedOptionIdx;
                                      setDraggedOptionIdx(null);
                                      setDragOverOptionIdx(null);
                                      setDragHandleOptionIdx(null);
                                      if (fromIdx !== oIdx) {
                                        handleReorderOptions(fromIdx, oIdx);
                                      }
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptionIdx(null);
                                      setDragOverOptionIdx(null);
                                      setDragHandleOptionIdx(null);
                                    }}
                                    className={`space-y-2 rounded-xl transition ${
                                      isOptDragTarget
                                        ? "bg-blue-50/70 ring-2 ring-blue-400 p-1.5"
                                        : ""
                                    } ${draggedOptionIdx === oIdx ? "opacity-50" : ""}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {/* Drag Handle & Panah Naik/Turun Opsi */}
                                      <span
                                        onMouseDown={() => setDragHandleOptionIdx(oIdx)}
                                        onMouseUp={() => setDragHandleOptionIdx(null)}
                                        className="w-5 h-7 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 transition"
                                        title="Seret untuk mengubah urutan pilihan"
                                      >
                                        <FontAwesomeIcon icon={faGripVertical} className="text-[11px]" />
                                      </span>

                                      {/* Badge Opsi A, B, C, D */}
                                      <span
                                        className={`w-7 h-7 flex items-center justify-center text-xs font-black shrink-0 ${
                                          draftType === "checkbox"
                                            ? "rounded-lg border-2 border-slate-300 bg-slate-50 text-slate-700"
                                            : "rounded-full border-2 border-slate-300 bg-slate-50 text-slate-700"
                                        }`}
                                      >
                                        {opt.key}
                                      </span>

                                      {/* Input Teks Pilihan */}
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => {
                                          const newOpts = [...draftOptions];
                                          newOpts[oIdx].text = e.target.value;
                                          setDraftOptions(newOpts);
                                        }}
                                        placeholder={`Pilihan ${opt.key}`}
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition"
                                      />

                                      {/* Tombol Pindah Urutan Opsi Naik / Turun */}
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={oIdx === 0}
                                          onClick={() => handleReorderOptions(oIdx, oIdx - 1)}
                                          className="w-6 h-3.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[8px] transition cursor-pointer"
                                          title={`Pindahkan opsi ${opt.key} ke atas`}
                                        >
                                          <FontAwesomeIcon icon={faChevronUp} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={oIdx === draftOptions.length - 1}
                                          onClick={() => handleReorderOptions(oIdx, oIdx + 1)}
                                          className="w-6 h-3.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[8px] transition cursor-pointer"
                                          title={`Pindahkan opsi ${opt.key} ke bawah`}
                                        >
                                          <FontAwesomeIcon icon={faChevronDown} />
                                        </button>
                                      </div>

                                      {/* Tombol Sisipkan Gambar pada Opsi Ini */}
                                      <button
                                        type="button"
                                        onClick={() => optionFileInputRefs.current[oIdx]?.click()}
                                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 text-xs flex items-center justify-center transition cursor-pointer shrink-0"
                                        title={`Sisipkan gambar untuk pilihan ${opt.key}`}
                                      >
                                        <FontAwesomeIcon icon={faImage} />
                                      </button>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        ref={(el) => {
                                          optionFileInputRefs.current[oIdx] = el;
                                        }}
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadImageForOption(file, oIdx);
                                        }}
                                      />

                                      {/* Tombol Hapus Opsi */}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOption(oIdx)}
                                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 text-xs flex items-center justify-center transition cursor-pointer shrink-0"
                                        title="Hapus opsi ini"
                                      >
                                        <FontAwesomeIcon icon={faXmark} />
                                      </button>
                                    </div>

                                    {/* Preview Gambar pada Opsi */}
                                    {opt.image_url && (
                                      <div className="ml-14 inline-block relative border border-slate-200 rounded-xl p-1 bg-slate-50 shadow-2xs">
                                        <img
                                          src={opt.image_url}
                                          alt={`Gambar Opsi ${opt.key}`}
                                          className="max-h-24 max-w-xs rounded-lg object-contain bg-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveOptionImage(oIdx)}
                                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center shadow-xs hover:bg-rose-700 cursor-pointer"
                                          title="Hapus gambar pilihan ini"
                                        >
                                          <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                      </div>
                                    )}

                                    {uploadingOptionIdx === oIdx && (
                                      <div className="ml-14 text-[10px] font-bold text-blue-600 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faRotate} className="animate-spin" />
                                        <span>Mengunggah gambar opsi {opt.key}...</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Tombol Tambahkan Opsi Jawaban */}
                              <button
                                type="button"
                                onClick={handleAddOption}
                                className="mt-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span>Tambah Pilihan Jawaban</span>
                              </button>
                            </div>
                          )}

                          {/* 3. Benar / Salah */}
                          {draftType === "true_false" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                                  B
                                </span>
                                <span>Benar</span>
                              </div>
                              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                                  S
                                </span>
                                <span>Salah</span>
                              </div>
                            </div>
                          )}

                          {/* 4. Menjodohkan (Matching) */}
                          {draftType === "matching" && (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase px-1">
                                <div className="col-span-2">Urutan</div>
                                <div className="col-span-4">Pernyataan / Premis (Kiri)</div>
                                <div className="col-span-5">Pasangan Jawaban (Kanan)</div>
                                <div className="col-span-1 text-right">Hapus</div>
                              </div>

                              {draftOptions.map((opt, mIdx) => {
                                const isMatchDragTarget =
                                  dragOverOptionIdx === mIdx &&
                                  draggedOptionIdx !== null &&
                                  draggedOptionIdx !== mIdx;
                                return (
                                  <div
                                    key={mIdx}
                                    draggable={dragHandleOptionIdx === mIdx}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptionIdx(mIdx);
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData("text/plain", String(mIdx));
                                    }}
                                    onDragOver={(e) => {
                                      if (draggedOptionIdx === null) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (dragOverOptionIdx !== mIdx) setDragOverOptionIdx(mIdx);
                                    }}
                                    onDrop={(e) => {
                                      if (draggedOptionIdx === null) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const fromIdx = draggedOptionIdx;
                                      setDraggedOptionIdx(null);
                                      setDragOverOptionIdx(null);
                                      setDragHandleOptionIdx(null);
                                      if (fromIdx !== mIdx) handleReorderOptions(fromIdx, mIdx);
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      setDraggedOptionIdx(null);
                                      setDragOverOptionIdx(null);
                                      setDragHandleOptionIdx(null);
                                    }}
                                    className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition ${
                                      isMatchDragTarget
                                        ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300"
                                        : "bg-slate-50 border-slate-200"
                                    } ${draggedOptionIdx === mIdx ? "opacity-50" : ""}`}
                                  >
                                    <div className="col-span-2 flex items-center gap-1">
                                      <span
                                        onMouseDown={() => setDragHandleOptionIdx(mIdx)}
                                        onMouseUp={() => setDragHandleOptionIdx(null)}
                                        className="w-5 h-6 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-grab active:cursor-grabbing"
                                        title="Seret untuk mengubah urutan"
                                      >
                                        <FontAwesomeIcon icon={faGripVertical} className="text-[10px]" />
                                      </span>
                                      <div className="flex flex-col gap-0.5">
                                        <button
                                          type="button"
                                          disabled={mIdx === 0}
                                          onClick={() => handleReorderOptions(mIdx, mIdx - 1)}
                                          className="w-5 h-3 rounded bg-white hover:bg-blue-100 text-slate-500 disabled:opacity-30 flex items-center justify-center text-[8px] cursor-pointer"
                                          title="Naikkan baris"
                                        >
                                          <FontAwesomeIcon icon={faChevronUp} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={mIdx === draftOptions.length - 1}
                                          onClick={() => handleReorderOptions(mIdx, mIdx + 1)}
                                          className="w-5 h-3 rounded bg-white hover:bg-blue-100 text-slate-500 disabled:opacity-30 flex items-center justify-center text-[8px] cursor-pointer"
                                          title="Turunkan baris"
                                        >
                                          <FontAwesomeIcon icon={faChevronDown} />
                                        </button>
                                      </div>
                                      <span className="font-bold text-xs text-blue-600 ml-0.5">
                                        {mIdx + 1}.
                                      </span>
                                    </div>
                                    <div className="col-span-4">
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => {
                                          const newOpts = [...draftOptions];
                                          newOpts[mIdx].text = e.target.value;
                                          setDraftOptions(newOpts);
                                        }}
                                        placeholder={`Premis #${mIdx + 1}`}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                      />
                                    </div>
                                    <div className="col-span-5">
                                      <input
                                        type="text"
                                        value={opt.match || ""}
                                        onChange={(e) => {
                                          const newOpts = [...draftOptions];
                                          newOpts[mIdx].match = e.target.value;
                                          setDraftOptions(newOpts);
                                        }}
                                        placeholder={`Pasangan yang cocok #${mIdx + 1}`}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                      />
                                    </div>
                                    <div className="col-span-1 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOption(mIdx)}
                                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                        title="Hapus baris ini"
                                      >
                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={handleAddOption}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span>Tambah Pasangan Menjodohkan</span>
                              </button>
                            </div>
                          )}

                          {/* 5. Jawaban Singkat */}
                          {draftType === "short_answer" && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                              Siswa akan mengisi jawaban dengan teks singkat pada kolom jawaban saat ujian berlangsung. Kunci jawaban kata/frasa dapat diatur pada tombol Kunci Jawaban di bawah.
                            </div>
                          )}

                          {/* 6. Paragraf / Esai */}
                          {draftType === "paragraph" && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                              Siswa akan mengisi uraian atau esai panjang pada kolom jawaban saat ujian. Rubrik penilaian guru dapat diatur pada tombol Kunci Jawaban di bawah.
                            </div>
                          )}
                        </div>

                        {/* Toolbar Bawah Kartu Aktif */}
                        <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          {/* Sisi Kiri: Tombol Atur Kunci Jawaban & Pengaturan Butir Soal */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsAnswerKeyMode(true)}
                              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <FontAwesomeIcon icon={faKey} className="text-blue-600" />
                              <span>Kunci Jawaban &amp; Skor ({draftPoints} poin)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenSettingsModal(q, e)}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Pengaturan Khusus Butir Soal"
                            >
                              <FontAwesomeIcon icon={faSliders} className="text-slate-500" />
                              <span>Pengaturan Soal</span>
                            </button>
                          </div>

                          {/* Sisi Kanan: Duplikat, Hapus, Simpan */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(q)}
                              className="w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                              title="Duplikatkan pertanyaan ini"
                            >
                              <FontAwesomeIcon icon={faCopy} className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id, q.question_number)}
                              className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                              title="Hapus pertanyaan ini"
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-sm" />
                            </button>

                            <span className="h-5 w-px bg-slate-200 mx-1" />

                            <button
                              type="button"
                              onClick={() => handleSaveActiveQuestion(true)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <FontAwesomeIcon icon={faFloppyDisk} />
                              <span>Simpan Soal</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* SUB-MODE 2: PENGATURAN KUNCI JAWABAN & BOBOT SKOR */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                          <div>
                            <h4 className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                              Pengaturan Kunci Jawaban &amp; Bobot Nilai
                            </h4>
                            <p className="text-[11px] text-blue-700 mt-0.5">
                              {draftType === "multiple_choice" && "Klik salah satu opsi di bawah sebagai jawaban yang benar."}
                              {draftType === "checkbox" && "Centang satu atau beberapa opsi sebagai jawaban benar (multi-kunci)."}
                              {draftType === "true_false" && "Pilih Benar atau Salah sebagai kunci jawaban."}
                              {draftType === "matching" && "Periksa kesesuaian pasangan menjodohkan berikut."}
                              {draftType === "short_answer" && "Tuliskan kunci kata/frasa yang dianggap benar."}
                              {draftType === "paragraph" && "Tuliskan panduan rubrik penilaian esai untuk pemeriksa."}
                            </p>
                          </div>
                          {/* Input Bobot Poin */}
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-600">Bobot Poin:</span>
                            <input
                              type="number"
                              min={0.1}
                              step={0.5}
                              value={draftPoints}
                              onChange={(e) => setDraftPoints(Math.max(0.1, Number(e.target.value)))}
                              className="w-16 text-center font-black text-xs text-blue-700 border-b border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Pertanyaan Singkat */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-xs text-slate-800 leading-relaxed">
                          {draftContent}
                        </div>

                        {/* 1. KUNCI PILIHAN GANDA (SINGLE KEY) */}
                        {draftType === "multiple_choice" && (
                          <div className="space-y-2">
                            {draftOptions.map((opt) => {
                              const isCorrect =
                                draftCorrectAnswer.toUpperCase() === opt.key.toUpperCase();
                              return (
                                <div
                                  key={opt.key}
                                  onClick={() => setDraftCorrectAnswer(opt.key)}
                                  className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "border-2 border-slate-300 text-slate-500"
                                      }`}
                                    >
                                      {opt.key}
                                    </span>
                                    <span className="text-xs">{opt.text}</span>
                                    {opt.image_url && (
                                      <img
                                        src={opt.image_url}
                                        alt=""
                                        className="h-10 w-10 object-contain rounded border bg-white p-0.5 ml-2"
                                      />
                                    )}
                                  </div>
                                  {isCorrect && (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                      <FontAwesomeIcon icon={faCheck} />
                                      <span>Kunci Benar</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. KUNCI KOTAK CENTANG (MULTI-KEY CHECKBOX) */}
                        {draftType === "checkbox" && (
                          <div className="space-y-2">
                            {draftOptions.map((opt) => {
                              const selectedKeys = draftCorrectAnswer
                                .split(",")
                                .map((k) => k.trim().toUpperCase());
                              const isChecked = selectedKeys.includes(opt.key.toUpperCase());
                              return (
                                <div
                                  key={opt.key}
                                  onClick={() => handleToggleCheckboxKey(opt.key)}
                                  className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                    isChecked
                                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                                        isChecked
                                          ? "bg-emerald-600 text-white"
                                          : "border-2 border-slate-300 text-slate-500"
                                      }`}
                                    >
                                      {isChecked ? "✓" : opt.key}
                                    </span>
                                    <span className="text-xs">{opt.text}</span>
                                    {opt.image_url && (
                                      <img
                                        src={opt.image_url}
                                        alt=""
                                        className="h-10 w-10 object-contain rounded border bg-white p-0.5 ml-2"
                                      />
                                    )}
                                  </div>
                                  {isChecked && (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                      <FontAwesomeIcon icon={faCheckDouble} />
                                      <span>Kunci Benar</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 3. KUNCI BENAR / SALAH */}
                        {draftType === "true_false" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div
                              onClick={() => setDraftCorrectAnswer("B")}
                              className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                draftCorrectAnswer === "B"
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <span>B (Benar)</span>
                              {draftCorrectAnswer === "B" && (
                                <FontAwesomeIcon icon={faCheck} className="text-emerald-600 text-xs" />
                              )}
                            </div>
                            <div
                              onClick={() => setDraftCorrectAnswer("S")}
                              className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                draftCorrectAnswer === "S"
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <span>S (Salah)</span>
                              {draftCorrectAnswer === "S" && (
                                <FontAwesomeIcon icon={faCheck} className="text-emerald-600 text-xs" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* 4. KUNCI MENJODOHKAN (MATCHING) */}
                        {draftType === "matching" && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-emerald-800">
                              Pasangan Menjodohkan yang Dianggap Benar:
                            </p>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                              {draftOptions.map((opt, mIdx) => (
                                <div key={mIdx} className="p-2.5 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-800">
                                    {mIdx + 1}. {opt.text}
                                  </span>
                                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                    <span>&rarr;</span>
                                    <span>{opt.match}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. KUNCI JAWABAN SINGKAT */}
                        {draftType === "short_answer" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">
                              Kunci Jawaban Teks yang Benar:
                            </label>
                            <input
                              type="text"
                              value={draftCorrectAnswer}
                              onChange={(e) => setDraftCorrectAnswer(e.target.value)}
                              placeholder="Ketik kata/frasa kunci yang dianggap benar"
                              className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                            />
                            <p className="text-[10px] text-slate-500">
                              *Jawaban siswa akan dicocokkan secara otomatis dengan teks kunci ini.
                            </p>
                          </div>
                        )}

                        {/* 6. RUBRIK PARAGRAF / ESAI */}
                        {draftType === "paragraph" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">
                              Panduan Rubrik Penilaian Jawaban Esai:
                            </label>
                            <textarea
                              rows={3}
                              value={draftCorrectAnswer}
                              onChange={(e) => setDraftCorrectAnswer(e.target.value)}
                              placeholder="Panduan koreksi untuk guru / pemeriksa (kriteria nilai penuh, parsial, dll)..."
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        )}

                        {/* Pembahasan Soal */}
                        <div className="pt-2">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            Masukan Jawaban / Pembahasan:
                          </label>
                          <textarea
                            rows={2}
                            value={draftExplanation}
                            onChange={(e) => setDraftExplanation(e.target.value)}
                            placeholder="Tuliskan catatan pembahasan atau penjelasan untuk soal ini..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>

                        {/* Tombol Selesai Mode Kunci Jawaban */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAnswerKeyMode(false);
                              handleSaveActiveQuestion(false);
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Selesai &amp; Kembali ke Soal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ----------------------------------------------------------- */
                  /* B. JIKA KARTU TIDAK AKTIF (TAMPILAN RINGKAS / PRATINJAU)    */
                  /* ----------------------------------------------------------- */
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        {!previewMode && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 pr-1.5 border-r border-slate-200 shrink-0 mt-0.5"
                          >
                            <span
                              onMouseDown={() => setDragHandleQuestionId(q.id)}
                              onMouseUp={() => setDragHandleQuestionId(null)}
                              className="w-6 h-7 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-grab active:cursor-grabbing transition"
                              title="Seret untuk memindahkan urutan soal"
                            >
                              <FontAwesomeIcon icon={faGripVertical} className="text-[11px]" />
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={qIdx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderQuestions(qIdx, qIdx - 1);
                                }}
                                className="w-5 h-3.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[8px] transition cursor-pointer"
                                title="Pindahkan soal ke atas"
                              >
                                <FontAwesomeIcon icon={faChevronUp} />
                              </button>
                              <button
                                type="button"
                                disabled={qIdx === questions.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderQuestions(qIdx, qIdx + 1);
                                }}
                                className="w-5 h-3.5 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-500 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[8px] transition cursor-pointer"
                                title="Pindahkan soal ke bawah"
                              >
                                <FontAwesomeIcon icon={faChevronDown} />
                              </button>
                            </div>
                          </div>
                        )}
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {q.question_number}
                        </span>
                        <div className="space-y-2 flex-1">
                          <div className="text-slate-900 font-semibold text-sm leading-relaxed whitespace-pre-line">
                            {q.content}
                          </div>
                          {q.image_url && (
                            <img
                              src={q.image_url}
                              alt={`Gambar Soal #${q.question_number}`}
                              className="max-h-52 rounded-xl border border-slate-200 object-contain bg-slate-50 p-1"
                            />
                          )}
                        </div>
                      </div>

                      {/* Badge Jenis, Poin, & Tombol Pengaturan di Pojok Kanan Atas */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {/* Badge Kunci Urutan */}
                        {Boolean(q.lock_order) && (
                          <span
                            className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                            title="Urutan nomor soal ini dikunci (tidak diacak saat ujian)"
                          >
                            <FontAwesomeIcon icon={faLock} className="text-[9px]" />
                            <span>Terkunci</span>
                          </span>
                        )}

                        {/* Badge Opsi Tetap */}
                        {q.randomize_options_mode === "disabled" && (
                          <span
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                            title="Pilihan jawaban soal ini tidak diacak"
                          >
                            <FontAwesomeIcon icon={faLock} className="text-[9px]" />
                            <span>Opsi Tetap</span>
                          </span>
                        )}

                        {/* Badge Kesulitan */}
                        {q.difficulty && q.difficulty !== "sedang" && (
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                              q.difficulty === "mudah"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : q.difficulty === "sukar"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : q.difficulty === "hots"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {q.difficulty.toUpperCase()}
                          </span>
                        )}

                        {/* Badge Topik */}
                        {q.topic && (
                          <span
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold flex items-center gap-1 max-w-[120px] truncate"
                            title={`Topik: ${q.topic}`}
                          >
                            <FontAwesomeIcon icon={faTag} className="text-[8px]" />
                            <span className="truncate">{q.topic}</span>
                          </span>
                        )}

                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                            QUESTION_TYPES.find((t) => t.id === q.question_type)?.badgeColor ||
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {QUESTION_TYPES.find((t) => t.id === q.question_type)?.label ||
                            "Pilihan Ganda"}
                        </span>

                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {q.points || 1} poin
                        </span>

                        {!previewMode && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenSettingsModal(q, e)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="Buka pengaturan butir soal ini (Kunci urutan, acak opsi, kesulitan, topik)"
                          >
                            <FontAwesomeIcon icon={faSliders} className="text-slate-500 hover:text-blue-600" />
                            <span>Atur Soal</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* RENDER PILIHAN JAWABAN */}
                    {(q.question_type === "multiple_choice" ||
                      q.question_type === "checkbox" ||
                      !q.question_type) && (
                      <div className="space-y-1.5 pl-10">
                        {(q.options || []).map((opt: any) => {
                          const isCheckbox = q.question_type === "checkbox";
                          const keys = (q.correct_answer || "")
                            .split(",")
                            .map((k: string) => k.trim().toUpperCase());
                          const isCorrect = isCheckbox
                            ? keys.includes(String(opt.key).toUpperCase())
                            : String(opt.key).toUpperCase() ===
                              String(q.correct_answer).toUpperCase();

                          return (
                            <div
                              key={opt.key}
                              className={`p-2 rounded-xl text-xs flex items-center gap-2.5 transition ${
                                isCorrect
                                  ? "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200/60"
                                  : "text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                  isCheckbox ? "rounded-md" : "rounded-full"
                                } border ${
                                  isCorrect
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-slate-300 bg-slate-50 text-slate-500"
                                }`}
                              >
                                {isCorrect ? "✓" : opt.key}
                              </span>
                              <span>{opt.text}</span>
                              {opt.image_url && (
                                <img
                                  src={opt.image_url}
                                  alt=""
                                  className="h-10 w-10 rounded-lg object-contain border bg-white p-0.5 ml-2"
                                />
                              )}
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-auto">
                                  Kunci Benar
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Benar / Salah */}
                    {q.question_type === "true_false" && (
                      <div className="pl-10 flex items-center gap-3 text-xs">
                        <span
                          className={`px-3 py-1.5 rounded-xl border font-bold ${
                            q.correct_answer === "B"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          Benar {q.correct_answer === "B" && "✓"}
                        </span>
                        <span
                          className={`px-3 py-1.5 rounded-xl border font-bold ${
                            q.correct_answer === "S"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          Salah {q.correct_answer === "S" && "✓"}
                        </span>
                      </div>
                    )}

                    {/* Menjodohkan (Matching) */}
                    {q.question_type === "matching" && (
                      <div className="pl-10 space-y-1.5">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                          {(q.options || []).map((opt: any, mIdx: number) => (
                            <div key={mIdx} className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {mIdx + 1}. {opt.text}
                              </span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                Pasangan: {opt.match}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Jawaban Singkat */}
                    {q.question_type === "short_answer" && (
                      <div className="pl-10 space-y-1">
                        <div className="text-xs text-slate-400 italic">
                          Jawaban teks singkat dari siswa...
                        </div>
                        {q.correct_answer && (
                          <div className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                            Kunci Jawaban: {q.correct_answer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Paragraf / Esai */}
                    {q.question_type === "paragraph" && (
                      <div className="pl-10 space-y-1">
                        <div className="text-xs text-slate-400 italic">
                          Jawaban uraian / esai dari siswa...
                        </div>
                        {q.correct_answer && (
                          <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <b>Rubrik Penilaian:</b> {q.correct_answer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pembahasan Soal jika ada */}
                    {q.explanation && (
                      <div className="ml-10 p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                        <FontAwesomeIcon icon={faLightbulb} className="text-blue-600 mt-0.5 shrink-0" />
                        <span>Pembahasan: {q.explanation}</span>
                      </div>
                    )}

                    {!previewMode && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Klik kartu ini untuk mengedit butir soal secara langsung</span>
                        <span className="font-bold text-blue-600 hover:text-blue-800">Edit Soal &rarr;</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Tombol Tambah Soal di Bawah Daftar Butir Soal */}
        {!previewMode && questions.length > 0 && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleAddNewQuestion}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 border-2 border-dashed border-blue-300 hover:border-blue-500 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>+ Tambah Butir Soal Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 4. FLOATING ACTION TOOLBAR TETAP DI POJOK KANAN BAWAH (BEBAS HALANG)  */}
      {/* ===================================================================== */}
      {!previewMode && (
        <div className="fixed bottom-6 right-5 z-40 flex flex-col items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-200">
          {/* Tombol Tambah Soal Cepat */}
          <button
            type="button"
            onClick={handleAddNewQuestion}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition shadow-md cursor-pointer active:scale-95 group relative"
            aria-label="Tambah Soal Baru"
          >
            <FontAwesomeIcon icon={faPlus} className="text-sm" />
            <span className="absolute right-13 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-md">
              Tambah Soal Baru
            </span>
          </button>

          {/* Tombol Impor Word */}
          <button
            type="button"
            onClick={() => {
              setSelectedDocxFile(null);
              setWordPreviewQuestions([]);
              setShowWordModal(true);
            }}
            className="w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition cursor-pointer group relative"
            aria-label="Impor dari Word"
          >
            <FontAwesomeIcon icon={faFileWord} className="text-sm" />
            <span className="absolute right-13 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-md">
              Impor dari Word
            </span>
          </button>

          <span className="w-6 h-px bg-slate-200 my-0.5" />

          {/* Scroll to Top */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer group relative"
            aria-label="Kembali ke Atas"
          >
            <FontAwesomeIcon icon={faArrowUp} className="text-xs" />
            <span className="absolute right-13 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-md">
              Kembali ke Atas
            </span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL IMPOR WORD (.DOCX) DENGAN TAMPILAN STANDAR CBT               */}
      {/* ===================================================================== */}
      {showWordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <FontAwesomeIcon icon={faFileWord} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Impor Soal dari File Word (.docx)</h3>
                  <p className="text-[11px] text-slate-500">
                    Mengekstrak naskah soal, opsi jawaban, dan kunci jawaban langsung ke dalam bank soal ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWordModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-medium text-slate-700">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedDocxFile(file);
                      setWordPreviewQuestions([]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FontAwesomeIcon icon={faFileWord} className="text-3xl text-blue-600 mb-2" />
                <div className="text-sm font-bold text-slate-800">
                  {selectedDocxFile ? selectedDocxFile.name : "Klik atau seret file .docx ke sini"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mendukung dokumen naskah soal standar dengan pilihan A, B, C, D, E beserta gambar yang disisipkan.
                </div>
              </div>

              {selectedDocxFile && wordPreviewQuestions.length === 0 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={parsingWord}
                    onClick={handleParseDocx}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faRotate} className={parsingWord ? "animate-spin" : ""} />
                    <span>{parsingWord ? "Mengekstrak Soal..." : "Ekstraksi Butir Soal"}</span>
                  </button>
                </div>
              )}

              {/* Preview Hasil Parse Word */}
              {wordPreviewQuestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Berhasil Menemukan {wordPreviewQuestions.length} Butir Soal:
                    </span>
                    <span className="text-emerald-600 font-bold">Siap Disimpan</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {wordPreviewQuestions.map((pq: any, pIdx: number) => (
                      <div key={pIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Soal #{pq.question_number || pIdx + 1}</span>
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                            Kunci: {pq.correct_answer || "-"}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{pq.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
              <button
                type="button"
                onClick={() => setShowWordModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              {wordPreviewQuestions.length > 0 && (
                <button
                  type="button"
                  disabled={parsingWord}
                  onClick={handleSaveWordQuestions}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>Tambahkan ke Bank Soal</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. MODAL PENGATURAN BUTIR SOAL (PER-QUESTION SETTINGS)               */}
      {/* ===================================================================== */}
      {showSettingsModal && selectedQuestionForSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-blue-500/20">
                  <FontAwesomeIcon icon={faSliders} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>Pengaturan Butir Soal #{selectedQuestionForSetting.question_number}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Konfigurasi aturan pengacakan, tingkat kesulitan, dan kategori soal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition border border-slate-200 cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* 1. Kunci Urutan Soal (Lock Order) */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <FontAwesomeIcon icon={faLock} className="text-xs" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Kunci Posisi Nomor Soal (Jangan Diacak)
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Soal ini akan tetap berada di nomor #{selectedQuestionForSetting.question_number} dan tidak dipindahkan posisinya, meskipun ujian mengaktifkan fitur Acak Urutan Soal.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settingLockOrder}
                      onChange={(e) => setSettingLockOrder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {settingLockOrder && (
                  <div className="mt-2 text-[10px] text-amber-800 bg-amber-100/70 p-2 rounded-xl font-semibold flex items-center gap-1.5">
                    <span>💡 Sangat direkomendasikan untuk soal wacana / reading comprehension Bahasa Inggris &amp; Indonesia.</span>
                  </div>
                )}
              </div>

              {/* 2. Pengacakan Pilihan Opsi (A/B/C/D/E) */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Pengacakan Pilihan Jawaban (Opsi A/B/C/D/E)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingRandomizeOptions("default")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      settingRandomizeOptions === "default"
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Ikuti Ujian</div>
                    <span className="text-[10px] text-slate-500 mt-1 font-normal">
                      Mengikuti aturan acak pada paket ujian
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingRandomizeOptions("disabled")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      settingRandomizeOptions === "disabled"
                        ? "bg-amber-50/70 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <FontAwesomeIcon icon={faLock} className="text-[10px] text-amber-600" />
                      <span>Kunci Opsi</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-normal">
                      Jangan pernah diacak (misal ada opsi "Semua Benar")
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingRandomizeOptions("enabled")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      settingRandomizeOptions === "enabled"
                        ? "bg-indigo-50/70 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Selalu Acak</div>
                    <span className="text-[10px] text-slate-500 mt-1 font-normal">
                      Pasti diacak untuk semua siswa
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Tingkat Kesulitan */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Tingkat Kesulitan Soal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "mudah", label: "Mudah", color: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20" },
                    { id: "sedang", label: "Sedang", color: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20" },
                    { id: "sukar", label: "Sukar", color: "bg-rose-50 text-rose-800 border-rose-300 ring-rose-500/20" },
                    { id: "hots", label: "HOTS", color: "bg-purple-50 text-purple-800 border-purple-300 ring-purple-500/20" },
                  ].map((lvl) => {
                    const isSelected = settingDifficulty === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSettingDifficulty(lvl.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          isSelected
                            ? `${lvl.color} ring-2 shadow-xs`
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Topik / Capaian Pembelajaran */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Topik / Materi / Capaian Pembelajaran
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FontAwesomeIcon icon={faTag} />
                  </div>
                  <input
                    type="text"
                    value={settingTopic}
                    onChange={(e) => setSettingTopic(e.target.value)}
                    placeholder="Contoh: Reading Comprehension, Logika Digital, Termodinamika"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Label ini membantu kategorisasi soal saat menyusun kisi-kisi atau analisis butir soal.
                </p>
              </div>

              {/* 5. Tata Letak Opsi Pilihan Jawaban */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Tata Letak Pilihan Jawaban pada Siswa
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingLayout("vertical")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      settingLayout === "vertical"
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Vertikal (1 Kolom)</div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Standar ke bawah (cocok untuk opsi kalimat panjang)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingLayout("grid")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      settingLayout === "grid"
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs">Grid (2 Kolom)</div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Berjajar berdampingan (cocok untuk angka / opsi singkat)
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuestionSettings}
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faFloppyDisk} />
                <span>{savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
