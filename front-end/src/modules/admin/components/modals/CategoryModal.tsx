import { useState, useEffect } from "react";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "../../../../core/config/api";
import { parseMoneyInput } from "../../../../shared/utils";

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
    isActive: true,
    typeMontagem: "padrao",
    guidedAssemblyConfig: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGuidedOption, setNewGuidedOption] = useState({ groupIndex: 0, name: "", price: "" });

  useEffect(() => {
    if (category) {
      setFormData({
        ...category,
        isActive: category.isActive !== undefined ? category.isActive : true,
        guidedAssemblyConfig: category.guidedAssemblyConfig || []
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        order: 0,
        isActive: true,
        typeMontagem: "padrao",
        guidedAssemblyConfig: []
      });
    }
  }, [category, isOpen]);

  const addGuidedGroup = () => {
    const groupName = newGroupName.trim();
    if (!groupName) return;

    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: [
        ...(prev.guidedAssemblyConfig || []),
        {
          name: groupName,
          order: (prev.guidedAssemblyConfig?.length || 0) + 1,
          minSelections: 1,
          maxSelections: 1,
          options: []
        }
      ]
    }));
    setNewGroupName("");
  };

  const updateGuidedGroup = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const nextGroups = [...(prev.guidedAssemblyConfig || [])];
      nextGroups[index] = { ...nextGroups[index], [field]: value };
      return { ...prev, guidedAssemblyConfig: nextGroups };
    });
  };

  const addGuidedOption = (groupIndex: number) => {
    const optionName = newGuidedOption.name.trim();
    if (!optionName || !newGuidedOption.price) return;

    setFormData((prev: any) => {
      const nextGroups = [...(prev.guidedAssemblyConfig || [])];
      nextGroups[groupIndex] = {
        ...nextGroups[groupIndex],
        options: [
          ...(nextGroups[groupIndex]?.options || []),
          {
            name: optionName.toUpperCase().trim(),
            price: parseMoneyInput(newGuidedOption.price) || 0
          }
        ]
      };
      return { ...prev, guidedAssemblyConfig: nextGroups };
    });
    setNewGuidedOption({ groupIndex, name: "", price: "" });
  };

  const removeGuidedGroup = (groupIndex: number) => {
    setFormData((prev: any) => ({
      ...prev,
      guidedAssemblyConfig: (prev.guidedAssemblyConfig || []).filter((_: any, index: number) => index !== groupIndex)
    }));
  };

  const removeGuidedOption = (groupIndex: number, optionIndex: number) => {
    setFormData((prev: any) => {
      const nextGroups = [...(prev.guidedAssemblyConfig || [])];
      nextGroups[groupIndex] = {
        ...nextGroups[groupIndex],
        options: (nextGroups[groupIndex]?.options || []).filter((_: any, index: number) => index !== optionIndex)
      };
      return { ...prev, guidedAssemblyConfig: nextGroups };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const { status, _count, products, ...rest } = formData; // Remove fields derived from the API payload
      const payload = { 
        ...rest, 
        name: formData.name.toUpperCase().trim(),
        slug,
        guidedAssemblyConfig: formData.typeMontagem === "guiada_por_etapas" ? (formData.guidedAssemblyConfig || []) : []
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de montagem</label>
                <select
                    value={formData.typeMontagem || "padrao"}
                    onChange={(e) => setFormData({...formData, typeMontagem: e.target.value})}
                    className="w-full h-14 px-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl transition-all font-bold text-slate-700 outline-none"
                >
                    <option value="padrao">Padrão (adicionais livres)</option>
                    <option value="guiada_por_etapas">Guiada por etapas</option>
                </select>
            </div>

            {formData.typeMontagem === "guiada_por_etapas" && (
              <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configuração da montagem guiada</label>
                    <p className="text-xs text-slate-500 mt-1">Adicione etapas, limites e opções para esse tipo de categoria.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Nome da etapa (ex: Base, Recheio)"
                    className="flex-1 h-12 px-4 bg-white rounded-xl font-bold text-sm outline-none border border-amber-200"
                  />
                  <button
                    type="button"
                    onClick={addGuidedGroup}
                    className="h-12 px-4 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                  >
                    <Plus size={16} />
                    Etapa
                  </button>
                </div>

                <div className="space-y-3">
                  {(formData.guidedAssemblyConfig || []).map((group: any, index: number) => (
                    <div key={`${group.name}-${index}`} className="rounded-2xl border border-amber-200 bg-white p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={group.name || ""}
                          onChange={(e) => updateGuidedGroup(index, "name", e.target.value)}
                          placeholder="Nome da etapa"
                          className="flex-1 h-10 px-3 bg-amber-50 rounded-xl font-bold text-sm outline-none"
                        />
                        <button type="button" onClick={() => removeGuidedGroup(index)} className="text-slate-400 hover:text-rose-500 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Min. seleções
                          <input
                            type="number"
                            min="0"
                            value={group.minSelections ?? 0}
                            onChange={(e) => updateGuidedGroup(index, "minSelections", parseInt(e.target.value) || 0)}
                            className="mt-1 w-full h-10 px-3 bg-amber-50 rounded-xl font-bold text-sm outline-none"
                          />
                        </label>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Max. seleções
                          <input
                            type="number"
                            min="0"
                            value={group.maxSelections ?? 1}
                            onChange={(e) => updateGuidedGroup(index, "maxSelections", parseInt(e.target.value) || 1)}
                            className="mt-1 w-full h-10 px-3 bg-amber-50 rounded-xl font-bold text-sm outline-none"
                          />
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={newGuidedOption.groupIndex === index ? newGuidedOption.name : ""}
                          onChange={(e) => setNewGuidedOption({ ...newGuidedOption, groupIndex: index, name: e.target.value })}
                          placeholder="Nome da opção"
                          className="flex-1 h-10 px-3 bg-amber-50 rounded-xl font-bold text-sm outline-none"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={newGuidedOption.groupIndex === index ? newGuidedOption.price : ""}
                          onChange={(e) => setNewGuidedOption({ ...newGuidedOption, groupIndex: index, price: e.target.value })}
                          placeholder="Preço"
                          className="w-24 h-10 px-3 bg-amber-50 rounded-xl font-bold text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => addGuidedOption(index)}
                          className="h-10 px-3 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(group.options || []).map((option: any, optionIndex: number) => (
                          <div key={`${option.name}-${optionIndex}`} className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{option.name}</span>
                            {option.price ? <span className="text-[10px] font-bold text-emerald-500">+R$ {option.price}</span> : null}
                            <button type="button" onClick={() => removeGuidedOption(index, optionIndex)} className="text-slate-400 hover:text-rose-500 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
