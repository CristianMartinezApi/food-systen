"use client";

import { useEffect, useState } from "react";
import { api } from "../../../core/config/api";
import { formatCurrency, cn } from "../../../shared/utils";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShoppingBag,
  Loader2,
  ArrowLeft,
  Bike,
  MapPin,
  CreditCard,
  Phone,
  History,
  Home,
  LayoutGrid,
  ReceiptText,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../../../core/config/socket";
import { getTenantSlug } from "../../../shared/utils/tenant";
import Link from "next/link";
import { Footer } from "../components/layout/Footer";

const FINAL_ORDER_STATUSES = new Set(["DELIVERED", "RETIRED", "CANCELLED"]);
const isActiveOrder = (order: any) => !FINAL_ORDER_STATUSES.has(String(order?.status || ""));

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [slug, setSlug] = useState<string>("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const normalizePhone = (value?: string) => (value || "").replace(/\D/g, "");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  const fetchOrders = async (phoneToFetch: string, customerNameToFetch?: string) => {
    try {
      setLoading(true);
      const queryName = customerNameToFetch?.trim();
      const query = queryName ? `?customerName=${encodeURIComponent(queryName)}` : "";
      const data = await api.get(`/customer/orders/${encodeURIComponent(phoneToFetch)}${query}`);
      setOrders(data);
      const requestedOrderId = typeof window !== "undefined"
        ? Number(new URLSearchParams(window.location.search).get("order"))
        : 0;
      const requestedOrder = data.find((order: any) => Number(order.id) === requestedOrderId);
      const latestActiveOrder = data.find((order: any) => isActiveOrder(order));
      setExpandedOrderId((current) => current ?? requestedOrder?.id ?? latestActiveOrder?.id ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentSlug = getTenantSlug();
    const scopedCustomerRaw = localStorage.getItem(`@FoodSystem:customer:${currentSlug}`);
    const fallbackCustomerRaw = localStorage.getItem("@FoodSystem:customer");

    let savedPhone = localStorage.getItem("@FoodSystem:customerPhone") || "";
    let savedName = "";

    try {
      const parsed = JSON.parse(scopedCustomerRaw || fallbackCustomerRaw || "null");
      if (parsed?.phone) savedPhone = parsed.phone;
      if (parsed?.name) savedName = parsed.name;
    } catch {
      // noop
    }

    if (savedPhone) {
      setPhone(savedPhone);
      setCustomerName(savedName);
      fetchOrders(savedPhone, savedName);

      if (!socket.connected) {
        socket.connect();
      }

      const eventName = `order_status_updated_${currentSlug}`;
      const normalizedSavedName = savedName.trim().toLowerCase();

      const handleOrderStatusUpdated = (data: any) => {
        const samePhone = normalizePhone(data.phone) === normalizePhone(savedPhone);
        const sameName = !normalizedSavedName || (data.customerName || "").trim().toLowerCase() === normalizedSavedName;

        setOrders((prev) => {
          const orderIsAlreadyInList = prev.some((o) => Number(o.id) === Number(data.id));
          if (!(samePhone && sameName) && !orderIsAlreadyInList) {
            return prev;
          }

          return prev.map((o) => (o.id === data.id ? { ...o, status: data.status } : o));
        });
      };

      socket.on(eventName, handleOrderStatusUpdated);

      return () => {
        socket.off(eventName, handleOrderStatusUpdated);
      };
    } else {
      setLoading(false);
    }
  }, []);

  const getStatusInfo = (status: string, address?: any) => {
    switch (status) {
      case 'PENDING': return { label: 'Aguardando confirmação', icon: <Clock size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', progress: 20 };
      case 'CONFIRMED': return { label: 'Confirmado', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', progress: 40 };
      case 'PREPARING': return { label: 'Em Preparo', icon: <Package size={16} />, color: 'text-blue-500', bg: 'bg-blue-50', progress: 60 };
      case 'READY': return {
        label: getOrderType(address) === "PICKUP" ? 'Pronto para retirada' : 'Pronto para entrega',
        icon: <ShoppingBag size={16} />,
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        progress: 80
      };
      case 'OUT_FOR_DELIVERY': return { label: 'Em Rota de Entrega', icon: <Bike size={16} className="animate-bounce" />, color: 'text-indigo-500', bg: 'bg-indigo-50', progress: 90 };
      case 'DELIVERED': return { label: 'Entregue', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', progress: 100 };
      case 'RETIRED': return { label: 'Entregue no Balcao', icon: <CheckCircle2 size={16} />, color: 'text-emerald-500', bg: 'bg-emerald-50', progress: 100 };
      case 'CANCELLED': return { label: 'Pedido Cancelado', icon: <XCircle size={16} />, color: 'text-rose-500', bg: 'bg-rose-50', progress: 0 };
      default: return { label: status, icon: <Clock size={16} />, color: 'text-slate-500', bg: 'bg-slate-50', progress: 0 };
    }
  };

  const getOrderType = (address: any): "DELIVERY" | "PICKUP" | "DINE_IN" => {
    if (address?.type === "PICKUP") return "PICKUP";
    if (address?.type === "DINE_IN") return "DINE_IN";
    return "DELIVERY";
  };

  const getTimelineLabels = (address: any) => {
    const orderType = getOrderType(address);

    if (orderType === "PICKUP") {
      return {
        first: "SOLICITADO",
        second: "PREPARO",
        third: "BALCAO",
        thirdThreshold: 80,
      };
    }

    if (orderType === "DINE_IN") {
      return {
        first: "SOLICITADO",
        second: "PREPARO",
        third: "SERVICO",
        thirdThreshold: 90,
      };
    }

    return {
      first: "SOLICITADO",
      second: "PREPARO",
      third: "ENTREGA",
      thirdThreshold: 90,
    };
  };

  const toggleDetails = (orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const getOrderTypeLabel = (type?: string) => {
    if (type === "DELIVERY") return "Entrega";
    if (type === "PICKUP") return "Retirada";
    if (type === "DINE_IN") return "Consumo Local";
    return "Pedido";
  };

  const getPaymentLabel = (method?: string) => {
    if (method === "PIX") return "Pix";
    if (method === "CREDIT") return "Credito";
    if (method === "DEBIT") return "Debito";
    if (method === "CARD") return "Cartao";
    if (method === "CASH") return "Dinheiro";
    return method || "Nao informado";
  };

  const getPaymentMomentLabel = (order: any) => {
    const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
    const orderType = String(order?.address?.type || "DELIVERY").toUpperCase();

    if (order?.status === "PAID") return "Pago";
    if (paymentMethod === "PIX") return "Aguardando PIX";
    if (orderType === "PICKUP") return "Pagamento na retirada";
    if (orderType === "DINE_IN") return "Pagamento no local";
    return "Pagamento na entrega";
  };

  const getOrderAddressLabel = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address;

    if (typeof address === "object") {
      if (address.type === "PICKUP") return "Retirada em unidade";
      if (address.type === "DINE_IN") return "Consumo no local";

      const details = address.details && typeof address.details === "object"
        ? address.details
        : address;

      const parts = [
        details.street,
        details.number,
        details.neighborhood,
        details.city,
        details.state,
        details.zipCode,
      ].filter(Boolean);

      if (details.complement) parts.push(`Complemento: ${details.complement}`);
      if (details.reference) parts.push(`Referencia: ${details.reference}`);

      const composed = parts.join(", ").trim();
      if (composed) return composed;
      return "Endereco nao informado";
    }

    return String(address);
  };

  const getItemDisplayName = (item: any) => {
    return item?.name || item?.product?.name || "Item";
  };

  const getItemSubtotal = (item: any) => {
    const price = Number(item?.price ?? item?.product?.price ?? 0);
    const quantity = Number(item?.quantity ?? 0);
    return price * quantity;
  };
  const activeOrders = orders.filter(isActiveOrder);
  const finishedOrders = orders.filter((order) => !isActiveOrder(order));
  const displayedOrders = [...activeOrders, ...finishedOrders];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-primary selection:text-white">
      {/* Header Premium */}
      <header className="fixed inset-x-0 top-0 bg-slate-100/90 backdrop-blur-2xl border-b border-slate-200 z-50 py-3 md:py-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between gap-3">
          <Link href={`/${slug}`} className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0">
            <ArrowLeft size={20} className="md:size-6" />
          </Link>
          <div className="text-center min-w-0 flex-1">
            <h1 className="text-lg md:text-heading-2 font-display text-slate-900 uppercase tracking-tighter leading-none mb-1 truncate">Acompanhar pedidos</h1>
            <p className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] truncate">Status atualizado em tempo real</p>
          </div>
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary shadow-lg shadow-slate-950/20 shrink-0">
            <History size={18} className="md:size-5" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-28 md:pb-12 max-w-4xl">
        {!phone ? (
          <div className="flex flex-col items-center justify-center pt-16 md:pt-20 text-center space-y-6 md:space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-[3rem] md:rounded-[4rem] flex items-center justify-center text-slate-200 border border-white">
                <ShoppingBag size={44} className="md:size-14" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-heading-2 md:text-heading-1 font-display text-slate-900 uppercase tracking-tight">Cesto de Histórico Vazio</h2>
              <p className="text-sm md:text-slate-500 font-body font-medium max-w-xs mx-auto">Você precisa realizar seu primeiro pedido para ver o histórico aqui.</p>
            </div>
            <Link href={`/${slug}`} className="h-14 md:h-16 px-8 md:px-10 bg-slate-950 text-white rounded-2xl font-body font-medium flex items-center gap-3 shadow-2xl shadow-slate-950/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.06em] text-[10px] md:text-label">
              Explorar Cardápio <ChevronRight size={18} />
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-28 md:py-40">
            <Loader2 className="animate-spin text-primary md:size-12" size={40} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="mb-5 flex size-20 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300">
              <ShoppingBag size={34} />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">Nenhum pedido encontrado</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">Quando você fizer um pedido nesta loja, o acompanhamento aparecerá aqui.</p>
            <Link href={`/${slug}`} className="mt-6 h-12 px-6 bg-slate-950 text-white rounded-xl font-bold flex items-center gap-2 uppercase tracking-wider text-xs">
              Ver cardápio <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[10px] md:text-label font-body font-medium text-slate-900 uppercase tracking-[0.06em] flex items-center gap-3 min-w-0">
                <div className="w-2 h-5 md:h-6 bg-primary rounded-full shrink-0" />
                <span className="truncate">{activeOrders.length > 0 ? "Pedidos em andamento" : "Histórico de pedidos"}</span>
              </h2>
              <span className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] px-3 md:px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                {orders.length} PEDIDOS
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {displayedOrders.map((order, idx) => {
                const status = getStatusInfo(order.status, order.address);
                const timeline = getTimelineLabels(order.address);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={order.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-md shadow-slate-300/25 hover:shadow-2xl hover:shadow-slate-300/40 transition-all duration-500 group"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-8">
                      <div className="space-y-4 md:space-y-6 flex-1">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center transition-colors duration-500", status.bg, status.color)}>
                            {status.icon}
                          </div>
                          <div>
                            <p className="text-[11px] md:text-label font-mono text-slate-400 uppercase tracking-widest leading-none mb-1">ID: {order.id.toString().padStart(4, '0')}</p>
                            <h3 className={cn("text-base md:text-heading-3 font-body font-bold uppercase tracking-tighter leading-none", status.color)}>
                              {status.label}
                            </h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">DATA</span>
                            <span className="text-sm md:text-numeric font-mono text-slate-800 tracking-tight">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">TOTAL</span>
                            <span className="text-sm md:text-numeric font-mono text-primary tracking-tight">{formatCurrency(order.total)}</span>
                          </div>
                          <div className="flex flex-col md:col-span-2">
                            <span className="text-[10px] md:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mb-1">SABORES</span>
                            <p className="text-sm md:text-body font-body text-slate-600 truncate uppercase tracking-tight">
                              {(Array.isArray(order.items) ? order.items : []).map((i: any) => `${i?.quantity ?? 0}x ${getItemDisplayName(i)}`).join(", ")}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progresso Real-time */}
                        {order.status !== 'CANCELLED' && (
                          <div className="space-y-2 md:space-y-3 pt-1 md:pt-2">
                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${status.progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={cn("h-full", status.color.replace('text', 'bg'))}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] md:text-label font-body font-medium text-slate-200 uppercase tracking-[0.06em]">
                              <span className={status.progress >= 20 ? "text-slate-400" : ""}>{timeline.first}</span>
                              <span className={status.progress >= 60 ? "text-slate-400" : ""}>{timeline.second}</span>
                              <span className={status.progress >= timeline.thirdThreshold ? "text-slate-400" : ""}>{timeline.third}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col gap-2.5 md:gap-3 justify-center min-w-32 md:min-w-35">
                        <button
                          onClick={() => toggleDetails(order.id)}
                          className="h-11 md:h-14 px-4 md:px-6 bg-slate-900 text-white rounded-lg md:rounded-xl font-body font-medium text-[10px] md:text-label uppercase tracking-[0.06em] flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95"
                        >
                          {expandedOrderId === order.id ? "FECHAR" : "DETALHES"}
                          <ChevronRight
                            size={14}
                            className={cn("transition-transform", expandedOrderId === order.id ? "rotate-90" : "")}
                          />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {expandedOrderId === order.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl border border-slate-200 bg-white/70 p-3 md:p-5 space-y-3 md:space-y-4">
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                              <div className="rounded-xl bg-slate-100 px-3 py-2">
                                <p className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.08em] mb-1">Tipo</p>
                                <p className="text-xs md:text-sm font-body font-semibold text-slate-700 uppercase tracking-tight">{getOrderTypeLabel(order.address?.type)}</p>
                              </div>
                              <div className="rounded-xl bg-slate-100 px-3 py-2 flex items-start gap-2">
                                <CreditCard size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.08em] mb-1">Pagamento</p>
                                  <p className="text-xs md:text-sm font-body font-semibold text-slate-700 uppercase tracking-tight">
                                    {getPaymentLabel(order.paymentMethod)}
                                    {order.paymentMethod === "CASH" && order.changeFor && (
                                      <span className="block text-primary text-[10px] lowercase font-medium mt-0.5">
                                        (Troco p/ {formatCurrency(order.changeFor)})
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] md:text-[11px] font-body font-medium text-slate-500 uppercase tracking-[0.08em] mt-1">
                                    {getPaymentMomentLabel(order)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.08em] mb-2">Itens do pedido</p>
                              <div className="space-y-2">
                                {(Array.isArray(order.items) ? order.items : []).map((item: any, itemIndex: number) => (
                                  <div key={`${order.id}-${item?.id ?? itemIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex justify-between gap-3">
                                    <span className="text-xs md:text-sm font-body font-semibold text-slate-700 uppercase tracking-tight truncate">{item?.quantity ?? 0}x {getItemDisplayName(item)}</span>
                                    <span className="text-xs md:text-sm font-mono font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(getItemSubtotal(item))}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {(order.address || order.customer?.phone || order.phone) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                {order.address && (
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-start gap-2">
                                    <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.08em] mb-1">Endereço</p>
                                      <p className="text-xs md:text-sm font-body font-semibold text-slate-700 uppercase tracking-tight wrap-break-word">{getOrderAddressLabel(order.address)}</p>
                                    </div>
                                  </div>
                                )}

                                {(order.customer?.phone || order.phone) && (
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-start gap-2">
                                    <Phone size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-[9px] md:text-[10px] font-body font-bold text-slate-400 uppercase tracking-[0.08em] mb-1">Contato</p>
                                      <p className="text-xs md:text-sm font-body font-semibold text-slate-700 uppercase tracking-tight">{order.customer?.phone || order.phone}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <nav
        aria-label="Navegação da loja"
        className="fixed inset-x-2 bottom-2 z-70 rounded-2xl border border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-12px_35px_rgba(15,23,42,0.16)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div className="grid grid-cols-4 gap-1">
          <Link href={`/${slug}`} className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-slate-700">
            <Home size={18} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Início</span>
          </Link>
          <Link href={`/${slug}#menu-section`} className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-slate-700">
            <LayoutGrid size={18} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Cardápio</span>
          </Link>
          <div className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl bg-slate-950 text-white">
            <ReceiptText size={18} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Pedidos</span>
          </div>
          <button
            onClick={() => fetchOrders(phone, customerName)}
            disabled={loading}
            className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Atualizar</span>
          </button>
        </div>
      </nav>

      <Footer />
    </div>
  );
}
