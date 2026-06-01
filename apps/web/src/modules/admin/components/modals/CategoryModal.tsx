import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { api } from "../../../../core/config/api";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  category?: any;
}

export function CategoryModal({ isOpen, onClose, onSave, category }: CategoryModalProps) {
  const [formData, setFormData] = useState<any>({
    name: "",
    slug: "",
    order: 0,
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        ...category,
        isActive: category.isActive !== undefined ? category.isActive : true
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        order: 0,
        isActive: true
      });
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const { status, ...rest } = formData; // Remove status if it exists from older data
      const payload = { ...rest, slug };

      if (category?.id) {
        await api.patch(`/categories/${category.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar categoria:", error);
      alert(error.response?.data?.error || "Erro ao salvar categoria. Verifique se o nome já existe.");
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
      
      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                <input 
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                    className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                />
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

        <div className="p-8 bg-slate-50 flex gap-4">
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
