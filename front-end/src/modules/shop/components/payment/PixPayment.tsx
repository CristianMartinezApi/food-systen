"use client";

/**
 * PixPayment.tsx
 * Exibe o QR Code PIX gerado pela Efi Bank, um contador regressivo
 * e detecta automaticamente o pagamento via Socket.IO ou polling.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, Loader2, RefreshCw, Zap } from "lucide-react";
import { api } from "../../../../core/config/api";
import { socket } from "../../../../core/config/socket";
import { formatCurrency } from "../../../../shared/utils";
import toast from "react-hot-toast";

interface Props {
    orderId: number;
    total: number;
    restaurantId: number;
    onConfirmed: () => void;  // callback quando pagamento confirmado
}

interface PixData {
    txid: string;
    qrcode: string;
    imagemQrcode: string;  // PNG base64
    pixCopiaECola: string;
    expiracao: number;
}

const POLL_INTERVAL_MS = 5000;  // verifica status a cada 5s (fallback ao Socket.IO)

export default function PixPayment({ orderId, total, restaurantId, onConfirmed }: Props) {
    const [pixData, setPixData] = useState<PixData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isCopied, setIsCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Gera a cobrança PIX ───────────────────────────────────────────────────
    const generateCharge = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data: PixData = await api.post(`/pix/charge/${orderId}`, {});
            setPixData(data);
            setTimeLeft(data.expiracao);
        } catch (err: any) {
            setError(err.message || "Erro ao gerar cobrança PIX");
        } finally {
            setIsLoading(false);
        }
    }, [orderId]);

    useEffect(() => { generateCharge(); }, [generateCharge]);

    // ─── Countdown ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!pixData || isConfirmed) return;
        if (timeLeft <= 0) return;
        const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
        return () => clearTimeout(t);
    }, [timeLeft, pixData, isConfirmed]);

    // ─── Socket.IO — evento em tempo real ─────────────────────────────────────
    useEffect(() => {
        if (!pixData) return;
        const event = `order:${restaurantId}:paid`;

        const handler = (data: { orderId: number }) => {
            if (data.orderId === orderId) confirm();
        };

        socket.connect();
        socket.on(event, handler);
        return () => { socket.off(event, handler); };
    }, [pixData, orderId, restaurantId]);

    // ─── Polling de fallback ───────────────────────────────────────────────────
    useEffect(() => {
        if (!pixData || isConfirmed) return;
        const interval = setInterval(async () => {
            try {
                const order = await api.get(`/orders/${orderId}`);
                if (order?.status === "PAID" || order?.status === "CONFIRMED") confirm();
            } catch { }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [pixData, isConfirmed, orderId]);

    const confirm = () => {
        setIsConfirmed(true);
        socket.disconnect();
        setTimeout(onConfirmed, 2000);
    };

    // ─── Copiar copia-e-cola ───────────────────────────────────────────────────
    const handleCopy = async () => {
        if (!pixData) return;
        await navigator.clipboard.writeText(pixData.pixCopiaECola);
        setIsCopied(true);
        toast.success("Código copiado!");
        setTimeout(() => setIsCopied(false), 3000);
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

    if (isConfirmed) return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-6 text-center"
        >
            <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center border border-emerald-100"
            >
                <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
            </motion.div>
            <div>
                <p className="text-2xl font-bold text-slate-950 uppercase tracking-tight">Pagamento Confirmado!</p>
                <p className="text-sm text-slate-400 mt-1">Seu pedido já está sendo preparado.</p>
            </div>
        </motion.div>
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
                <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed">
                    Abra o app do seu banco, escolha <strong>PIX</strong> e escaneie o QR Code ou cole o código acima.
                    A confirmação é automática.
                </p>
            </motion.div>
        </AnimatePresence>
    );
}
