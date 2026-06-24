"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Wallet, Receipt, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Loader2, Archive, PlusCircle, MinusCircle, Scale, Printer, ShoppingCart, X, CreditCard, CheckCircle2 } from "lucide-react";
import { api } from "../../../../core/config/api";
import { formatCurrency, normalizeMoneyInput, parseMoneyInput, formatMoneyInputRealtime, cn } from "../../../../shared/utils";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { PrintModeModal, type PrintMode } from "../../components/modals/PrintModeModal";
import { ConfirmActionModal } from "../../components/modals/ConfirmActionModal";

const PRINT_MODE_STORAGE_KEY = "@FoodSystem:printMode";
const DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD = 5;
const HOMOLOGATION_STORAGE_KEY = "@FoodSystem:cashierHomologationChecklist";
const ENABLE_PRINT_EVENT_SUMMARY = process.env.NEXT_PUBLIC_ENABLE_PRINT_EVENT_SUMMARY === "true";

const paymentLabels: Record<string, string> = {
    PIX: "PIX",
    CASH: "Dinheiro",
    CARD: "Cartão",
    DEBIT: "Débito",
    CREDIT: "Crédito",
    OPEN: "Em Aberto",
};

type CashSession = {
    id: number;
    openingAmount: number;
    openedAt: string;
    closedAt?: string | null;
    openedBy?: { id: number; name: string; email: string } | null;
    closedBy?: { id: number; name: string; email: string } | null;
    status: "OPEN" | "CLOSED";
    closingAmount?: number | null;
    expectedAmount?: number | null;
    differenceAmount?: number | null;
    notes?: string | null;
};

type CashOperator = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type CashMovement = {
    id: number;
    type: "SUPPLY" | "WITHDRAWAL" | "ADJUSTMENT";
    amount: number;
    reason?: string | null;
    createdAt: string;
};

type SessionOrder = {
    id: number;
    customerName: string;
    status: string;
    total: number;
    paymentMethod: string;
    tableNumber?: number | null;
    createdAt: string;
    items: any[];
    notes?: string | null;
};

type CashierProduct = {
    id: number;
    name: string;
    price: number;
    discountPercent?: number;
    isActive?: boolean;
    addons?: any[];
    ingredients?: any[];
    category?: { id: number; name: string } | null;
};

type DirectSaleItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    observations?: string;
    addons?: any[];
    removals?: string[];
};

type DirectSalePaymentMethod = "CASH" | "PIX" | "CARD" | "DEBIT" | "CREDIT" | "OPEN";
type CashierOperationTab = "CASH_OPERATION" | "DIRECT_SALES";

const HOMOLOGATION_STEPS = [
    { id: "open", label: "Abrir sessao de caixa com valor inicial" },
    { id: "cashSale", label: "Registrar venda direta em dinheiro com troco" },
    { id: "pixCardSale", label: "Registrar venda direta em PIX ou cartao" },
    { id: "movement", label: "Registrar ao menos 1 movimento (sangria/suprimento/ajuste)" },
    { id: "close", label: "Fechar caixa com validacao de divergencia" },
];

