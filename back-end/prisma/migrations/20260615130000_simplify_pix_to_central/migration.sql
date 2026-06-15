-- Simplify PIX integration: remove per-restaurant Efi credentials, keep only pixKey
ALTER TABLE "settings"
  DROP COLUMN IF EXISTS "pixClientId",
  DROP COLUMN IF EXISTS "pixClientSecret",
  DROP COLUMN IF EXISTS "pixCertBase64",
  DROP COLUMN IF EXISTS "pixSandbox";

-- Ensure pixEnabled and pixKey exist
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "pixEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pixKey" TEXT;
