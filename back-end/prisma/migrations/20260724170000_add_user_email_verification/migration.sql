ALTER TABLE "users"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationTokenHash" TEXT,
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationSentAt" TIMESTAMP(3),
ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "users_emailVerificationTokenHash_idx"
ON "users"("emailVerificationTokenHash");
