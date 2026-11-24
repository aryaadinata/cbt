"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDoorOpen,
  faPlus,
  faPen,
  faTrash,
  faRotate,
  faUsers,
  faArrowLeft,
  faXmark,
  faCheck,
  faSearch,
  faLayerGroup,
  faUserGraduate,
  faSchool,
  faCircleCheck,
  faTriangleExclamation,
  faSliders,
  faBuilding,
  faChevronRight,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";

export default function RuangUjianPage() {
  const router = useRouter();
  const { user, token, isAdminOrStaff, isLoading } = useAuth();

  // State Daftar Ruangan
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State Modal Tambah Ruangan
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState<number>(36);
  const [newRoomLocation, setNewRoomLocation] = useState("");
  const [submittingRoom, setSubmittingRoom] = useState(false);

  // State Modal Edit Ruangan
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomCapacity, setEditRoomCapacity] = useState<number>(36);
  const [editRoomLocation, setEditRoomLocation] = useState("");
  const [updatingRoom, setUpdatingRoom] = useState(false);

  // State Modal Plotting / Alokasi Siswa per Ruang
  const [showPlottingModal, setShowPlottingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [loadingRoomStudents, setLoadingRoomStudents] = useState(false);
  const [plottingTab, setPlottingTab] = useState<"current" | "add">("current");

  // State Tambah Siswa ke Ruangan
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("Semua Sesi");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [onlyUnallocated, setOnlyUnallocated] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [batchAllocating, setBatchAllocating] = useState(false);

  // Redirect jika belum login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // 1. Fetch Daftar Ruangan Ujian
  const fetchRooms = async () => {
    if (!token) return;
    try {
      setLoadingRooms(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (e) {
      console.error("Gagal memuat data ruangan:", e);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [token]);

  // 2. Fetch Siswa di Ruangan Terpilih
  const fetchRoomStudents = async (roomId: number) => {
    if (!token) return;
    try {
      setLoadingRoomStudents(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/rooms/${roomId}/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRoomStudents(data.students || []);
        if (data.room) {
          setSelectedRoom((prev: any) => ({
            ...prev,
            ...data.room,
            allocated_count: data.total_students,
            remaining_seats: data.remaining_seats,
          }));
        }
      }
    } catch (e) {
      console.error("Gagal memuat siswa di ruangan:", e);
    } finally {
      setLoadingRoomStudents(false);
    }
  };

  // 3. Fetch Siswa Tersedia untuk Diplot
  const fetchAvailableStudents = async (className?: string) => {
    if (!token) return;
    try {
      setLoadingAvailable(true);
      const targetClass = className !== undefined ? className : selectedClass;
      const params = new URLSearchParams();
      if (targetClass && targetClass !== "all") {
        params.append("class_name", targetClass);
      }
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/available-students?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const incomingStudents = data.students || [];
        const validClasses = (data.classes || []).filter(
          (c: any) => c.class_name && c.class_name !== "-"
        );
        setClassesList(validClasses);

        // Jika baru pertama kali buka atau targetClass kosong, default ke kelas pertama yang ada siswanya
        if (!targetClass && validClasses.length > 0) {
          const firstWithStudents =
            validClasses.find((c: any) => c.total_students > 0) || validClasses[0];
          if (firstWithStudents?.class_name) {
            setSelectedClass(firstWithStudents.class_name);
            setAvailableStudents(
              incomingStudents.filter(
                (s: any) =>
                  s.class_name?.trim().toLowerCase() ===
                  firstWithStudents.class_name.trim().toLowerCase()
              )
            );
            return;
          }
        }

        setAvailableStudents(incomingStudents);
      }
    } catch (e) {
      console.error("Gagal memuat data siswa tersedia:", e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  // Handler Ganti Kelas di Tab Tambah Siswa
  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    setSelectedStudentIds([]);
    fetchAvailableStudents(newClass);
  };

  // Buka Modal Plotting untuk Ruangan Tertentu
  const handleOpenPlotting = (room: any) => {
    setSelectedRoom(room);
    setPlottingTab("current");
    setSelectedStudentIds([]);
    setShowPlottingModal(true);
    fetchRoomStudents(room.id);
    
    // Gunakan kelas yang aktif atau kelas pertama yang memiliki siswa
    const initialClass =
      selectedClass && selectedClass !== "all"
        ? selectedClass
        : classesList.find((c: any) => c.total_students > 0)?.class_name || "";

    if (initialClass) {
      setSelectedClass(initialClass);
      fetchAvailableStudents(initialClass);
    } else {
      fetchAvailableStudents();
    }
  };

  // Handler Tambah Ruangan Baru
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setSubmittingRoom(true);
      const res = await fetch("/api/cbt-backend/api/cbt/schedule/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          capacity: Number(newRoomCapacity) || 36,
          location: newRoomLocation.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setNewRoomName("");
        setNewRoomCapacity(36);
        setNewRoomLocation("");
        fetchRooms();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal membuat ruangan.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setSubmittingRoom(false);
    }
  };

  // Handler Edit Ruangan
  const handleOpenEdit = (room: any) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomCapacity(room.capacity || 36);
    setEditRoomLocation(room.location || "");
    setShowEditModal(true);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId || !editRoomName.trim()) return;

    try {
      setUpdatingRoom(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/rooms/${editingRoomId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editRoomName.trim(),
            capacity: Number(editRoomCapacity) || 36,
            location: editRoomLocation.trim() || null,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        setEditingRoomId(null);
        fetchRooms();
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal memperbarui ruangan.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setUpdatingRoom(false);
    }
  };

  // Handler Hapus Ruangan
  const handleDeleteRoom = (roomId: number, roomName: string) => {
    Swal.fire({
      title: "Hapus Ruang Ujian?",
      text: `Apakah Anda yakin ingin menghapus "${roomName}"? Seluruh alokasi siswa di ruangan ini juga akan dihapus.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Hapus Ruangan",
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
          const res = await fetch(
            `/api/cbt-backend/api/cbt/schedule/rooms/${roomId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            fetchRooms();
            Swal.fire({
              icon: "success",
              title: "Ruangan Dihapus",
              text: data.message,
              timer: 2000,
              showConfirmButton: false,
            });
          } else {
            Swal.fire("Gagal", data.detail || "Gagal menghapus ruangan.", "error");
          }
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "Gagal menghapus ruangan.", "error");
        }
      }
    });
  };

  // Handler Masukkan Siswa Terpilih (Checklist) ke Ruangan
  const handleAllocateSelectedStudents = async () => {
    if (!selectedRoom || selectedStudentIds.length === 0) return;

    const remainingSeats =
      selectedRoom.capacity - (selectedRoom.allocated_count || roomStudents.length);
    if (selectedStudentIds.length > remainingSeats) {
      Swal.fire({
        icon: "warning",
        title: "Kapasitas Melebihi Batas",
        text: `Anda memilih ${selectedStudentIds.length} siswa, namun sisa kursi di ${selectedRoom.name} hanya ${remainingSeats} kursi. Harap kurangi pilihan siswa.`,
      });
      return;
    }

    try {
      setAllocating(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/rooms/${selectedRoom.id}/allocate-students`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_ids: selectedStudentIds,
            session_name: selectedSession,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedStudentIds([]);
        fetchRoomStudents(selectedRoom.id);
        fetchAvailableStudents(selectedClass);
        fetchRooms();
        setPlottingTab("current");
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal menambahkan siswa.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setAllocating(false);
    }
  };

  // Handler Masukkan 1 Rombel Penuh Sekaligus
  const handleAllocateBatchClass = async () => {
    if (!selectedRoom || !selectedClass || selectedClass === "all") return;

    try {
      setBatchAllocating(true);
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/rooms/${selectedRoom.id}/allocate-class`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class_name: selectedClass,
            session_name: selectedSession,
            only_unallocated: onlyUnallocated,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        fetchRoomStudents(selectedRoom.id);
        fetchAvailableStudents(selectedClass);
        fetchRooms();
        setPlottingTab("current");
        Swal.fire({
          icon: "success",
          title: "Siswa Kelas Berhasil Dimasukkan!",
          text: data.message,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", data.detail || "Gagal memasukkan kelas.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal menghubungi server.", "error");
    } finally {
      setBatchAllocating(false);
    }
  };

  // Handler Keluarkan 1 Siswa dari Ruangan
  const handleRemoveStudent = async (allocationId: number, studentName: string) => {
    if (!selectedRoom) return;

    try {
      const res = await fetch(
        `/api/cbt-backend/api/cbt/schedule/rooms/${selectedRoom.id}/students/${allocationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        fetchRoomStudents(selectedRoom.id);
        fetchAvailableStudents(selectedClass);
        fetchRooms();
      }
    } catch (err) {
      console.error("Gagal mengeluarkan siswa:", err);
    }
  };

  // Handler Kosongkan Ruangan
  const handleClearRoom = () => {
    if (!selectedRoom) return;

    Swal.fire({
      title: "Kosongkan Ruangan?",
      text: `Apakah Anda yakin ingin mengeluarkan seluruh siswa (${roomStudents.length} siswa) dari ${selectedRoom.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Kosongkan",
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
          const res = await fetch(
            `/api/cbt-backend/api/cbt/schedule/rooms/${selectedRoom.id}/clear-students`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            fetchRoomStudents(selectedRoom.id);
            fetchAvailableStudents(selectedClass);
            fetchRooms();
            Swal.fire({
              icon: "success",
              title: "Ruangan Dikosongkan",
              text: data.message,
              timer: 2000,
              showConfirmButton: false,
            });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Filter Ruangan di Tabel
  const filteredRooms = rooms.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.allocated_classes || []).some((c: string) =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Filter Siswa Tersedia di Tab Tambah Siswa
  const filteredAvailableStudents = availableStudents.filter((s) => {
    const matchClass =
      !selectedClass ||
      selectedClass === "all" ||
      s.class_name?.trim().toLowerCase() === selectedClass.trim().toLowerCase();
    const matchSearch =
      !studentSearch.trim() ||
      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nisn?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchUnallocated = !onlyUnallocated || !s.allocation_id;
    return matchClass && matchSearch && matchUnallocated;
  });

  // Statistik Ringkasan Ruangan
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalAllocated = rooms.reduce((acc, r) => acc + (r.allocated_count || 0), 0);
  const totalRemaining = Math.max(0, totalCapacity - totalAllocated);

  return (
    <div className="flex flex-col gap-4 min-w-0 w-full animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN RUANG UJIAN */}
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
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Ruang Ujian &amp; Alokasi Peserta
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Master Ruangan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola ruangan ujian dan atur pembagian rombel serta siswa yang mengisi setiap ruangan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setNewRoomName("");
              setNewRoomCapacity(36);
              setNewRoomLocation("");
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>Tambah Ruangan</span>
          </button>

          <button
            type="button"
            onClick={fetchRooms}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Segarkan Data Ruangan"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`text-xs ${loadingRooms ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* BANNER STATUS SIAGA KETIKA TER-RESET */}
      {totalAllocated === 0 && !loadingRooms && totalRooms > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 text-lg mt-0.5 sm:mt-0">
              <FontAwesomeIcon icon={faCircleCheck} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Status Siaga (Standby)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Alokasi Ruang Ujian Bersih
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Alokasi peserta ujian sebelumnya telah selesai dan diarsipkan dengan aman. Seluruh kapasitas ruangan saat ini kosong dan siap diisi pembagian rombel &amp; siswa untuk periode ujian berikutnya.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATS RINGKASAN KAPASITAS RUANGAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">
            <FontAwesomeIcon icon={faDoorOpen} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Ruangan
            </span>
            <span className="text-lg font-black text-slate-900 leading-tight block">
              {totalRooms} Ruang
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-black">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Kursi
            </span>
            <span className="text-lg font-black text-indigo-900 leading-tight block">
              {totalCapacity} Kursi
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-black">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Siswa Terplot
            </span>
            <span className="text-lg font-black text-emerald-700 leading-tight block">
              {totalAllocated} Siswa
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-black">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Sisa Kursi Kosong
            </span>
            <span className="text-lg font-black text-amber-700 leading-tight block">
              {totalRemaining} Kursi
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABEL DAFTAR RUANGAN UJIAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Toolbar Pencarian */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama ruangan, gedung, atau kelas..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>

          <span className="text-xs text-slate-400 font-semibold self-center">
            Menampilkan {filteredRooms.length} dari {rooms.length} Ruangan
          </span>
        </div>

        {/* Tabel Data */}
        {loadingRooms ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Memuat daftar ruangan...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faDoorOpen} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery
                ? "Tidak ada ruangan yang cocok dengan pencarian"
                : "Belum Ada Ruang Ujian"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "Gunakan kata kunci pencarian yang lain."
                : "Tambahkan ruangan ujian pertama Anda dengan menekan tombol Tambah Ruangan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-black text-slate-600 tracking-wider uppercase">
                  <th className="py-3 px-4 w-12 text-center">NO</th>
                  <th className="py-3 px-4">NAMA RUANGAN</th>
                  <th className="py-3 px-4">LOKASI / GEDUNG</th>
                  <th className="py-3 px-4 text-center">KAPASITAS</th>
                  <th className="py-3 px-4 w-48">KETERISIAN KURSI</th>
                  <th className="py-3 px-4">KELAS YANG MENGISI</th>
                  <th className="py-3 px-4 text-center">ATUR SISWA</th>
                  <th className="py-3 px-4 text-center w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRooms.map((room, idx) => {
                  const percent = Math.min(
                    100,
                    Math.round(((room.allocated_count || 0) / (room.capacity || 1)) * 100)
                  );
                  const isFull = room.allocated_count >= room.capacity;

                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* Nama Ruangan */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {room.name}
                        </div>
                      </td>

                      {/* Lokasi / Gedung */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {room.location ? (
                          <span className="flex items-center gap-1.5">
                            <FontAwesomeIcon
                              icon={faBuilding}
                              className="text-slate-400 text-[10px]"
                            />
                            <span>{room.location}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Kapasitas */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {room.capacity} Kursi
                        </span>
                      </td>

                      {/* Progress Keterisian */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-700">
                              {room.allocated_count || 0} / {room.capacity}
                            </span>
                            <span
                              className={
                                isFull
                                  ? "text-rose-600 font-extrabold"
                                  : "text-slate-500"
                              }
                            >
                              {isFull ? "Penuh" : `Sisa ${room.remaining_seats}`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFull
                                  ? "bg-rose-500"
                                  : percent > 75
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Kelas yang Mengisi */}
                      <td className="py-3.5 px-4">
                        {room.allocated_classes &&
                        room.allocated_classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {room.allocated_classes.map((c: string) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Belum Ada Siswa
                          </span>
                        )}
                      </td>

                      {/* Tombol Atur Siswa & Kelas */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPlotting(room)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200/80 transition cursor-pointer shadow-2xs active:scale-95"
                          title="Tentukan kelas dan siswa yang mengisi ruangan ini"
                        >
                          <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                          <span>Atur Siswa ({room.allocated_count || 0})</span>
                        </button>
                      </td>

                      {/* Aksi: Edit & Hapus (Ikon Saja) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(room)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition cursor-pointer shadow-2xs"
                            title="Edit Ruangan"
                          >
                            <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id, room.name)}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 flex items-center justify-center border border-rose-200/70 transition cursor-pointer shadow-2xs"
                            title="Hapus Ruangan"
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

      {/* ============================================================== */}
      {/* MODAL 1: TAMBAH RUANGAN BARU */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tambah Ruang Ujian Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan nama ruangan dan kapasitas kursi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Ruangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Contoh: Lab Komputer 1 / Ruang 01"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kapasitas Kursi / Peserta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={200}
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Standar CBT: 36 kursi / PC per ruangan
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lokasi / Gedung (Opsional)
                </label>
                <input
                  type="text"
                  value={newRoomLocation}
                  onChange={(e) => setNewRoomLocation(e.target.value)}
                  placeholder="Contoh: Gedung A Lantai 2"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRoom || !newRoomName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingRoom ? "Menyimpan..." : "Simpan Ruangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT RUANGAN */}
      {/* ============================================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                  <FontAwesomeIcon icon={faPen} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Edit Ruang Ujian
                  </h3>
                  <p className="text-xs text-slate-500">Perbarui data ruangan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Ruangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kapasitas Kursi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editRoomCapacity}
                  onChange={(e) =>
                    setEditRoomCapacity(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lokasi / Gedung
                </label>
                <input
                  type="text"
                  value={editRoomLocation}
                  onChange={(e) => setEditRoomLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingRoom || !editRoomName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingRoom ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ATUR SISWA & KELAS PER RUANGAN (PLOTTING PESERTA) */}
      {/* ============================================================== */}
      {showPlottingModal && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black shrink-0">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Plotting Siswa &bull; {selectedRoom.name}
                    </h3>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                      Kapasitas: {selectedRoom.capacity} Kursi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Terisi: <b>{roomStudents.length} Siswa</b> &bull; Sisa Kursi:{" "}
                    <b className="text-emerald-700">
                      {Math.max(0, selectedRoom.capacity - roomStudents.length)} Kursi Kosong
                    </b>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlottingModal(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="shrink-0 px-4 sm:px-5 pt-3 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlottingTab("current")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    plottingTab === "current"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FontAwesomeIcon icon={faUsers} className="text-[11px]" />
                  <span>Siswa di Ruangan Ini ({roomStudents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlottingTab("add")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    plottingTab === "add"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[11px]" />
                  <span>Tambah Kelas / Siswa Baru</span>
                </button>
              </div>

              {plottingTab === "current" && roomStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRoom}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60 transition cursor-pointer mb-2"
                >
                  Kosongkan Ruangan
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* ======================================================== */}
              {/* TAB 1: SISWA SAAT INI DI RUANGAN */}
              {/* ======================================================== */}
              {plottingTab === "current" && (
                <div>
                  {loadingRoomStudents ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      Memuat daftar siswa ruangan...
                    </div>
                  ) : roomStudents.length === 0 ? (
                    <div className="p-10 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 mx-auto flex items-center justify-center text-lg">
                        <FontAwesomeIcon icon={faUsers} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">
                        Ruangan Ini Masih Kosong
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Belum ada siswa yang dialokasikan ke {selectedRoom.name}. Klik tombol di bawah untuk memasukkan siswa atau 1 rombel sekaligus.
                      </p>
                      <button
                        type="button"
                        onClick={() => setPlottingTab("add")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-xs" />
                        <span>Tambah Siswa Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-600 tracking-wider uppercase">
                            <th className="py-2.5 px-3 text-center w-16">KURSI</th>
                            <th className="py-2.5 px-3">NAMA SISWA</th>
                            <th className="py-2.5 px-3">KELAS</th>
                            <th className="py-2.5 px-3">NISN / NIS</th>
                            <th className="py-2.5 px-3 text-center">SESI</th>
                            <th className="py-2.5 px-3 text-center w-16">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {roomStudents.map((stu) => (
                            <tr key={stu.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold rounded text-[11px]">
                                  {stu.seat_number ? String(stu.seat_number).padStart(2, "0") : "-"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">
                                  {stu.student_name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {stu.class_name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                {stu.nisn || stu.nis || "-"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600">
                                {stu.session_name || "Sesi 1"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(stu.id, stu.student_name)}
                                  className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 flex items-center justify-center transition cursor-pointer mx-auto"
                                  title="Keluarkan siswa dari ruangan ini"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: TAMBAH KELAS & SISWA KE RUANGAN */}
              {/* ======================================================== */}
              {plottingTab === "add" && (
                <div className="space-y-4">
                  {/* KONTROL UTAMA: PILIH KELAS & FILTER */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/90 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-5 bg-blue-600 rounded-full inline-block" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Pilih Kelas / Rombel Siswa
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-600 font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          Sisa Kapasitas:{" "}
                          <b className="text-blue-700 font-bold">
                            {Math.max(0, selectedRoom.capacity - roomStudents.length)} Kursi
                          </b>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Dropdown Kelas Utama */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Pilih Kelas:
                        </label>
                        <select
                          value={selectedClass}
                          onChange={(e) => handleClassChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-2xs"
                        >
                          <option value="all">
                            -- Tampilkan Semua Kelas ({classesList.reduce((acc, c) => acc + (c.total_students || 0), 0)} Siswa) --
                          </option>
                          {classesList.map((c) => (
                            <option key={c.class_name} value={c.class_name}>
                              Kelas {c.class_name} ({c.total_students} Siswa) &bull; {c.allocated_count || 0} Terplot
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown Sesi Ujian */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Sesi Ujian:
                        </label>
                        <select
                          value={selectedSession}
                          onChange={(e) => setSelectedSession(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-2xs"
                        >
                          <option value="Semua Sesi">Semua Sesi (Seluruh Sesi Ujian)</option>
                          <option value="Sesi 1">Sesi 1</option>
                          <option value="Sesi 2">Sesi 2</option>
                          <option value="Sesi 3">Sesi 3</option>
                        </select>
                      </div>

                      {/* Filter Unallocated */}
                      <div className="sm:col-span-3 flex sm:justify-end pt-2 sm:pt-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer select-none bg-white/70 px-3 py-2 rounded-xl border border-slate-200/80 hover:bg-white transition w-full sm:w-auto">
                          <input
                            type="checkbox"
                            checked={onlyUnallocated}
                            onChange={(e) => setOnlyUnallocated(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-[11px]">Hanya belum ada ruang</span>
                        </label>
                      </div>
                    </div>

                    {/* AKSI CEPAT 1 ROMBEL (JIKA MEMILIH KELAS SPESIFIK) */}
                    {selectedClass && selectedClass !== "all" && (
                      <div className="pt-2 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="text-[11px] text-slate-600">
                          Ingin memasukkan seluruh siswa kelas {selectedClass} sekaligus?
                        </div>
                        <button
                          type="button"
                          disabled={
                            batchAllocating ||
                            selectedRoom.capacity - roomStudents.length <= 0 ||
                            filteredAvailableStudents.length === 0
                          }
                          onClick={handleAllocateBatchClass}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          <span>
                            {batchAllocating
                              ? "Memproses..."
                              : `Masukkan Seluruh Siswa Kelas ${selectedClass} (${filteredAvailableStudents.length} Siswa)`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BAGIAN TABEL DAFTAR SISWA KELAS */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-5 bg-indigo-600 rounded-full inline-block" />
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            {selectedClass === "all"
                              ? "Daftar Seluruh Siswa"
                              : `Daftar Siswa Kelas ${selectedClass}`}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {selectedClass === "all"
                              ? "Pilih satu atau beberapa siswa untuk dimasukkan ke ruangan ini"
                              : `Pilih siswa dari Kelas ${selectedClass} yang ingin dimasukkan secara manual`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                        Terpilih: <b className="text-indigo-600">{selectedStudentIds.length} Siswa</b>
                      </span>
                    </div>

                    {/* Input Cari Siswa & Tombol Aksi */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder={`Cari nama siswa atau NISN di ${selectedClass === "all" ? "semua kelas" : `kelas ${selectedClass}`}...`}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                        />
                      </div>

                      <div className="sm:col-span-6 flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const ids = filteredAvailableStudents
                                .filter(
                                  (s) =>
                                    s.room_id !== selectedRoom.id &&
                                    s.room_name !== selectedRoom.name
                                )
                                .map((s) => s.id);
                              setSelectedStudentIds(ids);
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            Pilih Semua ({filteredAvailableStudents.length})
                          </button>
                          <span className="text-slate-300">&bull;</span>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds([])}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={
                            allocating ||
                            selectedStudentIds.length === 0 ||
                            selectedRoom.capacity - roomStudents.length <= 0
                          }
                          onClick={handleAllocateSelectedStudents}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-xs" />
                          <span>
                            {allocating
                              ? "Memproses..."
                              : `Masukkan Terpilih (${selectedStudentIds.length})`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Tabel Siswa */}
                    <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl shadow-2xs">
                      {loadingAvailable ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          <FontAwesomeIcon
                            icon={faRotate}
                            className="animate-spin text-base mb-2 text-indigo-500 block mx-auto"
                          />
                          Memuat data siswa kelas {selectedClass}...
                        </div>
                      ) : filteredAvailableStudents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          {selectedClass !== "all"
                            ? `Tidak ada siswa di Kelas ${selectedClass} yang sesuai filter.`
                            : "Tidak ada siswa yang sesuai filter."}
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider sticky top-0 z-10">
                              <th className="py-2.5 px-3 w-10 text-center">PILIH</th>
                              <th className="py-2.5 px-3">NAMA SISWA</th>
                              <th className="py-2.5 px-3">KELAS</th>
                              <th className="py-2.5 px-3">NISN / NIS</th>
                              <th className="py-2.5 px-3">STATUS RUANGAN SAAT INI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredAvailableStudents.map((stu) => {
                              const isChecked = selectedStudentIds.includes(stu.id);
                              const isAlreadyInThisRoom =
                                stu.room_id === selectedRoom.id ||
                                stu.room_name === selectedRoom.name;

                              return (
                                <tr
                                  key={stu.id}
                                  onClick={() => {
                                    if (isAlreadyInThisRoom) return;
                                    if (isChecked) {
                                      setSelectedStudentIds((prev) =>
                                        prev.filter((id) => id !== stu.id)
                                      );
                                    } else {
                                      setSelectedStudentIds((prev) => [...prev, stu.id]);
                                    }
                                  }}
                                  className={`transition cursor-pointer ${
                                    isAlreadyInThisRoom
                                      ? "bg-slate-50 opacity-60 cursor-not-allowed"
                                      : isChecked
                                      ? "bg-blue-50/70"
                                      : "hover:bg-slate-50/70"
                                  }`}
                                >
                                  <td
                                    className="py-2 px-3 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isAlreadyInThisRoom}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStudentIds((prev) => [
                                            ...prev,
                                            stu.id,
                                          ]);
                                        } else {
                                          setSelectedStudentIds((prev) =>
                                            prev.filter((id) => id !== stu.id)
                                          );
                                        }
                                      }}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {stu.name}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {stu.class_name}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 text-[11px]">
                                    {stu.nisn || stu.nis || "-"}
                                  </td>
                                  <td className="py-2 px-3">
                                    {isAlreadyInThisRoom ? (
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        ✓ Sudah di ruangan ini (Kursi {stu.seat_number})
                                      </span>
                                    ) : stu.room_name ? (
                                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        Di {stu.room_name} (Kursi {stu.seat_number})
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Belum Ada Ruangan
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Kapasitas {selectedRoom.name}: <b>{selectedRoom.capacity} Kursi</b> &bull; Terisi:{" "}
                <b>{roomStudents.length} Siswa</b>
              </span>

              <button
                type="button"
                onClick={() => setShowPlottingModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
