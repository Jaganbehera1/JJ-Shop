-- Add a stock column to item_variants to track available quantity
ALTER TABLE IF EXISTS public.item_variants
  ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0 NOT NULL;

-- Backfill note: consider updating stock for existing variants via admin tools or SQL updates.
