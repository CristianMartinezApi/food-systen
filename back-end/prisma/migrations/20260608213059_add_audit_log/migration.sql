-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
