"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/core/config/api";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Clock3, ShieldCheck, Users, TrendingUp, TriangleAlert, AlertOctagon, DollarSign, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const Line = dynamic(() => import("react-chartjs-2").then((m) => m.Line), { ssr: false });
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const router = useRouter();
  const [kpis, setKpis] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(14);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [data, restaurantData] = await Promise.all([
          api.get("/admin/kpis"),
          api.get("/admin/restaurants")
        ]);
        setKpis(data);
        setRestaurants(Array.isArray(restaurantData) ? restaurantData : []);
      } catch (e: any) {
        setErrorText(e.message || "Erro ao carregar dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!kpis) return;

    const loadTrends = async (d: number) => {
      try {
        const trends = await api.get(`/admin/kpis/trends?days=${d}`);
        setKpis((prev: any) => ({ ...prev, trends }));
      } catch {
        setKpis((prev: any) => ({ ...prev, trends: null }));
      }
    };

    loadTrends(days);
  }, [days, kpis?.totalUsers]);

  const formatMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  const approvalRate = kpis?.totalUsers > 0 ? Math.round(((kpis.totalUsers - kpis.pendingUsers) / kpis.totalUsers) * 100) : 0;
  const pendingUsers = Number(kpis?.pendingUsers || 0);
  const pendingRestaurants = Number(kpis?.pendingRestaurants || 0);
  const inProgressProvisioning = Number(kpis?.provisioning?.IN_PROGRESS || 0);

  const usageSummary = useMemo(() => {
    const summary = {
      warning: 0,
      critical: 0,
      limitReached: 0,
      noPlan: 0,
      topRiskRestaurants: [] as any[]
    };

    for (const restaurant of restaurants) {
      if (!restaurant?.plan) {
        summary.noPlan += 1;
      }

      const status = restaurant?.planUsage?.status;
      if (status === "warning") summary.warning += 1;
      if (status === "critical") summary.critical += 1;
      if (status === "limit_reached") summary.limitReached += 1;
    }

    summary.topRiskRestaurants = [...restaurants]
      .filter((restaurant) => ["warning", "critical", "limit_reached"].includes(restaurant?.planUsage?.status))
      .sort((a, b) => {
        const aRisk = Math.max(Number(a?.planUsage?.orderUsagePercent || 0), Number(a?.planUsage?.productUsagePercent || 0));
        const bRisk = Math.max(Number(b?.planUsage?.orderUsagePercent || 0), Number(b?.planUsage?.productUsagePercent || 0));
        return bRisk - aRisk;
      })
      .slice(0, 5);

    return summary;
  }, [restaurants]);

  const trendSummary = useMemo(() => {
    const buildTrend = (values: number[]) => {
      if (!values.length) {
        return { direction: "stable" as const, deltaPct: 0, current: 0, previous: 0 };
      }

      const segmentSize = Math.max(1, Math.floor(values.length / 2));
      const current = values.slice(-segmentSize).reduce((acc, value) => acc + value, 0);
      const previous = values.slice(0, values.length - segmentSize).reduce((acc, value) => acc + value, 0);

      if (previous <= 0) {
        if (current <= 0) return { direction: "stable" as const, deltaPct: 0, current, previous };
        return { direction: "up" as const, deltaPct: 100, current, previous };
      }

      const deltaPct = Number((((current - previous) / previous) * 100).toFixed(1));
      if (deltaPct > 0.5) return { direction: "up" as const, deltaPct, current, previous };
      if (deltaPct < -0.5) return { direction: "down" as const, deltaPct, current, previous };
      return { direction: "stable" as const, deltaPct: 0, current, previous };
    };

    const users = buildTrend((kpis?.trends?.users || []).map((item: any) => Number(item.count || 0)));
    const restaurantsTrend = buildTrend((kpis?.trends?.restaurants || []).map((item: any) => Number(item.count || 0)));
    const revenue = buildTrend((kpis?.trends?.revenue || []).map((item: any) => Number(item.total || 0)));

    return { users, restaurants: restaurantsTrend, revenue };
  }, [kpis?.trends]);

  const recommendedActions = useMemo(() => {
    const actions: Array<{ title: string; description: string; path: string; tone: "critical" | "warning" | "info" }> = [];

    if (usageSummary.limitReached > 0) {
      actions.push({
        title: "Resolver lojas no limite do plano",
        description: `${usageSummary.limitReached} loja(s) já atingiram o limite e podem travar pedidos online.`,
        path: "/admin/clients?view=stores",
        tone: "critical"
      });
    }

    if (usageSummary.critical > 0) {
      actions.push({
        title: "Atuar nas lojas com uso crítico (95%+)",
        description: `${usageSummary.critical} loja(s) próximas do limite de consumo.`,
        path: "/admin/clients?view=stores",
        tone: "warning"
      });
    }

    if (pendingUsers > 0) {
      actions.push({
        title: "Aprovar clientes pendentes",
        description: `${pendingUsers} cliente(s) aguardando aprovação no onboarding.`,
        path: "/admin/clients",
        tone: "warning"
      });
    }

    if (inProgressProvisioning > 0) {
      actions.push({
        title: "Acompanhar provisionings em andamento",
        description: `${inProgressProvisioning} processo(s) de provisioning exigem monitoramento.`,
        path: "/admin/provisioning",
        tone: "info"
      });
    }

    if (usageSummary.noPlan > 0) {
      actions.push({
        title: "Definir plano para lojas sem contrato",
        description: `${usageSummary.noPlan} loja(s) sem plano associado.`,
        path: "/admin/clients?view=stores",
        tone: "info"
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: "Operação estável",
        description: "Sem riscos críticos agora. Priorize crescimento e revisão de performance.",
        path: "/admin/audit",
        tone: "info"
      });
    }

    return actions.slice(0, 4);
  }, [inProgressProvisioning, pendingUsers, usageSummary]);

  const renderTrendBadge = (trend: { direction: "up" | "down" | "stable"; deltaPct: number }) => {
    if (trend.direction === "up") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
          <ArrowUpRight size={12} /> {Math.abs(trend.deltaPct)}%
        </span>
      );
    }

    if (trend.direction === "down") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">
          <ArrowDownRight size={12} /> {Math.abs(trend.deltaPct)}%
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
        <Minus size={12} /> estável
      </span>
    );
  };

  const alerts: string[] = [];
  if (pendingUsers > 0) alerts.push(`${pendingUsers} cliente(s) aguardando aprovação`);
  if (pendingRestaurants > 0) alerts.push(`${pendingRestaurants} loja(s) pendente(s)`);
  if (inProgressProvisioning > 0) alerts.push(`${inProgressProvisioning} provisioning em andamento`);
  if (usageSummary.limitReached > 0) alerts.push(`${usageSummary.limitReached} loja(s) no limite do plano`);
  if (usageSummary.critical > 0) alerts.push(`${usageSummary.critical} loja(s) com uso crítico de plano`);
  if (usageSummary.noPlan > 0) alerts.push(`${usageSummary.noPlan} loja(s) sem plano definido`);

  const openPage = (path: string) => {
    router.push(path);
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando KPIs...</div>;
  }

  if (!kpis) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="system-hero-band relative overflow-hidden rounded-2xl sm:rounded-[3.5rem] p-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative p-4 sm:p-6 md:p-10 grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Super Admin</p>
            <h1 className="mt-1 text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Painel executivo</h1>
            <p className="mt-2 text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Visão rápida de risco operacional, crescimento e ações críticas.</p>
            {errorText && <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">{errorText}</p>}
          </div>

          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
            <button onClick={() => openPage("/admin/clients")} className="h-10 sm:h-12 md:h-14 rounded-full bg-slate-950 px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white">Gerenciar clientes</button>
            <button onClick={() => openPage("/admin/provisioning?hasRetry=1")} className="h-10 sm:h-12 md:h-14 rounded-full border border-amber-200 bg-amber-50 px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Provisioning com retry</button>
            <button onClick={() => openPage("/admin/audit?subjectType=restaurant")} className="h-10 sm:h-12 md:h-14 rounded-full border border-slate-200 bg-white px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Auditoria de lojas</button>
            <button onClick={() => openPage("/admin/clients?view=inconsistencies")} className="h-10 sm:h-12 md:h-14 rounded-full border border-slate-200 bg-white px-4 sm:px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Resolver inconsistências</button>
          </div>

          <div className="sm:col-span-2 xl:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Período global</p>
              <select
                className="mt-1 w-full bg-transparent text-[12px] font-bold uppercase tracking-[0.08em] text-slate-700 outline-none"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={14}>Últimos 14 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Novos clientes</p>
            {renderTrendBadge(trendSummary.users)}
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{trendSummary.users.current}</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">vs {trendSummary.users.previous} no período anterior</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Novas lojas</p>
            {renderTrendBadge(trendSummary.restaurants)}
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{trendSummary.restaurants.current}</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">vs {trendSummary.restaurants.previous} no período anterior</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Receita (tendência)</p>
            {renderTrendBadge(trendSummary.revenue)}
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatMoney(trendSummary.revenue.current)}</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">vs {formatMoney(trendSummary.revenue.previous)} no período anterior</p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clientes</span>
            <Users size={16} className="text-primary" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950">{kpis.totalUsers}</div>
          <p className="mt-1 text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em]">{pendingUsers} pendentes</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Receita total</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700">{formatMoney(Number(kpis.totalRevenue || 0))}</div>
          <p className="mt-1 text-[11px] font-medium text-emerald-700/80 uppercase tracking-[0.1em]">faturamento agregado</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-sky-100 bg-sky-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">Lojas</span>
            <Building2 size={16} className="text-sky-600" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-sky-700">{kpis.totalRestaurants}</div>
          <p className="mt-1 text-[11px] font-medium text-sky-700/80 uppercase tracking-[0.1em]">{kpis.activeRestaurants} ativas</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Taxa aprovação</span>
            <ShieldCheck size={16} className="text-slate-600" />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950">{approvalRate}%</div>
          <p className="mt-1 text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em]">{inProgressProvisioning} em provisioning</p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-2xl sm:rounded-3xl border border-sky-100 bg-sky-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Uso alto 80%+</span>
            <TrendingUp size={16} className="text-sky-700" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-sky-800">{usageSummary.warning}</div>
          <p className="text-[11px] font-medium text-sky-700/80 uppercase tracking-[0.1em]">lojas em atenção</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-amber-100 bg-amber-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Uso crítico 95%+</span>
            <TriangleAlert size={16} className="text-amber-700" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-800">{usageSummary.critical}</div>
          <p className="text-[11px] font-medium text-amber-700/80 uppercase tracking-[0.1em]">risco de bloqueio</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-rose-100 bg-rose-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Limite atingido</span>
            <AlertOctagon size={16} className="text-rose-700" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-800">{usageSummary.limitReached}</div>
          <p className="text-[11px] font-medium text-rose-700/80 uppercase tracking-[0.1em]">exigem ação imediata</p>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-slate-700">Alertas operacionais</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{alerts.length}</span>
        </div>

        {alerts.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">Sem alertas críticos no momento.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {alerts.map((alert, index) => (
              <div key={`${alert}-${index}`} className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{alert}</div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-slate-700">Lojas em maior risco de plano</h2>
          <button
            onClick={() => openPage('/admin/clients?view=stores')}
            className="h-9 sm:h-10 px-4 rounded-full border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.2em] text-slate-600"
          >
            Ver todas
          </button>
        </div>

        {usageSummary.topRiskRestaurants.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">Nenhuma loja em risco relevante de limite no momento.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {usageSummary.topRiskRestaurants.map((restaurant: any) => {
              const usage = restaurant?.planUsage;
              const peak = Math.max(Number(usage?.orderUsagePercent || 0), Number(usage?.productUsagePercent || 0));
              return (
                <button
                  key={restaurant.id}
                  onClick={() => openPage(`/admin/clients?view=stores&restaurant=${encodeURIComponent(restaurant.slug || restaurant.name || '')}`)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 text-left transition-colors hover:bg-slate-100"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.08em]">{restaurant.name}</p>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.1em]">Plano {restaurant?.plan?.name || 'sem plano'}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 border border-slate-200">
                      Pico {Math.round(peak)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="text-sm text-slate-500">Novos clientes (últimos {days} dias)</div>
          <div className="mt-2">
            {kpis.trends ? (
              <Line
                data={{
                  labels: kpis.trends.users.map((u: any) => u.day),
                  datasets: [
                    {
                      label: "Novos usuários",
                      data: kpis.trends.users.map((u: any) => u.count),
                      borderColor: "rgba(59,130,246,1)",
                      backgroundColor: "rgba(59,130,246,0.2)",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{ responsive: true, plugins: { legend: { position: "top" } } }}
              />
            ) : (
              <div className="text-sm text-slate-500">Sem dados de tendência.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
          <div className="text-sm text-slate-500">Período</div>
          <select className="mt-2 w-full border rounded p-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Receita total</div>
              <div className="mt-1 text-2xl font-black text-slate-950">{formatMoney(Number(kpis.totalRevenue || 0))}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total de lojas</div>
              <div className="mt-1 text-2xl font-black text-slate-950">{kpis.totalRestaurants}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="text-sm text-slate-500">Novas lojas (últimos {days} dias)</div>
        <div className="mt-2">
          {kpis.trends ? (
            <Line
              data={{
                labels: kpis.trends.restaurants.map((r: any) => r.day),
                datasets: [
                  {
                    label: "Novas lojas",
                    data: kpis.trends.restaurants.map((r: any) => r.count),
                    borderColor: "rgba(16,185,129,1)",
                    backgroundColor: "rgba(16,185,129,0.2)",
                    tension: 0.3,
                  },
                ],
              }}
              options={{ responsive: true, plugins: { legend: { position: "top" } } }}
            />
          ) : (
            <div className="text-sm text-slate-500">Sem dados de tendência.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-slate-700">Rotina diária do super admin</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Checklist</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button onClick={() => openPage('/admin/clients')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-bold text-slate-700">
            1. Revisar pendências de clientes
          </button>
          <button onClick={() => openPage('/admin/provisioning?hasRetry=1')} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm font-bold text-amber-700">
            2. Atacar retries de provisioning
          </button>
          <button onClick={() => openPage('/admin/audit?subjectType=restaurant')} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left text-sm font-bold text-sky-700">
            3. Verificar auditoria das ações
          </button>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-slate-700">Ações recomendadas hoje</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Prioridade</span>
        </div>

        <div className="mt-4 space-y-3">
          {recommendedActions.map((action, index) => {
            const toneClass = action.tone === "critical"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : action.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-sky-200 bg-sky-50 text-sky-700";

            return (
              <button
                key={`${action.title}-${index}`}
                onClick={() => openPage(action.path)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors hover:brightness-95 ${toneClass}`}
              >
                <p className="text-[12px] font-black uppercase tracking-[0.12em]">{action.title}</p>
                <p className="mt-1 text-sm font-medium leading-relaxed">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
