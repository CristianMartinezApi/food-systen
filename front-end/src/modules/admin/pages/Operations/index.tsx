"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Wallet,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import OrdersPage from "../Orders";
import CashierPage from "../Cashier";
import { api } from "../../../../core/config/api";
import { formatCurrency } from "../../../../shared/utils";

type MobileTab = "ORDERS" | "CASHIER";

interface SessionSummary {
  id: number;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  openedAt: string;
  openedBy?: { name: string } | null;
  totals?: {
    sales: number;
    expectedAmount: number;
    cashSales: number;
  };
}

export default function OperationsPage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("ORDERS");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSession = useCallback(async () => {
    try {
      setSessionLoading(true);
      const data = await api.get("/cashier/session");
      if (data?.session) {
        setSessionSummary({
          ...data.session,
          totals: data.totals,
        });
      } else {
        setSessionSummary(null);
      }
    } catch {
      setSessionSummary(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const isOpen = sessionSummary?.status === "OPEN";

  return (
    <div className="space-y-4">
      {/* ── HEADER FIXO DE SESSÃO ── */}
      <header className="sticky top-0 z-30 rounded-2xl border border-slate-100 bg-white shadow-sm px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOpen ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-slate-300"}`} />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                Operação do Dia
              </p>
              <p className="text-sm font-black text-slate-950 uppercase tracking-tight truncate">
                {sessionLoading
                  ? "Carregando..."
                  : isOpen
                  ? `Sessão #${sessionSummary!.id} aberta · ${sessionSummary?.openedBy?.name || "Operador"}`
                  : "Nenhuma sessão aberta"}
              </p>
            </div>
          </div>

          {isOpen && sessionSummary?.totals && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                <TrendingUp size={12} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.12em]">
                  {formatCurrency(sessionSummary.totals.sales)}
                </span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5">
                <DollarSign size={12} className="text-violet-600" />
                <span className="text-[10px] font-black text-violet-700 uppercase tracking-[0.12em]">
                  Esp. {formatCurrency(sessionSummary.totals.expectedAmount)}
                </span>
              </div>
              <div className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                <Clock size={12} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.12em]">
                  {new Date(sessionSummary.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="h-8 w-8 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* ── BANNER: CAIXA FECHADO ── */}
      {!sessionLoading && !isOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800 uppercase tracking-tight">
              Caixa não iniciado
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Abra o caixa na aba <strong>Caixa e Balcão</strong> para habilitar o registro de vendas e movimentos.
              Pedidos online continuam sendo recebidos e ficam na fila.
            </p>
          </div>
        </div>
      )}

      {/* ── LAYOUT DESKTOP: COLUNAS ── */}
      <div className="hidden lg:grid lg:grid-cols-[65%_35%] gap-4">
        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 pt-5 pb-3 border-b border-slate-50">
            <ShoppingBag size={16} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
              Pedidos Online
            </h2>
          </div>
          <div className="p-2">
            <OrdersPage key={`orders-${refreshKey}`} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 pt-5 pb-3 border-b border-slate-50">
            <Wallet size={16} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
              Caixa e Balcão
            </h2>
          </div>
          <div className="p-2">
            <CashierPage key={`cashier-${refreshKey}`} />
          </div>
        </section>
      </div>

      {/* ── LAYOUT MOBILE/TABLET: ABAS ── */}
      <div className="lg:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileTab("ORDERS")}
            className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "ORDERS"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <ShoppingBag size={14} /> Pedidos
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("CASHIER")}
            className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "CASHIER"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Wallet size={14} /> Caixa
          </button>
        </div>

        {mobileTab === "ORDERS" && (
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-2">
            <OrdersPage key={`orders-mobile-${refreshKey}`} />
          </section>
        )}
        {mobileTab === "CASHIER" && (
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm p-2">
            <CashierPage key={`cashier-mobile-${refreshKey}`} />
          </section>
        )}
      </div>
    </div>
  );
}
