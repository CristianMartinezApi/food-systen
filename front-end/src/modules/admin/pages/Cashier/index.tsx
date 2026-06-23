"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet, Receipt, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Loader2, Archive, PlusCircle, MinusCircle, Scale, Printer, ShoppingCart } from "lucide-react";
import { api } from "../../../../core/config/api";
import { formatCurrency, normalizeMoneyInput, parseMoneyInput, formatMoneyInputRealtime } from "../../../../shared/utils";
import toast from "react-hot-toast";
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
    total: number;
    paymentMethod: string;
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
};

type DirectSaleItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
};

type DirectSalePaymentMethod = "CASH" | "PIX" | "CARD" | "DEBIT" | "CREDIT";
type CashierOperationTab = "CASH_OPERATION" | "DIRECT_SALES";

const HOMOLOGATION_STEPS = [
    { id: "open", label: "Abrir sessao de caixa com valor inicial" },
    { id: "cashSale", label: "Registrar venda direta em dinheiro com troco" },
    { id: "pixCardSale", label: "Registrar venda direta em PIX ou cartao" },
    { id: "movement", label: "Registrar ao menos 1 movimento (sangria/suprimento/ajuste)" },
    { id: "close", label: "Fechar caixa com validacao de divergencia" },
];

export default function CashierPage() {
    const toDateInputValue = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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
    const [directSaleCashReceivedAmount, setDirectSaleCashReceivedAmount] = useState("");
    const [directSaleCustomerName, setDirectSaleCustomerName] = useState("Venda Balcao");
    const [directSaleNotes, setDirectSaleNotes] = useState("");
    const [directSaleProducts, setDirectSaleProducts] = useState<CashierProduct[]>([]);
    const [selectedDirectProductId, setSelectedDirectProductId] = useState("");
    const [selectedDirectProductQty, setSelectedDirectProductQty] = useState("1");
    const [directSaleItems, setDirectSaleItems] = useState<DirectSaleItem[]>([]);
    const [operationTab, setOperationTab] = useState<CashierOperationTab>("CASH_OPERATION");
    const [printMode, setPrintMode] = useState<PrintMode>("THERMAL");
    const [printSessionId, setPrintSessionId] = useState<number | null>(null);
    const [printSummaryBySessionId, setPrintSummaryBySessionId] = useState<Record<number, any>>({});
    const [closeSessionConfirmOpen, setCloseSessionConfirmOpen] = useState(false);
    const [differenceNoteThreshold, setDifferenceNoteThreshold] = useState(DEFAULT_CASH_DIFFERENCE_NOTE_THRESHOLD);
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
    const isDirectSaleCash = directSalePaymentMethod === "CASH";
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

            const [sessionData, sessionsHistory, operatorsData, settingsData, productsData] = await Promise.all([
                api.get("/cashier/session"),
                api.get(`/cashier/sessions?${query.toString()}`),
                api.get("/cashier/operators"),
                api.get("/settings"),
                api.get("/products"),
            ]);

            setSession(sessionData.session || null);
            setMovements(sessionData.movements || []);
            setOrders(sessionData.orders || []);
            setHistory(sessionsHistory.data || []);
            setHistoryTotal(Number(sessionsHistory.total || 0));
            setHistoryPage(Number(sessionsHistory.page || page));
            setOperators(Array.isArray(operatorsData) ? operatorsData : []);
            setDirectSaleProducts(
                (Array.isArray(productsData) ? productsData : [])
                    .filter((product: any) => product?.isActive !== false)
                    .map((product: any) => ({
                        id: Number(product.id),
                        name: String(product.name || "PRODUTO"),
                        price: Number(product.price || 0),
                        discountPercent: Number(product.discountPercent || 0),
                        isActive: Boolean(product.isActive ?? true),
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
            setTotals(
                sessionData.totals || {
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
                }
            );

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

    const handleOpenSession = async () => {
        const parsed = parseMoneyInput(openingAmount);
        if (Number.isNaN(parsed) || parsed <= 0) {
            toast.error("Informe um valor de abertura maior que zero");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/cashier/session/open", { openingAmount: parsed });
            toast.success("Caixa aberto com sucesso");
            setClosingAmount("");
            await loadCashier(historyPage);
        } catch (error: any) {
            toast.error(error.message || "Erro ao abrir caixa");
        } finally {
            setSubmitting(false);
        }
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

        setDirectSaleItems((prev) => {
            const existing = prev.find((item) => item.productId === productId);
            if (!existing) {
                return [...prev, { productId, name: product.name, price: unitPrice, quantity }];
            }

            return prev.map((item) => (
                item.productId === productId
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            ));
        });

        setSelectedDirectProductId("");
        setSelectedDirectProductQty("1");
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
        if (Number.isNaN(parsed) || parsed <= 0) {
            toast.error("Adicione produtos para registrar a venda direta");
            return;
        }

        if (directSaleItems.length === 0) {
            toast.error("Adicione ao menos um produto");
            return;
        }

        const cashReceivedParsed = directSalePaymentMethod === "CASH"
            ? parseMoneyInput(directSaleCashReceivedAmount)
            : null;

        if (directSalePaymentMethod === "CASH") {
            if (cashReceivedParsed === null || Number.isNaN(cashReceivedParsed) || cashReceivedParsed < parsed) {
                toast.error("Valor recebido deve ser maior ou igual ao valor da venda");
                return;
            }
        }

        try {
            setSubmitting(true);
            await api.post("/cashier/direct-sales", {
                paymentMethod: directSalePaymentMethod,
                items: directSaleItems.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
                cashReceivedAmount: cashReceivedParsed,
                customerName: directSaleCustomerName || "Venda Balcao",
                notes: directSaleNotes || null,
            });
            toast.success("Venda direta registrada");
            markHomologationSteps([directSalePaymentMethod === "CASH" ? "cashSale" : "pixCardSale"]);
            setDirectSaleCashReceivedAmount("");
            setDirectSaleNotes("");
            setDirectSaleItems([]);
            setSelectedDirectProductId("");
            setSelectedDirectProductQty("1");
            await loadCashier(historyPage);
        } catch (error: any) {
            toast.error(error.message || "Erro ao registrar venda direta");
        } finally {
            setSubmitting(false);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-heading-1 font-display font-bold text-slate-950 uppercase tracking-tight">
                        Caixa Operacional
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">Gerenciamento de sessões, vendas diretas e movimentações</p>
                </div>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-body font-bold uppercase tracking-[0.08em] border border-slate-200 bg-slate-100 text-slate-600">
                    Impressão: {printModeLabel}
                </span>
            </div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <article key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                            <card.icon size={16} className="text-primary" />
                        </div>
                        <p className="mt-2 text-lg font-display font-bold text-slate-950 uppercase tracking-tight">{card.value}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setOperationTab("CASH_OPERATION")}
                        className={`h-11 rounded-xl border text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${operationTab === "CASH_OPERATION" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                        Abertura e Fechamento
                    </button>
                    <button
                        type="button"
                        onClick={() => setOperationTab("DIRECT_SALES")}
                        className={`h-11 rounded-xl border text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${operationTab === "DIRECT_SALES" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                        Venda Direta no Balcao
                    </button>
                </div>
            </section>

            <section className={operationTab === "CASH_OPERATION" ? "grid gap-6 xl:grid-cols-3" : "grid gap-6"}>
                {operationTab === "CASH_OPERATION" && (
                    <article className="xl:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h2 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">Sessão Atual</h2>
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
                            <div className="mt-5 space-y-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Abertura</p>
                                    <p className="mt-1 text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">{formatCurrency(session.openingAmount)}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{new Date(session.openedAt).toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Faturamento</p>
                                        <p className="mt-1 text-sm font-bold text-emerald-700">{formatCurrency(totals.sales || 0)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Dinheiro (vendas)</p>
                                        <p className="mt-1 text-sm font-bold text-violet-700">{formatCurrency(totals.cashSales || 0)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Esperado em caixa</p>
                                        <p className="mt-1 text-sm font-bold text-blue-700">{formatCurrency(totals.expectedAmount || 0)}</p>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Checklist de fechamento</p>
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">1. Conferir valor esperado</span>
                                            <span className="text-emerald-600">OK</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">2. Informar valor em caixa</span>
                                            <span className={closingAmount ? "text-emerald-600" : "text-slate-400"}>{closingAmount ? "OK" : "Pendente"}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                                            <span className="text-slate-500">3. Justificar divergencia relevante</span>
                                            <span className={absoluteClosingDifference < differenceNoteThreshold || closingNotes.trim() ? "text-emerald-600" : "text-amber-600"}>
                                                {absoluteClosingDifference < differenceNoteThreshold || closingNotes.trim() ? "OK" : "Obrigatorio"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Cartão (Comprovantes)</span>
                                        <input
                                            value={informedCardAmount}
                                            onChange={(e) => setInformedCardAmount(formatMoneyInputRealtime(e.target.value))}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total PIX (Conferência Bancária)</span>
                                        <input
                                            value={informedPixAmount}
                                            onChange={(e) => setInformedPixAmount(formatMoneyInputRealtime(e.target.value))}
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dinheiro em Espécie no Cofre</span>
                                    <input
                                        value={closingAmount}
                                        onChange={(e) => setClosingAmount(formatMoneyInputRealtime(e.target.value))}
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0,00"
                                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none"
                                    />
                                </label>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Resumo de conferência (Sistema x Operador)</p>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${hasRelevantClosingDifference ? "text-rose-600" : hasAnyClosingDifference ? "text-amber-600" : "text-emerald-600"}`}>
                                            {closingRiskLabel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dinheiro</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[8px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(totals.expectedAmount || 0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(parseMoneyInput(closingAmount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cartão</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[8px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency((totals.cardSales || 0) + (totals.debitSales || 0) + (totals.creditSales || 0))}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(parseMoneyInput(informedCardAmount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">PIX</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <div>
                                                    <p className="text-[8px] uppercase text-slate-400">Sis</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(totals.pixSales || 0)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] uppercase text-slate-400">Inf</p>
                                                    <p className="text-[10px] font-black text-slate-900">{formatCurrency(parseMoneyInput(informedPixAmount) || 0)}</p>
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

                <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-heading-3 font-display font-bold text-slate-950 uppercase tracking-tight">
                        {operationTab === "DIRECT_SALES" ? "Venda Direta no Balcao" : "Movimentos & Sangria"}
                    </h2>
                    {session ? (
                        <>
                            <div className="mt-5 space-y-4">
                                {operationTab === "DIRECT_SALES" && (
                                    <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-5 space-y-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Venda Direta (Balcao)</p>
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${isDirectSaleCash ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-sky-200 bg-sky-100 text-sky-800"}`}>
                                                {isDirectSaleCash ? "Impacta caixa fisico" : "Impacta faturamento"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <input
                                                value={directSaleCustomerName}
                                                onChange={(e) => setDirectSaleCustomerName(e.target.value)}
                                                type="text"
                                                placeholder="Cliente (opcional)"
                                                className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none"
                                            />
                                            <select
                                                value={directSalePaymentMethod}
                                                onChange={(e) => setDirectSalePaymentMethod(e.target.value as DirectSalePaymentMethod)}
                                                className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none"
                                            >
                                                <option value="CASH">Dinheiro</option>
                                                <option value="PIX">PIX</option>
                                                <option value="DEBIT">Cartão de Débito</option>
                                                <option value="CREDIT">Cartão de Crédito</option>
                                                <option value="CARD">Cartão (Outros)</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <select
                                                value={selectedDirectProductId}
                                                onChange={(e) => setSelectedDirectProductId(e.target.value)}
                                                className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none sm:col-span-2"
                                            >
                                                <option value="">Selecionar produto da loja</option>
                                                {directSaleProducts.map((product) => {
                                                    const finalPrice = Number((product.price * (1 - ((product.discountPercent || 0) / 100))).toFixed(2));
                                                    return (
                                                        <option key={product.id} value={String(product.id)}>
                                                            {product.name} • {formatCurrency(finalPrice)}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div className="flex gap-2">
                                                <input
                                                    value={selectedDirectProductQty}
                                                    onChange={(e) => setSelectedDirectProductQty(e.target.value)}
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="Qtd"
                                                    className="h-11 w-full rounded-2xl border border-emerald-200 bg-white px-4 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddDirectSaleItem}
                                                    className="h-11 px-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.12em]"
                                                >
                                                    Add
                                                </button>
                                            </div>
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
                                                            {directSaleItems.map((item) => (
                                                                <tr key={item.productId} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                                                                    <td className="py-1.5 px-2 truncate text-[9px]">{item.name}</td>
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
                                                        className="h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none"
                                                    />
                                                    <div className="h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Troco</span>
                                                        <span className={`text-xs font-black ${directSaleChangeDue < 0 ? "text-rose-600" : "text-emerald-700"}`}>
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
                                                className={`h-11 rounded-2xl border border-emerald-200 bg-white px-4 outline-none ${isDirectSaleCash ? "sm:col-span-2" : "sm:col-span-2"}`}
                                            />
                                        </div>
                                        <button
                                            disabled={submitting}
                                            onClick={handleRegisterDirectSale}
                                            className={`h-11 px-5 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] ${isDirectSaleCash ? "bg-emerald-600" : "bg-sky-600"}`}
                                        >
                                            {isDirectSaleCash ? "Registrar Venda em Dinheiro" : "Registrar Venda Direta"}
                                        </button>

                                        <div className="mt-6 space-y-3 pt-6 border-t border-emerald-50">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                                    <ShoppingCart size={14} /> Vendas da Sessão
                                                </h3>
                                                <span className="text-[10px] font-bold text-slate-400">Total: {orders.length}</span>
                                            </div>

                                            {orders.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/30 px-4 py-6 text-center">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600/60">Nenhuma venda registrada nesta sessão ainda.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                                                    {orders.map((order) => (
                                                        <div key={order.id} className="rounded-2xl border border-slate-100 bg-white p-3 hover:border-emerald-200 transition-colors shadow-sm">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-black text-slate-900">#{order.id}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{order.customerName}</span>
                                                                    </div>
                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                                        {new Date(order.createdAt).toLocaleTimeString()} • {paymentLabels[order.paymentMethod as any] || order.paymentMethod}
                                                                        {order.notes?.includes("[VENDA_DIRETA]") && (
                                                                            <span className="ml-2 text-emerald-600 font-black">[BALCÃO]</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[11px] font-black text-emerald-700">{formatCurrency(order.total)}</p>
                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">{order.items.length} itens</p>
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
                                        <div key={movement.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    {movement.type === "SUPPLY" && <PlusCircle size={16} className="text-emerald-600" />}
                                                    {movement.type === "WITHDRAWAL" && <MinusCircle size={16} className="text-rose-600" />}
                                                    {movement.type === "ADJUSTMENT" && <Scale size={16} className="text-blue-600" />}
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                                        {movementTypeLabel[movement.type]}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-900">{formatCurrency(movement.amount)}</span>
                                            </div>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                                {movement.reason || "Sem motivo"} • {new Date(movement.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}

                                    {orders.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                                                <ShoppingCart size={14} /> Vendas Recentes
                                            </h3>
                                            <div className="space-y-2">
                                                {orders.slice(0, 10).map((order) => (
                                                    <div key={order.id} className="rounded-2xl border border-slate-50 bg-white px-4 py-3 shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-900">
                                                                    {order.customerName}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {new Date(order.createdAt).toLocaleTimeString()} • {paymentLabels[order.paymentMethod as any] || order.paymentMethod}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-black text-emerald-700">{formatCurrency(order.total)}</span>
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
        </div >
    );
}
