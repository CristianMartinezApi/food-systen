import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Tags,
  CheckCircle2,
  XCircle,
  GripVertical
} from "lucide-react";
import { api } from "../../../../core/config/api";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryModal } from "../../components/modals/CategoryModal";
import { gsap } from "gsap";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isLoading || !rootRef.current || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".categories-hero", { y: -18, opacity: 0, duration: 0.7 })
        .from(".categories-panel", { y: 24, opacity: 0, duration: 0.8 }, "-=0.25");
    }, rootRef);

    return () => ctx.revert();
  }, [isLoading]);

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza? Isso excluirá todos os produtos desta categoria.")) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
    }
  };

  return (
    <div ref={rootRef}>
      <div className="categories-hero flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Arquitetura</h1>
          <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Organize seu ecossistema gastronômico em seções lógicas.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-body font-bold text-label uppercase tracking-[0.06em] flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-primary transition-all whitespace-nowrap active:scale-95"
        >
           <Plus size={20} /> NOVA CATEGORIA
        </button>
      </div>

      <div className="categories-panel bg-white rounded-[3rem] border border-slate-50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center gap-6">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Sincronizando categorias...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  <th className="px-10 py-8 text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em]">Sequência</th>
                  <th className="px-10 py-8 text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em]">Nomenclatura</th>
                  <th className="px-10 py-8 text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em]">Inventário</th>
                  <th className="px-10 py-8 text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em]">Status</th>
                  <th className="px-10 py-8 text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em] text-right">Controle</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {categories.map((cat, idx) => (
                    <motion.tr 
                      layout
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={cat.id} 
                      className="categories-row border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                           <GripVertical size={16} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="font-mono font-medium text-slate-950">{(cat.order || idx + 1).toString().padStart(2, '0')}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight">{cat.name}</span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-label font-mono font-medium text-slate-400">
                           {(cat._count?.products || 0).toString().padStart(2, '0')} ITENS
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        {cat.isActive !== false ? (
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-label font-body font-bold text-emerald-600 uppercase tracking-widest">Ativa</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-slate-300" />
                             <span className="text-label font-body font-bold text-slate-400 uppercase tracking-widest">Oculta</span>
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center justify-end gap-3 text-right">
                          <button 
                            onClick={() => {
                              setSelectedCategory(cat);
                              setIsModalOpen(true);
                            }}
                            className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-950 hover:text-white transition-all shadow-sm"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                             <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchCategories}
        category={selectedCategory}
      />
    </div>
  );
}
