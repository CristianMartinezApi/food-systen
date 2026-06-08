"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import toast from "react-hot-toast";

interface AuditLog {
  id: number;
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  subjectType: string;
  subjectId?: number | null;
  details?: any;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectType, setSubjectType] = useState("");

  const load = async (p = 1) => {
    try {
      setIsLoading(true);
      const q = new URLSearchParams();
      q.set('page', String(p));
      q.set('perPage', String(perPage));
      if (search) q.set('search', search);
      if (subjectType) q.set('subjectType', subjectType);
      const resp = await api.get(`/admin/audit-logs?${q.toString()}`);
      setLogs(resp.data || []);
      setTotal(resp.total || 0);
      setPage(resp.page || p);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar auditoria');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div>
      <div>
        <p className="text-xs uppercase font-black text-primary">Auditoria</p>
        <h1 className="text-3xl font-black">Logs de Ações Administrativas</h1>
        <p className="text-sm text-slate-500">Registros de aprovações, alterações e exclusões.</p>
      </div>

      <div className="mt-6 mb-4 flex items-center gap-2">
        <input placeholder="Buscar ação ou email" value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-1 border rounded" />
        <select value={subjectType} onChange={(e) => setSubjectType(e.target.value)} className="px-3 py-1 border rounded">
          <option value="">Todos</option>
          <option value="user">Usuário</option>
          <option value="restaurant">Restaurante</option>
        </select>
        <button onClick={() => load(1)} className="px-3 py-1 border rounded">Buscar</button>
        <button onClick={() => { setSearch(''); setSubjectType(''); load(1); }} className="px-3 py-1 border rounded">Limpar</button>
        <button onClick={() => { const q = new URLSearchParams(); if (search) q.set('search', search); if (subjectType) q.set('subjectType', subjectType); window.open(`http://localhost:8000/api/admin/audit-logs/export?${q.toString()}`, '_blank'); }} className="px-3 py-1 bg-slate-800 text-white rounded">Exportar CSV</button>
      </div>

      <div className="bg-white border rounded p-4">
        {isLoading ? <div>Carregando...</div> : logs.length === 0 ? <div>Nenhum log encontrado.</div> : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">{l.action}</div>
                    <div className="text-sm text-slate-500">{l.actorEmail || 'Sistema'} • {l.subjectType}#{l.subjectId || ''}</div>
                  </div>
                  <div className="text-sm text-slate-400">{new Date(l.createdAt).toLocaleString()}</div>
                </div>
                {l.details && <pre className="mt-2 text-xs text-slate-600">{JSON.stringify(l.details, null, 2)}</pre>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">{total} resultado(s)</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1 border rounded">Anterior</button>
            <div className="px-3 py-1 border rounded">Página {page}</div>
            <button disabled={page * perPage >= total} onClick={() => load(page + 1)} className="px-3 py-1 border rounded">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
