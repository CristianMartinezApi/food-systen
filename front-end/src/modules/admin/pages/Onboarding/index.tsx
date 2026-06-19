"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../core/config/api";
import { ArrowRight, Loader2, Store, ShieldCheck, Instagram, Facebook, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [tokenExists, setTokenExists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: "",
    corporateName: "",
    cnpj: "",
    slug: "",
    description: "",
    phone: "",
    instagram: "",
    facebook: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("@FoodSystem:token");
    const userData = localStorage.getItem("@FoodSystem:user");
    setTokenExists(Boolean(token));

    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || "");
      } catch {
        setUserRole("");
      }
    }
  }, []);

  const updateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    setFormData((prev) => ({ ...prev, restaurantName: name, slug }));
  };

  const formatCnpjInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const response = await api.post("/onboarding/create-store", formData);

      localStorage.setItem("@FoodSystem:token", response.token);
      localStorage.setItem("@FoodSystem:user", JSON.stringify(response.user));
      localStorage.setItem("@FoodSystem:restaurant", JSON.stringify(response.restaurant));

      toast.success("Loja criada com sucesso");
      router.push("/admin");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar a loja");
    } finally {
      setIsSaving(false);
    }
  };

  if (!tokenExists) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="system-hero-band w-full max-w-xl rounded-[3rem] p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-white flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">Acesso necessário</h1>
          <p className="text-slate-500 mt-4">Seu login ainda não foi realizado. Entre no painel para criar a sua loja depois que o super admin liberar sua conta.</p>
          <button onClick={() => router.push("/admin/login")} className="mt-8 h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-tight inline-flex items-center gap-3">
            Ir para o login <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (userRole === "SUPER_ADMIN") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-950">Área do cliente</h1>
          <p className="text-slate-500 mt-4">Este onboarding é destinado ao cliente aprovado. Como super admin, use o painel de clientes para cadastrar e liberar acessos.</p>
          <button onClick={() => router.push("/admin/clients")} className="mt-8 h-14 px-8 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-tight inline-flex items-center gap-3">
            Ir para clientes <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 py-12">
      <div className="system-hero-band w-full max-w-2xl rounded-[3rem] p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
            <Store size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Onboarding aprovado</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">Criar sua loja</h1>
          </div>
        </div>

        <form onSubmit={handleCreateStore} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <input required value={formData.restaurantName} onChange={(e) => updateSlug(e.target.value)} placeholder="Nome da loja" className="h-14 rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 outline-none font-medium" />
            <input value={formData.corporateName} onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })} placeholder="Razão social (opcional)" className="h-14 rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 outline-none font-medium" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: formatCnpjInput(e.target.value) })} placeholder="CNPJ (opcional)" className="h-14 rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 outline-none font-medium" />
            <input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="slug-da-loja" className="h-14 rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 outline-none font-medium" />
          </div>

          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição da loja" rows={4} className="w-full rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 py-4 outline-none font-medium resize-none" />
          <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Telefone da loja" className="h-14 w-full rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 px-5 outline-none font-medium" />

          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
                <Instagram size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">Redes sociais da loja</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Preencha apenas o que estiver ativo. No footer, o sistema mostra somente os links preenchidos e transforma o telefone em WhatsApp quando possível.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@seunegocio"
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 pl-11 pr-5 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ml-1">Facebook</label>
                <div className="relative">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/..."
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-transparent focus:border-primary/20 pl-11 pr-5 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.instagram ? (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                  <Instagram size={14} className="text-pink-500" /> Instagram vai para o footer
                </span>
              ) : null}
              {formData.facebook ? (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                  <Facebook size={14} className="text-blue-600" /> Facebook vai para o footer
                </span>
              ) : null}
              {formData.phone ? (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                  <MessageCircle size={14} className="text-emerald-500" /> Telefone pode virar WhatsApp
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-500">
            Ao concluir, o sistema vincula sua conta à loja criada e gera o tenant inicial para a operação.
          </div>

          <button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-tight flex items-center justify-center gap-3 disabled:opacity-60">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            Criar loja e continuar
          </button>
        </form>
      </div>
    </div>
  );
}
