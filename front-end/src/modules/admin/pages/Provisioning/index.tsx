"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import toast from "react-hot-toast";

export default function ProvisioningPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsMap, setLogsMap] = useState<Record<number, any[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

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
    const ok = window.confirm('Reiniciar provisionamento desta loja?');
    if (!ok) return;
    try {
      await api.post(`/admin/restaurants/${id}/retry-provisioning`, {});
      toast.success('Provisioning reiniciado');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reiniciar provisioning');
    }
  };

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

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Painel de Provisionamento</h1>
      {list.length === 0 ? <div>Nenhuma loja encontrada.</div> : (
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="font-bold">{r.name}</div>
                <div className="text-sm text-slate-500">{r.slug} • DB: {r.databaseName || '—'}</div>
                <div className="text-xs text-slate-400 mt-1">Status: {r.provisioningStatus}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRetry(r.id)} className="px-3 py-1 bg-primary text-white rounded">Retry</button>
                <button onClick={() => toggleLogs(r.id)} className="px-3 py-1 border rounded">Ver logs</button>
              </div>
            </div>
            {expanded === r.id && (
              <div className="mt-2 p-3 bg-slate-50 border rounded">
                <div className="font-medium mb-2">Logs</div>
                {(logsMap[r.id] || []).length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhum log encontrado.</div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-auto">
                    {(logsMap[r.id] || []).map((l: any) => (
                      <div key={l.id} className="text-sm text-slate-700">
                        <div className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString()} • {l.level}</div>
                        <div>{l.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          ))}
        </div>
      )}
    </div>
  );
}
