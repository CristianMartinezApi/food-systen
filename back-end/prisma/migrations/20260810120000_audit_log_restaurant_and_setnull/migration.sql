-- Auditoria não pode desaparecer quando o usuário que a gerou é excluído: troca a FK de
-- audit_logs.actorId de ON DELETE CASCADE para ON DELETE SET NULL. actorEmail já guarda
-- um snapshot do e-mail do autor para o caso de actorId ficar nulo.
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Loja do evento, gravada diretamente em vez de depender de um join com o autor (que
-- falha silenciosamente quando actorId é nulo). Nullable e sem backfill: linhas antigas
-- ficam com restaurantId nulo; eventos legitimamente cross-tenant (SUPER_ADMIN) também.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "restaurantId" INTEGER;

CREATE INDEX IF NOT EXISTS "audit_logs_restaurantId_createdAt_idx" ON "audit_logs"("restaurantId", "createdAt");
