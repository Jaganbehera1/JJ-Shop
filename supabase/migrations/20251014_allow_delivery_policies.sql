-- Allow delivery users to view and update assigned orders

-- 1) Allow delivery users to SELECT orders that are assigned to them
DROP POLICY IF EXISTS "Delivery can view assigned orders" ON orders;
CREATE POLICY "Delivery can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    delivery_boy_id = auth.uid()
  );

-- 2) Allow delivery users to mark orders as delivered (update status to 'delivered')
DROP POLICY IF EXISTS "Delivery can mark delivered" ON orders;
CREATE POLICY "Delivery can mark delivered"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    delivery_boy_id = auth.uid()
  )
  WITH CHECK (
    delivery_boy_id = auth.uid() AND status = 'delivered'
  );

-- Note: Run this migration in Supabase SQL editor. It will allow authenticated delivery users
-- to read records assigned to them and to update the order status to 'delivered'.
