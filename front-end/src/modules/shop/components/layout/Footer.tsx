"use client";

import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  MessageCircle,
  MapPin,
  Phone,
  Clock,
  Utensils,
  Heart,
  ArrowRight
} from "lucide-react";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { cn } from "../../../../shared/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getNextOpeningLabel, getOperatingHoursSummary } from "../../../../shared/utils/schedule";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";

type SocialLink = {
  label: string;
  href: string;
  Icon: typeof Instagram;
};

interface FooterProps {
  settings?: any;
}

function normalizeInstagram(value?: string | null) {
  if (!value) return null;
  const cleaned = value.trim().replace(/^@/, "");
  if (!cleaned) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://instagram.com/${cleaned}`;
}

function normalizeFacebook(value?: string | null) {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://facebook.com/${cleaned.replace(/^\//, "")}`;
}

function normalizeWhatsApp(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function buildStoreMapUrl(settings?: any) {
  const address = typeof settings?.address === "string" ? settings.address.trim() : "";
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  const latitude = Number(settings?.latitude);
  const longitude = Number(settings?.longitude);
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  if (hasValidCoordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return null;
}

export function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [slug, setSlug] = useState<string>("");
  const hasHydrated = useHasHydrated();
  const contactSocial = settings?.contact?.social;
  const storeMapUrl = buildStoreMapUrl(settings);
  const operatingHoursSummary = hasHydrated
    ? getOperatingHoursSummary(settings?.operatingHours)
    : "Carregando horário";
  const nextOpeningLabel = hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários";

  const socialLinks: SocialLink[] = [
    {
      label: "Instagram",
      href: normalizeInstagram(contactSocial?.instagram || settings?.instagram) || "",
      Icon: Instagram,
    },
    {
      label: "Facebook",
      href: normalizeFacebook(contactSocial?.facebook || settings?.facebook) || "",
      Icon: Facebook,
    },
    {
      label: "WhatsApp",
      href: normalizeWhatsApp(contactSocial?.whatsapp || settings?.whatsapp?.number || settings?.phone) || "",
      Icon: MessageCircle,
    },
  ].filter((item) => item.href);

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  return (
    <footer className="bg-slate-950 text-slate-300 pt-10 md:pt-32 pb-4 md:pb-12 overflow-hidden relative">
      {/* Visual Decoration */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 left-[15%] w-px h-64 bg-linear-to-b from-white/5 to-transparent hidden md:block" />
        <div className="absolute top-0 right-[15%] w-px h-64 bg-linear-to-b from-white/5 to-transparent hidden md:block" />

        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 lg:gap-14 xl:gap-16 mb-8 md:mb-24">

          {/* Brand & Manifesto */}
          <div className="space-y-4 md:space-y-8">
            <div className="flex items-center gap-3 md:gap-5 group cursor-default">
              <div className="w-11 h-11 md:w-16 md:h-16 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-slate-900 border border-white/5 group-hover:rotate-12 transition-all duration-700 shrink-0">
                <Utensils className="text-primary size-5 md:size-8" />
              </div>
              <div className="min-w-0">
                <h3 className="notranslate text-heading-3 md:text-heading-2 font-display font-bold text-white tracking-tight leading-none uppercase truncate" translate="no">
                  {settings?.storeName?.split(' ')[0] || "FOOD"}<span className="text-primary">{settings?.storeName?.split(' ')[1] || "SYSTEM"}</span>
                </h3>
                <p className="text-[10px] md:text-label font-body font-medium text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">ALTA GASTRONOMIA</p>
              </div>
            </div>
            <p className="text-[10px] md:text-label font-body font-medium leading-relaxed text-slate-400 max-w-xs uppercase tracking-[0.08em] opacity-80 decoration-primary decoration-1">
              {settings?.description || "Experiência gastronômica premium no conforto da sua casa. Qualidade impecável em cada detalhe."}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2.5 md:gap-4 pt-2 md:pt-4">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    title={label}
                    className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white hover:border-primary/20 transition-all duration-500 group"
                  >
                    <Icon size={16} className="group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-5 md:space-y-10">
            <h4 className="text-[10px] md:text-label font-body font-bold text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-3 md:gap-4">
              Navegação
              <div className="h-px w-8 md:w-10 bg-primary/20" />
            </h4>
            <ul className="space-y-3 md:space-y-6">
              {[
                { label: 'Início', href: `/${slug}` },
                { label: 'Nosso Cardápio', href: `/${slug}` },
                { label: 'Meus Pedidos', href: `/${slug}/orders` },
                { label: 'Sobre o Chef', href: `/${slug}` }
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[10px] md:text-label font-body font-bold text-slate-500 hover:text-white transition-all flex items-center gap-3 md:gap-4 group uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-all duration-500 shadow-[0_0_12px_var(--color-primary)]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div className="space-y-5 md:space-y-10">
            <h4 className="text-[10px] md:text-label font-body font-bold text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-3 md:gap-4">
              Localização
              <div className="h-px w-8 md:w-10 bg-primary/20" />
            </h4>
            <div className="space-y-5 md:space-y-10">
              <div className="flex items-start gap-3 md:gap-5 group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shrink-0">
                  <MapPin className="size-4 md:size-5" />
                </div>
                <div className="space-y-1 md:space-y-2 min-w-0">
                  <span className="text-[10px] md:text-label font-body font-bold text-slate-600 uppercase tracking-[0.15em] md:tracking-[0.2em] leading-none block">Logradouro</span>
                  {storeMapUrl ? (
                    <a
                      href={storeMapUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Abrir localização no mapa"
                      className="text-[10px] md:text-label font-body font-bold text-slate-300 hover:text-primary leading-tight uppercase tracking-tight truncate transition-colors"
                    >
                      {settings?.address || "Abrir no mapa"}
                    </a>
                  ) : (
                    <p className="text-[10px] md:text-label font-body font-bold text-slate-300 leading-tight uppercase tracking-tight truncate">
                      {settings?.address || "Carregando destino..."}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 md:gap-4 group">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                  <Phone className="size-4 md:size-4.5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.15em]">Telefone</span>
                  <p className="text-[10px] md:text-xs font-black text-slate-300 leading-tight uppercase tracking-tighter truncate">
                    {settings?.phone || '(00) 00000-0000'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Hours */}
          <div className="space-y-4 md:space-y-8">
            <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
              Status
              <div className="h-px w-6 md:w-8 bg-primary/30" />
            </h4>
            <div className="bg-slate-900/50 border border-white/5 rounded-4xl p-4 md:p-8 space-y-4 md:space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="size-4 md:size-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Aberto das</p>
                  <p className="text-base md:text-lg font-black text-white uppercase tracking-tighter truncate">{operatingHoursSummary}</p>
                </div>
              </div>
              <div className="pt-3 md:pt-6 border-t border-white/5 flex items-center gap-2 md:gap-3">
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px] shrink-0", settings?.isOpen ? "bg-emerald-500 shadow-emerald-500 animate-pulse" : "bg-rose-500 shadow-rose-500")} />
                <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] truncate", settings?.isOpen ? "text-emerald-500" : "text-rose-500")}>
                  {settings?.isOpen
                    ? "Estamos abertos"
                    : nextOpeningLabel === "Sem próximos horários"
                      ? "Fechados · Sem horário disponível"
                      : `Fechados · Abre ${nextOpeningLabel}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-5 md:pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-8">
          <p className="notranslate text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] md:tracking-[0.5em] text-center md:text-left" translate="no">
            © {currentYear} {settings?.storeName || 'FOOD SYSTEM'}. TODOS OS DIREITOS RESERVADOS.
          </p>
          <p className="text-[8px] md:text-[11px] text-slate-500 text-center">
            <span className="mr-1">Desenvolvido por</span>
            <span className="font-semibold text-primary text-[8px] md:text-[11px]">Cristian Martinez</span>
          </p>
        </div>
      </div>
    </footer>
  );
}