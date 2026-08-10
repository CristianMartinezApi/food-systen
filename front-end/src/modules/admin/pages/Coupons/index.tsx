"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import { formatCurrency, parseMoneyInput, formatMoneyInputRealtime } from "@/shared/utils";
import { Loader2, Plus, Ticket, Edit, Trash, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

type CouponType = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";

const TYPE_LABEL: Record<CouponType, string> = {
  PERCENTAGE: "Percentual",
  FIXED: "Valor fixo",
  FREE_SHIPPING: "Frete grátis",
};

const emptyForm = {
  code: "",
  type: "PERCENTAGE" as CouponType,
  value: "10",
  minOrderValue: "",
  maxUses: "",
  maxUsesPerCustomer: "1",
  expiresAt: "",
  isActive: true,
};

function formatCouponValue(coupon: any) {
  if (coupon.type === "FREE_SHIPPING") return "Frete grátis";
  if (coupon.type === "PERCENTAGE") return `${coupon.value}%`;
  return formatCurrency(coupon.value);
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/coupons");
      setCoupons(data || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar cupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: any) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === "FIXED" ? String(coupon.value).replace(".", ",") : String(coupon.value),
      minOrderValue: coupon.minOrderValue != null ? String(coupon.minOrderValue).replace(".", ",") : "",
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
      maxUsesPerCustomer: String(coupon.maxUsesPerCustomer),
      expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : "",
      isActive: coupon.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        code: formData.code,
        type: formData.type,
        value: formData.type === "FIXED" ? parseMoneyInput(formData.value) : Number(formData.value || 0),
        minOrderValue: formData.minOrderValue ? parseMoneyInput(formData.minOrderValue) : null,
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        maxUsesPerCustomer: Number(formData.maxUsesPerCustomer || 1),
        expiresAt: formData.expiresAt || null,
        isActive: formData.isActive,
      };

      if (editingId) {
        await api.patch(`/coupons/${editingId}`, payload);
        toast.success("Cupom atualizado com sucesso");
      } else {
        await api.post("/coupons", payload);
        toast.success("Cupom criado com sucesso");
      }

      setIsModalOpen(false);
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar cupom");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (coupon: any) => {
    if (!window.confirm(`Excluir o cupom "${coupon.code}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/coupons/${coupon.id}`);
      toast.success("Cupom excluído com sucesso");
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cupom");
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
    <div className="ops-workspace mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Cupons de desconto"
        description="Códigos promocionais com validade e limite de uso."
        status={<span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{coupons.length} cupons</span>}
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-primary"
          >
            <Plus size={16} />
            Novo cupom
          </button>
        }
      />

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Ticket size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Nenhum cupom cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-slate-950">{coupon.code}</td>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[coupon.type as CouponType]}</td>
                  <td className="px-4 py-3 font-bold text-primary">{formatCouponValue(coupon)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {coupon._count?.redemptions ?? 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("pt-BR") : "Sem validade"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${coupon.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {coupon.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(coupon)} className="text-slate-400 hover:text-slate-950" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(coupon)} className="text-rose-300 hover:text-rose-600" title="Excluir">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display">{editingId ? "Editar cupom" : "Novo cupom"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Código</label>
                <input
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-100 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Ex: BEMVINDO10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CouponType })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor fixo (R$)</option>
                    <option value="FREE_SHIPPING">Frete grátis</option>
                  </select>
                </div>
                {formData.type !== "FREE_SHIPPING" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">
                      {formData.type === "PERCENTAGE" ? "Percentual (%)" : "Valor (R$)"}
                    </label>
                    <input
                      required
                      inputMode="decimal"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          value: formData.type === "FIXED" ? formatMoneyInputRealtime(e.target.value) : e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Pedido mínimo (R$)</label>
                  <input
                    inputMode="decimal"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: formatMoneyInputRealtime(e.target.value) })}
                    placeholder="Sem mínimo"
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Validade</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Limite total de usos</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Ilimitado"
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Usos por cliente</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.maxUsesPerCustomer}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerCustomer: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Cupom ativo
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingId ? "Salvar alterações" : "Criar cupom"}
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
