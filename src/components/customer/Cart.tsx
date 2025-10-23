import { useCart } from '../../contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import ImageModal from '../ImageModal';
import { useState } from 'react';

type CartProps = {
  onCheckout: () => void;
};

export function Cart({ onCheckout }: CartProps) {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [modal, setModal] = useState<{ src: string; alt?: string } | null>(null);
  const handleCheckout = () => {
    onCheckout(); // Call the passed function
  };
  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-600">Add some items to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            Clear Cart
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {cart.map((cartItem) => {
            const subtotal = cartItem.variant.price * cartItem.quantity;

            return (
              <div
                key={`${cartItem.item.id}-${cartItem.variant.id}`}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
              >
                {cartItem.item.image_url && (
                  <button type="button" onClick={() => setModal({ src: cartItem.item.image_url!, alt: cartItem.item.name })}>
                    <img
                      src={cartItem.item.image_url}
                      alt={cartItem.item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  </button>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {cartItem.item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {cartItem.variant.quantity_unit} - ₹{cartItem.variant.price}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateQuantity(cartItem.item.id, cartItem.variant.id, cartItem.quantity - 1)}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="text-sm font-medium">{cartItem.quantity}</span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(cartItem.item.id, cartItem.variant.id, cartItem.quantity + 1)}
                      className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCart(cartItem.item.id, cartItem.variant.id)}
                      className="ml-4 text-red-600 hover:text-red-700"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xl font-semibold text-gray-900">Total Amount:</span>
            <span className="text-3xl font-bold text-emerald-600">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg transition-colors text-lg"
  >
          Proceed to Checkout
        </button>
        </div>
      </div>
    </div>
      {modal != null && <ImageModal src={modal.src} alt={modal.alt} onClose={() => setModal(null)} />}
    </>
  );
}
