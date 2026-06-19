ALTER TABLE "restaurants"
ADD COLUMN "corporateName" TEXT,
ADD COLUMN "cnpj" TEXT;

CREATE UNIQUE INDEX "restaurants_cnpj_key" ON "restaurants"("cnpj");
