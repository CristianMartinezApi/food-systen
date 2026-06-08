export const clampDiscountPercent = (value: unknown) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.min(100, numericValue);
};

export const getProductDiscountedPrice = (price: number, discountPercent?: number) => {
  const discount = clampDiscountPercent(discountPercent);

  if (discount <= 0) {
    return price || 0;
  }

  return Math.max(0, (price || 0) * (1 - discount / 100));
};

export const hasProductDiscount = (discountPercent?: number) => clampDiscountPercent(discountPercent) > 0;
