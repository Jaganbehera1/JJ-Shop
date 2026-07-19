import { useCart } from '../../contexts/CartContext';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  X, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  Gift,
  Clock,
  Shield,
  Zap,
  Heart,
  Star,
  Package
} from 'lucide-react';
import ImageModal from '../ImageModal';
import { useState, useEffect } from 'react';

type CartProps = {
  onCheckout: () => void;
  isLoading?: boolean;
};

export function Cart({ onCheckout, isLoading = false }: CartProps) {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [modal, setModal] = useState<{ src: string; alt?: string } | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [animateItems, setAnimateItems] = useState<Record<string, boolean>>({});
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Animate items on mount
  useEffect(() => {
    cart.forEach((item, index) => {
      const key = `${item.item.id}-${item.variant.id}`;
      setTimeout(() => {
        setAnimateItems(prev => ({ ...prev, [key]: true }));
      }, index * 100);
    });
  }, [cart]);

  const handleRemoveItem = async (itemId: string, variantId: string) => {
    const key = `${itemId}-${variantId}`;
    setRemovingItem(key);
    try {
      await removeFromCart(itemId, variantId);
    } finally {
      setRemovingItem(null);
    }
  };

  const handleClearCart = () => {
    if (showClearConfirmation) {
      clearCart();
      setShowClearConfirmation(false);
    } else {
      setShowClearConfirmation(true);
    }
  };

  const handleCheckout = () => {
    if (!isLoading && cart.length > 0) {
      onCheckout();
    }
  };

  const applyCoupon = () => {
    if (couponCode.trim().toLowerCase() === 'welcome10') {
      setCouponApplied(true);
      alert('🎉 Coupon applied! 10% discount on your order!');
    } else {
      alert('❌ Invalid coupon code. Please try again.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 sm:p-16 text-center border border-white/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50" />
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 sm:top-10 sm:right-10 animate-float">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300 opacity-30" />
        </div>
        <div className="absolute bottom-4 left-4 sm:bottom-10 sm:left-10 animate-float-delayed">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-pink-300 opacity-30" />
        </div>
        
        <div className="relative z-10">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full blur-3xl opacity-20 animate-pulse" />
            <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full shadow-2xl shadow-purple-200">
              <ShoppingCart className="w-16 h-16 sm:w-24 sm:h-24 text-white mx-auto" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-bounce" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4 sm:mt-6 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 text-base sm:text-lg">Looks like you haven't added any items yet</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
            Start exploring our beautiful collection!
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400" />
          </p>
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 animate-pulse" />
            <span className="text-xs text-gray-400">Find something you love</span>
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 animate-pulse delay-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                  <ShoppingCart className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Shopping Cart</h2>
                  <p className="text-white/80 text-xs sm:text-sm flex items-center gap-1 truncate">
                    <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                    <span className="truncate">You have {cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</span>
                  </p>
                </div>
                <span className="hidden sm:inline-block bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/30 whitespace-nowrap">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)} total
                </span>
              </div>
              <button
                onClick={handleClearCart}
                className="text-white/80 hover:text-white transition-all duration-300 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl hover:bg-white/10 backdrop-blur-sm group text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
              >
                {showClearConfirmation ? (
                  <>
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                    <span className="text-xs sm:text-sm font-medium">Confirm clear?</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs sm:text-sm font-medium">Clear All</span>
                  </>
                )}
              </button>
            </div>
            {showClearConfirmation && (
              <div className="mt-2 sm:mt-3 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between border border-white/20 animate-in slide-in-from-top-2 duration-300">
                <span className="text-white/90 text-xs sm:text-sm flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate">This will remove all items from your cart</span>
                </span>
                <button
                  onClick={() => setShowClearConfirmation(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="divide-y divide-gray-100/50">
            {cart.map((cartItem, index) => {
              const subtotal = cartItem.variant.price * cartItem.quantity;
              const itemKey = `${cartItem.item.id}-${cartItem.variant.id}`;
              const isRemoving = removingItem === itemKey;
              const isAnimated = animateItems[itemKey];

              return (
                <div
                  key={itemKey}
                  className={`
                    flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 p-3 sm:p-6 
                    hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 
                    transition-all duration-300 group
                    ${isRemoving ? 'opacity-50 pointer-events-none scale-95' : ''}
                    ${isAnimated ? 'animate-in slide-in-from-right-4 duration-300' : ''}
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image */}
                  {cartItem.item.image_url && (
                    <button
                      type="button"
                      onClick={() => setModal({ src: cartItem.item.image_url!, alt: cartItem.item.name })}
                      className="flex-shrink-0 group relative w-full sm:w-auto"
                    >
                      <img
                        src={cartItem.item.image_url}
                        alt={cartItem.item.name}
                        className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-2xl shadow-md group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 rounded-2xl transition-all duration-300" />
                      <div className="absolute top-2 right-2 p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Package className="w-3 h-3 text-purple-500" />
                      </div>
                    </button>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate flex items-center gap-2">
                      <span className="truncate">{cartItem.item.name}</span>
                      <span className="text-xs text-purple-500 bg-purple-50 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                        #{index + 1}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm text-gray-600 bg-gray-100/80 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-gray-200">
                        {cartItem.variant.quantity_unit}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-purple-600 bg-purple-50/80 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-purple-200">
                        ₹{cartItem.variant.price.toFixed(2)} / unit
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="hidden sm:inline">In stock</span>
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls & Subtotal - Mobile friendly */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-4 mt-2 sm:mt-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-0.5 sm:p-1 border border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.variant.id, cartItem.quantity - 1)}
                          disabled={cartItem.quantity <= 1}
                          className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl hover:bg-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                        </button>
                        <span className="w-6 sm:w-10 text-center text-sm sm:text-base font-bold text-gray-900">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.variant.id, cartItem.quantity + 1)}
                          className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl hover:bg-white transition-all duration-200"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right min-w-[60px] sm:min-w-[90px]">
                        <p className="text-[10px] sm:text-xs text-gray-500">Subtotal</p>
                        <p className="text-sm sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          ₹{subtotal.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(cartItem.item.id, cartItem.variant.id)}
                        disabled={isRemoving}
                        className="p-1.5 sm:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all duration-300 disabled:opacity-50 group-hover:scale-110"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 px-3 sm:px-6 py-4 sm:py-6 border-t border-gray-200">
            {/* Coupon Section */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Have a coupon?</span>
              </div>
              <div className="flex flex-1 w-full sm:w-auto gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
                  disabled={couponApplied}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponApplied}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl sm:rounded-2xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
                >
                  {couponApplied ? 'Applied!' : 'Apply'}
                </button>
              </div>
              {couponApplied && (
                <span className="text-xs sm:text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  10% discount applied
                </span>
              )}
            </div>

            {/* Summary - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
                <div>
                  <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    Subtotal
                  </span>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="hidden sm:block w-px h-12 bg-gray-300" />
                <div>
                  <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Items
                  </span>
                  <p className="text-base sm:text-xl font-semibold text-gray-900">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </p>
                </div>
                {couponApplied && (
                  <>
                    <div className="hidden sm:block w-px h-12 bg-gray-300" />
                    <div>
                      <span className="text-xs sm:text-sm text-emerald-500 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Discount
                      </span>
                      <p className="text-base sm:text-xl font-bold text-emerald-600">
                        -₹{(totalAmount * 0.1).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleCheckout}
                disabled={isLoading || cart.length === 0}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 sm:gap-3 min-w-[160px] sm:min-w-[220px] group text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="truncate">Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-2 transition-transform duration-300 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                      ₹{(couponApplied ? totalAmount * 0.9 : totalAmount).toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Safety Badge - Mobile Responsive */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-purple-400" />
                <span className="hidden xs:inline">Secure checkout</span>
                <span className="xs:hidden">Secure</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-gray-300 hidden xs:block" />
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-pink-400" />
                <span className="hidden xs:inline">Fast delivery</span>
                <span className="xs:hidden">Fast</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-gray-300 hidden xs:block" />
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-400" />
                <span className="hidden xs:inline">Quality guaranteed</span>
                <span className="xs:hidden">Quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {modal != null && (
        <ImageModal src={modal.src} alt={modal.alt} onClose={() => setModal(null)} />
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
        /* Extra small screens */
        @media (max-width: 480px) {
          .xs\\:inline {
            display: inline !important;
          }
          .xs\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}