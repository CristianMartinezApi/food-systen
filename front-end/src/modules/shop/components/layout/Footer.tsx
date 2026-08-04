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
import { getNextOpeningLabel, getOperatingHoursSummary, isRestaurantOpenNow } from "../../../../shared/utils/schedule";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";
import { useSettings } from "../../../../core/hooks/useSettings";

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
  const latitude = Number(settings?.latitude);
  const longitude = Number(settings?.longitude);
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  if (hasValidCoordinates) {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  }

  return null;
}

function buildStoreMapEmbedUrl(settings?: any) {
  const latitude = Number(settings?.latitude);
  const longitude = Number(settings?.longitude);
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);
  return hasValidCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.006}%2C${longitude + 0.01}%2C${latitude + 0.006}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;
}

export function Footer({ settings: providedSettings }: FooterProps) {
  const { settings: loadedSettings } = useSettings();
  const settings = providedSettings || loadedSettings;
  const currentYear = new Date().getFullYear();
  const [slug, setSlug] = useState<string>("");
  const hasHydrated = useHasHydrated();
  const contactSocial = settings?.contact?.social;
  const storeMapUrl = buildStoreMapUrl(settings);
  const storeMapEmbedUrl = buildStoreMapEmbedUrl(settings);
  const operatingHoursSummary = hasHydrated
    ? getOperatingHoursSummary(settings?.operatingHours)
    : "Carregando horário";
  const isOpenNow = (typeof settings?.isOpen === "boolean"
    ? settings.isOpen
    : (hasHydrated ? isRestaurantOpenNow(settings?.operatingHours) : false))
    && settings?.hasCashierSession !== false;
  const nextOpeningLabel = settings?.nextOpeningLabel || (hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários");

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
    <footer id="store-footer" className="relative overflow-hidden bg-slate-950 pb-4 pt-10 text-slate-300 md:pb-8 md:pt-16 lg:pt-20">
      {/* Visual Decoration */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute top-0 left-[15%] w-px h-64 bg-linear-to-b from-white/5 to-transparent hidden md:block" />
        <div className="absolute top-0 right-[15%] w-px h-64 bg-linear-to-b from-white/5 to-transparent hidden md:block" />

        <div className="relative z-10 mx-auto w-full px-4 md:px-8 lg:px-12 xl:px-16">
          <div className="mb-8 grid grid-cols-1 gap-8 md:mb-12 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.05fr_0.7fr_1.15fr_1fr] lg:gap-12 xl:gap-16">

          {/* Brand & Manifesto */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 md:gap-5 group cursor-default">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-white/5 bg-slate-900 shadow-2xl shadow-slate-900 transition-all duration-700 group-hover:rotate-6 md:h-14 md:w-14">
                <Utensils className="size-5 text-primary md:size-7" />
              </div>
              <div className="min-w-0">
                <h3 className="notranslate text-heading-3 md:text-heading-2 font-display font-bold text-white tracking-tight leading-none uppercase truncate" translate="no">
                  {settings?.storeName?.split(' ')[0] || "FOOD"}{" "}
                  <span className="text-primary">{settings?.storeName?.split(' ').slice(1).join(' ') || "SYSTEM"}</span>
                </h3>
                <p className="text-[10px] md:text-label font-body font-medium text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">ALTA GASTRONOMIA</p>
              </div>
            </div>
            <p className="text-[10px] md:text-label font-body font-medium leading-relaxed text-slate-400 max-w-xs uppercase tracking-[0.08em] opacity-80 decoration-primary decoration-1">
              {settings?.description || "Consulte o cardápio, escolha seus produtos e faça seu pedido online."}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    title={label}
                    className="group flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-white transition-all duration-300 hover:border-primary/20 hover:bg-primary"
                  >
                    <Icon size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden text-[9px] font-bold uppercase tracking-wider xl:inline">{label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-5 md:space-y-7">
            <h4 className="text-[10px] md:text-label font-body font-bold text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-3 md:gap-4">
              Navegação
              <div className="h-px w-8 md:w-10 bg-primary/20" />
            </h4>
            <ul className="space-y-3 md:space-y-4">
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
          <div className="space-y-5 md:space-y-7">
            <h4 className="text-[10px] md:text-label font-body font-bold text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-3 md:gap-4">
              Localização
              <div className="h-px w-8 md:w-10 bg-primary/20" />
            </h4>
            <div className="space-y-5 md:space-y-6">
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
                      className="text-[10px] font-bold uppercase leading-relaxed tracking-tight text-slate-300 transition-colors hover:text-primary md:text-label"
                    >
                      {settings?.address || "Abrir no mapa"}
                    </a>
                  ) : (
                    <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tight text-slate-300 md:text-label">
                      {settings?.address || "Carregando destino..."}
                    </p>
                  )}
                </div>
              </div>
              {storeMapEmbedUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <iframe
                    title={`Mapa de ${settings?.storeName || "localização da loja"}`}
                    src={storeMapEmbedUrl}
                    width="100%"
                    height="112"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block w-full grayscale-[20%] contrast-90"
                  />
                  {storeMapUrl && (
                    <a
                      href={storeMapUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex h-10 items-center justify-between border-t border-white/10 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Ver no OpenStreetMap <ArrowRight size={13} />
                    </a>
                  )}
                </div>
              )}
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
          <div className="space-y-4 md:space-y-7">
            <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
              Funcionamento
              <div className="h-px w-6 md:w-8 bg-primary/30" />
            </h4>
            <div className="group relative space-y-4 overflow-hidden rounded-3xl border border-white/5 bg-slate-900/50 p-4 md:p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="size-4 md:size-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[9px] font-black uppercase leading-none tracking-widest text-slate-500 md:text-[10px]">Horários de hoje</p>
                  <p className="text-base font-black uppercase leading-tight tracking-tighter text-white md:text-lg">{operatingHoursSummary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-white/5 pt-3 md:gap-3 md:pt-4">
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px] shrink-0", isOpenNow ? "bg-emerald-500 shadow-emerald-500 animate-pulse" : "bg-rose-500 shadow-rose-500")} />
                <span className={cn("text-[9px] font-black uppercase leading-relaxed tracking-[0.14em] md:text-[10px]", isOpenNow ? "text-emerald-500" : "text-rose-500")}>
                  {isOpenNow
                    ? "Loja aberta agora"
                    : nextOpeningLabel === "Sem próximos horários"
                      ? "Loja fechada · Sem horário disponível"
                      : `Loja fechada · Abre ${nextOpeningLabel}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-5 md:flex-row md:gap-8 md:pr-24 md:pt-6">
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
