"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import { Loader2, Plus, CreditCard, Edit, Trash, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency, normalizeMoneyInput, parseMoneyInput, formatMoneyInputRealtime } from "@/shared/utils";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

interface Plan {
  id: number;
  name: string;
  tier: string;
  price: number;
  maxProducts: number;
  maxOrders: number;
  restaurantsCount?: number;
  restaurants?: Array<{
    id: number;
    name: string;
    slug: string;
    ownerName?: string | null;
    ownerEmail?: string | null;
  }>;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingPriceInput, setEditingPriceInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "Start",
    tier: "BASIC",
    price: "99,00",
    maxProducts: 120,
    maxOrders: 900
  });

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/admin/plans");
      setPlans(data || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar planos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.post("/admin/plans", {
        ...formData,
        price: parseMoneyInput(formData.price),
      });
      toast.success("Plano criado com sucesso");
      setIsCreating(false);
      setFormData({ name: "Start", tier: "BASIC", price: "99,00", maxProducts: 120, maxOrders: 900 });
      loadPlans();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar plano");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setIsSaving(true);
      await api.patch(`/admin/plans/${editingPlan.id}`, {
        ...editingPlan,
        price: parseMoneyInput(editingPriceInput),
      });
      toast.success("Plano atualizado com sucesso");
      setEditingPlan(null);
      setEditingPriceInput("");
      loadPlans();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar plano");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    const confirmed = window.confirm(`Excluir o plano ${plan.name}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      setIsSaving(true);
      await api.delete(`/admin/plans/${plan.id}`);
      toast.success("Plano excluído com sucesso");
      if (editingPlan?.id === plan.id) {
        setEditingPlan(null);
        setEditingPriceInput("");
      }
      await loadPlans();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir plano");
    } finally {
      setIsSaving(false);
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
    <div className="ops-workspace mx-auto max-w-7xl space-y-3">
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Gestão de planos"
        description="Configure preços e limites comerciais disponíveis para as lojas."
        status={<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{plans.length} planos</span>}
        actions={
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-primary"
        >
          <Plus size={16} />
          Novo plano
        </button>
        }
      />

      {isCreating && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display">Criar Novo Plano</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Nome do Plano</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                placeholder="Ex: Pro Plus"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Tier (Identificador)</label>
              <input
                type="text"
                required
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                placeholder="Ex: PRO"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Preço Mensal (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: formatMoneyInputRealtime(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Limite de Produtos</label>
              <input
                type="number"
                required
                value={formData.maxProducts}
                onChange={(e) => setFormData({ ...formData, maxProducts: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400">Limite de Pedidos</label>
              <input
                type="number"
                required
                value={formData.maxOrders}
                onChange={(e) => setFormData({ ...formData, maxOrders: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-slate-950 text-white px-6 py-3 rounded-xl hover:bg-slate-900 transition-all font-bold disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                Criar Plano
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-950 mt-10">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              {editingPlan?.id === plan.id ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Nome</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Preço</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                        value={editingPriceInput}
                        onChange={(e) => setEditingPriceInput(formatMoneyInputRealtime(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Tier</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                        value={editingPlan.tier}
                        onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Produtos</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                        value={editingPlan.maxProducts}
                        onChange={(e) => setEditingPlan({ ...editingPlan, maxProducts: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Pedidos</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                        value={editingPlan.maxOrders}
                        onChange={(e) => setEditingPlan({ ...editingPlan, maxOrders: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-slate-950 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPlan(null)}
                      className="flex-1 bg-slate-50 text-slate-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-100"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-slate-50 text-slate-950 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                      {plan.tier}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setEditingPriceInput(String(plan.price).replace(".", ","));
                        }}
                        className="text-slate-200 hover:text-slate-950 transition-colors"
                        title="Editar plano"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        disabled={isSaving}
                        className="text-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                        title="Excluir plano"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold font-display uppercase tracking-tight">{plan.name}</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Preço</span>
                      <span className="text-slate-950 font-bold">{formatCurrency(plan.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Produtos</span>
                      <span className={`font-bold ${plan.maxProducts >= 1000 ? 'text-primary' : 'text-slate-950'}`}>
                        {plan.maxProducts >= 999999 ? 'Ilimitado' : plan.maxProducts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pedidos</span>
                      <span className="text-slate-950 font-bold">{plan.maxOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lojas</span>
                      <span className="text-slate-950 font-bold">{plan.restaurantsCount ?? plan.restaurants?.length ?? 0}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Quem está nesse plano</p>
                    <div className="mt-2 space-y-2 max-h-40 overflow-auto pr-1">
                      {(plan.restaurants && plan.restaurants.length > 0) ? (
                        plan.restaurants.map((restaurant) => (
                          <div key={restaurant.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                            <p className="text-xs font-bold text-slate-900 truncate">{restaurant.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {restaurant.ownerName || "Responsável não definido"}
                              {restaurant.ownerEmail ? ` (${restaurant.ownerEmail})` : ""}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">Nenhuma loja vinculada a este plano.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
