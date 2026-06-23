"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { AdminLayout } from "../../../src/modules/admin/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("@FoodSystem:token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyCV4EcVeyozyk9VHH7XFhFuLXU4fS7Gjds&libraries=places&loading=async`}
        strategy="afterInteractive"
      />
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
