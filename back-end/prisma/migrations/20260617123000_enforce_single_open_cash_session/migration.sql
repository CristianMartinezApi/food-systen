DO $$
BEGIN
    IF to_regclass('"cash_sessions"') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS "cash_sessions_single_open_per_restaurant"
            ON "cash_sessions" ("restaurantId")
            WHERE "status" = 'OPEN';
    END IF;
END $$;
