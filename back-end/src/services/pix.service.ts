/**
 * pix.service.ts
 * Integração simplificada com PIX da Efi Bank (ex-Gerencianet).
 * 
 * Modelo centralizado:
 *  - Plataforma mantém UMA conta Efi (credenciais no .env)
 *  - Lojista apenas fornece sua chave PIX
 *  - QR Code gerado via API central, mas pagamento vai para chave do lojista
 *  - Webhook valida pagamentos via HMAC-SHA256
 */

import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

const EFI_SANDBOX_URL = 'https://pix-h.api.efipay.com.br';
const EFI_PROD_URL = 'https://pix.api.efipay.com.br';

// ─── Validação de configurações ─────────────────────────────────────────────

function validateEfiConfig() {
    const required = ['EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_CERT_BASE64'];
    for (const key of required) {
        if (!process.env[key]) {
            console.warn(`[PIX] ${key} não configurado — PIX não funcionará`);
        }
    }
}

validateEfiConfig();

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface PixChargeResult {
    txid: string;
    qrcode: string;   // copia-e-cola
    imagemQrcode: string;   // base64 PNG
    pixCopiaECola: string;
    expiracao: number;   // segundos
}

// ─── Autenticação com mTLS ─────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
    try {
        const isSandbox = process.env.EFI_SANDBOX !== 'false';
        const baseUrl = isSandbox ? EFI_SANDBOX_URL : EFI_PROD_URL;
        const certBase64 = process.env.EFI_CERT_BASE64 || '';
        const clientId = process.env.EFI_CLIENT_ID || '';
        const clientSecret = process.env.EFI_CLIENT_SECRET || '';

        const certBuf = Buffer.from(certBase64, 'base64');

        const agent = new https.Agent({
            pfx: certBuf,
            passphrase: '',
            rejectUnauthorized: !isSandbox,
        });

        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const resp = await axios.post(
            `${baseUrl}/oauth/token`,
            { grant_type: 'client_credentials' },
            {
                httpsAgent: agent,
                headers: {
                    Authorization: `Basic ${basicAuth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return resp.data.access_token as string;
    } catch (error) {
        console.error('[PIX] Erro ao obter access token:', error);
        throw new Error('Falha ao autenticar com Efi Bank');
    }
}

// ─── Criação de cobrança PIX ─────────────────────────────────────────────────

/**
 * Cria QR Code PIX para o lojista receber o pagamento
 * @param pixKey - Chave PIX do lojista (CPF, CNPJ, email, celular ou aleatória)
 * @param value - Valor em reais (ex: 12.50)
 * @param orderId - ID do pedido para identificação
 */
export async function createPixCharge(
    pixKey: string,
    value: number,
    orderId: string
): Promise<PixChargeResult> {
    try {
        const isSandbox = process.env.EFI_SANDBOX !== 'false';
        const baseUrl = isSandbox ? EFI_SANDBOX_URL : EFI_PROD_URL;
        const certBase64 = process.env.EFI_CERT_BASE64 || '';

        const token = await getAccessToken();
        const certBuf = Buffer.from(certBase64, 'base64');

        const agent = new https.Agent({
            pfx: certBuf,
            passphrase: '',
            rejectUnauthorized: !isSandbox,
        });

        // Gerar TXID único
        const txid = `fs${Date.now()}${Math.random().toString(36).substr(2, 9)}`.slice(0, 35);

        // Criar cobrança PIX
        const cobResp = await axios.put(
            `${baseUrl}/v2/cob/${txid}`,
            {
                calendario: {
                    expiracao: 300, // 5 minutos
                },
                devedor: {},
                valor: {
                    original: value.toFixed(2),
                },
                chave: pixKey, // CHAVE PIX DO LOJISTA
                infoAdicionais: [
                    {
                        nome: 'Pedido',
                        valor: orderId,
                    },
                ],
            },
            {
                httpsAgent: agent,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!cobResp.data?.loc?.id) {
          throw new Error('Falha ao obter ID da locação do PIX');
        }

        const locId = cobResp.data.loc.id;

        // Gerar QR Code
        const qrResp = await axios.get(
            `${baseUrl}/v2/loc/${locId}/qrcode`,
            {
                httpsAgent: agent,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return {
            txid,
            qrcode: qrResp.data.qrcode,
            imagemQrcode: qrResp.data.imagemQrcode,
            pixCopiaECola: qrResp.data.qrcode,
            expiracao: 300, // 5 minutos
        };
    } catch (error) {
        console.error('[PIX] Erro ao criar cobrança:', error);
        throw new Error('Falha ao gerar QR Code PIX');
    }
}

// ─── Validação de webhook ────────────────────────────────────────────────────

/**
 * Valida assinatura HMAC-SHA256 do webhook da Efi
 */
export function validateWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined
): boolean {
    try {
        const secret = process.env.PIX_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('[PIX] PIX_WEBHOOK_SECRET não configurado');
            return false;
        }
        if (!signature) return false;

        const expected = 'sha256=' + crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (error) {
        console.error('[PIX] Erro ao validar webhook:', error);
        return false;
    }
}