export default function CashierPage({ 
    isSidebar = false, 
    onTotalsChange,
    onOrderCreated
}: { 
    isSidebar?: boolean; 
    onTotalsChange?: (totals: any) => void;
    onOrderCreated?: () => void;
}) {
    const searchParams = useSearchParams();
    const tableParam = searchParams.get("table");

    const toDateInputValue = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const [session, setSession] = useState<CashSession | null>(null);
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [orders, setOrders] = useState<SessionOrder[]>([]);
    const [history, setHistory] = useState<CashSession[]>([]);
    const [operators, setOperators] = useState<CashOperator[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLimit] = useState(8);
    const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
    const [filterOperatorId, setFilterOperatorId] = useState("ALL");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [filterPreset, setFilterPreset] = useState<"ALL" | "TODAY" | "LAST_7" | "LAST_30">("ALL");
    const [totals, setTotals] = useState<{
        supplies: number;
        withdrawals: number;
        adjustments: number;
        movementsCount: number;
        sales: number;
        cashSales: number;
        cardSales: number;
        debitSales: number;
        creditSales: number;
        pixSales: number;
        expectedAmount: number;
        salesByPayment: { method: string; total: number }[];
    }>({
        supplies: 0,
        withdrawals: 0,
        adjustments: 0,
        movementsCount: 0,
        sales: 0,
        cashSales: 0,
        cardSales: 0,
        debitSales: 0,
        creditSales: 0,
        pixSales: 0,
        expectedAmount: 0,
        salesByPayment: [],
    });

    const [openingAmount, setOpeningAmount] = useState("");
    const [closingAmount, setClosingAmount] = useState("");
    const [informedCardAmount, setInformedCardAmount] = useState("");
    const [informedPixAmount, setInformedPixAmount] = useState("");
    const [closingNotes, setClosingNotes] = useState("");
    const [movementType, setMovementType] = useState<"SUPPLY" | "WITHDRAWAL" | "ADJUSTMENT">("SUPPLY");
    const [movementAmount, setMovementAmount] = useState("");
    const [movementReason, setMovementReason] = useState("");
    const [directSalePaymentMethod, setDirectSalePaymentMethod] = useState<DirectSalePaymentMethod>("CASH");
    const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<Exclude<DirectSalePaymentMethod, "OPEN">>("CASH");
    const [directSaleCashReceivedAmount, setDirectSaleCashReceivedAmount] = useState("");
    const [sendToKitchen, setSendToKitchen] = useState(false);
    const [directSaleCustomerName, setDirectSaleCustomerName] = useState("Venda Balcao");
    const [directSaleNotes, setDirectSaleNotes] = useState("");
    const [directSaleProducts, setDirectSaleProducts] = useState<CashierProduct[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [selectedDirectProductId, setSelectedDirectProductId] = useState("");
    const [selectedDirectProductQty, setSelectedDirectProductQty] = useState("1");
    const [selectedDirectProductObs, setSelectedDirectProductObs] = useState("");
    const [selectedDirectAddons, setSelectedDirectAddons] = useState<any[]>([]);
    const [selectedDirectRemovals, setSelectedDirectRemovals] = useState<string[]>([]);
    const [directSaleItems, setDirectSaleItems] = useState<DirectSaleItem[]>([]);
    const [directSaleTableNumber, setDirectSaleTableNumber] = useState<string>(tableParam || "");
    const [activeTables, setActiveTables] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [operationTab, setOperationTab] = useState<CashierOperationTab>(tableParam ? "DIRECT_SALES" : "CASH_OPERATION");
    const [printMode, setPrintMode] = useState<PrintMode>("THERMAL");
    const [printSessionId, setPrintSessionId] = useState<number | null>(null);
    const [printSummaryBySessionId, setPrintSummaryBySessionId] = useState<Record<number, any>>({});
    const [closeSessionConfirmOpen, setCloseSessionConfirmOpen] = useState(false);
    const [differenceNoteThreshold, setDifferenceNoteThreshold] = useState(DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD);
    const [preOpeningOrders, setPreOpeningOrders] = useState<{ id: number; customerName: string; total: number; createdAt: string; paymentMethod: string; status: string }[]>([]);
    const [preOpeningModalOpen, setPreOpeningModalOpen] = useState(false);
    const [openedSessionId, setOpenedSessionId] = useState<number | null>(null);
    const [absorbingPreOrders, setAbsorbingPreOrders] = useState(false);
    const [paymentModalOrder, setPaymentModalOrder] = useState<SessionOrder | null>(null);
    const [homologationChecklist, setHomologationChecklist] = useState<Record<string, boolean>>(
        () => Object.fromEntries(HOMOLOGATION_STEPS.map((step) => [step.id, false])) as Record<string, boolean>
    );
    const printModeLabel = printMode === "THERMAL" ? "Termica 80mm" : "A4";
    const closingDifference = Number((parseMoneyInput(closingAmount) - (totals.expectedAmount || 0)).toFixed(2));
    const directSaleAmountNumber = Number(
        directSaleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)
    );
    const openingAmountNumber = parseMoneyInput(openingAmount);
    const canOpenSession = !Number.isNaN(openingAmountNumber) && openingAmountNumber > 0;
    const requiresMovementReason = movementType === "WITHDRAWAL" || movementType === "ADJUSTMENT";
    const directSaleCashReceivedNumber = parseMoneyInput(directSaleCashReceivedAmount || 0);
    const directSaleChangeDue = directSalePaymentMethod === "CASH"
        ? Number((directSaleCashReceivedNumber - directSaleAmountNumber).toFixed(2))
        : 0;

    const selectedTable = activeTables.find(t => t.tableNumber === Number(directSaleTableNumber));
    const occupiedOrder = selectedTable?.isOccupied ? selectedTable.orders[0] : null;

    const isDirectSaleCash = directSalePaymentMethod === "CASH" && !directSaleTableNumber;
    const absoluteClosingDifference = Math.abs(closingDifference);
    const hasAnyClosingDifference = absoluteClosingDifference > 0;
    const hasRelevantClosingDifference = absoluteClosingDifference >= differenceNoteThreshold;
    const closingRiskRatio = differenceNoteThreshold > 0
        ? Math.min(absoluteClosingDifference / differenceNoteThreshold, 1)
        : (hasAnyClosingDifference ? 1 : 0);
    const closingRiskLabel = !hasAnyClosingDifference
        ? "Conferido"
        : hasRelevantClosingDifference
            ? "Alta divergencia"
            : "Divergencia leve";
    const completedHomologationCount = HOMOLOGATION_STEPS.filter((step) => homologationChecklist[step.id]).length;
    const homologationProgress = Number(((completedHomologationCount / HOMOLOGATION_STEPS.length) * 100).toFixed(0));
    const isHomologated = homologationProgress === 100;

    const pendingOrders = useMemo(() => {
        // Pedidos que ainda exigem atenção financeira (não foram pagos nem cancelados)
        // Também ignoramos pedidos que já foram totalmente finalizados (entregues/retirados e pagos)
        return orders.filter(o => 
            o.status !== 'PAID' && 
            o.status !== 'CANCELLED' &&
            o.status !== 'DELIVERED' &&
            o.status !== 'RETIRED'
        );
    }, [orders]);

    const categories = useMemo(() => {
        const cats = new Map<string, { id: string, name: string }>();
        directSaleProducts.forEach(p => {
            if (p.category) {
                cats.set(String(p.category.id), { id: String(p.category.id), name: p.category.name });
            }
        });
        return Array.from(cats.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [directSaleProducts]);

    const filteredDirectSaleProducts = useMemo(() => {
        if (selectedCategory === "ALL") return directSaleProducts;
        return directSaleProducts.filter(p => String(p.category?.id) === selectedCategory);
    }, [directSaleProducts, selectedCategory]);

    const markHomologationSteps = (stepIds: string[]) => {
        if (stepIds.length === 0) return;
        setHomologationChecklist((prev) => {
            const next = { ...prev };
            for (const stepId of stepIds) {
                if (stepId in next) next[stepId] = true;
            }
            return next;
        });
    };

    const loadCashier = async (page = historyPage) => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            query.set("limit", String(historyLimit));
            query.set("page", String(page));
            if (filterStatus !== "ALL") query.set("status", filterStatus);
            if (filterOperatorId !== "ALL") query.set("openedById", filterOperatorId);
            if (filterStartDate) query.set("startDate", new Date(`${filterStartDate}T00:00:00`).toISOString());
            if (filterEndDate) query.set("endDate", new Date(`${filterEndDate}T23:59:59`).toISOString());

            const [sessionData, sessionsHistory, operatorsData, settingsData, productsData, tablesData] = await Promise.all([
                api.get("/cashier/session"),
                api.get(`/cashier/sessions?${query.toString()}`),
                api.get("/cashier/operators"),
                api.get("/settings"),
                api.get("/products"),
                api.get("/tables"),
            ]);

            setSession(sessionData.session || null);
            setMovements(sessionData.movements || []);
            setOrders(sessionData.orders || []);
            setHistory(sessionsHistory.data || []);
            setHistoryTotal(Number(sessionsHistory.total || 0));
            setHistoryPage(Number(sessionsHistory.page || page));
            setOperators(Array.isArray(operatorsData) ? operatorsData : []);
            setSettings(settingsData);
            setActiveTables(Array.isArray(tablesData) ? tablesData : []);
            setDirectSaleProducts(
                (Array.isArray(productsData) ? productsData : [])
                    .filter((product: any) => product?.isActive !== false)
                    .map((product: any) => ({
                        id: Number(product.id),
                        name: String(product.name || "PRODUTO"),
                        price: Number(product.price || 0),
                        discountPercent: Number(product.discountPercent || 0),
                        isActive: Boolean(product.isActive ?? true),
                        addons: Array.isArray(product.addons) ? product.addons : [],
                        ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
                        category: product.category || null,
                    }))
            );
            setDifferenceNoteThreshold(Number(settingsData?.cashDifferenceNoteThreshold ?? DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD));
            const sessionIds = (sessionsHistory.data || []).map((item: any) => Number(item.id)).filter(Boolean);
            if (ENABLE_PRINT_EVENT_SUMMARY && sessionIds.length > 0) {
                try {
                    const summary = await api.get(`/print-events/summary?subjectType=cash_session&ids=${sessionIds.join(",")}`);
                    const nextSummary = (summary || []).reduce((acc: Record<number, any>, item: any) => {
                        acc[Number(item.subjectId)] = item;
                        return acc;
                    }, {});
                    setPrintSummaryBySessionId(nextSummary);
                } catch {
                    setPrintSummaryBySessionId({});
                }
            } else {
                setPrintSummaryBySessionId({});
            }
            const currentTotals = sessionData.totals || {
                    supplies: 0,
                    withdrawals: 0,
                    adjustments: 0,
                    movementsCount: 0,
                    sales: 0,
                    cashSales: 0,
                    cardSales: 0,
                    debitSales: 0,
                    creditSales: 0,
                    pixSales: 0,
                    expectedAmount: 0,
                    salesByPayment: [],
                };
            setTotals(currentTotals);
            if (onTotalsChange) onTotalsChange(currentTotals);

            const autoSteps: string[] = [];
            if (sessionData?.session) autoSteps.push("open");
            if ((sessionData?.movements || []).length > 0) autoSteps.push("movement");
            if (Number(sessionData?.totals?.cashSales || 0) > 0) autoSteps.push("cashSale");
            if (Number(sessionData?.totals?.sales || 0) > Number(sessionData?.totals?.cashSales || 0)) autoSteps.push("pixCardSale");
            if ((sessionsHistory.data || []).some((item: any) => item.status === "CLOSED")) autoSteps.push("close");
            markHomologationSteps(autoSteps);
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar caixa");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCashier(1);
    }, [filterStatus, filterOperatorId, filterStartDate, filterEndDate]);

    useEffect(() => {
        if (tableParam) {
            setDirectSaleTableNumber(tableParam);
        }
    }, [tableParam]);

    useEffect(() => {
        if (directSaleTableNumber && directSaleTableNumber !== "") {
            setDirectSalePaymentMethod("OPEN");
        } else if (directSalePaymentMethod === "OPEN") {
            setDirectSalePaymentMethod("CASH");
        }
    }, [directSaleTableNumber]);

    const handleOpenSession = async () => {
        const parsed = parseMoneyInput(openingAmount);
        if (Number.isNaN(parsed) || parsed <= 0) {
            toast.error("Informe um valor de abertura maior que zero");
            return;
        }

        try {
            setSubmitting(true);
            const result = await api.post("/cashier/session/open", { openingAmount: parsed });
            const sessionId = result.id;
            setOpenedSessionId(sessionId || null);
            setClosingAmount("");

            // Se houver pedidos anteriores à abertura, incluir automaticamente na sessão
            const pendingBefore = Array.isArray(result.preOpeningOrders) ? result.preOpeningOrders : [];
            if (pendingBefore.length > 0 && sessionId) {
                try {
                    setAbsorbingPreOrders(true);
                    const earliest = pendingBefore.reduce((prev: any, curr: any) =>
                        new Date(curr.createdAt) < new Date(prev.createdAt) ? curr : prev
                    );
                    await api.patch(`/cashier/sessions/${sessionId}/count-from`, {
                        countFromDate: earliest.createdAt,
                    });
                } catch {
                    // falha silenciosa: caixa abre normalmente mesmo se count-from falhar
                } finally {
                    setAbsorbingPreOrders(false);
                }
                setPreOpeningOrders(pendingBefore);
                setPreOpeningModalOpen(true);
            } else {
                toast.success("Caixa aberto com sucesso");
            }

            await loadCashier(historyPage);
        } catch (error: any) {
            toast.error(error.message || "Erro ao abrir caixa");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDismissPreOpeningModal = () => {
        setPreOpeningModalOpen(false);
        setPreOpeningOrders([]);
    };

    const handleCreateMovement = async () => {
        const parsed = parseMoneyInput(movementAmount);
        if (Number.isNaN(parsed) || parsed <= 0) {
            toast.error("Valor do movimento invalido");
            return;
        }

        if (requiresMovementReason && !movementReason.trim()) {
            toast.error("Informe o motivo para sangria ou ajuste");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/cashier/movements", {
                type: movementType,
                amount: parsed,
                reason: movementReason || null,
            });
            toast.success("Movimento registrado");
            markHomologationSteps(["movement"]);
            setMovementAmount("");
            setMovementReason("");
            await loadCashier(historyPage);
        } catch (error: any) {
            toast.error(error.message || "Erro ao registrar movimento");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleDirectAddon = (addon: any) => {
        setSelectedDirectAddons(prev => {
            const exists = prev.find(a => a.name === addon.name);
            if (exists) return prev.filter(a => a.name !== addon.name);
            return [...prev, addon];
        });
    };

    const handleToggleDirectRemoval = (ingredient: string) => {
        setSelectedDirectRemovals(prev => {
            const exists = prev.includes(ingredient);
            if (exists) return prev.filter(i => i !== ingredient);
            return [...prev, ingredient];
        });
    };

    const handleAddDirectSaleItem = () => {
        const productId = Number(selectedDirectProductId);
        const quantity = Number(selectedDirectProductQty);

        if (!productId) {
            toast.error("Selecione um produto para adicionar");
            return;
        }

        if (Number.isNaN(quantity) || quantity <= 0) {
            toast.error("Quantidade invalida");
            return;
        }

        const product = directSaleProducts.find((item) => item.id === productId);
        if (!product) {
            toast.error("Produto nao encontrado");
            return;
        }

        const unitPrice = Number((product.price * (1 - ((product.discountPercent || 0) / 100))).toFixed(2));
        const addonsTotal = selectedDirectAddons.reduce((acc, addon) => acc + (Number(addon.price) || 0), 0);
        const totalPrice = unitPrice + addonsTotal;

        setDirectSaleItems((prev) => {
            // Se tiver observação ou adicionais/remoções, sempre adiciona como item separado para não agrupar o que é diferente
            if (selectedDirectProductObs.trim() || selectedDirectAddons.length > 0 || selectedDirectRemovals.length > 0) {
                return [...prev, { 
                    productId, 
                    name: product.name, 
                    price: totalPrice, 
                    quantity,
                    observations: selectedDirectProductObs.trim(),
                    addons: selectedDirectAddons,
                    removals: selectedDirectRemovals
                }];
            }

            const existing = prev.find((item) => item.productId === productId && !item.observations && (!item.addons || item.addons.length === 0) && (!item.removals || item.removals.length === 0));
            if (!existing) {
                return [...prev, { productId, name: product.name, price: totalPrice, quantity }];
            }

            return prev.map((item) => (
                item.productId === productId && !item.observations && (!item.addons || item.addons.length === 0) && (!item.removals || item.removals.length === 0)
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            ));
        });

        setSelectedDirectProductId("");
        setSelectedDirectProductQty("1");
        setSelectedDirectProductObs("");
        setSelectedDirectAddons([]);
        setSelectedDirectRemovals([]);
    };

    const handleRemoveDirectSaleItem = (productId: number) => {
        setDirectSaleItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const handleUpdateDirectSaleItemQty = (productId: number, quantity: number) => {
        if (Number.isNaN(quantity) || quantity <= 0) return;
        setDirectSaleItems((prev) => prev.map((item) => (
            item.productId === productId ? { ...item, quantity } : item
        )));
    };

    const handleRegisterDirectSale = async () => {
        const parsed = Number(directSaleAmountNumber);
        
        if (directSaleItems.length === 0 && !occupiedOrder) {
            toast.error("Adicione produtos para registrar a venda direta");
            return;
        }

        const cashReceivedParsed = directSalePaymentMethod === "CASH"
            ? parseMoneyInput(directSaleCashReceivedAmount)
            : null;

        if (directSalePaymentMethod === "CASH" && !occupiedOrder) {
            if (cashReceivedParsed === null || Number.isNaN(cashReceivedParsed) || cashReceivedParsed < parsed) {
                toast.error("Valor recebido deve ser maior ou igual ao valor da venda");
                return;
            }
        }

        try {
            setSubmitting(true);

            if (occupiedOrder) {
                if (directSaleItems.length === 0) {
                    toast.error("Adicione itens para enviar à mesa");
                    return;
                }
                
                await api.post(`/orders/${occupiedOrder.id}/items`, {
                    items: directSaleItems.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        observations: item.observations,
                        addons: item.addons,
                        removals: item.removals,
                    }))
                });
                toast.success("Itens adicionados à mesa com sucesso!");
            } else {
                const isTableOrder = !!directSaleTableNumber;
                
                await api.post("/cashier/direct-sales", {
                    paymentMethod: isTableOrder ? null : directSalePaymentMethod,
                    items: directSaleItems.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        observations: item.observations,
                        addons: item.addons,
                        removals: item.removals,
                    })),
                    cashReceivedAmount: isTableOrder ? null : cashReceivedParsed,
                    customerName: directSaleCustomerName || (isTableOrder ? `Mesa ${directSaleTableNumber}` : "Venda Balcao"),
                    notes: directSaleNotes || null,
                    tableNumber: directSaleTableNumber ? Number(directSaleTableNumber) : null,
                    sendToKitchen,
                });
                toast.success(isTableOrder ? "Pedido da mesa aberto com sucesso" : "Venda registrada");
            }

            if (!directSaleTableNumber) {
                markHomologationSteps([directSalePaymentMethod === "CASH" ? "cashSale" : "pixCardSale"]);
            }
            setDirectSaleCashReceivedAmount("");
            setDirectSaleNotes("");
            setDirectSaleTableNumber("");
            setSendToKitchen(false);
            setDirectSaleItems([]);
            setSelectedDirectProductId("");
            setSelectedDirectProductQty("1");
            loadCashier(1);
            if (onOrderCreated && (sendToKitchen || occupiedOrder)) {
                onOrderCreated();
            }
        } catch (error) {
            console.error("Erro ao registrar venda:", error);
            toast.error("Erro ao processar. Verifique os dados.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: number, status: string, extraData: any = {}) => {
        try {
            await api.patch(`/orders/${orderId}`, { status, ...extraData });
            toast.success("Operação realizada com sucesso!");
            loadCashier(1);
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error);
            toast.error("Erro ao realizar operação");
        }
    };

    const handlePrintOrder = (order: any, mode: any) => {
        const restaurantRaw = localStorage.getItem("@FoodSystem:restaurant");
        const restaurant = restaurantRaw ? JSON.parse(restaurantRaw) : null;
        const createdAt = new Date(order.createdAt).toLocaleString();
        
        const formatItemDetails = (details: any) => {
            if (!details) return [];
            if (Array.isArray(details)) return details.map(d => typeof d === 'string' ? d : d.name);
            return [];
        };

        const itemsRows = (order.items || []).map((item: any) => {
            const addonList = formatItemDetails(item.addons);
            const removalList = formatItemDetails(item.removals);
            const detailsLine = [
                item.variation ? `Var: ${item.variation}` : null,
                addonList.length ? `Add: ${addonList.join(", ")}` : null,
                removalList.length ? `Remover: ${removalList.join(", ")}` : null,
                item.observations ? `Obs: ${item.observations}` : null,
            ].filter(Boolean).join(" | ");

            return `
                <tr>
                    <td style="padding: 4px 0; border-bottom: 1px dotted #000;">
                        <div style="display: flex; gap: 8px;">
                            <span style="font-size: 14px; font-weight: bold; min-width: 25px;">${item.quantity || 0}x</span>
                            <div style="flex: 1;">
                                <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${item.name || "ITEM"}</div>
                                ${detailsLine ? `<div style="font-size: 11px; margin-top: 2px;">${detailsLine}</div>` : ""}
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
                        .sep { border-top: 1px dashed #000; margin: 8px 0; }
                        .sep-double { border-top: 3px double #000; margin: 8px 0; }
                        h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
                        .subtitle { font-size: 10px; margin-bottom: 4px; }
                        .badge { background: #000; color: #fff; padding: 4px 8px; font-weight: bold; font-size: 18px; display: inline-block; }
                        table { width: 100%; border-collapse: collapse; }
                        .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 4px; margin-top: 8px; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <h1>${restaurant?.name || "RESTAURANTE"}</h1>
                        <div class="subtitle" style="margin-top: 4px;">CONFERÊNCIA DE CONTA</div>
                    </div>

                    <div class="sep-double"></div>

                    <div class="center" style="margin-bottom: 8px;">
                        <div class="badge">MESA: ${String(order.tableNumber).padStart(2, '0')}</div>
                    </div>

                    <div class="subtitle center">Aberto em: ${createdAt}</div>

                    <div class="sep"></div>

                    <table>
                        <thead>
                            <tr>
                                <th align="left" style="font-size: 10px; padding-bottom: 4px;">ITEM</th>
                                <th align="right" style="font-size: 10px; padding-bottom: 4px;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>

                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(order.total || 0)}</span>
                    </div>

                    <div class="sep-double"></div>
                    <div class="center bold" style="font-size: 11px;">
                        *** NÃO É DOCUMENTO FISCAL ***
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open("", "_blank", "width=400,height=600");
        if (printWindow) {
            printWindow.document.write(thermalHtml);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleCloseSession = async () => {
        const parsed = parseMoneyInput(closingAmount);
        const cardParsed = parseMoneyInput(informedCardAmount || 0);
        const pixParsed = parseMoneyInput(informedPixAmount || 0);

        if (Number.isNaN(parsed) || parsed < 0) {
            toast.error("Valor de fechamento invalido");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/cashier/session/close", {
                closingAmount: parsed,
                informedCardAmount: cardParsed,
                informedPixAmount: pixParsed,
                notes: closingNotes || null,
            });
            toast.success("Caixa fechado com sucesso");
            markHomologationSteps(["close"]);
            setClosingAmount("");
            setInformedCardAmount("");
            setInformedPixAmount("");
            setClosingNotes("");
            setCloseSessionConfirmOpen(false);
            await loadCashier(1);
        } catch (error: any) {
            toast.error(error.message || "Erro ao fechar caixa");
        } finally {
            setSubmitting(false);
        }
    };

    const requestCloseSession = () => {
        const parsed = parseMoneyInput(closingAmount);
        if (Number.isNaN(parsed) || parsed < 0) {
            toast.error("Valor de fechamento invalido");
            return;
        }

        const differenceAmount = Number((parsed - (totals.expectedAmount || 0)).toFixed(2));
        if (Math.abs(differenceAmount) >= differenceNoteThreshold && !closingNotes.trim()) {
            toast.error(`Informe uma justificativa para divergencias a partir de ${formatCurrency(differenceNoteThreshold)}.`);
            return;
        }

        setCloseSessionConfirmOpen(true);
    };

    const handlePrintSessionReport = async (sessionId: number, mode: PrintMode) => {
        try {
            const report = await api.get(`/cashier/sessions/${sessionId}/report`);
            const reportRestaurant = report.restaurant || null;
            const reportSession = report.session as CashSession;
            const reportTotals = report.totals || {};
            const reportMovements = report.movements || [];

            const paymentRows = (reportTotals.salesByPayment || [])
                .map((entry: any) => `
                    <div class="line">
                        <span>${paymentLabels[entry.method] || entry.method} (Esperado)</span>
                        <span>${formatCurrency(entry.total || 0)}</span>
                    </div>
                    <div class="line muted" style="margin-bottom: 4px;">
                        <span>${paymentLabels[entry.method] || entry.method} (Informado)</span>
                        <span>${formatCurrency(entry.informed || 0)}</span>
                    </div>
                    ${entry.difference !== 0 ? `<div class="line" style="font-size: 9px; color: ${entry.difference < 0 ? 'red' : 'green'}"><span>Diferenca ${entry.method}</span><span>${formatCurrency(entry.difference)}</span></div>` : ''}
                `)
                .join("");

            const thermalHtml = `
                            <html>
                                <head>
                                    <title>Relatorio Caixa #${reportSession.id}</title>
                                    <style>
                                        @page { size: 80mm auto; margin: 4mm; }
                                        html, body { width: 72mm; margin: 0 auto; padding: 0; color: #000; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.25; }
                                        .center { text-align: center; }
                                        .right { text-align: right; }
                                        .muted { color: #444; font-size: 10px; }
                                        .sep { border-top: 1px dashed #000; margin: 6px 0; }
                                        h1 { margin: 0; font-size: 13px; text-transform: uppercase; }
                                        h2 { margin: 0 0 2px; font-size: 11px; text-transform: uppercase; }
                                        .line { display: flex; justify-content: space-between; margin: 2px 0; }
                                        .strong { font-weight: 700; }
                                        .signature-block { margin-top: 10px; }
                                        .signature-line { margin-top: 14px; border-top: 1px solid #000; text-align: center; font-size: 10px; padding-top: 3px; }
                                        table { width: 100%; border-collapse: collapse; }
                                        th, td { text-align: left; padding: 3px 0; font-size: 10px; border-bottom: 1px dotted #999; }
                                    </style>
                                </head>
                                <body>
                                    <div class="center">
                                        <h1>${reportRestaurant?.name || "Loja"}</h1>
                                        <div class="muted">${reportRestaurant?.phone || ""}</div>
                                        <div>Fechamento Caixa #${reportSession.id}</div>
                                    </div>
                                    <div class="sep"></div>

                                    <div class="muted">Abertura: ${new Date(reportSession.openedAt).toLocaleString()}</div>
                                    <div class="muted">Fechamento: ${reportSession.closedAt ? new Date(reportSession.closedAt).toLocaleString() : "Em aberto"}</div>
                                    <div class="muted">Op. abertura: ${reportSession.openedBy?.name || "Nao informado"}</div>
                                    <div class="muted">Op. fechamento: ${reportSession.closedBy?.name || "Nao informado"}</div>

                                    <div class="sep"></div>
                                    <h2>Resumo</h2>
                                    <div class="line"><span>Abertura</span><span>${formatCurrency(reportSession.openingAmount || 0)}</span></div>
                                    <div class="line"><span>Vendas (total)</span><span>${formatCurrency(reportTotals.sales || 0)}</span></div>
                                    <div class="line"><span>Vendas em dinheiro</span><span>${formatCurrency(reportTotals.cashSales || 0)}</span></div>
                                    <div class="line"><span>Suprimentos</span><span>${formatCurrency(reportTotals.supplies || 0)}</span></div>
                                    <div class="line"><span>Sangrias</span><span>${formatCurrency(reportTotals.withdrawals || 0)}</span></div>
                                    <div class="line"><span>Esperado em caixa</span><span>${formatCurrency(reportTotals.expectedAmount || 0)}</span></div>
                                    <div class="line"><span>Fechamento</span><span>${formatCurrency(reportTotals.closingAmount || 0)}</span></div>
                                    <div class="line strong"><span>Diferenca</span><span>${formatCurrency(reportTotals.differenceAmount || 0)}</span></div>

                                    <div class="sep"></div>
                                    <h2>Pagamento</h2>
                                    ${paymentRows || '<div class="line"><span>Sem vendas</span><span>-</span></div>'}

                                    <div class="sep"></div>
                                    <h2>Movimentos</h2>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Hora</th>
                                                <th>Tipo</th>
                                                <th class="right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${reportMovements
                    .map((m: any) => `<tr><td>${new Date(m.createdAt).toLocaleTimeString()}</td><td>${m.type}</td><td class="right">${formatCurrency(m.amount || 0)}</td></tr>`)
                    .join("") || '<tr><td colspan="3">Sem movimentos</td></tr>'}
                                        </tbody>
                                    </table>

                                    <div class="signature-block">
                                        <div class="muted">Operador responsavel: ${reportSession.closedBy?.name || "Nao informado"}</div>
                                        <div class="signature-line">Assinatura do operador</div>
                                    </div>

                                    <div class="sep"></div>
                                    <div class="center muted">Impresso em ${new Date().toLocaleString()}</div>
                                </body>
                            </html>
                        `;

            const a4Html = `
                            <html>
                                <head>
                                    <title>Relatorio Caixa #${reportSession.id}</title>
                                    <style>
                                        @page { size: A4; margin: 14mm; }
                                        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
                                        h1 { margin: 0; font-size: 20px; }
                                        h2 { margin: 16px 0 8px; font-size: 13px; text-transform: uppercase; }
                                        .muted { color: #64748b; }
                                        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
                                        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
                                        .line { display: flex; justify-content: space-between; margin: 3px 0; }
                                        .signature-block { margin-top: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
                                        .signature-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; min-height: 76px; display: flex; flex-direction: column; justify-content: flex-end; }
                                        .signature-line { border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; text-align: center; }
                                        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                                        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; font-size: 12px; }
                                        .right { text-align: right; }
                                    </style>
                                </head>
                                <body>
                                    <h1>Fechamento de Caixa #${reportSession.id}</h1>
                                    <p class="muted">${reportRestaurant?.name || "Loja"}${reportRestaurant?.phone ? ` • ${reportRestaurant.phone}` : ""}</p>
                                    <p class="muted">Abertura: ${new Date(reportSession.openedAt).toLocaleString()} | Fechamento: ${reportSession.closedAt ? new Date(reportSession.closedAt).toLocaleString() : "Em aberto"}</p>
                                    <p class="muted">Operador abertura: ${reportSession.openedBy?.name || "Nao informado"} | Operador fechamento: ${reportSession.closedBy?.name || "Nao informado"}</p>

                                    <h2>Resumo</h2>
                                    <div class="grid">
                                        <div class="card">Abertura: <strong>${formatCurrency(reportSession.openingAmount || 0)}</strong></div>
                                        <div class="card">Vendas (total): <strong>${formatCurrency(reportTotals.sales || 0)}</strong></div>
                                        <div class="card">Vendas em dinheiro: <strong>${formatCurrency(reportTotals.cashSales || 0)}</strong></div>
                                        <div class="card">Suprimentos: <strong>${formatCurrency(reportTotals.supplies || 0)}</strong></div>
                                        <div class="card">Sangrias: <strong>${formatCurrency(reportTotals.withdrawals || 0)}</strong></div>
                                        <div class="card">Esperado em caixa: <strong>${formatCurrency(reportTotals.expectedAmount || 0)}</strong></div>
                                        <div class="card">Fechamento: <strong>${formatCurrency(reportTotals.closingAmount || 0)}</strong></div>
                                        <div class="card">Diferenca: <strong>${formatCurrency(reportTotals.differenceAmount || 0)}</strong></div>
                                    </div>

                                    <h2>Vendas por pagamento</h2>
                                    <div class="card">
                                        ${paymentRows || '<div class="line"><span>Sem vendas</span><span>-</span></div>'}
                                    </div>

                                    <h2>Movimentos</h2>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Tipo</th>
                                                <th>Motivo</th>
                                                <th class="right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${reportMovements
                    .map((m: any) => `<tr><td>${new Date(m.createdAt).toLocaleString()}</td><td>${m.type}</td><td>${m.reason || "-"}</td><td class="right">${formatCurrency(m.amount || 0)}</td></tr>`)
                    .join("") || '<tr><td colspan="4">Sem movimentos</td></tr>'}
                                        </tbody>
                                    </table>

                                    <h2>Assinaturas</h2>
                                    <div class="signature-block">
                                        <div class="signature-card">
                                            <div class="signature-line">Operador de fechamento: ${reportSession.closedBy?.name || "Nao informado"}</div>
                                        </div>
                                        <div class="signature-card">
                                            <div class="signature-line">Conferencia da gerencia</div>
                                        </div>
                                    </div>
                                </body>
                            </html>
                        `;

            const html = mode === "THERMAL" ? thermalHtml : a4Html;

            const printWindow = window.open("", "_blank", "width=900,height=700");
            if (!printWindow) {
                toast.error("Nao foi possivel abrir a janela de impressao");
                return;
            }
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            void api.post("/print-events", {
                subjectType: "cash_session",
                subjectId: Number(sessionId),
                template: "cash_closing_report",
                printMode: mode,
            }).catch(() => null);
        } catch (error: any) {
            toast.error(error.message || "Erro ao gerar relatorio de impressao");
        }
    };

    const requestPrintSessionReport = (sessionId: number) => {
        setPrintSessionId(sessionId);
    };

    const confirmPrintSessionReport = async () => {
        if (!printSessionId) return;
        localStorage.setItem(PRINT_MODE_STORAGE_KEY, printMode);
        await handlePrintSessionReport(printSessionId, printMode);
        setPrintSessionId(null);
    };

    useEffect(() => {
        const savedMode = localStorage.getItem(PRINT_MODE_STORAGE_KEY);
        if (savedMode === "THERMAL" || savedMode === "A4") {
            setPrintMode(savedMode);
        }

        const savedChecklistRaw = localStorage.getItem(HOMOLOGATION_STORAGE_KEY);
        if (!savedChecklistRaw) return;

        try {
            const parsed = JSON.parse(savedChecklistRaw) as Record<string, boolean>;
            setHomologationChecklist((prev) => {
                const next = { ...prev };
                for (const step of HOMOLOGATION_STEPS) {
                    if (typeof parsed?.[step.id] === "boolean") {
                        next[step.id] = parsed[step.id];
                    }
                }
                return next;
            });
        } catch {
            // ignore invalid local cache
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(HOMOLOGATION_STORAGE_KEY, JSON.stringify(homologationChecklist));
    }, [homologationChecklist]);

    useEffect(() => {
        if (session) {
            markHomologationSteps(["open"]);
        }
    }, [session]);

    const applyPreset = (preset: "ALL" | "TODAY" | "LAST_7" | "LAST_30") => {
        setFilterPreset(preset);
        if (preset === "ALL") {
            setFilterStartDate("");
            setFilterEndDate("");
            return;
        }

        const today = new Date();
        const end = toDateInputValue(today);

        if (preset === "TODAY") {
            setFilterStartDate(end);
            setFilterEndDate(end);
            return;
        }

        const start = new Date(today);
        start.setDate(today.getDate() - (preset === "LAST_7" ? 6 : 29));
        setFilterStartDate(toDateInputValue(start));
        setFilterEndDate(end);
    };

    const cards = useMemo(() => {
        const statusLabel = session ? `Aberto #${session.id}` : "Nao iniciado";
        return [
            { label: "Sessao de Caixa", value: statusLabel, icon: Wallet },
            { label: "Movimentos", value: String(totals.movementsCount || 0), icon: Receipt },
            { label: "Suprimentos", value: formatCurrency(totals.supplies || 0), icon: ArrowDownCircle },
            { label: "Sangrias", value: formatCurrency(totals.withdrawals || 0), icon: ArrowUpCircle },
        ];
    }, [session, totals]);

    const movementTypeLabel = {
        SUPPLY: "Suprimento",
        WITHDRAWAL: "Sangria",
        ADJUSTMENT: "Ajuste",
    };

    if (loading) {
        return (
            <div className="h-80 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    return (
        <div ref={rootRef} className={cn("space-y-4", !isSidebar && "min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 max-w-full")}>
            <div className={cn("flex flex-col gap-4 mb-4", !isSidebar && "cashier-hero lg:flex-row lg:items-end justify-between sm:mb-10 md:mb-12 lg:mb-14")}>
                {!isSidebar && (
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">Fluxo de Caixa</h1>
                        <p className="text-[12px] sm:text-label font-body font-medium text-slate-400 uppercase tracking-[0.06em] mt-2">Gestão financeira, PDV e controle de turnos em tempo real.</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.08em] border border-slate-200 bg-slate-100 text-slate-600">
                                {isHomologated ? "Terminal Homologado" : "Aguardando Homologação"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <section className={cn("grid gap-2", isSidebar ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4")}>
                {cards.map((card) => (
                    <article key={card.label} className={cn("rounded-2xl border border-slate-100 bg-white shadow-sm", isSidebar ? "p-3" : "p-4")}>
                        <div className="flex items-center justify-between">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                            <card.icon size={12} className="text-slate-900" />
                        </div>
                        <p className={cn("mt-1 font-black text-slate-950 uppercase tracking-tight", isSidebar ? "text-xs" : "text-base")}>{card.value}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setOperationTab("CASH_OPERATION")}
                        className={cn(
                            "rounded-xl border font-black uppercase tracking-[0.16em] transition-colors",
                            isSidebar ? "h-9 text-[9px]" : "h-11 text-[11px]",
                            operationTab === "CASH_OPERATION" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Abertura e Fechamento
                    </button>
                    <button
                        type="button"
                        onClick={() => setOperationTab("DIRECT_SALES")}
                        className={cn(
                            "relative rounded-xl border font-black uppercase tracking-[0.16em] transition-colors",
                            isSidebar ? "h-9 text-[9px]" : "h-11 text-[11px]",
                            operationTab === "DIRECT_SALES" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Venda Direta no Balcao
                        {pendingOrders.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-bounce shadow-lg ring-2 ring-white">
                                {pendingOrders.length}
                            </span>
                        )}
                    </button>
                </div>
            </section>

            <section className={cn("grid gap-4", !isSidebar && operationTab === "CASH_OPERATION" ? "xl:grid-cols-3" : "grid-cols-1")}>
                {operationTab === "CASH_OPERATION" && (
                    <article className={cn("rounded-2xl border border-slate-100 bg-white shadow-sm", isSidebar ? "p-3" : "p-6", !isSidebar && "xl:col-span-2")}>
                        <h2 className={cn("font-display font-bold text-slate-950 uppercase tracking-tight", isSidebar ? "text-sm" : "text-heading-3")}>Sessão Atual</h2>
                        {!session ? (
                            <div className="mt-5 space-y-4">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Valor de abertura</span>
                                    <input
                                        value={openingAmount}
                                        onChange={(e) => setOpeningAmount(formatMoneyInputRealtime(e.target.value))}
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                                    />
                                </label>
                                <button
                                    disabled={submitting || !canOpenSession}
                                    onClick={handleOpenSession}
                                    className="h-12 px-6 rounded-2xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Abrir Caixa
                                </button>
                                {!canOpenSession && (
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
                                        Informe um valor maior que zero para abrir o caixa.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className={cn("mt-4", isSidebar ? "space-y-3" : "space-y-4")}>
                                <div className={cn("rounded-2xl border border-slate-100 bg-slate-50", isSidebar ? "p-3" : "p-4")}>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Abertura</p>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className={cn("font-display font-bold text-slate-950 uppercase tracking-tight", isSidebar ? "text-lg" : "text-heading-3")}>{formatCurrency(session.openingAmount)}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className={cn("grid gap-2", isSidebar ? "grid-cols-1" : "sm:grid-cols-3")}>
                                    <div className={cn("rounded-xl border border-emerald-100 bg-emerald-50", isSidebar ? "p-3" : "p-4")}>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">Faturamento</p>
                                        <p className={cn("font-bold text-emerald-700", isSidebar ? "text-xs" : "text-sm")}>{formatCurrency(totals.sales || 0)}</p>
                                    </div>
                                    <div className={cn("rounded-xl border border-violet-100 bg-violet-50", isSidebar ? "p-3" : "p-4")}>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-violet-600">Dinheiro</p>
                                        <p className={cn("font-bold text-violet-700", isSidebar ? "text-xs" : "text-sm")}>{formatCurrency(totals.cashSales || 0)}</p>
                                    </div>
                                    <div className={cn("rounded-xl border border-blue-100 bg-blue-50", isSidebar ? "p-3" : "p-4")}>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-600">Esperado</p>
                                        <p className={cn("font-bold text-blue-700", isSidebar ? "text-xs" : "text-sm")}>{formatCurrency(totals.expectedAmount || 0)}</p>
                                    </div>
                                </div>
                                <div className={cn("rounded-2xl border border-slate-100 bg-slate-50", isSidebar ? "p-3" : "p-4")}>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Checklist de fechamento</p>
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">1. Valor esperado</span>
                                            <span className="text-emerald-600">OK</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">2. Informar em caixa</span>
                                            <span className={closingAmount ? "text-emerald-600" : "text-slate-400"}>{closingAmount ? "OK" : "Pendente"}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">3. Justificar divergencia</span>
                                            <span className={absoluteClosingDifference < differenceNoteThreshold || closingNotes.trim() ? "text-emerald-600" : "text-amber-600"}>
                                                {absoluteClosingDifference < differenceNoteThreshold || closingNotes.trim() ? "OK" : "Obrigatorio"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={10} className="text-white" />
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-700">
                                            Aberto por: {session.openedBy?.name || 'Sistema'}
                                        </span>
                                    </div>
                                </div>
                                <div className={cn("grid gap-3", isSidebar ? "grid-cols-1" : "sm:grid-cols-2")}>
                                    <label className="block">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Cartão (Comprovantes)</span>
                                        <input
                                            value={informedCardAmount}
                                            onChange={(e) => setInformedCardAmount(formatMoneyInputRealtime(e.target.value))}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className={cn("mt-1.5 w-full rounded-xl border border-slate-200 px-4 outline-none", isSidebar ? "h-10 text-[11px]" : "h-12")}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total PIX (Conferência)</span>
                                        <input
                                            value={informedPixAmount}
                                            onChange={(e) => setInformedPixAmount(formatMoneyInputRealtime(e.target.value))}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className={cn("mt-1.5 w-full rounded-xl border border-slate-200 px-4 outline-none", isSidebar ? "h-10 text-[11px]" : "h-12")}
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dinheiro em Espécie no Cofre</span>
                                    <input
                                        value={closingAmount}
                                        onChange={(e) => setClosingAmount(formatMoneyInputRealtime(e.target.value))}
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        className={cn("mt-1.5 w-full rounded-xl border border-slate-200 px-4 outline-none", isSidebar ? "h-10 text-[11px]" : "h-12")}
                                    />
                                </label>

                                <div className={cn("rounded-2xl border border-slate-200 bg-white space-y-4", isSidebar ? "p-3" : "p-4")}>
                                    <div className="flex flex-col gap-1 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Resumo de conferência</p>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.12em] ${hasRelevantClosingDifference ? "text-rose-600" : hasAnyClosingDifference ? "text-amber-600" : "text-emerald-600"}`}>
                                            {closingRiskLabel}
                                        </span>
                                    </div>
                                    <div className={cn("grid gap-2", isSidebar ? "grid-cols-1" : "sm:grid-cols-3")}>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">Dinheiro</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[7px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(totals.expectedAmount || 0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(parseMoneyInput(closingAmount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">Cartão</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[7px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency((totals.cardSales || 0) + (totals.debitSales || 0) + (totals.creditSales || 0))}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(parseMoneyInput(informedCardAmount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">PIX</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[7px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(totals.pixSales || 0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(parseMoneyInput(informedPixAmount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full transition-all ${hasRelevantClosingDifference ? "bg-rose-500" : hasAnyClosingDifference ? "bg-amber-500" : "bg-emerald-500"}`}
                                                style={{ width: `${Math.max(closingRiskRatio * 100, hasAnyClosingDifference ? 8 : 0)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 text-center">
                                            Diferença Dinheiro: {formatCurrency(closingDifference)} (Limite: {formatCurrency(differenceNoteThreshold)})
                                        </p>
                                    </div>
                                </div>

                                {absoluteClosingDifference >= differenceNoteThreshold && (
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Justificativa da divergencia</span>
                                        <textarea
                                            value={closingNotes}
                                            onChange={(e) => setClosingNotes(e.target.value)}
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3 outline-none resize-none"
                                            placeholder={`Explique a divergencia encontrada no fechamento (a partir de ${formatCurrency(differenceNoteThreshold)})`}
                                        />
                                    </label>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        disabled={submitting}
                                        onClick={requestCloseSession}
                                        className="flex-1 h-11 px-4 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-colors border border-slate-200"
                                    >
                                        ⚠️ Fechar Caixa
                                    </button>
                                </div>
                            </div>
                        )}
                    </article>
                )}

                <article className={cn("rounded-2xl border border-slate-100 bg-white shadow-sm", isSidebar ? "p-4" : "p-6")}>
                    <h2 className={cn("font-display font-bold text-slate-950 uppercase tracking-tight", isSidebar ? "text-sm" : "text-heading-3")}>
                        {operationTab === "DIRECT_SALES" ? "Venda Direta" : "Movimentos & Sangria"}
                    </h2>
                    {session ? (
                        <>
                            <div className={cn("mt-4", isSidebar ? "space-y-3" : "space-y-4")}>
                                {operationTab === "DIRECT_SALES" && (
                                    <div className={cn("rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-white space-y-4", isSidebar ? "p-3" : "p-5")}>
                                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Balcao</p>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${isDirectSaleCash ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-sky-200 bg-sky-100 text-sky-800"}`}>
                                                {isDirectSaleCash ? "Caixa fisico" : "Faturamento"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input
                                                value={directSaleCustomerName}
                                                onChange={(e) => setDirectSaleCustomerName(e.target.value)}
                                                type="text"
                                                placeholder="Cliente (opcional)"
                                                className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                            />
                                            {Number(settings?.tableCount || 0) > 0 && (
                                                <select
                                                    value={directSaleTableNumber}
                                                    onChange={(e) => setDirectSaleTableNumber(e.target.value)}
                                                    className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11 font-bold")}
                                                >
                                                    <option value="">Para onde vai? (Sem Mesa)</option>
                                                    {Array.from({ length: Number(settings.tableCount) }, (_, i) => i + 1).map((n) => (
                                                        <option key={n} value={String(n)}>MESA {String(n).padStart(2, '0')}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* Pedidos Pendentes (Viagem e Mesas) */}
                                        {pendingOrders.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Contas em Aberto (Mesa & Balcão)</p>
                                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                                        {pendingOrders.length} pendente(s)
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {pendingOrders.map(order => (
                                                        <button 
                                                            key={order.id}
                                                            onClick={() => setPaymentModalOrder(order)}
                                                            className="group relative p-3 bg-white border-2 border-emerald-100 text-emerald-800 rounded-2xl text-[10px] font-bold hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-start gap-1 shadow-sm active:scale-95"
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={cn(
                                                                        "w-6 h-6 rounded-lg flex items-center justify-center",
                                                                        order.tableNumber ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                                                    )}>
                                                                        {order.tableNumber ? <Archive size={12} /> : <ShoppingCart size={12} />}
                                                                    </div>
                                                                    <span className="font-black">#{order.id}</span>
                                                                </div>
                                                                {order.tableNumber && (
                                                                    <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Mesa {order.tableNumber}</span>
                                                                )}
                                                            </div>
                                                            <span className="truncate max-w-full opacity-70 uppercase mt-1">{order.customerName}</span>
                                                            <span className="text-emerald-600 font-black text-xs">{formatCurrency(order.total)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="sep-dotted my-4"></div>
                                            </div>
                                        )}

                                        {occupiedOrder && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Mesa {String(directSaleTableNumber).padStart(2, '0')} Ocupada</p>
                                                    <p className="font-bold text-amber-900">{formatCurrency(occupiedOrder.total)}</p>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPaymentModalOrder(occupiedOrder);
                                                        }}
                                                        className="flex-1 h-8 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-700"
                                                    >
                                                        Fechar Conta
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Opcional: imprimir a prévia da conta
                                                            handlePrintOrder(occupiedOrder, "THERMAL");
                                                        }}
                                                        className="h-8 px-3 bg-white border border-amber-200 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100"
                                                    >
                                                        Prévia
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!directSaleTableNumber && (
                                            <div className="grid grid-cols-1 gap-2">
                                                <select
                                                    value={directSalePaymentMethod}
                                                    onChange={(e) => setDirectSalePaymentMethod(e.target.value as DirectSalePaymentMethod)}
                                                    className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                                >
                                                    <option value="CASH">Dinheiro</option>
                                                    <option value="PIX">PIX</option>
                                                    <option value="DEBIT">Cartão de Débito</option>
                                                    <option value="CREDIT">Cartão de Crédito</option>
                                                    <option value="CARD">Cartão (Outros)</option>
                                                </select>
                                            </div>
                                        )}

                                        {directSaleTableNumber && (
                                            <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 px-4 flex items-center justify-between", isSidebar ? "h-9" : "h-11")}>
                                                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Forma de Pagamento</span>
                                                <span className="font-black text-emerald-700 text-[10px] uppercase">📝 Em Aberto (Mesa)</span>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {categories.length > 0 && (
                                                <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCategory("ALL")}
                                                        className={cn(
                                                            "whitespace-nowrap px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                                                            selectedCategory === "ALL"
                                                                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                                                                : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
                                                        )}
                                                    >
                                                        Todos
                                                    </button>
                                                    {categories.map((cat) => (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => setSelectedCategory(cat.id)}
                                                            className={cn(
                                                                "whitespace-nowrap px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all",
                                                                selectedCategory === cat.id
                                                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                                                                    : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
                                                            )}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-2">
                                                <select
                                                    value={selectedDirectProductId}
                                                onChange={(e) => {
                                                    setSelectedDirectProductId(e.target.value);
                                                    setSelectedDirectAddons([]);
                                                    setSelectedDirectRemovals([]);
                                                }}
                                                className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                            >
                                                <option value="">🛒 Selecionar produto...</option>
                                                {filteredDirectSaleProducts.map((product) => {
                                                    const finalPrice = Number((product.price * (1 - ((product.discountPercent || 0) / 100))).toFixed(2));
                                                    return (
                                                        <option key={product.id} value={String(product.id)}>
                                                            {product.name} • {formatCurrency(finalPrice)}
                                                        </option>
                                                    );
                                                })}
                                            </select>

                                            {(selectedDirectProductId && directSaleProducts.find(p => String(p.id) === selectedDirectProductId)?.addons?.length || 0) > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {directSaleProducts.find(p => String(p.id) === selectedDirectProductId)?.addons?.map((addon: any) => (
                                                        <button
                                                            key={addon.name}
                                                            type="button"
                                                            onClick={() => handleToggleDirectAddon(addon)}
                                                            className={cn(
                                                                "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border",
                                                                selectedDirectAddons.find(a => a.name === addon.name)
                                                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                                                    : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300"
                                                            )}
                                                        >
                                                            + {addon.name} ({formatCurrency(addon.price)})
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {(selectedDirectProductId && directSaleProducts.find(p => String(p.id) === selectedDirectProductId)?.ingredients?.length || 0) > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {directSaleProducts.find(p => String(p.id) === selectedDirectProductId)?.ingredients?.map((ing: string) => (
                                                        <button
                                                            key={ing}
                                                            type="button"
                                                            onClick={() => handleToggleDirectRemoval(ing)}
                                                            className={cn(
                                                                "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border",
                                                                selectedDirectRemovals.includes(ing)
                                                                    ? "bg-rose-600 border-rose-600 text-white"
                                                                    : "bg-white border-slate-200 text-slate-500 hover:border-rose-300"
                                                            )}
                                                        >
                                                            Sem {ing}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                value={selectedDirectProductQty}
                                                    onChange={(e) => setSelectedDirectProductQty(e.target.value)}
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="Qtd"
                                                    className={cn("w-full rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddDirectSaleItem}
                                                    className={cn("px-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.12em]", isSidebar ? "h-9" : "h-11")}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                            <input
                                                value={selectedDirectProductObs}
                                                onChange={(e) => setSelectedDirectProductObs(e.target.value)}
                                                type="text"
                                                placeholder="Adicionais ou Removê (Ex: Sem cebola, +bacon)"
                                                className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                            />
                                            {directSaleItems.length === 0 ? (
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center py-3">Nenhum item adicionado</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[9px] font-bold">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-widest">
                                                                <th className="text-left py-1.5 px-2">Produto</th>
                                                                <th className="text-center py-1.5 px-1 w-12">Qtd</th>
                                                                <th className="text-right py-1.5 px-2">Valor</th>
                                                                <th className="text-center py-1.5 px-1 w-6">✕</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {directSaleItems.map((item, idx) => (
                                                                <tr key={`${item.productId}-${idx}`} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                                                                    <td className="py-1.5 px-2 min-w-0">
                                                                        <div className="flex flex-col">
                                                                            <span className="truncate text-[9px]">{item.name}</span>
                                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                {item.addons?.map((addon: any) => (
                                                                                    <span key={addon.name} className="text-[7px] bg-emerald-100 text-emerald-800 px-1 rounded font-black uppercase tracking-tighter">
                                                                                        +{addon.name}
                                                                                    </span>
                                                                                ))}
                                                                                {item.removals?.map((rem: string) => (
                                                                                    <span key={rem} className="text-[7px] bg-rose-100 text-rose-800 px-1 rounded font-black uppercase tracking-tighter">
                                                                                        -{rem}
                                                                                    </span>
                                                                                ))}
                                                                                {item.observations && (
                                                                                    <span className="text-[7px] text-rose-500 font-bold uppercase leading-tight italic">
                                                                                        Obs: {item.observations}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-center py-1.5">
                                                                        <input
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleUpdateDirectSaleItemQty(item.productId, Number(e.target.value))}
                                                                            type="number"
                                                                            min="1"
                                                                            step="1"
                                                                            className="w-10 h-6 rounded border border-slate-200 bg-white px-1 text-center text-[9px] font-bold outline-none"
                                                                        />
                                                                    </td>
                                                                    <td className="text-right py-1.5 px-2 font-black text-emerald-700 text-[9px]">{formatCurrency(item.price * item.quantity)}</td>
                                                                    <td className="text-center py-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveDirectSaleItem(item.productId)}
                                                                            className="text-[11px] font-black text-rose-600 hover:text-rose-700"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {isDirectSaleCash && (
                                                <>
                                                    <input
                                                        value={directSaleCashReceivedAmount}
                                                        onChange={(e) => setDirectSaleCashReceivedAmount(formatMoneyInputRealtime(e.target.value))}
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="Valor recebido"
                                                        className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                                    />
                                                    <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 px-4 flex items-center justify-between", isSidebar ? "h-9" : "h-11")}>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Troco</span>
                                                        <span className={`font-black ${directSaleChangeDue < 0 ? "text-rose-600" : "text-emerald-700"} ${isSidebar ? "text-[11px]" : "text-xs"}`}>
                                                            {formatCurrency(Number.isFinite(directSaleChangeDue) ? Math.max(directSaleChangeDue, 0) : 0)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            <input
                                                value={directSaleNotes}
                                                onChange={(e) => setDirectSaleNotes(e.target.value)}
                                                type="text"
                                                placeholder="Observação (opcional)"
                                                className={cn("rounded-2xl border border-emerald-200 bg-white px-4 outline-none sm:col-span-2", isSidebar ? "h-9 text-[11px]" : "h-11")}
                                            />
                                        </div>

                                        <div className={cn("flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50", isSidebar ? "px-3 py-2" : "px-4 py-3")}>
                                            <div className="flex flex-col">
                                                <span className={cn("font-black uppercase tracking-widest text-emerald-800", isSidebar ? "text-[8px]" : "text-[10px]")}>Enviar para Cozinha?</span>
                                                <span className={cn("font-bold text-emerald-600/60 uppercase tracking-tighter", isSidebar ? "text-[7px]" : "text-[8px]")}>Ticket de produção</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSendToKitchen(!sendToKitchen)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none",
                                                    sendToKitchen ? "bg-emerald-600" : "bg-slate-200"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                        sendToKitchen ? (isSidebar ? "translate-x-5" : "translate-x-5") : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        <button
                                            disabled={submitting}
                                            onClick={handleRegisterDirectSale}
                                            className={cn(
                                                "px-5 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em]",
                                                occupiedOrder ? "bg-amber-600" : isDirectSaleCash ? "bg-emerald-600" : "bg-sky-600",
                                                isSidebar ? "h-9" : "h-11"
                                            )}
                                        >
                                            {occupiedOrder ? "Adicionar à Mesa" : isDirectSaleCash ? "Registrar no Caixa" : "Registrar Venda"}
                                        </button>

                                        <div className="mt-6 space-y-3 pt-6 border-t border-emerald-50">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                                    <ShoppingCart size={14} /> Vendas da Sessão
                                                </h3>
                                                <span className="text-[10px] font-bold text-slate-400">Total: {orders.length}</span>
                                            </div>

                                            {orders.length === 0 ? (
                                                <div className={cn("rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/30 text-center", isSidebar ? "px-3 py-4" : "px-4 py-6")}>
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600/60">Nenhuma venda registrada nesta sessão ainda.</p>
                                                </div>
                                            ) : (
                                                <div className={cn("grid grid-cols-1 gap-2 overflow-auto pr-2 custom-scrollbar", isSidebar ? "max-h-[300px]" : "max-h-[400px]")}>
                                                    {orders.map((order) => (
                                                        <div key={order.id} className={cn("rounded-xl border border-slate-100 bg-white hover:border-emerald-200 transition-colors shadow-sm", isSidebar ? "p-2" : "p-3")}>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={cn("font-black text-slate-900", isSidebar ? "text-[9px]" : "text-[10px]")}>#{order.id}</span>
                                                                        {order.tableNumber && (
                                                                            <span className="bg-amber-100 text-amber-700 px-1 rounded text-[8px] font-black uppercase">M{order.tableNumber}</span>
                                                                        )}
                                                                        <span className={cn("font-bold text-slate-500 uppercase truncate block", isSidebar ? "text-[8px]" : "text-[10px]")}>{order.customerName}</span>
                                                                    </div>
                                                                    <p className={cn("font-bold text-slate-400 uppercase tracking-wider mt-0.5", isSidebar ? "text-[7px]" : "text-[8px]")}>
                                                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {paymentLabels[order.paymentMethod as any] || (order.paymentMethod ? order.paymentMethod : "Em Aberto")}
                                                                        {order.notes?.includes("[VENDA_DIRETA]") && (
                                                                            <span className="ml-1 text-emerald-600 font-black">[B]</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className={cn("font-black text-emerald-700", isSidebar ? "text-[10px]" : "text-[11px]")}>{formatCurrency(order.total)}</p>
                                                                    <p className={cn("font-bold text-slate-400 uppercase", isSidebar ? "text-[7px]" : "text-[8px]")}>{order.items.length} i</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {operationTab === "CASH_OPERATION" && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <select
                                                value={movementType}
                                                onChange={(e) => setMovementType(e.target.value as any)}
                                                className="h-12 rounded-2xl border border-slate-200 px-4 outline-none"
                                            >
                                                <option value="SUPPLY">Suprimento</option>
                                                <option value="WITHDRAWAL">Sangria</option>
                                                <option value="ADJUSTMENT">Ajuste</option>
                                            </select>
                                            <input
                                                value={movementAmount}
                                                onChange={(e) => setMovementAmount(formatMoneyInputRealtime(e.target.value))}
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="Valor"
                                                className="h-12 rounded-2xl border border-slate-200 px-4 outline-none"
                                            />
                                            <input
                                                value={movementReason}
                                                onChange={(e) => setMovementReason(e.target.value)}
                                                type="text"
                                                placeholder={requiresMovementReason ? "Motivo (obrigatorio)" : "Motivo"}
                                                className={`h-12 rounded-2xl border px-4 outline-none ${requiresMovementReason ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}
                                            />
                                        </div>
                                        <button
                                            disabled={submitting}
                                            onClick={handleCreateMovement}
                                            className="h-12 px-6 rounded-2xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em]"
                                        >
                                            Registrar Movimento
                                        </button>
                                        {requiresMovementReason && !movementReason.trim() && (
                                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
                                                Sangria e ajuste exigem justificativa.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {operationTab === "CASH_OPERATION" && (
                                <div className="mt-5 space-y-2 max-h-72 overflow-auto pr-2">
                                    {movements.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                            Sem movimentos nesta sessao.
                                        </div>
                                    )}
                                    {movements.map((movement) => (
                                        <div key={movement.id} className={cn("rounded-xl border border-slate-100 bg-slate-50", isSidebar ? "px-3 py-2" : "px-4 py-3")}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    {movement.type === "SUPPLY" && <PlusCircle size={isSidebar ? 12 : 16} className="text-emerald-600" />}
                                                    {movement.type === "WITHDRAWAL" && <MinusCircle size={isSidebar ? 12 : 16} className="text-rose-600" />}
                                                    {movement.type === "ADJUSTMENT" && <Scale size={isSidebar ? 12 : 16} className="text-blue-600" />}
                                                    <span className={cn("font-black uppercase tracking-[0.2em] text-slate-600", isSidebar ? "text-[8px]" : "text-[10px]")}>
                                                        {movementTypeLabel[movement.type]}
                                                    </span>
                                                </div>
                                                <span className={cn("font-bold text-slate-900", isSidebar ? "text-[10px]" : "text-[11px]")}>{formatCurrency(movement.amount)}</span>
                                            </div>
                                            <p className={cn("mt-1 font-bold uppercase tracking-[0.12em] text-slate-400 truncate", isSidebar ? "text-[7px]" : "text-[10px]")}>
                                                {movement.reason || "Sem motivo"} • {new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))}

                                    {orders.length > 0 && (
                                        <div className={cn("border-t border-slate-100", isSidebar ? "mt-3 pt-3" : "mt-4 pt-4")}>
                                            <h3 className={cn("font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2", isSidebar ? "text-[8px] mb-2" : "text-[10px] mb-3")}>
                                                <ShoppingCart size={isSidebar ? 12 : 14} /> Vendas Recentes
                                            </h3>
                                            <div className="space-y-1.5">
                                                {orders.slice(0, isSidebar ? 6 : 10).map((order) => (
                                                    <div key={order.id} className={cn("rounded-xl border border-slate-50 bg-white shadow-sm", isSidebar ? "px-3 py-2" : "px-4 py-3")}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className={cn("font-black text-slate-900 truncate", isSidebar ? "text-[9px]" : "text-[10px]")}>
                                                                    {order.customerName}
                                                                </span>
                                                                <span className={cn("font-bold text-slate-400 uppercase tracking-widest mt-0.5", isSidebar ? "text-[7px]" : "text-[8px]")}>
                                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {paymentLabels[order.paymentMethod as any] || order.paymentMethod}
                                                                </span>
                                                            </div>
                                                            <span className={cn("font-black text-emerald-700 shrink-0", isSidebar ? "text-[10px]" : "text-[11px]")}>{formatCurrency(order.total)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {orders.length > 10 && (
                                                    <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest pt-1">
                                                        + {orders.length - 10} outras vendas
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            {operationTab === "DIRECT_SALES"
                                ? "Abra uma sessao para registrar venda direta no balcao."
                                : "Abra uma sessao para registrar sangria e suprimento."}
                        </div>
                    )}
                </article>
            </section>

            {!isSidebar && (
                <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Archive size={16} className="text-primary" />
                        <h2 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Histórico de Sessões</h2>
                    </div>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="h-11 rounded-2xl border border-slate-200 px-3 outline-none"
                        >
                            <option value="ALL">Todos status</option>
                            <option value="OPEN">Abertos</option>
                            <option value="CLOSED">Fechados</option>
                        </select>
                        <select
                            value={filterOperatorId}
                            onChange={(e) => setFilterOperatorId(e.target.value)}
                            className="h-11 rounded-2xl border border-slate-200 px-3 outline-none"
                        >
                            <option value="ALL">Todos operadores</option>
                            {operators.map((op) => (
                                <option key={op.id} value={String(op.id)}>{op.name}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => {
                                setFilterPreset("ALL");
                                setFilterStartDate(e.target.value);
                            }}
                            className="h-11 rounded-2xl border border-slate-200 px-3 outline-none"
                        />
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => {
                                setFilterPreset("ALL");
                                setFilterEndDate(e.target.value);
                            }}
                            className="h-11 rounded-2xl border border-slate-200 px-3 outline-none"
                        />
                        <button
                            onClick={() => {
                                setFilterStatus("ALL");
                                setFilterOperatorId("ALL");
                                applyPreset("ALL");
                            }}
                            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
                        >
                            Limpar
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {[
                            { id: "TODAY", label: "Hoje" },
                            { id: "LAST_7", label: "7 dias" },
                            { id: "LAST_30", label: "30 dias" },
                        ].map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => applyPreset(preset.id as "TODAY" | "LAST_7" | "LAST_30")}
                                className={`h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.14em] ${filterPreset === preset.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 space-y-2">
                        {history.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Nenhuma sessao registrada ainda.
                            </div>
                        )}
                        {history.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Sessao #{item.id} • {item.status === "OPEN" ? "Aberta" : "Fechada"}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Abertura: {new Date(item.openedAt).toLocaleString()} {item.openedBy?.name ? `• ${item.openedBy.name}` : ""}</p>
                                    {printSummaryBySessionId[item.id] && (
                                        <>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Impresso {printSummaryBySessionId[item.id].printCount}x</p>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Ultima impressao: {printSummaryBySessionId[item.id].actor?.name || "Operador"} • {new Date(printSummaryBySessionId[item.id].lastPrintedAt).toLocaleString()}</p>
                                        </>
                                    )}
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <button
                                        onClick={() => requestPrintSessionReport(item.id)}
                                        className={`h-9 w-9 rounded-xl border flex items-center justify-center ${printSummaryBySessionId[item.id] ? "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"}`}
                                        title="Imprimir fechamento"
                                    >
                                        <Printer size={14} />
                                    </button>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Abertura</p>
                                        <p className="text-[11px] font-bold text-slate-900">{formatCurrency(item.openingAmount || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{historyTotal} sessoes</p>
                        <div className="flex gap-2">
                            <button
                                disabled={historyPage <= 1}
                                onClick={() => loadCashier(historyPage - 1)}
                                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={historyPage * historyLimit >= historyTotal}
                                onClick={() => loadCashier(historyPage + 1)}
                                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 disabled:opacity-50"
                            >
                                Proxima
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {!isSidebar && (
                <footer className="rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">Operação do caixa</p>
                            <p className="mt-2 text-sm sm:text-base font-bold text-slate-950 uppercase tracking-tight truncate">
                                {session ? `Sessão #${session.id} em andamento` : "Nenhuma sessão aberta no momento"}
                            </p>
                            <p className="mt-1 text-[11px] sm:text-label font-medium text-slate-400 uppercase tracking-[0.08em]">
                                Gestão de abertura, fechamento, vendas e conferência financeira em tempo real.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Modo</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{printModeLabel}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                    {session ? "Caixa ativo" : "Pronto para abrir"}
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Movimentos</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{movements.length}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sessões</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{historyTotal}</span>
                            </div>
                        </div>
                    </div>
                </footer>
            )}

            <PrintModeModal
                isOpen={Boolean(printSessionId)}
                targetLabel={printSessionId ? `o fechamento da sessao #${printSessionId}` : "o fechamento"}
                selectedMode={printMode}
                onSelectMode={setPrintMode}
                onClose={() => setPrintSessionId(null)}
                onConfirm={confirmPrintSessionReport}
            />

            <ConfirmActionModal
                isOpen={closeSessionConfirmOpen}
                title="Confirmar Fechamento"
                description={`Deseja realmente fechar o caixa com o valor informado? Esta acao encerra a sessao atual.${hasRelevantClosingDifference ? " A divergencia informada sera registrada com justificativa." : ""}`}
                confirmLabel="Fechar Caixa"
                cancelLabel="Cancelar"
                onConfirm={async () => {
                    setCloseSessionConfirmOpen(false);
                    await handleCloseSession();
                }}
                onClose={() => setCloseSessionConfirmOpen(false)}
            >
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        <span>Valor esperado</span>
                        <span className="text-slate-900">{formatCurrency(totals.expectedAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        <span>Valor informado</span>
                        <span className="text-slate-900">{formatCurrency(parseMoneyInput(closingAmount || 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                        <span className="text-slate-500">Divergência (Dinheiro)</span>
                        <span className={hasRelevantClosingDifference ? "text-rose-600" : hasAnyClosingDifference ? "text-amber-600" : "text-emerald-600"}>
                            {formatCurrency(closingDifference)}
                        </span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <span>Divergência (Cartão)</span>
                            <span className={Math.abs(parseMoneyInput(informedCardAmount || 0) - (totals.sales - totals.cashSales - (totals.salesByPayment?.find((p: any) => p.method === 'PIX')?.total || 0))) > 0 ? "text-amber-600" : "text-emerald-600"}>
                                {formatCurrency(parseMoneyInput(informedCardAmount || 0) - (totals.sales - totals.cashSales - (totals.salesByPayment?.find((p: any) => p.method === 'PIX')?.total || 0)))}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <span>Divergência (PIX)</span>
                            <span className={Math.abs(parseMoneyInput(informedPixAmount || 0) - (totals.salesByPayment?.find((p: any) => p.method === 'PIX')?.total || 0)) > 0 ? "text-amber-600" : "text-emerald-600"}>
                                {formatCurrency(parseMoneyInput(informedPixAmount || 0) - (totals.salesByPayment?.find((p: any) => p.method === 'PIX')?.total || 0))}
                            </span>
                        </div>
                    </div>

                    <div className="pt-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white border border-slate-200">
                            <div
                                className={`h-full rounded-full transition-all ${hasRelevantClosingDifference ? "bg-rose-500" : hasAnyClosingDifference ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.max(closingRiskRatio * 100, hasAnyClosingDifference ? 8 : 0)}%` }}
                            />
                        </div>
                        <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.08em] ${hasRelevantClosingDifference ? "text-rose-600" : hasAnyClosingDifference ? "text-amber-600" : "text-emerald-600"}`}>
                            {closingRiskLabel}
                        </p>
                    </div>
                </div>
            </ConfirmActionModal>

            {/* Modal informativo: pedidos anteriores incluídos automaticamente */}
            {preOpeningModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-5">

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShoppingCart size={22} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Caixa aberto</p>
                                <h3 className="mt-1 text-base font-black text-slate-950 uppercase tracking-tight">
                                    {preOpeningOrders.length} pedido{preOpeningOrders.length > 1 ? "s" : ""} anterior{preOpeningOrders.length > 1 ? "es" : ""} incluído{preOpeningOrders.length > 1 ? "s" : ""}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Os pedidos abaixo chegaram antes da abertura e foram incluídos automaticamente nesta sessão.
                                </p>
                            </div>
                        </div>

                        <div className="max-h-52 overflow-auto space-y-2 pr-1">
                            {preOpeningOrders.map((order) => (
                                <div key={order.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-black text-slate-950">#{order.id} — {order.customerName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                            {new Date(order.createdAt).toLocaleTimeString()} · {paymentLabels[order.paymentMethod] || order.paymentMethod}
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-700 shrink-0">{formatCurrency(order.total)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total incluído</span>
                            <span className="text-sm font-black text-slate-950">
                                {formatCurrency(preOpeningOrders.reduce((acc, o) => acc + o.total, 0))}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleDismissPreOpeningModal}
                            className="w-full h-11 rounded-2xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.16em] hover:bg-black transition-colors"
                        >
                            Entendido
                        </button>

                    </div>
                </div>
            )}

            {/* Modal de Pagamento Unificado */}
            {paymentModalOrder && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Receber Pedido</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Pedido #{paymentModalOrder.id} • {paymentModalOrder.tableNumber ? `Mesa ${paymentModalOrder.tableNumber}` : "Venda Balcão"}
                                </p>
                            </div>
                            <button 
                                onClick={() => setPaymentModalOrder(null)}
                                className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-950 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 pt-0 space-y-6">
                            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">Total a Pagar</span>
                                <span className="text-3xl font-black text-emerald-700">{formatCurrency(paymentModalOrder.total)}</span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione a Forma de Pagamento</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'CASH', label: 'Dinheiro', icon: Wallet },
                                        { id: 'PIX', label: 'PIX', icon: Receipt },
                                        { id: 'DEBIT', label: 'Débito', icon: CreditCard },
                                        { id: 'CREDIT', label: 'Crédito', icon: CreditCard }
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={async () => {
                                                const method = m.id;
                                                setSubmitting(true);
                                                try {
                                                    await handleUpdateOrderStatus(paymentModalOrder.id, "PAID", { paymentMethod: method });
                                                    toast.success("Pagamento registrado!");
                                                    setPaymentModalOrder(null);
                                                } finally {
                                                    setSubmitting(false);
                                                }
                                            }}
                                            className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50 rounded-3xl transition-all group active:scale-95"
                                        >
                                            <m.icon className="text-slate-400 group-hover:text-emerald-600 mb-2" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-emerald-700">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setPaymentModalOrder(null)}
                                className="w-full h-12 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
