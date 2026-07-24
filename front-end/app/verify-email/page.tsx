"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/core/config/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirmando seu e-mail...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Link de confirmação inválido.");
      return;
    }

    api.post("/auth/verify-email", { token })
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
        try {
          const stored = localStorage.getItem("@FoodSystem:user");
          if (stored) {
            const user = JSON.parse(stored);
            user.emailVerifiedAt = new Date().toISOString();
            localStorage.setItem("@FoodSystem:user", JSON.stringify(user));
          }
        } catch {}
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Não foi possível confirmar o e-mail.");
      });
  }, [params]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-black text-slate-950">
          {status === "loading" ? "Aguarde" : status === "success" ? "E-mail confirmado" : "Confirmação não concluída"}
        </h1>
        <p className="mt-4 text-slate-600">{message}</p>
        {status !== "loading" && (
          <Link href="/admin" className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">
            Voltar ao painel
          </Link>
        )}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmailContent /></Suspense>;
}
