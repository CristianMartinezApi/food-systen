export type OrderMode = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export type OrderStatusEmailCopy = {
  subject: string;
  title: string;
  message: string;
  accentColor: string;
};

/**
 * Cópia do e-mail de atualização de status por pedido — espelha os labels já usados
 * na tela de acompanhamento do cliente (front-end/src/modules/shop/pages/Orders.tsx).
 * Retorna null para status que não devem gerar e-mail (PENDING/OPEN são cobertos pelo
 * e-mail de confirmação do pedido; PAID é evento interno/financeiro, não voltado ao
 * cliente).
 */
export function getOrderStatusEmailCopy(
  status: string,
  mode: OrderMode,
  orderId: number | string
): OrderStatusEmailCopy | null {
  switch (status) {
    case 'CONFIRMED':
      return {
        subject: `Pedido #${orderId} confirmado`,
        title: 'Pedido confirmado',
        message: 'A loja confirmou seu pedido e já vai começar o preparo.',
        accentColor: '#2563eb',
      };
    case 'PREPARING':
      return {
        subject: `Pedido #${orderId} em preparo`,
        title: 'Em preparo',
        message: 'Seu pedido está sendo preparado na cozinha.',
        accentColor: '#2563eb',
      };
    case 'READY':
      return mode === 'PICKUP'
        ? {
            subject: `Pedido #${orderId} pronto para retirada`,
            title: 'Pronto para retirada',
            message: 'Seu pedido está pronto! Pode vir buscar quando quiser.',
            accentColor: '#ea580c',
          }
        : {
            subject: `Pedido #${orderId} pronto`,
            title: 'Pronto',
            message: 'Seu pedido está pronto.',
            accentColor: '#ea580c',
          };
    case 'OUT_FOR_DELIVERY':
      return {
        subject: `Pedido #${orderId} saiu para entrega`,
        title: 'Saiu para entrega',
        message: 'Seu pedido saiu para entrega e deve chegar em breve.',
        accentColor: '#4f46e5',
      };
    case 'DELIVERED':
      return {
        subject: `Pedido #${orderId} entregue`,
        title: 'Entregue',
        message: 'Seu pedido foi entregue. Bom apetite!',
        accentColor: '#059669',
      };
    case 'RETIRED':
      return {
        subject: `Pedido #${orderId} retirado`,
        title: 'Retirado',
        message: 'Seu pedido foi retirado no balcão. Bom apetite!',
        accentColor: '#059669',
      };
    case 'CANCELLED':
      return {
        subject: `Pedido #${orderId} cancelado`,
        title: 'Pedido cancelado',
        message: 'Seu pedido foi cancelado. Qualquer dúvida, fale com a loja.',
        accentColor: '#dc2626',
      };
    case 'REFUNDED':
      return {
        subject: `Pedido #${orderId} estornado`,
        title: 'Pedido estornado',
        message: 'Seu pedido foi estornado pela loja. Qualquer dúvida, fale com a loja.',
        accentColor: '#dc2626',
      };
    default:
      return null;
  }
}
