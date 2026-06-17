"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import dynamic from "next/dynamic";
import { AlertTriangle, Building2, Clock3, ShieldCheck, Users } from "lucide-react";

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
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(14);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get("/admin/kpis");
        setKpis(data);
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

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando KPIs...</div>;
  }

  if (!kpis) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados</div>;
  }

  const approvalRate = kpis.totalUsers > 0 ? Math.round(((kpis.totalUsers - kpis.pendingUsers) / kpis.totalUsers) * 100) : 0;
  const pendingUsers = Number(kpis.pendingUsers || 0);
  const pendingRestaurants = Number(kpis.pendingRestaurants || 0);
  const inProgressProvisioning = Number(kpis.provisioning?.IN_PROGRESS || 0);

  const alerts: string[] = [];
  if (pendingUsers > 0) alerts.push(`${pendingUsers} cliente(s) aguardando aprovação`);
  if (pendingRestaurants > 0) alerts.push(`${pendingRestaurants} loja(s) pendente(s)`);
  if (inProgressProvisioning > 0) alerts.push(`${inProgressProvisioning} provisioning em andamento`);

  const openPage = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="space-y-8">
      <div className="system-hero-band relative overflow-hidden rounded-[3.5rem] p-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.02),transparent_45%)]" />
        <div className="relative p-8 md:p-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Super Admin</p>
            <h1 className="mt-1 text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Painel executivo</h1>
            <p className="mt-2 text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Visão rápida de risco operacional, crescimento e ações críticas.</p>
            {errorText && <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">{errorText}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => openPage("/admin/clients")} className="h-14 rounded-full bg-slate-950 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-white">Gerenciar clientes</button>
            <button onClick={() => openPage("/admin/provisioning?hasRetry=1")} className="h-14 rounded-full border border-amber-200 bg-amber-50 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Provisioning com retry</button>
            <button onClick={() => openPage("/admin/audit?subjectType=restaurant")} className="h-14 rounded-full border border-slate-200 bg-white px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Auditoria de lojas</button>
            <button onClick={() => openPage("/admin/clients")} className="h-14 rounded-full border border-slate-200 bg-white px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Resolver inconsistências</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clientes</span>
            <Users size={16} className="text-primary" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">{kpis.totalUsers}</div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Pendentes</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-amber-700">{pendingUsers}</div>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Lojas ativas</span>
            <Building2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-700">{kpis.activeRestaurants}</div>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">Em provisioning</span>
            <Clock3 size={16} className="text-sky-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-sky-700">{inProgressProvisioning}</div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Taxa aprovação</span>
            <ShieldCheck size={16} className="text-slate-600" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950">{approvalRate}%</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-700">Alertas operacionais</h2>
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
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

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Período</div>
          <select className="mt-2 w-full border rounded p-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Receita total</div>
              <div className="mt-1 text-2xl font-black text-slate-950">R$ {Number(kpis.totalRevenue || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total de lojas</div>
              <div className="mt-1 text-2xl font-black text-slate-950">{kpis.totalRestaurants}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
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

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-700">Rotina diária do super admin</h2>
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
    </div>
  );
}
