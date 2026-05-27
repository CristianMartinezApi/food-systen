import { useState, useEffect, useRef } from "react";
import { X, ImagePlus, Loader2, Save } from "lucide-react";
import { api } from "../../../../core/config/api";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: any;
}

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    price: 0,
    categoryId: "",
    image: "",
    status: "active"
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        ...product,
        categoryId: product.categoryId?.toString() || ""
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "" as any,
        categoryId: "",
        image: "",
        status: "active"
      });
    }
  }, [product, isOpen]);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data);
      if (data.length > 0 && !formData.categoryId) {
        setFormData((prev: any) => ({ ...prev, categoryId: data[0].id.toString() }));
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    } finally {
      setIsLoadingCats(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      alert("Por favor, selecione uma categoria. Se não houver categorias, crie uma primeiro.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        categoryId: parseInt(formData.categoryId)
      };

      if (product?.id) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      alert(error.response?.data?.error || "Erro ao salvar produto. Verifique os campos e tente novamente.");
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
      
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {product ? "Editar Produto" : "Novo Produto"}
            </h2>
            <button 
                onClick={onClose}
                className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
                <X size={24} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload de Imagem */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Imagem do Produto</label>
                    <div className="flex items-center gap-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-40 h-40 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group overflow-hidden"
                        >
                            {formData.image ? (
                                <>
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <ImagePlus size={24} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="text-slate-200 mb-2" size={40} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Upload</span>
                                </>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-sm font-bold text-slate-700">Selecione uma foto irresistível</p>
                            <p className="text-xs text-slate-400 leading-relaxed">Clique no quadro ao lado para escolher um arquivo. Use fotos quadradas para um melhor resultado.</p>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden" 
                            />
                        </div>
                    </div>
                </div>

                {/* Campos de Texto */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                    <input 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Smash Burger Duplo"
                        className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select 
                        required
                        value={formData.categoryId}
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                        className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none appearance-none disabled:opacity-50"
                    >
                        <option value="" disabled>Selecione uma categoria</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    {categories.length === 0 && !isLoadingCats && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1 uppercase">
                            ⚠️ Nenhuma categoria encontrada. Crie uma primeiro!
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                    <input 
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        placeholder="0,00"
                        className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                         <button 
                            type="button"
                            onClick={() => setFormData({...formData, status: "active"})}
                            className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'active' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}
                         >
                            Ativo
                         </button>
                         <button 
                            type="button"
                            onClick={() => setFormData({...formData, status: "inactive"})}
                            className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'inactive' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
                         >
                            Pausado
                         </button>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                    <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Descreva os ingredientes e detalhes do produto..."
                        className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none resize-none"
                    />
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
                {product ? "Salvar Alterações" : "Cadastrar Produto"}
            </button>
        </div>
      </div>
    </div>
  );
}
