-- CreateTable "password_change_attempts"
CREATE TABLE "password_change_attempts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_change_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_change_attempts_userId_idx" ON "password_change_attempts"("userId");

-- CreateIndex
CREATE INDEX "password_change_attempts_createdAt_idx" ON "password_change_attempts"("createdAt");

-- AddForeignKey
ALTER TABLE "password_change_attempts" ADD CONSTRAINT "password_change_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
