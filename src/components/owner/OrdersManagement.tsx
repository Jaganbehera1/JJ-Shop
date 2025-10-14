import { useState, useEffect, useCallback } from 'react';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { Package, MapPin, Phone, User, Clock, CheckCircle, XCircle, TruckIcon } from 'lucide-react';
import { formatDistance } from '../../lib/location';

export function OrdersManagement() {
  const [orders, setOrders] = useState<(Order & { order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'delivered' | 'cancelled'>('all');

  const [deliveryBoys, setDeliveryBoys] = useState<{ id: string; full_name: string; phone?: string }[]>([]);
  // cache for profile names fetched on-demand when an order references a delivery_boy_id
  const [profileCache, setProfileCache] = useState<Record<string, { full_name?: string; phone?: string }>>({});
  const loadDeliveryBoys = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'delivery');
      const list = (data as Array<{ id: string; full_name: string; phone?: string }>) || [];
      console.debug('[OrdersManagement] fetched deliveryBoys:', list);
      setDeliveryBoys(list);
    } catch (e) {
      console.error('Failed to load delivery boys', e);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      // ensure delivery users list is refreshed whenever orders load
      try {
        await loadDeliveryBoys();
      } catch (e) {
        console.warn('Failed to refresh delivery users after loading orders', e);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [loadDeliveryBoys]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Poll for new orders when an order is placed (same-tab and cross-tab)
  useEffect(() => {
    let intervalId: number | null = null;
    let attempts = 0;

    const startPolling = () => {
      if (intervalId !== null) return;
      attempts = 0;
      intervalId = window.setInterval(() => {
        attempts += 1;
        loadOrders();
        if (attempts >= 12 && intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 5000);
    };

    const onOrder = () => startPolling();
    window.addEventListener('order_placed', onOrder);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'order_placed_at') startPolling();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('order_placed', onOrder);
      window.removeEventListener('storage', onStorage);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [loadOrders]);


  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      // if cancelling, also clear any assigned delivery boy so they don't see the cancelled order
      const payload: Record<string, unknown> = { status };
      if (status === 'cancelled') {
        (payload as Record<string, unknown>).delivery_boy_id = null;
      }

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };
  useEffect(() => {
    // initial load and listen for cross-tab / component events to refresh list
    loadDeliveryBoys();

    const onCreated = () => loadDeliveryBoys();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'delivery_user_created_at') loadDeliveryBoys();
    };

    window.addEventListener('delivery_user_created', onCreated as EventListener);
    window.addEventListener('storage', onStorage as EventListener);
    return () => {
      window.removeEventListener('delivery_user_created', onCreated as EventListener);
      window.removeEventListener('storage', onStorage as EventListener);
    };
  }, [loadDeliveryBoys]);

  // If some orders reference a delivery_boy_id that's not present in deliveryBoys list,
  // fetch those individual profiles and cache them so the UI can display the assigned name.
  useEffect(() => {
    const missingIds = new Set<string>();
    orders.forEach((o) => {
      if (o.delivery_boy_id && !deliveryBoys.find((d) => d.id === o.delivery_boy_id) && !profileCache[o.delivery_boy_id]) {
        missingIds.add(o.delivery_boy_id);
      }
    });

    if (missingIds.size === 0) return;

    // fetch missing profiles in a single query
    const ids = Array.from(missingIds);
    (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids);
        if (error) throw error;
        const next = { ...profileCache };
            (data as Array<{ id: string; full_name?: string; phone?: string }> || []).forEach((p) => {
              next[p.id] = { full_name: p.full_name, phone: p.phone };
            });
        setProfileCache(next);
      } catch (e) {
        console.warn('Failed to fetch missing delivery profile(s)', e);
      }
    })();
  }, [orders, deliveryBoys, profileCache]);

        // When profileCache gains entries, merge them into deliveryBoys so the select dropdown shows them
        useEffect(() => {
      const cachedProfiles = Object.entries(profileCache).map(([id, v]) => ({ id, full_name: v.full_name || '', phone: v.phone || undefined }));
          if (cachedProfiles.length === 0) return;
          // add any cached profiles that aren't already in deliveryBoys
          const existingIds = new Set(deliveryBoys.map((d) => d.id));
          const toAdd = cachedProfiles.filter((p) => !existingIds.has(p.id));
          if (toAdd.length > 0) {
            setDeliveryBoys((prev) => [...prev, ...toAdd]);
          }
        }, [profileCache, deliveryBoys]);

  const assignDeliveryBoy = async (orderId: string, deliveryBoyId: string | null) => {
    try {
      const { error } = await supabase.from('orders').update({ delivery_boy_id: deliveryBoyId }).eq('id', orderId);
      if (error) throw error;
      await loadOrders();
    } catch (err) {
      console.error('Failed to assign delivery boy', err);
      alert('Failed to assign delivery boy');
    }
  };

  const tryMarkDeliveredWithPin = async (orderId: string, expectedPin?: string | null) => {
    const pin = prompt('Enter 6-digit delivery PIN to confirm delivery');
    if (!pin) return;
    if (expectedPin && pin !== expectedPin) {
      alert('PIN mismatch');
      return;
    }

    await updateOrderStatus(orderId, 'delivered');
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((order) => order.status === filter);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
        return 'bg-blue-100 text-blue-700';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'accepted':
        return <TruckIcon className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'accepted', 'delivered', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* DEBUG: show fetched delivery boys */}
      <div className="mb-4 text-sm text-gray-600">
        <strong>Delivery users fetched:</strong> {deliveryBoys.length}
        {deliveryBoys.length > 0 && (
          <div className="mt-1">
            {deliveryBoys.slice(0, 5).map((d) => (
              <div key={d.id} className="inline-block mr-3">{d.full_name || d.phone}</div>
            ))}
          </div>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No {filter !== 'all' ? filter : ''} orders
          </h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Orders will appear here when customers place them'
              : `No ${filter} orders at the moment`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <span
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer</p>
                    <p className="text-sm text-gray-900">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-sm text-gray-900">{order.customer_phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                    <p className="text-sm text-gray-900">{order.delivery_address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Distance: {formatDistance(order.distance_km)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Order Items:</p>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity_unit} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ₹{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Delivery PIN</p>
                    <p className="font-mono text-lg text-gray-900">{order.delivery_pin ?? '—'}</p>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm text-gray-600">Assign Delivery Boy</label>
                    <select
                      value={order.delivery_boy_id ?? ''}
                      onChange={(e) => assignDeliveryBoy(order.id, e.target.value || null)}
                      className="mt-1 w-full border rounded px-3 py-2"
                    >
                      <option value="">Unassigned</option>
                      {deliveryBoys.map((db) => (
                        <option key={db.id} value={db.id}>{db.full_name || db.phone}</option>
                      ))}
                    </select>
                    {order.delivery_boy_id && (
                      <div className="mt-2 text-sm text-gray-700">
                        Assigned to: {
                          deliveryBoys.find(db => db.id === order.delivery_boy_id)?.full_name ||
                          deliveryBoys.find(db => db.id === order.delivery_boy_id)?.phone ||
                          'Unknown'
                        }
                      </div>
                    )}
                  </div>

                  <div className="w-48">
                    <button
                      onClick={() => tryMarkDeliveredWithPin(order.id, order.delivery_pin)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                    >
                      Deliver (PIN)
                    </button>
                  </div>
                </div>
              </div>

              {(order.status === 'pending') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => updateOrderStatus(order.id, 'accepted')}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept Order
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Cancel Order
                  </button>
                </div>
              )}

              {(!order.delivery_boy_id && order.status === 'accepted') && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Delivered
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
