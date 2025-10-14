-- Migration: dedupe shop_location rows per owner and add unique constraint on owner_id
-- WARNING: Review before running on production. Back up data if needed.

BEGIN;

-- Delete duplicate shop_location rows, keep the newest row per owner_id
DELETE FROM shop_location a
USING shop_location b
WHERE a.owner_id = b.owner_id
  AND a.created_at < b.created_at;

-- Add unique constraint on owner_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'u' AND t.relname = 'shop_location' AND array_to_string(c.conkey, ',') = '2'
  ) THEN
    ALTER TABLE shop_location
      ADD CONSTRAINT shop_location_owner_id_key UNIQUE (owner_id);
  END IF;
END$$;

COMMIT;

-- Verify uniqueness
-- SELECT owner_id, count(*) FROM shop_location GROUP BY owner_id HAVING count(*) > 1;
