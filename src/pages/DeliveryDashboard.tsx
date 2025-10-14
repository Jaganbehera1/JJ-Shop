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
      console.debug('[DeliveryDashboard] loading assigned for user.id=', user.id, 'profile?.id=', profile?.id);
  const { data: initialData, error: initialError } = await supabase.from('orders').select('*, order_items(*)').eq('delivery_boy_id', user.id).eq('status', 'accepted').neq('status', 'delivered').order('created_at', { ascending: false });
  if (initialError) throw initialError;
      // fallback: if no orders found for auth user id, try using profile.id (in case profile/auth id mismatch)
      let data = initialData;
      if ((!data || data.length === 0) && profile?.id && profile.id !== user.id) {
        console.debug('[DeliveryDashboard] no orders for user.id, trying profile.id=', profile.id);
        const res = await supabase.from('orders').select('*, order_items(*)').eq('delivery_boy_id', profile.id).eq('status', 'accepted').neq('status', 'delivered').order('created_at', { ascending: false });
        if (res.error) throw res.error;
        data = res.data as typeof initialData;
      }
      console.debug('[DeliveryDashboard] loaded assigned orders:', data);
      setOrders(data || []);
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
      .channel('delivery_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `delivery_boy_id=eq.${user.id},status=eq.accepted` }, () => {
        loadAssigned();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadAssigned]);

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

  if (loading) return <div className="py-12 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Assigned Deliveries</h2>
        <div>
          <button onClick={() => signOut()} className="text-sm text-gray-700">Logout</button>
        </div>
      </div>

      {/* DEBUG: show auth/profile ids so we can detect mismatches */}
      <div className="mb-4 text-sm text-gray-600">
        <div>Auth user id: <span className="font-mono">{user?.id}</span></div>
        <div>Profile id: <span className="font-mono">{profile?.id ?? '—'}</span></div>
        <div>Profile role: <span className="font-mono">{profile?.role ?? '—'}</span></div>
        <div>Assigned orders fetched: <span className="font-mono">{orders.length}</span></div>
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
