"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../../src/modules/admin/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("@FoodSystem:token");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
