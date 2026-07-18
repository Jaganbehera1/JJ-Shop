import { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ShopLocation } from '../../lib/supabase';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  Home, 
  Map, 
  Navigation, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Gift,
  Shield,
  Clock,
  Truck,
  Star,
  CreditCard,
  Wallet,
  Zap,
  ShoppingBag,
  Heart
} from 'lucide-react';
import { calculateDistance, getCurrentPosition, formatDistance } from '../../lib/location';
import { AuthForm } from '../AuthForm';

type CheckoutProps = {
  shopLocation: ShopLocation | null;
  onBack: () => void;
};

type FormErrors = {
  fullName?: string;
  phone?: string;
  streetName?: string;
  villageName?: string;
  pinCode?: string;
};

export function Checkout({ shopLocation, onBack }: CheckoutProps) {
  const { cart, totalAmount, clearCart } = useCart();
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [houseNo, setHouseNo] = useState('');
  const [streetName, setStreetName] = useState('');
  const [areaLandmark, setAreaLandmark] = useState('');
  const [villageName, setVillageName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [nearbyLocation, setNearbyLocation] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{ number: string; pin: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Load address from profile if available
  useEffect(() => {
    if (profile?.address) {
      const lines = profile.address.split('\n');
      const parsed: Record<string, string> = {};
      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          parsed[key] = value;
        }
      });
      setHouseNo(parsed['House/Flat/Shop No'] || '');
      setStreetName(parsed['Street/Road Name'] || '');
      setAreaLandmark(parsed['Area/Landmark'] || '');
      setVillageName(parsed['Village/City'] || '');
      setPinCode(parsed['PIN Code'] || '');
      setNearbyLocation(parsed['Nearby Location'] || '');
    }
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!fullName.trim() || fullName.length < 2) {
      newErrors.fullName = 'Please enter your full name (minimum 2 characters)';
      isValid = false;
    }

    if (!phone.trim() || !/^[0-9]{10}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    if (!streetName.trim()) {
      newErrors.streetName = 'Street name is required';
      isValid = false;
    }

    if (!villageName.trim()) {
      newErrors.villageName = 'Village/City name is required';
      isValid = false;
    }

    if (!pinCode.trim() || !/^[0-9]{6}$/.test(pinCode)) {
      newErrors.pinCode = 'Please enter a valid 6-digit PIN code';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFieldTouch = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Please login to place an order');
      return;
    }

    if (!agreeToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    if (!validateForm()) {
      const allTouched: Record<string, boolean> = {};
      Object.keys(errors).forEach(key => allTouched[key] = true);
      setTouched(allTouched);
      return;
    }

    setLoading(true);
    try {
      const orderNumber = `ORD${Date.now().toString().slice(-8)}`;
      const deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();

      const fullAddress = [
        houseNo && `🏠 House/Flat/Shop: ${houseNo}`,
        streetName && `📍 Street: ${streetName}`,
        areaLandmark && `🏷️ Area/Landmark: ${areaLandmark}`,
        villageName && `🏘️ Village/City: ${villageName}`,
        pinCode && `📮 PIN: ${pinCode}`,
        nearbyLocation && `📌 Nearby: ${nearbyLocation}`,
        latitude && longitude && `🌐 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      ].filter(Boolean).join('\n');

      const payload = {
        order_number: orderNumber,
        customer_id: user.id,
        customer_name: fullName,
        customer_phone: phone,
        delivery_address: fullAddress,
        total_amount: totalAmount,
        status: 'pending',
        delivery_pin: deliveryPin,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(latitude !== null && longitude !== null && distance !== null
          ? { latitude, longitude, distance_km: distance }
          : {}),
      };

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

      if (profile && fullAddress !== profile.address) {
        await supabase
          .from('profiles')
          .update({ address: fullAddress })
          .eq('id', user.id);
      }

      setOrderDetails({ number: orderNumber, pin: deliveryPin });
      setOrderPlaced(true);
      clearCart();

      try {
        localStorage.setItem('order_placed_at', Date.now().toString());
      } catch { /* ignore */ }
      
      try {
        window.dispatchEvent(new Event('order_placed'));
      } catch { /* ignore */ }

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

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium group transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </button>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Login to place your order</h2>
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Your cart is saved. Sign in or create an account to continue.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <AuthForm mode="customer" />
          </div>
        </div>
      </div>
    );
  }

  if (orderPlaced && orderDetails) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 text-center border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50" />
          
          {/* Decorative elements */}
          <div className="absolute top-10 right-10 animate-float">
            <Sparkles className="w-8 h-8 text-purple-300 opacity-30" />
          </div>
          <div className="absolute bottom-10 left-10 animate-float-delayed">
            <Sparkles className="w-8 h-8 text-pink-300 opacity-30" />
          </div>
          
          <div className="relative z-10">
            <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200 animate-pulse">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Order Placed Successfully! 🎉
            </h2>
            <p className="text-gray-600 text-lg mb-6">Thank you for your order! We'll notify you when it's ready.</p>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 max-w-md mx-auto border border-gray-200 shadow-lg">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-mono font-bold text-gray-900 text-lg">{orderDetails.number}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Delivery PIN</span>
                  <span className="font-mono font-bold text-purple-600 bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-200">
                    {orderDetails.pin}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6 flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-purple-400" />
              Please save your delivery PIN for reference. You'll need it to collect your order.
            </p>

            <button
              onClick={onBack}
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-semibold px-10 py-4 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-200 transform hover:scale-[1.02] inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-6 font-medium group transition-all duration-200 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-gray-200 hover:border-purple-200"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Cart
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Checkout</h2>
                  <p className="text-white/80 text-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Fill in your delivery details
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-xl">
                  <User className="w-4 h-4 text-purple-500" />
                  Personal Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => handleFieldTouch('fullName')}
                    className={`w-full px-4 py-3 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                      touched.fullName && errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      onBlur={() => handleFieldTouch('phone')}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                        touched.phone && errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                    />
                  </div>
                  {touched.phone && errors.phone && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-xl">
                  <Home className="w-4 h-4 text-blue-500" />
                  Delivery Address
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    House/Flat/Shop No
                  </label>
                  <input
                    type="text"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-purple-300"
                    placeholder="e.g., 123, A-45, Shop #8 (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Street/Road Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetName}
                    onChange={(e) => setStreetName(e.target.value)}
                    onBlur={() => handleFieldTouch('streetName')}
                    className={`w-full px-4 py-3 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                      touched.streetName && errors.streetName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    placeholder="Enter street name"
                  />
                  {touched.streetName && errors.streetName && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.streetName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Area/Landmark
                  </label>
                  <input
                    type="text"
                    value={areaLandmark}
                    onChange={(e) => setAreaLandmark(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-purple-300"
                    placeholder="e.g., Near temple, Opposite school (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Village/City Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    onBlur={() => handleFieldTouch('villageName')}
                    className={`w-full px-4 py-3 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                      touched.villageName && errors.villageName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    placeholder="Enter village or city name"
                  />
                  {touched.villageName && errors.villageName && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.villageName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{6}"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleFieldTouch('pinCode')}
                    className={`w-full px-4 py-3 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                      touched.pinCode && errors.pinCode ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300'
                    }`}
                    placeholder="Enter 6-digit PIN code"
                    maxLength={6}
                  />
                  {touched.pinCode && errors.pinCode && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.pinCode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nearby Location
                  </label>
                  <input
                    type="text"
                    value={nearbyLocation}
                    onChange={(e) => setNearbyLocation(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:border-purple-300"
                    placeholder="e.g., Near temple, school, etc. (optional)"
                  />
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-purple-400" />
                      OR
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  </div>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Use Current Location
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-200 hover:border-purple-300"
                    >
                      {gettingLocation ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-5 h-5" />
                          Get My Location
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLatitude(null); setLongitude(null); setDistance(null); }}
                      className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-medium transition-all duration-200 border-2 border-gray-200 hover:border-gray-300"
                    >
                      Clear Location
                    </button>
                  </div>

                  {latitude && longitude && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium">Location Captured</p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {latitude.toFixed(6)}, {longitude.toFixed(6)}
                          </p>
                          {distance !== null && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">Distance from shop:</span>
                              <span className={`text-sm font-bold ${distance <= 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatDistance(distance)}
                              </span>
                              {distance > 5 && (
                                <span className="text-xs text-red-600 flex items-center gap-1 ml-2 bg-red-50 px-2 py-1 rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                  Outside delivery radius
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-xl">
                  <Wallet className="w-4 h-4 text-orange-500" />
                  Payment Method
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      paymentMethod === 'cod'
                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                        : 'border-gray-200 bg-white/50 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className={`w-6 h-6 ${paymentMethod === 'cod' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${paymentMethod === 'cod' ? 'text-purple-600' : 'text-gray-600'}`}>
                        Cash on Delivery
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200'
                        : 'border-gray-200 bg-white/50 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-purple-600' : 'text-gray-600'}`}>
                        Card Payment
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <label className="text-sm text-gray-700">
                    I agree to the{' '}
                    <span className="text-purple-600 font-medium hover:underline cursor-pointer">
                      terms and conditions
                    </span>
                    {' '}and{' '}
                    <span className="text-pink-600 font-medium hover:underline cursor-pointer">
                      privacy policy
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    By placing this order, you confirm that all information provided is accurate.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0 || !agreeToTerms}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Place Order
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden sticky top-6">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-5 py-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Map className="w-5 h-5" />
                Order Summary
              </h3>
              <p className="text-white/80 text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {cart.length} items in your cart
              </p>
            </div>

            <div className="p-5">
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {cart.map((item) => (
                  <div
                    key={`${item.item.id}-${item.variant.id}`}
                    className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 hover:bg-purple-50/50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                        {item.item.name}
                        <span className="text-xs text-purple-500 font-normal">×{item.quantity}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{item.variant.quantity_unit}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      ₹{(item.variant.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-purple-400" />
                    Delivery Fee
                  </span>
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-200">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
                <p className="text-xs text-purple-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-500" />
                  <span>Free delivery within 5 km radius</span>
                </p>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Shield className="w-3 h-3 text-purple-400" />
                <span>Secure checkout</span>
                <Clock className="w-3 h-3 text-pink-400" />
                <span>Fast delivery</span>
                <Heart className="w-3 h-3 text-red-400" />
                <span>Quality assured</span>
              </div>

              <div className="mt-3 text-xs text-gray-400 text-center bg-gray-50/50 py-2 rounded-xl">
                <p>Items: {cart.reduce((acc, item) => acc + item.quantity, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c4b5fd;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}