"use client";

import { useEffect, useState } from "react";
import StoreDashboard from "../../../src/modules/admin/pages/StoreDashboard";
import SuperAdminDashboard from "../../../src/modules/admin/pages/SuperAdminDashboard";

export default function Page() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("@FoodSystem:user");

    if (!userData) {
      setUserRole("");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUserRole(parsedUser.role || "");
    } catch {
      setUserRole("");
    }
  }, []);

  if (userRole === null) {
    return null;
  }

  return userRole === "SUPER_ADMIN" ? <SuperAdminDashboard /> : <StoreDashboard />;
}
