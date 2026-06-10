"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/core/config/api";
import { Loader2, Plus, Shield, Trash, Search, Users, Store, BadgeCheck, CirclePause, Sparkles, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { gsap } from "gsap";
import AdminResetPassword from "../../components/AdminResetPassword";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  isActive?: boolean;
  restaurant?: { id: number; name: string; slug: string } | null;
}

export default function ClientsPage() {
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [restaurantFilter, setRestaurantFilter] = useState<'all'|'active'|'inactive'|'READY'|'IN_PROGRESS'|'PAUSED'|'DENIED'|'PENDING'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => Promise<void> | void;
  }>({ open: false });
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const approvedUsers = users.filter((user) => user.isApproved).length;
  const activeUsers = users.filter((user) => user.isActive !== false).length;
  const activeRestaurants = restaurants.filter((restaurant) => restaurant.isActive).length;
  const pausedRestaurants = restaurants.filter((restaurant) => !restaurant.isActive).length;

  useEffect(() => {
    const userData = localStorage.getItem("@FoodSystem:user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserRole(parsed.role || "");
      } catch {
        setUserRole("");
      }
    }
  }, []);

  const loadUsers = async (p?: number, pp?: number) => {
    const curPage = p ?? page;
    const curPer = pp ?? perPage;
    try {
      setIsLoading(true);
      const q = new URLSearchParams();
      q.set('page', String(curPage));
      q.set('perPage', String(curPer));
      if (search) q.set('search', search);
      if (filter) q.set('filter', filter);
      const resp = await api.get(`/admin/users?${q.toString()}`);
      setUsers(resp.data || []);
      setTotal(resp.total || 0);
      setPage(resp.page || curPage);
      setPerPage(resp.perPage || curPer);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível carregar os clientes");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRestaurants = async (status?: string) => {
    try {
      setIsLoadingRestaurants(true);
      const q = new URLSearchParams();
      const s = status || restaurantFilter;
      if (s && s !== 'all') q.set('status', s);
      const query = q.toString() ? `?${q.toString()}` : '';
      const data = await api.get(`/admin/restaurants${query}`);
      setRestaurants(data || []);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível carregar as lojas");
    }
    finally {
      setIsLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    if (userRole === "SUPER_ADMIN") {
      loadUsers(1, perPage);
      loadRestaurants();
    }
  }, [userRole]);

  useEffect(() => {
    if (!rootRef.current || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".clients-hero", { y: -18, opacity: 0, duration: 0.7 })
        .from(".clients-panel", { y: 24, opacity: 0, duration: 0.75 }, "-=0.25")
        .from(".clients-card", { y: 20, opacity: 0, duration: 0.65, stagger: 0.06 }, "-=0.2");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN') return;
    const t = setTimeout(() => loadUsers(1, perPage), 350);
    return () => clearTimeout(t);
  }, [search, filter]);

  // server-side filtered users are loaded into `users`
  const filteredUsers = users;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.post("/admin/users", formData);
      toast.success("Cliente cadastrado com sucesso");
      setFormData({ name: "", email: "", password: "" });
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await api.patch(`/admin/users/${userId}/approve`, {});
      toast.success("Acesso liberado");
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao liberar acesso");
    }
  };

  const handleEditUser = async (user: AdminUser) => {
    const name = window.prompt('Nome do usuário', user.name);
    if (name === null) return; // cancelado
    const email = window.prompt('Email do usuário', user.email);
    if (email === null) return;

    try {
      await api.patch(`/admin/users/${user.id}`, { name, email });
      toast.success('Usuário atualizado');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Excluir usuário',
      message: 'Excluir usuário? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          toast.success('Usuário excluído');
          await loadUsers();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao excluir usuário');
        }
      },
    });
  };

  const toggleSelect = (id: number) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const selectAll = () => {
    if (selected.length === users.length) setSelected([]);
    else setSelected(users.map((u) => u.id));
  };

  const handleBulkAction = async (action: 'approve' | 'delete') => {
    if (selected.length === 0) return toast('Selecione ao menos um usuário');
    setConfirmState({
      open: true,
      title: 'Confirmar ação em massa',
      message: `Confirmar ${action} de ${selected.length} usuário(s)?`,
      onConfirm: async () => {
        try {
          await api.patch('/admin/users/bulk', { ids: selected, action });
          toast.success('Ação aplicada');
          setSelected([]);
          await loadUsers(page, perPage);
        } catch (error: any) {
          toast.error(error.message || 'Erro ao executar ação em massa');
        }
      },
    });
  };

  const handleApproveRestaurant = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Liberar loja',
      message: 'Confirmar liberação dessa loja?',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/restaurants/${id}/approve`, {});
          toast.success('Loja liberada');
          await loadRestaurants();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao liberar loja');
        }
      },
    });
  };

  const handleDenyRestaurant = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Negar acesso',
      message: 'Confirmar negação de acesso para esta loja?',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/restaurants/${id}/deny`, {});
          toast.success('Acesso negado');
          await loadRestaurants();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao negar acesso');
        }
      },
    });
  };

  const handleDeleteRestaurant = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Excluir loja',
      message: 'Excluir loja? Esta ação é irreversível.',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/restaurants/${id}`);
          toast.success('Loja excluída');
          await loadRestaurants();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao excluir loja');
        }
      },
    });
  };

  const handlePauseRestaurant = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Pausar loja',
      message: 'Tem certeza que deseja pausar esta loja?',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/restaurants/${id}/pause`);
          toast.success('Loja pausada');
          await loadRestaurants();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao pausar');
        }
      },
    });
  };

  const handlePauseUser = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Pausar acesso do usuário',
      message: 'Tem certeza que deseja pausar o acesso deste usuário? Ele não poderá entrar na plataforma.',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${id}/pause`);
          toast.success('Acesso do usuário pausado');
          await loadUsers();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao pausar acesso do usuário');
        }
      },
    });
  };

  const handleActivateUser = async (id: number) => {
    setConfirmState({
      open: true,
      title: 'Ativar acesso do usuário',
      message: 'Deseja ativar o acesso deste usuário?',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${id}/activate`);
          toast.success('Acesso do usuário ativado');
          await loadUsers();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao ativar acesso do usuário');
        }
      },
    });
  };

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded bg-slate-900 text-white flex items-center justify-center"><Shield size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-slate-500">Área restrita ao super admin.</p>
          </div>
        </div>
        <p className="text-slate-600">Seu perfil atual não tem permissão para acessar este painel.</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-8">
      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg">{confirmState.title}</h3>
            <p className="text-sm text-slate-600 mt-2">{confirmState.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmState({ open: false })} className="px-3 py-1 border rounded-full">Cancelar</button>
              <button onClick={async () => { setConfirmState((s)=>({ ...s, open: false })); try { if (confirmState.onConfirm) await confirmState.onConfirm(); } catch (e) { console.error(e); } }} className="px-3 py-1 bg-primary text-white rounded-full">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <div className="clients-hero relative overflow-hidden rounded-[3.5rem] border border-slate-50 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative p-8 md:p-10 flex flex-col gap-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Hub Administrativo</p>
              <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Clientes e Liberações</h1>
              <p className="mt-2 max-w-2xl text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Curadoria de acessos, aprovações e estado operacional das lojas.</p>
            </div>
            <button onClick={() => document.getElementById('create-client')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="h-16 px-10 bg-slate-950 text-white rounded-full font-body font-bold text-label uppercase tracking-[0.06em] flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-primary transition-all whitespace-nowrap active:scale-95">
              <Sparkles size={20} /> Novo cliente
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="clients-card rounded-[2.5rem] border border-slate-50 bg-white/95 p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clientes</span>
                <Users size={16} className="text-primary" />
              </div>
              <div className="mt-3 text-heading-2 font-mono font-bold text-slate-950 tracking-tighter">{total}</div>
              <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">cadastros encontrados</p>
            </div>
            <div className="clients-card rounded-[2.5rem] border border-emerald-100 bg-emerald-50/80 p-5 shadow-sm hover:shadow-2xl hover:shadow-emerald-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Liberados</span>
                <BadgeCheck size={16} className="text-emerald-600" />
              </div>
              <div className="mt-3 text-heading-2 font-mono font-bold text-emerald-700 tracking-tighter">{approvedUsers}</div>
              <p className="text-label font-body font-medium text-emerald-700/80 uppercase tracking-[0.06em]">contas aprovadas</p>
            </div>
            <div className="clients-card rounded-[2.5rem] border border-amber-100 bg-amber-50/80 p-5 shadow-sm hover:shadow-2xl hover:shadow-amber-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Pendentes</span>
                <CirclePause size={16} className="text-amber-600" />
              </div>
              <div className="mt-3 text-heading-2 font-mono font-bold text-amber-700 tracking-tighter">{total - approvedUsers}</div>
              <p className="text-label font-body font-medium text-amber-700/80 uppercase tracking-[0.06em]">aguardando liberação</p>
            </div>
            <div className="clients-card rounded-[2.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lojas</span>
                <Store size={16} className="text-slate-600" />
              </div>
              <div className="mt-3 text-heading-2 font-mono font-bold text-slate-900 tracking-tighter">{activeRestaurants}</div>
              <p className="text-label font-body font-medium text-slate-500 uppercase tracking-[0.06em]">{pausedRestaurants} pausadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] items-start">
        <form id="create-client" onSubmit={handleCreateUser} className="clients-panel rounded-[3rem] border border-slate-50 bg-white p-8 shadow-sm space-y-5 sticky top-6">
          <div>
            <p className="text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Novo cliente</p>
            <h2 className="mt-1 text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Criar acesso</h2>
            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Defina nome, email e senha inicial para liberar o onboarding.</p>
          </div>
          <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do cliente" className="h-16 px-6 rounded-3xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950/5 transition-all font-body font-medium text-slate-600 text-label uppercase tracking-[0.04em] outline-none" />
          <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@cliente.com" className="h-16 px-6 rounded-3xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950/5 transition-all font-body font-medium text-slate-600 text-label uppercase tracking-[0.04em] outline-none" />
          <input required type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Senha inicial" className="h-16 px-6 rounded-3xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-950/5 transition-all font-body font-medium text-slate-600 text-label uppercase tracking-[0.04em] outline-none" />
          <button type="submit" disabled={isSaving} className="h-16 px-10 bg-slate-950 text-white rounded-full font-body font-bold text-label uppercase tracking-[0.06em] flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:bg-primary transition-all whitespace-nowrap active:scale-95 disabled:opacity-60">{isSaving ? <Loader2 className="animate-spin" /> : <><Plus size={14} /> Cadastrar cliente</>}</button>
        </form>

        <div className="clients-panel rounded-[3rem] border border-slate-50 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Clientes</p>
                <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Base de acessos</h2>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{selected.length} selecionado(s)</div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr_0.5fr_0.5fr_auto_auto] clients-filters">
              <div className="flex h-16 items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 px-5 focus-within:border-primary focus-within:bg-white transition-all shadow-inner shadow-slate-50/80">
                <Search size={18} className="text-slate-300" />
                <input placeholder="Buscar nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-label uppercase tracking-[0.04em]" />
              </div>
              <div className="flex h-16 items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 px-5 shadow-inner shadow-slate-50/80">
                <Filter size={18} className="text-slate-300" />
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-label uppercase tracking-[0.04em]">
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="approved">Liberado</option>
                </select>
              </div>
              <button onClick={() => loadUsers(1, perPage)} className="h-16 px-6 rounded-full border border-slate-100 bg-white text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em] transition hover:bg-slate-50 shadow-sm">Buscar</button>
              <button onClick={() => { setSearch(''); setFilter('all'); loadUsers(1, perPage); }} className="h-16 px-6 rounded-full border border-slate-100 bg-white text-label font-body font-bold text-slate-400 uppercase tracking-[0.06em] transition hover:bg-slate-50 shadow-sm">Limpar</button>
              <button onClick={() => { const q = new URLSearchParams(); if (search) q.set('search', search); if (filter) q.set('filter', filter); window.open(`http://localhost:8000/api/admin/users/export?${q.toString()}`, '_blank'); }} className="h-16 px-6 rounded-full bg-slate-950 text-white text-label font-body font-bold uppercase tracking-[0.06em] transition hover:bg-primary shadow-xl shadow-slate-950/20">Exportar CSV</button>
            </div>
          </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[2rem] bg-slate-50 p-4 border border-slate-100">
            <button onClick={selectAll} className="rounded-full border border-slate-100 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{selected.length === filteredUsers.length ? 'Desmarcar tudo' : 'Selecionar tudo'}</button>
            <button onClick={() => handleBulkAction('approve')} className="rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Aprovar selecionados</button>
            <button onClick={() => handleBulkAction('delete')} className="rounded-full bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Excluir selecionados</button>
          </div>

          {isLoading ? <div className="py-10 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Carregando...</div> : filteredUsers.length === 0 ? <div className="py-10 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhum cliente</div> : (
            <div className="mt-4 space-y-4">
              {filteredUsers.map((u) => (
                <div key={u.id} className="clients-card flex flex-col gap-4 rounded-[2.5rem] border border-slate-50 bg-white p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 md:flex-row md:items-center md:justify-between group">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <div>
                      <div className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight leading-tight">{u.name}</div>
                      <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">{u.email}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${u.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{u.isApproved ? 'Liberado' : 'Pendente'}</span>
                        <span className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${u.isActive ? 'bg-slate-50 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>{u.isActive ? 'Ativo' : 'Pausado'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button disabled={u.isApproved} onClick={() => handleApprove(u.id)} className="rounded-full bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-60">{u.isApproved ? 'Liberado' : 'Liberar'}</button>
                    {u.isActive ? (
                      <button onClick={() => handlePauseUser(u.id)} className="rounded-full bg-amber-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Pausar acesso</button>
                    ) : (
                      <button onClick={() => handleActivateUser(u.id)} className="rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Ativar acesso</button>
                    )}
                    <AdminResetPassword 
                      userId={u.id}
                      userEmail={u.email}
                      userName={u.name}
                      onSuccess={() => loadUsers()}
                    />
                    <button onClick={() => handleEditUser(u)} className="rounded-full border border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Editar</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="rounded-full bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{total} resultado(s)</div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => loadUsers(page - 1, perPage)} className="rounded-2xl border border-slate-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 disabled:opacity-50">Anterior</button>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Página {page}</div>
              <button disabled={page * perPage >= total} onClick={() => loadUsers(page + 1, perPage)} className="rounded-2xl border border-slate-100 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 disabled:opacity-50">Próxima</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="clients-panel rounded-[3rem] border border-slate-50 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Lojas cadastradas</p>
              <h2 className="text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Operação por status</h2>
            </div>
            <div className="flex items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filtrar</label>
              <select value={restaurantFilter} onChange={(e) => { setRestaurantFilter(e.target.value as any); loadRestaurants(e.target.value); }} className="bg-transparent text-label font-body font-medium text-slate-600 uppercase tracking-[0.04em] outline-none">
                    <option value="all">Todos</option>
                    <option value="active">Ativas</option>
                    <option value="inactive">Inativas</option>
                    <option value="READY">READY</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="DENIED">DENIED</option>
                    <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>
          <div className="space-y-4 mt-4">
              {isLoadingRestaurants ? (
              <div className="space-y-3">
                {[0,1].map((i)=> (
                    <div key={i} className="flex items-center justify-between rounded-[2.5rem] border border-slate-50 bg-slate-50 p-5 animate-pulse">
                      <div className="w-2/3">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                      <div className="w-1/3 flex items-center gap-2 justify-end">
                        <div className="h-8 w-20 bg-slate-100 rounded" />
                        <div className="h-8 w-20 bg-slate-100 rounded" />
                      </div>
                    </div>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="py-8 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhuma loja cadastrada.</div>
            ) : (
              restaurants.map((r) => {
              const prov = (r.provisioningStatus || '').toString();
              const provClass = prov === 'READY' ? 'bg-emerald-100 text-emerald-700' : prov === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-700' : prov === 'DENIED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
              return (
                  <div key={r.id} className="clients-card flex flex-col gap-4 rounded-[2.5rem] border border-slate-50 bg-white p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 md:flex-row md:items-center md:justify-between group">
                  <div>
                    <div className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight leading-tight">{r.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm mt-3">
                      <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{r.slug}</span>
                      <span title={r.isActive ? 'Loja ativa e operante' : 'Loja inativa'} aria-label={r.isActive ? 'Ativa' : 'Inativa'} className={`rounded-2xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{r.isActive ? 'Ativa' : 'Inativa'}</span>
                      <span title={`Provisioning: ${prov}`} aria-label={`Provisioning ${prov}`} className={`rounded-2xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${provClass}`}>{prov}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.isActive ? (
                      <button aria-label="Pausar loja" onClick={() => handlePauseRestaurant(r.id)} className="rounded-2xl bg-amber-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Pausar</button>
                    ) : (
                      <button aria-label="Ativar loja" onClick={() => handleApproveRestaurant(r.id)} className="rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white">Ativar</button>
                    )}
                    <button onClick={() => handleDeleteRestaurant(r.id)} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white"><Trash size={14}/>Excluir</button>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
