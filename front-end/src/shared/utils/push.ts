import { api } from "../../core/config/api";

export function isPushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        typeof Notification !== "undefined"
    );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return null;
    return registration.pushManager.getSubscription();
}

/**
 * Pede permissão de notificação e inscreve o navegador para acompanhar o pedido do
 * cliente. Usa o mesmo par phone + accessToken já emitido na criação do pedido — não
 * é um login novo.
 */
export async function subscribeToOrderNotifications(params: {
    phone: string;
    accessToken: string;
}): Promise<boolean> {
    if (!isPushSupported()) return false;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
    }

    const subscriptionJson = subscription.toJSON();

    await api.post("/push/subscribe", {
        phone: params.phone,
        accessToken: params.accessToken,
        subscription: {
            endpoint: subscriptionJson.endpoint,
            keys: subscriptionJson.keys,
        },
    });

    return true;
}
