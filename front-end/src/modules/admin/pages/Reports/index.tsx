"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Download, Loader2, Printer, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../../core/config/api";
import { formatCurrency, cn } from "../../../../shared/utils";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  OPEN: "Em aberto",
  NOT_INFORMED: "Não informado",
};

const movementLabels: Record<string, string> = {
  SUPPLY: "Suprimentos",
  WITHDRAWAL: "Sangrias",
  ADJUSTMENT: "Ajustes",
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ReportsPage() {
  const [date, setDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return toDateInput(yesterday);
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    try {
      setLoading(true);
      setReport(await api.get(`/reports/daily?date=${date}`));
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível gerar o relatório.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [date]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Relatório diário", report.date],
      ["Loja", report.restaurant?.name || ""],
      [],
      ["Indicador", "Valor"],
      ["Faturamento", report.summary.grossSales],
      ["Pedidos", report.summary.orderCount],
      ["Ticket médio", report.summary.averageTicket],
      ["Cancelamentos", report.summary.cancelledCount],
      ["Valor cancelado", report.summary.cancelledTotal],
      ["Diferença de caixa", report.summary.cashDifference],
      [],
      ["Forma de pagamento", "Pedidos", "Total"],
      ...report.salesByPayment.map((entry: any) => [paymentLabels[entry.method] || entry.method, entry.orders, entry.total]),
      [],
      ["Movimento", "Quantidade", "Total"],
      ...report.movements.map((entry: any) => [movementLabels[entry.type] || entry.type, entry.count, entry.total]),
    ];
    const csv = rows.map((row: any[]) => row.map((value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-diario-${report.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!report) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    const payments = report.salesByPayment.map((entry: any) =>
      `<tr><td>${paymentLabels[entry.method] || entry.method}</td><td>${entry.orders}</td><td>${formatCurrency(entry.total)}</td></tr>`
    ).join("");
    printWindow.document.write(`
      <html><head><title>Relatório ${report.date}</title>
      <style>body{font-family:Arial;padding:32px;color:#0f172a}h1{margin:0}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #cbd5e1;text-align:left}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}.card{border:1px solid #cbd5e1;padding:14px}.value{font-size:20px;font-weight:700;margin-top:6px}@media print{body{padding:0}}</style>
      </head><body>
      <h1>${report.restaurant?.name || "Loja"}</h1><small>Relatório diário de ${new Date(`${report.date}T12:00:00`).toLocaleDateString("pt-BR")}</small>
      <div class="grid">
        <div class="card">Faturamento<div class="value">${formatCurrency(report.summary.grossSales)}</div></div>
        <div class="card">Pedidos<div class="value">${report.summary.orderCount}</div></div>
        <div class="card">Ticket médio<div class="value">${formatCurrency(report.summary.averageTicket)}</div></div>
        <div class="card">Cancelamentos<div class="value">${report.summary.cancelledCount}</div></div>
        <div class="card">Sessões fechadas<div class="value">${report.summary.closedSessionCount}</div></div>
        <div class="card">Diferença de caixa<div class="value">${formatCurrency(report.summary.cashDifference)}</div></div>
      </div>
      <table><thead><tr><th>Pagamento</th><th>Pedidos</th><th>Total</th></tr></thead><tbody>${payments}</tbody></table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const summaryCards = report ? [
    ["Faturamento", formatCurrency(report.summary.grossSales)],
    ["Pedidos válidos", String(report.summary.orderCount)],
    ["Ticket médio", formatCurrency(report.summary.averageTicket)],
    ["Cancelamentos", `${report.summary.cancelledCount} · ${formatCurrency(report.summary.cancelledTotal)}`],
    ["Sessões fechadas", `${report.summary.closedSessionCount}/${report.summary.sessionCount}`],
    ["Diferença de caixa", formatCurrency(report.summary.cashDifference)],
  ] : [];

  return (
    <div className="ops-workspace space-y-3">
      <AdminPageHeader
        eyebrow="Gestão financeira"
        title="Relatórios"
        description="Consolidado diário de vendas, pagamentos, caixa e movimentações."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} disabled={!report} className="ops-button border border-slate-300 bg-white text-slate-700 disabled:opacity-40"><Download size={15} /> CSV</button>
            <button onClick={printReport} disabled={!report} className="ops-button bg-slate-900 text-white disabled:opacity-40"><Printer size={15} /> Imprimir</button>
          </div>
        }
      />

      <section className="ops-panel p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Data do relatório</span>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="date" value={date} max={toDateInput(new Date())} onChange={(event) => setDate(event.target.value)} className="ops-field pl-10" />
            </div>
          </label>
          <button onClick={loadReport} disabled={loading} className="ops-button border border-slate-300 bg-white text-slate-700"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Atualizar</button>
        </div>
      </section>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
      ) : report ? (
        <>
          <section className="grid overflow-hidden rounded-md border border-slate-300 bg-white sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map(([label, value], index) => (
              <div key={label} className="border-b border-r border-slate-200 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={cn(
                  "mt-1 text-lg font-semibold tabular-nums",
                  index === 5 && report.summary.cashDifference < 0
                    ? "text-rose-700"
                    : index === 5 && report.summary.cashDifference > 0
                      ? "text-amber-700"
                      : "text-slate-950"
                )}>{value}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="ops-panel">
              <div className="ops-panel-header"><h2 className="text-sm font-semibold">Vendas por pagamento</h2></div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2 text-left">Forma</th><th>Pedidos</th><th className="px-4 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{report.salesByPayment.map((entry: any) => <tr key={entry.method}><td className="px-4 py-3 font-medium">{paymentLabels[entry.method] || entry.method}</td><td className="text-center">{entry.orders}</td><td className="px-4 text-right font-semibold">{formatCurrency(entry.total)}</td></tr>)}</tbody>
              </table>
            </section>

            <section className="ops-panel">
              <div className="ops-panel-header"><h2 className="text-sm font-semibold">Movimentações do caixa</h2></div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2 text-left">Tipo</th><th>Registros</th><th className="px-4 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{report.movements.map((entry: any) => <tr key={entry.type}><td className="px-4 py-3 font-medium">{movementLabels[entry.type] || entry.type}</td><td className="text-center">{entry.count}</td><td className="px-4 text-right font-semibold">{formatCurrency(entry.total)}</td></tr>)}</tbody>
              </table>
            </section>
          </div>

          <section className="ops-panel">
            <div className="ops-panel-header"><h2 className="text-sm font-semibold">Sessões de caixa relacionadas ao dia</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2 text-left">Sessão</th><th>Operador</th><th>Abertura</th><th>Fechamento</th><th className="px-4 text-right">Diferença</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{report.sessions.map((session: any) => <tr key={session.id}><td className="px-4 py-3 font-mono">#{session.id}</td><td className="text-center">{session.openedBy?.name || "—"}</td><td className="text-center">{new Date(session.openedAt).toLocaleString("pt-BR")}</td><td className="text-center">{session.closedAt ? new Date(session.closedAt).toLocaleString("pt-BR") : "Em aberto"}</td><td className={cn("px-4 text-right font-semibold", session.status === "CLOSED" && session.differenceAmount < 0 ? "text-rose-700" : session.status === "CLOSED" && session.differenceAmount > 0 ? "text-amber-700" : "")}>{session.status === "CLOSED" ? formatCurrency(session.differenceAmount || 0) : "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
