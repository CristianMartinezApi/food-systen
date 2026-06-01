"use client";

import { useEffect, useState } from "react";
import { api } from "../../../core/config/api";
import { formatCurrency } from "../../../shared/utils";
import { Package, Clock, CheckCircle2, XCircle, ChevronRight, ShoppingBag, MapPin, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../shared/utils";
import { socket } from "../../../core/config/socket";
import { getTenantSlug } from "../../../shared/utils/tenant";
import Link from "next/link";

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  useEffect(() => {
    const savedPhone = localStorage.getItem("@FoodSystem:customerPhone");
    if (savedPhone) {
      setPhone(savedPhone);
      fetchOrders(savedPhone);

      // Ouvir atualizações de status via Socket.io
      const slug = getTenantSlug();
      const eventName = `order_status_updated_${slug}`;
      
      socket.on(eventName, (data: any) => {
        // Se o pedido atualizado pertencer a este cliente (mesmo telefone)
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'Aguardando Loja', icon: <Clock size={16} />, color: 'text-amber-500 bg-amber-50 border-amber-100' };
      case 'CONFIRMED': return { label: 'Pedido Confirmado', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
      case 'PREPARING': return { label: 'Em Preparo', icon: <Package size={16} />, color: 'text-blue-500 bg-blue-50 border-blue-100' };
      case 'READY': return { label: 'Pronto para Retirada', icon: <ShoppingBag size={16} />, color: 'text-orange-500 bg-orange-50 border-orange-100' };
      case 'OUT_FOR_DELIVERY': return { label: 'Saiu para Entrega', icon: <MapPin size={16} />, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' };
      case 'DELIVERED': return { label: 'Entregue', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' };
      case 'CANCELLED': return { label: 'Cancelado', icon: <XCircle size={16} />, color: 'text-rose-500 bg-rose-50 border-rose-100' };
      default: return { label: status, icon: <Clock size={16} />, color: 'text-slate-500 bg-slate-50 border-slate-100' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscando seus pedidos...</p>
        </div>
      </div>
    );
  }

  if (!phone) {
    const slug = getTenantSlug();
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-slate-200 flex items-center justify-center mx-auto mb-8">
                <ShoppingBag size={48} className="text-slate-200" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Meus Pedidos</h1>
            <p className="text-slate-500 font-medium mb-10">
                Você ainda não realizou pedidos ou seu telefone não foi identificado.
            </p>
            <Link 
                href={`/${slug}`}
                className="h-16 px-8 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                IR PARA O CARDÁPIO <ChevronRight size={20} />
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
               <Link 
                   href={`/${slug}`}
                   className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary border border-slate-100 shadow-sm transition-all"
               >
                   <ArrowLeft size={24} />
               </Link>
               <div>
                   <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Meus Pedidos</h1>
                   <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Histórico: {phone}</p>
               </div>
            </div>
            <button 
                onClick={() => fetchOrders(phone)}
                className="h-12 px-6 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Clock size={14} /> Atualizar Lista
            </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-[3rem] border border-slate-100 p-16 text-center shadow-sm">
             <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <Package size={36} className="text-slate-200" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Nenhum pedido</h3>
             <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8 leading-relaxed">
                 Parece que você ainda não experimentou nossas delícias. Que tal começar agora?
             </p>
             <Link href={`/${slug}`} className="inline-flex h-14 px-8 bg-slate-900 text-white rounded-2xl font-black items-center gap-3 hover:bg-black transition-all">
                PEDIR AGORA
             </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => {
                const status = getStatusInfo(order.status);
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order.id}
                    className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-6">
                            <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 font-black text-2xl border-2 border-slate-100 group-hover:border-primary group-hover:text-primary transition-all shrink-0">
                                #{order.id.toString().padStart(3, '0')}
                            </div>
                            <div>
                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border mb-3",
                                    status.color
                                )}>
                                    <span className="relative flex h-2 w-2">
                                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                        )}
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                    </span>
                                    {status.label}
                                </div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-slate-900 font-black text-2xl tracking-tighter">
                                        {formatCurrency(order.total)}
                                    </h3>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-6 md:pt-0 border-slate-50">
                            <div className="text-left md:text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pagamento</p>
                                <p className="text-xs font-black text-slate-700 uppercase">{order.paymentMethod}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Detalhes do Pedido Expandidos */}
                    <div className="mt-8 pt-8 border-t border-slate-50">
                        <div className="flex flex-wrap gap-2">
                            {order.items.map((item: any, i: number) => (
                               <div key={i} className="flex-shrink-0 flex items-center gap-3 bg-slate-50/50 hover:bg-slate-100/50 px-4 py-3 rounded-2xl border border-slate-100 transition-colors">
                                   <div className="bg-white w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] text-slate-900 border border-slate-100">
                                       {item.quantity}x
                                   </div>
                                   <div className="flex flex-col">
                                       <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{item.name || item.product?.name}</span>
                                       {item.variation && <span className="text-[9px] font-bold text-slate-400 uppercase">{item.variation}</span>}
                                   </div>
                               </div>
                            ))}
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <p className="mt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            FoodSystem SaaS • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
