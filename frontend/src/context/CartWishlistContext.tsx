import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from './CMSContext';
import confetti from 'canvas-confetti';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeight: string;
}

interface CartWishlistContextProps {
  cart: CartItem[];
  wishlist: Product[];
  addToCart: (product: Product, quantity?: number, weight?: string) => void;
  removeFromCart: (productId: string, weight: string) => void;
  updateCartQuantity: (productId: string, weight: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
}

const CartWishlistContext = createContext<CartWishlistContextProps | undefined>(undefined);

export function getProductStockQuantity(product: Product | any): number {
  if (!product) return 0;
  if (typeof product.stock === 'number') return product.stock;
  if (typeof product.stock === 'object' && product.stock !== null) {
    if (typeof product.stock.quantity === 'number') return product.stock.quantity;
  }
  if (typeof product.countInStock === 'number') return product.countInStock;
  if (typeof product.stockQty === 'number') return product.stockQty;
  return 50;
}

export const CartWishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const cached = localStorage.getItem('freshcart_cart');
    return cached ? JSON.parse(cached) : [];
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const cached = localStorage.getItem('freshcart_wishlist');
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    localStorage.setItem('freshcart_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('freshcart_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product: Product, quantity = 1, weight?: string) => {
    const maxStock = getProductStockQuantity(product);
    if (maxStock <= 0) {
      alert(`Sorry, "${product.name}" is currently Out of Stock!`);
      return;
    }

    const selectedWeight = weight || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '1 pc';
    
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && item.selectedWeight === selectedWeight
      );

      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty + quantity > maxStock) {
          alert(`Cannot add more! Only ${maxStock} units of "${product.name}" available in stock.`);
          const newCart = [...prevCart];
          newCart[existingIndex].quantity = maxStock;
          return newCart;
        }
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }

      const initialQty = Math.min(quantity, maxStock);

      // Trigger premium burst animation
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.85 },
        colors: ['#4CAF50', '#81C784', '#FFFFFF'],
      });

      return [...prevCart, { product, quantity: initialQty, selectedWeight }];
    });
  };

  const removeFromCart = (productId: string, weight: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.product.id === productId && item.selectedWeight === weight))
    );
  };

  const updateCartQuantity = (productId: string, weight: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, weight);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId && item.selectedWeight === weight) {
          const maxStock = getProductStockQuantity(item.product);
          if (quantity > maxStock) {
            alert(`Cannot increase quantity! Only ${maxStock} units of "${item.product.name}" available in stock.`);
            return { ...item, quantity: maxStock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (product: Product) => {
    setWishlist((prevWishlist) => {
      const exists = prevWishlist.some((item) => item.id === product.id);
      if (exists) {
        return prevWishlist.filter((item) => item.id !== product.id);
      } else {
        return [...prevWishlist, product];
      }
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <CartWishlistContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        cartCount,
        cartSubtotal,
      }}
    >
      {children}
    </CartWishlistContext.Provider>
  );
};

export const useCartWishlist = () => {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error('useCartWishlist must be used within a CartWishlistProvider');
  }
  return context;
};
