"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/core/config/api";
import { uploadImageAsset } from "@/core/services/assets";
import { compressImageFileToDataUrl } from "@/shared/utils/image";
import { formatCurrency, normalizeAssetUrl, parseMoneyInput, formatMoneyInputRealtime } from "@/shared/utils";
import { Loader2, Plus, Package, Edit, Trash, Save, X, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

type ComboItemForm = { productId: number; quantity: number };

const emptyForm = {
  name: "",
  description: "",
  price: "0,00",
  categoryId: "",
  image: "",
  isActive: true,
  items: [] as ComboItemForm[],
};

export default function CombosPage() {
  const [combos, setCombos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [pendingImageUpload, setPendingImageUpload] = useState<string | null>(null);

  const componentOptions = useMemo(() => products.filter((p) => !p.isCombo), [products]);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [combosData, categoriesData, productsData] = await Promise.all([
        api.get("/combos"),
        api.get("/categories"),
        api.get("/products"),
      ]);
      setCombos(combosData || []);
      setCategories(categoriesData || []);
      setProducts(productsData || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar combos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setPendingImageUpload(null);
    setIsModalOpen(true);
  };

  const openEditModal = (combo: any) => {
    setEditingId(combo.id);
    setFormData({
      name: combo.name,
      description: combo.description || "",
      price: String(combo.price).replace(".", ","),
      categoryId: String(combo.categoryId),
      image: combo.image || "",
      isActive: combo.isActive,
      items: (combo.comboItems || []).map((ci: any) => ({ productId: ci.componentProduct.id, quantity: ci.quantity })),
    });
    setPendingImageUpload(null);
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await compressImageFileToDataUrl(file, { maxWidth: 900, maxHeight: 900, quality: 0.72, mimeType: "image/webp" });
      setPendingImageUpload(optimized);
      setFormData((prev) => ({ ...prev, image: optimized }));
    } catch (error) {
      console.error("Erro ao otimizar imagem:", error);
      toast.error("Não foi possível processar a imagem.");
    }
  };

  const addItemRow = () => {
    if (componentOptions.length === 0) return;
    setFormData((prev) => ({ ...prev, items: [...prev.items, { productId: componentOptions[0].id, quantity: 1 }] }));
  };

  const updateItemRow = (index: number, patch: Partial<ComboItemForm>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeItemRow = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error("Selecione uma categoria para o combo.");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Adicione ao menos 1 produto ao combo.");
      return;
    }

    setIsSaving(true);
    try {
      let imageValue = formData.image;
      if (pendingImageUpload && pendingImageUpload.startsWith("data:image/")) {
        try {
          imageValue = await uploadImageAsset(pendingImageUpload, "combos");
        } catch (uploadError) {
          console.warn("Falha ao enviar imagem, mantendo base64:", uploadError);
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseMoneyInput(formData.price),
        categoryId: Number(formData.categoryId),
        image: imageValue,
        isActive: formData.isActive,
        items: formData.items,
      };

      if (editingId) {
        await api.patch(`/combos/${editingId}`, payload);
        toast.success("Combo atualizado com sucesso");
      } else {
        await api.post("/combos", payload);
        toast.success("Combo criado com sucesso");
      }

      setIsModalOpen(false);
      loadAll();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar combo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (combo: any) => {
    if (!window.confirm(`Excluir o combo "${combo.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/combos/${combo.id}`);
      toast.success("Combo excluído com sucesso");
      loadAll();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir combo");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <div className="ops-workspace mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Cardápio"
        title="Combos"
        description="Produtos combinados com preço único, montados por você."
        status={<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{combos.length} combos</span>}
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-primary"
          >
            <Plus size={16} />
            Novo combo
          </button>
        }
      />

      {combos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Package size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Nenhum combo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => (
            <div key={combo.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex h-36 items-center justify-center bg-slate-50">
                {combo.image ? (
                  <img src={normalizeAssetUrl(combo.image)} alt={combo.name} className="h-full w-full object-cover" />
                ) : (
                  <Package size={36} className="text-slate-200" />
                )}
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-950 uppercase tracking-tight">{combo.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${combo.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    {combo.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(combo.price)}</p>
                <div className="mt-3 space-y-1 border-t border-slate-50 pt-3">
                  {(combo.comboItems || []).map((ci: any) => (
                    <p key={ci.id} className="text-xs text-slate-500">
                      {ci.quantity}x {ci.componentProduct.name}
                    </p>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEditModal(combo)}
                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(combo)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                    title="Excluir combo"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display">{editingId ? "Editar combo" : "Novo combo"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-4">
                <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                  {formData.image ? (
                    <img src={normalizeAssetUrl(formData.image)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus size={22} className="text-slate-300" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Nome do combo</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Ex: Combo Família"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Preço do combo (R$)</label>
                  <input
                    required
                    inputMode="decimal"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: formatMoneyInputRealtime(e.target.value) })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Categoria</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Combo ativo no cardápio
              </label>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-slate-400">Produtos do combo</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    disabled={componentOptions.length === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Plus size={14} /> Adicionar produto
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum produto adicionado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemRow(index, { productId: Number(e.target.value) })}
                          className="flex-1 rounded-lg border border-slate-100 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          {componentOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="w-20 rounded-lg border border-slate-100 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingId ? "Salvar alterações" : "Criar combo"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
