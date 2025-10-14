-- Migration: Make orders latitude/longitude/distance_km nullable
-- Run this in Supabase SQL editor or via psql against your database

ALTER TABLE public.orders
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL,
  ALTER COLUMN distance_km DROP NOT NULL;

-- Optional: verify the columns
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('latitude', 'longitude', 'distance_km');
