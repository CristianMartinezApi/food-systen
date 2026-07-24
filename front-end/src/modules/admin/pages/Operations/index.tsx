"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Wallet,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import OrdersPage from "../Orders";
import CashierPage from "../Cashier";
import { api } from "../../../../core/config/api";
import { OperationHeader } from "../../components/operations/OperationHeader";

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
  const [isMuted, setIsMuted] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState(0);

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
    <div className="min-h-screen bg-slate-100/60 p-3 sm:p-4">
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <OperationHeader
        isOpen={isOpen}
        sessionSummary={sessionSummary}
        sessionLoading={sessionLoading}
        onRefresh={handleRefresh}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        activeOrderCount={activeOrderCount}
      />

      {/* ── BANNER: CAIXA FECHADO ── */}
      {!sessionLoading && !isOpen && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-800 uppercase tracking-tight leading-tight">
                Sessão de Caixa Fechada
              </p>
              <p className="text-xs text-amber-700 mt-1 opacity-80">
                Abra uma sessão para registrar vendas diretas. Pedidos online continuam chegando normalmente.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileTab("CASHIER")}
            className="hidden sm:block h-9 px-4 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 transition-colors shrink-0"
          >
            Abrir Agora
          </button>
        </div>
      )}

      {/* ── LAYOUT DESKTOP: COMANDO CENTRAL ── */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
        <main className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-900 shadow-[0_0_0_4px_rgba(15,23,42,0.06)]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                Expedição de Pedidos
              </h2>
            </div>
          </div>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 min-h-[700px]">
              <OrdersPage
                key={`orders-${refreshKey}`}
                isCompact={true}
                onOrdersChange={(orders) => {
                  const pending = orders.filter(o => ["PENDING", "CONFIRMED"].includes(o.status)).length;
                  setActiveOrderCount(pending);
                }}
              />
            </div>
          </section>
        </main>

        <aside className="space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-900 shadow-[0_0_0_4px_rgba(15,23,42,0.06)]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
                Painel de Caixa
              </h2>
            </div>
          </div>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
              <CashierPage
                key={`cashier-${refreshKey}`}
                isSidebar
                onOrderCreated={handleRefresh}
                onTotalsChange={(t) => {
                  setSessionSummary((prev) => 
                     ({
                        ...(prev || { id: 0, status: 'CLOSED', openingAmount: 0, openedAt: new Date().toISOString() }),
                        status: t.expectedAmount > 0 ? "OPEN" : (prev?.status || 'CLOSED'),
                        totals: {
                            expectedAmount: t.expectedAmount || 0,
                            sales: t.sales || 0,
                            cashSales: t.cashSales || 0,
                            movementsCount: t.movementsCount || 0
                        }
                    })
                  );
                }}
              />
            </div>
          </section>
        </aside>
      </div>

      {/* ── LAYOUT MOBILE/TABLET: ABAS ── */}
      <div className="lg:hidden space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileTab("ORDERS")}
            className={`h-10 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
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
            className={`h-10 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
              mobileTab === "CASHIER"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Wallet size={14} /> Caixa
          </button>
        </div>

        {mobileTab === "ORDERS" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-2">
            <OrdersPage key={`orders-mobile-${refreshKey}`} />
          </section>
        )}
        {mobileTab === "CASHIER" && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-2">
            <CashierPage key={`cashier-mobile-${refreshKey}`} />
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
