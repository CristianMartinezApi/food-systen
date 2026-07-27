ALTER TABLE "orders"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "orders_restaurantId_idempotencyKey_key"
ON "orders"("restaurantId", "idempotencyKey");
