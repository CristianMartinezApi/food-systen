"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Flame, Loader2, UtensilsCrossed } from "lucide-react";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { getTenantSlug } from "../../../../shared/utils/tenant";
import { getOrderMode, getNextStatusAfterPreparing, type OrderMode } from "../../../../shared/utils/orderStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

const READY_COLUMN_WINDOW_MS = 15 * 60 * 1000;
const READY_STATUSES = ["READY", "OUT_FOR_DELIVERY", "DELIVERED", "RETIRED"];

const MODE_LABEL: Record<OrderMode, string> = {
    DELIVERY: "Entrega",
    PICKUP: "Retirada",
    DINE_IN: "Mesa",
};

function formatItemDetails(value: any): string[] {
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
    return [];
}

function formatGuidedAssemblyDetails(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry: any) => {
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
        })
        .filter(Boolean) as string[];
}

function EmptyColumn({ label }: { label: string }) {
    return (
        <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs font-semibold uppercase tracking-widest text-slate-300">
            {label}
        </div>
    );
}

// Venda direta sem mesa e paga na hora (balcão, "enviar pra cozinha" ligado no Caixa)
// nasce com status PAID — não existe etapa de preparo pra ela no fluxo (PAID não
// avança pra PREPARING em nenhuma modalidade), então ela some do radar da Cozinha do
// mesmo jeito que uma mesa aberta (OPEN) sumia antes da correção anterior. Mostra
// como card informativo (sem botão de avançar) só enquanto está fresca — se já foi
// atualizada depois de criada, é um pedido antigo que só chegou em PAID no fim da
// jornada normal (retirada online paga, mesa fechada), não uma venda nova.
function isFreshPaidQuickSale(order: any): boolean {
    if (order.status !== "PAID" || order.tableNumber) return false;
    const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    const updatedAt = order.updatedAt ? new Date(order.updatedAt).getTime() : 0;
    const untouchedSinceCreation = Math.abs(updatedAt - createdAt) < 2 * 60 * 1000;
    const isRecent = Date.now() - createdAt < READY_COLUMN_WINDOW_MS;
    return untouchedSinceCreation && isRecent;
}

function OrderCard({ order, action, note }: { order: any; action?: { label: string; onClick: () => void }; note?: string }) {
    const mode = getOrderMode(order);
    const createdAt = new Date(order.createdAt);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-black text-slate-950">#{String(order.id).slice(-4)}</span>
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <Clock size={12} />
                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })}
                </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    {MODE_LABEL[mode]}
                </span>
                {order.tableNumber ? (
                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                        Mesa {String(order.tableNumber).padStart(2, "0")}
                    </span>
                ) : null}
            </div>

            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {order.items?.map((item: any, idx: number) => {
                    const addons = formatItemDetails(item.addons);
                    const removals = formatItemDetails(item.removals);
                    const guided = formatGuidedAssemblyDetails(item.guidedAssemblySelections);
                    return (
                        <div key={idx} className="text-sm">
                            <p className="font-bold text-slate-950">
                                <span className="text-slate-400">{item.quantity}x</span> {item.name || item.product?.name}
                                {item.variation ? <span className="text-slate-400"> ({item.variation})</span> : null}
                            </p>
                            {addons.length > 0 ? <p className="text-xs font-semibold text-emerald-600">+ {addons.join(", ")}</p> : null}
                            {guided.length > 0 ? <p className="text-xs font-semibold text-emerald-600">{guided.join(" · ")}</p> : null}
                            {removals.length > 0 ? <p className="text-xs font-semibold text-rose-500">sem {removals.join(", ")}</p> : null}
                            {item.observations ? <p className="text-xs italic text-slate-500">"{item.observations}"</p> : null}
                        </div>
                    );
                })}
            </div>

            {action ? (
                <button
                    onClick={action.onClick}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-black active:scale-[0.98]"
                >
                    {action.label}
                </button>
            ) : note ? (
                <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-widest text-emerald-600">{note}</p>
            ) : null}
        </div>
    );
}

