import { useState, useEffect, useRef } from "react";
import { 
  Loader2,
  Clock,
  ChevronRight,
  MapPin,
  CreditCard,
  PackageCheck,
  Phone,
  MessageCircle,
  XCircle,
  Printer
} from "lucide-react";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { formatCurrency, cn } from "../../../../shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
   const rootRef = useRef<HTMLDivElement>(null);

   const filteredOrders = orders.filter(o => 
      statusFilter === "ALL" ? true : o.status === statusFilter
   );

  const fetchOrders = async () => {
    try {
      const data = await api.get("/orders");
      setOrders(data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.patch(`/orders/${orderId}`, { status });
      fetchOrders();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const slug = getTenantSlug();
    const eventName = `new_order_${slug}`;
    
    socket.on(eventName, () => fetchOrders());
    return () => {
      socket.off(eventName);
    };
  }, []);

   useEffect(() => {
      if (isLoading || !rootRef.current) return;

      const ctx = gsap.context(() => {
         const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
         tl.from(".orders-hero", { y: -18, opacity: 0, duration: 0.7 })
            .from(".orders-filters", { y: 20, opacity: 0, duration: 0.7 }, "-=0.2")
            .from(".order-card", { y: 22, opacity: 0, duration: 0.6, stagger: 0.06 }, "-=0.35");
      }, rootRef);

      return () => ctx.revert();
    }, [isLoading, orders.length, statusFilter]);

  return (
      <div ref={rootRef} className="min-h-screen bg-slate-50/50 p-8">
         <div className="orders-hero flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Expedição</h1>
          <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Gestão logística e acompanhamento de fluxo em tempo real.</p>
        </div>
        
      <div className="orders-filters flex bg-white p-2 rounded-3xl border border-slate-100 shadow-sm">
            {[
              { id: "ALL", label: "Global" },
              { id: "PENDING", label: "Novos" },
              { id: "PREPARING", label: "Cozinha" },
              { id: "DELIVERED", label: "Entregues" }
            ].map((f) => (
                <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={cn(
                        "px-8 h-12 rounded-2xl text-label font-body font-bold uppercase tracking-[0.06em] transition-all",
                        statusFilter === f.id ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                >
                    {f.label}
                </button>
            ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center gap-6">
             <Loader2 className="animate-spin text-primary" size={40} />
             <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Sincronizando fluxo...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {filteredOrders.length === 0 ? (
               <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem] text-center bg-white"
               >
                  <PackageCheck size={64} className="text-slate-200 mb-6" />
                  <p className="text-label font-body font-bold text-slate-400 uppercase tracking-widest">Nenhum pedido no fluxo atual</p>
               </motion.div>
            ) : (
               filteredOrders.map((order, idx) => (
                        <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  key={order.id}
                           className="order-card bg-white rounded-[3rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden group"
                >
                    <div className="p-10">
                       <div className="flex flex-col lg:flex-row gap-8">
                          <div className="flex-1">
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-white shadow-xl">
                                   <span className="text-[10px] font-body font-black uppercase tracking-widest opacity-50">PED</span>
                                   <span className="text-xl font-mono font-bold">#{order.id.toString().slice(-4)}</span>
                                </div>
                                <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-1">
                                      <h2 className="text-body-strong font-display font-bold text-slate-950 uppercase tracking-tight text-xl">
                                         {order.customer?.name || "Cliente Ocasional"}
                                      </h2>
                                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                      <span className="text-label font-body font-bold text-primary uppercase tracking-widest text-xs">
                                         {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                                      </span>
                                   </div>
                                   <span className={cn(
                                      "text-[10px] font-body font-bold uppercase tracking-widest px-4 py-1.5 rounded-xl border shadow-sm",
                                      order.status === "PENDING" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      order.status === "CANCELLED" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                      order.status === "DELIVERED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                   )}>
                                      {order.status === "PENDING" ? "Aprovação Pendente" : 
                                       order.status === "CANCELLED" ? "Cancelado" :
                                       order.status === "DELIVERED" ? "Finalizado" : "Produção"}
                                   </span>
                                </div>
                             </div>
                          </div>

                          <div className="flex-1 lg:max-w-md bg-slate-50/50 rounded-4xl p-8 border border-slate-50">
                             <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                   <MapPin size={20} />
                                </div>
                                <div className="text-label font-body font-medium text-slate-600 uppercase tracking-[0.04em] leading-relaxed">
                                   {order.address?.type === "PICKUP" ? (
                                      <span className="text-primary font-bold">Retirada em Unidade</span>
                                   ) : order.address?.type === "DINE_IN" ? (
                                      <span className="text-blue-500 font-bold">Consumo no Local</span>
                                   ) : (
                                      <>
                                         <p className="font-bold text-slate-950">{order.address?.details?.street || "Logradouro não informado"}, {order.address?.details?.number || "S/N"}</p>
                                         <p className="text-[10px] text-slate-400 mt-1">
                                            {order.address?.details?.neighborhood} - {order.address?.details?.city}
                                         </p>
                                      </>
                                   )}
                                </div>
                             </div>
                             <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-6">
                                <div className="flex items-center gap-3">
                                   <CreditCard size={18} className="text-slate-300" />
                                   <p className="text-label font-body font-bold uppercase tracking-[0.06em] text-slate-400">
                                       {order.paymentMethod}
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className="text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em]">Total</p>
                                   <p className="text-heading-3 font-mono font-medium text-slate-950 tracking-tighter">
                                      {formatCurrency(order.total)}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="mt-10 pt-10 border-t border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                          <div className="flex flex-wrap gap-4">
                             {order.items?.map((item: any, i: number) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-sm">
                                   <span className="font-mono font-bold text-primary text-xs">{item.quantity}x</span>
                                   <span className="text-label font-body font-bold text-slate-700 uppercase tracking-tight">{item.product?.name}</span>
                                </div>
                             ))}
                          </div>

                          <div className="flex gap-4">
                             {order.status === "PENDING" && (
                                <button 
                                  onClick={() => updateStatus(order.id, "PREPARING")}
                                  className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-body font-bold text-label uppercase tracking-widest shadow-xl shadow-slate-950/20 hover:bg-primary transition-all active:scale-95"
                                >
                                   Confirmar Pedido
                                </button>
                             )}
                             {order.status === "PREPARING" && (
                                <button 
                                  onClick={() => updateStatus(order.id, "DELIVERED")}
                                  className="h-16 px-10 bg-emerald-500 text-white rounded-2xl font-body font-bold text-label uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                                >
                                   Despachar
                                </button>
                             )}
                             <button className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                                <Printer size={20} />
                             </button>
                          </div>
                       </div>
                    </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
