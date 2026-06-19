-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('SUPPLY', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PrintConnectionType" AS ENUM ('NETWORK', 'USB');

-- CreateEnum
CREATE TYPE "PrintTemplate" AS ENUM ('ORDER_TICKET', 'CASH_CLOSING_REPORT', 'TEST_TICKET');

-- CreateEnum
CREATE TYPE "PrintMode" AS ENUM ('THERMAL', 'A4');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'DEBIT';
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "openedById" INTEGER,
    "closedById" INTEGER,
    "openingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingAmount" DOUBLE PRECISION,
    "expectedAmount" DOUBLE PRECISION,
    "differenceAmount" DOUBLE PRECISION,
    "informedCardAmount" DOUBLE PRECISION DEFAULT 0,
    "informedPixAmount" DOUBLE PRECISION DEFAULT 0,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" SERIAL NOT NULL,
    "cashSessionId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "type" "CashMovementType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_devices" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "agentToken" TEXT NOT NULL,
    "connectionType" "PrintConnectionType" NOT NULL DEFAULT 'NETWORK',
    "ipAddress" TEXT,
    "port" INTEGER DEFAULT 9100,
    "usbVendorId" TEXT,
    "usbProductId" TEXT,
    "paperWidthMm" INTEGER NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPrintOrders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "printerId" INTEGER,
    "requestedById" INTEGER,
    "subjectType" TEXT NOT NULL,
    "subjectId" INTEGER,
    "template" "PrintTemplate" NOT NULL,
    "printMode" "PrintMode" NOT NULL DEFAULT 'THERMAL',
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_sessions_restaurantId_status_idx" ON "cash_sessions"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "cash_sessions_openedAt_idx" ON "cash_sessions"("openedAt");

-- CreateIndex
CREATE INDEX "cash_movements_cashSessionId_createdAt_idx" ON "cash_movements"("cashSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_movements_restaurantId_type_idx" ON "cash_movements"("restaurantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "print_devices_agentToken_key" ON "print_devices"("agentToken");

-- CreateIndex
CREATE INDEX "print_devices_restaurantId_isActive_idx" ON "print_devices"("restaurantId", "isActive");

-- CreateIndex
CREATE INDEX "print_jobs_restaurantId_status_createdAt_idx" ON "print_jobs"("restaurantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "print_jobs_printerId_status_createdAt_idx" ON "print_jobs"("printerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "print_jobs_subjectType_subjectId_createdAt_idx" ON "print_jobs"("subjectType", "subjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_devices" ADD CONSTRAINT "print_devices_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "print_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "audit_logs_action_created_at_idx" RENAME TO "audit_logs_action_createdAt_idx";

-- RenameIndex
ALTER INDEX "audit_logs_created_at_idx" RENAME TO "audit_logs_createdAt_idx";

-- RenameIndex
ALTER INDEX "audit_logs_subject_type_created_at_idx" RENAME TO "audit_logs_subjectType_createdAt_idx";
