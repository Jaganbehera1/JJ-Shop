import { useState, useMemo } from 'react';
import { Item, ItemVariant, Category } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { 
  Plus, 
  Package, 
  Minus, 
  ShoppingCart, 
  Star, 
  Clock, 
  Check, 
  AlertCircle,
  Sparkles,
  Heart,
  Zap,
  TrendingUp,
  Gift,
  Award,
  Coffee,
  Leaf,
  Sun,
  Moon,
  Palette,
  Flower2,
  Home
} from 'lucide-react';
import ImageModal from '../ImageModal';

type ItemsListProps = {
  items: (Item & { category: Category; variants: ItemVariant[] })[];
  loading: boolean;
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  itemId?: string;
};

const categoryColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  'Handicraft': { bg: 'from-purple-100 to-pink-100', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-500 to-pink-500' },
  'Home Decor': { bg: 'from-emerald-100 to-teal-100', text: 'text-emerald-600', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-500' },
  'Jewelry': { bg: 'from-yellow-100 to-orange-100', text: 'text-yellow-600', border: 'border-yellow-200', gradient: 'from-yellow-500 to-orange-500' },
  'Art': { bg: 'from-blue-100 to-indigo-100', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-500' },
  'Woodcraft': { bg: 'from-amber-100 to-yellow-100', text: 'text-amber-600', border: 'border-amber-200', gradient: 'from-amber-500 to-yellow-500' },
  'Textile': { bg: 'from-pink-100 to-rose-100', text: 'text-pink-600', border: 'border-pink-200', gradient: 'from-pink-500 to-rose-500' },
  'Ceramic': { bg: 'from-slate-100 to-gray-100', text: 'text-slate-600', border: 'border-slate-200', gradient: 'from-slate-500 to-gray-500' },
  'default': { bg: 'from-gray-100 to-gray-200', text: 'text-gray-600', border: 'border-gray-200', gradient: 'from-gray-500 to-gray-600' }
};

const categoryIcons: Record<string, any> = {
  'Handicraft': Gift,
  'Home Decor': Home,
  'Jewelry': Sparkles,
  'Art': Palette,
  'Woodcraft': Leaf,
  'Textile': Flower2,
  'Ceramic': Coffee,
  'default': Package
};

export function ItemsList({ items, loading }: ItemsListProps) {
  const { addToCart } = useCart();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<{ src: string; alt?: string } | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getItemKey = (itemId: string, variantId: string) => `${itemId}-${variantId}`;

  const handleAddToCart = (item: Item & { variants: ItemVariant[] }) => {
    const variantId = selectedVariants[item.id] || item.variants[0]?.id;
    const variant = item.variants.find((v) => v.id === variantId);
    const quantity = quantities[item.id] || 1;

    if (!variant) {
      showToast('Please select a variant', 'error');
      return;
    }

    addToCart({ item, variant, quantity });
    
    showToast(`Added ${quantity} × ${item.name} to cart! 🎉`, 'success', item.id);
    
    const key = getItemKey(item.id, variant.id);
    setAddedItems({ ...addedItems, [key]: true });
    setTimeout(() => {
      setAddedItems({ ...addedItems, [key]: false });
    }, 1500);
    
    setQuantities({ ...quantities, [item.id]: 1 });
  };

  const showToast = (message: string, type: 'success' | 'error', itemId?: string) => {
    setToast({ show: true, message, type, itemId });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success', itemId: undefined });
    }, 2500);
  };

  const quickAddToCart = (item: Item & { variants: ItemVariant[] }) => {
    const variantId = selectedVariants[item.id] || item.variants[0]?.id;
    const variant = item.variants.find((v) => v.id === variantId);
    if (variant) {
      const currentQty = quantities[item.id] || 1;
      setQuantities({ ...quantities, [item.id]: currentQty + 1 });
      handleAddToCart(item);
    }
  };

  const toggleWishlist = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
    showToast(
      wishlist[itemId] ? 'Removed from wishlist 💔' : 'Added to wishlist ❤️',
      'success'
    );
  };

  const getCategoryStyle = (categoryName: string) => {
    const normalizedName = categoryName?.trim() || 'default';
    const match = Object.keys(categoryColors).find(key => 
      normalizedName.toLowerCase().includes(key.toLowerCase())
    );
    return categoryColors[match as keyof typeof categoryColors] || categoryColors.default;
  };

  const getCategoryIcon = (categoryName: string) => {
    const normalizedName = categoryName?.trim() || 'default';
    const match = Object.keys(categoryIcons).find(key => 
      normalizedName.toLowerCase().includes(key.toLowerCase())
    );
    return categoryIcons[match as keyof typeof categoryIcons] || categoryIcons.default;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <Package className="w-10 h-10 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-gray-600 mt-6 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          Loading beautiful items...
        </p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    );
  }

  if (items.length === 0) {
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
              <Package className="w-24 h-24 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mt-6 mb-2">No items found</h3>
          <p className="text-gray-500 text-lg">Try adjusting your search or filters</p>
          <p className="text-gray-400 text-sm mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            We're always adding new items!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item, index) => {
          const selectedVariantId = selectedVariants[item.id] || item.variants[0]?.id;
          const selectedVariant = item.variants.find((v) => v.id === selectedVariantId);
          const quantity = quantities[item.id] || 1;
          const hasVariants = item.variants && item.variants.length > 0;
          const isAdded = addedItems[getItemKey(item.id, selectedVariantId || '')];
          const isWishlisted = wishlist[item.id];
          const isHovered = hoveredItem === item.id;
          const categoryStyle = getCategoryStyle(item.category?.name || '');
          const CategoryIcon = getCategoryIcon(item.category?.name || '');

          return (
            <div
              key={item.id}
              className={`group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-white/20 transform hover:-translate-y-2 hover:scale-[1.02] animate-in fade-in duration-500`}
              style={{ animationDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Image Container */}
              <div className="relative">
                {item.image_url ? (
                  <div
                    onClick={() => setModal({ src: item.image_url!, alt: item.name })}
                    className="w-full block relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Category Badge */}
                    <div className={`absolute top-3 left-3 bg-gradient-to-r ${categoryStyle.bg} backdrop-blur-sm px-3 py-1.5 rounded-2xl border ${categoryStyle.border} shadow-lg flex items-center gap-1.5`}>
                      <CategoryIcon className={`w-3.5 h-3.5 ${categoryStyle.text}`} />
                      <span className={`text-xs font-semibold ${categoryStyle.text}`}>
                        {item.category?.name || 'Uncategorized'}
                      </span>
                    </div>

                    {/* No variants warning */}
                    {!hasVariants && (
                      <div className="absolute bottom-3 left-3 bg-red-500/90 backdrop-blur-sm px-3 py-1.5 rounded-2xl text-xs font-medium text-white shadow-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        No variants
                      </div>
                    )}

                    {/* Quick view overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-sm px-6 py-2.5 rounded-2xl shadow-xl">
                        <span className="text-sm font-semibold text-purple-600 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Quick View
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    <Package className="w-20 h-20 text-gray-400" />
                    <div className={`absolute bottom-3 left-3 bg-gradient-to-r ${categoryStyle.bg} backdrop-blur-sm px-3 py-1.5 rounded-2xl border ${categoryStyle.border} shadow-lg flex items-center gap-1.5`}>
                      <CategoryIcon className={`w-3.5 h-3.5 ${categoryStyle.text}`} />
                      <span className={`text-xs font-semibold ${categoryStyle.text}`}>
                        {item.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Wishlist Button - Outside the image button to prevent nesting */}
                <button
                  onClick={(e) => toggleWishlist(item.id, e)}
                  className={`absolute top-3 right-3 p-2 rounded-2xl backdrop-blur-sm transition-all duration-300 z-10 ${
                    isWishlisted 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                      : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="p-5">
                {/* Name & Description */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1 flex-1 group-hover:text-purple-600 transition-colors duration-300">
                      {item.name}
                    </h3>
                    {isHovered && (
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full animate-pulse">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Popular
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[40px] group-hover:text-gray-700 transition-colors duration-300">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Variant Selector */}
                <div className="space-y-3">
                  {hasVariants ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        Select Size
                      </label>
                      <select
                        value={selectedVariantId}
                        onChange={(e) =>
                          setSelectedVariants({
                            ...selectedVariants,
                            [item.id]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm bg-white/50 backdrop-blur-sm hover:border-purple-300 appearance-none cursor-pointer"
                      >
                        {item.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.quantity_unit} — ₹{variant.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-3 text-center border border-gray-200">
                      <p className="text-xs text-gray-500">No sizes available</p>
                    </div>
                  )}

                  {/* Quantity & Price */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-purple-400" />
                        Qty
                      </label>
                      <div className="flex items-center gap-2 bg-gray-100/80 backdrop-blur-sm rounded-2xl p-1 border border-gray-200">
                        <button
                          onClick={() =>
                            setQuantities({
                              ...quantities,
                              [item.id]: Math.max(1, quantity - 1),
                            })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={quantity <= 1}
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900 text-sm">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantities({
                              ...quantities,
                              [item.id]: quantity + 1,
                            })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white transition-all duration-200"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ₹{selectedVariant ? (selectedVariant.price * quantity).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!hasVariants}
                    className={`w-full py-3.5 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      hasVariants
                        ? isAdded
                          ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-2 border-emerald-300'
                          : `bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white hover:shadow-2xl hover:shadow-purple-200 transform hover:scale-[1.02]`
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-5 h-5 animate-bounce" />
                        Added to Cart!
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add to Cart
                        {hasVariants && (
                          <Sparkles className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Quick Add */}
                  {hasVariants && (
                    <button
                      onClick={() => quickAddToCart(item)}
                      className="w-full text-xs text-gray-500 hover:text-purple-600 font-medium transition-colors py-1.5 flex items-center justify-center gap-1 group-hover:bg-purple-50 rounded-xl transition-all duration-300"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Quick add +1
                      <span className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">⚡</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Decorative gradient border on hover */}
              <div className={`h-1 bg-gradient-to-r ${categoryStyle.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </div>
          );
        })}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-sm border border-white/20 ${
            toast.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 animate-pulse" />
            )}
            <span className="font-medium">{toast.message}</span>
            <Sparkles className="w-4 h-4 opacity-80" />
          </div>
        </div>
      )}

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
        @keyframes slide-in-from-bottom-4 {
          0% { transform: translate(-50%, 20px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }
        .animate-in {
          opacity: 1;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-in-from-bottom-4 {
          animation: slide-in-from-bottom-4 0.3s ease-out;
        }
      `}</style>
    </>
  );
}