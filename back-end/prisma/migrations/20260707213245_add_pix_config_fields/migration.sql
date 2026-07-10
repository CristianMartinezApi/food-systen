-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CASHIER';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "pixConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "pixConfirmedBy" TEXT,
ADD COLUMN     "pixProofAt" TIMESTAMP(3),
ADD COLUMN     "pixProofUrl" TEXT;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "pixInstructions" TEXT,
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixKeyType" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;
