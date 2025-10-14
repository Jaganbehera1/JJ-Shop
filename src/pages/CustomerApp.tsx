import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { supabase, Item, Category, ItemVariant } from '../lib/supabase';
import { ShoppingBag, User, LogOut, ShoppingCart, Search, Filter } from 'lucide-react';
import { ItemsList } from '../components/customer/ItemsList';
import { Cart } from '../components/customer/Cart';
import { Checkout } from '../components/customer/Checkout';
import { OrderHistory } from '../components/customer/OrderHistory';

export function CustomerApp() {
  const { signOut, profile } = useAuth();
  const { totalItems } = useCart();
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop');
  const [items, setItems] = useState<(Item & { category: Category; variants: ItemVariant[] })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  // const [shopLocation, setShopLocation] = useState<ShopLocation | null>(null);

  console.log('CustomerApp - showCheckout:', showCheckout);
  // console.log('CustomerApp - shopLocation:', shopLocation);

  const handleCheckout = () => {
    console.log('Setting showCheckout to true');
    setShowCheckout(true);
  };

  useEffect(() => {
    loadData();

    // Subscribe to items changes
    const itemsChannel = supabase
      .channel('customer-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        () => {
          loadData(); // Reload when items change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, []); // REMOVED THE EXTRA CLOSING BRACE

  // Polling: after an order is placed, poll loadData every 5s for 60s
  useEffect(() => {
    let intervalId: number | null = null;
    let attempts = 0;

    const startPolling = () => {
      if (intervalId !== null) return; // already polling
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
    // also check localStorage across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'order_placed_at') startPolling();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('order_placed', onOrder);
      window.removeEventListener('storage', onStorage);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, []);

  const loadData = async () => {
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

      // Check for errors individually
      if (categoriesRes.error) {
        console.error('Categories error:', categoriesRes.error);
        // Don't throw, just log and continue
      }
      
      if (itemsRes.error) {
        console.error('Items error:', itemsRes.error);
        throw itemsRes.error; // Only throw for critical errors
      }
      
      if (shopLocationRes.error && shopLocationRes.error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is acceptable
        console.error('Shop location error:', shopLocationRes.error);
      }

      setCategories(categoriesRes.data || []);
      setItems(itemsRes.data || []);
      // setShopLocation(shopLocationRes.data);

    } catch (error: unknown) {
      console.error('Error loading data:', error);

      // More specific error messages
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const e = error as Record<string, unknown>;
        const code = String(e.code ?? '');
        const msg = String(e.message ?? '');
        if (code === '42501') {
          alert('Permission denied. Please check RLS policies.');
        } else if (code === '42P01') {
          alert('Table does not exist. Please check your database setup.');
        } else {
          alert('Failed to load items: ' + msg);
        }
      } else if (error instanceof Error) {
        alert('Failed to load items: ' + error.message);
      } else {
        alert('Failed to load items');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (showCheckout) {
    return <Checkout shopLocation={null} onBack={() => setShowCheckout(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-emerald-600">Local Ration Shop</h1>
              <p className="text-sm text-gray-600 mt-1">Fresh groceries delivered</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
                <User className="w-4 h-4" />
                <span>{profile?.full_name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'shop'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Shop
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors relative ${
              activeTab === 'cart'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Cart
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5" />
            Orders
          </button>
        </div>

        {activeTab === 'shop' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ItemsList items={filteredItems} loading={loading} />
          </>
        )}

        {activeTab === 'cart' && (
          <Cart onCheckout={handleCheckout} />
        )}

        {activeTab === 'orders' && <OrderHistory />}
      </div>
    </div>
  );
}