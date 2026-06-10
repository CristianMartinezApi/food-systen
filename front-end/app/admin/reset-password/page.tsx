"use client";

import { Suspense } from "react";
import ResetPassword from "@/modules/admin/pages/ResetPassword";

function ResetPasswordContent() {
  return <ResetPassword />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
