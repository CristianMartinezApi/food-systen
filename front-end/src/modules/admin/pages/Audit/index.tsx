"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/core/config/api";
import { BadgeCheck, Download, FileText, Filter, Search, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
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

const actionLabels: Record<string, string> = {
  print_document: "Impressão de documento",
  delete_restaurant: "Excluir restaurante",
  update_user: "Atualizar usuário",
  delete_user: "Excluir usuário",
  open_cash_session: "Abrir sessão de caixa",
  close_cash_session: "Fechar sessão de caixa",
  create_cash_movement: "Criar movimento de caixa",
  create_direct_sale: "Criar venda direta",
  approve_user: "Aprovar usuário",
  deny_restaurant: "Negar restaurante",
  pause_restaurant: "Pausar restaurante",
  retry_provisioning_start: "Iniciar retry de provisioning",
  retry_provisioning_finish: "Finalizar retry de provisioning",
};

const subjectTypeLabels: Record<string, string> = {
  user: "Usuário",
  restaurant: "Restaurante",
  order: "Pedido",
  cash_session: "Sessão de caixa",
  cash_movement: "Movimento de caixa",
};

function formatAuditAction(action: string) {
  return actionLabels[action] || action.replaceAll("_", " ");
}

function formatAuditSubjectType(subjectType: string) {
  return subjectTypeLabels[subjectType] || subjectType;
}

function formatAuditDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function groupLogsByDate(logs: AuditLog[]) {
  const groups: Record<string, AuditLog[]> = {};

  logs.forEach((log) => {
    const day = formatAuditDate(log.createdAt);
    if (!groups[day]) groups[day] = [];
    groups[day].push(log);
  });

  return Object.entries(groups)
    .map(([day, items]) => ({ day, items }))
    .sort((a, b) => {
      const dateA = new Date(a.items[0].createdAt).getTime();
      const dateB = new Date(b.items[0].createdAt).getTime();
      return dateB - dateA;
    });
}

async function downloadAuditCsv(search: string, subjectType: string) {
  const q = new URLSearchParams();
  if (search) q.set("search", search);
  if (subjectType) q.set("subjectType", subjectType);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const token = localStorage.getItem("@FoodSystem:token");

  const response = await fetch(`${apiUrl}/admin/audit-logs/export?${q.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao exportar auditoria");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "audit_logs_export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function AuditContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [expandedLogIds, setExpandedLogIds] = useState<number[]>([]);

  const load = async (p = 1) => {
    try {
      setIsLoading(true);
      const q = new URLSearchParams();
      q.set("page", String(p));
      q.set("perPage", String(perPage));
      if (search) q.set("search", search);
      if (subjectType) q.set("subjectType", subjectType);

      const resp = await api.get(`/admin/audit-logs?${q.toString()}`);
      setLogs(resp.data || []);
      setTotal(resp.total || 0);
      setPage(resp.page || p);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar auditoria");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialSearch = searchParams.get("search") || "";
    const initialSubjectType = searchParams.get("subjectType") || "";

    setSearch(initialSearch);
    setSubjectType(initialSubjectType);
    load(1);
  }, []);

  const actionCount = logs.length;
  const userCount = logs.filter((log) => log.subjectType === "user").length;
  const printCount = logs.filter((log) => log.action === "print_document").length;
  const latestLog = logs[0];
  const hasAnyDetails = logs.some((log) => log.details && Object.keys(log.details).length > 0);
  const groupedLogs = groupLogsByDate(logs);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="system-hero-band relative overflow-hidden rounded-2xl sm:rounded-[3.5rem] p-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative p-4 sm:p-6 md:p-10 grid gap-4 sm:gap-6 md:gap-8 xl:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Auditoria</p>
            <h1 className="mt-2 text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Logs de ações administrativas</h1>
            <p className="mt-2 max-w-2xl text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Acompanhe aprovações, edições e exclusões com um painel mais legível e orientado à operação.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl sm:rounded-[2.5rem] border border-slate-50 bg-white/95 p-4 sm:p-5 shadow-sm hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Eventos</span>
                <FileText size={16} className="text-primary" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-slate-950 tracking-tighter">{actionCount}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">na página atual</p>
            </div>
            <div className="rounded-2xl sm:rounded-[2.5rem] border border-emerald-100 bg-emerald-50/80 p-4 sm:p-5 shadow-sm hover:shadow-2xl hover:shadow-emerald-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Usuários</span>
                <BadgeCheck size={16} className="text-emerald-600" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-emerald-700 tracking-tighter">{userCount}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-emerald-700/80 uppercase tracking-[0.06em]">ações relacionadas</p>
            </div>
            <div className="rounded-2xl sm:rounded-[2.5rem] border border-amber-100 bg-amber-50/80 p-4 sm:p-5 shadow-sm hover:shadow-2xl hover:shadow-amber-200/40 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Impressões</span>
                <ShieldAlert size={16} className="text-amber-600" />
              </div>
              <div className="mt-3 text-xl sm:text-heading-2 font-mono font-bold text-amber-700 tracking-tighter">{printCount}</div>
              <p className="text-[12px] sm:text-label font-body font-medium text-amber-700/80 uppercase tracking-[0.06em]">eventos de impressão</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl sm:rounded-[3rem] border border-slate-50 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
          <div>
            <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Filtros</p>
            <h2 className="mt-1 text-xl sm:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Refinar auditoria</h2>
            <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Filtre por ação, entidade e exporte o recorte atual.</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex h-10 sm:h-12 md:h-16 items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 sm:px-5 transition-all focus-within:border-primary focus-within:bg-white shadow-inner shadow-slate-50/80">
              <Search size={18} className="text-slate-300" />
              <input
                placeholder="Buscar ação ou email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]"
              />
            </div>

            <div className="flex h-10 sm:h-12 md:h-16 items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 sm:px-5 shadow-inner shadow-slate-50/80">
              <Filter size={18} className="text-slate-300" />
              <select
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value)}
                className="h-full w-full bg-transparent outline-none font-body font-medium text-slate-600 text-[12px] sm:text-label uppercase tracking-[0.04em]"
              >
                <option value="">Todos</option>
                <option value="user">Usuário</option>
                <option value="restaurant">Restaurante</option>
                <option value="order">Pedido</option>
                <option value="cash_session">Sessão de caixa</option>
              </select>
            </div>

            <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
              <button onClick={() => load(1)} className="h-10 sm:h-12 md:h-16 rounded-full bg-slate-950 px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5">
                Buscar
              </button>
              <button
                onClick={() => {
                  setSearch("");
                  setSubjectType("");
                  load(1);
                }}
                className="h-10 sm:h-12 md:h-16 rounded-full border border-slate-100 bg-white px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500 shadow-sm transition hover:bg-slate-50 hover:-translate-y-0.5"
              >
                Limpar
              </button>
              <button
                onClick={async () => {
                  try {
                    await downloadAuditCsv(search, subjectType);
                    toast.success("CSV exportado com sucesso");
                  } catch (error: any) {
                    toast.error(error.message || "Erro ao exportar CSV");
                  }
                }}
                className="inline-flex h-10 sm:h-12 md:h-16 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500 shadow-sm transition hover:bg-slate-200 hover:-translate-y-0.5"
              >
                <Download size={14} /> Exportar CSV
              </button>
            </div>
          </div>

          {latestLog && (
            <div className="mt-6 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Último evento</p>
              <div className="mt-2 text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight">{latestLog.action}</div>
              <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">
                {latestLog.actorEmail || "Sistema"} • {formatAuditSubjectType(latestLog.subjectType)}#{latestLog.subjectId || ""}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl sm:rounded-[3rem] border border-slate-50 bg-white p-4 sm:p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Resultados</p>
              <h2 className="text-xl sm:text-heading-2 font-display font-bold text-slate-950 uppercase tracking-tight">Linha do tempo</h2>
            </div>
            <div className="rounded-full bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{total} resultado(s)</div>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="animate-pulse rounded-2xl sm:rounded-[2.5rem] border border-slate-50 bg-slate-50 p-4 sm:p-5">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-2/3 rounded bg-slate-200" />
                    <div className="mt-4 h-12 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl sm:rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 sm:p-8 text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">
                Nenhum log encontrado.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedLogs.map((group) => (
                  <section key={group.day} className="space-y-3">
                    <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                      {group.day}
                    </div>
                    <div className="space-y-2">
                      {group.items.map((log) => {
                        const hasDetails = log.action === "print_document" || (log.details && Object.keys(log.details).length > 0);
                        const isExpanded = expandedLogIds.includes(log.id);

                        return (
                          <article key={log.id} className="rounded-2xl sm:rounded-[2.5rem] border border-slate-50 bg-white p-4 sm:p-5 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-slate-200/40">
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasDetails) return;
                                setExpandedLogIds((current) =>
                                  current.includes(log.id) ? current.filter((id) => id !== log.id) : [...current, log.id]
                                );
                              }}
                              className="w-full flex items-center justify-between gap-3 text-left"
                            >
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm sm:text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight wrap-break-word">{formatAuditAction(log.action)}</h3>
                                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500">{formatAuditSubjectType(log.subjectType)}</span>
                                </div>
                                <p className="mt-1 text-[11px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.04em] sm:tracking-[0.06em] break-all sm:break-normal">
                                  {log.actorEmail || "Sistema"} • {formatAuditSubjectType(log.subjectType)}#{log.subjectId || ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-400">{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</span>
                                {hasDetails ? (
                                  isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />
                                ) : null}
                              </div>
                            </button>

                            {hasDetails && isExpanded ? (
                              <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 text-xs text-slate-600">
                                {log.action === "print_document" ? (
                                  <div className="space-y-2">
                                    <div><strong>Template:</strong> {log.details?.template || "-"}</div>
                                    <div><strong>Formato:</strong> {log.details?.printMode || "-"}</div>
                                    <div><strong>Impresso em:</strong> {log.details?.printedAt ? new Date(log.details.printedAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}</div>
                                  </div>
                                ) : log.details && Object.keys(log.details).length > 0 ? (
                                  <pre className="max-w-full overflow-auto rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">{JSON.stringify(log.details, null, 2)}</pre>
                                ) : (
                                  <div className="text-slate-500">Sem detalhes adicionais.</div>
                                )}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{total} resultado(s)</div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-start">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="w-full sm:w-auto rounded-full border border-slate-100 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                Anterior
              </button>
              <div className="w-full sm:w-auto rounded-full border border-slate-100 bg-slate-50 px-5 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500">Página {page}</div>
              <button disabled={page * perPage >= total} onClick={() => load(page + 1)} className="w-full sm:w-auto rounded-full border border-slate-100 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized" | "denied">("checking");

  useEffect(() => {
    const userData = localStorage.getItem("@FoodSystem:user");

    if (!userData) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.role !== "SUPER_ADMIN") {
        console.warn("⚠️ Acesso negado: Apenas SUPER_ADMIN pode acessar auditoria");
        router.push("/admin");
        setStatus("denied");
        return;
      }

      setStatus("authorized");
    } catch {
      router.push("/login");
    }
  }, [router]);

  if (status === "checking") {
    return <div className="min-h-screen flex items-center justify-center">Validando acesso...</div>;
  }

  if (status === "denied") {
    return null;
  }

  return <AuditContent />;
}
