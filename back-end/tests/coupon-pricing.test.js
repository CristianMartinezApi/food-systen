require('ts-node/register');

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeCouponDiscount, CouponValidationError, normalizeCouponCode } = require('../src/utils/coupon-pricing');

const baseContext = { subtotal: 100, totalRedemptions: 0, customerRedemptions: 0 };

test('calcula desconto percentual sobre o subtotal', () => {
  const coupon = { type: 'PERCENTAGE', value: 10, maxUsesPerCustomer: 1, isActive: true };
  const result = computeCouponDiscount(coupon, baseContext);
  assert.equal(result.discountAmount, 10);
  assert.equal(result.freeShipping, false);
});

test('desconto percentual nunca passa do subtotal', () => {
  const coupon = { type: 'PERCENTAGE', value: 150, maxUsesPerCustomer: 1, isActive: true };
  const result = computeCouponDiscount(coupon, baseContext);
  assert.equal(result.discountAmount, 100);
});

test('desconto fixo é limitado ao valor do subtotal', () => {
  const coupon = { type: 'FIXED', value: 500, maxUsesPerCustomer: 1, isActive: true };
  const result = computeCouponDiscount(coupon, { ...baseContext, subtotal: 30 });
  assert.equal(result.discountAmount, 30);
});

test('desconto fixo normal não é limitado quando menor que o subtotal', () => {
  const coupon = { type: 'FIXED', value: 15, maxUsesPerCustomer: 1, isActive: true };
  const result = computeCouponDiscount(coupon, baseContext);
  assert.equal(result.discountAmount, 15);
});

test('frete grátis não desconta do subtotal, só sinaliza freeShipping', () => {
  const coupon = { type: 'FREE_SHIPPING', value: 0, maxUsesPerCustomer: 1, isActive: true };
  const result = computeCouponDiscount(coupon, baseContext);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.freeShipping, true);
});

test('rejeita cupom inativo', () => {
  const coupon = { type: 'FIXED', value: 10, maxUsesPerCustomer: 1, isActive: false };
  assert.throws(() => computeCouponDiscount(coupon, baseContext), CouponValidationError);
});

test('rejeita cupom expirado', () => {
  const coupon = { type: 'FIXED', value: 10, maxUsesPerCustomer: 1, isActive: true, expiresAt: '2020-01-01T00:00:00Z' };
  assert.throws(() => computeCouponDiscount(coupon, baseContext), /expirou/);
});

test('rejeita quando o subtotal fica abaixo do pedido mínimo do cupom', () => {
  const coupon = { type: 'FIXED', value: 10, maxUsesPerCustomer: 1, isActive: true, minOrderValue: 200 };
  assert.throws(() => computeCouponDiscount(coupon, baseContext), /[Pp]edido mínimo/);
});

test('rejeita quando o limite total de usos foi atingido', () => {
  const coupon = { type: 'FIXED', value: 10, maxUsesPerCustomer: 5, isActive: true, maxUses: 10 };
  assert.throws(
    () => computeCouponDiscount(coupon, { ...baseContext, totalRedemptions: 10 }),
    CouponValidationError
  );
});

test('rejeita quando o cliente já usou o cupom o máximo de vezes permitido', () => {
  const coupon = { type: 'FIXED', value: 10, maxUsesPerCustomer: 1, isActive: true };
  assert.throws(
    () => computeCouponDiscount(coupon, { ...baseContext, customerRedemptions: 1 }),
    CouponValidationError
  );
});

test('normalizeCouponCode remove espaços e caixa para maiúscula', () => {
  assert.equal(normalizeCouponCode('  bemvindo10 '), 'BEMVINDO10');
});
