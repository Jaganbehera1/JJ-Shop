-- Allow owners to select/view profiles and ensure delivery fields exist on orders

-- 1) Allow 'delivery' role in profiles constraint (safe to run even if already applied)
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner','customer','delivery'));

-- 2) Allow owners to select/view other profiles (so owner UI can list delivery users)
-- This policy allows authenticated users whose profile row has role='owner' to SELECT from profiles
CREATE POLICY IF NOT EXISTS "Owners can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
      AND p2.role = 'owner'
    )
  );

-- 3) Add delivery fields to orders if missing
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_pin varchar(6);
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_boy_id uuid REFERENCES profiles(id);

-- Note: After running this migration in Supabase, owners (authenticated users whose profile.role='owner')
-- will be able to SELECT from profiles and your frontend should be able to fetch delivery users.
