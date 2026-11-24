import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { CbtSettingsProvider } from "@/context/CbtSettingsContext";
import { NotificationProvider } from "@/context/NotificationContext";
import DashboardShell from "@/components/DashboardShell";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Mencegah ikon fontawesome berkedip besar saat first render
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "CBT Ujian Sekolah & Ulangan Harian",
  description: "Sistem CBT Mandiri Sekolah Terpadu dengan Fitur Anti-Kecurangan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-100/90 font-sans text-slate-800 print:block print:bg-white print:min-h-0 antialiased selection:bg-indigo-600 selection:text-white">
        <AuthProvider>
          <CbtSettingsProvider>
            <NotificationProvider>
              <SidebarProvider>
                <DashboardShell>{children}</DashboardShell>
              </SidebarProvider>
            </NotificationProvider>
          </CbtSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
