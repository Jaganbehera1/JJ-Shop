import { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ShopLocation } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { calculateDistance, getCurrentPosition, formatDistance } from '../../lib/location';

type CheckoutProps = {
  shopLocation: ShopLocation | null; // Make it optional
  onBack: () => void;
};

export function Checkout({ shopLocation, onBack }: CheckoutProps) {
  const { cart, totalAmount, clearCart } = useCart();
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  // Separate address fields
  const [houseNo, setHouseNo] = useState('');
  const [streetName, setStreetName] = useState('');
  const [areaLandmark, setAreaLandmark] = useState('');
  const [villageName, setVillageName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [nearbyLocation, setNearbyLocation] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please login to place an order');
      return;
    }

    if (!villageName.trim()) {
      alert('Please enter your village name');
      return;
    }

    if (!streetName.trim()) {
      alert('Please enter your street name');
      return;
    }

    if (!pinCode.trim()) {
      alert('Please enter your PIN code');
      return;
    }

    // No distance-based blocking: customers can place orders from any location.
    
    setLoading(true);
    try {
      const orderNumber = `ORD${Date.now()}`;
      // Generate 6-digit delivery PIN
      const deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();

      // Build the complete address string
      const fullAddress = [
        houseNo && `House/Flat/Shop No: ${houseNo}`,
        streetName && `Street/Road Name: ${streetName}`,
        areaLandmark && `Area/Landmark: ${areaLandmark}`,
        villageName && `Village/City: ${villageName}`,
        pinCode && `PIN Code: ${pinCode}`,
        nearbyLocation && `Nearby Location: ${nearbyLocation}`,
        latitude && longitude && `📍 GPS Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      ].filter(Boolean).join('\n');

      // Build payload using conditional spreads so fields are omitted when null
      const payload = {
        order_number: orderNumber,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: phone,
        delivery_address: fullAddress,
        total_amount: totalAmount,
        status: 'pending',
        delivery_pin: deliveryPin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(latitude !== null && longitude !== null && distance !== null
          ? { latitude, longitude, distance_km: distance }
          : {}),
      } as Record<string, unknown>;

    // debug payload logging removed

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(payload);
      const order = orderData ? orderData[0] : null;

      if (orderError) throw orderError;
      if (!order) throw new Error('Failed to create order');

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        item_id: item.item.id,
        variant_id: item.variant.id,
        item_name: item.item.name,
        quantity_unit: item.variant.quantity_unit,
        quantity: item.quantity,
        price: item.variant.price,
        subtotal: item.variant.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update user profile with full address if needed
      if (profile && fullAddress !== profile.address) {
        await supabase
          .from('profiles')
          .update({ address: fullAddress })
          .eq('id', user.id);
      }

  alert(`Order placed successfully! Your order number is ${orderNumber}. Delivery PIN: ${deliveryPin}`);
      clearCart();
      // Notify other parts of the app (and other tabs) that an order was placed
      try {
        localStorage.setItem('order_placed_at', Date.now().toString());
      } catch {
        // ignore storage errors
      }
      // Dispatch a custom event for same-tab listeners
      try {
        window.dispatchEvent(new Event('order_placed'));
      } catch {
        // ignore
      }

      onBack();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error placing order:', error);
      alert(msg || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setLatitude(lat);
      setLongitude(lng);

      // Only update the coordinates when getting location
      setLatitude(lat);
      setLongitude(lng);

      // Calculate distance if shop location is available
      if (shopLocation) {
        const dist = calculateDistance(shopLocation.latitude, shopLocation.longitude, lat, lng);
        setDistance(dist);
      } else {
        setDistance(null);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error getting location:', error);
      alert(msg || 'Failed to get location. Please enable GPS.');
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Cart
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delivery Address</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                House/Flat/Shop No
              </label>
              <input
                type="text"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter house/flat number (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street/Road Name *
              </label>
              <input
                type="text"
                required
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter street name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area/Landmark
              </label>
              <input
                type="text"
                value={areaLandmark}
                onChange={(e) => setAreaLandmark(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter area or landmark (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Village/City Name *
              </label>
              <input
                type="text"
                required
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter village or city name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Code *
              </label>
              <input
                type="text"
                required
                pattern="[0-9]{6}"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter 6-digit PIN code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nearby Location
              </label>
              <input
                type="text"
                value={nearbyLocation}
                onChange={(e) => setNearbyLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="e.g., near temple, school, etc. (optional)"
              />
            </div>

            <p className="text-sm text-gray-500">
              * Required fields
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Or use your current location</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {gettingLocation ? 'Getting Location...' : 'Get My Location'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLatitude(null); setLongitude(null); setDistance(null); }}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Clear Location
                </button>
              </div>

              {latitude && longitude && distance !== null && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700"><span className="font-semibold">Location captured:</span> {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                  <p className="text-sm text-gray-700 mt-1"><span className="font-semibold">Distance from shop:</span> <span className={distance <= 5 ? 'text-emerald-600' : 'text-red-600'}>{formatDistance(distance)}</span></p>
                  {distance > 5 && <p className="text-sm text-red-600 mt-2 font-medium">Sorry, you are outside our 5 km delivery radius.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div
                  key={`${item.item.id}-${item.variant.id}`}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {item.item.name} ({item.variant.quantity_unit}) × {item.quantity}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ₹{(item.variant.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-xl font-semibold text-gray-900">Total:</span>
              <span className="text-3xl font-bold text-emerald-600">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cart.length === 0 || !villageName.trim() || !streetName.trim() || !pinCode.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}