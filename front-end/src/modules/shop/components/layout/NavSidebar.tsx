"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Home, ShoppingBag, Utensils, Phone, MapPin, Clock, Star, Compass, History } from "lucide-react";
import { getNextOpeningLabel, getOperatingHoursSummary, isRestaurantOpenNow } from "../../../../shared/utils/schedule";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";
import { AddressModal } from "../modals/AddressModal";
import { useEffect, useState } from "react";
import { cn } from "../../../../shared/utils";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import Link from "next/link";

interface NavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  settings?: any;
  activeCategory: number | 'all';
  onCategorySelect: (id: number | 'all') => void;
}

export function NavSidebar({ isOpen, onClose, categories, settings, activeCategory, onCategorySelect }: NavSidebarProps) {
  const hasHydrated = useHasHydrated();
  const { address } = useLocationStore() as any;
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [slug, setSlug] = useState<string>("");
  const storeName = settings?.storeName || "Food System";
  const storeDesignation = storeName.toUpperCase();
  const isOpenNow = (typeof settings?.isOpen === "boolean"
    ? settings.isOpen
    : (hasHydrated ? isRestaurantOpenNow(settings?.operatingHours) : false))
    && settings?.hasCashierSession !== false;
  const nextOpeningLabel = settings?.nextOpeningLabel || (hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários");
  const operatingHoursSummary = hasHydrated
    ? getOperatingHoursSummary(settings?.operatingHours)
    : "Carregando horário";
  const statusTone = isOpenNow ? 'text-emerald-500' : 'text-rose-500';
  const statusDot = isOpenNow ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500';
  const statusTitle = isOpenNow ? 'LOJA ABERTA' : 'LOJA FECHADA';
  const statusDetail = isOpenNow
    ? `HOJE ${getOperatingHoursSummary(settings?.operatingHours).toUpperCase()}`
    : settings?.isOpen && settings?.hasCashierSession === false
      ? 'AGUARDANDO ABERTURA DO CAIXA'
      : nextOpeningLabel === 'Sem próximos horários'
        ? 'SEM PRÓXIMO HORÁRIO'
        : `ABRE ${nextOpeningLabel.toUpperCase()}`;

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-100"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-2 top-2 bottom-20 h-auto w-[calc(100%-1rem)] max-w-[360px] rounded-2xl sm:left-0 sm:top-0 sm:bottom-0 sm:h-dvh sm:w-full sm:max-w-[320px] sm:rounded-none md:max-w-md bg-slate-800 z-101 shadow-[50px_0_100px_rgba(2,6,23,0.4)] flex flex-col overflow-hidden"
          >
            <div className="p-5 md:p-10 border-b border-slate-700 space-y-5 md:space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl" />
                    {settings?.logo ? (
                      <img src={settings.logo} alt="Logo" className="relative w-11 h-11 md:w-16 md:h-16 rounded-3xl object-cover border-2 border-slate-700 shadow-2xl" />
                    ) : (
                      <div className="relative w-11 h-11 md:w-16 md:h-16 bg-slate-950 rounded-3xl flex items-center justify-center text-primary border-2 border-slate-700 shadow-2xl">
                        <Utensils size={22} className="md:size-8" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.22em] mb-1">Restaurante</p>
                    <h2 className="notranslate text-heading-3 md:text-heading-1 font-display font-bold text-white tracking-tighter uppercase leading-none truncate" translate="no">
                      {storeDesignation}
                    </h2>
                    <div className={cn("mt-3 flex items-start gap-2", statusTone)}>
                      <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", statusDot)} />
                      <div className="min-w-0">
                        <p className="text-label font-body font-semibold uppercase tracking-[0.06em] leading-none">{statusTitle}</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-relaxed">
                          {statusDetail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-slate-700/70 flex items-center justify-center text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-all duration-500 hover:rotate-90 shrink-0"
                >
                  <X size={18} className="md:size-6" />
                </button>
              </div>

              <div className="rounded-4xl border border-slate-700 bg-slate-700/50 p-4 md:p-5 space-y-3 shadow-md shadow-black/30">
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full flex items-center gap-4 text-left active:scale-95 transition-transform"
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 shadow-sm flex items-center justify-center text-primary shrink-0 border border-slate-600">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.22em] mb-1">Sua localização</p>
                    <p className="text-label md:text-body-strong font-body text-white truncate uppercase tracking-tighter">
                      {address ? `${address.street}, ${address.number}` : "Configurar endereço"}
                    </p>
                  </div>
                </button>

                <p className="pl-12 md:pl-13 text-[9px] md:text-[10px] font-medium text-slate-300 uppercase tracking-[0.18em] leading-relaxed">
                  {operatingHoursSummary}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 md:p-10 space-y-7 md:space-y-10 no-scrollbar">

              <div className="space-y-4">
                <h3 className="px-1 text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Menu</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Link
                    href={`/${slug}/orders`}
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-4 md:px-6 h-13 md:h-16 rounded-[1.35rem] font-body font-bold uppercase tracking-[0.06em] text-[10px] md:text-label transition-all duration-500 border bg-slate-700 text-slate-100 border-slate-600 hover:border-primary/50 hover:bg-slate-700/80"
                  >
                    <History size={17} className="text-slate-300" />
                    <span className="flex-1 text-left">Meus Pedidos</span>
                  </Link>

                  <button
                    onClick={() => { onCategorySelect('all'); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 md:px-6 h-13 md:h-16 rounded-[1.35rem] font-body font-bold uppercase tracking-[0.06em] text-[10px] md:text-label transition-all duration-500 border",
                      activeCategory === 'all' ? "bg-slate-950 text-white shadow-2xl border-slate-950" : "bg-slate-700 text-slate-100 border-slate-600 hover:border-slate-500 hover:bg-slate-700/80"
                    )}
                  >
                    <Compass size={17} className={activeCategory === 'all' ? "text-primary" : "text-slate-300"} />
                    <span className="flex-1 text-left">Menu completo</span>
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => { onCategorySelect(cat.id); onClose(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 md:px-6 h-13 md:h-16 rounded-[1.35rem] font-body font-bold uppercase tracking-[0.06em] text-[10px] md:text-label transition-all duration-500 border",
                        activeCategory === cat.id ? "bg-slate-950 text-white shadow-2xl border-slate-950" : "bg-slate-700 text-slate-100 border-slate-600 hover:border-slate-500 hover:bg-slate-700/80"
                      )}
                    >
                      <Star size={17} className={activeCategory === cat.id ? "text-primary" : "text-slate-300"} />
                      <span className="flex-1 text-left truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5 pt-6 border-t border-slate-700">
                <h3 className="px-1 text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Informações</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 rounded-[1.35rem] border border-slate-700 bg-slate-700/50 p-4 shadow-md shadow-black/30">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em] mb-1">Tempo médio</p>
                      <p className="text-body-strong font-body font-bold text-white uppercase tracking-tight">35 - 55 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-[1.35rem] border border-slate-700 bg-slate-700/50 p-4 shadow-md shadow-black/30">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em] mb-1">Contato</p>
                      <p className="text-body-strong font-body font-bold text-white uppercase tracking-tight truncate">{settings?.phone || "Número privado"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </motion.aside>
        </>
      )}
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </AnimatePresence>
  );
}
