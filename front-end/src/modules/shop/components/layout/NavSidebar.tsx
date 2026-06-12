"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Home, ShoppingBag, Utensils, Phone, MapPin, Clock, Star, Compass } from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { getNextOpeningLabel, getOperatingHoursSummary } from "../../../../shared/utils/schedule";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { AddressModal } from "../modals/AddressModal";
import { useEffect, useState } from "react";
import { cn } from "../../../../shared/utils";

interface NavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  activeCategory: number | 'all';
  onCategorySelect: (id: number | 'all') => void;
}

export function NavSidebar({ isOpen, onClose, categories, activeCategory, onCategorySelect }: NavSidebarProps) {
  const { settings } = useSettings() as any;
  const { address } = useLocationStore() as any;
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const storeName = settings?.storeName || "Food System";
  const firstName = storeName.split(' ')[0] || "Food";
  const statusTone = settings?.isOpen ? 'text-emerald-500' : 'text-rose-500';
  const statusDot = settings?.isOpen ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500';
  const statusTitle = settings?.isOpen ? 'Serviço aberto' : 'Serviço encerrado';
  const statusDetail = settings?.isOpen
    ? getOperatingHoursSummary(settings?.operatingHours)
    : getNextOpeningLabel(settings?.operatingHours);

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
            className="fixed left-0 top-0 h-dvh w-full max-w-none sm:max-w-[320px] md:max-w-md bg-slate-100 z-101 shadow-[50px_0_100px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden"
          >
            <div className="p-5 md:p-10 border-b border-slate-200 space-y-5 md:space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl" />
                    {settings?.logo ? (
                      <img src={settings.logo} alt="Logo" className="relative w-11 h-11 md:w-16 md:h-16 rounded-3xl object-cover border-2 border-slate-200 shadow-2xl" />
                    ) : (
                      <div className="relative w-11 h-11 md:w-16 md:h-16 bg-slate-950 rounded-3xl flex items-center justify-center text-primary border-2 border-slate-200 shadow-2xl">
                        <Utensils size={22} className="md:size-8" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.22em] mb-1">Restaurante</p>
                    <h2 className="text-heading-3 md:text-heading-1 font-display font-bold text-slate-950 tracking-tighter uppercase leading-none truncate">
                      {firstName}
                    </h2>
                    <div className={cn("mt-3 flex items-start gap-2", statusTone)}>
                      <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", statusDot)} />
                      <div className="min-w-0">
                        <p className="text-label font-body font-semibold uppercase tracking-[0.06em] leading-none">{statusTitle}</p>
                        <p className="mt-1 text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] leading-relaxed">
                          {statusDetail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-950 hover:bg-slate-100 transition-all duration-500 hover:rotate-90 shrink-0"
                >
                  <X size={18} className="md:size-6" />
                </button>
              </div>

              <div className="rounded-4xl border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-3 shadow-md shadow-slate-300/20">
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full flex items-center gap-4 text-left active:scale-95 transition-transform"
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 shadow-sm flex items-center justify-center text-primary shrink-0 border border-slate-200">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.22em] mb-1">Sua localização</p>
                    <p className="text-label md:text-body-strong font-body text-slate-950 truncate uppercase tracking-tighter">
                      {address ? `${address.street}, ${address.number}` : "Configurar endereço"}
                    </p>
                  </div>
                </button>

                <p className="pl-12 md:pl-13 text-[9px] md:text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] leading-relaxed">
                  {getOperatingHoursSummary(settings?.operatingHours)}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 md:p-10 space-y-7 md:space-y-10 no-scrollbar">

              <div className="space-y-4">
                <h3 className="px-1 text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Menu</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => { onCategorySelect('all'); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 md:px-6 h-13 md:h-16 rounded-[1.35rem] font-body font-bold uppercase tracking-[0.06em] text-[10px] md:text-label transition-all duration-500 border",
                      activeCategory === 'all' ? "bg-slate-950 text-white shadow-2xl border-slate-950" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
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
                        activeCategory === cat.id ? "bg-slate-950 text-white shadow-2xl border-slate-950" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                      )}
                    >
                      <Star size={17} className={activeCategory === cat.id ? "text-primary" : "text-slate-300"} />
                      <span className="flex-1 text-left truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5 pt-6 border-t border-slate-200">
                <h3 className="px-1 text-[10px] font-black text-slate-300 uppercase tracking-[0.24em]">Informações</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-md shadow-slate-300/15">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em] mb-1">Tempo médio</p>
                      <p className="text-body-strong font-body font-bold text-slate-900 uppercase tracking-tight">35 - 55 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 shadow-md shadow-slate-300/15">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.24em] mb-1">Contato</p>
                      <p className="text-body-strong font-body font-bold text-slate-900 uppercase tracking-tight truncate">{settings?.phone || "Número privado"}</p>
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