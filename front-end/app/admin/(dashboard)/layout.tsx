"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "../../../src/modules/admin/components/layout/AdminLayout";
import { api } from "../../../src/core/config/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      try {
        await api.get("/users/me/profile");
        if (!cancelled) setAuthorized(true);
      } catch {
        // A camada da API limpa a sessão local e redireciona em respostas 401.
      }
    };

    void validateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authorized) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
