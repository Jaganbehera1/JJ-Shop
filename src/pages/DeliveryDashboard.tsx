import { useEffect, useState, useCallback } from 'react';
import { supabase, Order, OrderItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  Phone, 
  User, 
  MapPin, 
  ShoppingBag, 
  CheckCircle, 
  Clock3, 
  AlertCircle, 
  Copy, 
  Check,
  Truck,
  LogOut,
  Bell,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  ClipboardCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  Star,
  Timer,
  XCircle
} from 'lucide-react';

type OrderWithItems = Order & { order_items: OrderItem[] };
type PinFeedback = Record<string, { type: 'success' | 'error'; message: string }>;

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Timer,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    progress: 'w-1/4'
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    progress: 'w-1/2'
  },
  preparing: {
    label: 'Preparing',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    progress: 'w-3/4'
  },
  ready: {
    label: 'Ready for Pickup',
    icon: Truck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    progress: 'w-full'
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    progress: 'w-full'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    progress: 'w-0'
  }
};

export default function DeliveryDashboard() {
  const { user, profile, signOut } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<PinFeedback>({});
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    delivered: 0
  });

  const loadAssigned = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: initialData, error: initialError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('delivery_boy_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (initialError) throw initialError;

      let data = initialData;
      if ((!data || data.length === 0) && profile?.id && profile.id !== user.id) {
        const res = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('delivery_boy_id', profile.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
        if (res.error) throw res.error;
        data = res.data as typeof initialData;
      }

      const sortedAssigned = [...((data as OrderWithItems[]) || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(sortedAssigned);
      
      // Update stats
      const statsData = {
        total: sortedAssigned.length,
        pending: sortedAssigned.filter(o => o.status === 'pending').length,
        accepted: sortedAssigned.filter(o => o.status === 'accepted').length,
        delivered: sortedAssigned.filter(o => o.status === 'delivered').length
      };
      setStats(statsData);
    } catch (err) {
      console.error('Failed loading assigned orders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    loadAssigned();

    const channel = supabase
      .channel()
      .on('postgres_changes', { 
        table: 'orders', 
        filter: `delivery_boy_id=eq.${user.id}` 
      }, () => {
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

  // Client-side safety filter
  useEffect(() => {
    if (!user) return;
    try {
      const filtered = orders.filter(o => o.delivery_boy_id === user.id);
      if (filtered.length !== orders.length) {
        setOrders(filtered);
      }
    } catch {
      // client-side assignment filter failed
    }
  }, [orders, user]);

  const confirmDelivery = async (orderId: string, expectedPin?: string | null) => {
    const pin = window.prompt('🔑 Enter the delivery PIN shared by the customer:');
    if (pin === null) return;

    if (expectedPin && pin.trim() !== String(expectedPin)) {
      setPinFeedback((prev) => ({
        ...prev,
        [orderId]: { 
          type: 'error', 
          message: '❌ Incorrect PIN. Please ask the customer for the correct PIN.' 
        }
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (error) throw error;

      setPinFeedback((prev) => ({
        ...prev,
        [orderId]: { 
          type: 'success', 
          message: '✅ Delivery confirmed successfully! 🎉' 
        }
      }));

      try {
        localStorage.setItem('order_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('order_updated'));
      } catch {
        // ignore
      }
      
      await loadAssigned();
    } catch (err) {
      console.error('Failed to confirm delivery', err);
      setPinFeedback((prev) => ({
        ...prev,
        [orderId]: { 
          type: 'error', 
          message: '❌ Unable to confirm delivery. Please try again.' 
        }
      }));
    }
  };

  const copyPhone = async (phone?: string | null) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch {
      // ignore
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', orderId)
        .eq('delivery_boy_id', user?.id);

      if (error) throw error;

      try {
        localStorage.setItem('order_updated_at', Date.now().toString());
        window.dispatchEvent(new CustomEvent('order_updated'));
      } catch {
        // ignore
      }

      await loadAssigned();
    } catch (err) {
      console.error('Failed to accept order', err);
      alert('Failed to accept order');
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAssigned();
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

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery);
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-blue-50/30 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <Truck className="w-10 h-10 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-gray-600 mt-6 font-medium">Loading your deliveries...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/20 to-blue-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  Delivery Dashboard
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {profile?.full_name || 'Delivery Personnel'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {stats.pending + stats.accepted} Active
                </span>
              </div>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-xl">
                <Clock3 className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Accepted</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.accepted}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Delivered</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.delivered}</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-xl">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order number, customer name, or phone..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${
                  filterStatus === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 ${
                    filterStatus === key
                      ? `${config.bg} ${config.color} border-2 ${config.border}`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-16 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gray-100 rounded-full blur-2xl opacity-30"></div>
              <Package className="w-20 h-20 text-gray-400 mx-auto mb-6 relative z-10" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You have no assigned deliveries at the moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
              const totalAmount = order.order_items.reduce((sum, item) => sum + item.subtotal, 0);
              const feedback = pinFeedback[order.id];
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedOrders[order.id] || false;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* Order Header */}
                  <div 
                    className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleOrderExpand(order.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${statusConfig.bg} flex-shrink-0`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 text-sm">
                              #{order.order_number}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                            {order.status === 'pending' && order.delivery_boy_id === user?.id && (
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 animate-pulse">
                                Action Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {order.customer_name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(order.created_at)}
                            </span>
                            <span>•</span>
                            <span>{totalItems} items</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-auto lg:ml-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-xl font-bold text-emerald-600">
                            ₹{totalAmount.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderExpand(order.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            order.status === 'cancelled' 
                              ? 'bg-red-500' 
                              : 'bg-gradient-to-r from-emerald-500 to-blue-500'
                          } ${statusConfig.progress}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gradient-to-br from-gray-50 to-white">
                      {/* Feedback */}
                      {feedback && (
                        <div className={`mb-4 p-4 rounded-xl border ${
                          feedback.type === 'success' 
                            ? 'border-emerald-200 bg-emerald-50' 
                            : 'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-start gap-2">
                            {feedback.type === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm font-medium ${
                              feedback.type === 'success' ? 'text-emerald-800' : 'text-red-800'
                            }`}>
                              {feedback.message}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Left Column - Items & Details */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-semibold text-gray-900">Order Items</h4>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {order.order_items.map((item) => (
                              <div 
                                key={item.id} 
                                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                                    {item.quantity}×
                                  </span>
                                  <span className="text-sm text-gray-700">{item.item_name}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  ₹{item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Customer Details */}
                          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <User className="w-4 h-4 text-emerald-600" />
                              Customer Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Name</span>
                                <span className="font-medium text-gray-900">{order.customer_name}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Phone</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {order.customer_phone || 'Not provided'}
                                  </span>
                                  {order.customer_phone && (
                                    <button 
                                      onClick={() => copyPhone(order.customer_phone)} 
                                      className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                    >
                                      {copiedPhone === order.customer_phone ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 whitespace-pre-line text-xs">
                                  {order.delivery_address}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Actions */}
                        <div className="space-y-3">
                          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                              <Truck className="w-4 h-4 text-emerald-600" />
                              Delivery Actions
                            </div>
                            
                            {order.status === 'pending' && order.delivery_boy_id === user?.id && (
                              <button 
                                onClick={() => acceptOrder(order.id)} 
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] mb-3"
                              >
                                Accept Order
                              </button>
                            )}
                            
                            <button 
                              onClick={() => confirmDelivery(order.id, order.delivery_pin)} 
                              disabled={order.status === 'delivered'}
                              className={`w-full px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                                order.status === 'delivered'
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
                              }`}
                            >
                              {order.status === 'delivered' ? '✓ Delivered' : 'Confirm Delivery'}
                            </button>
                          </div>

                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                              Order Summary
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Items</span>
                                <span className="font-medium text-gray-900">{totalItems}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total Amount</span>
                                <span className="font-bold text-emerald-600">₹{totalAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-gray-100">
                                <span className="text-gray-600">Status</span>
                                <span className={`font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}