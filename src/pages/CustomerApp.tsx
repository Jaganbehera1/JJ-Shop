import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase, Item, Category, ItemVariant } from '../lib/supabase';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Search, 
  Filter, 
  Menu,
  X,
  Package,
  Gift,
  Sparkles
} from 'lucide-react';
import { ItemsList } from '../components/customer/ItemsList';
import { Cart } from '../components/customer/Cart';
import { Checkout } from '../components/customer/Checkout';
import { OrderHistory } from '../components/customer/OrderHistory';

type TabType = 'shop' | 'cart' | 'orders';

const gradientColors = [
  'from-pink-500 via-red-500 to-yellow-500',
  'from-green-400 via-emerald-500 to-blue-500',
  'from-purple-500 via-pink-500 to-red-500',
  'from-blue-400 via-indigo-500 to-purple-500',
  'from-yellow-400 via-orange-500 to-red-500',
  'from-teal-400 via-cyan-500 to-blue-500'
];

export function CustomerApp() {
  const { profile, user } = useAuth();
  const { totalItems } = useCart();
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [items, setItems] = useState<(Item & { category: Category; variants: ItemVariant[] })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shopLocation, setShopLocation] = useState<import('../lib/supabase').ShopLocation | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentGradient, setCurrentGradient] = useState(0);

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  // Rotate gradient background
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGradient((prev) => (prev + 1) % gradientColors.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes, shopLocationRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('items')
          .select('*, category:categories(*), variants:item_variants(*)')
          .eq('in_stock', true)
          .order('created_at', { ascending: false }),
        supabase.from('shop_location').select('*').maybeSingle(),
      ]);

      if (itemsRes.error) {
        console.error('Items error:', itemsRes.error);
        throw itemsRes.error;
      }

      setCategories(categoriesRes.data || []);
      
      const loadedItems = itemsRes.data || [];
      const itemsWithFallbackVariants = await (async (): Promise<(Item & { category: Category; variants: ItemVariant[] })[]> => {
        try {
          const nameMap: Record<string, ItemVariant[]> = {};
          for (const it of loadedItems as (Item & { category: Category; variants: ItemVariant[] })[]) {
            if (it.variants && Array.isArray(it.variants) && it.variants.length > 0) {
              const name = (it.name || '').toString().trim().toLowerCase();
              if (name) nameMap[name] = nameMap[name] || it.variants;
            }
          }

          return (loadedItems as (Item & { category: Category; variants: ItemVariant[] })[]).map((it) => {
            if ((!it.variants || it.variants.length === 0) && it.name) {
              const match = nameMap[(it.name || '').toString().trim().toLowerCase()];
              if (match && match.length > 0) {
                return { ...it, variants: match.map((v) => ({ ...v })) };
              }
            }
            return it;
          });
        } catch {
          return loadedItems as (Item & { category: Category; variants: ItemVariant[] })[];
        }
      })();

      setItems(itemsWithFallbackVariants);
      setShopLocation((shopLocationRes && shopLocationRes.data) ? (shopLocationRes.data as import('../lib/supabase').ShopLocation) : null);

    } catch (error: unknown) {
      console.error('Error loading data:', error);
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const e = error as Record<string, unknown>;
        const code = String(e.code ?? '');
        if (code === '42501') {
          alert('Permission denied. Please check RLS policies.');
        } else if (code === '42P01') {
          alert('Table does not exist. Please check your database setup.');
        } else {
          alert('Failed to load items: ' + String(e.message ?? ''));
        }
      } else if (error instanceof Error) {
        alert('Failed to load items: ' + error.message);
      } else {
        alert('Failed to load items');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling after order placement
  useEffect(() => {
    let intervalId: number | null = null;
    let attempts = 0;

    const startPolling = () => {
      if (intervalId !== null) return;
      attempts = 0;
      intervalId = window.setInterval(() => {
        attempts += 1;
        loadData();
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
  }, [loadData]);

  useEffect(() => {
    if (!user || !profile) {
      setActiveTab('shop');
    }
    loadData();

    const itemsChannel = supabase
      .channel()
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, [profile, user, loadData]);

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  if (showCheckout) {
    return <Checkout shopLocation={shopLocation || null} onBack={() => setShowCheckout(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors[currentGradient]} opacity-10 transition-all duration-1000`} />
        <div className="absolute top-20 -left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
      </div>

      {/* Minimal Menu Bar - Only hamburger/X button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="p-2 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all duration-300"
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6 text-purple-600" />
      </button>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    JJ Handicraft
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all duration-300"
                >
                  <X className="w-5 h-5 text-purple-600" />
                </button>
              </div>
              
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => handleTabChange('shop')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'shop'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Shop
                </button>
                <button
                  onClick={() => handleTabChange('cart')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 relative ${
                    activeTab === 'cart'
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg shadow-pink-200'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-orange-50'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart
                  {totalItems > 0 && (
                    <span className="ml-auto bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </button>
                {user && profile && (
                  <button
                    onClick={() => handleTabChange('orders')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      activeTab === 'orders'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-200'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    Orders
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100/50">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-semibold shadow-lg">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {profile?.full_name || 'Guest User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{profile?.email || user?.email || 'Not signed in'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 transition-all duration-300 ${
        mobileMenuOpen ? 'opacity-50 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : ''
      }`}>
        {activeTab === 'shop' && (
          <>
            {/* Search & Filters Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 mb-6">
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categories Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Filter className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all duration-300 text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                      : 'bg-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all duration-300 text-sm ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200'
                        : 'bg-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              {!loading && (
                <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Showing {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name || ''}`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </div>
              )}
            </div>

            <ItemsList items={filteredItems} loading={loading} />
          </>
        )}

        {activeTab === 'cart' && (
          <div className="animate-in fade-in duration-300">
            <Cart onCheckout={handleCheckout} />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-in fade-in duration-300">
            <OrderHistory />
          </div>
        )}
      </div>

      {/* Floating Cart Button (Mobile) */}
      {activeTab !== 'cart' && totalItems > 0 && (
        <button
          onClick={() => handleTabChange('cart')}
          className="lg:hidden fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white p-3.5 rounded-2xl shadow-2xl shadow-purple-300/50 hover:shadow-purple-400/50 transition-all duration-300 transform hover:scale-110 z-30 group"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-bounce">
              {totalItems}
            </span>
          </div>
        </button>
      )}

      {/* Footer Decorative */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-50" />
    </div>
  );
}