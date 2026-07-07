-- Add guided assembly support columns for categories and products
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "typeMontagem" TEXT DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS "guidedAssemblyConfig" JSONB;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "usesGuidedAssembly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "guidedAssemblyConfig" JSONB;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "guidedAssemblySelections" JSONB;
