-- Add countFromDate to cash_sessions
-- This field, when set, changes the financial query window
-- so pre-opening orders can be included in the session totals.
ALTER TABLE "cash_sessions" ADD COLUMN IF NOT EXISTS "countFromDate" TIMESTAMP(3);
