import { useState, useEffect } from "react";
import { 
  Loader2,
  Clock,
  ChevronRight,
  MapPin,
  CreditCard,
  PackageCheck
} from "lucide-react";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { formatCurrency, cn } from "../../../../shared/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = async () => {
    try {
      const data = await api.get('/orders');
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

  const filteredOrders = orders.filter(o => 
    statusFilter === "ALL" ? true : o.status === statusFilter
  );

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gerenciamento de Pedidos</h1>
          <p className="text-slate-500 font-medium">Acompanhe e despache suas vendas em tempo real.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'Novos' },
              { id: 'PREPARING', label: 'Preparo' },
              { id: 'DELIVERED', label: 'Finalizados' }
            ].map((f) => (
                <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={cn(
                        "px-6 h-11 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                        statusFilter === f.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    {f.label}
                </button>
            ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-4">
             <Loader2 className="animate-spin text-primary" size={40} />
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sincronizando pedidos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredOrders.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="py-32 text-center border-4 border-dashed border-slate-50 rounded-[3rem]"
               >
                   <PackageCheck size={64} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-400 font-black uppercase tracking-widest">Nenhum pedido encontrado nesta categoria.</p>
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
                    className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                  >
                    <div className="p-8">
                       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                          {/* Info do Cliente */}
                          <div className="flex gap-6 items-start">
                             <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-black text-2xl text-slate-300 group-hover:border-primary group-hover:text-primary transition-all">
                                #{order.id.toString().padStart(3, '0')}
                             </div>
                             <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">{order.customerName}</h3>
                                <div className="flex flex-wrap gap-3">
                                   <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                                      <Clock size={12} /> {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                                   </span>
                                   <span className={cn(
                                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                                      order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                      order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                   )}>
                                      {order.status === 'PENDING' ? 'Aguardando Aprovação' : 
                                       order.status === 'DELIVERED' ? 'Pedido Entregue' : 'Em Preparação'}
                                   </span>
                                </div>
                             </div>
                          </div>

                          {/* Detalhes do Pedido */}
                          <div className="flex-1 lg:max-w-md bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                             <div className="flex items-center gap-4 mb-4">
                                <MapPin size={18} className="text-slate-400" />
                                <p className="text-sm font-bold text-slate-600 truncate">{order.address}</p>
                             </div>
                             <div className="flex items-center gap-4">
                                <CreditCard size={18} className="text-slate-400" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">{order.paymentMethod === 'PIX' ? 'Pagamento via PIX' : 'Cartão / Dinheiro'}</p>
                             </div>
                          </div>

                          {/* Valor e Ações */}
                          <div className="text-right flex flex-col items-end gap-4">
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Receber</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(order.total)}</p>
                             </div>
                             
                             <div className="flex gap-2">
                                {order.status === 'PENDING' && (
                                    <button 
                                      onClick={() => updateStatus(order.id, 'PREPARING')}
                                      className="h-12 px-6 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        ACEITAR PEDIDO
                                    </button>
                                )}
                                {(order.status === 'PREPARING' || order.status === 'READY') && (
                                    <button 
                                      onClick={() => updateStatus(order.id, 'DELIVERED')}
                                      className="h-12 px-6 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        FINALIZAR / ENTREGAR
                                    </button>
                                )}
                                <button className="w-12 h-12 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all">
                                    <ChevronRight size={20} />
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ))
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
