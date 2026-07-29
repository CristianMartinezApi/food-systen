"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "../../../src/modules/admin/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("@FoodSystem:user");
    if (storedUser) {
      setAuthorized(true);
      return;
    }

    window.location.replace("/login");
  }, []);

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f14] px-6 text-white">
        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-20 animate-pulse rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl shadow-black/30">
            <img
              src="/foodsystem-icon-512.png"
              alt="FoodSystem"
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
          <p className="mt-5 text-lg font-bold tracking-tight">FoodSystem</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
            Preparando ambiente operacional
          </p>
          <div className="mt-5 h-1 w-36 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </main>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
