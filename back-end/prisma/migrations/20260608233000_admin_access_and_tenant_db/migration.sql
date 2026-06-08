-- Add approval flag for users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;

-- Add provisioning metadata for restaurants
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "provisioningStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "databaseName" TEXT;

-- Existing customers should remain active/approved after the schema change
UPDATE "users" SET "isApproved" = true;
UPDATE "restaurants" SET "provisioningStatus" = 'READY' WHERE "provisioningStatus" = 'PENDING';
