import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'owner' | 'customer';
  full_name: string;
  phone: string;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  image_url?: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  variants?: ItemVariant[];
};

export type ItemVariant = {
  id: string;
  item_id: string;
  quantity_unit: string;
  price: number;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  total_amount: number;
  status: 'pending' | 'accepted' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string;
  variant_id: string;
  item_name: string;
  quantity_unit: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
};

export type ShopLocation = {
  id: string;
  owner_id: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
};

export type CartItem = {
  item: Item;
  variant: ItemVariant;
  quantity: number;
};
