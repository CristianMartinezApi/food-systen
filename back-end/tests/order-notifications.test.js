require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOrderStatusNotificationCopy, getOrderReceivedNotificationCopy } = require('../src/utils/order-notifications');

const STATUSES_WITH_COPY = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETIRED', 'CANCELLED', 'REFUNDED'];

test('cada status suportado retorna corpo contendo o número do pedido', () => {
  for (const status of STATUSES_WITH_COPY) {
    const copy = getOrderStatusNotificationCopy(status, 'DELIVERY', 501);
    assert.ok(copy, `esperava cópia para ${status}`);
    assert.match(copy.body, /#501/);
    assert.ok(copy.title.length > 0);
  }
});

test('READY varia o texto entre retirada e demais modalidades', () => {
  const pickupCopy = getOrderStatusNotificationCopy('READY', 'PICKUP', 1);
  const deliveryCopy = getOrderStatusNotificationCopy('READY', 'DELIVERY', 1);
  const dineInCopy = getOrderStatusNotificationCopy('READY', 'DINE_IN', 1);

  assert.match(pickupCopy.title, /retirada/i);
  assert.doesNotMatch(deliveryCopy.title, /retirada/i);
  assert.equal(deliveryCopy.title, dineInCopy.title);
});

test('status que não devem notificar o cliente retornam null', () => {
  assert.equal(getOrderStatusNotificationCopy('PENDING', 'DELIVERY', 1), null);
  assert.equal(getOrderStatusNotificationCopy('OPEN', 'DINE_IN', 1), null);
  assert.equal(getOrderStatusNotificationCopy('PAID', 'PICKUP', 1), null);
  assert.equal(getOrderStatusNotificationCopy('ALGO_INEXISTENTE', 'DELIVERY', 1), null);
});

test('notificação de pedido recebido inclui o número do pedido', () => {
  const copy = getOrderReceivedNotificationCopy(777);
  assert.match(copy.body, /#777/);
  assert.ok(copy.title.length > 0);
});
