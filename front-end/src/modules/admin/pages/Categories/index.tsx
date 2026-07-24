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
import { AdminPageHeader, SystemPanel } from "../../components/layout/AdminPageHeader";

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
    <div className="space-y-4">
      <div className="categories-hero">
        <AdminPageHeader
          eyebrow="Cardápio"
          title="Categorias"
          description="Organize os grupos utilizados na navegação do cardápio."
          status={<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{categories.length} cadastradas</span>}
          actions={
        <button 
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary"
        >
           <Plus size={16} /> Nova categoria
        </button>
          }
        />
      </div>

      <SystemPanel className="categories-panel">
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
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Ordem</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Categoria</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Produtos</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Ações</th>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                           <GripVertical size={16} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="font-mono font-medium text-slate-950">{(cat.order || idx + 1).toString().padStart(2, '0')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight">{cat.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-label font-mono font-medium text-slate-400">
                           {(cat._count?.products || 0).toString().padStart(2, '0')} ITENS
                        </span>
                      </td>
                      <td className="px-5 py-4">
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
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3 text-right">
                          <button 
                            onClick={() => {
                              setSelectedCategory(cat);
                              setIsModalOpen(true);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-950 hover:text-white"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-rose-500 hover:text-white"
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
      </SystemPanel>

      <CategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchCategories}
        category={selectedCategory}
      />
    </div>
  );
}
