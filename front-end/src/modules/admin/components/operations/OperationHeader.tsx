"use client";

import { ShoppingBag, TrendingUp, DollarSign, Clock, RefreshCw, Volume2, VolumeX, Printer } from "lucide-react";
import { formatCurrency } from "../../../../shared/utils";

interface OperationHeaderProps {
  isOpen: boolean;
  sessionSummary: any;
  sessionLoading: boolean;
  onRefresh: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeOrderCount: number;
}

export function OperationHeader({
  isOpen,
  sessionSummary,
  sessionLoading,
  onRefresh,
  isMuted,
  onToggleMute,
  activeOrderCount
}: OperationHeaderProps) {
  return (
    <header className="sticky top-0 z-30 rounded-2xl border border-slate-100 bg-white/80 backdrop-blur-md shadow-sm px-4 py-2 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOpen ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"}`} />
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Status da Operação</p>
              <p className="text-xs font-black text-slate-950 uppercase mt-0.5">
                {sessionLoading ? "Sincronizando..." : isOpen ? "Caixa em Aberto" : "Caixa Fechado"}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 hidden md:block" />

          {isOpen && sessionSummary?.totals && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Vendas</span>
                <span className="text-xs font-black text-emerald-600">{formatCurrency(sessionSummary.totals.sales)}</span>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Esperado</span>
                <span className="text-xs font-black text-slate-950">{formatCurrency(sessionSummary.totals.expectedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeOrderCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 animate-bounce">
              <ShoppingBag size={12} className="text-rose-600" />
              <span className="text-[10px] font-black text-rose-700 uppercase">{activeOrderCount} Novos</span>
            </div>
          )}

          <button
            onClick={onToggleMute}
            className={`h-9 px-3 rounded-xl border transition-all flex items-center gap-2 ${
              isMuted
                ? "bg-rose-50 border-rose-100 text-rose-600"
                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
            }`}
            title={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="text-[9px] font-black uppercase hidden lg:block">Alertas</span>
          </button>

          <button
            onClick={onRefresh}
            className="h-9 w-9 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0"
            title="Atualizar painel"
          >
            <RefreshCw size={14} className={sessionLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </header>
  );
}
