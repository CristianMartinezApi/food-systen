-- Add missing cashSessionId column to orders if it does not exist
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "cashSessionId" INTEGER;

CREATE INDEX IF NOT EXISTS "orders_cashSessionId_idx" ON "orders"("cashSessionId");
