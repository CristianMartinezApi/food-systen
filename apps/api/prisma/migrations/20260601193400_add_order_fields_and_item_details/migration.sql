-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "addons" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "removals" JSONB,
ADD COLUMN     "variation" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "changeFor" TEXT,
ADD COLUMN     "cpf" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "addons" JSONB,
ADD COLUMN     "ingredients" JSONB,
ADD COLUMN     "sizes" JSONB;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "deliveryRadius" DOUBLE PRECISION DEFAULT 5;
