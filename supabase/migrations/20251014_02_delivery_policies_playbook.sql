-- Migration: delivery_policies_playbook
-- Purpose: add delivery fields if missing and create safe RLS policies so
-- customers can cancel/delete their own pending orders, owners can accept/assign,
-- and delivery users can see assigned accepted orders and mark them delivered.

-- 1) Add columns if they don't exist
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS delivery_pin text;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS delivery_boy_id uuid REFERENCES public.profiles(id);

-- 2) Ensure profiles.role allows 'delivery' if a CHECK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'profiles' AND c.conname = 'profiles_role_check'
  ) THEN
    -- alter constraint if necessary (best-effort: add 'delivery' if missing)
    BEGIN
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop existing profiles_role_check';
    END;
  END IF;

  -- Recreate a permissive but explicit check allowing delivery
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer','owner','delivery'));
END$$;

-- 3) Enable RLS on orders (do this only if you intend to use row-level security)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- 4) Policies for customers
-- Customers can SELECT their own orders
CREATE POLICY IF NOT EXISTS "customers_select_own" ON public.orders
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can UPDATE their own orders only when status is 'pending'
-- and they may only set the status to 'cancelled' or keep it 'pending'.
CREATE POLICY IF NOT EXISTS "customers_update_pending" ON public.orders
  FOR UPDATE USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid() AND status IN ('pending','cancelled'));

-- Customers can DELETE their own orders only while status is 'pending' or 'cancelled'
CREATE POLICY IF NOT EXISTS "customers_delete_pending" ON public.orders
  FOR DELETE USING (customer_id = auth.uid() AND status IN ('pending','cancelled'));

-- 5) Policies for owners
-- Owners (profiles.role = 'owner') can SELECT all orders
CREATE POLICY IF NOT EXISTS "owners_select_all" ON public.orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));

-- Owners can UPDATE order status/assign delivery boy (no WITH CHECK so owner may change freely)
CREATE POLICY IF NOT EXISTS "owners_update" ON public.orders
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'));

-- 6) Policies for delivery users
-- Delivery user can SELECT orders assigned to them that are accepted (active assignments)
CREATE POLICY IF NOT EXISTS "delivery_select_assigned" ON public.orders
  FOR SELECT USING (delivery_boy_id = auth.uid() AND status = 'accepted');

-- Delivery user can UPDATE (mark delivered) only when assigned and status is 'accepted'
CREATE POLICY IF NOT EXISTS "delivery_update_mark_delivered" ON public.orders
  FOR UPDATE USING (delivery_boy_id = auth.uid() AND status = 'accepted')
  WITH CHECK (delivery_boy_id = auth.uid() AND status IN ('accepted','delivered'));

-- 7) Optional: grant explicit privileges to authenticated role (if you use anon key)
-- Note: adjust role names according to your Supabase setup
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

/* Verification queries (run after applying):
SELECT * FROM pg_policies WHERE tablename = 'orders';
-- Check a customer update attempt via psql or REST to ensure policies allow cancelling a pending order.
*/
