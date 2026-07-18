import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, 
  Package, 
  ShoppingBag, 
  Store, 
  Users, 
  TrendingUp, 
  Award,
  Bell,
  Settings,
  ChevronDown,
  BarChart3,
  Truck,
  Gift,
  Sparkles,
  Zap,
  Clock,
  CheckCircle
} from 'lucide-react';
import { ItemsManagement } from '../components/owner/ItemsManagement';
import { OrdersManagement } from '../components/owner/OrdersManagement';
import DeliveryUserForm from '../components/owner/DeliveryUserForm';

type TabType = 'items' | 'orders' | 'delivery';

export function OwnerDashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredToday: 0
  });

  // Simulate stats (in real app, fetch from API)
  useEffect(() => {
    // This would be replaced with actual API calls
    setStats({
      totalItems: 156,
      totalOrders: 89,
      pendingOrders: 12,
      deliveredToday: 7
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  const tabs = [
    { id: 'items', label: 'Manage Items', icon: Package, color: 'from-emerald-500 to-teal-500' },
    { id: 'orders', label: 'View Orders', icon: ShoppingBag, color: 'from-purple-500 to-pink-500' },
    { id: 'delivery', label: 'Delivery Users', icon: Truck, color: 'from-blue-500 to-indigo-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-xl border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl shadow-lg shadow-purple-200">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                  JJ Handicraft
                </h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Owner Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button className="p-2 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all duration-300 relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-ping" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-2xl transition-all duration-300 group"
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-purple-200 transform group-hover:scale-105 transition-transform duration-300">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    {profile?.full_name?.split(' ')[0] || 'Owner'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100/50">
                      <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Owner'}</p>
                      <p className="text-xs text-gray-500">{profile?.email || 'owner@jjhandicraft.com'}</p>
                      <p className="text-xs text-purple-600 font-medium mt-1">Shop Owner</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalItems}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-200">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingOrders}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-yellow-200">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Delivered Today</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.deliveredToday}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl shadow-lg shadow-emerald-200">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 whitespace-nowrap
                  ${isActive 
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-purple-200 transform scale-105` 
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white/90 hover:shadow-lg'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {tab.label}
                {isActive && <Sparkles className="w-3 h-3 text-white animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="animate-in fade-in duration-300">
          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Manage Items</h2>
                    <p className="text-sm text-gray-500">Add, edit, or remove items from your inventory</p>
                  </div>
                </div>
                <ItemsManagement />
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Delivery Personnel</h2>
                    <p className="text-sm text-gray-500">Create and manage delivery user accounts</p>
                  </div>
                </div>
                <DeliveryUserForm />
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
                  <p className="text-sm text-gray-500">View and manage all customer orders</p>
                </div>
              </div>
              <OrdersManagement />
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Delivery Management</h2>
                  <p className="text-sm text-gray-500">Create and manage delivery personnel accounts</p>
                </div>
              </div>
              <DeliveryUserForm />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-4 bg-white/30 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-600">Powered by JJ Handicraft</span>
            </div>
            <div className="w-px h-6 bg-gray-300/50" />
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-600">Quality Since 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}