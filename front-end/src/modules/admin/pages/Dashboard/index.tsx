"use client";

import { useEffect, useState } from "react";
import { api } from "@/core/config/api";
import dynamic from "next/dynamic";

const Line = dynamic(() => import('react-chartjs-2').then((m) => m.Line), { ssr: false });
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(14);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get('/admin/kpis');
        setKpis(data);
      } catch (e: any) {
        console.error(e);
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
      } catch (e) {
        setKpis((prev: any) => ({ ...prev, trends: null }));
      }
    };
    loadTrends(days);
  }, [days, kpis?.totalUsers]);

  if (loading) return <div>Carregando KPIs...</div>;

  if (!kpis) return <div>Sem dados</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Painel Super‑Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Clientes (total)</div>
          <div className="text-2xl font-bold">{kpis.totalUsers}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Receita total</div>
          <div className="text-2xl font-bold">R$ {Number(kpis.totalRevenue || 0).toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Clientes pendentes</div>
          <div className="text-2xl font-bold">{kpis.pendingUsers}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Lojas ativas</div>
          <div className="text-2xl font-bold">{kpis.activeRestaurants}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="p-4 bg-white rounded shadow flex-1">
            <div className="text-sm text-slate-500">Novos clientes (últimos {days} dias)</div>
          <div className="mt-2">
            {kpis.trends ? (
              <Line
                data={{
                  labels: kpis.trends.users.map((u: any) => u.day),
                  datasets: [
                    {
                      label: 'Novos usuários',
                      data: kpis.trends.users.map((u: any) => u.count),
                      borderColor: 'rgba(59,130,246,1)',
                      backgroundColor: 'rgba(59,130,246,0.2)',
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' } },
                }}
              />
            ) : (
              <div className="text-sm text-slate-500">Sem dados de tendência.</div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow w-64">
          <div className="text-sm text-slate-500">Período</div>
          <select className="mt-2 w-full border rounded p-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>
      </div>

      <div className="p-4 bg-white rounded shadow">
        <div className="text-sm text-slate-500">Novos clientes (últimos 14 dias)</div>

        <div className="mt-2">
          {kpis.trends ? (
            <Line
              data={{
                labels: kpis.trends.restaurants.map((r: any) => r.day),
                datasets: [
                  {
                    label: 'Novas lojas',
                    data: kpis.trends.restaurants.map((r: any) => r.count),
                    borderColor: 'rgba(16,185,129,1)',
                    backgroundColor: 'rgba(16,185,129,0.2)',
                    tension: 0.3,
                  },
                ],
              }}
              options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
            />
          ) : (
            <div className="text-sm text-slate-500">Sem dados de tendência.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Taxa de aprovação</div>
          <div className="text-2xl font-bold">
            {kpis.totalUsers > 0 ? Math.round(((kpis.totalUsers - kpis.pendingUsers) / kpis.totalUsers) * 100) + '%' : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Total lojas</div>
          <div className="text-2xl font-bold">{kpis.totalRestaurants}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Lojas pendentes</div>
          <div className="text-2xl font-bold">{kpis.pendingRestaurants}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-slate-500">Provisioning</div>
          <div className="text-base">
            {Object.entries(kpis.provisioning || {}).map(([k, v]: any) => (
              <div key={k}>{k}: {v}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
