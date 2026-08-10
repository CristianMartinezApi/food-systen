export type OrderMode = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export type OrderNotificationCopy = {
  title: string;
  body: string;
};

/** Notificação de push disparada assim que o pedido é criado. */
export function getOrderReceivedNotificationCopy(orderId: number | string): OrderNotificationCopy {
  return {
    title: 'Pedido recebido!',
    body: `Recebemos seu pedido #${orderId}. Você será avisado a cada atualização.`,
  };
}

/**
 * Cópia da notificação de push por mudança de status — espelha os labels já usados
 * na tela de acompanhamento do cliente (front-end/src/modules/shop/pages/Orders.tsx).
 * Retorna null para status que não devem notificar o cliente (PENDING/OPEN são
 * cobertos pela notificação de "pedido recebido"; PAID é evento interno/financeiro,
 * não voltado ao cliente).
 */
export function getOrderStatusNotificationCopy(
  status: string,
  mode: OrderMode,
  orderId: number | string
): OrderNotificationCopy | null {
  switch (status) {
    case 'CONFIRMED':
      return {
        title: 'Pedido confirmado',
        body: `A loja confirmou seu pedido #${orderId} e já vai começar o preparo.`,
      };
    case 'PREPARING':
      return {
        title: 'Em preparo',
        body: `Seu pedido #${orderId} está sendo preparado na cozinha.`,
      };
    case 'READY':
      return mode === 'PICKUP'
        ? {
            title: 'Pronto para retirada',
            body: `Seu pedido #${orderId} está pronto! Pode vir buscar quando quiser.`,
          }
        : {
            title: 'Pronto',
            body: `Seu pedido #${orderId} está pronto.`,
          };
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'Saiu para entrega',
        body: `Seu pedido #${orderId} saiu para entrega e deve chegar em breve.`,
      };
    case 'DELIVERED':
      return {
        title: 'Entregue',
        body: `Seu pedido #${orderId} foi entregue. Bom apetite!`,
      };
    case 'RETIRED':
      return {
        title: 'Retirado',
        body: `Seu pedido #${orderId} foi retirado no balcão. Bom apetite!`,
      };
    case 'CANCELLED':
      return {
        title: 'Pedido cancelado',
        body: `Seu pedido #${orderId} foi cancelado. Qualquer dúvida, fale com a loja.`,
      };
    case 'REFUNDED':
      return {
        title: 'Pedido estornado',
        body: `Seu pedido #${orderId} foi estornado pela loja. Qualquer dúvida, fale com a loja.`,
      };
    default:
      return null;
  }
}
