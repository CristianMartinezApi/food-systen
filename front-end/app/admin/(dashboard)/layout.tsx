"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { AdminLayout } from "../../../src/modules/admin/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const token = localStorage.getItem("@FoodSystem:token");
    if (!token) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    const mapsWindow = window as typeof window & { gm_authFailure?: () => void };
    mapsWindow.gm_authFailure = () => {
      window.dispatchEvent(new CustomEvent("google-maps-error", {
        detail: { reason: "A chave do Google Maps não está autorizada ou a API não foi ativada." },
      }));
    };
    return () => {
      delete mapsWindow.gm_authFailure;
    };
  }, []);

  if (!authorized) {
    return null;
  }

  return (
    <>
      {mapsApiKey ? (
        <Script
          id="google-maps-api"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsApiKey)}&libraries=places&loading=async`}
          strategy="afterInteractive"
          onLoad={() => window.dispatchEvent(new Event("google-maps-loaded"))}
          onError={() => window.dispatchEvent(new CustomEvent("google-maps-error", {
            detail: { reason: "Não foi possível carregar o Google Maps." },
          }))}
        />
      ) : (
        <Script
          id="google-maps-missing-key"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dispatchEvent(new CustomEvent("google-maps-error",{detail:{reason:"Google Maps não configurado neste ambiente."}}));`,
          }}
        />
      )}
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
