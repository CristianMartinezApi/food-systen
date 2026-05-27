import { ShoppingCart, Menu, User, Search, MapPin, Utensils } from "lucide-react";
import { Button } from "../../../../shared/components/ui/button";
import { useCartStore } from "../../../../core/stores/useCartStore";
import { useSettings } from "../../../../core/hooks/useSettings";
import { useState } from "react";
import { CartSidebar } from "../cart/CartSidebar";
import { cn } from "../../../../shared/utils";

interface HeaderProps {
  onOpenMenu?: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const { getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  const { settings } = useSettings();
  const [isCartOpen, setIsCartOpen] = useState(false);

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
            <div className="flex items-center gap-3 group cursor-pointer">
                {settings?.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform" />
                ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
                        <Utensils className="text-white" size={24} />
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-tight">
                        {settings?.storeName?.split(' ')[0] || "Food"}<span className="text-primary">{settings?.storeName?.split(' ')[1] || "System."}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            settings?.isOpen ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {settings?.isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                    </div>
                </div>
            </div>
            </div>

            {/* Localização (Visual Only) */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-50/50 px-5 py-2.5 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition-all">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary">
                    <MapPin size={16} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Entregar em</p>
                    <p className="text-sm font-bold text-slate-700">Selecione seu endereço...</p>
                </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex relative items-center">
                <Search className="absolute left-3 text-slate-300" size={18} />
                <input 
                    placeholder="Busca rápida..."
                    className="h-12 w-48 lg:w-64 pl-10 pr-4 bg-slate-50 border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                />
            </div>

            <button 
                onClick={() => setIsCartOpen(true)}
                className="relative h-12 md:h-14 px-4 md:px-8 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 md:gap-3 shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all group overflow-hidden"
            >
                <div className="relative z-10 flex items-center gap-2 md:gap-3">
                    <ShoppingCart size={20} className="group-hover:rotate-12 transition-transform" />
                    <span className="hidden sm:inline text-xs md:text-sm">CARRINHO</span>
                </div>
                {totalItems > 0 && (
                    <span className="relative z-10 bg-primary text-white text-[10px] font-black min-w-[20px] h-5 md:w-6 md:h-6 px-1 rounded-lg flex items-center justify-center border-2 border-slate-900 ml-0.5">
                    {totalItems}
                    </span>
                )}
                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            <div className="w-[1px] h-8 bg-slate-100 mx-1 hidden sm:block" />
            <button className="hidden sm:flex w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 rounded-2xl items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm">
                <User size={24} />
            </button>
            </div>
        </div>
        </header>

        <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
