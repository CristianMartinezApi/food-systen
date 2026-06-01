import { useState, useEffect } from "react";
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

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");

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

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel de Controle</h1>
        <p className="text-slate-500 font-medium tracking-tight">Bem-vindo de volta! Veja como está sua operação hoje.</p>
      </div>

      {/* Card de Link da Loja - Super Visível */}
      <div className="mb-10 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <ExternalLink size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sua loja está online</span>
            </div>
            <h2 className="text-2xl font-black mb-1">Link do seu Cardápio Digital</h2>
            <p className="text-slate-400 font-medium">Compartilhe este link com seus clientes para receber pedidos.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
             <div className="bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3 group/link cursor-pointer hover:bg-white/15 transition-all">
                <code className="text-emerald-400 font-bold text-lg tracking-tight">
                  {storeUrl.replace('http://', '').replace('https://', '')}
                </code>
             </div>
             
             <button 
                onClick={() => {
                  navigator.clipboard.writeText(storeUrl);
                  toast.success("Link copiado com sucesso!");
                }}
                className="bg-primary text-white font-black px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
             >
                <Plus size={20} />
                COPIAR LINK
             </button>

             <a 
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-slate-900 font-black px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <ExternalLink size={20} />
                ABRIR LOJA
             </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Faturamento" 
          value={formatCurrency(stats?.totalSales || 0)} 
          trend="+12.5%"
          icon={DollarSign} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Total Pedidos" 
          value={stats?.totalOrders || 0} 
          trend="+5.2%"
          icon={ShoppingBag} 
          color="bg-primary"
        />
        <StatCard 
          title="Em Aberto" 
          value={stats?.pendingOrders || 0} 
          trend="-2.1%"
          icon={Clock} 
          color="bg-orange-500"
        />
        <StatCard 
          title="Novos Clientes" 
          value="24" 
          trend="+8.4%"
          icon={Users} 
          color="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Pedidos Modernizada */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Pedidos Recentes</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Últimas 5 movimentações</p>
            </div>
            <Link href="/admin/orders" className="h-10 px-4 rounded-xl border-2 border-slate-50 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              GERENCIAR TODOS <ExternalLink size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {stats?.recentOrders?.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed rounded-3xl">
                  <p className="text-slate-400 font-bold">Nenhum pedido hoje ainda.</p>
              </div>
            ) : (
              stats?.recentOrders?.map((order: any, idx: number) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id} 
                  className="flex items-center justify-between p-5 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:border-primary/30 group-hover:text-primary transition-all shadow-sm">
                      #{order.id.toString().padStart(3, '0')}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-black text-slate-500 uppercase">
                           {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                         </span>
                         <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider",
                            order.status === 'new' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                         )}>
                            {order.status === 'new' ? 'Novo' : 
                             order.status === 'delivered' ? 'Entregue' : 'Em Preparo'}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-slate-900">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.paymentMethod === 'pix' ? 'Via PIX' : 'Cartão/Dinheiro'}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Coluna da Direita (Metas e Popularidade) */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target size={120} />
                </div>
                <h3 className="font-black text-xl uppercase tracking-tighter mb-1">Meta Mensal</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Status da sua meta</p>
                
                <div className="space-y-6 relative z-10">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-3xl font-black">74%</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">R$ 22.400 / R$ 30.000</span>
                        </div>
                        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "74%" }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-primary" 
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Você está <span className="text-white font-bold">R$ 7.600</span> longe de bater sua meta do mês. Continue assim!
                    </p>
                </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter mb-8 flex items-center justify-between">
              Mais Vendidos <TrendingUp size={20} className="text-primary" />
            </h3>
            <div className="space-y-6">
              {[
                { name: "Burger Clássico", sales: "142 vendas", color: "bg-primary" },
                { name: "Double Bacon", sales: "98 vendas", color: "bg-orange-500" },
                { name: "Batata Frita", sales: "87 vendas", color: "bg-amber-500" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className={cn("w-2 h-10 rounded-full", item.color)} />
                  <div className="flex-1">
                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.sales}</p>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                    <ArrowUpRight size={18} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Coluna Lateral - Metas e Ações Rápidas */}
        <div className="space-y-8">
            {/* Metas de Hoje */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Target size={20} />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Metas do Dia</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Vendas</span>
                            <span className="text-sm font-black text-slate-900">75%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "75%" }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Avaliação</span>
                            <span className="text-sm font-black text-slate-900">4.8/5</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "90%" }}
                                className="h-full bg-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                    "O sucesso é o resultado da preparação, trabalho duro e aprendizado com o fracasso."
                </div>
            </div>

            {/* Ações Rápidas */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-900/20">
                <h3 className="font-black text-xl uppercase tracking-tighter mb-6">Atalhos Rápidos</h3>
                <div className="grid grid-cols-2 gap-4">
                    <QuickAction icon={Plus} label="Novo Produto" path="/admin/products" color="bg-white/10" />
                    <QuickAction icon={Settings} label="Ajustes" path="/admin/settings" color="bg-white/10" />
                    <QuickAction icon={ExternalLink} label="Ver Site" path="/" color="bg-primary" />
                    <QuickAction icon={Users} label="Suporte" path="#" color="bg-white/10" />
                </div>
            </div>
        </div>
      </div>
    </>
  );
}

function QuickAction({ icon: Icon, label, path, color }: any) {
    return (
        <Link href={path} className={cn(
            "p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 group",
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
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
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
