"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, Loader2, RefreshCw, Zap, MessageCircle } from "lucide-react";
import { api } from "../../../../core/config/api";
import { formatCurrency } from "../../../../shared/utils";
import { sendToWhatsApp } from "../../../../shared/utils/whatsapp";
import toast from "react-hot-toast";

interface Props {
    total: number;
    storePhone?: string;
    storeName?: string;
    onConfirmed: () => void | Promise<void>;
    isConfirming?: boolean;
}

interface PixData {
    txid: string;
    qrcode: string;
    imagemQrcode: string;  // PNG base64
    pixCopiaECola: string;
    expiracao: number;
}

export default function PixPayment({ total, storePhone, storeName, onConfirmed, isConfirming = false }: Props) {
    const [pixData, setPixData] = useState<PixData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Gera a cobrança PIX ───────────────────────────────────────────────────
    const generateCharge = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data: PixData = await api.post('/pix/preview', { total });
            setPixData(data);
            setTimeLeft(data.expiracao);
        } catch (err: any) {
            setError(err.message || "Erro ao gerar cobrança PIX");
        } finally {
            setIsLoading(false);
        }
    }, [total]);

    useEffect(() => { generateCharge(); }, [generateCharge]);

    // ─── Countdown ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!pixData) return;
        if (timeLeft <= 0) return;
        const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
        return () => clearTimeout(t);
    }, [timeLeft, pixData]);


    // ─── Copiar copia-e-cola ───────────────────────────────────────────────────
    const handleCopy = async () => {
        if (!pixData) return;
        await navigator.clipboard.writeText(pixData.pixCopiaECola);
        setIsCopied(true);
        toast.success("Código copiado!");
        setTimeout(() => setIsCopied(false), 3000);
    };

    const handleWhatsAppNotify = () => {
        if (!storePhone) {
            toast.error("Telefone da loja não configurado.");
            return;
        }

        const message = encodeURIComponent(
            `Olá! Realizei o pagamento PIX no valor de ${formatCurrency(total)}. Vou enviar o comprovante para conferência.`
        );

        sendToWhatsApp(storePhone, message);
    };

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");

    // ─── Estados ──────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gerando QR Code PIX...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                <Zap size={28} className="text-rose-400" />
            </div>
            <p className="font-bold text-slate-900">Erro ao gerar PIX</p>
            <p className="text-sm text-slate-400 max-w-xs">{error}</p>
            <button
                onClick={generateCharge}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-all"
            >
                <RefreshCw size={14} /> Tentar novamente
            </button>
        </div>
    );

    if (timeLeft <= 0 && pixData) return (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <p className="font-bold text-slate-900">QR Code expirado</p>
            <p className="text-sm text-slate-400">Gere um novo código para continuar.</p>
            <button
                onClick={generateCharge}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-all"
            >
                <RefreshCw size={14} /> Novo QR Code
            </button>
        </div>
    );

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="pix"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6"
            >
                {/* Cabeçalho */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap size={18} className="text-emerald-500" fill="currentColor" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pagamento via PIX</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-primary">{formatCurrency(total)}</p>
                </div>

                {/* QR Code */}
                {pixData?.imagemQrcode && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <img
                            src={`data:image/png;base64,${pixData.imagemQrcode}`}
                            alt="QR Code PIX"
                            className="w-52 h-52 object-contain"
                        />
                    </div>
                )}

                {/* Countdown */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${timeLeft > 60 ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
                    Expira em <span className="font-mono font-bold text-slate-900">{minutes}:{seconds}</span>
                </div>

                {/* Copia e cola */}
                <div className="w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                        Ou pague com Pix Copia e Cola
                    </p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={pixData?.pixCopiaECola ?? ""}
                            className="flex-1 h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 outline-none truncate"
                        />
                        <button
                            onClick={handleCopy}
                            className={`h-11 px-4 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${isCopied
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-950 text-white hover:bg-black"
                                }`}
                        >
                            {isCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                            {isCopied ? "Copiado!" : "Copiar"}
                        </button>
                    </div>
                </div>

                {/* Instrução */}
                <div className="text-xs text-slate-400 text-center max-w-sm leading-relaxed space-y-2">
                    <p>
                        Abra o app do seu banco, escolha <strong>PIX</strong> e escaneie o QR Code ou cole o código acima.
                    </p>
                    <p>
                        Depois do pagamento, envie o comprovante diretamente para a loja para agilizar a conferência manual.
                    </p>
                </div>

                <div className="w-full grid gap-3">
                    <button
                        onClick={handleWhatsAppNotify}
                        className="h-12 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-all"
                    >
                        <MessageCircle size={16} />
                        Avisar a loja no WhatsApp
                    </button>

                    <button
                        disabled={isConfirming}
                        onClick={onConfirmed}
                        className="h-12 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-950 text-white hover:bg-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isConfirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {isConfirming ? 'Enviando pedido...' : 'Já paguei, concluir pedido'}
                    </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center max-w-sm leading-relaxed">
                    {storeName ? `${storeName} fará a conferência do pagamento manualmente.` : 'A loja fará a conferência do pagamento manualmente.'}
                </p>
            </motion.div>
        </AnimatePresence>
    );
}
