"use client";

import { ShoppingCart, Menu, Search, MapPin, ChevronRight, Utensils } from "lucide-react";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useState, useEffect } from "react";
import { CartSidebar } from "../cart/CartSidebar";
import { AddressModal } from "../modals/AddressModal";
import { cn } from "../../../../shared/utils";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getNextOpeningLabel, isRestaurantOpenNow } from "../../../../shared/utils/schedule";

interface HeaderProps {
  onOpenMenu?: () => void;
  settings?: any;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function Header({ onOpenMenu, settings, searchTerm, onSearchChange }: HeaderProps) {
  const hasHydrated = useHasHydrated();
  const { getTotalItems, syncTenantCart } = useCartStore() as any;
  const { address } = useLocationStore();
  const totalItems = hasHydrated ? getTotalItems() : 0;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [slug, setSlug] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const tenantSlug = getTenantSlug();
    setSlug(tenantSlug);
    syncTenantCart();
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [syncTenantCart]);

  // Paridade de endereço: Se o usuário não definiu localização, mostra o endereço da loja
  const displayAddress = address
    ? `${address.street}, ${address.number}`
    : (settings?.address || "Carregando endereço...");

  const storeNameRaw = settings?.storeName?.trim() || "Food System";
  const storeNameParts = storeNameRaw.split(/\s+/).filter(Boolean);
  const storeNameMain = storeNameParts.length > 1
    ? storeNameParts.slice(0, -1).join(" ")
    : storeNameRaw;
  const storeNameAccent = storeNameParts.length > 1
    ? storeNameParts[storeNameParts.length - 1]
    : "";
  const isOpenNow = typeof settings?.isOpen === "boolean"
    ? settings.isOpen
    : (hasHydrated ? isRestaurantOpenNow(settings?.operatingHours) : false);
  const nextOpeningLabel = settings?.nextOpeningLabel || (hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários");
  const closedStatusLabel = nextOpeningLabel === "Sem próximos horários"
    ? "Fechada · Sem próximo horário"
    : `Fechada agora · Abre ${nextOpeningLabel}`;
  const desktopStatusLabel = isOpenNow ? "Aberta · Aceitando pedidos" : closedStatusLabel;
  const mobileStatusLabel = isOpenNow
    ? "Aberta"
    : nextOpeningLabel === "Sem próximos horários"
      ? "Fechada"
      : `Abre ${nextOpeningLabel}`;

  const cartButton = (
    <button
      onClick={() => setIsCartOpen(true)}
      aria-label="Abrir cesto"
      className="fixed bottom-5 right-4 md:bottom-8 md:right-8 z-70 w-12 h-12 md:w-16 md:h-16 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-rose-900/35 ring-2 ring-white/70"
    >
      <div className="relative">
        <ShoppingCart size={18} className="md:size-7" />
        {totalItems > 0 && (
          <AnimatePresence>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-white text-rose-700 text-[9px] md:text-[11px] font-body font-bold min-w-5 h-5 px-1 md:min-w-6 md:h-6 rounded-full flex items-center justify-center border-2 border-rose-700"
            >
              {totalItems > 99 ? "99+" : totalItems}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </button>
  );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 border-b",
          isScrolled
            ? "py-2 sm:py-2.5 md:py-4 bg-slate-800/95 border-slate-700 backdrop-blur-md shadow-[0_12px_30px_rgba(2,6,23,0.32)]"
            : "py-2.5 sm:py-3 md:py-5 bg-slate-800/98 border-slate-700 shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
        )}
      >
        <div className="w-full px-3 md:px-5 lg:px-7 xl:px-8">
          <div className="flex items-center justify-between gap-3 md:gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8">

            {/* Logo Section */}
            <div className="flex items-center gap-2 md:gap-5 min-w-0 lg:justify-self-start">
              <Link href={`/${slug}`} className="flex items-center gap-2.5 md:gap-4 group min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-black/30 ring-1 ring-white/10 group-hover:rotate-3 transition-all duration-500 shrink-0">
                  {settings?.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
                  ) : (
                    <Utensils className="text-primary group-hover:scale-110 transition-transform duration-500" size={18} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h1
                    style={{ fontWeight: 900, letterSpacing: '-0.02em' }}
                    className="notranslate text-[20px] sm:text-[24px] md:text-[32px] lg:text-[36px] font-body text-white uppercase leading-[0.9] truncate max-w-60 sm:max-w-75 md:max-w-[320px] lg:max-w-95 xl:max-w-none [text-rendering:optimizeLegibility]"
                    translate="no"
                  >
                    <span className="text-white">{storeNameMain}</span>
                    {storeNameAccent ? <span className="text-primary ml-1">{storeNameAccent}</span> : null}
                  </h1>
                  <p className="flex md:hidden text-[8px] font-body font-bold text-slate-300 tracking-wide mt-1 items-center gap-1.5 max-w-40 truncate">
                    <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    {mobileStatusLabel}
                  </p>
                  <p className="hidden md:flex text-[10px] font-body font-medium text-slate-300 tracking-wide mt-1 items-center gap-1.5 whitespace-nowrap">
                    <span className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    {desktopStatusLabel}
                  </p>
                </div>
              </Link>
            </div>

            {/* Middle Section: Address */}
            <div
              onClick={() => setIsAddressModalOpen(true)}
              className="hidden lg:flex lg:justify-self-center items-center h-12 xl:h-14 gap-3 bg-slate-700/70 border border-slate-600 rounded-2xl px-4 xl:px-5 shadow-sm shadow-black/15 cursor-pointer hover:bg-slate-700 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 group max-w-[320px] xl:max-w-100"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900/70 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                <MapPin size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-body font-semibold text-slate-300 uppercase tracking-wider leading-none mb-1">Entregar em</p>
                <p className="text-[11px] font-body text-slate-100 truncate tracking-tight leading-none">
                  {displayAddress}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 md:gap-4 lg:gap-4 xl:gap-5 shrink-0 justify-end lg:justify-self-end">
              {/* Search Bar - Aesthetic version */}
              <div className="hidden xl:flex relative items-center group">
                <Search className="absolute left-4 md:left-5 text-slate-300 group-focus-within:text-primary transition-colors duration-300" size={18} />
                <input
                  value={searchTerm || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="BUSCAR SABOR..."
                  className="h-12 xl:h-14 w-40 md:w-56 lg:w-60 pl-11 md:pl-14 pr-4 md:pr-6 bg-slate-700/70 border border-slate-600 rounded-2xl focus:bg-slate-700 focus:ring-[5px] focus:ring-primary/20 focus:border-primary/50 transition-all duration-300 text-[10px] md:text-sm font-body font-medium uppercase tracking-wider text-slate-100 outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={onOpenMenu}
                className="w-10 h-10 md:w-12 md:h-12 xl:w-14 xl:h-14 bg-slate-700/70 border border-slate-600 rounded-2xl flex items-center justify-center text-slate-100 shadow-sm shadow-black/20 hover:bg-slate-700 hover:border-slate-500 hover:shadow-md active:scale-90 transition-all duration-200"
              >
                <Menu size={16} className="md:size-5 lg:size-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {hasHydrated ? createPortal(cartButton, document.body) : null}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </>
  );
}