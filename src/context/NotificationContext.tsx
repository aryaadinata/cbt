"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

export interface NotificationItem {
  id: number;
  user_id?: number | null;
  teacher_id?: number | null;
  teacher_name?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: number | boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, token, isTeacher } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const hasPromptedRef = useRef<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch("/api/cbt-backend/api/cbt/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const notifs: NotificationItem[] = data.notifications || [];
        const unread = Number(data.unread_count || 0);
        setNotifications(notifs);
        setUnreadCount(unread);

        // One-time prompt per session for teacher when there are unread assignments
        if (
          isTeacher &&
          unread > 0 &&
          !hasPromptedRef.current &&
          typeof window !== "undefined" &&
          !sessionStorage.getItem("cbt_notif_prompt_shown")
        ) {
          hasPromptedRef.current = true;
          sessionStorage.setItem("cbt_notif_prompt_shown", "true");

          setTimeout(() => {
            Swal.fire({
              title: "Tugas Pembuatan Soal Baru",
              html: `
                <div class="text-left space-y-2 text-xs text-slate-600">
                  <p>Halo <b>${user.name || "Bapak/Ibu Guru"}</b>,</p>
                  <p>Anda memiliki <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">${unread} penugasan naskah soal</span> dari Panitia Ujian Sekolah yang belum dibuka.</p>
                  <p class="text-[11px] text-slate-500">Silakan buka menu Bank Soal untuk mulai menyusun butir soal atau mengimpor dokumen Word (.docx).</p>
                </div>
              `,
              icon: "info",
              showCancelButton: true,
              confirmButtonText: "Buka Bank Soal Sekarang",
              cancelButtonText: "Nanti Saja",
              confirmButtonColor: "#2563EB",
              cancelButtonColor: "#64748B",
              customClass: {
                popup: "rounded-2xl shadow-2xl border border-slate-100 p-5",
                title: "text-base font-bold text-slate-800",
                confirmButton: "px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
                cancelButton: "px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer",
              },
            }).then((result) => {
              if (result.isConfirmed) {
                router.push("/bank-soal");
              }
            });
          }, 1200);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  }, [token, user, isTeacher, router]);

  useEffect(() => {
    fetchNotifications();

    // Polling interval setiap 35 detik
    const interval = setInterval(fetchNotifications, 35000);

    // Custom event listener agar komponen lain dapat memicu refresh
    const handleCustomRefresh = () => fetchNotifications();
    window.addEventListener("cbt:refresh_notifications", handleCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("cbt:refresh_notifications", handleCustomRefresh);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (!token) return;
    try {
      await fetch(`/api/cbt-backend/api/cbt/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    if (!token) return;
    try {
      await fetch("/api/cbt-backend/api/cbt/notifications/read-all", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
