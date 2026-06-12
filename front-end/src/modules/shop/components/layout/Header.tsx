"use client";

import { ShoppingBag, Menu, Search, MapPin, ChevronRight, Utensils } from "lucide-react";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { useSettings } from "../../../../core/hooks/useSettings";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useState, useEffect } from "react";
import { CartSidebar } from "../cart/CartSidebar";
import { AddressModal } from "../modals/AddressModal";
import { cn } from "../../../../shared/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getNextOpeningLabel } from "../../../../shared/utils/schedule";

interface HeaderProps {
  onOpenMenu?: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const hasHydrated = useHasHydrated();
  const { getTotalItems } = useCartStore() as any;
  const { address } = useLocationStore();
  const totalItems = hasHydrated ? getTotalItems() : 0;
  const { settings } = useSettings();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [slug, setSlug] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setSlug(getTenantSlug());
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Paridade de endereço: Se o usuário não definiu localização, mostra o endereço da loja
  const displayAddress = address
    ? `${address.street}, ${address.number}`
    : (settings?.address || "Carregando endereço...");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "py-1.5 sm:py-2 md:py-4 bg-slate-100/90 backdrop-blur-2xl shadow-[0_16px_44px_rgba(15,23,42,0.12)]"
            : "py-1.5 sm:py-3 md:py-6 bg-slate-100 border-b border-slate-200"
        )}
      >
        <div className="container mx-auto px-3 md:px-6">
          <div className="flex items-center justify-between gap-2 md:gap-8">

            {/* Logo Section */}
            <div className="flex items-center gap-3 md:gap-6 min-w-0">
              <Link href={`/${slug}`} className="flex items-center gap-3 md:gap-5 group min-w-0">
                <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-950 rounded-xl md:rounded-3xl flex items-center justify-center shadow-2xl shadow-slate-950/20 group-hover:rotate-6 transition-all duration-500 shrink-0">
                  {settings?.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-cover rounded-xl md:rounded-3xl" />
                  ) : (
                    <Utensils className="text-primary group-hover:scale-110 transition-transform duration-500" size={20} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-[13px] sm:text-[18px] md:text-[26px] lg:text-[30px] font-display font-bold text-slate-950 tracking-tighter leading-none uppercase truncate max-w-52 sm:max-w-none">
                    {settings?.storeName?.split(' ')[0] || "FOOD"}<span className="hidden sm:inline text-primary">{settings?.storeName?.split(' ')[1] || "SYSTEM"}</span>
                  </h1>
                  <p className="hidden xs:flex text-[9px] md:text-[11px] font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-0.5 md:mt-1 pr-2 items-center gap-1 whitespace-nowrap">
                    <span className={cn("w-1 h-1 md:w-1.5 md:h-1.5 rounded-full", settings?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    {settings?.isOpen ? "Produzindo" : `Fechado • ${getNextOpeningLabel(settings?.operatingHours)}`}
                  </p>
                </div>
              </Link>
            </div>

            {/* Middle Section: Address */}
            <div
              onClick={() => setIsAddressModalOpen(true)}
              className="hidden lg:flex items-center gap-3 md:gap-5 bg-slate-50 shadow-xl shadow-slate-300/40 px-4 md:px-8 py-2 md:py-4 rounded-2xl md:rounded-3xl border border-slate-200 cursor-pointer hover:border-primary/20 hover:shadow-primary/10 transition-all duration-500 group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-2xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <MapPin size={16} className="md:size-18" />
              </div>
              <div>
                <p className="text-[8px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-none mb-1">Entregar em</p>
                <p className="text-[10px] md:text-body-strong font-body text-slate-950 truncate max-w-40 md:max-w-50 uppercase tracking-tighter">
                  {displayAddress}
                </p>
              </div>
              <ChevronRight size={14} className="md:size-16 text-slate-200 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1 md:gap-6 shrink-0">
              {/* Search Bar - Aesthetic version */}
              <div className="hidden md:flex relative items-center group">
                <Search className="absolute left-4 md:left-6 text-slate-300 group-focus-within:text-primary transition-colors duration-300" size={18} />
                <input
                  placeholder="BUSCAR SABOR..."
                  className="h-12 md:h-16 w-40 md:w-56 lg:w-80 pl-12 md:pl-16 pr-4 md:pr-6 bg-slate-100 border border-slate-200 rounded-2xl md:rounded-3xl focus:bg-slate-50 focus:ring-[6px] focus:ring-primary/10 focus:border-primary/20 transition-all duration-300 text-[10px] md:text-label font-body font-medium uppercase tracking-[0.06em] outline-none"
                />
              </div>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-slate-950 text-white h-9 md:h-18 px-2.5 md:px-10 rounded-lg md:rounded-3xl flex items-center gap-1.5 md:gap-5 hover:scale-105 active:scale-95 transition-all duration-500 shadow-2xl shadow-slate-950/30 group"
              >
                <div className="relative">
                  <ShoppingBag size={15} className="md:size-6 group-hover:rotate-12 transition-transform duration-300" />
                  {totalItems > 0 && (
                    <AnimatePresence>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-primary text-white text-[7px] md:text-label font-body font-bold w-4 h-4 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 md:border-4 border-slate-950 shadow-lg"
                      >
                        {totalItems}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start leading-none">
                  <span className="text-label font-body font-medium uppercase tracking-[0.06em] opacity-40 mb-1">Cesto</span>
                  <span className="text-body-strong font-body font-bold tracking-tighter uppercase">Ver Agora</span>
                </div>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={onOpenMenu}
                className="w-9 h-9 md:w-16 md:h-16 bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl flex items-center justify-center text-slate-950 shadow-md shadow-slate-300/40 active:scale-90 transition-all"
              >
                <Menu size={15} className="md:size-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </>
  );
}