require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOrderStatusEmailCopy } = require('../src/utils/order-notifications');

const STATUSES_WITH_COPY = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETIRED', 'CANCELLED', 'REFUNDED'];

test('cada status suportado retorna assunto contendo o número do pedido', () => {
  for (const status of STATUSES_WITH_COPY) {
    const copy = getOrderStatusEmailCopy(status, 'DELIVERY', 501);
    assert.ok(copy, `esperava cópia para ${status}`);
    assert.match(copy.subject, /#501/);
    assert.ok(copy.title.length > 0);
    assert.ok(copy.message.length > 0);
  }
});

test('READY varia o texto entre retirada e demais modalidades', () => {
  const pickupCopy = getOrderStatusEmailCopy('READY', 'PICKUP', 1);
  const deliveryCopy = getOrderStatusEmailCopy('READY', 'DELIVERY', 1);
  const dineInCopy = getOrderStatusEmailCopy('READY', 'DINE_IN', 1);

  assert.match(pickupCopy.title, /retirada/i);
  assert.doesNotMatch(deliveryCopy.title, /retirada/i);
  assert.equal(deliveryCopy.title, dineInCopy.title);
});

test('status que não devem notificar o cliente retornam null', () => {
  assert.equal(getOrderStatusEmailCopy('PENDING', 'DELIVERY', 1), null);
  assert.equal(getOrderStatusEmailCopy('OPEN', 'DINE_IN', 1), null);
  assert.equal(getOrderStatusEmailCopy('PAID', 'PICKUP', 1), null);
  assert.equal(getOrderStatusEmailCopy('ALGO_INEXISTENTE', 'DELIVERY', 1), null);
});
