"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import { Loader2, Plus, CreditCard, Edit, Trash, Save, X } from "lucide-react";
import toast from "react-hot-toast";

interface Plan {
  id: number;
  name: string;
  tier: string;
  price: number;
  maxProducts: number;
  maxOrders: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    tier: "FREE",
    price: 0,
    maxProducts: 10,
    maxOrders: 100
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
      await api.post("/admin/plans", formData);
      toast.success("Plano criado com sucesso");
      setIsCreating(false);
      setFormData({ name: "", tier: "FREE", price: 0, maxProducts: 10, maxOrders: 100 });
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
      await api.patch(`/admin/plans/${editingPlan.id}`, editingPlan);
      toast.success("Plano atualizado com sucesso");
      setEditingPlan(null);
      loadPlans();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar plano");
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-950 flex items-center gap-3">
            <CreditCard className="text-slate-950" size={32} />
            Gestão de Planos
          </h1>
          <p className="text-slate-500 mt-2">Configure os limites e preços dos planos do sistema.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-slate-950 text-white px-6 py-3 rounded-2xl hover:bg-slate-900 transition-all font-bold uppercase tracking-wider text-xs"
        >
          <Plus size={18} />
          Novo Plano
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
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
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
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
                        type="number"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-100 focus:ring-1 focus:ring-slate-900 outline-none"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
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
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="text-slate-200 hover:text-slate-950 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold font-display uppercase tracking-tight">{plan.name}</h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Preço</span>
                      <span className="text-slate-950 font-bold">R$ {plan.price.toFixed(2)}</span>
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