import { useState, useEffect } from "react";
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

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
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Categorias</h1>
          <p className="text-slate-500 font-medium">Organize seu cardápio em seções lógicas.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="h-14 px-8 bg-primary text-white rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
        >
           <Plus size={20} /> NOVA CATEGORIA
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
               <Loader2 className="animate-spin text-primary" size={40} />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando categorias...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordem</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {categories.map((cat, idx) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={cat.id} 
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <GripVertical size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="font-black text-slate-700">#{cat.order || idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Tags size={20} />
                            </div>
                            <span className="font-bold text-slate-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                          {cat.products?.length || 0} Itens
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {cat.isActive ? (
                          <span className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase">
                            <CheckCircle2 size={14} /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase">
                            <XCircle size={14} /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => {
                               setSelectedCategory(cat);
                               setIsModalOpen(true);
                             }}
                             className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all active:scale-95"
                           >
                              <Edit2 size={18} />
                           </button>
                           <button 
                             onClick={() => handleDelete(cat.id)}
                             className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                           >
                              <Trash2 size={18} />
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
    </>
  );
}
