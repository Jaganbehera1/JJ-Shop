-- Add delivery fields to orders for delivery PIN and assigned delivery boy
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_pin varchar(6),
ADD COLUMN IF NOT EXISTS delivery_boy_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy_id ON public.orders(delivery_boy_id);
