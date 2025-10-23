import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { Package, MapPin, Clock, CheckCircle, XCircle, TruckIcon } from 'lucide-react';
import { formatDistance } from '../../lib/location';

export function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<(Order & { order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState<Record<string, { message: string; changes?: Array<{ item_name: string; oldQty: number; newQty: number }>; newTotal?: number }>>({});

  const loadOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all orders for this customer sorted by created_at in descending order (newest first)
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort orders again in memory to ensure consistent sorting
      const sortedOrders = [...(data || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(sortedOrders as (Order & { order_items: OrderItem[] })[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user]);