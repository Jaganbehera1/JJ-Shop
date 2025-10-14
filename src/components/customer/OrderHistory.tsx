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

  const loadOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
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
    if (!modalAction || !modalOrderId) return closeModal();
    try {
      if (modalAction === 'cancel') {
        const { error } = await supabase.from('orders').update({ status: 'cancelled', delivery_boy_id: null }).eq('id', modalOrderId);
        if (error) throw error;
      } else if (modalAction === 'delete') {
        const { error } = await supabase.from('orders').delete().eq('id', modalOrderId);
        if (error) throw error;
      }
      try {
        localStorage.setItem('order_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('order_updated'));
      } catch (e) {
        console.debug('Failed to signal order change', e);
      }
      await loadOrders();
    } catch (err) {
      console.error('Failed to perform action', err);
      alert('Failed to perform action');
    } finally {
      closeModal();
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();

      const channel = supabase
        .channel('customer_orders_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loadOrders]);

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
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading orders...</div>
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
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Order #{order.order_number}
                  </h3>
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
                  Distance: {formatDistance(order.distance_km)}
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
