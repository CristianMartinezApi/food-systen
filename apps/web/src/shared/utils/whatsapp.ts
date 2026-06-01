import { formatCurrency } from ".";

interface OrderData {
  id: number;
  customerName: string;
  phone: string;
  address: any;
  paymentMethod: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export const formatWhatsAppMessage = (order: OrderData, storeName: string) => {
  const itemsList = order.items
    .map(item => {
      let itemMsg = `✅ *${item.quantity}x* ${item.name}`;
      
      if (item.variation) {
        itemMsg += ` (${item.variation})`;
      }
      
      itemMsg += ` - ${formatCurrency(item.price * item.quantity)}`;

      if (item.addons && item.addons.length > 0) {
        const addonsStr = item.addons
          .map((a: any) => a.quantity > 1 ? `${a.quantity}x ${a.name}` : a.name)
          .join(', ');
        itemMsg += `\n   ➕ *Adicionais:* ${addonsStr}`;
      }

      if (item.removals && item.removals.length > 0) {
        itemMsg += `\n   ➖ *Remover:* ${item.removals.join(', ')}`;
      }

      if (item.observations) {
        itemMsg += `\n   📝 *Obs:* ${item.observations}`;
      }

      return itemMsg;
    })
    .join('\n\n');

  let addressInfo = '';
  if (order.address.type === 'DELIVERY') {
    const d = order.address.details;
    addressInfo = `
📍 *Endereço de Entrega:*
${d.street}, ${d.number}
${d.neighborhood} - ${d.city}
${d.complement ? `Comp: ${d.complement}` : ''}
${d.reference ? `Ref: ${d.reference}` : ''}
`.trim();
  } else {
    addressInfo = `📍 *Método:* ${order.address.details}`;
  }

  const changeInfo = (order as any).changeFor 
    ? `\n💵 *Troco para:* ${formatCurrency(Number((order as any).changeFor))}`
    : '';

  const paymentMethodLabel = order.address.type === 'DINE_IN' ? 'A Combinar (No Local)' : order.paymentMethod;

  const message = `
🍔 *NOVO PEDIDO - ${storeName.toUpperCase()}*
---------------------------------------
🆔 *Pedido:* #${order.id}
👤 *Cliente:* ${order.customerName}
📞 *Telefone:* ${order.phone}
${(order as any).cpf ? `📄 *CPF:* ${(order as any).cpf}\n` : ''}

📦 *ITENS:*
${itemsList}

---------------------------------------
💰 *Subtotal:* ${formatCurrency(order.subtotal)}
🚚 *Taxa de Entrega:* ${order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'Grátis'}
💳 *Pagamento:* ${paymentMethodLabel}${changeInfo}
⭐ *TOTAL:* ${formatCurrency(order.total)}

${addressInfo}

---------------------------------------
⏳ *Status:* Aguardando confirmação
`.trim();

  return encodeURIComponent(message);
};

export const sendToWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/55${cleanPhone}?text=${message}`;
  window.open(url, '_blank');
};
