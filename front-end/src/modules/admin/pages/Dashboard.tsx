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
import { gsap } from "gsap";

export default function Dashboard() {
  // Desativar avisos de alvos nulos do GSAP
  gsap.config({ nullTargetWarn: false });

  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");
  const [dailySalesTarget, setDailySalesTarget] = useState<number>(5000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (isLoading || !rootRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".dashboard-hero", { y: -18, opacity: 0, duration: 0.7 })
        .from(".dashboard-link-card", { y: 24, opacity: 0, duration: 0.8 }, "-=0.2")
        .from(".dashboard-stat", { y: 18, opacity: 0, duration: 0.55, stagger: 0.08 }, "-=0.35")
        .from(".dashboard-panel", { y: 24, opacity: 0, duration: 0.75, stagger: 0.1 }, "-=0.35");
    }, rootRef);

    return () => ctx.revert();
  }, [isLoading, stats]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <div className="dashboard-hero system-hero-band mb-8 sm:mb-12 p-4 sm:p-6 md:p-10">
        <p className="text-[10px] sm:text-label font-body font-bold text-primary uppercase tracking-[0.2em]">Hub Administrativo</p>
        <h1 className="mt-1 text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Painel operacional</h1>
        <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Resumo de vendas, pedidos em aberto e atalhos para operação diária</p>
      </div>

      {/* Card de Link da Loja - Super Visível */}
      <div className="dashboard-link-card mb-8 sm:mb-12 bg-slate-950 rounded-2xl sm:rounded-[3rem] p-4 sm:p-6 md:p-10 text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
          <ExternalLink size={120} className="sm:hidden" />
          <ExternalLink size={160} className="hidden sm:block" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-10">
          <div>
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[12px] sm:text-label font-body font-medium uppercase tracking-[0.06em] text-emerald-500">Operação Digital Ativa</span>
            </div>
            <h2 className="text-xl sm:text-heading-2 font-display font-bold uppercase tracking-tight mb-2">Acesso à vitrine da loja</h2>
            <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Copie e compartilhe o link público com seus clientes.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 px-4 sm:px-8 py-3 sm:py-5 rounded-2xl flex items-center gap-3 sm:gap-4 group/link cursor-pointer hover:bg-white/10 transition-all min-w-0">
              <code className="text-primary font-mono font-medium text-sm sm:text-lg tracking-tighter break-all">
                {storeUrl.replace('http://', '').replace('https://', '')}
              </code>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("Link copiado para a área de transferência!");
              }}
              className="h-10 sm:h-12 md:h-16 px-4 sm:px-6 md:px-10 bg-white text-slate-950 rounded-full font-body font-bold text-[11px] sm:text-label uppercase tracking-[0.06em] hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto"
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-16">
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
        <StatCard
          title="Clientes Cadastrados"
          value={stats?.totalCustomers || 0}
          trend="base"
          icon={Users}
          color="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-10">
        {/* Lista de Pedidos Modernizada */}
        <div className="dashboard-panel lg:col-span-2 bg-white rounded-2xl sm:rounded-[3rem] border border-slate-50 p-4 sm:p-6 md:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-10">
            <div>
              <h3 className="text-xl sm:text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Pedidos recentes</h3>
              <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">Últimas movimentações em tempo real</p>
            </div>
            <Link href="/admin/orders" className="text-[11px] sm:text-label font-body font-bold text-primary hover:bg-primary/5 px-4 sm:px-6 h-10 sm:h-auto sm:py-3 rounded-xl transition-all uppercase tracking-[0.06em] border-2 border-primary/10 inline-flex items-center justify-center w-full sm:w-auto">
              Abrir pedidos
            </Link>
          </div>

          <div className="space-y-6">
            {stats?.recentOrders?.length === 0 ? (
              <div className="py-12 sm:py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl sm:rounded-[2.5rem]">
                <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhum pedido recente registrado.</p>
              </div>
            ) : (
              stats?.recentOrders?.map((order: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border border-slate-50 rounded-2xl sm:rounded-4xl hover:bg-slate-50/50 transition-all group cursor-pointer"
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
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">{order.paymentMethod}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Coluna da Direita (Metas e Popularidade) */}
        <div className="space-y-10">
          <div className="dashboard-panel bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden group">
            <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-1000">
              <Target size={160} />
            </div>
            <div className="relative z-10 flex items-center justify-between mb-8">
              <div>
                <h3 className="text-heading-3 font-display font-bold uppercase tracking-tight mb-1">Meta de vendas</h3>
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Use o botão editar para ajustar a meta diária</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTarget((prev) => !prev)}
                className="relative z-20 h-10 px-4 rounded-full border border-white/20 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-slate-950 transition-all cursor-pointer active:scale-95"
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

          <div className="dashboard-panel bg-white rounded-[3rem] border border-slate-50 p-10 shadow-sm overflow-hidden relative group">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Produtos Top Vendas</h3>
                <p className="mt-1 text-[12px] font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Seus best-sellers do período</p>
              </div>
              <TrendingUp size={24} className="text-primary" />
            </div>
            <div className="space-y-8">
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
        <div className="space-y-8">
          {/* Ações Rápidas */}
          <div className="dashboard-panel bg-slate-900 rounded-4xl p-8 text-white shadow-xl shadow-slate-900/20">
            <div className="mb-6">
              <h3 className="font-black text-xl uppercase tracking-tighter">Gerenciamento Rápido</h3>
              <p className="mt-1 text-[11px] font-medium text-slate-400 uppercase tracking-[0.06em]">Acesso direto às funções principais</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <QuickAction icon={Plus} label="Novo Produto" path="/admin/products" color="bg-white/10" />
              <QuickAction icon={Settings} label="Configurar" path="/admin/settings" color="bg-white/10" />
              <QuickAction icon={ExternalLink} label="Ver Loja" path={`/${slug}`} color="bg-primary" />
              <QuickAction icon={Users} label="Clientes" path="/admin/clients" color="bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, path, color }: any) {
  return (
    <Link href={path} className={cn(
      "p-5 rounded-full flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 group",
      color
    )}>
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-colors">
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-center">{label}</span>
    </Link>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg", color)}>
            <Icon size={24} />
          </div>
          <span className={cn(
            "text-[10px] font-black px-2 py-1 rounded-lg",
            trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {trend}
          </span>
        </div>

        <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
    </motion.div>
  );
}
