import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { sortOrdersByDate } from '../../utils/orders';
import { Package, MapPin, Phone, User, Clock, CheckCircle, XCircle, TruckIcon } from 'lucide-react';
import { formatDistance } from '../../lib/location';

export function OrdersManagement() {
  const [orders, setOrders] = useState<(Order & { order_items: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'delivered' | 'cancelled'>('all');

  // Edit-quantities state: which order is being edited, current edited quantities, and variant stock map
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  const [deliveryBoys, setDeliveryBoys] = useState<{ id: string; full_name: string; phone?: string }[]>([]);
  // cache for profile names fetched on-demand when an order references a delivery_boy_id
  const [profileCache, setProfileCache] = useState<Record<string, { full_name?: string; phone?: string }>>({});
  const loadDeliveryBoys = useCallback(async () => {
    try {
      const res = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'delivery').get();
      if (res.error) throw res.error;
      const list = (res.data as Array<{ id: string; full_name: string; phone?: string }>) || [];
  // fetched deliveryBoys
      setDeliveryBoys(list);
    } catch (e) {
      console.error('Failed to load delivery boys', e);
    }
  }, []);

const loadOrders = useCallback(async () => {
  setLoading(true);
  try {
    const res = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .get();
    
    if (res.error) throw res.error;
    
    // Always sort by newest first, regardless of database order
    const sortedOrders = sortOrdersByDate(res.data || []);
    setOrders(sortedOrders);
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
      .channel()
      .on(
        'postgres_changes',
        { table: 'orders' },
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

      const upd = await supabase.from('orders').update(payload).eq('id', orderId).get();
      if (upd.error) throw upd.error;
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
        const res = await supabase.from('profiles').select('id, full_name, phone').in('id', ids).get();
        if (res.error) throw res.error;
        const next = { ...profileCache };
            ((res.data as Array<{ id: string; full_name?: string; phone?: string }>) || []).forEach((p) => {
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
  const res = await supabase.from('orders').update({ delivery_boy_id: deliveryBoyId }).eq('id', orderId).get();
  if (res.error) throw res.error;
      await loadOrders();
      // notify other tabs/components that an order was updated/assigned
      try {
        localStorage.setItem('order_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('order_updated'));
      } catch {
        // ignore signaling errors
      }
    } catch (err) {
      console.error('Failed to assign delivery boy', err);
      alert('Failed to assign delivery boy');
    }
  };

  // Begin edit-quantities helpers
  const startEditingOrder = async (order: Order & { order_items: OrderItem[] }) => {
    setEditingOrderId(order.id);
    const qtys: Record<string, number> = {};
    order.order_items.forEach((it) => { qtys[it.id] = it.quantity; });
    setEditedQuantities(qtys);

    // Owner edit: we do not enforce or fetch variant stock here. Owner can set quantities arbitrarily.
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setEditedQuantities({});
    // variant stock is not used for owner edits
  };

  const changeEditedQuantity = (orderItemId: string, value: number) => {
    setEditedQuantities((prev) => ({ ...prev, [orderItemId]: Math.max(0, Math.floor(value)) }));
  };

  const saveEditedQuantities = async (order: Order & { order_items: OrderItem[] }) => {
    if (!editingOrderId) return;
    try {
      // Build updates for order_items: cap quantities to variantStock where available
      const updates: Array<{ id: string; quantity: number; subtotal: number }> = [];
      let newTotal = 0;
      const changes: Array<{ item_id: string; item_name: string; oldQty: number; newQty: number }> = [];
      for (const it of order.order_items) {
    const requested = editedQuantities[it.id] ?? it.quantity;
    // Owners may override stock limits; do not cap by variantStock when editing as owner
    const finalQty = requested;
        const subtotal = finalQty * it.price;
        updates.push({ id: it.id, quantity: finalQty, subtotal });
        newTotal += subtotal;
        if (finalQty !== it.quantity) {
          changes.push({ item_id: it.id, item_name: it.item_name, oldQty: it.quantity, newQty: finalQty });
        }
      }

      // perform updates in a transaction-like manner: update each order_item and then order total
      for (const u of updates) {
  const res = (await supabase.from('order_items').update({ quantity: u.quantity, subtotal: u.subtotal }).eq('id', u.id).select('id,quantity,subtotal')) as { data?: unknown; error?: unknown };
  if (res.error) throw res.error;
      }

  const resOrderUpdate = (await supabase.from('orders').update({ total_amount: newTotal }).eq('id', order.id).select('id,total_amount')) as { data?: unknown; error?: unknown };
  if (resOrderUpdate.error) throw resOrderUpdate.error;

      // Update local state immediately so owner UI reflects changes without waiting for reload
      setOrders((prev) => prev.map((o) => {
        if (o.id !== order.id) return o;
        const updatedItems = o.order_items.map((it) => {
          const upd = updates.find((u) => u.id === it.id);
          return upd ? { ...it, quantity: upd.quantity, subtotal: upd.subtotal } : it;
        });
        return { ...o, order_items: updatedItems, total_amount: newTotal };
      }));

      // reload orders in background and signal other tabs with a detailed payload including server-side order
      let serverOrder: unknown = null;
      try {
        const { data: serverData } = await supabase.from('orders').select('*, order_items(*)').eq('id', order.id).maybeSingle();
        serverOrder = serverData || null;
      } catch (err) {
        console.warn('Failed to fetch server order after update', String(err));
      }
      loadOrders().catch(() => {});
      try {
        const payload = { orderId: order.id, changedAt: Date.now(), note: 'owner_edited_quantities', changes, newTotal, serverOrder };
        localStorage.setItem('order_updated_at', Date.now().toString());
        // store a JSON payload customers can use to render details
        localStorage.setItem('order_edited_payload', JSON.stringify(payload));
        // dispatch a dedicated event for edited-order notifications and a generic order_updated event
        window.dispatchEvent(new CustomEvent('order_edited', { detail: payload }));
        window.dispatchEvent(new CustomEvent('order_updated', { detail: payload }));
      } catch (err) {
        console.warn('Failed to emit order_edited payload', String(err));
      }

      cancelEditing();
    } catch (e) {
      let msg = '';
      try { msg = JSON.stringify(e); } catch { msg = String(e); }
      console.error('Failed to save edited quantities', msg);
      alert('Failed to save quantities: ' + (msg || 'unknown error'));
    }
  };
  // End edit-quantities helpers

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
        // notify other tabs/components that an order status changed
        try {
          localStorage.setItem('order_updated_at', Date.now().toString());
          window.dispatchEvent(new CustomEvent('order_updated'));
        } catch {
          // ignore signaling errors
        }
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

      {/* delivery users count hidden in production */}

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
                    {order.created_at 
                      ? new Date(order.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'Processing...'}
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
                      Distance: {order.distance_km ? formatDistance(order.distance_km) : 'Not available'}
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
                          {item.quantity_unit} × {
                            editingOrderId === order.id ? (
                              <input
                                type="number"
                                min={0}
                                value={editedQuantities[item.id] ?? item.quantity}
                                onChange={(e) => changeEditedQuantity(item.id, Number(e.target.value))}
                                className="w-20 border rounded px-2 py-1"
                              />
                            ) : (
                              item.quantity
                            )
                          }
                        </p>
                        {/* when owner edits, do not display available stock */}
                      </div>
                      <p className="font-semibold text-gray-900">
                        ₹{(editingOrderId === order.id ? ((editedQuantities[item.id] ?? item.quantity) * item.price) : item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {order.status !== 'delivered' && (
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
                  <div className="flex gap-3 mt-4">
                    {editingOrderId === order.id ? (
                      <>
                        <button
                          onClick={() => saveEditedQuantities(order)}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditingOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Edit Quantities
                      </button>
                    )}
                  </div>
                </div>
              )}

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
