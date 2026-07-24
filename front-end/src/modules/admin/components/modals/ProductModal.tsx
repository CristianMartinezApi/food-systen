import { useState, useEffect, useRef } from "react";
import { X, ImagePlus, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { api } from "../../../../core/config/api";
import { uploadImageAsset } from "../../../../core/services/assets";
import { formatCurrency, cn, normalizeMoneyInput, parseMoneyInput, toMoneyInputValue, formatMoneyInputRealtime } from "../../../../shared/utils";
import { clampDiscountPercent, getProductDiscountedPrice } from "../../../../shared/utils/product";
import { compressImageFileToDataUrl } from "../../../../shared/utils/image";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: any;
}

const getGuidedGroupId = (group: any) =>
  String(group?.id || group?.name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    price: 0,
    discountPercent: 0,
    categoryId: "",
    image: "",
    isActive: true,
    stockQuantity: 0,
    trackStock: false,
    addons: [],
    usesGuidedAssembly: false,
    guidedAssemblyConfig: [],
    sizes: [],
    ingredients: []
  });

  const [newAddon, setNewAddon] = useState({ name: "", price: "" });
  const [newSize, setNewSize] = useState({ name: "", price: "" });
  const [newIngredient, setNewIngredient] = useState("");
  const [newCustomizationOption, setNewCustomizationOption] = useState({ name: "", price: "", step: "base" });
  const [newGuidedGroup, setNewGuidedGroup] = useState({ name: "", minSelections: 1, maxSelections: 1 });
  const [newGroupOption, setNewGroupOption] = useState({ name: "", price: "", groupId: "" });

  const [categories, setCategories] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [pendingImageUpload, setPendingImageUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lógica para esconder campos extras em categorias específicas (Bebidas, etc)
  const selectedCategory = categories.find(c => c.id.toString() === formData.categoryId?.toString());
  const isSimpleProduct = selectedCategory?.slug?.toLowerCase().includes('bebida') ||
    selectedCategory?.name?.toLowerCase().includes('bebida') ||
    selectedCategory?.name?.toLowerCase().includes('suco') ||
    selectedCategory?.name?.toLowerCase().includes('cerveja') ||
    selectedCategory?.name?.toLowerCase().includes('agua') ||
    selectedCategory?.name?.toLowerCase().includes('água');
  const isGuidedAssemblyCategory = selectedCategory?.typeMontagem === 'guiada_por_etapas';
  const categoryGuidedGroups = Array.isArray(selectedCategory?.guidedAssemblyConfig)
    ? selectedCategory.guidedAssemblyConfig.filter((group: any) => group?.name)
    : [];
  const guidedGroupsSource = Array.isArray(formData.guidedAssemblyConfig) && formData.guidedAssemblyConfig.length > 0
    ? formData.guidedAssemblyConfig
    : categoryGuidedGroups;
  const guidedGroups = guidedGroupsSource.map((group: any, index: number) => ({
    ...group,
    id: getGuidedGroupId(group) || `etapa-${index + 1}`,
    order: group.order || index + 1,
    options: Array.isArray(group.options) ? group.options : []
  }));

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
        stockQuantity: product.stockQuantity || 0,
        trackStock: product.trackStock || false,
        discountPercent: clampDiscountPercent(product.discountPercent),
        price: toMoneyInputValue((Number(product.price) || 0).toFixed(2)),
        addons: product.addons || [],
        usesGuidedAssembly: product.usesGuidedAssembly || false,
        guidedAssemblyConfig: Array.isArray(product.guidedAssemblyConfig) ? product.guidedAssemblyConfig : [],
        sizes: product.sizes || [],
        ingredients: product.ingredients || []
      });
      setPendingImageUpload(null);
    } else if (isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "0,00",
        stockQuantity: 0,
        trackStock: false,
        discountPercent: 0,
        categoryId: "",
        image: "",
        isActive: true,
        addons: [],
        usesGuidedAssembly: false,
        guidedAssemblyConfig: [],
        sizes: [],
        ingredients: []
      });
      setPendingImageUpload(null);
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCategory || !isGuidedAssemblyCategory) return;

    const hasGuidedConfig = Array.isArray(formData.guidedAssemblyConfig) && formData.guidedAssemblyConfig.length > 0;
    if (hasGuidedConfig) {
      if (!newCustomizationOption.step) {
        setNewCustomizationOption((prev) => ({ ...prev, step: getGuidedGroupId(formData.guidedAssemblyConfig[0]) }));
      }
      return;
    }

    if (categoryGuidedGroups.length === 0) {
      // Nenhuma etapa na categoria - deixa vazio para o usuário configurar
      setFormData((prev: any) => ({
        ...prev,
        usesGuidedAssembly: false,
        guidedAssemblyConfig: [],
        sizes: [],
        ingredients: []
      }));
      return;
    }

    const initialGroups = categoryGuidedGroups.map((group: any, index: number) => ({
      ...group,
      id: getGuidedGroupId(group) || `etapa-${index + 1}`,
      order: group.order || index + 1,
      options: Array.isArray(group.options) ? group.options : []
    }));

    setFormData((prev: any) => ({
      ...prev,
      usesGuidedAssembly: true,
      guidedAssemblyConfig: initialGroups,
      sizes: [],
      ingredients: []
    }));
    setNewCustomizationOption((prev) => ({ ...prev, step: initialGroups[0]?.id || `etapa-1` }));
  }, [isOpen, selectedCategory?.id, isGuidedAssemblyCategory]);

  const discountPercent = clampDiscountPercent(formData.discountPercent);
  const basePrice = parseMoneyInput(formData.price) || 0;
  const finalPrice = getProductDiscountedPrice(basePrice, discountPercent);

  const addAddon = () => {
    if (newAddon.name && newAddon.price) {
      setFormData({
        ...formData,
        addons: [...formData.addons, { name: newAddon.name, price: parseMoneyInput(newAddon.price) }]
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
        sizes: [...formData.sizes, { name: newSize.name, price: parseMoneyInput(newSize.price) }]
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

  const addCustomizationOption = () => {
    if (!newCustomizationOption.name || !newCustomizationOption.price) return;

    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: guidedGroups.map((group: any) => {
        if (String(group.id) !== String(newCustomizationOption.step)) return group;

        return {
          ...group,
          options: [
            ...(group.options || []),
            {
              id: `${group.id}-${Date.now()}`,
              name: newCustomizationOption.name,
              price: parseMoneyInput(newCustomizationOption.price),
            }
          ]
        };
      })
    }));
    setNewCustomizationOption({ name: "", price: "", step: newCustomizationOption.step });
  };

  const removeCustomizationOption = (groupId: string, optionIndex: number) => {
    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: guidedGroups.map((group: any) => {
        if (String(group.id) !== String(groupId)) return group;

        return {
          ...group,
          options: (group.options || []).filter((_: any, i: number) => i !== optionIndex)
        };
      })
    }));
  };

  const addGuidedGroup = () => {
    if (!newGuidedGroup.name.trim()) return;

    const newGroup = {
      id: `etapa-${Date.now()}`,
      name: newGuidedGroup.name.trim(),
      order: (formData.guidedAssemblyConfig?.length || 0) + 1,
      minSelections: newGuidedGroup.minSelections,
      maxSelections: newGuidedGroup.maxSelections,
      options: []
    };

    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: [...(prev.guidedAssemblyConfig || []), newGroup]
    }));

    setNewGuidedGroup({ name: "", minSelections: 1, maxSelections: 1 });
  };

  const removeGuidedGroup = (groupId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: (prev.guidedAssemblyConfig || []).filter((g: any) => g.id !== groupId)
    }));
  };

  const updateGuidedGroup = (groupId: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: (prev.guidedAssemblyConfig || []).map((g: any) =>
        g.id === groupId ? { ...g, [field]: value } : g
      )
    }));
  };

  const addGroupOption = (groupId: string) => {
    if (!newGroupOption.name.trim() || !newGroupOption.price) return;

    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: (prev.guidedAssemblyConfig || []).map((g: any) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: [
            ...(g.options || []),
            {
              id: `opt-${Date.now()}`,
              name: newGroupOption.name.trim().toUpperCase(),
              price: parseMoneyInput(newGroupOption.price)
            }
          ]
        };
      })
    }));

    setNewGroupOption({ name: "", price: "", groupId: "" });
  };

  const removeGroupOption = (groupId: string, optionIndex: number) => {
    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: (prev.guidedAssemblyConfig || []).map((g: any) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: (g.options || []).filter((_: any, i: number) => i !== optionIndex)
        };
      })
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimizedImage = await compressImageFileToDataUrl(file, {
          maxWidth: 900,
          maxHeight: 900,
          quality: 0.72,
          mimeType: 'image/webp',
        });

        // Preview imediato sem depender da disponibilidade do storage no meio da edição.
        setPendingImageUpload(optimizedImage);
        setFormData((prev: any) => ({ ...prev, image: optimizedImage }));
      } catch (error) {
        console.error("Erro ao otimizar imagem:", error);
        alert("Não foi possível processar a imagem. Tente outro arquivo.");
      }
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
      let imageValue = formData.image;

      if (pendingImageUpload && pendingImageUpload.startsWith('data:image/')) {
        try {
          imageValue = await uploadImageAsset(pendingImageUpload, 'products');
        } catch (uploadError) {
          console.warn('Falha ao enviar imagem para storage, mantendo base64:', uploadError);
        }
      }

      const { status, ...rest } = formData;
      const payload = {
        ...rest,
        image: imageValue,
        name: formData.name.toUpperCase().trim(),
        price: parseMoneyInput(formData.price) || 0,
        categoryId: parseInt(formData.categoryId),
        usesGuidedAssembly: isGuidedAssemblyCategory,
        guidedAssemblyConfig: isGuidedAssemblyCategory ? guidedGroups.map((group: any) => ({
          ...group,
          name: group.name,
          options: (group.options || []).map((option: any) => ({
            ...option,
            name: option.name.toUpperCase().trim(),
            price: Number(option.price || 0)
          }))
        })) : [],
        addons: isGuidedAssemblyCategory ? [] : formData.addons?.map((a: any) => ({ ...a, name: a.name.toUpperCase().trim() })),
        sizes: formData.sizes?.map((s: any) => ({ ...s, name: s.name.toUpperCase().trim() })),
        ingredients: isGuidedAssemblyCategory ? [] : formData.ingredients?.map((i: string) => i.toUpperCase().trim()),
        discountPercent: discountPercent
      };

      if (product?.id) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setPendingImageUpload(null);
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

      <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">
            {product ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[72vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Upload de Imagem */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Imagem do Produto</label>
              <div className="flex items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-primary/40"
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Smash Burger Duplo"
                className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({
                  ...formData,
                  categoryId: e.target.value,
                  usesGuidedAssembly: false,
                  guidedAssemblyConfig: []
                })}
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
                type="text"
                inputMode="decimal"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: formatMoneyInputRealtime(e.target.value) })}
                placeholder="0,00"
                className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gerenciar Estoque?</label>
              <div className="flex items-center gap-4 h-14">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, trackStock: !formData.trackStock })}
                  className={cn(
                    "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    formData.trackStock ? "bg-primary text-white shadow-lg" : "bg-slate-50 text-slate-400"
                  )}
                >
                  {formData.trackStock ? "Ativado" : "Desativado"}
                </button>
                {formData.trackStock && (
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    placeholder="Qtd"
                    className="flex-1 h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desconto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                placeholder="0"
                className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
              />
            </div>

            <div className="md:col-span-2 rounded-3xl border border-slate-100 bg-slate-50 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço original</p>
                <p className="font-mono font-bold text-slate-900 text-xl mt-1">{formatCurrency(basePrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço final</p>
                <p className="font-mono font-bold text-primary text-xl mt-1">{formatCurrency(finalPrice)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={`flex-1 h-12 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isActive ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: false })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os ingredientes e detalhes do produto..."
                className="w-full h-32 p-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none resize-none"
              />
            </div>

            {isGuidedAssemblyCategory && (
              <div className="md:col-span-2 space-y-5 rounded-3xl border border-amber-200 bg-amber-50/80 p-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montagem por Etapas</label>
                  <p className="text-xs text-slate-500 mt-2">Crie as etapas e opções para seu produto. Ex: Base, Queijo, Complemento.</p>
                </div>

                {/* Adicionar Nova Etapa */}
                <div className="rounded-2xl border border-amber-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nova Etapa</p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] gap-2">
                    <input
                      value={newGuidedGroup.name}
                      onChange={(e) => setNewGuidedGroup({ ...newGuidedGroup, name: e.target.value })}
                      placeholder="Nome (ex: Base, Queijo, Complemento)"
                      className="h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-amber-100"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newGuidedGroup.minSelections}
                      onChange={(e) => setNewGuidedGroup({ ...newGuidedGroup, minSelections: parseInt(e.target.value) || 0 })}
                      placeholder="Min"
                      className="h-12 px-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-amber-100 text-center"
                    />
                    <input
                      type="number"
                      min="1"
                      value={newGuidedGroup.maxSelections}
                      onChange={(e) => setNewGuidedGroup({ ...newGuidedGroup, maxSelections: parseInt(e.target.value) || 1 })}
                      placeholder="Max"
                      className="h-12 px-3 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-amber-100 text-center"
                    />
                    <button
                      type="button"
                      onClick={addGuidedGroup}
                      className="h-12 px-4 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all whitespace-nowrap font-bold text-xs"
                    >
                      <Plus size={18} className="mr-1" /> Etapa
                    </button>
                  </div>
                </div>

                {/* Lista de Etapas Criadas */}
                {formData.guidedAssemblyConfig && formData.guidedAssemblyConfig.length > 0 ? (
                  <div className="space-y-4">
                    {(formData.guidedAssemblyConfig || []).map((group: any, groupIdx: number) => (
                      <div key={group.id} className="rounded-2xl border-2 border-amber-200 bg-white p-4 space-y-3">
                        {/* Header da Etapa */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-amber-100">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-black text-xs">
                              {groupIdx + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_80px_80px] gap-2">
                              <input
                                value={group.name}
                                onChange={(e) => updateGuidedGroup(group.id, "name", e.target.value)}
                                placeholder="Nome da etapa"
                                className="h-10 px-3 bg-amber-50 rounded-lg font-bold text-sm outline-none border border-amber-100"
                              />
                              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                <span>Min:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={group.minSelections ?? 0}
                                  onChange={(e) => updateGuidedGroup(group.id, "minSelections", parseInt(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-12 h-10 px-2 bg-amber-50 rounded-lg font-bold text-sm outline-none border border-amber-100 text-center"
                                  title="Mínimo de seleções"
                                />
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                <span>Max:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={group.maxSelections ?? 1}
                                  onChange={(e) => updateGuidedGroup(group.id, "maxSelections", parseInt(e.target.value) || 1)}
                                  placeholder="1"
                                  className="w-12 h-10 px-2 bg-amber-50 rounded-lg font-bold text-sm outline-none border border-amber-100 text-center"
                                  title="Máximo de seleções"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGuidedGroup(group.id)}
                            className="h-10 w-10 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-all flex items-center justify-center shrink-0"
                            title="Remover etapa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Adicionar Opção à Etapa */}
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Opções desta Etapa</p>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_auto] gap-2">
                            <input
                              value={newGroupOption.groupId === group.id ? newGroupOption.name : ""}
                              onChange={(e) => setNewGroupOption({ ...newGroupOption, groupId: group.id, name: e.target.value })}
                              placeholder="Nome da opção (ex: Carne Moída)"
                              className="h-10 px-3 bg-slate-50 rounded-lg font-bold text-sm outline-none border border-amber-100"
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              value={newGroupOption.groupId === group.id ? newGroupOption.price : ""}
                              onChange={(e) => setNewGroupOption({ ...newGroupOption, groupId: group.id, price: formatMoneyInputRealtime(e.target.value) })}
                              placeholder="Preço R$"
                              className="h-10 px-3 bg-slate-50 rounded-lg font-bold text-sm outline-none border border-amber-100"
                            />
                            <button
                              type="button"
                              onClick={() => addGroupOption(group.id)}
                              className="h-10 w-10 bg-slate-900 text-white rounded-lg hover:bg-black transition-all flex items-center justify-center"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Lista de Opções */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {(group.options || []).length > 0 ? (
                            (group.options || []).map((option: any, optIdx: number) => (
                              <div key={option.id} className="flex items-center gap-2 bg-linear-to-r from-amber-100 to-amber-50 px-3 py-2 rounded-lg border border-amber-200 shadow-sm">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{option.name}</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded">+{formatCurrency(option.price || 0)}</span>
                                <button
                                  type="button"
                                  onClick={() => removeGroupOption(group.id, optIdx)}
                                  className="text-slate-500 hover:text-rose-600 transition-all ml-1"
                                >
                                  <X size={14} strokeWidth={3} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nenhuma opção ainda</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-white/50 p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma etapa cadastrada</p>
                    <p className="text-xs text-slate-500 mt-2">Adicione a primeira etapa acima para começar.</p>
                  </div>
                )}
              </div>
            )}

            {!isSimpleProduct && (
              <>
                {/* Tamanhos / Variações */}
                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanhos / Variações (Opcional)</label>
                  <div className="flex gap-2">
                    <input
                      value={newSize.name}
                      onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
                      placeholder="Nome (Ex: P, M, G, 200g...)"
                      className="flex-1 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newSize.price}
                      onChange={(e) => setNewSize({ ...newSize, price: formatMoneyInputRealtime(e.target.value) })}
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

                {/* Adicionais - Não aparece em montagem por etapas */}
                {!isGuidedAssemblyCategory && (
                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionais (Ex: Bacon, Queijo Extra...)</label>
                  <div className="flex gap-2">
                    <input
                      value={newAddon.name}
                      onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                      placeholder="Nome do adicional"
                      className="flex-1 h-12 px-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-primary/10"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newAddon.price}
                      onChange={(e) => setNewAddon({ ...newAddon, price: formatMoneyInputRealtime(e.target.value) })}
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
                )}

                {/* Ingredientes para Remoção - Não aparece em montagem por etapas */}
                {!isGuidedAssemblyCategory && (
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
                )}
              </>
            )}
          </div>
        </form>

        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex h-10 flex-2 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {product ? "Salvar Alterações" : "Cadastrar Produto"}
          </button>
        </div>
      </div>
    </div>
  );
}
