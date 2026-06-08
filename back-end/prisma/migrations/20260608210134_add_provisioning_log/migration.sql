-- CreateTable
CREATE TABLE "ProvisioningLog" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProvisioningLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProvisioningLog" ADD CONSTRAINT "ProvisioningLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
