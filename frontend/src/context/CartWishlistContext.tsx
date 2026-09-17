import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product } from './CMSContext';
import confetti from 'canvas-confetti';
import { AlertCircle } from 'lucide-react';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeight: string;
}

export const MAX_CUSTOMER_QTY_LIMIT = 3;

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
  showLimitToast: () => void;
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

export function getActiveUserKey(): string {
  try {
    const raw = localStorage.getItem('customer_user');
    if (!raw) return 'guest';
    const parsed = JSON.parse(raw);
    const key = parsed?.customerId || parsed?.phone || parsed?.email || 'guest';
    return String(key).replace(/\s+/g, '_');
  } catch {
    return 'guest';
  }
}

export const CartWishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUserKey, setActiveUserKey] = useState<string>(() => getActiveUserKey());

  const [cart, setCart] = useState<CartItem[]>(() => {
    const userKey = getActiveUserKey();
    const cached = localStorage.getItem(`freshcart_cart_${userKey}`);
    return cached ? JSON.parse(cached) : [];
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const userKey = getActiveUserKey();
    const cached = localStorage.getItem(`freshcart_wishlist_${userKey}`);
    return cached ? JSON.parse(cached) : [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showLimitToast = () => {
    setToastMessage('Seller has limited to a customer only 3');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const handleAuthChange = () => {
      const newKey = getActiveUserKey();
      setActiveUserKey(newKey);
      const cachedCart = localStorage.getItem(`freshcart_cart_${newKey}`);
      setCart(cachedCart ? JSON.parse(cachedCart) : []);
      const cachedWishlist = localStorage.getItem(`freshcart_wishlist_${newKey}`);
      setWishlist(cachedWishlist ? JSON.parse(cachedWishlist) : []);
    };

    window.addEventListener('customer_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('customer_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(`freshcart_cart_${activeUserKey}`, JSON.stringify(cart));
  }, [cart, activeUserKey]);

  useEffect(() => {
    localStorage.setItem(`freshcart_wishlist_${activeUserKey}`, JSON.stringify(wishlist));
  }, [wishlist, activeUserKey]);

  const addToCart = (product: Product, quantity = 1, weight?: string) => {
    const stockQty = getProductStockQuantity(product);
    const maxAllowed = Math.min(stockQty, MAX_CUSTOMER_QTY_LIMIT);

    if (stockQty <= 0) {
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
        if (currentQty >= MAX_CUSTOMER_QTY_LIMIT || currentQty + quantity > MAX_CUSTOMER_QTY_LIMIT) {
          showLimitToast();
          const newCart = [...prevCart];
          newCart[existingIndex].quantity = MAX_CUSTOMER_QTY_LIMIT;
          return newCart;
        }
        if (currentQty + quantity > maxAllowed) {
          const newCart = [...prevCart];
          newCart[existingIndex].quantity = maxAllowed;
          return newCart;
        }
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }

      if (quantity > MAX_CUSTOMER_QTY_LIMIT) {
        showLimitToast();
      }

      const initialQty = Math.min(quantity, MAX_CUSTOMER_QTY_LIMIT, maxAllowed);

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
    if (quantity > MAX_CUSTOMER_QTY_LIMIT) {
      showLimitToast();
      quantity = MAX_CUSTOMER_QTY_LIMIT;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId && item.selectedWeight === weight) {
          const stockQty = getProductStockQuantity(item.product);
          const maxAllowed = Math.min(stockQty, MAX_CUSTOMER_QTY_LIMIT);
          if (quantity > maxAllowed) {
            if (stockQty < MAX_CUSTOMER_QTY_LIMIT) {
              alert(`Cannot increase quantity! Only ${stockQty} units of "${item.product.name}" available in stock.`);
            }
            return { ...item, quantity: maxAllowed };
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
        showLimitToast,
      }}
    >
      {/* Floating Customer Limit Warning Toast Pill */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce pointer-events-none transition-all">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
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
