"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CetakKartuRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dokumen-administrasi");
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-500 font-bold text-xs">
      Mengalihkan ke Menu Dokumen Administrasi...
    </div>
  );
}
