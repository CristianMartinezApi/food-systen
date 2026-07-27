ALTER TABLE "cash_movements"
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidedById" INTEGER,
  ADD COLUMN "voidReason" TEXT;

ALTER TABLE "cash_movements"
  ADD CONSTRAINT "cash_movements_voidedById_fkey"
  FOREIGN KEY ("voidedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "cash_movements_cashSessionId_voidedAt_idx"
  ON "cash_movements"("cashSessionId", "voidedAt");

CREATE UNIQUE INDEX "cash_sessions_one_open_per_restaurant_idx"
  ON "cash_sessions"("restaurantId")
  WHERE "status" = 'OPEN';
