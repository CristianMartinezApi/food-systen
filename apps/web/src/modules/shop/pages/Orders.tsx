"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "../../../core/config/api";
import { formatCurrency, cn } from "../../../shared/utils";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ShoppingBag, 
  MapPin, 
  Loader2, 
  ArrowLeft,
  CircleDot,
  Bike,
  Star,
  Zap,
  Phone,
  MessageCircle,
  TrendingUp,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../../../core/config/socket";
import { getTenantSlug } from "../../../shared/utils/tenant";
import Link from "next/link";
import { Footer } from "../components/layout/Footer";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  const fetchOrders = async (phoneToFetch: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/customer/orders/${phoneToFetch}`);
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem("@FoodSystem:customerPhone");
    if (savedPhone) {
      setPhone(savedPhone);
      fetchOrders(savedPhone);

      const currentSlug = getTenantSlug();
      const eventName = `order_status_updated_${currentSlug}`;
      
      socket.on(eventName, (data: any) => {
        if (data.phone === savedPhone) {
           setOrders(prev => prev.map(o => o.id === data.id ? { ...o, status: data.status } : o));
        }
      });

      return () => {
        socket.off(eventName);
      };
    } else {
      setLoading(false);
    }
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'Aguardando Loja', icon: <Clock size={16} />, color: 'text-amber-500', bg: 'bg-amber-50', progress: 20 };
      case 'CONFIRMED': return { label: 'Confirmado', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', progress: 40 };
      case 'PREPARING': return { label: 'Em Preparo', icon: <Package size={16} />, color: 'text-blue-500', bg: 'bg-blue-50', progress: 60 };
      case 'READY': return { label: 'Pronto p/ Retirada', icon: <ShoppingBag size={16} />, color: 'text-orange-500', bg: 'bg-orange-50', progress: 80 };
      case 'OUT_FOR_DELIVERY': return { label: 'Em Rota de Entrega', icon: <Bike size={16} className="animate-bounce" />, color: 'text-indigo-500', bg: 'bg-indigo-50', progress: 90 };
      case 'DELIVERED': return { label: 'Entregue', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', progress: 100 };
      case 'CANCELLED': return { label: 'Pedido Cancelado', icon: <XCircle size={16} />, color: 'text-rose-500', bg: 'bg-rose-50', progress: 0 };
      default: return { label: status, icon: <Clock size={16} />, color: 'text-slate-500', bg: 'bg-slate-50', progress: 0 };
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col selection:bg-primary selection:text-white">
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-50 sticky top-0 z-50 py-6">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
           <Link href={`/${slug}`} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-all">
                <ArrowLeft size={24} />
           </Link>
           <div className="text-center">
                <h1 className="text-heading-2 font-display text-slate-900 uppercase tracking-tighter leading-none mb-1">Meu Histórico</h1>
                <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Experiência Gastronômica</p>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary shadow-lg shadow-slate-950/20">
                <History size={20} />
           </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        {!phone ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
                <div className="relative w-32 h-32 bg-slate-50 rounded-[4rem] flex items-center justify-center text-slate-200 border border-white">
                    <ShoppingBag size={56} />
                </div>
            </div>
            <div className="space-y-3">
                <h2 className="text-heading-1 font-display text-slate-900 uppercase tracking-tight">Cesto de Histórico Vazio</h2>
                <p className="text-slate-500 font-body font-medium max-w-xs mx-auto">Você precisa realizar seu primeiro pedido para ver o histórico aqui.</p>
            </div>
            <Link href={`/${slug}`} className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-body font-medium flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.06em] text-label">
                Explorar Cardápio <ChevronRight size={18} />
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
                <h2 className="text-label font-body font-medium text-slate-900 uppercase tracking-[0.06em] flex items-center gap-3">
                    <div className="w-2 h-6 bg-primary rounded-full" />
                    Últimas Atividades
                </h2>
                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    {orders.length} PEDIDOS
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {orders.map((order, idx) => {
                const status = getStatusInfo(order.status);
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={order.id}
                    className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-4">
                           <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500", status.bg, status.color)}>
                             {status.icon}
                           </div>
                           <div>
                             <p className="text-label font-mono text-slate-400 uppercase tracking-widest leading-none mb-1.5">ID: {order.id.toString().padStart(4, '0')}</p>
                             <h3 className={cn("text-heading-3 font-body font-bold uppercase tracking-tighter leading-none", status.color)}>
                                {status.label}
                             </h3>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex flex-col">
                                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">DATA</span>
                                <span className="text-numeric font-mono text-slate-800 tracking-tight">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">TOTAL</span>
                                <span className="text-numeric font-mono text-primary tracking-tight">{formatCurrency(order.total)}</span>
                            </div>
                            <div className="flex flex-col md:col-span-2">
                                <span className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">SABORES</span>
                                <p className="text-body font-body text-slate-600 truncate uppercase tracking-tight">
                                    {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                                </p>
                            </div>
                        </div>

                        {/* Barra de Progresso Real-time */}
                        {order.status !== 'CANCELLED' && (
                            <div className="space-y-3 pt-2">
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${status.progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={cn("h-full", status.color.replace('text', 'bg'))}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-label font-body font-medium text-slate-200 uppercase tracking-[0.06em]">
                                    <span className={status.progress >= 20 ? "text-slate-400" : ""}>SOLICITADO</span>
                                    <span className={status.progress >= 60 ? "text-slate-400" : ""}>PREPARO</span>
                                    <span className={status.progress >= 90 ? "text-slate-400" : ""}>ENTREGA</span>
                                </div>
                            </div>
                        )}
                      </div>

                      <div className="flex md:flex-col gap-3 justify-center min-w-[140px]">
                         <button className="h-14 px-6 bg-slate-900 text-white rounded-2xl font-body font-medium text-label uppercase tracking-[0.06em] flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95">
                            DETALHES <ChevronRight size={14} />
                         </button>
                         {order.status === 'SHIPPED' && (
                            <button className="h-14 px-6 bg-emerald-500 text-white rounded-2xl font-body font-medium text-label uppercase tracking-[0.06em] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95">
                                <MessageCircle size={16} /> AJUDA
                            </button>
                         )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
