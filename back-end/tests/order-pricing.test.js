require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeItemUnitPrice, computeOrderSubtotal, OrderPricingError } = require('../src/utils/order-pricing');

test('ignora o preço enviado pelo cliente e usa o preço do produto no banco', () => {
  const product = { price: 30, discountPercent: 0 };
  const item = { variation: null, addons: [] };
  assert.equal(computeItemUnitPrice(product, item), 30);
});

test('usa o preço do tamanho selecionado, não o preço base', () => {
  const product = {
    price: 20,
    discountPercent: 0,
    sizes: [{ name: 'P', price: 20 }, { name: 'G', price: 35 }],
  };
  const item = { variation: 'G' };
  assert.equal(computeItemUnitPrice(product, item), 35);
});

test('rejeita tamanho que não existe no produto', () => {
  const product = { price: 20, sizes: [{ name: 'P', price: 20 }] };
  const item = { variation: 'GG' };
  assert.throws(() => computeItemUnitPrice(product, item), OrderPricingError);
});

test('aplica desconto percentual sobre o preço base', () => {
  const product = { price: 100, discountPercent: 10 };
  const item = {};
  assert.equal(computeItemUnitPrice(product, item), 90);
});

test('soma adicionais pelo preço cadastrado no produto, ignorando preço enviado pelo cliente', () => {
  const product = {
    price: 20,
    discountPercent: 0,
    addons: [{ name: 'Bacon', price: 5 }, { name: 'Queijo extra', price: 3 }],
  };
  const item = {
    addons: [
      { name: 'Bacon', price: 0.01 }, // preço adulterado enviado pelo cliente — deve ser ignorado
      { name: 'Queijo extra', price: 999 },
    ],
  };
  assert.equal(computeItemUnitPrice(product, item), 28);
});

test('rejeita adicional que não existe no produto', () => {
  const product = { price: 20, addons: [{ name: 'Bacon', price: 5 }] };
  const item = { addons: [{ name: 'Adicional Inventado' }] };
  assert.throws(() => computeItemUnitPrice(product, item), OrderPricingError);
});

test('soma o preço das opções de montagem guiada selecionadas', () => {
  const product = { price: 25, discountPercent: 0 };
  const guidedGroups = [
    {
      id: 1,
      name: 'Complementos',
      options: [
        { id: 10, name: 'Catupiry', price: 4 },
        { id: 11, name: 'Cheddar', price: 6 },
      ],
    },
  ];
  const item = {
    guidedAssemblySelections: [{ groupId: 1, optionIds: [10, 10] }], // 2x Catupiry
  };
  assert.equal(computeItemUnitPrice(product, item, guidedGroups), 25 + 4 + 4);
});

test('não rejeita item de montagem guiada mesmo vindo misturado no array de addons (formato real do carrinho da loja)', () => {
  // O carrinho da loja pública envia `addons: [...selectedAddons, ...selectedCustomization]`,
  // onde selectedCustomization são opções de montagem guiada marcadas com groupId.
  const product = {
    price: 25,
    discountPercent: 0,
    addons: [{ name: 'Refrigerante', price: 6 }],
  };
  const guidedGroups = [
    {
      id: 1,
      name: 'Complementos',
      options: [{ id: 10, name: 'Catupiry', price: 4 }],
    },
  ];
  const item = {
    addons: [
      { name: 'Refrigerante', price: 6 },
      { id: 10, name: 'Catupiry', price: 999, groupId: '1', step: '1' }, // veio da montagem guiada
    ],
    guidedAssemblySelections: [{ groupId: '1', optionIds: [10] }],
  };
  assert.equal(computeItemUnitPrice(product, item, guidedGroups), 25 + 6 + 4);
});

test('computeOrderSubtotal soma preço unitário x quantidade com 2 casas decimais', () => {
  const subtotal = computeOrderSubtotal([
    { unitPrice: 10.005, quantity: 2 },
    { unitPrice: 5.333, quantity: 1 },
  ]);
  assert.equal(subtotal, 25.34);
});
