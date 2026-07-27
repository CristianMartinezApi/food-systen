"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../../../core/config/api";
import { formatCurrency, cn } from "../../../../shared/utils";
import { LayoutDashboard, Clock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";

export default function TablesPage() {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchTables = async () => {
        try {
            const data = await api.get("/tables");
            setTables(data);
        } catch (error) {
            console.error("Erro ao carregar mesas:", error);
            toast.error("Erro ao carregar mesas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
        const interval = setInterval(fetchTables, 10000); // 10s
        return () => clearInterval(interval);
    }, []);

    const occupiedCount = tables.filter(t => t.isOccupied).length;

    return (
        <div className="ops-workspace space-y-3">
            <AdminPageHeader
                eyebrow="Atendimento"
                title="Gestão de mesas"
                description="Acompanhe a ocupação e acesse rapidamente as contas em atendimento."
                status={
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        {occupiedCount} de {tables.length} ocupadas
                    </span>
                }
            />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {tables.map((table) => {
                    const order = table.isOccupied ? table.orders[0] : null;
                    
                    return (
                        <button
                            key={table.tableNumber}
                            onClick={() => {
                                // Redirecionar para o PDV com a mesa selecionada
                                router.push(`/admin/caixa?table=${table.tableNumber}`);
                            }}
                            className={cn(
                                "group relative flex h-32 flex-col overflow-hidden rounded-md border p-3 text-left transition-colors",
                                table.isOccupied 
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-white border-slate-300 hover:border-emerald-400"
                            )}
                        >
                            <div className="flex justify-between items-start mb-auto">
                                <span className={cn(
                                    "text-xl font-semibold tracking-tight",
                                    table.isOccupied ? "text-amber-900" : "text-slate-900"
                                )}>
                                    #{String(table.tableNumber).padStart(2, '0')}
                                </span>
                                {table.isOccupied && (
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                )}
                            </div>

                            {table.isOccupied ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-amber-700 truncate">
                                        {order.customerName || "Cliente"}
                                    </p>
                                    <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                        <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <div className="pt-2 border-t border-amber-200 mt-2">
                                        <p className="font-black text-amber-900 text-sm">
                                            {formatCurrency(order.total)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-auto">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 transition-colors">
                                        LIVRE
                                    </p>
                                    <div className="flex items-center gap-1 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                        <span className="text-[8px] font-black uppercase">Abrir conta</span>
                                        <ArrowRight size={10} />
                                    </div>
                                </div>
                            )}

                        </button>
                    );
                })}
            </div>
            
            {tables.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
                    <LayoutDashboard size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold uppercase text-xs">Nenhuma mesa configurada</p>
                    <button 
                        onClick={() => router.push("/admin/settings")}
                        className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                        Configurar agora
                    </button>
                </div>
            )}
        </div>
    );
}
