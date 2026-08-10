import webpush from 'web-push';
import { prisma } from '../lib/prisma';

let vapidConfigured = false;
let vapidConfigAttempted = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigAttempted) return vapidConfigured;
  vapidConfigAttempted = true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return false;
  }

  const subject = process.env.VAPID_SUBJECT || 'mailto:support@foodsystem.app.br';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureVapidConfigured();
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Envia uma notificação de push para todos os navegadores inscritos de um cliente.
 * Sempre best-effort: nunca lança para o chamador — falhas vão só para o log, e
 * inscrições expiradas/revogadas (404/410) são removidas automaticamente.
 */
export async function sendPushToCustomer(restaurantId: number, customerId: number, payload: PushPayload): Promise<void> {
  if (!ensureVapidConfigured()) return;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { restaurantId, customerId },
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            body
          );
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
          } else {
            console.error(`Falha ao enviar push para subscription ${subscription.id}:`, error?.message || error);
          }
        }
      })
    );
  } catch (error) {
    console.error(`Falha ao buscar inscrições de push para customerId=${customerId}:`, error);
  }
}
