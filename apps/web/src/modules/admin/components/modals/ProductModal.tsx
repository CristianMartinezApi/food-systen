import { useState, useEffect, useRef } from "react";
import { X, ImagePlus, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { api } from "../../../../core/config/api";
import { formatCurrency } from "../../../../shared/utils";

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
    isActive: true,
    addons: [],
    sizes: [],
    ingredients: []
  });

  const [newAddon, setNewAddon] = useState({ name: "", price: "" });
  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newIngredient, setNewIngredient] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lógica para esconder campos extras em categorias específicas (Bebidas, etc)
  const selectedCategory = categories.find(c => c.id.toString() === formData.categoryId?.toString());
  const isSimpleProduct = selectedCategory?.slug?.toLowerCase().includes('bebida') || 
                          selectedCategory?.name?.toLowerCase().includes('bebida') ||
                          selectedCategory?.name?.toLowerCase().includes('suco') ||
                          selectedCategory?.name?.toLowerCase().includes('cerveja') ||
                          selectedCategory?.name?.toLowerCase().includes('agua') ||
                          selectedCategory?.name?.toLowerCase().includes('água');

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

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        ...product,
        categoryId: product.categoryId?.toString() || "",
        isActive: product.isActive !== undefined ? product.isActive : true,
        addons: product.addons || [],
        sizes: product.sizes || [],
        ingredients: product.ingredients || []
      });
    } else if (isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "" as any,
        categoryId: "",
        image: "",
        isActive: true,
        addons: [],
        sizes: [],
        ingredients: []
      });
    }
  }, [product, isOpen]);

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [...formData.addons, { name: newAddon.name, price: parseFloat(newAddon.price) }]
      });
      setNewAddon({ name: "", price: "" });
    }
  };

  const removeAddon = (index: number) => {
    setFormData({
      ...formData,
      addons: formData.addons.filter((_: any, i: number) => i !== index)
    });
  };

  const addSize = () => {
    if (newSize.name && newSize.price) {
      setFormData({
        ...formData,
        sizes: [...formData.sizes, { name: newSize.name, price: parseFloat(newSize.price) }]
      });
      setNewSize({ name: "", price: "" });
    }
  };

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_: any, i: number) => i !== index)
    });
  };

  const addIngredient = () => {
    if (newIngredient) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, newIngredient]
      });
      setNewIngredient("");
    }
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_: any, i: number) => i !== index)
    });
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
      const { status, ...rest } = formData;
      const payload = {
        ...rest,
        name: formData.name.toUpperCase().trim(),
        price: parseFloat(formData.price) || 0,
        categoryId: parseInt(formData.categoryId),
        addons: formData.addons?.map((a: any) => ({ ...a, name: a.name.toUpperCase().trim() })),
        sizes: formData.sizes?.map((s: any) => ({ ...s, name: s.name.toUpperCase().trim() })),
        ingredients: formData.ingredients?.map((i: string) => i.toUpperCase().trim())
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
    <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
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
                            className="relative w-40 h-40 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/2 transition-all group overflow-hidden"
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

                {!isSimpleProduct && (
                  <>
                    {/* Tamanhos / Variações */}
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanhos / Variações (Opcional)</label>
                        <div className="flex gap-2">
                            <input 
                                value={newSize.name}
                                onChange={(e) => setNewSize({...newSize, name: e.target.value})}
                                placeholder="Nome (Ex: P, M, G, 200g...)"
                                className="flex-1 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                            />
                            <input 
                                type="number"
                                value={newSize.price}
                                onChange={(e) => setNewSize({...newSize, price: e.target.value})}
                                placeholder="Preço R$"
                                className="w-32 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                            />
                            <button 
                                type="button"
                                onClick={addSize}
                                className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.sizes.map((size: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm group">
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{size.name}</p>
                                        <p className="text-[10px] font-bold text-primary">{formatCurrency(size.price)}</p>
                                    </div>
                                    <button type="button" onClick={() => removeSize(idx)} className="text-slate-300 hover:text-rose-500 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Adicionais */}
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionais (Ex: Bacon, Queijo Extra...)</label>
                        <div className="flex gap-2">
                            <input 
                                value={newAddon.name}
                                onChange={(e) => setNewAddon({...newAddon, name: e.target.value})}
                                placeholder="Nome do adicional"
                                className="flex-1 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                            />
                            <input 
                                type="number"
                                value={newAddon.price}
                                onChange={(e) => setNewAddon({...newAddon, price: e.target.value})}
                                placeholder="Preço R$"
                                className="w-32 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                            />
                            <button 
                                type="button"
                                onClick={addAddon}
                                className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.addons.map((addon: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{addon.name}</p>
                                        <p className="text-[10px] font-bold text-emerald-500">+{formatCurrency(addon.price)}</p>
                                    </div>
                                    <button type="button" onClick={() => removeAddon(idx)} className="text-slate-300 hover:text-rose-500 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ingredientes para Remoção */}
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ingredientes (Permite que o cliente remova no pedido)</label>
                        <div className="flex gap-2">
                            <input 
                                value={newIngredient}
                                onChange={(e) => setNewIngredient(e.target.value)}
                                placeholder="Ex: Cebola, Picles, Molho Especial..."
                                className="flex-1 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                            />
                            <button 
                                type="button"
                                onClick={addIngredient}
                                className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.ingredients.map((ing: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{ing}</span>
                                    <button type="button" onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-rose-500 transition-all">
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                  </>
                )}
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
                className="flex-2 h-14 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
            >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {product ? "Salvar Alterações" : "Cadastrar Produto"}
            </button>
        </div>
      </div>
    </div>
  );
}
