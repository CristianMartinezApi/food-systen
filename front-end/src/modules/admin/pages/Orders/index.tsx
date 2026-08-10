import { useState, useEffect, useRef } from "react";
import {
    Loader2,
    MapPin,
    CreditCard,
    PackageCheck,
    Printer,
    Volume2,
    VolumeX
} from "lucide-react";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { formatCurrency, cn } from "../../../../shared/utils";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";
import { PrintModeModal, type PrintMode } from "../../components/modals/PrintModeModal";
import { ConfirmActionModal } from "../../components/modals/ConfirmActionModal";

const PRINT_MODE_STORAGE_KEY = "@FoodSystem:printMode";
const DIRECT_PRINT_ACCEPTED_ORDERS_KEY = "@FoodSystem:directPrintAcceptedOrders";
const ENABLE_PRINT_EVENT_SUMMARY = process.env.NEXT_PUBLIC_ENABLE_PRINT_EVENT_SUMMARY === "true";
const COMPLETED_PAGE_SIZE = 20;
const COMPLETED_STATUSES = ["DELIVERED", "RETIRED"];

export default function OrdersPage({ isCompact = false, onOrdersChange }: { isCompact?: boolean; onOrdersChange?: (orders: any[]) => void }) {

    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [completedPage, setCompletedPage] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isTestingAlert, setIsTestingAlert] = useState(false);
    const [activeAlertCount, setActiveAlertCount] = useState(0);
    const [printMode, setPrintMode] = useState<PrintMode>("THERMAL");
    const [printTargetOrder, setPrintTargetOrder] = useState<any | null>(null);
    const [reprintTargetOrder, setReprintTargetOrder] = useState<any | null>(null);
    const [directPrintAcceptedOrders, setDirectPrintAcceptedOrders] = useState(false);
    const [printSummaryByOrderId, setPrintSummaryByOrderId] = useState<Record<number, any>>({});
    const printModeLabel = printMode === "THERMAL" ? "Termica 80mm" : "A4";

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const isMutedRef = useRef(false);
    const alertingOrderIdsRef = useRef<Set<number>>(new Set());
    const repeatAlertIntervalRef = useRef<number | null>(null);
    const originalTitleRef = useRef<string>("Pedidos");
    const titleBlinkIntervalRef = useRef<number | null>(null);
    const titleBlinkTimeoutRef = useRef<number | null>(null);

    const getOrderMode = (order: any): "DELIVERY" | "PICKUP" | "DINE_IN" => {
        const type = order?.address?.type;
        if (type === "PICKUP") return "PICKUP";
        if (type === "DINE_IN") return "DINE_IN";
        return "DELIVERY";
    };

    const isCompletedOrder = (order: any) => {
        if (COMPLETED_STATUSES.includes(order.status)) return true;
        // Mesa paga e entrega paga já encerraram seus respectivos fluxos.
        return order.status === "PAID" && getOrderMode(order) !== "PICKUP";
    };

    const doesOrderMatchFilter = (order: any) => {
        if (statusFilter === "ALL") return !isCompletedOrder(order) && order.status !== "CANCELLED";
        if (statusFilter === "PENDING") return ["PENDING", "CONFIRMED", "OPEN"].includes(order.status);
        if (statusFilter === "PREPARING") return ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(order.status);
        if (statusFilter === "DELIVERED") return isCompletedOrder(order);
        return order.status === statusFilter;
    };

    const filteredOrders = orders.filter((o) => doesOrderMatchFilter(o));
    const completedPageCount = Math.max(1, Math.ceil(filteredOrders.length / COMPLETED_PAGE_SIZE));
    const visibleCompletedOrders = filteredOrders.slice(
        (completedPage - 1) * COMPLETED_PAGE_SIZE,
        completedPage * COMPLETED_PAGE_SIZE
    );

    const getStatusBadge = (order: any) => {
        if (order.status === "PENDING") return { label: "Novo", className: "bg-rose-50 text-rose-600 border-rose-100 shadow-[0_0_8px_rgba(225,29,72,0.15)] animate-pulse" };
        if (order.status === "OPEN") return { label: "Mesa Aberta", className: "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" };
        if (order.status === "CONFIRMED") return { label: "Confirmado", className: "bg-sky-50 text-sky-700 border-sky-100" };
        if (order.status === "PAID") return { label: "Pago/Cozinha", className: "bg-emerald-50 text-emerald-700 border-emerald-100 font-black shadow-[0_0_8px_rgba(16,185,129,0.1)]" };
        if (order.status === "PREPARING") return { label: "Preparo", className: "bg-blue-50 text-blue-600 border-blue-100" };
        if (order.status === "OUT_FOR_DELIVERY") return { label: "Em Rota", className: "bg-indigo-50 text-indigo-600 border-indigo-100" };
        if (order.status === "READY") return { label: "Pronto", className: "bg-orange-50 text-orange-600 border-orange-100" };
        if (order.status === "DELIVERED") return { label: "Entregue", className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        if (order.status === "RETIRED") return { label: "Retirado", className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
        if (order.status === "CANCELLED") return { label: "Cancelado", className: "bg-slate-50 text-slate-400 border-slate-100" };
        return { label: order.status || "Status", className: "bg-slate-50 text-slate-600 border-slate-100" };
    };

    const canCancelOrder = (status: string) => ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(status);

    const getPrimaryAction = (order: any): { label: string; nextStatus: string; className: string } | null => {
        const mode = getOrderMode(order);

        if (order.status === "PENDING" || order.status === "OPEN") {
            return {
                label: "Confirmar",
                nextStatus: "CONFIRMED",
                className: "h-9 px-4 bg-slate-950 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-slate-950/20 hover:bg-primary transition-all active:scale-95 flex-1"
            };
        }

        if (order.status === "CONFIRMED") {
            return {
                label: "Iniciar Preparo",
                nextStatus: "PREPARING",
                className: "h-9 px-4 bg-blue-600 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex-1"
            };
        }

        if (order.status === "PAID") {
            if (mode !== "PICKUP") return null;
            return {
                label: "Entregar Retirada",
                nextStatus: "RETIRED",
                className: "h-9 px-4 bg-emerald-600 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 flex-1"
            };
        }

        if (order.status === "PREPARING") {
            if (mode === "PICKUP") {
                return {
                    label: "Pronto p/ Retirada",
                    nextStatus: "READY",
                    className: "h-9 px-4 bg-orange-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex-1"
                };
            }

            if (mode === "DELIVERY") {
                return {
                    label: "Saiu p/ Entrega",
                    nextStatus: "OUT_FOR_DELIVERY",
                    className: "h-9 px-4 bg-indigo-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 flex-1"
                };
            }

            return {
                label: "Finalizar",
                nextStatus: "DELIVERED",
                className: "h-9 px-4 bg-emerald-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex-1"
            };
        }

        if (order.status === "OUT_FOR_DELIVERY") {
            return {
                label: "Marcar Entregue",
                nextStatus: "DELIVERED",
                className: "h-9 px-4 bg-emerald-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex-1"
            };
        }

        if (order.status === "READY") {
            return {
                label: "Marcar Entregue no Balcão",
                nextStatus: "RETIRED",
                className: "h-9 px-4 bg-emerald-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex-1"
            };
        }

        return null;
    };

    const formatItemDetails = (value: any) => {
        if (!value) return [];

        if (Array.isArray(value)) {
            return value
                .map((entry) => {
                    if (typeof entry === "string") return entry;
                    if (entry?.name) return entry.name;
                    if (entry?.label) return entry.label;
                    if (entry?.title) return entry.title;
                    if (entry?.description) return entry.description;
                    return null;
                })
                .filter(Boolean);
        }

        if (typeof value === "string") return [value];
        return [JSON.stringify(value)];
    };

    const formatPaymentMethodLabel = (paymentMethod: string | null | undefined, changeFor?: string | null) => {
        const normalized = String(paymentMethod || "").toUpperCase();

        if (normalized === "CASH") {
            return changeFor
                ? `DINHEIRO (TROCO P/ ${formatCurrency(Number(changeFor))})`
                : "DINHEIRO";
        }

        if (normalized === "PIX") return "PIX";
        if (normalized === "DEBIT") return "DEBITO";
        if (normalized === "CREDIT") return "CREDITO";
        if (normalized === "CARD") return "CARTAO";
        if (normalized === "OPEN") return "EM ABERTO";

        return normalized || "NAO INFORMADO";
    };

    const formatPaymentStatusLabel = (order: any) => {
        const paymentMethod = String(order?.paymentMethod || "").toUpperCase();
        const orderMode = order?.address?.type === "PICKUP"
            ? "PICKUP"
            : order?.address?.type === "DINE_IN"
                ? "DINE_IN"
                : "DELIVERY";

        if (order?.status === "PAID") {
            return "PAGO";
        }

        if (paymentMethod === "PIX") {
            return "AGUARDANDO PIX";
        }

        if (["CASH", "CARD", "DEBIT", "CREDIT"].includes(paymentMethod)) {
            if (orderMode === "PICKUP") return "COBRAR NA RETIRADA";
            if (orderMode === "DINE_IN") return "COBRAR NO LOCAL";
            return "COBRAR NA ENTREGA";
        }

        return "PENDENTE";
    };

    const formatGuidedAssemblyDetails = (value: any) => {
        if (!Array.isArray(value)) return [];

        return value.map((entry: any) => {
            const groupName = entry?.groupName || entry?.groupId || entry?.step || "Montagem";
            const selected = Array.isArray(entry?.selected)
                ? entry.selected
                : Array.isArray(entry?.optionIds)
                    ? entry.optionIds.map((optionId: any) => ({ name: optionId }))
                    : entry?.selected
                        ? [entry.selected]
                        : [];

            const names = selected
                .map((option: any) => {
                    if (typeof option === "string") return option;
                    return option?.name || option?.label || option?.title || option?.id || null;
                })
                .filter(Boolean);

            if (names.length === 0) return null;
            return `${groupName}: ${names.join(", ")}`;
        }).filter(Boolean);
    };

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    const ensureAudioUnlocked = async () => {
        try {
            if (!audioContextRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioCtx) return false;
                audioContextRef.current = new AudioCtx();
            }

            if (audioContextRef.current.state !== "running") {
                await audioContextRef.current.resume();
            }

            const unlocked = audioContextRef.current.state === "running";
            setIsAudioEnabled(unlocked);
            return unlocked;
        } catch {
            setIsAudioEnabled(false);
            return false;
        }
    };

    const triggerVibration = () => {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([180, 80, 180]);
        }
    };

    const stopRepeatAlerts = () => {
        if (repeatAlertIntervalRef.current !== null) {
            window.clearInterval(repeatAlertIntervalRef.current);
            repeatAlertIntervalRef.current = null;
        }
    };

    const stopTitleBlink = () => {
        if (titleBlinkIntervalRef.current !== null) {
            window.clearInterval(titleBlinkIntervalRef.current);
            titleBlinkIntervalRef.current = null;
        }
        if (titleBlinkTimeoutRef.current !== null) {
            window.clearTimeout(titleBlinkTimeoutRef.current);
            titleBlinkTimeoutRef.current = null;
        }
        document.title = originalTitleRef.current;
    };

    const syncAlertState = (ordersData: any[]) => {
        const pendingIds = new Set(
            ordersData
                .filter((order: any) => order.status === "PENDING")
                .map((order: any) => Number(order.id))
        );

        alertingOrderIdsRef.current.forEach((orderId) => {
            if (!pendingIds.has(orderId)) {
                alertingOrderIdsRef.current.delete(orderId);
            }
        });

        const count = alertingOrderIdsRef.current.size;
        setActiveAlertCount(count);

        if (count === 0) {
            stopRepeatAlerts();
            stopTitleBlink();
        }
    };

    const dismissOrderAlert = (orderId: number) => {
        alertingOrderIdsRef.current.delete(Number(orderId));
        const nextCount = alertingOrderIdsRef.current.size;
        setActiveAlertCount(nextCount);

        if (nextCount === 0) {
            stopRepeatAlerts();
            stopTitleBlink();
        }
    };

    const startTitleBlink = () => {
        stopTitleBlink();
        let highlighted = false;

        titleBlinkIntervalRef.current = window.setInterval(() => {
            highlighted = !highlighted;
            document.title = highlighted ? "NOVO PEDIDO CHEGANDO" : originalTitleRef.current;
        }, 600);

        titleBlinkTimeoutRef.current = window.setTimeout(() => {
            stopTitleBlink();
        }, 7000);
    };

    const playNotificationSound = () => {
        if (isMutedRef.current) return;

        const playSirenPattern = async () => {
            const unlocked = await ensureAudioUnlocked();
            if (unlocked && audioContextRef.current) {
                const ctx = audioContextRef.current;
                const now = ctx.currentTime;
                const freqs = [720, 980, 720, 980, 720, 980];

                freqs.forEach((freq, idx) => {
                    const startAt = now + idx * 0.24;
                    const duration = 0.2;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = "square";
                    osc.frequency.setValueAtTime(freq, startAt);

                    gain.gain.setValueAtTime(0.0001, startAt);
                    gain.gain.exponentialRampToValueAtTime(0.28, startAt + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startAt);
                    osc.stop(startAt + duration + 0.01);
                });
                triggerVibration();
                return;
            }

            if (!audioRef.current) {
                audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audioRef.current.preload = "auto";
                audioRef.current.volume = 1;
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => null);
            triggerVibration();
        };

        playSirenPattern();
        startTitleBlink();
    };

    const startRepeatAlerts = () => {
        if (repeatAlertIntervalRef.current !== null) return;

        repeatAlertIntervalRef.current = window.setInterval(() => {
            if (isMutedRef.current) return;
            if (alertingOrderIdsRef.current.size === 0) {
                stopRepeatAlerts();
                return;
            }
            playNotificationSound();
        }, 10000);
    };

    useEffect(() => {
        originalTitleRef.current = document.title;

        const unlockHandler = () => {
            ensureAudioUnlocked();
        };

        window.addEventListener("pointerdown", unlockHandler, { once: true });
        window.addEventListener("keydown", unlockHandler, { once: true });

        return () => {
            stopRepeatAlerts();
            stopTitleBlink();
            window.removeEventListener("pointerdown", unlockHandler);
            window.removeEventListener("keydown", unlockHandler);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => null);
                audioContextRef.current = null;
            }
        };
    }, []);

    const handleEnableAlerts = async () => {
        await ensureAudioUnlocked();
    };

    const handleTestAlert = async () => {
        setIsTestingAlert(true);
        await ensureAudioUnlocked();
        playNotificationSound();
        window.setTimeout(() => setIsTestingAlert(false), 1200);
    };

    const fetchOrders = async (shouldPlaySound = false) => {
        try {
            const data = await api.get("/orders?filter=today");
            setOrders(data);
            if (onOrdersChange) onOrdersChange(data);
            const orderIds = data.map((order: any) => Number(order.id)).filter(Boolean);
            if (ENABLE_PRINT_EVENT_SUMMARY && orderIds.length > 0) {
                try {
                    const summary = await api.get(`/print-events/summary?subjectType=order&ids=${orderIds.join(",")}`);
                    const nextSummary = (summary || []).reduce((acc: Record<number, any>, item: any) => {
                        acc[Number(item.subjectId)] = item;
                        return acc;
                    }, {});
                    setPrintSummaryByOrderId(nextSummary);
                } catch {
                    setPrintSummaryByOrderId({});
                }
            } else {
                setPrintSummaryByOrderId({});
            }
            syncAlertState(data);
            if (shouldPlaySound) {
                playNotificationSound();
            }
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateStatus = async (orderId: number, status: string) => {
        try {
            await api.patch(`/orders/${orderId}`, { status });
            setOrders((prev) => prev.map((order) => (
                Number(order.id) === Number(orderId)
                    ? { ...order, status }
                    : order
            )));

            if (onOrdersChange) {
                onOrdersChange(orders.map((order) => (
                    Number(order.id) === Number(orderId)
                        ? { ...order, status }
                        : order
                )));
            }

            if (status !== "PENDING") {
                dismissOrderAlert(orderId);
            }

            await fetchOrders();
            return true;
        } catch (error: any) {
            console.error("Erro ao atualizar status:", error);
            toast.error(error?.message || "Erro ao atualizar status do pedido");
            return false;
        }
    };

    const confirmPixPayment = async (orderId: number) => {
        try {
            await api.post(`/orders/${orderId}/confirm-pix`, {});
            setOrders((prev) => prev.map((order) => (
                Number(order.id) === Number(orderId)
                    ? { ...order, pixConfirmedAt: new Date().toISOString() }
                    : order
            )));
            toast.success("PIX confirmado. Já pode aceitar o pedido.");
            return true;
        } catch (error: any) {
            console.error("Erro ao confirmar PIX:", error);
            toast.error(error?.message || "Erro ao confirmar PIX.");
            return false;
        }
    };

    const handleCancelOrder = async (order: any) => {
        const customerLabel = order.customer?.name || order.customerName || "cliente";
        const confirmed = window.confirm(
            `Tem certeza que deseja cancelar o pedido #${order.id} de ${customerLabel}?`
        );

        if (!confirmed) return;
        await updateStatus(order.id, "CANCELLED");
    };

    const handlePrintOrder = (order: any, mode: PrintMode) => {

        const restaurantRaw = localStorage.getItem("@FoodSystem:restaurant");
        let restaurant: any = null;
        try {
            restaurant = restaurantRaw ? JSON.parse(restaurantRaw) : null;
        } catch {
            restaurant = null;
        }

        const customerLabel = order.customer?.name || order.customerName || "Cliente Ocasional";
        const createdAt = new Date(order.createdAt).toLocaleString();
        const paymentMethodLabel = formatPaymentMethodLabel(order.paymentMethod, order.changeFor);
        const paymentStatusLabel = formatPaymentStatusLabel(order);
        const deliveryModeLabel = order.address?.type === "PICKUP"
            ? "RETIRADA"
            : order.address?.type === "DINE_IN"
                ? "CONSUMO NO LOCAL"
                : "ENTREGA";
        const addressText = order.address?.type === "PICKUP"
            ? "Retirada em unidade"
            : order.address?.type === "DINE_IN"
                ? "Consumo no local"
                : `${order.address?.details?.street || "Nao informado"}, ${order.address?.details?.number || "S/N"} - ${order.address?.details?.neighborhood || "Bairro"}`;
        const addressLines = order.address?.type === "DELIVERY" || !order.address?.type
            ? [
                `${order.address?.details?.street || "Nao informado"}, ${order.address?.details?.number || "S/N"}`,
                [order.address?.details?.neighborhood, order.address?.details?.city, order.address?.details?.state].filter(Boolean).join(" - "),
                order.address?.details?.complement ? `Complemento: ${order.address.details.complement}` : null,
                order.address?.details?.reference ? `Referencia: ${order.address.details.reference}` : null,
            ].filter(Boolean) as string[]
            : [addressText];

        const itemsRows = (order.items || []).map((item: any) => {
            const addonList = formatItemDetails(item.addons);
            const removalList = formatItemDetails(item.removals);
            const guidedAssemblyList = formatGuidedAssemblyDetails(item.guidedAssemblySelections) as string[];
            const detailsLines = [
                item.variation ? `<div style="font-size: 11px; margin-top: 3px;"><strong>Tamanho/variacao:</strong> ${item.variation}</div>` : "",
                ...guidedAssemblyList.map((detail: string) => `<div style="font-size: 11px; margin-top: 2px;"><strong>Montagem:</strong> ${detail}</div>`),
                ...addonList.map((detail: string) => `<div style="font-size: 11px; margin-top: 2px;"><strong>Adicionar:</strong> ${detail}</div>`),
                ...removalList.map((detail: string) => `<div style="font-size: 11px; margin-top: 2px;"><strong>Remover:</strong> ${detail}</div>`),
                item.observations ? `<div style="font-size: 11px; margin-top: 2px;"><strong>Obs item:</strong> ${item.observations}</div>` : "",
            ].filter(Boolean).join("");

            return `
                            <tr>
                                <td style="padding: 4px 0; border-bottom: 1px dotted #000;">
                                    <div style="display: flex; gap: 8px;">
                                        <span style="font-size: 14px; font-weight: bold; min-width: 25px;">${item.quantity || 0}x</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${item.name || item.product?.name || "Item"}</div>
                                            ${detailsLines}
                                        </div>
                                    </div>
                                </td>
                                <td style="text-align:right; vertical-align: top; padding: 4px 0; border-bottom: 1px dotted #000; font-size: 12px;">
                                    ${formatCurrency((item.price || 0) * (item.quantity || 0))}
                                </td>
                            </tr>
                        `;
        }).join("");

        const thermalHtml = `
                    <html>
                        <head>
                            <title>Pedido #${order.id}</title>
                            <style>
                                @page { size: 80mm 297mm; margin: 0; }
                                html, body { 
                                    width: 72mm; 
                                    margin: 0; 
                                    padding: 4mm 4mm 10mm 4mm;
                                    color: #000; 
                                    font-family: "Courier New", monospace; 
                                    font-size: 12px; 
                                    line-height: 1.2; 
                                }
                                .center { text-align: center; }
                                .right { text-align: right; }
                                .bold { font-weight: bold; }
                                .sep { border-top: 1px dashed #000; margin: 8px 0; }
                                .sep-double { border-top: 3px double #000; margin: 8px 0; }
                                h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
                                .subtitle { font-size: 10px; margin-bottom: 4px; }
                                .order-id { font-size: 14px; font-weight: bold; margin: 4px 0; }
                                table { width: 100%; border-collapse: collapse; }
                                td { vertical-align: top; }
                                .summary-row { display: flex; justify-content: space-between; margin: 4px 0; }
                                .total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
                                .badge { background: #000; color: #fff; padding: 2px 8px; font-weight: bold; font-size: 16px; display: inline-block; }
                                .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
                                .info-box { border: 1px solid #000; padding: 6px; margin-top: 6px; }
                            </style>
                        </head>
                        <body>
                            <div class="center">
                                <h1>${restaurant?.name || "Loja"}</h1>
                                ${restaurant?.phone ? `<div class="subtitle">Fone: ${restaurant.phone}</div>` : ""}
                                <div class="order-id">PEDIDO #${order.id}</div>
                                <div class="subtitle">${createdAt}</div>
                            </div>

                            <div class="sep-double"></div>

                            ${order.tableNumber ? `
                                <div class="center" style="margin-bottom: 8px;">
                                    <div class="badge">MESA: ${String(order.tableNumber).padStart(2, '0')}</div>
                                </div>
                            ` : ""}

                            <div class="info-box">
                                <div class="section-title">Resumo do pedido</div>
                                <div style="margin-bottom: 4px;"><strong>CLIENTE:</strong> ${customerLabel.toUpperCase()}</div>
                                ${order.phone ? `<div><strong>FONE:</strong> ${order.phone}</div>` : ""}
                                <div><strong>STATUS:</strong> ${(order.status || "-").toUpperCase()}</div>
                                <div><strong>FINANCEIRO:</strong> ${paymentStatusLabel}</div>
                                <div><strong>PAGTO:</strong> ${paymentMethodLabel}</div>
                            </div>

                            <div class="info-box">
                                <div class="section-title">Entrega / retirada</div>
                                <div><strong>TIPO:</strong> ${deliveryModeLabel}</div>
                                ${addressLines.map((line: string) => `<div>${String(line).toUpperCase()}</div>`).join("")}
                            </div>

                            ${order.notes ? `
                                <div style="margin-top: 8px; border: 1px solid #000; padding: 4px;">
                                    <strong>OBSERVAÇÕES:</strong><br/>
                                    ${order.notes.toUpperCase()}
                                </div>
                            ` : ""}

                            <div class="sep"></div>

                            <table>
                                <thead>
                                    <tr>
                                        <th align="left" style="font-size: 10px; padding-bottom: 4px;">ITENS PARA PRODUÇÃO</th>
                                        <th align="right" style="font-size: 10px; padding-bottom: 4px;">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRows || '<tr><td colspan="2" class="center">SEM ITENS</td></tr>'}
                                </tbody>
                            </table>

                            <div class="sep"></div>

                            <div class="summary-row"><span>SUBTOTAL</span><span>${formatCurrency(order.subtotal || 0)}</span></div>
                            <div class="summary-row"><span>TAXA</span><span>${formatCurrency(order.deliveryFee || 0)}</span></div>
                            <div class="summary-row total"><span>TOTAL</span><span>${formatCurrency(order.total || 0)}</span></div>

                            <div class="sep-double"></div>
                            <div class="center bold" style="font-size: 10px;">
                                OBRIGADO PELA PREFERÊNCIA!
                            </div>
                            <div class="center" style="font-size: 9px; margin-top: 4px;">
                                Impresso em ${new Date().toLocaleString()}
                            </div>
                        </body>
                    </html>
                `;

        const a4Html = `
                    <html>
                        <head>
                            <title>Pedido #${order.id}</title>
                            <style>
                                @page { size: A4; margin: 14mm; }
                                body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
                                .top { display: flex; justify-content: space-between; align-items: flex-start; }
                                h1 { margin: 0; font-size: 20px; }
                                .muted { color: #64748b; }
                                .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 12px; }
                                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                                th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; vertical-align: top; }
                                .right { text-align: right; }
                            </style>
                        </head>
                        <body>
                            <div class="top">
                                <div>
                                    <h1>Comanda Pedido #${order.id}</h1>
                                    <p class="muted">${createdAt}</p>
                                </div>
                                <div class="right">
                                    <div><strong>${restaurant?.name || "Loja"}</strong></div>
                                    <div class="muted">${restaurant?.phone || ""}</div>
                                </div>
                            </div>
                            <div class="box">
                                <div><strong>Cliente:</strong> ${customerLabel}</div>
                                <div><strong>Telefone:</strong> ${order.phone || "Nao informado"}</div>
                                <div><strong>Status:</strong> ${order.status || "-"}</div>
                                <div><strong>Financeiro:</strong> ${paymentStatusLabel}</div>
                                <div><strong>Pagamento:</strong> ${paymentMethodLabel}</div>
                                <div><strong>Tipo:</strong> ${deliveryModeLabel}</div>
                                <div><strong>Entrega:</strong> ${addressText}</div>
                                ${order.tableNumber ? `<div style="margin-top: 4px;"><span style="background: #000; color: #fff; padding: 2px 8px; font-weight: bold; border-radius: 4px;">MESA: ${String(order.tableNumber).padStart(2, '0')}</span></div>` : ""}
                                ${order.notes ? `<div><strong>Obs:</strong> ${order.notes}</div>` : ""}
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th class="right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRows || '<tr><td colspan="2">Sem itens</td></tr>'}
                                </tbody>
                            </table>
                            <div class="box right">
                                <div><strong>Subtotal:</strong> ${formatCurrency(order.subtotal || 0)}</div>
                                <div><strong>Taxa:</strong> ${formatCurrency(order.deliveryFee || 0)}</div>
                                <div><strong>Total:</strong> ${formatCurrency(order.total || 0)}</div>
                            </div>
                        </body>
                    </html>
                `;

        const html = mode === "THERMAL" ? thermalHtml : a4Html;

        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) {
            return;
        }

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        void api.post("/print-events", {
            subjectType: "order",
            subjectId: Number(order.id),
            template: "order_ticket",
            printMode: mode,
        }).catch(() => null);
    };

    const requestPrintOrder = (order: any) => {
        const hasPrintedHistory = Boolean(printSummaryByOrderId[order?.id]);
        const isDeliveredOrder = order?.status === "DELIVERED";

        if (isDeliveredOrder && hasPrintedHistory) {
            setReprintTargetOrder(order);
            return;
        }

        const isPreparingOrder = order?.status === "PREPARING";
        if (isPreparingOrder && directPrintAcceptedOrders) {
            localStorage.setItem(PRINT_MODE_STORAGE_KEY, printMode);
            handlePrintOrder(order, printMode);
            return;
        }
        setPrintTargetOrder(order);
    };

    const confirmReprintOrder = () => {
        if (!reprintTargetOrder) return;
        setPrintTargetOrder(reprintTargetOrder);
        setReprintTargetOrder(null);
    };

    const confirmPrintOrder = () => {
        if (!printTargetOrder) return;
        localStorage.setItem(PRINT_MODE_STORAGE_KEY, printMode);
        handlePrintOrder(printTargetOrder, printMode);
        setPrintTargetOrder(null);
    };

    useEffect(() => {
        const savedMode = localStorage.getItem(PRINT_MODE_STORAGE_KEY);
        if (savedMode === "THERMAL" || savedMode === "A4") {
            setPrintMode(savedMode);
        }

        const savedDirectPrintAcceptedOrders = localStorage.getItem(DIRECT_PRINT_ACCEPTED_ORDERS_KEY);
        if (savedDirectPrintAcceptedOrders === "true") {
            setDirectPrintAcceptedOrders(true);
        }
    }, []);

    const handleToggleDirectPrintAcceptedOrders = (enabled: boolean) => {
        setDirectPrintAcceptedOrders(enabled);
        localStorage.setItem(DIRECT_PRINT_ACCEPTED_ORDERS_KEY, String(enabled));
    };

    useEffect(() => {
        fetchOrders();
        const slug = getTenantSlug();
        const eventName = `new_order_${slug}`;

        const onNewOrder = (order: any) => {
            if (order?.id) {
                alertingOrderIdsRef.current.add(Number(order.id));
                setActiveAlertCount(alertingOrderIdsRef.current.size);
                startRepeatAlerts();
            }
            fetchOrders(true);
        };

        socket.on(eventName, onNewOrder);
        return () => {
            socket.off(eventName, onNewOrder);
        };
    }, []);

    return (
        <div className={cn("space-y-3", !isCompact && "ops-workspace orders-theme max-w-full")}>
            {!isCompact && (
                <AdminPageHeader
                    eyebrow="Operação"
                    title="Pedidos"
                    description="Fila de atendimento, produção e expedição em tempo real."
                />
            )}
            <div className={cn("flex flex-col gap-4", !isCompact && "orders-hero lg:flex-row lg:items-center lg:justify-end")}>
                {!isCompact && (
                    <span className="sr-only">Filtros de pedidos</span>
                )}

                <div className={cn("flex flex-wrap items-center gap-2", !isCompact && "ops-panel orders-filters w-full p-2")}>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {[
                            { id: "ALL", label: "Tudo" },
                            { id: "PENDING", label: "Novos" },
                            { id: "PREPARING", label: "Cozinha" },
                            { id: "DELIVERED", label: "Finalizados" }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setStatusFilter(f.id);
                                    setCompletedPage(1);
                                }}
                                className={cn(
                                    "h-9 shrink-0 rounded border px-4 text-xs font-semibold transition-colors",
                                    statusFilter === f.id
                                        ? "bg-slate-950 text-white border-slate-900 shadow-lg shadow-slate-950/20"
                                        : "bg-white text-slate-400 border-slate-100 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {f.label}
                                {orders.filter(o => {
                                    if (f.id === "ALL") return !isCompletedOrder(o) && o.status !== "CANCELLED";
                                    if (f.id === "PENDING") return ["PENDING", "CONFIRMED", "OPEN"].includes(o.status);
                                    if (f.id === "PREPARING") return ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status);
                                    if (f.id === "DELIVERED") return isCompletedOrder(o);
                                    return false;
                                }).length > 0 && (
                                    <span className="ml-1.5 opacity-60">
                                        ({orders.filter(o => {
                                            if (f.id === "ALL") return !isCompletedOrder(o) && o.status !== "CANCELLED";
                                            if (f.id === "PENDING") return ["PENDING", "CONFIRMED", "OPEN"].includes(o.status);
                                            if (f.id === "PREPARING") return ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status);
                                            if (f.id === "DELIVERED") return isCompletedOrder(o);
                                            return false;
                                        }).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "flex h-9 w-9 items-center justify-center rounded border transition-colors",
                                isMuted ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"
                            )}
                            title={isMuted ? "Ativar som" : "Mutar som"}
                        >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        {!isCompact && (
                            <button
                                onClick={handleTestAlert}
                                disabled={isMuted || isTestingAlert}
                                className={cn(
                                    "h-9 rounded border px-4 text-xs font-semibold transition-colors",
                                    isMuted ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                {isTestingAlert ? "..." : "Testar Alerta"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-slate-200" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando fluxo...</p>
                </div>
            ) : statusFilter === "DELIVERED" ? (
                <section className="ops-panel">
                    <div className="ops-panel-header">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-950">Histórico de pedidos finalizados</h2>
                            <p className="text-xs text-slate-500">{filteredOrders.length} pedido(s) concluído(s) no período carregado</p>
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                            Página {completedPage} de {completedPageCount}
                        </span>
                    </div>

                    {visibleCompletedOrders.length === 0 ? (
                        <div className="p-10 text-center text-sm text-slate-500">Nenhum pedido finalizado no período.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2.5">Pedido</th>
                                        <th className="px-4 py-2.5">Cliente</th>
                                        <th className="px-4 py-2.5">Conclusão</th>
                                        <th className="px-4 py-2.5">Pagamento</th>
                                        <th className="px-4 py-2.5">Status</th>
                                        <th className="px-4 py-2.5 text-right">Total</th>
                                        <th className="w-16 px-4 py-2.5 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {visibleCompletedOrders.map((order) => {
                                        const statusBadge = getStatusBadge(order);
                                        return (
                                            <tr key={order.id} className="text-sm hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono font-semibold text-slate-700">#{order.id}</td>
                                                <td className="max-w-64 truncate px-4 py-3 font-medium text-slate-900">
                                                    {order.customer?.name || order.customerName || "Cliente ocasional"}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {new Date(order.updatedAt || order.createdAt).toLocaleString("pt-BR")}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {formatPaymentMethodLabel(order.paymentMethod, order.changeFor)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("rounded border px-2 py-1 text-[10px] font-semibold", statusBadge.className)}>
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-950">
                                                    {formatCurrency(order.total)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => requestPrintOrder(order)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-500 hover:bg-slate-100"
                                                        title="Imprimir pedido"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                        <span className="text-xs text-slate-500">
                            Exibindo {visibleCompletedOrders.length} de {filteredOrders.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={completedPage <= 1}
                                onClick={() => setCompletedPage((page) => Math.max(1, page - 1))}
                                className="ops-button border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={completedPage >= completedPageCount}
                                onClick={() => setCompletedPage((page) => Math.min(completedPageCount, page + 1))}
                                className="ops-button border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </section>
            ) : (
                <div className={cn(
                    "grid gap-4",
                    isCompact ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-2"
                )}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        {filteredOrders.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="col-span-full flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white py-16 text-center"
                            >
                                <PackageCheck size={48} className="text-slate-200 mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum pedido no fluxo atual</p>
                            </motion.div>
                        ) : (
                            filteredOrders.map((order, idx) => {
                                const statusBadge = getStatusBadge(order);
                                const primaryAction = getPrimaryAction(order);
                                const showCancelButton = canCancelOrder(order.status);
                                const needsPixConfirmation = String(order.paymentMethod || "").toUpperCase() === "PIX"
                                    && !order.pixConfirmedAt
                                    && ["PENDING", "OPEN"].includes(order.status);
                                const createdAt = new Date(order.createdAt);
                                const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);
                                const isCritical = minutesAgo > 15 && ["PENDING", "CONFIRMED"].includes(order.status);

                                return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.02 }}
                                    key={order.id}
                                    className={cn(
                                        "order-operation-card group flex flex-col overflow-hidden rounded-md border bg-white transition-colors",
                                        order.status === "PENDING" ? "border-rose-100 shadow-sm shadow-rose-500/5 ring-1 ring-rose-50" : "border-slate-100 hover:border-slate-300",
                                        isCritical && "bg-rose-50/30",
                                        isCompact ? "aspect-auto" : "min-h-[320px]"
                                    )}
                                >
                                    <div className={cn("flex flex-col h-full", isCompact ? "p-3 space-y-2" : "p-4 space-y-3")}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "rounded-xl flex flex-col items-center justify-center shrink-0 border",
                                                    isCompact ? "h-8 w-8" : "h-10 w-10",
                                                    order.status === "PENDING" ? "bg-rose-600 border-rose-500 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                                )}>
                                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-60">ID</span>
                                                    <span className={cn("font-mono font-black border-slate-100 text-slate-900", isCompact ? "text-[9px]" : "text-[11px]", order.status === "PENDING" && "text-white")}>#{order.id.toString().slice(-4)}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className={cn("font-black text-slate-950 uppercase tracking-tight truncate", isCompact ? "text-xs" : "text-sm")}>
                                                        {order.customer?.name || order.customerName || "Cliente Ocasional"}
                                                    </h2>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn(
                                                            "font-black uppercase tracking-widest",
                                                            isCompact ? "text-[8px]" : "text-[9px]",
                                                            isCritical ? "text-rose-600 animate-pulse" : "text-slate-400"
                                                        )}>
                                                            {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                                                        </span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className={cn("font-black uppercase px-2 py-0.5 rounded-full border", isCompact ? "text-[7px]" : "text-[8px]", statusBadge.className)}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("font-black text-slate-950", isCompact ? "text-xs" : "text-sm")}>{formatCurrency(order.total)}</p>
                                                <div className="flex flex-col items-end gap-1">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{getOrderMode(order)}</p>
                                                    {order.tableNumber && (
                                                        <span className="bg-slate-950 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-tighter animate-pulse">
                                                            MESA {String(order.tableNumber).padStart(2, '0')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={cn("flex-1 rounded-xl bg-slate-50/50 border border-slate-100/50 space-y-1", isCompact ? "p-2" : "p-2.5")}>
                                            {order.items?.slice(0, isCompact ? 2 : 3).map((item: any, i: number) => {
                                                const addonList = formatItemDetails(item.addons);
                                                return (
                                                    <div key={i} className="flex flex-col">
                                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-slate-400 text-[8px]">{item.quantity}x</span>
                                                                <span className="text-slate-900 truncate uppercase">{item.name || item.product?.name}</span>
                                                            </div>
                                                        </div>
                                                        {addonList.length > 0 && (
                                                            <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-tight ml-5">+ {addonList.join(", ")}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {order.items?.length > (isCompact ? 2 : 3) && (
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest pt-1 px-1">
                                                    + {order.items.length - (isCompact ? 2 : 3)} outros
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <div className={cn("flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-50 bg-white", isCompact ? "px-1.5 py-1" : "px-2 py-1.5")}>
                                                <MapPin size={isCompact ? 8 : 10} className="text-slate-300" />
                                                <span className={cn("font-black text-slate-600 uppercase truncate", isCompact ? "text-[7px]" : "text-[9px]")}>
                                                    {order.address?.type === "PICKUP" ? "Retirada" : order.address?.type === "DINE_IN" ? "Mesa" : order.address?.details?.neighborhood || "Entrega"}
                                                </span>
                                            </div>
                                            <div className={cn("flex items-center justify-center gap-2 rounded-xl border border-slate-50 bg-white shrink-0", isCompact ? "px-1.5 py-1" : "px-2 py-1.5")}>
                                                <CreditCard size={isCompact ? 8 : 10} className="text-slate-300" />
                                                <span className={cn("font-black text-slate-600 uppercase", isCompact ? "text-[7px]" : "text-[9px]")}>
                                                    {formatPaymentMethodLabel(order.paymentMethod, order.changeFor)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                            {needsPixConfirmation ? (
                                                <button
                                                    onClick={() => confirmPixPayment(order.id)}
                                                    className="flex-1 h-9 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-600/20"
                                                    title="Confirme que o PIX caiu na conta da loja antes de aceitar o pedido"
                                                >
                                                    Confirmar PIX Recebido
                                                </button>
                                            ) : primaryAction && (
                                                <button
                                                    onClick={async () => {
                                                        const success = await updateStatus(order.id, primaryAction.nextStatus);
                                                        if (success && primaryAction.nextStatus === "CONFIRMED") {
                                                            handlePrintOrder(order, printMode);
                                                        }
                                                    }}
                                                    className="flex-1 h-9 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-md shadow-slate-950/20"
                                                >
                                                    {primaryAction.label}
                                                </button>
                                            )}
                                            <div className="flex gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => requestPrintOrder(order)}
                                                    className={cn(
                                                        "w-9 h-9 border rounded-xl flex items-center justify-center transition-all",
                                                        printSummaryByOrderId[order.id]
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                            : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                                                    )}
                                                    title="Reimprimir"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                {showCancelButton && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order)}
                                                        className="w-9 h-9 border border-rose-100 bg-rose-50/50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                        title="Cancelar"
                                                    >
                                                        <span className="text-sm">✕</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                        )}
                    </AnimatePresence>
                </div>
            )}

            <PrintModeModal
                isOpen={Boolean(printTargetOrder)}
                targetLabel={printTargetOrder ? `a comanda do pedido #${printTargetOrder.id}` : "a comanda"}
                selectedMode={printMode}
                onSelectMode={setPrintMode}
                onClose={() => setPrintTargetOrder(null)}
                onConfirm={confirmPrintOrder}
                showDirectToggle={true}
                directEnabled={directPrintAcceptedOrders}
                directToggleLabel="Sempre imprimir direto sem perguntar (somente em preparo)"
                onToggleDirectEnabled={handleToggleDirectPrintAcceptedOrders}
            />

            <ConfirmActionModal
                isOpen={Boolean(reprintTargetOrder)}
                title="Confirmar Reimpressao"
                description={reprintTargetOrder ? `O pedido #${reprintTargetOrder.id} ja foi impresso e esta finalizado. Deseja reimprimir mesmo assim?` : ""}
                confirmLabel="Reimprimir"
                cancelLabel="Cancelar"
                onConfirm={confirmReprintOrder}
                onClose={() => setReprintTargetOrder(null)}
            />
        </div>
    );
}
