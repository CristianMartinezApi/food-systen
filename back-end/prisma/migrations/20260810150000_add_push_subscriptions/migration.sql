CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key"
ON "push_subscriptions"("endpoint");

CREATE INDEX "push_subscriptions_restaurantId_customerId_idx"
ON "push_subscriptions"("restaurantId", "customerId");

ALTER TABLE "push_subscriptions"
ADD CONSTRAINT "push_subscriptions_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_subscriptions"
ADD CONSTRAINT "push_subscriptions_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
