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
  Settings,
  AlertTriangle,
  Wallet
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

  const getOrderStatusBadge = (status?: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Aprovação", className: "bg-amber-50 text-amber-700 border-amber-200" },
      OPEN: { label: "Mesa aberta", className: "bg-amber-50 text-amber-700 border-amber-200" },
      CONFIRMED: { label: "Confirmado", className: "bg-sky-50 text-sky-700 border-sky-200" },
      PAID: { label: "Pago / cozinha", className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      PREPARING: { label: "Em produção", className: "bg-blue-50 text-blue-700 border-blue-200" },
      READY: { label: "Pronto", className: "bg-orange-50 text-orange-700 border-orange-200" },
      OUT_FOR_DELIVERY: { label: "Em rota", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      DELIVERED: { label: "Finalizado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      RETIRED: { label: "Finalizado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      CANCELLED: { label: "Cancelado", className: "bg-slate-100 text-slate-500 border-slate-200" },
    };

    return badges[String(status || "").toUpperCase()] || {
      label: status || "Status",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };
  };

  const comparisonLabel = (current: number, previous: number) => {
    if (previous <= 0) return current > 0 ? "+100%" : "0%";
    const variation = Math.round(((current - previous) / previous) * 100);
    return `${variation > 0 ? "+" : ""}${variation}%`;
  };

  const countStatuses = (...statuses: string[]) =>
    (stats?.ordersByStatus || [])
      .filter((entry: any) => statuses.includes(entry.status))
      .reduce((total: number, entry: any) => total + Number(entry.count || 0), 0);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="ops-workspace dashboard-theme space-y-3">
      <div>
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

      <div className="ops-panel p-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Vitrine online</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-950">Endereço público da loja</h2>
          </div>

          <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="break-all font-mono text-xs text-slate-600">
                {storeUrl.replace('http://', '').replace('https://', '')}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("Link copiado para a área de transferência!");
              }}
              className="ops-button border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-grid grid overflow-hidden rounded-md border border-slate-300 bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-slate-200">
        <StatCard
          title="Faturamento de hoje"
          value={formatCurrency(stats?.today?.sales || 0)}
          trend={comparisonLabel(stats?.today?.sales || 0, stats?.yesterday?.sales || 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Pedidos de hoje"
          value={stats?.today?.orders || 0}
          trend={comparisonLabel(stats?.today?.orders || 0, stats?.yesterday?.orders || 0)}
          icon={ShoppingBag}
        />
        <StatCard
          title="Ticket médio"
          value={formatCurrency(stats?.today?.averageTicket || 0)}
          trend={comparisonLabel(stats?.today?.averageTicket || 0, stats?.yesterday?.averageTicket || 0)}
          icon={Target}
        />
        <StatCard
          title="Pedidos ativos"
          value={stats?.pendingOrders || 0}
          trend={`${stats?.alerts?.delayedOrders || 0} atrasado${stats?.alerts?.delayedOrders === 1 ? "" : "s"}`}
          trendTone={(stats?.alerts?.delayedOrders || 0) > 0 ? "danger" : "neutral"}
          icon={Clock}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <section className="ops-panel">
          <div className="ops-panel-header">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Fluxo de pedidos de hoje</h2>
              <p className="mt-1 text-xs text-slate-500">Quantidade em cada etapa da operação.</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-semibold text-slate-600 hover:text-slate-950">
              Abrir cozinha
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
            {[
              ["Aguardando", countStatuses("PENDING", "OPEN", "CONFIRMED")],
              ["Produção", countStatuses("PAID", "PREPARING")],
              ["Prontos", countStatuses("READY", "OUT_FOR_DELIVERY")],
              ["Finalizados", countStatuses("DELIVERED", "RETIRED")],
            ].map(([label, value]) => (
              <div key={String(label)} className="p-4">
                <strong className="block text-2xl font-semibold text-slate-950">{value}</strong>
                <span className="mt-1 block text-xs font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={cn(
          "ops-panel p-4",
          stats?.alerts?.cashClosed || stats?.alerts?.delayedOrders > 0 ? "border-amber-300 bg-amber-50" : "bg-white"
        )}>
          <div className="flex items-start gap-3">
            {stats?.alerts?.cashClosed || stats?.alerts?.delayedOrders > 0
              ? <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
              : <Wallet size={19} className="mt-0.5 shrink-0 text-emerald-700" />}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-950">
                {stats?.cashSession ? "Caixa em operação" : "Caixa fechado"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {stats?.cashSession
                  ? `Aberto por ${stats.cashSession.openedBy?.name || "operador"} às ${new Date(stats.cashSession.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`
                  : "Abra uma sessão antes de iniciar as vendas do turno."}
              </p>
              {(stats?.alerts?.delayedOrders || 0) > 0 && (
                <Link href="/admin/orders" className="mt-2 inline-block text-xs font-bold text-amber-800">
                  Revisar {stats.alerts.delayedOrders} pedido(s) atrasado(s)
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lista de Pedidos Modernizada */}
        <SystemPanel className="dashboard-panel rounded-md p-4 lg:col-span-2">
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
              stats?.recentOrders?.map((order: any, idx: number) => {
                const statusBadge = getOrderStatusBadge(order.status);
                return (
                  <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1 }}
                  key={order.id}
                  className="group flex cursor-pointer flex-col gap-3 border-b border-slate-200 px-2 py-3 transition last:border-b-0 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                    <div className="flex h-10 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 font-mono text-xs font-medium text-slate-500">
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
                          statusBadge.className
                        )}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-heading-3 font-mono font-medium text-slate-950 tracking-tighter">{formatCurrency(order.total)}</p>
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">{formatPaymentMethodLabel(order.paymentMethod)}</p>
                  </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </SystemPanel>

        {/* Coluna da Direita (Metas e Popularidade) */}
        <div className="space-y-4">
          <div className="ops-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="mb-1 text-base font-semibold text-slate-950">Meta de vendas</h3>
                <p className="text-xs text-slate-500">Acompanhamento diário.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTarget((prev) => !prev)}
                className="h-8 cursor-pointer rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isEditingTarget ? "Pronto" : "Editar"}
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-end mb-4">
                  <span className="font-mono text-3xl font-semibold tracking-tight text-slate-950">
                    {Math.min(Math.round(((stats?.totalSales || 0) / dailySalesTarget) * 100), 100)}%
                  </span>
                  <span className="font-mono text-xs font-medium text-slate-500">{formatCurrency(stats?.totalSales || 0)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((stats?.totalSales || 0) / dailySalesTarget) * 100, 100)}%` }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-slate-800"
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
                      className="ops-field font-mono font-semibold"
                      placeholder="5000"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDailySalesTarget(Math.max(100, dailySalesTarget - 100))}
                        className="ops-button flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        −100
                      </button>
                      <button
                        type="button"
                        onClick={() => setDailySalesTarget(dailySalesTarget + 100)}
                        className="ops-button flex-1 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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
                      className="ops-button w-full bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Salvar Meta
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  {((stats?.totalSales || 0) / dailySalesTarget) >= 1 ? (
                    <>Objetivo <span className="font-semibold text-emerald-700">alcançado</span>. Continue crescendo.</>
                  ) : (
                    <>Você está em <span className="font-semibold text-slate-950">{Math.round(((stats?.totalSales || 0) / dailySalesTarget) * 100)}%</span> da meta. Faltam {formatCurrency(Math.max(dailySalesTarget - (stats?.totalSales || 0), 0))}</>
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

          <div className="ops-panel p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-950">Pagamentos de hoje</h3>
              <p className="mt-1 text-xs text-slate-500">Participação por forma de recebimento.</p>
            </div>
            <div className="space-y-3">
              {(stats?.payments || []).length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum pagamento registrado hoje.</p>
              ) : (
                stats.payments.map((payment: any) => {
                  const share = stats?.today?.sales > 0
                    ? Math.round((Number(payment.total || 0) / Number(stats.today.sales)) * 100)
                    : 0;
                  return (
                    <div key={payment.method}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-700">{formatPaymentMethodLabel(payment.method)}</span>
                        <span className="font-mono text-slate-500">{formatCurrency(payment.total)} · {share}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-slate-100">
                        <div className="h-full bg-slate-700" style={{ width: `${Math.min(share, 100)}%` }} />
                      </div>
                    </div>
                  );
                })
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
              <QuickActionCard icon={Plus} label="Novo produto" description="Adicionar item ao catálogo" path="/admin/products" iconColor="text-slate-600" />
              <QuickActionCard icon={ShoppingBag} label="Gerenciar pedidos" description="Ver e processar pedidos" path="/admin/orders" iconColor="text-slate-600" />
              <QuickActionCard icon={Clock} label="Operação de caixa" description="Abrir, fechar e movimentar" path="/admin/caixa" iconColor="text-slate-600" />
              <QuickActionCard icon={Settings} label="Configurações" description="Ajustar informações da loja" path="/admin/settings" iconColor="text-slate-600" />
              <QuickActionCard icon={ExternalLink} label="Abrir vitrine" description="Visualizar como cliente" path={`/${slug}`} iconColor="text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, description, path, iconColor }: any) {
  return (
    <Link href={path} className={cn(
      "group relative overflow-hidden rounded border border-slate-200 bg-white p-3 transition hover:border-slate-400 hover:bg-slate-50"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-slate-100", iconColor)}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-slate-950">{label}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
        </div>
        <div className="text-slate-300 group-hover:text-slate-950 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0">
          <ArrowUpRight size={18} />
        </div>
      </div>
    </Link>
  );
}

function StatCard({ title, value, trend, trendTone, icon: Icon }: any) {
  const trendClass = trendTone === "danger"
    ? "bg-rose-50 text-rose-700"
    : trendTone === "neutral" || trend === "0%"
      ? "bg-slate-100 text-slate-600"
      : String(trend).startsWith("-")
        ? "bg-rose-50 text-rose-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <motion.div
      className="dashboard-kpi-card relative bg-white p-4"
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600">
            <Icon size={16} />
          </div>
          <span className={cn(
            "rounded px-2 py-1 text-[10px] font-semibold",
            trendClass
          )}>
            {trend}
          </span>
        </div>

        <p className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {String(trend).endsWith("%") && (
          <p className="mt-1 text-[10px] text-slate-400">comparado com ontem</p>
        )}
      </div>
    </motion.div>
  );
}
