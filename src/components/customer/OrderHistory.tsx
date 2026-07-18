import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, OrderItem } from '../../lib/supabase';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TruckIcon, 
  ShoppingBag, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Receipt,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Gift,
  Star,
  Award,
  Zap,
  Heart,
  TrendingUp
} from 'lucide-react';
import { formatDistance } from '../../lib/location';

type OrderWithItems = Order & { order_items: OrderItem[] };

type OrderNotification = {
  message: string;
  changes?: Array<{ item_name: string; oldQty: number; newQty: number }>;
  newTotal?: number;
};

type ExpandedOrders = Record<string, boolean>;

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    progress: 'w-1/4',
    gradient: 'from-yellow-400 to-orange-500'
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    progress: 'w-1/2',
    gradient: 'from-blue-400 to-indigo-500'
  },
  preparing: {
    label: 'Preparing',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    progress: 'w-3/4',
    gradient: 'from-purple-400 to-pink-500'
  },
  ready: {
    label: 'Ready for Pickup',
    icon: TruckIcon,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    progress: 'w-full',
    gradient: 'from-emerald-400 to-teal-500'
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    progress: 'w-full',
    gradient: 'from-green-400 to-emerald-500'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    progress: 'w-0',
    gradient: 'from-red-400 to-orange-500'
  }
};

export function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<ExpandedOrders>({});
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [orderNotifications, setOrderNotifications] = useState<Record<string, OrderNotification>>({});
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
    cancelled: 0
  });

  const loadOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (error) throw error;

      const customerOrders = (data || []).filter((order) => order.customer_id === user.id);
      const sortedOrders = [...customerOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(sortedOrders as OrderWithItems[]);
      
      // Update stats
      const statsData = {
        total: sortedOrders.length,
        delivered: sortedOrders.filter(o => o.status === 'delivered').length,
        pending: sortedOrders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready').length,
        cancelled: sortedOrders.filter(o => o.status === 'cancelled').length
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const copyDeliveryPin = (pin: string) => {
    navigator.clipboard.writeText(pin).then(() => {
      setCopiedPin(pin);
      setTimeout(() => setCopiedPin(null), 2000);
    });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusProgress = (status: string) => {
    const config = getStatusConfig(status);
    return config.progress || 'w-0';
  };

  useEffect(() => {
    loadOrders();

    const handleOrderUpdate = () => {
      loadOrders();
    };

    window.addEventListener('order_placed', handleOrderUpdate);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'order_placed_at') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('order_placed', handleOrderUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <ShoppingBag className="w-10 h-10 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-gray-600 mt-6 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          Loading your orders...
        </p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-16 text-center border border-white/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50" />
        <div className="absolute top-10 right-10 animate-float">
          <Sparkles className="w-8 h-8 text-purple-300 opacity-30" />
        </div>
        <div className="absolute bottom-10 left-10 animate-float-delayed">
          <Sparkles className="w-8 h-8 text-pink-300 opacity-30" />
        </div>
        <div className="relative z-10">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full blur-3xl opacity-20 animate-pulse" />
            <div className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full shadow-2xl shadow-purple-200">
              <ShoppingBag className="w-24 h-24 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mt-6 mb-2">No orders yet</h3>
          <p className="text-gray-500 text-lg">Your order history is empty</p>
          <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Start shopping to see your orders here!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-semibold px-10 py-4 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200 transform hover:scale-[1.02] inline-flex items-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse Items
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-purple-600" />
            Order History
          </h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 text-purple-600 hover:text-white bg-purple-50 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 rounded-2xl transition-all duration-300 disabled:opacity-50 border-2 border-purple-200 hover:border-transparent"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-200">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-yellow-200">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-200">
              <XCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          const StatusIcon = statusConfig.icon;
          const isExpanded = expandedOrders[order.id] || false;
          const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
          const notification = orderNotifications[order.id];

          return (
            <div
              key={order.id}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20 overflow-hidden group"
            >
              {/* Order Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-300"
                onClick={() => toggleOrderExpand(order.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status Icon */}
                    <div className={`p-3 rounded-2xl ${statusConfig.bg} flex-shrink-0 shadow-lg`}>
                      <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-3 py-1 rounded-xl">
                          #{order.order_number}
                        </span>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                          {statusConfig.label}
                        </span>
                        {order.status === 'delivered' && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {formatDate(order.created_at)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="font-medium text-gray-700">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="font-semibold text-gray-900">
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse & Actions */}
                  <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    {order.delivery_pin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyDeliveryPin(order.delivery_pin!);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 hover:bg-purple-100 rounded-xl transition-all duration-300 text-xs font-medium text-gray-700 hover:text-purple-700 backdrop-blur-sm"
                      >
                        {copiedPin === order.delivery_pin ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            PIN
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOrderExpand(order.id);
                      }}
                      className="p-2 hover:bg-purple-100 rounded-xl transition-all duration-300 group/btn"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-purple-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 group-hover/btn:text-purple-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full h-2 bg-gray-100/80 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${statusConfig.gradient}`}
                      style={{ width: order.status === 'cancelled' ? '0%' : 
                               order.status === 'pending' ? '25%' :
                               order.status === 'confirmed' ? '50%' :
                               order.status === 'preparing' ? '75%' :
                               order.status === 'ready' || order.status === 'delivered' ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100/50 p-6 bg-gradient-to-br from-gray-50/50 to-white">
                  {/* Notification */}
                  {notification && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-emerald-800 font-medium">{notification.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-500" />
                      Order Items
                    </h4>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div
                          key={`${order.id}-${item.id}`}
                          className="flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:shadow-md group/item"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-xl">
                              {item.quantity}×
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover/item:text-purple-600 transition-colors">
                                {item.item_name}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {item.quantity_unit}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap ml-2 bg-gray-50 px-3 py-1 rounded-xl">
                            ₹{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Details Footer */}
                  <div className="mt-4 pt-4 border-t-2 border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-purple-400" />
                        Order Total
                      </p>
                      <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ₹{order.total_amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
                        Items
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {totalItems}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        Status
                      </p>
                      <p className={`text-sm font-semibold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.delivery_address && (
                    <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition-all duration-300">
                      <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        Delivery Address
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {order.delivery_address}
                      </p>
                    </div>
                  )}

                  {/* Delivery PIN */}
                  {order.delivery_pin && (
                    <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-600 font-medium">Delivery PIN:</span>
                        <span className="font-mono font-bold text-purple-600 text-sm tracking-wider bg-white px-3 py-1 rounded-xl">
                          {order.delivery_pin}
                        </span>
                      </div>
                      <button
                        onClick={() => copyDeliveryPin(order.delivery_pin!)}
                        className="text-purple-600 hover:text-purple-700 text-xs font-medium flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl hover:shadow-md transition-all duration-300"
                      >
                        {copiedPin === order.delivery_pin ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && selectedOrder && (
        <ConfirmModal
          title="Order Details"
          message={`Order #${selectedOrder.order_number}`}
          onConfirm={() => setShowConfirmModal(false)}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }
        .animate-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}