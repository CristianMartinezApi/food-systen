import { motion, AnimatePresence } from "framer-motion";
import { X, Home, ShoppingBag, Utensils, Phone, MapPin, Clock } from "lucide-react";
import { useSettings } from "../../../../core/hooks/useSettings";
import { cn } from "../../../../shared/utils";

interface NavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  activeCategory: number | 'all';
  onCategorySelect: (id: number | 'all') => void;
}

export function NavSidebar({ isOpen, onClose, categories, activeCategory, onCategorySelect }: NavSidebarProps) {
  const { settings } = useSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-full max-w-[300px] bg-white z-[101] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header com Logo */}
            <div className="p-8 border-b border-slate-50">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    {settings?.logo ? (
                        <img src={settings.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                            <Utensils size={20} />
                        </div>
                    )}
                    <span className="text-xl font-black text-slate-800 tracking-tighter">
                        {settings?.storeName || "FoodSystem"}
                    </span>
                  </div>
                  <button onClick={onClose} className="text-slate-400">
                    <X size={24} />
                  </button>
               </div>
               
               <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    settings?.isOpen ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                    {settings?.isOpen ? "Aberto Agora" : "Fechado"}
                  </span>
               </div>
            </div>

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Navegação Principal */}
              <div className="space-y-2">
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Navegação</p>
                <button 
                  onClick={() => { onCategorySelect('all'); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 h-12 rounded-xl font-bold transition-all",
                    activeCategory === 'all' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Home size={18} /> Início / Cardápio
                </button>
                <button className="w-full flex items-center gap-3 px-4 h-12 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <ShoppingBag size={18} /> Meus Pedidos
                </button>
              </div>

              {/* Categorias */}
              <div className="space-y-2">
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorias</p>
                <div className="grid grid-cols-1 gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onCategorySelect(cat.id); onClose(); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 h-12 rounded-xl font-bold transition-all",
                        activeCategory === cat.id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Utensils size={16} className={activeCategory === cat.id ? "text-primary" : "text-slate-300"} />
                        <span className="uppercase">{cat.name}</span>
                      </span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg">
                        {cat.products?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-start gap-3 px-4">
                  <MapPin size={18} className="text-slate-300 shrink-0 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{settings?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-4">
                  <Clock size={18} className="text-slate-300 shrink-0 mt-1" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Horários</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        Seg - Sex: 18h às 23h <br/>
                        Sáb - Dom: 18h às 00h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Suporte */}
            <div className="p-6 bg-slate-50">
               <button className="w-full h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-700 font-black text-xs uppercase tracking-widest hover:border-primary transition-all">
                  <Phone size={16} className="text-primary" /> Ajuda & Suporte
               </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
