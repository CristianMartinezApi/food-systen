"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import { Loader2, Plus, Shield, UserPlus, Trash } from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
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
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

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
    const ok = window.confirm('Excluir usuário? Esta ação é irreversível.');
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Usuário excluído');
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir usuário');
    }
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
    const ok = window.confirm(`Confirmar ${action} de ${selected.length} usuário(s)?`);
    if (!ok) return;

    try {
      await api.patch('/admin/users/bulk', { ids: selected, action });
      toast.success('Ação aplicada');
      setSelected([]);
      await loadUsers(page, perPage);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação em massa');
    }
  };

  const handleApproveRestaurant = async (id: number) => {
    const ok = window.confirm("Confirmar liberação dessa loja?");
    if (!ok) return;
    try {
      await api.patch(`/admin/restaurants/${id}/approve`, {});
      toast.success("Loja liberada");
      await loadRestaurants();
    } catch (error: any) {
      toast.error(error.message || "Erro ao liberar loja");
    }
  };

  const handleDenyRestaurant = async (id: number) => {
    const ok = window.confirm("Confirmar negação de acesso para esta loja?");
    if (!ok) return;
    try {
      await api.patch(`/admin/restaurants/${id}/deny`, {});
      toast.success("Acesso negado");
      await loadRestaurants();
    } catch (error: any) {
      toast.error(error.message || "Erro ao negar acesso");
    }
  };

  const handleDeleteRestaurant = async (id: number) => {
    const ok = window.confirm("Excluir loja? Esta ação é irreversível.");
    if (!ok) return;
    try {
      await api.delete(`/admin/restaurants/${id}`);
      toast.success("Loja excluída");
      await loadRestaurants();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir loja");
    }
  };

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="bg-white rounded-[1rem] border p-6">
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
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-black text-primary">Super Admin</p>
        <h1 className="text-3xl font-black">Clientes e Liberações</h1>
        <p className="text-sm text-slate-500">Cadastre o cliente, defina email e senha, aprove o acesso e gerencie lojas.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreateUser} className="space-y-3">
          <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do cliente" className="h-12 px-4 border rounded" />
          <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@cliente.com" className="h-12 px-4 border rounded" />
          <input required type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Senha inicial" className="h-12 px-4 border rounded" />
          <button type="submit" disabled={isSaving} className="h-12 bg-slate-900 text-white rounded">{isSaving ? <Loader2 className="animate-spin" /> : <><Plus size={14} /> Cadastrar cliente</>}</button>
        </form>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Clientes</h2>
            <div className="flex items-center gap-2">
              <input placeholder="Buscar nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-1 border rounded" />
              <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-1 border rounded">
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="approved">Liberado</option>
              </select>
              <button onClick={() => loadUsers(1, perPage)} className="px-3 py-1 border rounded">Buscar</button>
              <button onClick={() => { setSearch(''); setFilter('all'); loadUsers(1, perPage); }} className="px-3 py-1 border rounded">Limpar</button>
              <button onClick={() => { const q = new URLSearchParams(); if (search) q.set('search', search); if (filter) q.set('filter', filter); window.open(`http://localhost:8000/api/admin/users/export?${q.toString()}`, '_blank'); }} className="px-3 py-1 bg-slate-800 text-white rounded">Exportar CSV</button>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button onClick={selectAll} className="px-3 py-1 border rounded">{selected.length === filteredUsers.length ? 'Desmarcar tudo' : 'Selecionar tudo'}</button>
            <button onClick={() => handleBulkAction('approve')} className="px-3 py-1 bg-primary text-white rounded">Aprovar selecionados</button>
            <button onClick={() => handleBulkAction('delete')} className="px-3 py-1 bg-red-600 text-white rounded">Excluir selecionados</button>
            <div className="text-sm text-slate-500 ml-2">{selected.length} selecionado(s)</div>
          </div>

          {isLoading ? <div className="py-6">Carregando...</div> : filteredUsers.length === 0 ? <div>Nenhum cliente</div> : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                    <div>
                      <div className="font-bold">{u.name}</div>
                      <div className="text-sm text-slate-500">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={u.isApproved} onClick={() => handleApprove(u.id)} className="px-3 py-1 bg-primary text-white rounded">{u.isApproved ? 'Liberado' : 'Liberar'}</button>
                    <button onClick={() => handleEditUser(u)} className="px-3 py-1 bg-slate-200 text-slate-800 rounded">Editar</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1 bg-red-600 text-white rounded">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">{total} resultado(s)</div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => loadUsers(page - 1, perPage)} className="px-3 py-1 border rounded">Anterior</button>
              <div className="px-3 py-1 border rounded">Página {page}</div>
              <button disabled={page * perPage >= total} onClick={() => loadUsers(page + 1, perPage)} className="px-3 py-1 border rounded">Próxima</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold">Lojas cadastradas</h2>
        <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between mb-3">
                <div />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-500">Filtrar:</label>
                  <select value={restaurantFilter} onChange={(e) => { setRestaurantFilter(e.target.value as any); loadRestaurants(e.target.value); }} className="px-3 py-1 border rounded bg-white">
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
              {isLoadingRestaurants ? (
              <div className="space-y-3">
                {[0,1].map((i)=> (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg shadow-sm bg-white animate-pulse">
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
              <div>Nenhuma loja cadastrada.</div>
            ) : (
              restaurants.map((r) => {
              const prov = (r.provisioningStatus || '').toString();
              const provClass = prov === 'READY' ? 'bg-emerald-100 text-emerald-700' : prov === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-700' : prov === 'DENIED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
              return (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-lg shadow-sm bg-white">
                  <div>
                    <div className="font-bold">{r.name}</div>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="text-slate-500">{r.slug}</span>
                      <span title={r.isActive ? 'Loja ativa e operante' : 'Loja inativa'} aria-label={r.isActive ? 'Ativa' : 'Inativa'} className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{r.isActive ? 'Ativa' : 'Inativa'}</span>
                      <span title={`Provisioning: ${prov}`} aria-label={`Provisioning ${prov}`} className={`px-2 py-0.5 rounded-full text-xs font-bold ${provClass}`}>{prov}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isActive ? (
                      <button aria-label="Pausar loja" onClick={() => { if (!confirm('Tem certeza que deseja pausar esta loja?')) return; api.patch(`/admin/restaurants/${r.id}/pause`).then(()=>{ toast.success('Loja pausada'); loadRestaurants(); }).catch((e)=>{ toast.error(e.message||'Erro ao pausar'); }); }} className="px-3 py-1 bg-amber-600 text-white rounded">Pausar</button>
                    ) : (
                      <button aria-label="Ativar loja" onClick={() => { if (!confirm('Ativar esta loja?')) return; api.patch(`/admin/restaurants/${r.id}/approve`).then(()=>{ toast.success('Loja ativada'); loadRestaurants(); }).catch((e)=>{ toast.error(e.message||'Erro ao ativar'); }); }} className="px-3 py-1 bg-primary text-white rounded">Ativar</button>
                    )}
                    <button onClick={() => handleDeleteRestaurant(r.id)} className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-2"><Trash size={14}/>Excluir</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
