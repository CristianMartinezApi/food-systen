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
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { PrintModeModal, type PrintMode } from "../../components/modals/PrintModeModal";
import { ConfirmActionModal } from "../../components/modals/ConfirmActionModal";

const PRINT_MODE_STORAGE_KEY = "@FoodSystem:printMode";
const DIRECT_PRINT_ACCEPTED_ORDERS_KEY = "@FoodSystem:directPrintAcceptedOrders";
const ENABLE_PRINT_EVENT_SUMMARY = process.env.NEXT_PUBLIC_ENABLE_PRINT_EVENT_SUMMARY === "true";

export default function OrdersPage() {
    gsap.config({ nullTargetWarn: false });

    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("ALL");
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
    const rootRef = useRef<HTMLDivElement>(null);

    const filteredOrders = orders.filter((o) =>
        statusFilter === "ALL" ? true : o.status === statusFilter
    );

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
            const data = await api.get("/orders");
            setOrders(data);
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
            fetchOrders();
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
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
        const addressText = order.address?.type === "PICKUP"
            ? "Retirada em unidade"
            : order.address?.type === "DINE_IN"
                ? "Consumo no local"
                : `${order.address?.details?.street || "Nao informado"}, ${order.address?.details?.number || "S/N"} - ${order.address?.details?.neighborhood || "Bairro"}`;

        const itemsRows = (order.items || []).map((item: any) => {
            const addonList = formatItemDetails(item.addons);
            const removalList = formatItemDetails(item.removals);
            const detailsLine = [
                item.variation ? `Var: ${item.variation}` : null,
                addonList.length ? `Add: ${addonList.join(", ")}` : null,
                removalList.length ? `Remover: ${removalList.join(", ")}` : null,
                item.observations ? `Obs: ${item.observations}` : null,
            ]
                .filter(Boolean)
                .join(" | ");

            return `
                            <tr>
                                <td>${item.quantity || 0}x ${item.name || item.product?.name || "Item"}${detailsLine ? `<br/><span style="color:#64748b;font-size:11px">${detailsLine}</span>` : ""}</td>
                                <td style="text-align:right">${formatCurrency((item.price || 0) * (item.quantity || 0))}</td>
                            </tr>
                        `;
        }).join("");

        const thermalHtml = `
                    <html>
                        <head>
                            <title>Pedido #${order.id}</title>
                            <style>
                                @page { size: 80mm auto; margin: 4mm; }
                                html, body { width: 72mm; margin: 0 auto; padding: 0; color: #000; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.25; }
                                .center { text-align: center; }
                                .right { text-align: right; }
                                .muted { color: #444; font-size: 10px; }
                                .sep { border-top: 1px dashed #000; margin: 6px 0; }
                                h1 { margin: 0; font-size: 13px; text-transform: uppercase; }
                                .meta { margin: 2px 0; }
                                table { width: 100%; border-collapse: collapse; }
                                td { vertical-align: top; padding: 3px 0; }
                                .item-name { width: 76%; }
                                .item-total { width: 24%; text-align: right; white-space: nowrap; }
                                .summary-row { display: flex; justify-content: space-between; margin: 2px 0; }
                                .total { font-size: 13px; font-weight: 700; }
                            </style>
                        </head>
                        <body>
                            <div class="center">
                                <h1>${restaurant?.name || "Loja"}</h1>
                                <div class="muted">${restaurant?.phone || ""}</div>
                                <div class="meta">Comanda #${order.id}</div>
                                <div class="muted">${createdAt}</div>
                            </div>
                            <div class="sep"></div>

                            <div><strong>Cliente:</strong> ${customerLabel}</div>
                            <div><strong>Fone:</strong> ${order.phone || "Nao informado"}</div>
                            <div><strong>Pagamento:</strong> ${order.paymentMethod === 'CASH' && order.changeFor ? `Dinheiro (Troco p/ ${formatCurrency(order.changeFor)})` : (order.paymentMethod || "Nao informado")}</div>
                            <div><strong>Entrega:</strong> ${addressText}</div>
                            ${order.notes ? `<div><strong>Obs:</strong> ${order.notes}</div>` : ""}

                            <div class="sep"></div>

                            <table>
                                <tbody>
                                    ${itemsRows || '<tr><td class="item-name">Sem itens</td><td class="item-total">-</td></tr>'}
                                </tbody>
                            </table>

                            <div class="sep"></div>

                            <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal || 0)}</span></div>
                            <div class="summary-row"><span>Taxa</span><span>${formatCurrency(order.deliveryFee || 0)}</span></div>
                            <div class="summary-row total"><span>Total</span><span>${formatCurrency(order.total || 0)}</span></div>

                            <div class="sep"></div>
                            <div class="center muted">Impresso em ${new Date().toLocaleString()}</div>
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
                                <div><strong>Pagamento:</strong> ${order.paymentMethod === 'CASH' && order.changeFor ? `Dinheiro (Troco p/ ${formatCurrency(order.changeFor)})` : (order.paymentMethod || "Nao informado")}</div>
                                <div><strong>Entrega:</strong> ${addressText}</div>
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

    useEffect(() => {
        if (isLoading || !rootRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.from(".orders-hero", { y: -18, opacity: 0, duration: 0.7 }).from(
                ".orders-filters",
                { y: 20, opacity: 0, duration: 0.7 },
                "-=0.2"
            );
        }, rootRef);

        return () => ctx.revert();
    }, [isLoading, orders.length, statusFilter]);

    return (
        <div ref={rootRef} className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-full">
            <div className="orders-hero flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 md:gap-8 lg:gap-10 mb-8 sm:mb-10 md:mb-12 lg:mb-14">
                <div>
                        <h1 className="text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Expedicao</h1>
                    <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Gestao logistica e acompanhamento de fluxo em tempo real.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.08em] border border-slate-200 bg-slate-100 text-slate-600">
                            Formato padrao: {printModeLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleToggleDirectPrintAcceptedOrders(!directPrintAcceptedOrders)}
                            className={cn(
                                "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.08em] border transition-colors",
                                directPrintAcceptedOrders
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                            title="Clique para alternar impressao direta em preparo"
                        >
                            Impressao direta em preparo: {directPrintAcceptedOrders ? "ativa" : "inativa"}
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.08em] border",
                                isMuted
                                    ? "bg-rose-50 text-rose-600 border-rose-200"
                                    : isAudioEnabled
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                        >
                            {isMuted ? "Alerta mutado" : isAudioEnabled ? "Alerta sonoro ativo" : "Clique para ativar audio"}
                        </span>
                        {!isAudioEnabled && !isMuted && (
                            <button
                                onClick={handleEnableAlerts}
                                className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-slate-950 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em]"
                            >
                                Ativar Alertas
                            </button>
                        )}
                        {activeAlertCount > 0 && (
                            <div className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] flex items-center">
                                {activeAlertCount} aguardando aceite
                            </div>
                        )}
                    </div>
                </div>

                <div className="orders-filters flex flex-wrap bg-white p-2 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm items-center gap-2">
                    <button
                        onClick={() => {
                            const nextMuted = !isMuted;
                            setIsMuted(nextMuted);

                            if (nextMuted) {
                                stopRepeatAlerts();
                                stopTitleBlink();
                                if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.currentTime = 0;
                                }
                            } else {
                                ensureAudioUnlocked();
                                if (alertingOrderIdsRef.current.size > 0) {
                                    playNotificationSound();
                                    startRepeatAlerts();
                                }
                            }
                        }}
                        className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all",
                            isMuted ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                        )}
                        title={isMuted ? "Ativar som" : "Mutar som"}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <button
                        onClick={handleTestAlert}
                        disabled={isMuted || isTestingAlert}
                        className={cn(
                            "h-10 sm:h-12 px-4 sm:px-5 rounded-xl sm:rounded-2xl text-[11px] sm:text-label font-body font-bold uppercase tracking-[0.06em] transition-all",
                            isMuted ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-950 text-white hover:bg-primary"
                        )}
                    >
                        {isTestingAlert ? "Testando..." : "Testar Alerta"}
                    </button>

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
                                "px-4 sm:px-6 md:px-8 h-10 sm:h-12 rounded-xl sm:rounded-2xl text-[11px] sm:text-label font-body font-bold uppercase tracking-[0.06em] transition-all shrink-0",
                                statusFilter === f.id
                                    ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
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
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8">
                    <AnimatePresence mode="popLayout" initial={false}>
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
                                    initial={false}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.04 }}
                                    key={order.id}
                                    className="order-card bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden"
                                >
                                    <div className="p-4 sm:p-5 md:p-6 lg:p-6">
                                        <div className="flex flex-col gap-3 sm:gap-4 md:gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-slate-950 text-white flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">PED</span>
                                                    <span className="text-[11px] font-mono font-bold">#{order.id.toString().slice(-4)}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="text-sm lg:text-base font-display font-bold text-slate-950 uppercase tracking-tight truncate">
                                                        {order.customer?.name || order.customerName || "Cliente Ocasional"}
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-body font-bold text-primary uppercase tracking-[0.08em]">
                                                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "text-[10px] font-body font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full border",
                                                                order.status === "PENDING"
                                                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                                                    : order.status === "CANCELLED"
                                                                        ? "bg-rose-50 text-rose-600 border-rose-100"
                                                                        : order.status === "DELIVERED"
                                                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                            : "bg-blue-50 text-blue-600 border-blue-100"
                                                            )}
                                                        >
                                                            {order.status === "PENDING"
                                                                ? "Pendente"
                                                                : order.status === "CANCELLED"
                                                                    ? "Cancelado"
                                                                    : order.status === "DELIVERED"
                                                                        ? "Finalizado"
                                                                        : "Producao"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">Resumo • {order.items?.length || 0} itens</p>
                                                <div className="mt-2 space-y-1.5 text-[11px] font-bold text-slate-600">
                                                    <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal || 0)}</span></div>
                                                    <div className="flex items-center justify-between"><span>Taxa</span><span>{formatCurrency(order.deliveryFee || 0)}</span></div>
                                                    <div className="flex items-center justify-between"><span>Troco</span><span>{order.changeFor ? formatCurrency(Number(order.changeFor)) : "-"}</span></div>
                                                </div>
                                                <div className="mt-3 rounded-lg bg-slate-950 text-white px-2.5 py-2">
                                                    <p className="text-[8px] uppercase tracking-[0.14em] text-white/60 font-bold">Total a Pagar</p>
                                                    <p className="font-mono text-lg font-bold leading-none mt-1">{formatCurrency(order.total)}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={14} className="text-slate-300 mt-0.5 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Entrega</p>
                                                            {order.address?.type === "PICKUP" ? (
                                                                <p className="font-bold text-primary text-xs mt-1">Retirada</p>
                                                            ) : order.address?.type === "DINE_IN" ? (
                                                                <p className="font-bold text-blue-600 text-xs mt-1">Consumo Local</p>
                                                            ) : (
                                                                <>
                                                                    <p className="font-bold text-slate-900 text-xs mt-1 truncate">{order.address?.details?.street || "Rua"}</p>
                                                                    <p className="text-[10px] text-slate-500 truncate">{order.address?.details?.neighborhood || "Bairro"}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                                                    <div className="flex items-start gap-2">
                                                        <CreditCard size={14} className="text-slate-300 mt-0.5 shrink-0" />
                                                        <div className="min-w-0 w-full">
                                                            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Pagamento</p>
                                                            <p className="font-bold text-slate-900 text-xs mt-1">
                                                                {({
                                                                    'CASH': 'Dinheiro',
                                                                    'PIX': 'PIX',
                                                                    'CARD': 'Cartão',
                                                                    'DEBIT': 'Débito',
                                                                    'CREDIT': 'Crédito'
                                                                } as Record<string, string>)[order.paymentMethod] || order.paymentMethod}
                                                                {order.paymentMethod === 'CASH' && order.changeFor && (
                                                                    <span className="block text-primary text-[10px] lowercase font-medium mt-0.5">
                                                                        (Troco p/ {formatCurrency(order.changeFor)})
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-dashed border-slate-200 pt-3">
                                                <div className="rounded-xl border border-slate-100 overflow-hidden bg-white max-h-64 overflow-y-auto">
                                                    {order.items?.length ? (
                                                        order.items.slice(0, 5).map((item: any, i: number) => {
                                                            const addonList = formatItemDetails(item.addons);
                                                            const removalList = formatItemDetails(item.removals);
                                                            const detailsLine = [
                                                                item.variation ? `Var: ${item.variation}` : null,
                                                                addonList.length > 0 ? `Add: ${addonList.join(", ")}` : null,
                                                                removalList.length > 0 ? `Remover: ${removalList.join(", ")}` : null,
                                                                item.observations ? `Obs: ${item.observations}` : null
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" | ");

                                                            return (
                                                                <div key={i} className={cn("px-3 py-2", i !== Math.min(order.items.length, 5) - 1 && "border-b border-slate-100")}>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-slate-950 px-1 py-0.5 text-[9px] font-bold text-white shrink-0">{item.quantity}x</span>
                                                                                <p className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">{item.name || item.product?.name}</p>
                                                                            </div>
                                                                            {detailsLine && <p className="mt-0.5 text-[9px] text-slate-500 truncate">{detailsLine}</p>}
                                                                        </div>
                                                                        <div className="shrink-0 text-right">
                                                                            <p className="text-[9px] font-mono font-bold text-primary">{formatCurrency((item.price || 0) * (item.quantity || 0))}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-300">
                                                            Itens nao enviados
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {order.notes && (
                                                <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">Obs gerais</p>
                                                    <p className="text-xs text-slate-700 font-medium mt-1 line-clamp-2">{order.notes}</p>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-slate-200">
                                                {order.status === "PENDING" && (
                                                    <>
                                                        <button
                                                            onClick={() => updateStatus(order.id, "PREPARING")}
                                                            className="h-9 px-4 bg-slate-950 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-slate-950/20 hover:bg-primary transition-all active:scale-95 flex-1"
                                                        >
                                                            Aceitar
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelOrder(order)}
                                                            className="h-9 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-body font-bold text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 flex-1"
                                                        >
                                                            Recusar
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === "PREPARING" && (
                                                    <button
                                                        onClick={() => updateStatus(order.id, "DELIVERED")}
                                                        className="h-9 px-4 bg-emerald-500 text-white rounded-lg font-body font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex-1"
                                                    >
                                                        Despachar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => requestPrintOrder(order)}
                                                    className={cn(
                                                        "w-9 h-9 border rounded-lg flex items-center justify-center transition-all shrink-0",
                                                        printSummaryByOrderId[order.id]
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                                                    )}
                                                    title="Imprimir comanda"
                                                >
                                                    <Printer size={16} />
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
