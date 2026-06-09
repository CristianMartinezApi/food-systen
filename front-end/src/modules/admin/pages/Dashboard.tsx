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
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSlug(getTenantSlug());
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
      <div className="dashboard-hero mb-12">
        <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight leading-none">Visão de Topo</h1>
        <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Gestão Estratégica & Performance Operacional</p>
      </div>

      {/* Card de Link da Loja - Super Visível */}
      <div className="dashboard-link-card mb-12 bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
          <ExternalLink size={160} />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-label font-body font-medium uppercase tracking-[0.06em] text-emerald-500">Operação Digital Ativa</span>
            </div>
            <h2 className="text-heading-2 font-display font-bold uppercase tracking-tight mb-2">Seu Portal Gourmet</h2>
            <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Compartilhe o acesso exclusivo para seus clientes.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="bg-white/5 backdrop-blur-3xl border border-white/10 px-8 py-5 rounded-2xl flex items-center gap-4 group/link cursor-pointer hover:bg-white/10 transition-all">
                <code className="text-primary font-mono font-medium text-lg tracking-tighter">
                  {storeUrl.replace('http://', '').replace('https://', '')}
                </code>
             </div>
             
             <button 
                onClick={() => {
                   navigator.clipboard.writeText(storeUrl);
                   toast.success("Link copiado para a área de transferência!");
                }}
                 className="h-16 px-10 bg-white text-slate-950 rounded-full font-body font-bold text-label uppercase tracking-[0.06em] hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
             >
                Copiando Link
             </button> 
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard 
          title="Faturamento Bruto" 
          value={formatCurrency(stats?.totalSales || 0)} 
          trend="+R$ 0,00"
          icon={DollarSign} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Fluxo de Pedidos" 
          value={stats?.totalOrders || 0} 
          trend="Total"
          icon={ShoppingBag} 
          color="bg-primary"
        />
        <StatCard 
          title="Pedidos em Espera" 
          value={stats?.pendingOrders || 0} 
          trend="Abertas"
          icon={Clock} 
          color="bg-orange-500"
        />
        <StatCard 
          title="Membros VIP" 
          value={stats?.totalCustomers || 0} 
          trend="Base"
          icon={Users} 
          color="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Lista de Pedidos Modernizada */}
        <div className="dashboard-panel lg:col-span-2 bg-white rounded-[3rem] border border-slate-50 p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
                <h3 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Fluxo Recente</h3>
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-1">Últimas interações em tempo real</p>
            </div>
            <Link href="/admin/orders" className="text-label font-body font-bold text-primary hover:bg-primary/5 px-6 py-3 rounded-xl transition-all uppercase tracking-[0.06em] border-2 border-primary/10">
              Relatório Completo
            </Link>
          </div>
          
          <div className="space-y-6">
            {stats?.recentOrders?.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                  <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Nenhuma atividade registrada hoje.</p>
              </div>
            ) : (
              stats?.recentOrders?.map((order: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id} 
                  className="flex items-center justify-between p-6 border border-slate-50 rounded-4xl hover:bg-slate-50/50 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-6">
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
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Target size={160} />
                </div>
                <h3 className="text-heading-3 font-display font-bold uppercase tracking-tight mb-2">Meta Performance</h3>
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-10">Faturamento Alvo: {formatCurrency(5000)}</p>
                
                <div className="space-y-8 relative z-10">
                    <div>
                        <div className="flex justify-between items-end mb-4">
                           <span className="text-4xl font-mono font-medium tracking-tighter">
                             {Math.min(Math.round(((stats?.totalSales || 0) / 5000) * 100), 100)}%
                           </span>
                           <span className="text-label font-mono font-medium text-slate-500 uppercase">{formatCurrency(stats?.totalSales || 0)}</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(((stats?.totalSales || 0) / 5000) * 100, 100)}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-primary" 
                            />
                        </div>
                    </div>
                    <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] leading-relaxed">
                        Desempenho <span className="text-white font-bold">{((stats?.totalSales || 0) / 5000) >= 1 ? 'Excepcional' : 'Promissor'}</span>. Faltam {formatCurrency(Math.max(5000 - (stats?.totalSales || 0), 0))} para a meta.
                    </p>
                </div>
          </div>

          <div className="dashboard-panel bg-white rounded-[3rem] border border-slate-50 p-10 shadow-sm overflow-hidden relative group">
            <h3 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight mb-10 flex items-center justify-between">
              Elite Mix <TrendingUp size={24} className="text-primary" />
            </h3>
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
                <h3 className="font-black text-xl uppercase tracking-tighter mb-6">Atalhos Rápidos</h3>
                <div className="grid grid-cols-2 gap-4">
                    <QuickAction icon={Plus} label="Novo Produto" path="/admin/products" color="bg-white/10" />
                    <QuickAction icon={Settings} label="Ajustes" path="/admin/settings" color="bg-white/10" />
                    <QuickAction icon={ExternalLink} label="Ver Site" path={`/${slug}`} color="bg-primary" />
                    <QuickAction icon={Users} label="Suporte" path="#" color="bg-white/10" />
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
