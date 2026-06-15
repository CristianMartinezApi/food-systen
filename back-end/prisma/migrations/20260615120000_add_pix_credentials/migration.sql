-- Add PIX credentials to settings
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "pixEnabled"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pixClientId"      TEXT,
  ADD COLUMN IF NOT EXISTS "pixClientSecret"  TEXT,
  ADD COLUMN IF NOT EXISTS "pixCertBase64"    TEXT,
  ADD COLUMN IF NOT EXISTS "pixKey"           TEXT,
  ADD COLUMN IF NOT EXISTS "pixSandbox"       BOOLEAN NOT NULL DEFAULT true;

-- Add PAID to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID';
