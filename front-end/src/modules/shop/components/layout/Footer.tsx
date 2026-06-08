"use client";

import { motion } from "framer-motion";
import { 
  Instagram, 
  Facebook, 
  MapPin, 
  Phone, 
  Clock, 
  Utensils,
  Heart,
  ArrowRight
} from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { cn } from "../../../../shared/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getNextOpeningLabel, getOperatingHoursSummary } from "../../../../shared/utils/schedule";

export function Footer() {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  return (
    <footer className="bg-slate-950 text-slate-300 pt-32 pb-12 overflow-hidden relative">
      {/* Visual Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-0 left-1/4 w-px h-64 bg-linear-to-b from-white/5 to-transparent" />
      <div className="absolute top-0 right-1/4 w-px h-64 bg-linear-to-b from-white/5 to-transparent" />
      
      <div className="container px-4 mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-8 mb-24">
          
          {/* Brand & Manifesto */}
          <div className="space-y-8">
            <div className="flex items-center gap-5 group cursor-default">
              <div className="w-16 h-16 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-slate-900 border border-white/5 group-hover:rotate-12 transition-all duration-700">
                <Utensils className="text-primary" size={32} />
              </div>
              <div>
                <h3 className="text-heading-3 font-display font-bold text-white tracking-tight leading-none uppercase">
                  {settings?.storeName?.split(' ')[0] || "FOOD"}<span className="text-primary">{settings?.storeName?.split(' ')[1] || "SYSTEM"}</span>
                </h3>
                <p className="text-label font-body font-medium text-slate-500 uppercase tracking-[0.3em] mt-2">ALTA GASTRONOMIA</p>
              </div>
            </div>
            <p className="text-label font-body font-medium leading-relaxed text-slate-400 max-w-xs uppercase tracking-[0.08em] opacity-80 decoration-primary decoration-1">
              {settings?.description || "Experiência gastronômica premium no conforto da sua casa. Qualidade impecável em cada detalhe."}
            </p>
            <div className="flex gap-4 pt-4">
              {[Instagram, Facebook].map((Icon, i) => (
                <button key={i} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-white hover:border-primary/20 transition-all duration-500 group">
                  <Icon size={22} className="group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-10">
            <h4 className="text-label font-body font-bold text-white uppercase tracking-[0.4em] flex items-center gap-4">
              Navegação
              <div className="h-px w-10 bg-primary/20" />
            </h4>
            <ul className="space-y-6">
              {['Início', 'Nosso Cardápio', 'Meus Pedidos', 'Sobre o Chef'].map((item) => (
                <li key={item}>
                  <Link href={`/${slug}`} className="text-label font-body font-bold text-slate-500 hover:text-white transition-all flex items-center gap-4 group uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-all duration-500 shadow-[0_0_12px_var(--color-primary)]" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div className="space-y-10">
            <h4 className="text-label font-body font-bold text-white uppercase tracking-[0.4em] flex items-center gap-4">
              Localização
              <div className="h-px w-10 bg-primary/20" />
            </h4>
            <div className="space-y-10">
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <MapPin size={20} />
                </div>
                <div className="space-y-2">
                  <span className="text-label font-body font-bold text-slate-600 uppercase tracking-[0.2em] leading-none mb-1 block">Logradouro</span>
                  <p className="text-label font-body font-bold text-slate-300 leading-tight uppercase tracking-tight">
                    {settings?.address || 'Carregando destino...'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Phone size={18} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Telefone</span>
                  <p className="text-xs font-black text-slate-300 leading-tight uppercase tracking-tighter">
                    {settings?.phone || '(00) 00000-0000'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Hours */}
          <div className="space-y-8">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
              Status
              <div className="h-px w-8 bg-primary/30" />
            </h4>
            <div className="bg-slate-900/50 border border-white/5 rounded-4xl p-8 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Aberto das</p>
                  <p className="text-lg font-black text-white uppercase tracking-tighter">{getOperatingHoursSummary(settings?.operatingHours)}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px]", settings?.isOpen ? "bg-emerald-500 shadow-emerald-500 animate-pulse" : "bg-rose-500 shadow-rose-500")} />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", settings?.isOpen ? "text-emerald-500" : "text-rose-500")}>
                  {settings?.isOpen ? "Estamos Abertos" : `Fechados • ${getNextOpeningLabel(settings?.operatingHours)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
            © {currentYear} {settings?.storeName || 'FOOD SYSTEM'}. TODOS OS DIREITOS RESERVADOS.
          </p>
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 group cursor-default">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Designed with</span>
            <Heart size={14} className="text-primary fill-primary animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">for food lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}