import { useEffect, useState, useCallback } from 'react';
import { supabase, Order, OrderItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function DeliveryDashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<(Order & { order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssigned = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
  // loading assigned for user
  // Only fetch orders explicitly assigned to this delivery user and exclude cancelled orders
  const { data: initialData, error: initialError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('delivery_boy_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (initialError) throw initialError;
      // fallback: if no orders found for auth user id, try using profile.id (in case profile/auth id mismatch)
      let data = initialData;
      if ((!data || data.length === 0) && profile?.id && profile.id !== user.id) {
  const res = await supabase.from('orders').select('*, order_items(*)').eq('delivery_boy_id', profile.id).neq('status', 'cancelled').order('created_at', { ascending: false });
        if (res.error) throw res.error;
        data = res.data as typeof initialData;
      }
  // loaded assigned orders
  setOrders((data as (Order & { order_items: OrderItem[] })[]) || []);
    } catch (err) {
      console.error('Failed loading assigned orders', err);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    loadAssigned();

    const channel = supabase
      .channel()
      .on('postgres_changes', { table: 'orders', filter: `delivery_boy_id=eq.${user.id},status=eq.accepted` }, () => {
        // defensive: reload and enforce client-side that only orders assigned to this user are shown
        loadAssigned();
      })
      .subscribe();

    const onOrderUpdated = () => loadAssigned();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'order_updated_at') loadAssigned();
    };

    window.addEventListener('order_updated', onOrderUpdated as EventListener);
    window.addEventListener('storage', onStorage as EventListener);

    return () => {
      window.removeEventListener('order_updated', onOrderUpdated as EventListener);
      window.removeEventListener('storage', onStorage as EventListener);
      supabase.removeChannel(channel);
    };
  }, [user, loadAssigned]);

  // Client-side safety: ensure `orders` really belong to the current delivery user.
  // This protects against cases where the realtime channel or adapter mis-parses filters
  // and would otherwise surface unassigned or incorrectly-assigned orders.
  useEffect(() => {
    if (!user) return;
    try {
      const filtered = orders.filter(o => o.delivery_boy_id === user.id);
      if (filtered.length !== orders.length) {
  // filtered orders client-side to assigned user
        setOrders(filtered);
      }
    } catch {
      // client-side assignment filter failed
    }
  }, [orders, user]);

  const confirmDelivery = async (orderId: string, expectedPin?: string | null) => {
    // keep prompting until correct PIN or cancel
    while (true) {
      const pin = prompt('Enter delivery PIN');
      if (pin === null) return; // cancelled
      if (expectedPin && pin !== expectedPin) {
        alert('PIN mismatch — please try again or Cancel');
        continue;
      }

      try {
        const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
        if (error) throw error;
        await loadAssigned();
        alert('Delivery confirmed');
        return;
      } catch (err) {
        console.error('Failed to confirm delivery', err);
        alert('Failed to confirm delivery');
        return;
      }
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId).eq('delivery_boy_id', user?.id);
      if (error) throw error;
      await loadAssigned();
      alert('Order accepted');
    } catch (err) {
      console.error('Failed to accept order', err);
      alert('Failed to accept order');
    }
  };

  if (loading) return <div className="py-12 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Assigned Deliveries</h2>
        <div>
          <button onClick={() => signOut()} className="text-sm text-gray-700">Logout</button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded p-8 text-center">No assigned orders</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Order #{order.order_number}</h3>
                  <p className="text-sm text-gray-600">{order.delivery_address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Status: {order.status}</p>
                  {order.status === 'pending' && order.delivery_boy_id === user?.id && (
                    <button onClick={() => acceptOrder(order.id)} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded mr-2">Accept Order</button>
                  )}
                  <button onClick={() => confirmDelivery(order.id, order.delivery_pin)} className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded">Confirm Delivery (enter PIN)</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
