"use client";

import { ShoppingCart, Menu, Search, MapPin, ChevronRight, Utensils, X } from "lucide-react";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { useLocationStore } from "../../../../core/stores/useLocationStore";
import { useHasHydrated } from "../../../../core/hooks/useHasHydrated";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { useState, useEffect, useRef } from "react";
import { CartSidebar } from "../cart/CartSidebar";
import { AddressModal } from "../modals/AddressModal";
import { cn } from "../../../../shared/utils";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getNextOpeningLabel, isRestaurantOpenNow } from "../../../../shared/utils/schedule";
import { MobileShopNavigation } from "./MobileShopNavigation";
import { MobileCartBar } from "./MobileCartBar";

interface HeaderProps {
  onOpenMenu?: () => void;
  settings?: any;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function Header({ onOpenMenu, settings, searchTerm, onSearchChange }: HeaderProps) {
  const hasHydrated = useHasHydrated();
  const { getTotalItems, getSubtotal, syncTenantCart } = useCartStore() as any;
  const { address } = useLocationStore();
  const totalItems = hasHydrated ? getTotalItems() : 0;
  const cartSubtotal = hasHydrated ? getSubtotal() : 0;
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [slug, setSlug] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tenantSlug = getTenantSlug();
    setSlug(tenantSlug);
    if (new URLSearchParams(window.location.search).get("search") === "1") {
      setIsMobileSearchOpen(true);
    }
    syncTenantCart();
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const handleDesktopScroll = () => setIsScrolled(window.scrollY > 20);
    const configureHeaderBehavior = () => {
      window.removeEventListener("scroll", handleDesktopScroll);

      if (desktopQuery.matches) {
        handleDesktopScroll();
        window.addEventListener("scroll", handleDesktopScroll, { passive: true });
        return;
      }
      setIsScrolled(false);
    };

    configureHeaderBehavior();
    desktopQuery.addEventListener("change", configureHeaderBehavior);
    return () => {
      window.removeEventListener("scroll", handleDesktopScroll);
      desktopQuery.removeEventListener("change", configureHeaderBehavior);
    };
  }, [syncTenantCart]);

  useEffect(() => {
    if (isMobileSearchOpen) {
      window.setTimeout(() => mobileSearchRef.current?.focus(), 50);
    }
  }, [isMobileSearchOpen]);

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
  const isOpenNow = (typeof settings?.isOpen === "boolean"
    ? settings.isOpen
    : (hasHydrated ? isRestaurantOpenNow(settings?.operatingHours) : false))
    && settings?.hasCashierSession !== false;
  const nextOpeningLabel = settings?.nextOpeningLabel || (hasHydrated
    ? getNextOpeningLabel(settings?.operatingHours)
    : "Sem próximos horários");
  const closedStatusLabel = settings?.isOpen && settings?.hasCashierSession === false
    ? "Aguardando abertura do caixa"
    : nextOpeningLabel === "Sem próximos horários"
      ? "Fechada · Sem próximo horário"
      : `Fechada agora · Abre ${nextOpeningLabel}`;
  const desktopStatusLabel = isOpenNow ? "Aberta · Aceitando pedidos" : closedStatusLabel;
  const mobileStatusLabel = isOpenNow
    ? "Aberta agora"
    : settings?.isOpen && settings?.hasCashierSession === false
      ? "Aguardando caixa"
      : nextOpeningLabel === "Sem próximos horários"
        ? "Fechada"
        : `Abre ${nextOpeningLabel}`;

  const cartButton = (
    <button
      onClick={() => setIsCartOpen(true)}
      aria-label="Abrir carrinho"
      className="fixed bottom-5 right-4 md:bottom-8 md:right-8 z-70 w-12 h-12 md:w-16 md:h-16 bg-rose-600 text-white rounded-full hidden md:flex items-center justify-center hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-rose-900/35 ring-2 ring-white/70"
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

  const mobileNavigation = <MobileShopNavigation slug={slug} active="menu" onSearch={() => setIsMobileSearchOpen(true)} />;

  const mobileCartBar = <MobileCartBar itemCount={totalItems} subtotal={cartSubtotal} onOpen={() => setIsCartOpen(true)} />;

  const mobileSearch = (
    <AnimatePresence>
      {isMobileSearchOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar busca"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSearchOpen(false)}
            className="fixed inset-0 z-80 bg-slate-950/40 md:hidden"
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed inset-x-0 z-81 border-t border-slate-200 bg-white p-4 shadow-[0_-16px_40px_rgba(15,23,42,0.18)] md:hidden"
            style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto flex max-w-xl items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  ref={mobileSearchRef}
                  value={searchTerm || ""}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Buscar produto no cardápio"
                  className="h-12 w-full border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="grid size-12 place-items-center border border-slate-300 bg-white text-slate-600"
                aria-label="Fechar busca"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-slate-700 bg-slate-900 py-2 shadow-[0_4px_14px_rgba(2,6,23,0.2)] md:transition-[background-color,border-color,box-shadow] md:duration-200",
          isScrolled
            ? "md:py-4 md:bg-slate-800/95 md:backdrop-blur-md md:shadow-[0_12px_30px_rgba(2,6,23,0.32)]"
            : "md:py-5 md:bg-slate-800/98 md:shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
        )}
      >
        <div className="w-full px-3 md:px-5 lg:px-7 xl:px-8">
          <div className="relative flex items-center justify-between gap-3 md:gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8">

            {/* Logo Section */}
            <div className="flex items-center gap-2 md:gap-5 min-w-0 lg:justify-self-start">
              <Link href={`/${slug}`} className="hidden min-w-0 items-center gap-4 group md:flex">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 shadow-lg ring-1 ring-white/15 transition-all duration-300 shrink-0 md:h-14 md:w-14 md:rounded-2xl md:shadow-xl md:shadow-black/30 md:group-hover:rotate-3">
                  {settings?.logo ? (
                    <img src={settings.logo} alt={`Logo ${storeNameRaw}`} className="h-full w-full rounded-full object-cover md:rounded-2xl" />
                  ) : (
                    <Utensils className="text-primary group-hover:scale-110 transition-transform duration-500" size={18} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h1
                    style={{ fontWeight: 900, letterSpacing: '-0.02em' }}
                    className="notranslate text-[15px] sm:text-[17px] md:text-[32px] lg:text-[36px] font-body text-white uppercase leading-none truncate max-w-44 sm:max-w-60 md:max-w-[320px] lg:max-w-95 xl:max-w-none [text-rendering:optimizeLegibility]"
                    translate="no"
                  >
                    <span className="text-white">{storeNameMain}</span>
                    {storeNameAccent ? <span className="text-primary ml-1">{storeNameAccent}</span> : null}
                  </h1>
                  <p className="flex md:hidden text-[9px] font-body font-semibold text-slate-400 mt-1 items-center gap-1.5 max-w-44 truncate">
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
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none md:gap-4 lg:justify-self-end lg:gap-4 xl:gap-5">
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

              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                aria-label={`Alterar endereço de entrega. Endereço atual: ${displayAddress}`}
                className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-left text-slate-100 transition-colors active:bg-slate-700 md:hidden"
              >
                <MapPin size={16} className="shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[8px] font-bold uppercase tracking-[0.12em] text-slate-300">Entregar em</span>
                  <span className="block truncate text-[10px] font-semibold text-white">{displayAddress}</span>
                </span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={onOpenMenu}
                aria-label="Abrir mais opções"
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100 transition-colors active:bg-slate-700 md:h-12 md:w-12 md:rounded-2xl md:border-slate-600 md:bg-slate-700/70 md:px-0 md:shadow-sm md:shadow-black/20 md:hover:border-slate-500 md:hover:bg-slate-700 xl:h-14 xl:w-14"
              >
                <Menu size={16} className="md:size-5 lg:size-6" />
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] md:hidden">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {hasHydrated ? createPortal(cartButton, document.body) : null}
      {hasHydrated ? createPortal(mobileNavigation, document.body) : null}
      {hasHydrated ? createPortal(mobileCartBar, document.body) : null}
      {hasHydrated ? createPortal(mobileSearch, document.body) : null}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </>
  );
}
