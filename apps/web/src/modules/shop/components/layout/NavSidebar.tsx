"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Home, ShoppingBag, Utensils, Phone, MapPin, Clock, Star, Compass, Info } from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { AddressModal } from "../modals/AddressModal";
import { useState } from "react";
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

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100]"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full max-w-[320px] md:max-w-md bg-white z-[101] shadow-[50px_0_100px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
          >
            {/* Elegant Branding Header */}
            <div className="p-10 border-b border-slate-50 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 rounded-[1.5rem] blur-xl group-hover:blur-2xl transition-all" />
                        {settings?.logo ? (
                            <img src={settings.logo} alt="Logo" className="relative w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white shadow-2xl" />
                        ) : (
                            <div className="relative w-16 h-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-primary border-2 border-white shadow-2xl">
                                <Utensils size={32} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-heading-1 font-display font-bold text-slate-950 tracking-tighter uppercase leading-none">
                            {settings?.storeName?.split(' ')[0] || "SIGNATURE"}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                settings?.isOpen ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" : "bg-rose-500"
                            )} />
                            <span className={cn(
                                "text-label font-body font-medium uppercase tracking-[0.06em]",
                                settings?.isOpen ? "text-emerald-500" : "text-rose-500"
                            )}>
                            {settings?.isOpen ? 'Serviço Executivo' : 'Serviço Encerrado'}
                            </span>
                        </div>
                    </div>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-950 hover:bg-white transition-all duration-500 hover:rotate-90"
                  >
                    <X size={24} />
                  </button>
               </div>

               {/* Address Display Premium */}
               <button 
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] border border-white flex items-center gap-5 text-left hover:bg-white hover:shadow-xl group transition-all duration-500 active:scale-95"
               >
                  <div className="w-12 h-12 rounded-[1rem] bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                    <MapPin size={22} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-none mb-2">Sua Localização</p>
                    <p className="text-body-strong font-body text-slate-950 truncate uppercase tracking-tighter">
                        {address ? `${address.street}, ${address.number}` : "Configurar endereço VIP..."}
                    </p>
                  </div>
               </button>
            </div>

            {/* Menu Sections Premium */}
            <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
              
              {/* Direct Navigation */}
              <div className="space-y-4">
                <h3 className="text-label font-body font-medium text-slate-300 uppercase tracking-[0.06em] px-4">Exploração</h3>
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        onClick={() => { onCategorySelect('all'); onClose(); }}
                        className={cn(
                            "w-full flex items-center gap-5 px-6 h-16 rounded-2xl font-body font-bold uppercase tracking-[0.06em] text-label transition-all duration-500",
                            activeCategory === 'all' ? "bg-slate-950 text-white shadow-2xl" : "text-slate-400 hover:bg-slate-50 hover:text-slate-950"
                        )}
                    >
                        <Compass size={20} className={activeCategory === 'all' ? "text-primary" : ""} />
                        Menu Completo
                    </button>
                    {categories.map((cat: any) => (
                        <button 
                            key={cat.id}
                            onClick={() => { onCategorySelect(cat.id); onClose(); }}
                            className={cn(
                                "w-full flex items-center gap-5 px-6 h-16 rounded-2xl font-body font-bold uppercase tracking-[0.06em] text-label transition-all duration-500",
                                activeCategory === cat.id ? "bg-slate-950 text-white shadow-2xl" : "text-slate-400 hover:bg-slate-50 hover:text-slate-950"
                            )}
                        >
                            <Star size={20} className={activeCategory === cat.id ? "text-primary" : ""} />
                            {cat.name}
                        </button>
                    ))}
                </div>
              </div>

              {/* Utility Info */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h3 className="text-label font-body font-medium text-slate-300 uppercase tracking-[0.06em] px-4">Institucional</h3>
                <div className="grid grid-cols-1 gap-6 px-4">
                    <div className="flex items-center gap-5 group">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                            <Clock size={18} />
                        </div>
                        <div>
                            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-none mb-1">Horário de Pico</p>
                            <p className="text-body-strong font-body font-bold text-slate-900 uppercase tracking-tight">35 - 55 Minutos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 group">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                            <Phone size={18} />
                        </div>
                        <div>
                            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-none mb-1">Linha Executiva</p>
                            <p className="text-body-strong font-body font-bold text-slate-900 uppercase tracking-tight">{settings?.phone || "Número Privado"}</p>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Premium Footer Sidebar */}
            <div className="p-10 bg-slate-950">
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <Info size={24} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-label font-body font-bold text-white uppercase tracking-[0.06em]">FoodSystem Signature</p>
                        <p className="text-label font-mono font-medium text-slate-500 uppercase tracking-tighter">Version 2.0 Elite Edition</p>
                    </div>
                </div>
                <p className="text-label font-body font-medium text-slate-600 uppercase tracking-[0.06em] leading-relaxed">
                    Experiência desenvolvida exclusivamente para elevar o padrão da gastronomia digital.
                </p>
            </div>
          </motion.aside>
        </>
      )}
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </AnimatePresence>
  );
}