import { useState, useEffect } from "react";
import { X, Save, Loader2, Plus, Minus } from "lucide-react";
import { api } from "../../../../core/config/api";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  category?: any;
}

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function CategoryModal({ isOpen, onClose, onSave, category }: CategoryModalProps) {
  const [formData, setFormData] = useState<any>({
    name: "",
    slug: "",
    order: 0,
    isActive: true,
    typeMontagem: "padrao"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Buscar todas as categorias quando modal abre
  useEffect(() => {
    if (isOpen) {
      setLoadingCategories(true);
      api.get('/categories')
        .then(data => {
          const sorted = Array.isArray(data) ? [...data].sort((a, b) => a.order - b.order) : [];
          setAllCategories(sorted);
        })
        .catch(err => console.error('Erro ao buscar categorias:', err))
        .finally(() => setLoadingCategories(false));
    }
  }, [isOpen]);

  // Calcular próxima ordem sugerida
  const nextSuggestedOrder = allCategories.length > 0 
    ? Math.max(...allCategories.map(c => c.order || 0)) + 1
    : 1;

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        slug: category.slug || "",
        order: category.order || 0,
        isActive: category.isActive !== undefined ? category.isActive : true,
        typeMontagem: category.typeMontagem || "padrao"
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        order: nextSuggestedOrder,
        isActive: true,
        typeMontagem: "padrao"
      });
    }
  }, [category, isOpen, nextSuggestedOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const slug = normalizeSlug(formData.slug || formData.name);
      const payload = { 
        name: formData.name.toUpperCase().trim(),
        slug,
        order: formData.order,
        isActive: formData.isActive,
        typeMontagem: formData.typeMontagem
      };

      if (category?.id) {
        await api.patch(`/categories/${category.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      alert(error?.message || "Erro ao salvar categoria. Verifique os dados e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex shrink-0 items-center justify-between p-8 border-b border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {category ? "Editar Categoria" : "Nova Categoria"}
            </h2>
            <button 
                onClick={onClose}
                className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
                <X size={24} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria</label>
                <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas"
                    className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordem (Exibição)</label>
                
                {/* Lista de categorias existentes */}
                {loadingCategories ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-sm">Carregando...</div>
                ) : allCategories.length > 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categorias existentes:</p>
                        <div className="space-y-1.5">
                            {allCategories.map((cat, idx) => (
                                <div 
                                    key={cat.id} 
                                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                                        formData.order === cat.order 
                                            ? 'bg-rose-100 border border-rose-200' 
                                            : 'bg-white border border-slate-200'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                        formData.order === cat.order
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {cat.order}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 flex-1">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Spinner para ordem */}
                <div className="flex gap-2 items-center">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, order: Math.max(0, formData.order - 1)})}
                        className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-950 transition-all"
                    >
                        <Minus size={20} />
                    </button>
                    <input 
                        type="number"
                        min="0"
                        value={formData.order}
                        onChange={(e) => setFormData({...formData, order: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="flex-1 h-12 px-5 bg-slate-50 border-2 border-transparent focus:border-rose-500/20 focus:bg-white rounded-2xl transition-all font-black text-center text-slate-700 outline-none text-xl"
                    />
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, order: formData.order + 1})}
                        className="w-12 h-12 bg-rose-600 text-white rounded-xl flex items-center justify-center hover:bg-rose-700 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <p className="text-xs text-slate-500">Sugestão próxima: <span className="font-black text-slate-700">{nextSuggestedOrder}</span></p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de montagem</label>
                <select
                    value={formData.typeMontagem || "padrao"}
                    onChange={(e) => setFormData({...formData, typeMontagem: e.target.value})}
                    className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                >
                    <option value="padrao">Padrão (adicionais livres)</option>
                    <option value="guiada_por_etapas">Guiada por etapas (customizável por produto)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  {formData.typeMontagem === "guiada_por_etapas" 
                    ? "Cada produto pode ter suas próprias etapas e opções de montagem."
                    : "Os clientes podem adicionar adicionais livremente."}
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                        <button 
                        type="button"
                        onClick={() => setFormData({...formData, isActive: true})}
                        className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isActive ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}
                        >
                        Ativo
                        </button>
                        <button 
                        type="button"
                        onClick={() => setFormData({...formData, isActive: false})}
                        className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.isActive ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
                        >
                        Inativo
                        </button>
                </div>
            </div>
        </form>

        <div className="shrink-0 p-8 bg-slate-50 flex gap-4">
            <button 
                type="button"
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
            >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {category ? "Salvar Alterações" : "Criar Categoria"}
            </button>
        </div>
      </div>
    </div>
  );
}
