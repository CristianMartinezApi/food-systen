export type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';

export type CouponRecord = {
  type: CouponType;
  value: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer: number;
  expiresAt?: Date | string | null;
  isActive: boolean;
};

export type CouponRedemptionContext = {
  subtotal: number;
  totalRedemptions: number;
  customerRedemptions: number;
  now?: Date;
};

export type CouponDiscountResult = {
  discountAmount: number;
  freeShipping: boolean;
};

export class CouponValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeCouponCode(code: unknown): string {
  return String(code || '').trim().toUpperCase();
}

/**
 * Valida as regras do cupom (ativo, validade, pedido mínimo, limites de uso) e
 * calcula o desconto — sempre a partir do subtotal já recalculado no servidor, nunca
 * de um valor de desconto vindo do cliente.
 */
export function computeCouponDiscount(coupon: CouponRecord, context: CouponRedemptionContext): CouponDiscountResult {
  const now = context.now || new Date();

  if (!coupon.isActive) {
    throw new CouponValidationError('COUPON_INACTIVE', 'Este cupom não está mais ativo.');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    throw new CouponValidationError('COUPON_EXPIRED', 'Este cupom expirou.');
  }
  if (coupon.minOrderValue != null && context.subtotal < coupon.minOrderValue) {
    throw new CouponValidationError(
      'COUPON_MIN_ORDER_VALUE',
      `Pedido mínimo de R$ ${coupon.minOrderValue.toFixed(2)} para usar este cupom.`
    );
  }
  if (coupon.maxUses != null && context.totalRedemptions >= coupon.maxUses) {
    throw new CouponValidationError('COUPON_EXHAUSTED', 'Este cupom atingiu o limite de usos.');
  }
  if (context.customerRedemptions >= coupon.maxUsesPerCustomer) {
    throw new CouponValidationError('COUPON_ALREADY_USED', 'Você já usou este cupom.');
  }

  if (coupon.type === 'FREE_SHIPPING') {
    return { discountAmount: 0, freeShipping: true };
  }

  if (coupon.type === 'PERCENTAGE') {
    const raw = context.subtotal * (Number(coupon.value) / 100);
    return { discountAmount: Number(Math.max(0, Math.min(raw, context.subtotal)).toFixed(2)), freeShipping: false };
  }

  // FIXED — nunca desconta mais que o próprio subtotal.
  return { discountAmount: Number(Math.max(0, Math.min(Number(coupon.value), context.subtotal)).toFixed(2)), freeShipping: false };
}
