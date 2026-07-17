"use client";

import { useState, useEffect } from "react";
import { api } from "../../../core/config/api";
import { Zap, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "../../../shared/utils";
import toast from "react-hot-toast";

interface PixStatus {
    pixEnabled: boolean;
    pixKey: string | null;
}

export default function PixSettings() {
    const [status, setStatus] = useState<PixStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPixApiAvailable, setIsPixApiAvailable] = useState(true);
    const [showStatusPixKey, setShowStatusPixKey] = useState(false);
    const [showInputPixKey, setShowInputPixKey] = useState(true);

    const [form, setForm] = useState({
        pixKey: "",
        pixEnabled: false,
    });
    const [initialForm, setInitialForm] = useState({
        pixKey: "",
        pixEnabled: false,
    });

    const normalizePixKey = (value: string) => value.trim();

    const maskPixKey = (value?: string | null) => {
        const source = String(value || "").trim();
        if (!source) return "";
        if (source.length <= 6) return "*".repeat(source.length);
        return `${source.slice(0, 3)}${"*".repeat(Math.max(4, source.length - 6))}${source.slice(-3)}`;
    };

    useEffect(() => {
        api
            .get("/pix/settings")
            .then((res) => {
                setStatus(res);
                setForm({
                    pixKey: "",
                    pixEnabled: res.pixEnabled || false,
                });
                setInitialForm({
                    pixKey: "",
                    pixEnabled: res.pixEnabled || false,
                });
                setIsPixApiAvailable(true);
            })
            .catch((err: any) => {
                const message = String(err?.message || "").toLowerCase();
                const endpointMissing = message.includes("404") || message.includes("not found") || message.includes("não encontrado");

                if (endpointMissing) {
                    setIsPixApiAvailable(false);
                    setStatus({ pixEnabled: false, pixKey: null });
                    setForm({ pixKey: "", pixEnabled: false });
                    setInitialForm({ pixKey: "", pixEnabled: false });
                    return;
                }

                toast.error("Erro ao carregar status PIX");
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        if (!isPixApiAvailable) {
            toast.error("PIX ainda não está disponível neste ambiente");
            return;
        }

        if (form.pixEnabled && !form.pixKey.trim()) {
            toast.error("Informe sua chave PIX quando ativado");
            return;
        }

        setIsSaving(true);
        try {
            await api.put("/pix/settings", {
                pixKey: form.pixKey.trim(),
                pixEnabled: form.pixEnabled,
            });
            const next = {
                pixKey: form.pixKey.trim(),
                pixEnabled: form.pixEnabled,
            };
            setStatus({
                pixEnabled: next.pixEnabled,
                pixKey: next.pixKey,
            });
            setInitialForm(next);
            toast.success("Configurações PIX salvas com sucesso!");
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-300" size={32} />
            </section>
        );
    }

    const isConfigured = status?.pixEnabled && status?.pixKey;
    const isDirty = normalizePixKey(form.pixKey) !== normalizePixKey(initialForm.pixKey) || form.pixEnabled !== initialForm.pixEnabled;

    return (
        <section className="settings-panel settings-panel--pix bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Zap size={22} className="text-emerald-500" fill="currentColor" />
                </div>
                <div>
                    <h3 className="font-display font-bold text-slate-950 text-lg uppercase tracking-tight">
                        Pagamento PIX
                    </h3>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">
                        Receba pagamentos com PIX de seus clientes
                    </p>
                </div>
                <div className="ml-auto">
                    {isConfigured ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                            <CheckCircle2 size={13} /> Ativo
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                            <AlertCircle size={13} /> Desativado
                        </span>
                    )}
                </div>
            </div>

            {/* Status atual */}
            {isConfigured && (
                <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm text-emerald-700">
                    <p>
                        <span className="font-bold">Chave PIX ativa:</span> {showStatusPixKey ? status?.pixKey : maskPixKey(status?.pixKey)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                        Clientes podem pagar seus pedidos escaneando um QR Code gerado automaticamente.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowStatusPixKey((prev) => !prev)}
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700"
                    >
                        {showStatusPixKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        {showStatusPixKey ? "Ocultar chave" : "Mostrar chave"}
                    </button>
                </div>
            )}

            {/* Aviso de segurança */}
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    {isPixApiAvailable ? (
                        <>
                            <strong>Como funciona:</strong> Quando um cliente escolher PIX para pagar, um QR Code será gerado
                            automaticamente com sua chave PIX. O cliente escaneia e paga direto para você, como no iFood.
                        </>
                    ) : (
                        <>
                            <strong>PIX ainda não disponível:</strong> O endpoint de PIX não está ativo neste ambiente.
                            Você pode seguir operando normalmente com os demais meios de pagamento.
                        </>
                    )}
                </p>
            </div>

            {/* Formulário */}
            <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        <strong>Dica:</strong> confira a chave antes de salvar. As alteracoes ficam pendentes ate clicar em salvar.
                    </p>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => setForm({ ...initialForm })}
                            className="h-11 rounded-xl px-4 text-xs font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                        >
                            Descartar alteracoes
                        </button>
                    )}
                </div>

                {/* Toggle PIX */}
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 border border-slate-100">
                    <div>
                        <p className="text-sm font-bold text-slate-900">Ativar PIX</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Permite que clientes paguem com PIX
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, pixEnabled: !f.pixEnabled }))}
                        className={cn(
                            "w-12 h-6 rounded-full transition-all duration-300 relative shrink-0",
                            form.pixEnabled ? "bg-emerald-500" : "bg-slate-200"
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
                                form.pixEnabled ? "left-6" : "left-0.5"
                            )}
                        />
                    </button>
                </div>

                {/* Chave PIX */}
                {form.pixEnabled && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Sua Chave PIX *
                        </label>
                        <div className="relative">
                            <input
                                type={showInputPixKey ? "text" : "password"}
                                value={form.pixKey}
                                onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))}
                                placeholder="CPF, CNPJ, e-mail, celular ou chave aleatoria"
                                className="w-full h-12 pl-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowInputPixKey((prev) => !prev)}
                                className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 hover:text-slate-700"
                                aria-label={showInputPixKey ? "Ocultar chave PIX" : "Mostrar chave PIX"}
                                title={showInputPixKey ? "Ocultar chave" : "Mostrar chave"}
                            >
                                {showInputPixKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">
                            Informe uma das suas chaves PIX. Pagamentos serão recebidos nesta chave.
                        </p>
                    </div>
                )}

                {/* Salvar */}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !isPixApiAvailable || !isDirty}
                    className="w-full h-12 bg-slate-950 text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Zap size={18} />
                    )}
                    {isSaving ? "Salvando..." : "Salvar Configurações PIX"}
                </button>
            </div>
        </section>
    );
}
