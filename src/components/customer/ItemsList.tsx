import { useState } from 'react';
import { Item, ItemVariant, Category } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { Plus, Package } from 'lucide-react';
import ImageModal from '../ImageModal';

type ItemsListProps = {
  items: (Item & { category: Category; variants: ItemVariant[] })[];
  loading: boolean;
};

export function ItemsList({ items, loading }: ItemsListProps) {
  const { addToCart } = useCart();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<{ src: string; alt?: string } | null>(null);

  const handleAddToCart = (item: Item & { variants: ItemVariant[] }) => {
    const variantId = selectedVariants[item.id] || item.variants[0]?.id;
    const variant = item.variants.find((v) => v.id === variantId);
    const quantity = quantities[item.id] || 1;

    if (!variant) {
      alert('Please select a variant');
      return;
    }

    addToCart({ item, variant, quantity });
    alert('Added to cart!');
    setQuantities({ ...quantities, [item.id]: 1 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading items...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-600">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
        if (!item.variants || item.variants.length === 0) {
          // item has no variants
        }
        const selectedVariantId = selectedVariants[item.id] || item.variants[0]?.id;
        const selectedVariant = item.variants.find((v) => v.id === selectedVariantId);
        const quantity = quantities[item.id] || 1;

        return (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all"
          >
            {item.image_url && (
              <button type="button" onClick={() => setModal({ src: item.image_url!, alt: item.name })} className="w-full block">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              </button>
            )}
            <div className="p-6">
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-xs font-semibold text-emerald-600 uppercase">
                  {item.category.name}
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {item.description}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Select Size:
                  </label>
                  {(!item.variants || item.variants.length === 0) ? (
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm" disabled>
                      <option>No sizes available</option>
                    </select>
                  ) : (
                    <select
                      value={selectedVariantId}
                      onChange={(e) =>
                        setSelectedVariants({
                          ...selectedVariants,
                          [item.id]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    >
                      {item.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.quantity_unit} - ₹{variant.price}
                        </option>
                      ))}
                    </select>
                  )}
                  {/* debug logs removed */}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Quantity:
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setQuantities({
                          ...quantities,
                          [item.id]: Math.max(1, quantity - 1),
                        })
                      }
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() =>
                        setQuantities({
                          ...quantities,
                          [item.id]: quantity + 1,
                        })
                      }
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-600">Total:</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{selectedVariant ? (selectedVariant.price * quantity).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
      {modal != null && <ImageModal src={modal.src} alt={modal.alt} onClose={() => setModal(null)} />}
    </>
  );
}

