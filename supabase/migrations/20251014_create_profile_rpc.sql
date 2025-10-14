-- Create a helper RPC to allow owners to create a profile row for an existing auth user by email
-- This is SECURITY DEFINER and checks that the caller is an owner (based on their profile)
CREATE OR REPLACE FUNCTION public.create_profile_for_email(
  _email text,
  _role text,
  _full_name text,
  _phone text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_owner_exists int;
BEGIN
  -- Only allow callers who are owners to use this function
  SELECT 1 INTO v_owner_exists FROM profiles WHERE id = auth.uid() AND role = 'owner' LIMIT 1;
  IF v_owner_exists IS NULL THEN
    RAISE EXCEPTION 'Only owners may create profiles for existing users';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = _email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for that email';
  END IF;

  INSERT INTO profiles (id, role, full_name, phone)
  VALUES (v_user_id, _role, _full_name, _phone)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_profile_for_email(text,text,text,text) TO authenticated;
