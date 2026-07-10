/**
 * front-end/src/modules/shop/components/payment/PixPaymentDynamic.tsx
 * 
 * Modal com QR Code PIX DINÂMICO (com valor real do pedido)
 * Substitua o arquivo PixPayment anterior
 */

'use client';

import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Image from 'next/image';

interface PixPaymentDynamicProps {
  order: {
    id: string;
    total: number;
    customerName?: string;
    customerPhone?: string;
  };
  restaurantName: string;
  onSuccess?: () => void;
}

export function PixPaymentDynamic({
  order,
  restaurantName,
  onSuccess
}: PixPaymentDynamicProps) {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [copiaCola, setCopiaCola] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 🔄 Buscar QR code dinâmico quando modal abre
  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/orders/${order.id}/pix-qrcode`);

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.userMessage || 'Erro ao gerar QR code');
          return;
        }

        const data = await response.json();
        setQrcode(data.qrcode); // Base64 da imagem
        setCopiaCola(data.copiaCola); // Texto para copiar/colar
      } catch (err) {
        setError('Erro ao carregar QR code PIX');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [order.id]);

  // 📋 Copiar cópia e cola
  const handleCopyCola = async () => {
    if (!copiaCola) return;

    try {
      await navigator.clipboard.writeText(copiaCola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Erro ao copiar');
    }
  };

  // 📸 Upload do comprovante
  const handleUploadProof = async () => {
    if (!proofImage) {
      alert('❌ Selecione a imagem do comprovante');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', proofImage);

      const response = await fetch(`/api/orders/${order.id}/pix-proof`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar comprovante');
      }

      // ✅ Sucesso
      alert('✅ Comprovante recebido! Aguardando confirmação da loja.');

      // Callback (se houver)
      onSuccess?.();
    } catch (err) {
      alert('❌ Erro ao enviar comprovante');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full" />
          </div>
          <p className="text-slate-600">Gerando QR code PIX...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold">❌ {error}</p>
        <p className="text-red-600 text-sm mt-2">
          Contacte o restaurante pelo WhatsApp para efetuar o pagamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📱 QR Code Dinâmico */}
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-4 text-slate-900">
          Escaneie para Pagar
        </h3>

        {qrcode ? (
          <div className="bg-white p-4 rounded-lg border-2 border-rose-100">
            <Image
              src={qrcode}
              alt="QR Code PIX"
              width={200}
              height={200}
              priority
              className="w-auto h-auto"
            />
          </div>
        ) : (
          <div className="w-52 h-52 bg-slate-200 rounded-lg flex items-center justify-center">
            <p className="text-slate-500">QR Code</p>
          </div>
        )}

        <p className="text-sm text-slate-500 mt-3">
          Use o app do seu banco para escanear
        </p>
      </div>

      {/* 💰 Valor a Pagar */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-600 font-medium">Valor a transferir</p>
        <p className="text-3xl font-bold text-blue-900">
          R$ {(order.total / 100).toFixed(2)}
        </p>
      </div>

      {/* 📋 Cópia e Cola */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm text-slate-600 font-medium mb-2">
          Ou copie e cole (Cópia e Cola)
        </p>

        <div className="flex items-center gap-2">
          <textarea
            value={copiaCola || ''}
            readOnly
            className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-mono break-all resize-none"
            rows={3}
          />
          <button
            onClick={handleCopyCola}
            className={`flex-shrink-0 p-2 rounded transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-slate-600 text-white hover:bg-slate-700'
            }`}
            title="Copiar"
          >
            {copied ? (
              <Check size={20} />
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          ✨ {copied ? 'Copiado!' : 'Cole no app do seu banco'}
        </p>
      </div>

      {/* 📸 Upload do Comprovante */}
      <div className="border-2 border-dashed border-rose-300 rounded-lg p-6 text-center hover:bg-rose-50 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProofImage(e.target.files?.[0] || null)}
          className="hidden"
          id="proof-upload"
        />

        <label
          htmlFor="proof-upload"
          className="cursor-pointer block"
        >
          <div className="text-3xl mb-2">📸</div>
          <p className="font-semibold text-slate-900">
            {proofImage ? proofImage.name : 'Envie o comprovante'}
          </p>
          <p className="text-sm text-slate-500">
            Tire um print ou foto da confirmação de pagamento
          </p>
        </label>
      </div>

      {/* 📋 Instruções */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="font-bold text-amber-900 mb-3">📋 Como fazer:</p>
        <ol className="list-decimal list-inside space-y-2 text-amber-800 text-sm">
          <li>Abra o app do seu banco</li>
          <li>Escaneie o QR code acima OU copie a &quot;Cópia e Cola&quot;</li>
          <li>Confirme o pagamento de R$ {(order.total / 100).toFixed(2)}</li>
          <li>Tire um print do comprovante de confirmação</li>
          <li>Envie a imagem aqui ou pelo WhatsApp</li>
        </ol>
      </div>

      {/* ✅ Botão Confirmar */}
      <button
        onClick={handleUploadProof}
        disabled={!proofImage || submitting}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          !proofImage || submitting
            ? 'bg-rose-300 cursor-not-allowed'
            : 'bg-rose-600 hover:bg-rose-700 active:scale-95'
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Enviando...
          </span>
        ) : (
          '✅ Confirmar Pagamento'
        )}
      </button>

      {/* 💬 Link WhatsApp Manual (backup) */}
      <button
        onClick={() => {
          const message = encodeURIComponent(
            `Olá! Já fiz o pagamento PIX do pedido #${order.id}\nValor: R$ ${(order.total / 100).toFixed(2)}\nCliente: ${order.customerName || 'N/A'}`
          );
          window.open(
            `https://wa.me/55${order.customerPhone?.replace(/\D/g, '')}?text=${message}`
          );
        }}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-colors"
      >
        💬 Contatar pelo WhatsApp
      </button>

      {/* ℹ️ Info Footer */}
      <div className="text-center text-xs text-slate-500 bg-slate-50 p-3 rounded">
        <p>
          ✨ Após enviar o comprovante, o restaurante receberá uma notificação
          para confirmar o pagamento.
        </p>
      </div>
    </div>
  );
}
