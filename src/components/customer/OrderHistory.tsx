import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { Package, MapPin, Clock, CheckCircle, XCircle, TruckIcon } from 'lucide-react';
import { formatDistance } from '../../lib/location';
import { sortOrdersByDate, formatOrderDate } from '../../utils/orders';

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
        .get();
      
      if (error) throw error;

      // Sort orders by created_at in descending order (newest first)
      const sortedOrders = sortOrdersByDate(data || []);
      setOrders(sortedOrders as (Order & { order_items: OrderItem[] })[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'cancel' | 'delete' | null>(null);
  const [modalOrderId, setModalOrderId] = useState<string | null>(null);

  const openModal = (action: 'cancel' | 'delete', orderId: string) => {
    setModalAction(action);
    setModalOrderId(orderId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalAction(null);
    setModalOrderId(null);
  };

  const confirmModalAction = async () => {
    if (!modalAction || !modalOrderId || !user) return closeModal();
    
    try {
      // Only operate on this specific order for this specific user
      if (modalAction === 'cancel') {
        // cancelling order
        const res = await supabase
          .from('orders')
          .update({ status: 'cancelled', delivery_boy_id: null })
          .eq('id', modalOrderId)
          .eq('customer_id', user.id)
          .select();
          // cancel response handled
        if (res.error) throw res.error;
        
        // Update this specific order in local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === modalOrderId
              ? { ...order, status: 'cancelled', delivery_boy_id: null }
              : order
          )
        );
      } else if (modalAction === 'delete') {
          // deleting order
          const res = await supabase
            .from('orders')
            .delete()
            .eq('id', modalOrderId)
            .eq('customer_id', user.id)
            .select();
          // delete response handled
          if (res.error) throw res.error;
        
        // Remove just this order from local state and maintain sort order
        setOrders(prevOrders => 
          prevOrders
            .filter(order => order.id !== modalOrderId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
      }
    } catch (err) {
      console.error('Failed to perform action:', err);
      alert('Failed to perform action');
    } finally {
      closeModal();
    }
  };  useEffect(() => {
    if (!user) return;
    
    // Load orders initially
    loadOrders();

    // Subscribe to changes for this customer's orders
    const channel = supabase
      .channel()
      .on(
        'change',
        { 
          table: 'orders',
          filter: `customer_id.eq.${user.id}`
        },
        () => {
          // On any change, just reload this user's orders
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadOrders]);

  // Listen for owner edits and storage events that include a JSON payload
  useEffect(() => {
    const handleEdited = (detail?: CustomEvent) => {
      const raw =
        detail?.detail ??
        (localStorage.getItem('order_edited_payload')
          ? JSON.parse(localStorage.getItem('order_edited_payload') as string)
          : null);
      if (!raw || !raw.orderId) return;

      const orderId = String(raw.orderId);
      const changes = (raw.changes || []).map((c: { item_name?: string; oldQty?: number; newQty?: number }) => ({
        item_name: String(c.item_name || ''),
        oldQty: Number(c.oldQty || 0),
        newQty: Number(c.newQty || 0),
      }));
      const lines = changes.map((c) => `${c.item_name}: ${c.oldQty} → ${c.newQty}`);
      const message =
        lines.length > 0
          ? `Shop owner updated your order: ${lines.join('; ')}`
          : 'Shop owner updated your order';
      setOrderNotifications((prev) => ({
        ...prev,
        [orderId]: { message, changes, newTotal: raw.newTotal },
      }));

      // ✅ Properly closed block
      if (raw.serverOrder && raw.serverOrder.id === orderId) {
        try {
          const server = raw.serverOrder as Order & { order_items: OrderItem[] };
          setOrders((prev) => prev.map((o) => (o.id === orderId ? server : o)));
        } catch {
          // ignore malformed serverOrder
        }
      }

      // auto-clear after 10s
      setTimeout(() => {
        setOrderNotifications((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }, 10000);

      // reload orders
      loadOrders();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'order_edited_payload') handleEdited();
      if (e.key === 'order_updated_at') loadOrders();
    };

    const onCustom = (e: Event) => handleEdited((e as CustomEvent) ?? undefined);

    window.addEventListener('storage', onStorage);
    window.addEventListener('order_updated', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('order_updated', onCustom as EventListener);
    };
  }, [loadOrders]);


  // loadOrders is declared above using useCallback

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const getStatusMessage = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Your order is being reviewed by the shop owner';
      case 'accepted':
        return 'Your order has been accepted and will be delivered soon';
      case 'delivered':
        return 'Your order has been delivered';
      case 'cancelled':
        return 'Your order has been cancelled';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-lg text-gray-700">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No orders yet
        </h3>
        <p className="text-gray-600">Your order history will appear here</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Order History</h2>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {orderNotifications[order.id] && (
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                  <div className="font-semibold">{orderNotifications[order.id].message}</div>
                  {orderNotifications[order.id].newTotal !== undefined && (
                    <div className="text-sm text-gray-700 mt-1">New total: ₹{Number(orderNotifications[order.id].newTotal).toFixed(2)}</div>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Order #{order.order_number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 mb-4 ${getStatusColor(
                  order.status
                )}`}
              >
                {getStatusIcon(order.status)}
                <div className="flex-1">
                  <p className="font-semibold uppercase text-sm">
                    {order.status}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    {getStatusMessage(order.status)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-start gap-2 text-sm text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{order.delivery_address}</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Distance: {order.distance_km ? formatDistance(order.distance_km) : 'Not available'}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Items:</p>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {item.quantity_unit} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">
                        ₹{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                {order.delivery_boy_id && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">Delivery PIN</p>
                    <p className="font-mono text-lg text-gray-900 mt-1">{order.delivery_pin ?? '—'}</p>
                  </div>
                )}

                {/* Customer actions: Cancel (before accepted) and Delete (when pending/cancelled) */}
                <div className="mt-4 flex gap-3">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => openModal('cancel', order.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                    >
                      Cancel Order
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'cancelled') && (
                    <button
                      onClick={() => openModal('delete', order.id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                    >
                      Delete Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={modalOpen}
        title={modalAction === 'cancel' ? 'Cancel Order' : 'Delete Order'}
        description={modalAction === 'cancel' ? 'Are you sure you want to cancel this order?' : 'Delete this order? This cannot be undone.'}
        onConfirm={confirmModalAction}
        onCancel={closeModal}
        confirmLabel={modalAction === 'cancel' ? 'Cancel Order' : 'Delete Order'}
      />
    </div>
  );
}
