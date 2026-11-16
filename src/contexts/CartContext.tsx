import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductTopping } from '@/types/product';
import { OrderCreateItem } from '@/types/order';

export interface CartItem {
  cart_id?: string;
  product: Product;
  quantity: number;
  selectedToppings?: ProductTopping[];
  note?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    note?: string,
    selectedToppings?: ProductTopping[]
  ) => void;
  removeItem: (productId: number, cartId?: string) => void;
  updateQuantity: (productId: number, quantity: number, cartId?: string) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
  toOrderItems: () => OrderCreateItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('qr_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('qr_cart', JSON.stringify(items));
  }, [items]);

  const generateCartId = (productId: number, toppings?: ProductTopping[]): string => {
    const toppingKeys = (toppings || []).map((t) => `${t.name}:${t.price}`).sort().join('|');
    return `${productId}_${toppingKeys}`;
  };

  const addItem = (
    product: Product,
    quantity = 1,
    note?: string,
    selectedToppings?: ProductTopping[]
  ) => {
    if (!product.is_available) return;

    const cartId = generateCartId(product.id, selectedToppings);

    setItems((prev) => {
      const existing = prev.find((item) => (item.cart_id || `${item.product.id}_`) === cartId);
      if (existing) {
        return prev.map((item) =>
          (item.cart_id || `${item.product.id}_`) === cartId
            ? { ...item, quantity: item.quantity + quantity, note: note || item.note }
            : item
        );
      }
      return [
        ...prev,
        {
          cart_id: cartId,
          product,
          quantity,
          selectedToppings: selectedToppings || [],
          note,
        },
      ];
    });
  };

  const removeItem = (productId: number, cartId?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        if (cartId) {
          return (item.cart_id || `${item.product.id}_`) !== cartId;
        }
        return item.product.id !== productId;
      })
    );
  };

  const updateQuantity = (productId: number, quantity: number, cartId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, cartId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const matches = cartId
          ? (item.cart_id || `${item.product.id}_`) === cartId
          : item.product.id === productId;
        return matches ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    sessionStorage.removeItem('qr_cart');
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => {
    const toppingExtra = (item.selectedToppings || []).reduce(
      (tSum, t) => tSum + Number(t.price || 0),
      0
    );
    return sum + item.quantity * (Number(item.product.price) + toppingExtra);
  }, 0);

  const toOrderItems = (): OrderCreateItem[] => {
    return items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      note: item.note,
      options: (item.selectedToppings || []).map((t) => ({
        name: t.name,
        price: t.price,
      })),
    }));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
        toOrderItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
