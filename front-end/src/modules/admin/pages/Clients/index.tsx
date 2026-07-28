"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/core/config/api";
import { Loader2, Plus, Shield, Trash, Search, Users, Store, BadgeCheck, CirclePause, Sparkles, Filter, FileSearch, Workflow, RefreshCcw, Eye, EyeOff, WandSparkles } from "lucide-react";
import toast from "react-hot-toast";
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

async function downloadUsersCsv(search: string, filter: "all" | "approved" | "pending") {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  if (filter) q.set("filter", filter);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const response = await fetch(`${apiUrl}/admin/users/export?${q.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao exportar clientes");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "users_export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function ClientsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [viewMode, setViewMode] = useState<'users' | 'stores' | 'inconsistencies'>('users');
  const [inconsistencyScope, setInconsistencyScope] = useState<'all' | 'critical'>('all');
  const [userSort, setUserSort] = useState<'recent' | 'name_asc' | 'pending_first'>('recent');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'active' | 'inactive' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'DENIED' | 'PENDING'>('all');
  const [restaurantSort, setRestaurantSort] = useState<'created_desc' | 'retry_desc'>('created_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => Promise<void> | void;
  }>({ open: false });
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [createdCredentials, setCreatedCredentials] = useState<{ open: boolean; name?: string; email?: string; password?: string }>({ open: false });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const approvedUsers = users.filter((user) => user.isApproved).length;
  const activeUsers = users.filter((user) => user.isActive !== false).length;
  const activeRestaurants = restaurants.filter((restaurant) => restaurant.isActive).length;
  const pausedRestaurants = restaurants.filter((restaurant) => !restaurant.isActive).length;
  const usersWithoutRestaurant = users.filter((user) => !user.restaurant).length;
  const usersLinkedToInactiveStore = users.filter((user) => user.restaurant && (user.restaurant as any).isActive === false).length;
  const storesWithoutClient = restaurants.filter((restaurant) => {
    if (!Array.isArray(restaurant.users)) return true;
    return !restaurant.users.some((user: any) => user.role !== 'SUPER_ADMIN');
  }).length;

  const inconsistentUsersBase = users.filter((user) => {
    if (!user.restaurant) return true;
    return (user.restaurant as any).isActive === false;
  });

  const inconsistentStoresBase = restaurants.filter((restaurant) => {
    if (!Array.isArray(restaurant.users)) return true;
    const nonSuperUsers = restaurant.users.filter((user: any) => user.role !== 'SUPER_ADMIN');
    return nonSuperUsers.length === 0;
  });

  const inconsistentUsers = inconsistencyScope === 'critical'
    ? inconsistentUsersBase.filter((user) => !user.restaurant)
    : inconsistentUsersBase;

  const inconsistentStores = inconsistencyScope === 'critical'
    ? inconsistentStoresBase.filter((store) => store.isActive)
    : inconsistentStoresBase;

  const sortedRestaurants = [...restaurants].sort((a, b) => {
    if (restaurantSort === 'retry_desc') {
      const aTime = a.lastRetryAt ? new Date(a.lastRetryAt).getTime() : 0;
      const bTime = b.lastRetryAt ? new Date(b.lastRetryAt).getTime() : 0;
      return bTime - aTime;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getPlanUsageBadgeClass = (status?: string) => {
    if (status === 'limit_reached') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (status === 'critical') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'warning') return 'bg-sky-100 text-sky-700 border-sky-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getPlanUsageLabel = (status?: string) => {
    if (status === 'limit_reached') return 'Limite atingido';
    if (status === 'critical') return 'Uso crítico (95%+)';
    if (status === 'warning') return 'Uso alto (80%+)';
    return 'Uso saudável';
  };

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

  const loadPlans = async () => {
    try {
      const data = await api.get('/admin/plans');
      setPlans(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (userRole === "SUPER_ADMIN") {
      loadUsers(1, perPage);
      loadRestaurants();
      loadPlans();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'SUPER_ADMIN') return;
    const t = setTimeout(() => loadUsers(1, perPage), 350);
    return () => clearTimeout(t);
  }, [search, filter]);

  // server-side filtered users are loaded into `users`
  const filteredUsers = users;

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === 'name_asc') {
      return a.name.localeCompare(b.name, 'pt-BR');
    }

    if (userSort === 'pending_first') {
      if (a.isApproved === b.isApproved) return 0;
      return a.isApproved ? 1 : -1;
    }

    return 0;
  });

  const createPasswordChecks = {
    minLength: formData.password.length >= 8,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[^A-Za-z0-9]/.test(formData.password),
  };

  const createPasswordStrength = Object.values(createPasswordChecks).filter(Boolean).length;
  const isCreateNameValid = formData.name.trim().length >= 3;
  const isCreateEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isCreatePasswordValid = createPasswordStrength >= 4;
  const canSubmitCreateClient = isCreateNameValid && isCreateEmailValid && isCreatePasswordValid && !isSaving;

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';
    const randomChar = () => chars[Math.floor(Math.random() * chars.length)];

    let generated = '';
    while (generated.length < 14) {
      generated += randomChar();
    }

    // Garante diversidade mínima para evitar senha fraca.
    const safeGenerated = `Aa1!${generated.slice(4)}`;
    setFormData((prev) => ({ ...prev, password: safeGenerated }));
    setShowCreatePassword(true);
    toast.success('Senha forte gerada');
  };

  const copyGeneratedPassword = async () => {
    const password = formData.password.trim();
    if (!password) {
      toast.error('Nenhuma senha para copiar');
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      toast.success('Senha copiada');
    } catch {
      toast.error('Não foi possível copiar a senha');
    }
  };

  const copyCreatedCredentials = async () => {
    if (!createdCredentials.email || !createdCredentials.password) {
      toast.error('Credenciais indisponíveis para copiar');
      return;
    }

    const content = `Cliente: ${createdCredentials.name || '-'}\nEmail: ${createdCredentials.email}\nSenha inicial: ${createdCredentials.password}`;

    try {
      await navigator.clipboard.writeText(content);
      toast.success('Credenciais copiadas');
    } catch {
      toast.error('Não foi possível copiar as credenciais');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCreateNameValid) {
      toast.error('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!isCreateEmailValid) {
      toast.error('Informe um email válido');
      return;
    }

    if (!isCreatePasswordValid) {
      toast.error('Senha inicial fraca. Use no mínimo força 4/5.');
      return;
    }

    try {
      setIsSaving(true);
      const credentialsSnapshot = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };
      await api.post("/admin/users", formData);
      toast.success("Cliente cadastrado com sucesso");
      setCreatedCredentials({ open: true, ...credentialsSnapshot });
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
          await api.patch(`/admin/restaurants/${id}/pause`, {});
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
          await api.patch(`/admin/users/${id}/pause`, {});
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
          await api.patch(`/admin/users/${id}/activate`, {});
          toast.success('Acesso do usuário ativado');
          await loadUsers();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao ativar acesso do usuário');
        }
      },
    });
  };

  const handleChangePlan = async (restaurantId: number, planId: number) => {
    try {
      await api.patch(`/admin/restaurants/${restaurantId}/plan`, { planId });
      toast.success('Plano atualizado');
      await loadRestaurants();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar plano');
    }
  };

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="system-hero-band mx-auto max-w-3xl p-8 md:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-950/20"><Shield size={20} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Hub Administrativo</p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950">Clientes</h1>
            <p className="text-sm text-slate-500">Área restrita ao super admin.</p>
          </div>
        </div>
        <p className="max-w-xl text-sm md:text-base text-slate-600">Seu perfil atual não tem permissão para acessar este painel.</p>
      </div>
    );
  }

  return (
    <div className="ops-workspace space-y-4">
      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 sm:max-w-md sm:p-5">
            <h3 className="font-bold text-lg">{confirmState.title}</h3>
            <p className="text-[13px] sm:text-sm text-slate-600 mt-2">{confirmState.message}</p>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setConfirmState({ open: false })} className="rounded-lg border px-3 py-2 text-[13px] sm:text-sm">Cancelar</button>
              <button onClick={async () => { setConfirmState((s) => ({ ...s, open: false })); try { if (confirmState.onConfirm) await confirmState.onConfirm(); } catch (e) { console.error(e); } }} className="rounded-lg bg-primary px-3 py-2 text-[13px] text-white sm:text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {createdCredentials.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-w-sm sm:p-5 md:max-w-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Cadastro concluído</p>
            <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-950">Credenciais iniciais do cliente</h3>
            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700 sm:p-4 sm:text-sm">
              <p><strong>Cliente:</strong> {createdCredentials.name || '-'}</p>
              <p><strong>Email:</strong> {createdCredentials.email || '-'}</p>
              <p><strong>Senha:</strong> {createdCredentials.password || '-'}</p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={copyCreatedCredentials} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 sm:text-sm">Copiar tudo</button>
              <button onClick={() => setCreatedCredentials({ open: false })} className="rounded-lg bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white sm:text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
      <div className="clients-hero system-hero-band relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Hub Administrativo</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Clientes e liberações</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">Gerencie acessos, aprovações e o estado operacional das lojas.</p>
            </div>
            <button
              onClick={() => {
                setViewMode('users');
                setTimeout(() => document.getElementById('create-client')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary"
            >
              <Sparkles size={20} /> Novo cliente
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="clients-card rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clientes</span>
                <Users size={16} className="text-primary" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-slate-950 tracking-tighter">{total}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">cadastros encontrados</p>
            </div>
            <div className="clients-card rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Liberados</span>
                <BadgeCheck size={16} className="text-emerald-600" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-emerald-700 tracking-tighter">{approvedUsers}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-emerald-700/80 uppercase tracking-[0.06em]">contas aprovadas</p>
            </div>
            <div className="clients-card rounded-lg border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Pendentes</span>
                <CirclePause size={16} className="text-amber-600" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-amber-700 tracking-tighter">{total - approvedUsers}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-amber-700/80 uppercase tracking-[0.06em]">aguardando liberação</p>
            </div>
            <div className="clients-card rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lojas</span>
                <Store size={16} className="text-slate-600" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-slate-900 tracking-tighter">{activeRestaurants}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-slate-500 uppercase tracking-[0.06em]">{pausedRestaurants} pausadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="clients-panel rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setViewMode('users')}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition ${viewMode === 'users' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Usuários
            </button>
            <button
              onClick={() => setViewMode('stores')}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition ${viewMode === 'stores' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Lojas
            </button>
            <button
              onClick={() => setViewMode('inconsistencies')}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition ${viewMode === 'inconsistencies' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Inconsistências
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">Sem loja: {usersWithoutRestaurant}</span>
            <span className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">Em loja inativa: {usersLinkedToInactiveStore}</span>
            <span className="rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">Lojas sem cliente: {storesWithoutClient}</span>
          </div>
        </div>
      </div>

      {viewMode === 'users' && (
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr] items-start">
        <form id="create-client" onSubmit={handleCreateUser} className="clients-panel space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:sticky md:top-6">
          <div>
            <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Novo cliente</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Criar acesso</h2>
            <p className="text-sm text-slate-500">Cadastro com senha assistida e validação antes da liberação.</p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nome do cliente</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              {formData.name.length > 0 && !isCreateNameValid && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Nome mínimo de 3 caracteres</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email de acesso</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@cliente.com"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
              {formData.email.length > 0 && !isCreateEmailValid && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Formato de email inválido</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Senha inicial</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyGeneratedPassword}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600"
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600"
                  >
                    <WandSparkles size={12} /> Gerar forte
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <input
                  required
                  type={showCreatePassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Defina a senha inicial"
                  className="h-10 sm:h-12 md:h-14 w-full bg-transparent px-2 font-body font-medium text-[13px] sm:text-sm tracking-[0.02em] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  className="rounded-full p-2 text-slate-500 hover:bg-white"
                  aria-label={showCreatePassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${createPasswordChecks.minLength ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>8+ chars</span>
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${createPasswordChecks.hasUpper ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Maiúscula</span>
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${createPasswordChecks.hasLower ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Minúscula</span>
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${createPasswordChecks.hasNumber ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Número</span>
                <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${createPasswordChecks.hasSpecial ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Especial</span>
              </div>

              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Força atual: {createPasswordStrength}/5
              </p>
              {formData.password.length > 0 && !isCreatePasswordValid && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">Use uma senha com força mínima 4/5</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={!canSubmitCreateClient} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? <Loader2 className="animate-spin" /> : <><Plus size={14} /> Cadastrar cliente</>}
          </button>
        </form>

        <div className="clients-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Clientes</p>
                <h2 className="text-lg font-semibold text-slate-950">Base de acessos</h2>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{selected.length} selecionado(s)</div>
            </div>

            <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.5fr_0.5fr_auto_auto] clients-filters">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-primary focus-within:bg-white sm:col-span-2 xl:col-span-1">
                <Search size={18} className="text-slate-300" />
                <input placeholder="Buscar nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]" />
              </div>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <Filter size={18} className="text-slate-300" />
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]">
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Liberado</option>
                </select>
              </div>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ordem</label>
                <select value={userSort} onChange={(e) => setUserSort(e.target.value as 'recent' | 'name_asc' | 'pending_first')} className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]">
                  <option value="recent">Mais recentes</option>
                  <option value="name_asc">Nome (A-Z)</option>
                  <option value="pending_first">Pendentes primeiro</option>
                </select>
              </div>
              <button onClick={() => loadUsers(1, perPage)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Buscar</button>
              <button onClick={() => { setSearch(''); setFilter('all'); loadUsers(1, perPage); }} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Limpar</button>
              <button
                onClick={async () => {
                  try {
                    await downloadUsersCsv(search, filter);
                    toast.success("CSV exportado com sucesso");
                  } catch (error: any) {
                    toast.error(error.message || "Erro ao exportar CSV");
                  }
                }}
                className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-primary"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <button onClick={selectAll} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 sm:flex-none">{selected.length === sortedUsers.length ? 'Desmarcar tudo' : 'Selecionar tudo'}</button>
            <button onClick={() => handleBulkAction('approve')} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white sm:flex-none">Aprovar selecionados</button>
            <button onClick={() => handleBulkAction('delete')} className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white sm:flex-none">Excluir selecionados</button>
          </div>

          {isLoading ? <div className="py-10 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Carregando...</div> : sortedUsers.length === 0 ? <div className="py-10 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhum cliente</div> : (
            <div className="mt-4 space-y-4">
              {sortedUsers.map((u) => (
                <div key={u.id} className="clients-card group flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <div>
                      <div className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight leading-tight">{u.name}</div>
                      <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1 break-all">{u.email}</div>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {u.restaurant
                          ? `Loja vinculada: ${u.restaurant.name} (${u.restaurant.slug})`
                          : 'Sem loja vinculada'}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-semibold ${u.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{u.isApproved ? 'Liberado' : 'Pendente'}</span>
                        <span className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-semibold ${u.isActive ? 'bg-slate-50 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>{u.isActive ? 'Ativo' : 'Pausado'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button disabled={u.isApproved} onClick={() => handleApprove(u.id)} className="flex-1 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">{u.isApproved ? 'Liberado' : 'Liberar'}</button>
                    {u.isActive ? (
                      <button onClick={() => handlePauseUser(u.id)} className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white sm:flex-none">Pausar acesso</button>
                    ) : (
                      <button onClick={() => handleActivateUser(u.id)} className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white sm:flex-none">Ativar acesso</button>
                    )}
                    <AdminResetPassword
                      userId={u.id}
                      userEmail={u.email}
                      userName={u.name}
                      onSuccess={() => loadUsers()}
                    />
                    <button onClick={() => handleEditUser(u)} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 sm:flex-none">Editar</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white sm:flex-none">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4">
            <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{total} resultado(s)</div>
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
              <button disabled={page <= 1} onClick={() => loadUsers(page - 1, perPage)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Anterior</button>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">Página {page}</div>
              <button disabled={page * perPage >= total} onClick={() => loadUsers(page + 1, perPage)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Próxima</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {viewMode === 'stores' && (
      <div>
        <div className="clients-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Lojas cadastradas</p>
              <h2 className="text-lg font-semibold text-slate-950">Operação por status</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filtrar</label>
                <select value={restaurantFilter} onChange={(e) => { setRestaurantFilter(e.target.value as any); loadRestaurants(e.target.value); }} className="bg-transparent text-[12px] sm:text-label font-body font-medium text-slate-600 uppercase tracking-[0.04em] outline-none">
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
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ordenar</label>
                <select value={restaurantSort} onChange={(e) => setRestaurantSort(e.target.value as 'created_desc' | 'retry_desc')} className="bg-transparent text-[12px] sm:text-label font-body font-medium text-slate-600 uppercase tracking-[0.04em] outline-none">
                  <option value="created_desc">Mais novas</option>
                  <option value="retry_desc">Último retry</option>
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-4 mt-4">
            {isLoadingRestaurants ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex animate-pulse items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-5">
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
            ) : sortedRestaurants.length === 0 ? (
              <div className="py-8 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhuma loja cadastrada.</div>
            ) : (
              sortedRestaurants.map((r) => {
                const prov = (r.provisioningStatus || '').toString();
                const provClass = prov === 'READY' ? 'bg-emerald-100 text-emerald-700' : prov === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-700' : prov === 'DENIED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
                const usage = r.planUsage;
                const usageClass = getPlanUsageBadgeClass(usage?.status);
                const usageLabel = getPlanUsageLabel(usage?.status);
                const linkedUsers = Array.isArray(r.users)
                  ? r.users.filter((user: any) => user.role !== 'SUPER_ADMIN')
                  : [];
                const linkedUsersLabel = linkedUsers.length > 0
                  ? linkedUsers.map((user: any) => user.email || user.name).join(', ')
                  : 'Sem cliente vinculado';
                return (
                  <div key={r.id} className="clients-card group flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight leading-tight">{r.name}</div>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 break-words">Cliente(s): {linkedUsersLabel}</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm mt-3">
                        <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{r.slug}</span>
                        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-700">Plano: {r.plan?.name || 'Sem plano'}</span>
                        <span title={r.isActive ? 'Loja ativa e operante' : 'Loja inativa'} aria-label={r.isActive ? 'Ativa' : 'Inativa'} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{r.isActive ? 'Ativa' : 'Inativa'}</span>
                        <span title={`Provisioning: ${prov}`} aria-label={`Provisioning ${prov}`} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${provClass}`}>{prov}</span>
                        {r.lastRetryReason && (
                          <span
                            title={r.lastRetryAt ? `Ultimo retry em ${new Date(r.lastRetryAt).toLocaleString()}: ${r.lastRetryReason}` : `Ultimo retry: ${r.lastRetryReason}`}
                            aria-label="Loja com histórico de retry"
                            className="rounded-md bg-amber-100 px-3 py-1.5 text-[10px] font-semibold text-amber-700"
                          >
                            Retry registrado
                          </span>
                        )}

                        <select
                          value={r.planId || ''}
                          onChange={(e) => handleChangePlan(r.id, Number(e.target.value))}
                          className="cursor-pointer rounded-md border-none bg-slate-900 px-3 py-1.5 text-[10px] font-semibold text-white outline-none"
                        >
                          <option value="">Sem plano</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {usage && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold ${usageClass}`}>
                            {usageLabel}
                          </span>
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                            Produtos: {usage.productsUsed}/{usage.maxProducts || '-'} ({Math.round(usage.productUsagePercent || 0)}%)
                          </span>
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-700">
                            Pedidos online/mês: {usage.monthlyOrdersUsed}/{usage.maxOrders || '-'} ({Math.round(usage.orderUsagePercent || 0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const q = new URLSearchParams();
                          q.set("status", (r.provisioningStatus || "all").toString());
                          q.set("restaurant", r.slug || r.name || "");
                          router.push(`/admin/provisioning?${q.toString()}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600"
                      >
                        <Workflow size={14} /> Provisioning
                      </button>
                      <button
                        onClick={() => {
                          const q = new URLSearchParams();
                          q.set("hasRetry", "1");
                          q.set("restaurant", r.slug || r.name || "");
                          router.push(`/admin/provisioning?${q.toString()}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700"
                      >
                        <RefreshCcw size={14} /> Com retry
                      </button>
                      <button
                        onClick={() => {
                          const q = new URLSearchParams();
                          q.set("subjectType", "restaurant");
                          q.set("search", r.slug || r.name || "");
                          router.push(`/admin/audit?${q.toString()}`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600"
                      >
                        <FileSearch size={14} /> Auditoria
                      </button>
                      {r.isActive ? (
                        <button aria-label="Pausar loja" onClick={() => handlePauseRestaurant(r.id)} className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white">Pausar</button>
                      ) : (
                        <button aria-label="Ativar loja" onClick={() => handleApproveRestaurant(r.id)} className="rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white">Ativar</button>
                      )}
                      <button onClick={() => handleDeleteRestaurant(r.id)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white"><Trash size={14} />Excluir</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {viewMode === 'inconsistencies' && (
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <div className="clients-panel rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] sm:text-label font-body font-bold text-rose-500 uppercase tracking-[0.2em]">Usuários</p>
              <h2 className="text-xl sm:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Sem vínculo correto</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInconsistencyScope('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${inconsistencyScope === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setInconsistencyScope('critical')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${inconsistencyScope === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}
              >
                Críticas
              </button>
              <span className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">{inconsistentUsers.length}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {inconsistentUsers.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Nenhuma inconsistência encontrada.</div>
            ) : (
              inconsistentUsers.slice(0, 8).map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700">{user.restaurant ? 'Loja vinculada inativa' : 'Sem loja vinculada'}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!user.isApproved && (
                      <button onClick={() => handleApprove(user.id)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Liberar</button>
                    )}
                    {user.isActive === false && (
                      <button onClick={() => handleActivateUser(user.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Ativar acesso</button>
                    )}
                    {!user.restaurant && (
                      <button onClick={() => setViewMode('users')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">Revisar vínculo</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setViewMode('users')} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Ir para usuários</button>
        </div>

        <div className="clients-panel rounded-xl border border-sky-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-label font-body font-bold text-sky-500 uppercase tracking-[0.2em]">Lojas</p>
              <h2 className="text-xl sm:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Sem cliente responsável</h2>
            </div>
            <span className="rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">{inconsistentStores.length}</span>
          </div>
          <div className="mt-4 space-y-2">
            {inconsistentStores.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Nenhuma inconsistência encontrada.</div>
            ) : (
              inconsistentStores.slice(0, 8).map((store) => (
                <div key={store.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">{store.name}</div>
                  <div className="text-xs text-slate-500">{store.slug}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">Sem cliente vinculado</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!store.isActive && (
                      <button onClick={() => handleApproveRestaurant(store.id)} className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Ativar loja</button>
                    )}
                    <button
                      onClick={() => {
                        const q = new URLSearchParams();
                        q.set('status', (store.provisioningStatus || 'all').toString());
                        q.set('restaurant', store.slug || store.name || '');
                        router.push(`/admin/provisioning?${q.toString()}`);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Abrir provisioning
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setViewMode('stores')} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Ir para lojas</button>
        </div>
      </div>
      )}
    </div>
  );
}
