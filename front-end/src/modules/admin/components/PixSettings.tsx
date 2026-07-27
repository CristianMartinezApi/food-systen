"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Pencil, Power, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../core/config/api";
import { cn } from "../../../shared/utils";

type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

interface PixStatus {
    pixEnabled: boolean;
    pixKey: string | null;
    pixKeyType: PixKeyType | null;
}

const PIX_TYPES: Array<{ value: PixKeyType; label: string }> = [
    { value: "cpf", label: "CPF" },
    { value: "cnpj", label: "CNPJ" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Celular" },
    { value: "random", label: "Chave aleatória" },
];

const maskPixKey = (value?: string | null) => {
    const source = String(value || "").trim();
    if (!source) return "";
    if (source.length <= 6) return "*".repeat(source.length);
    return `${source.slice(0, 3)}${"*".repeat(Math.max(4, source.length - 6))}${source.slice(-3)}`;
};

export default function PixSettings() {
    const [status, setStatus] = useState<PixStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showStatusPixKey, setShowStatusPixKey] = useState(false);
    const [showInputPixKey, setShowInputPixKey] = useState(false);
    const [pixKey, setPixKey] = useState("");
    const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");

    const loadStatus = async () => {
        const response = await api.get("/pix/settings") as PixStatus;
        setStatus(response);
        setPixKeyType(response.pixKeyType || "cpf");
        setPixKey("");
        setIsEditing(!response.pixKey);
    };

    useEffect(() => {
        loadStatus()
            .catch(() => toast.error("Erro ao carregar a configuração PIX"))
            .finally(() => setIsLoading(false));
    }, []);

    const saveKey = async () => {
        const normalizedKey = pixKey.trim();
        if (!normalizedKey) {
            toast.error("Informe a nova chave PIX");
            return;
        }
        if (status?.pixKey && !window.confirm("Confirma a substituição da chave PIX atual? Novos pagamentos usarão a nova chave.")) {
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.put("/pix/settings", {
                pixKey: normalizedKey,
                pixKeyType,
                pixEnabled: status?.pixKey ? status.pixEnabled : true,
            }) as PixStatus;
            setStatus(response);
            setPixKey("");
            setIsEditing(false);
            setShowInputPixKey(false);
            toast.success(status?.pixKey ? "Chave PIX alterada com sucesso" : "Chave PIX cadastrada com sucesso");
        } catch (error: any) {
            toast.error(error?.message || "Erro ao salvar a chave PIX");
        } finally {
            setIsSaving(false);
        }
    };

    const togglePix = async () => {
        if (!status?.pixKey) {
            setIsEditing(true);
            toast.error("Cadastre uma chave antes de ativar o PIX");
            return;
        }

        const nextEnabled = !status.pixEnabled;
        setIsSaving(true);
        try {
            await api.patch("/pix/settings/status", { pixEnabled: nextEnabled });
            setStatus((current) => current ? { ...current, pixEnabled: nextEnabled } : current);
            toast.success(nextEnabled ? "Recebimento por PIX ativado" : "PIX desativado; sua chave foi preservada");
        } catch (error: any) {
            toast.error(error?.message || "Erro ao alterar o status do PIX");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteKey = async () => {
        if (!window.confirm("Excluir definitivamente a chave PIX? O recebimento por PIX será desativado. Esta ação não pode ser desfeita.")) {
            return;
        }

        setIsDeleting(true);
        try {
            await api.delete("/pix/settings/key");
            setStatus({ pixEnabled: false, pixKey: null, pixKeyType: null });
            setPixKey("");
            setPixKeyType("cpf");
            setIsEditing(true);
            setShowStatusPixKey(false);
            toast.success("Chave PIX excluída");
        } catch (error: any) {
            toast.error(error?.message || "Erro ao excluir a chave PIX");
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <section className="settings-panel bg-white border border-slate-200 p-8 shadow-sm flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={28} />
            </section>
        );
    }

    const isConfigured = Boolean(status?.pixKey);
    const isBusy = isSaving || isDeleting;

    return (
        <section className="settings-panel settings-panel--pix bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 mb-7">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Zap size={21} className="text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-display font-bold text-slate-950 text-lg">Pagamento PIX</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Configure onde os pagamentos da loja serão recebidos.</p>
                </div>
                <span className={cn(
                    "ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider",
                    status?.pixEnabled
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-slate-600 bg-slate-50 border-slate-200"
                )}>
                    {status?.pixEnabled ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {status?.pixEnabled ? "Ativo" : "Desativado"}
                </span>
            </div>

            {isConfigured && (
                <div className="mb-5 border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Chave cadastrada</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 break-all">
                                {showStatusPixKey ? status?.pixKey : maskPixKey(status?.pixKey)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Tipo: {PIX_TYPES.find((type) => type.value === status?.pixKeyType)?.label || "Não identificado"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowStatusPixKey((value) => !value)}
                            className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
                        >
                            {showStatusPixKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showStatusPixKey ? "Ocultar" : "Mostrar"}
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={togglePix}
                            className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                            <Power size={15} />
                            {status?.pixEnabled ? "Desativar PIX" : "Ativar PIX"}
                        </button>
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setIsEditing(true)}
                            className="inline-flex h-10 items-center gap-2 border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 disabled:opacity-50"
                        >
                            <Pencil size={15} /> Alterar chave
                        </button>
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={deleteKey}
                            className="inline-flex h-10 items-center gap-2 border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            Excluir chave
                        </button>
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="border border-blue-200 bg-blue-50/40 p-4 md:p-5">
                    <div className="mb-4 flex gap-3">
                        <AlertCircle size={17} className="mt-0.5 shrink-0 text-blue-600" />
                        <p className="text-xs leading-relaxed text-blue-800">
                            {isConfigured
                                ? "A chave atual continuará funcionando até você confirmar a substituição."
                                : "Cadastre uma chave que já esteja ativa no aplicativo do seu banco. A validação do sistema confirma o formato, mas não consulta o DICT do Banco Central."}
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                        <label className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Tipo da chave</span>
                            <select
                                value={pixKeyType}
                                onChange={(event) => setPixKeyType(event.target.value as PixKeyType)}
                                className="h-12 w-full border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            >
                                {PIX_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Nova chave PIX</span>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="pix-key-value"
                                    value={pixKey}
                                    onChange={(event) => setPixKey(event.target.value)}
                                    placeholder="Digite a chave correspondente ao tipo selecionado"
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    spellCheck={false}
                                    inputMode={pixKeyType === "email" ? "email" : pixKeyType === "phone" ? "tel" : pixKeyType === "cpf" || pixKeyType === "cnpj" ? "numeric" : "text"}
                                    style={showInputPixKey ? undefined : { WebkitTextSecurity: "disc" } as CSSProperties}
                                    className="h-12 w-full border border-slate-300 bg-white pl-3 pr-11 text-sm text-slate-900 outline-none focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowInputPixKey((value) => !value)}
                                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-500"
                                    aria-label={showInputPixKey ? "Ocultar chave" : "Mostrar chave"}
                                >
                                    {showInputPixKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </label>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                        {isConfigured && (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => { setIsEditing(false); setPixKey(""); }}
                                className="h-11 border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={isBusy || !pixKey.trim()}
                            onClick={saveKey}
                            className="inline-flex h-11 items-center gap-2 bg-slate-950 px-5 text-xs font-bold text-white disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                            {isConfigured ? "Confirmar nova chave" : "Cadastrar e ativar PIX"}
                        </button>
                    </div>
                </div>
            )}

            {!isEditing && (
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Desativar o PIX não apaga a chave. Para removê-la dos dados da loja, use “Excluir chave”.
                </p>
            )}
        </section>
    );
}
