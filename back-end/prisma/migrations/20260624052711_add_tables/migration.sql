-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tableNumber" INTEGER;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "tableCount" INTEGER NOT NULL DEFAULT 0;
