import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem } from '../lib/supabase';

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string, variantId: string) => void;
  updateQuantity: (itemId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.item.id === newItem.item.id &&
          item.variant.id === newItem.variant.id
      );

      if (existing) {
        return prev.map((item) =>
          item.item.id === newItem.item.id &&
          item.variant.id === newItem.variant.id
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      return [...prev, newItem];
    });
  };

  const removeFromCart = (itemId: string, variantId: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.item.id === itemId && item.variant.id === variantId)
      )
    );
  };

  const updateQuantity = (itemId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, variantId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.item.id === itemId && item.variant.id === variantId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
