import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Loader2,
  Clock,
  ExternalLink,
  Users,
  ArrowUpRight,
  Target,
  Plus,
  Settings
} from "lucide-react";
import { formatCurrency, cn } from "../../../shared/utils";
import { api } from "../../../core/config/api";
import { socket } from "../../../core/config/socket";
import { getTenantSlug } from "../../../shared/utils/tenant";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { AdminPageHeader, SystemPanel } from "../components/layout/AdminPageHeader";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");
  const [dailySalesTarget, setDailySalesTarget] = useState<number>(5000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  useEffect(() => {
    setSlug(getTenantSlug());
    // Carregar meta de vendas do localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dailySalesTarget');
      if (saved) {
        setDailySalesTarget(parseFloat(saved));
      }
    }
  }, []);

  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : '';

  const fetchStats = async () => {
    try {
      const data = await api.get('/stats');
      setStats(data);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const slug = getTenantSlug();
    const newOrderEvent = `new_order_${slug}`;
    const statusUpdateEvent = `order_status_updated_${slug}`;

    socket.on(newOrderEvent, () => fetchStats());
    socket.on(statusUpdateEvent, () => fetchStats());

    return () => {
      socket.off(newOrderEvent);
      socket.off(statusUpdateEvent);
    };
  }, []);

  const formatPaymentMethodLabel = (value?: string) => {
    const normalized = String(value || "").toUpperCase();
    if (normalized === "PIX") return "PIX";
    if (normalized === "CASH") return "DINHEIRO";
    if (normalized === "DEBIT") return "DEBITO";
    if (normalized === "CREDIT") return "CREDITO";
    if (normalized === "CARD") return "CARTAO";
    if (normalized === "OPEN") return "EM ABERTO";
    return normalized || "NAO INFORMADO";
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="dashboard-hero">
        <AdminPageHeader
          eyebrow="Operação da loja"
          title="Painel operacional"
          description="Resumo de vendas, pedidos em aberto e atalhos para a operação diária."
          status={
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Loja ativa
            </span>
          }
        />
      </div>

      <div className="dashboard-link-card relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 text-white shadow-sm sm:p-5">
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Operação digital ativa</span>
            </div>
            <h2 className="text-base font-semibold">Vitrine pública da loja</h2>
            <p className="mt-1 text-sm text-slate-400">Copie e compartilhe o endereço com seus clientes.</p>
          </div>

          <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <code className="break-all font-mono text-sm text-slate-200">
                {storeUrl.replace('http://', '').replace('https://', '')}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("Link copiado para a área de transferência!");
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-slate-950 transition hover:bg-primary hover:text-white"
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Faturamento Bruto"
          value={formatCurrency(stats?.totalSales || 0)}
          trend="+12%"
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          title="Fluxo de Pedidos"
          value={stats?.totalOrders || 0}
          trend="+8 hoje"
          icon={ShoppingBag}
          color="bg-primary"
        />
        <StatCard
          title="Pedidos em Espera"
          value={stats?.pendingOrders || 0}
          trend="ação"
          icon={Clock}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lista de Pedidos Modernizada */}
        <SystemPanel className="dashboard-panel p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Pedidos recentes</h3>
              <p className="mt-1 text-sm text-slate-500">Últimas movimentações em tempo real.</p>
            </div>
            <Link href="/admin/orders" className="text-[11px] sm:text-label font-body font-bold text-primary hover:bg-primary/5 px-4 sm:px-6 h-10 sm:h-auto sm:py-3 rounded-xl transition-all uppercase tracking-[0.06em] border-2 border-primary/10 inline-flex items-center justify-center w-full sm:w-auto">
              Abrir pedidos
            </Link>
          </div>

          <div className="space-y-2">
            {stats?.recentOrders?.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
                <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhum pedido recente registrado.</p>
              </div>
            ) : (
              stats?.recentOrders?.map((order: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id}
                  className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-mono font-medium text-slate-300 group-hover:border-primary/20 group-hover:text-primary transition-all shadow-sm">
                      #{order.id.toString().slice(-3)}
                    </div>
                    <div>
                      <p className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight leading-none mb-1.5">{order.customerName}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                        <span className={cn(
                          "text-[10px] font-body font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border",
                          order.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                        )}>
                          {order.status === 'PENDING' ? 'Aprovação' :
                            order.status === 'DELIVERED' ? 'Finalizado' : 'Produção'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-heading-3 font-mono font-medium text-slate-950 tracking-tighter">{formatCurrency(order.total)}</p>
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">{formatPaymentMethodLabel(order.paymentMethod)}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </SystemPanel>

        {/* Coluna da Direita (Metas e Popularidade) */}
        <div className="space-y-4">
          <div className="dashboard-panel group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
            <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Target size={160} />
            </div>
            <div className="relative z-10 mb-5 flex items-center justify-between">
              <div>
                <h3 className="mb-1 text-base font-semibold">Meta de vendas</h3>
                <p className="text-xs text-slate-400">Ajuste a meta diária da operação.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTarget((prev) => !prev)}
                className="relative z-20 h-9 cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white hover:text-slate-950"
              >
                {isEditingTarget ? "Pronto" : "Editar"}
              </button>
            </div>

            <div className="space-y-8 relative z-10">
              <div>
                <div className="flex justify-between items-end mb-4">
                  <span className="text-4xl font-mono font-medium tracking-tighter">
                    {Math.min(Math.round(((stats?.totalSales || 0) / dailySalesTarget) * 100), 100)}%
                  </span>
                  <span className="text-label font-mono font-medium text-slate-500 uppercase">{formatCurrency(stats?.totalSales || 0)}</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((stats?.totalSales || 0) / dailySalesTarget) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
              
              {isEditingTarget ? (
                <div className="space-y-3">
                  <label className="text-label font-body font-medium text-slate-300 uppercase tracking-[0.06em] block">
                    Meta diária (R$):
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dailySalesTarget.toFixed(0)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '');
                        if (val === '') {
                          setDailySalesTarget(100);
                        } else {
                          const num = Math.max(100, parseInt(val, 10));
                          setDailySalesTarget(num);
                        }
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-400 font-mono font-bold text-lg focus:outline-none focus:border-primary/50 transition-all"
                      placeholder="5000"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDailySalesTarget(Math.max(100, dailySalesTarget - 100))}
                        className="flex-1 bg-white/5 border border-white/20 text-white py-2 rounded-lg font-bold text-sm hover:bg-white/10 transition-all active:scale-95"
                      >
                        −100
                      </button>
                      <button
                        type="button"
                        onClick={() => setDailySalesTarget(dailySalesTarget + 100)}
                        className="flex-1 bg-white/5 border border-white/20 text-white py-2 rounded-lg font-bold text-sm hover:bg-white/10 transition-all active:scale-95"
                      >
                        +100
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('dailySalesTarget', dailySalesTarget.toString());
                        setIsEditingTarget(false);
                        toast.success("Meta salva com sucesso!");
                      }}
                      className="w-full bg-primary text-white py-2 rounded-lg font-bold uppercase tracking-[0.06em] text-sm hover:bg-primary/80 transition-all"
                    >
                      Salvar Meta
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-relaxed">
                  {((stats?.totalSales || 0) / dailySalesTarget) >= 1 ? (
                    <>Objetivo <span className="text-emerald-400 font-bold">ALCANÇADO</span>. Continue crescendo!</>
                  ) : (
                    <>Você está em <span className="text-white font-bold">{Math.round(((stats?.totalSales || 0) / dailySalesTarget) * 100)}%</span> da meta. Faltam {formatCurrency(Math.max(dailySalesTarget - (stats?.totalSales || 0), 0))}</>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="dashboard-panel group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Produtos mais vendidos</h3>
                <p className="mt-1 text-sm text-slate-500">Desempenho no período atual.</p>
              </div>
              <TrendingUp size={24} className="text-primary" />
            </div>
            <div className="space-y-4">
              {stats?.topProducts?.length === 0 ? (
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Aguardando dados de vendas...</p>
              ) : (
                stats?.topProducts?.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center gap-6">
                    <div className={cn("w-1.5 h-12 rounded-full", idx === 0 ? "bg-primary" : idx === 1 ? "bg-slate-950" : "bg-slate-200")} />
                    <div className="flex-1">
                      <p className="text-body-strong font-body font-bold text-slate-950 uppercase tracking-tight leading-none mb-1.5">{item.name}</p>
                      <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">{item.sales}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna Lateral - Ações Rápidas */}
        <div className="space-y-4">
          {/* Ações Rápidas */}
          <div className="dashboard-panel space-y-3">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-950">Ações rápidas</h3>
              <p className="mt-1 text-sm text-slate-500">Acesse os principais recursos operacionais.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard icon={Plus} label="Novo Produto" description="Adicionar item ao catálogo" path="/admin/products" color="bg-gradient-to-br from-emerald-50 to-emerald-100" iconColor="text-emerald-600" />
              <QuickActionCard icon={ShoppingBag} label="Gerenciar Pedidos" description="Ver e processar pedidos" path="/admin/orders" color="bg-gradient-to-br from-blue-50 to-blue-100" iconColor="text-blue-600" />
              <QuickActionCard icon={Clock} label="Operação de Caixa" description="Abrir/fechar e movimentar" path="/admin/caixa" color="bg-gradient-to-br from-amber-50 to-amber-100" iconColor="text-amber-600" />
              <QuickActionCard icon={Settings} label="Configurações" description="Ajustar informações da loja" path="/admin/settings" color="bg-gradient-to-br from-slate-50 to-slate-100" iconColor="text-slate-600" />
              <QuickActionCard icon={ExternalLink} label="Ver Loja Pública" description="Acessar como cliente" path={`/${slug}`} color="bg-gradient-to-br from-primary/10 to-primary/20" iconColor="text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, description, path, color, iconColor }: any) {
  return (
    <Link href={path} className={cn(
      "group relative overflow-hidden rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm",
      color
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/60 group-hover:bg-white transition-all duration-300", iconColor)}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-950 uppercase tracking-tight leading-tight">{label}</p>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.05em] mt-0.5">{description}</p>
        </div>
        <div className="text-slate-300 group-hover:text-slate-950 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0">
          <ArrowUpRight size={18} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-white opacity-0 transition-opacity group-hover:opacity-5" />
    </Link>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", color)}>
            <Icon size={18} />
          </div>
          <span className={cn(
            "text-[10px] font-black px-2 py-1 rounded-lg",
            trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {trend}
          </span>
        </div>

        <p className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{title}</p>
      </div>
    </motion.div>
  );
}
