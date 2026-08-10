-- Combos: um Product marcado isCombo=true, com os componentes em combo_items.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isCombo" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "combo_items" (
    "id" SERIAL NOT NULL,
    "comboProductId" INTEGER NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "combo_items_comboProductId_idx" ON "combo_items"("comboProductId");

ALTER TABLE "combo_items"
ADD CONSTRAINT "combo_items_comboProductId_fkey"
FOREIGN KEY ("comboProductId") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "combo_items"
ADD CONSTRAINT "combo_items_componentProductId_fkey"
FOREIGN KEY ("componentProductId") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cupons de desconto.
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_SHIPPING');

CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minOrderValue" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "maxUsesPerCustomer" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_restaurantId_code_key" ON "coupons"("restaurantId", "code");
CREATE INDEX "coupons_restaurantId_idx" ON "coupons"("restaurantId");

ALTER TABLE "coupons"
ADD CONSTRAINT "coupons_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "coupon_redemptions" (
    "id" SERIAL NOT NULL,
    "couponId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");
CREATE INDEX "coupon_redemptions_couponId_customerPhone_idx" ON "coupon_redemptions"("couponId", "customerPhone");

ALTER TABLE "coupon_redemptions"
ADD CONSTRAINT "coupon_redemptions_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_redemptions"
ADD CONSTRAINT "coupon_redemptions_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Order ganha referência opcional de cupom aplicado.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponId" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "orders_couponId_idx" ON "orders"("couponId");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