export default function KitchenPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAlertSound = () => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
        } catch {
            // ambiente sem suporte a áudio — segue sem som
        }
    };

    const fetchOrders = async () => {
        try {
            const data = await api.get("/orders?filter=today");
            setOrders(data);
        } catch (error) {
            console.error("Erro ao buscar pedidos da cozinha:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const advanceStatus = async (orderId: number, status: string) => {
        try {
            await api.patch(`/orders/${orderId}`, { status });
            setOrders((prev) => prev.map((order) => (Number(order.id) === Number(orderId) ? { ...order, status } : order)));
        } catch (error) {
            console.error("Erro ao atualizar status do pedido:", error);
        }
    };

    // Pedido lançado pelo Garçom/Caixa nasce como OPEN (mesa/balcão, aceito na hora
    // do lançamento — sem gate de confirmação separado). Pra ele seguir pro preparo,
    // primeiro passa por CONFIRMED (transição já existente) e só então PREPARING —
    // os dois passos válidos encadeados num clique só, sem inventar transição nova.
    const startPreparing = async (order: any) => {
        try {
            if (order.status === "OPEN") {
                await api.patch(`/orders/${order.id}`, { status: "CONFIRMED" });
            }
            await api.patch(`/orders/${order.id}`, { status: "PREPARING" });
            setOrders((prev) => prev.map((o) => (Number(o.id) === Number(order.id) ? { ...o, status: "PREPARING" } : o)));
        } catch (error) {
            console.error("Erro ao iniciar preparo:", error);
        }
    };

    useEffect(() => {
        fetchOrders();
        const slug = getTenantSlug();
        const newOrderEvent = `new_order_${slug}`;
        const statusUpdatedEvent = `order_status_updated_${slug}`;

        const onNewOrder = () => {
            playAlertSound();
            fetchOrders();
        };
        const onStatusUpdated = () => fetchOrders();

        socket.on(newOrderEvent, onNewOrder);
        socket.on(statusUpdatedEvent, onStatusUpdated);
        return () => {
            socket.off(newOrderEvent, onNewOrder);
            socket.off(statusUpdatedEvent, onStatusUpdated);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    // OPEN = pedido de mesa/balcão lançado pelo Garçom/Caixa, já aceito na hora do
    // lançamento — entra direto na fila de "precisa cozinhar" junto com CONFIRMED.
    // Venda direta paga na hora (sem mesa) entra também, mas só como informativo —
    // ver isFreshPaidQuickSale.
    const confirmedOrders = orders.filter(
        (order) => order.status === "CONFIRMED" || order.status === "OPEN" || isFreshPaidQuickSale(order)
    );
    const preparingOrders = orders.filter((order) => order.status === "PREPARING");
    const readyCutoff = Date.now() - READY_COLUMN_WINDOW_MS;
    const readyOrders = orders.filter((order) => {
        if (!READY_STATUSES.includes(order.status)) return false;
        const updatedAt = order.updatedAt ? new Date(order.updatedAt).getTime() : 0;
        return updatedAt >= readyCutoff;
    });

    return (
        <div className="space-y-4">
            <AdminPageHeader eyebrow="Operação" title="Cozinha" description="Pedidos confirmados e em preparo, em tempo real." />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <UtensilsCrossed size={14} /> Confirmados ({confirmedOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {confirmedOrders.length === 0 ? <EmptyColumn label="Nenhum pedido aguardando" /> : null}
                        {confirmedOrders.map((order) => (
                            order.status === "PAID" ? (
                                <OrderCard key={order.id} order={order} note="Pago no balcão — sem etapa de preparo" />
                            ) : (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    action={{ label: "Iniciar preparo", onClick: () => startPreparing(order) }}
                                />
                            )
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500">
                        <Flame size={14} /> Em preparo ({preparingOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {preparingOrders.length === 0 ? <EmptyColumn label="Nenhum pedido em preparo" /> : null}
                        {preparingOrders.map((order) => {
                            const mode = getOrderMode(order);
                            return (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    action={{ label: "Pronto", onClick: () => advanceStatus(order.id, getNextStatusAfterPreparing(mode)) }}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600">
                        <CheckCircle2 size={14} /> Prontos ({readyOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {readyOrders.length === 0 ? <EmptyColumn label="Nada pronto nos últimos minutos" /> : null}
                        {readyOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
