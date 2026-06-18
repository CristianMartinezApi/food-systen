CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
  ON "audit_logs" ("createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_subject_type_created_at_idx"
  ON "audit_logs" ("subjectType", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx"
  ON "audit_logs" ("action", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_email_lower_idx"
  ON "audit_logs" (LOWER("actorEmail"));
