CREATE TABLE "customer_access_credentials" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_access_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_access_credentials_customerId_key"
ON "customer_access_credentials"("customerId");

CREATE INDEX "customer_access_credentials_restaurantId_tokenHash_idx"
ON "customer_access_credentials"("restaurantId", "tokenHash");

ALTER TABLE "customer_access_credentials"
ADD CONSTRAINT "customer_access_credentials_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
