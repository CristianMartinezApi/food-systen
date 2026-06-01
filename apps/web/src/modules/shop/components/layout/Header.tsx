import { ShoppingCart, Menu, User, Search, MapPin, Utensils, ShoppingBag } from "lucide-react";
import { Button } from "../../../../shared/components/ui/button";
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

interface HeaderProps {
  onOpenMenu?: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const hasHydrated = useHasHydrated();
  const { getTotalItems } = useCartStore();
  const { address } = useLocationStore();
  const totalItems = hasHydrated ? getTotalItems() : 0;
  const { settings } = useSettings();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  return (
    <>
        <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="container mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-4">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
            <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden rounded-xl bg-slate-50"
                onClick={onOpenMenu}
            >
                <Menu className="h-6 w-6" />
            </Button>
            <Link href={`/${slug}`} className="flex items-center gap-3 group cursor-pointer">
                {settings?.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform" />
                ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                        <Utensils className="text-white" size={24} />
                    </div>
                )}
                <div className="flex flex-col text-left">
                    <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none uppercase">
                        {settings?.storeName?.replace(/\s/g, '') || "FOODSYSTEM"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            settings?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        )} />
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em]",
                            settings?.isOpen ? "text-emerald-500" : "text-rose-500"
                        )}>
                        {settings?.isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                    </div>
                </div>
            </Link>
            </div>

            {/* Localização */}
            <div 
                onClick={() => setIsAddressModalOpen(true)}
                className="hidden lg:flex items-center gap-3 bg-slate-50/50 px-5 py-2.5 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <MapPin size={16} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Entregar em</p>
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">
                        {address ? `${address.street}, ${address.number}` : "Selecione seu endereço..."}
                    </p>
                </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex relative items-center group">
                <Search className="absolute left-4 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                    placeholder="Busca rápida..."
                    className="h-12 w-48 lg:w-72 pl-12 pr-4 bg-slate-50/80 border border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all text-xs font-bold uppercase tracking-widest outline-none"
                />
            </div>

            <button 
                onClick={() => setIsCartOpen(true)}
                className="relative h-12 md:h-14 px-5 md:px-10 bg-slate-900 text-white rounded-[1.25rem] font-black flex items-center gap-3 shadow-2xl shadow-slate-900/10 hover:bg-black active:scale-[0.98] transition-all group overflow-hidden"
            >
                <div className="relative z-10 flex items-center gap-3">
                    <ShoppingCart size={20} className="group-hover:-rotate-12 transition-transform" />
                    <span className="hidden sm:inline text-[10px] tracking-[0.2em] font-black uppercase">Carrinho</span>
                </div>
                {totalItems > 0 && (
                    <span className="relative z-10 bg-primary text-white text-[10px] font-black w-6 h-6 px-1 rounded-lg flex items-center justify-center border border-slate-900 ml-1">
                    {totalItems}
                    </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>

            <Link href={`/${slug}/orders`} className="hidden sm:flex w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm">
                <ShoppingBag size={24} />
            </Link>

            <div className="w-[1px] h-8 bg-slate-100 mx-1 hidden sm:block" />
            <button className="hidden sm:flex w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm">
                <User size={24} />
            </button>
            </div>
        </div>
        </header>

        <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </>
  );
}
