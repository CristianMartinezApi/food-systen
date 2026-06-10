"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import { Activity, DatabaseZap, Loader2, RefreshCcw, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function ProvisioningPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsMap, setLogsMap] = useState<Record<number, any[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const totalCount = list.length;
  const readyCount = list.filter((item) => item.provisioningStatus === 'READY').length;
  const inProgressCount = list.filter((item) => item.provisioningStatus === 'IN_PROGRESS').length;
  const pausedCount = list.filter((item) => item.provisioningStatus === 'PAUSED').length;

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/provisioning');
      setList(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar provisioning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (id: number) => {
    try {
      await api.post(`/admin/restaurants/${id}/retry-provisioning`, {});
      toast.success('Provisioning reiniciado');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reiniciar provisioning');
    }
  };

  const visibleList = selectedStatus === 'all'
    ? list
    : list.filter((item) => {
        if (selectedStatus === 'active') return item.isActive;
        if (selectedStatus === 'inactive') return !item.isActive;
        return item.provisioningStatus === selectedStatus;
      });

  const toggleLogs = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }

    // load logs if not present
    if (!logsMap[id]) {
      try {
        const data = await api.get(`/admin/restaurants/${id}/logs`);
        setLogsMap((s) => ({ ...s, [id]: data || [] }));
      } catch (e: any) {
        toast.error(e.message || 'Erro ao carregar logs');
        return;
      }
    }

    setExpanded(id);
  };

  if (loading) return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative p-6 md:p-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Provisionamento</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-950">Painel de provisionamento</h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-500">Acompanhe o estado de criação das lojas, revise logs e reenvie o processo sem sair do fluxo.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Total</span>
                <Activity size={16} className="text-primary" />
              </div>
              <div className="mt-3 text-3xl font-black text-slate-950">{totalCount}</div>
              <p className="text-sm text-slate-500">lojas monitoradas</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">READY</span>
                <DatabaseZap size={16} className="text-emerald-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-700">{readyCount}</div>
              <p className="text-sm text-emerald-700/80">concluídas</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-sky-500">Em fila</span>
                <Loader2 size={16} className="text-sky-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-sky-700">{inProgressCount}</div>
              <p className="text-sm text-sky-700/80">em andamento</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500">PAUSED</span>
                <RefreshCcw size={16} className="text-amber-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-amber-700">{pausedCount}</div>
              <p className="text-sm text-amber-700/80">pausadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Filtragem</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Estados de provisionamento</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'active', 'inactive', 'READY', 'IN_PROGRESS', 'PAUSED', 'DENIED', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${selectedStatus === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {status === 'all' ? 'Todos' : status === 'active' ? 'Ativas' : status === 'inactive' ? 'Inativas' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <div className="text-sm text-slate-500">A lista já vem do servidor; use os chips para trocar o contexto visual sem perder clareza.</div>
        </div>
      </div>

      <div className="grid gap-4">
        {visibleList.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-500">Nenhuma loja encontrada.</div>
        ) : (
          visibleList.map((r) => {
            const statusClass =
              r.provisioningStatus === 'READY'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : r.provisioningStatus === 'IN_PROGRESS'
                  ? 'bg-sky-50 text-sky-700 border-sky-100'
                  : r.provisioningStatus === 'PAUSED'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : r.provisioningStatus === 'DENIED'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

            return (
              <div key={r.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{r.name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClass}`}>{r.provisioningStatus}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.isActive ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{r.slug} • DB: {r.databaseName || '—'}</p>
                    <p className="mt-1 text-xs text-slate-400">Criada em {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRetry(r.id)} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5">
                      <RefreshCcw size={14} /> Retry
                    </button>
                    <button onClick={() => toggleLogs(r.id)} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">{expanded === r.id ? 'Ocultar logs' : 'Ver logs'}</button>
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Logs</p>
                        <h4 className="text-base font-black text-slate-950">Histórico da loja</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{(logsMap[r.id] || []).length} evento(s)</span>
                    </div>
                    {(logsMap[r.id] || []).length === 0 ? (
                      <div className="text-sm text-slate-500">Nenhum log encontrado.</div>
                    ) : (
                      <div className="space-y-3 max-h-56 overflow-auto pr-1">
                        {(logsMap[r.id] || []).map((l: any) => (
                          <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-bold text-slate-900">{l.message}</div>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{l.level}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">{new Date(l.createdAt).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
