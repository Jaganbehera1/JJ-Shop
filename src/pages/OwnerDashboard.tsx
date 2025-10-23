import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ShopLocation } from '../lib/supabase';
import { getCurrentPosition } from '../lib/location';
import { LogOut, Package, ShoppingBag, MapPin } from 'lucide-react';
import { ItemsManagement } from '../components/owner/ItemsManagement';
import { OrdersManagement } from '../components/owner/OrdersManagement';
import DeliveryUserForm from '../components/owner/DeliveryUserForm';

export function OwnerDashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'orders'>('items');
  const [shopLocation, setShopLocation] = useState<ShopLocation | null>(null);
  const [hasShopLocation, setHasShopLocation] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);

  useEffect(() => {
    (async () => {
      if (!profile) return;

      try {
        // If we've previously set the shop location, stored in localStorage, avoid re-prompting.
        const localFlag = localStorage.getItem(`shop_location_set_${profile.id}`);
        if (localFlag) {
          setHasShopLocation(true);
          // still attempt to load the real record in background
        }

        const { data, error } = await supabase
          .from('shop_location')
          .select('*')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setShopLocation(data as ShopLocation);
          setHasShopLocation(true);
          try { localStorage.setItem(`shop_location_set_${profile.id}`, '1'); } catch { /* ignore localStorage errors */ }
        }
      } catch (error: unknown) {
        console.error('Error loading shop location:', error);
      }
    })();
  }, [profile]);

  // loadShopLocation was inlined inside useEffect; no separate function needed

  const saveShopLocation = async () => {
    if (!profile) return;

    setSettingLocation(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      const { data, error } = await supabase
        .from('shop_location')
        .upsert(
          {
            owner_id: profile.id,
            latitude,
            longitude,
            address,
          },
          { onConflict: 'owner_id' }
        )
        .select()
        .single();

      if (error) throw error;
  setShopLocation(data as ShopLocation);
  setHasShopLocation(true);
  try { localStorage.setItem(`shop_location_set_${profile.id}`, '1'); } catch { /* ignore localStorage errors */ }
      alert('Shop location set successfully!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error setting shop location:', error);
      alert(msg || 'Failed to get location. Please enable GPS.');
    } finally {
      setSettingLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JJ Ration Shop</h1>
              <p className="text-sm text-gray-600 mt-1">Owner Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              {shopLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Shop location set</span>
                </div>
              )}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

  {!(hasShopLocation || shopLocation) ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <MapPin className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set Your Shop Location
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Before you start adding items, please set your shop's GPS location.
              This will be used to calculate delivery distances for customers.
            </p>
            <button
              onClick={saveShopLocation}
              disabled={settingLocation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {settingLocation ? 'Getting Location...' : 'Set Shop Location'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('items')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === 'items'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package className="w-5 h-5" />
                Manage Items
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                View Orders
              </button>
            </div>

            {activeTab === 'items' ? (
              <div className="space-y-6">
                <ItemsManagement />
                <DeliveryUserForm />
              </div>
            ) : (
              <OrdersManagement />
            )}
          </>
        )}
      </div>
    </div>
  );
}
