import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity, MAX_CUSTOMER_QTY_LIMIT } from '../context/CartWishlistContext';
import { motion } from 'framer-motion';
import { Heart, Plus, Minus, Clock } from 'lucide-react';
import { getProductImage } from '../utils/imageUtils';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { cart, addToCart, removeFromCart, updateCartQuantity, toggleWishlist, isInWishlist, showLimitToast } = useCartWishlist();
  
  const netWeight = product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g';
  const favorited = isInWishlist(product.id);

  // Check if product is in cart
  const cartItem = cart.find(item => item.product.id === product.id);
  const cartQty = cartItem ? cartItem.quantity : 0;

  const displayImage = getProductImage(product);
  
  const originalPrice = product.originalPrice || product.mrp || product.price;
  
  // Calculate discount percentage accurately for Blinkit blue badge
  const discountPercent = (originalPrice > product.price)
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : (product.discountPercentage || 0);

  const stockQty = getProductStockQuantity(product);
  const isOutOfStock = stockQty <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) {
      alert(`Sorry, "${product.name}" is Out of Stock!`);
      return;
    }
    addToCart(product, 1, netWeight);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQty >= MAX_CUSTOMER_QTY_LIMIT) {
      showLimitToast();
      return;
    }
    if (cartQty >= stockQty) {
      alert(`Only ${stockQty} items left in stock!`);
      return;
    }
    if (cartItem) {
      updateCartQuantity(product.id, cartItem.selectedWeight, cartQty + 1);
    } else {
      addToCart(product, 1, netWeight);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      if (cartQty === 1) {
        removeFromCart(product.id, cartItem.selectedWeight);
      } else {
        updateCartQuantity(product.id, cartItem.selectedWeight, cartQty - 1);
      }
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const hasOptions = product.weightOptions && product.weightOptions.length > 1;

  return (
    <motion.div 
      layout
      className="bg-white border border-divider/70 rounded-[4px] relative flex flex-col h-full transition-all duration-200 shadow-2xs hover:shadow-md group overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Image Container - Spans Full Outer Card Width with 4px top radius */}
      <div className="relative w-full aspect-square bg-[#F4F5F7] overflow-hidden flex items-center justify-center p-0 group/img rounded-t-[4px]">
        
        {/* Blue Ribbon Discount Badge (100% Fully Visible, No Clipping) */}
        {discountPercent > 0 && (
          <div className="absolute top-0 left-0 bg-[#2554d7] text-white text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-br-[4px] shadow-xs z-20 uppercase tracking-tight flex flex-col items-center leading-none">
            <span className="leading-none">{discountPercent}%</span>
            <span className="text-[7.5px] font-extrabold leading-none mt-0.5">OFF</span>
          </div>
        )}

        {/* Wishlist Heart Icon */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-1.5 right-1.5 z-20 w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center border border-divider/40 shadow-xs transition-transform active:scale-90 ${
            favorited ? 'text-rose-500 fill-rose-500' : 'text-text-tertiary hover:text-rose-500'
          }`}
          title={favorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label={favorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-pressed={favorited}
        >
          <Heart size={13} className={favorited ? 'fill-rose-500 text-rose-500' : ''} />
        </button>

        {/* Out of Stock Ribbon Overlay */}
        {isOutOfStock && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase">
            Out of Stock
          </div>
        )}

        {/* Product Image - Full Width & Height */}
        <Link to={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
          <img 
            src={displayImage} 
            alt={product.name} 
            className={`w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`} 
            loading="lazy" 
          />
        </Link>
      </div>

      {/* Details Container Below Image */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-1">
        {/* 10 MINS Delivery Time Badge (Blinkit Format) */}
        <div className="inline-flex items-center gap-1 bg-[#F3F4F6] px-1.5 py-0.5 rounded-[3px] text-[9px] sm:text-[10px] font-black text-gray-800 uppercase tracking-tight w-fit mb-1">
          <Clock size={11} className="text-gray-700 shrink-0" />
          <span>10 MINS</span>
        </div>

        {/* Product Title */}
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.4em] group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Net Weight / Quantity */}
        <div className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1 mb-2">
          {netWeight}
        </div>

        {/* Bottom Price & ADD Button Row (Blinkit Format) */}
        <div className="mt-auto pt-1 flex items-center justify-between gap-1">
          {/* Price Column */}
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-gray-900 leading-none">
              ₹{product.price}
            </span>
            {originalPrice > product.price && (
              <span className="text-[10px] sm:text-xs line-through text-gray-400 font-normal leading-none mt-0.5">
                ₹{originalPrice}
              </span>
            )}
          </div>

          {/* ADD Button Column */}
          <div className="flex flex-col items-end">
            {isOutOfStock ? (
              <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-[4px] border border-gray-200">
                Sold Out
              </span>
            ) : cartQty > 0 ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-[4px] shadow-2xs font-black text-xs overflow-hidden">
                <button onClick={handleDecrement} className="p-1 sm:p-1.5 hover:bg-emerald-700 transition-colors" aria-label="Decrease quantity">
                  <Minus size={12} strokeWidth={3} />
                </button>
                <span className="px-1.5 sm:px-2 font-black text-xs" aria-live="polite">{cartQty}</span>
                <button
                  onClick={handleIncrement}
                  disabled={cartQty >= stockQty}
                  className={`p-1 sm:p-1.5 transition-colors ${cartQty >= stockQty ? 'opacity-40 cursor-not-allowed bg-emerald-800' : 'hover:bg-emerald-700'}`}
                  aria-label="Increase quantity"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="bg-emerald-50/80 border border-emerald-600 text-emerald-700 font-extrabold text-xs px-3 sm:px-4 py-1.5 rounded-[4px] hover:bg-emerald-600 hover:text-white transition-all duration-200 cursor-pointer shadow-2xs uppercase tracking-wider"
              >
                ADD
              </button>
            )}

            {hasOptions && !isOutOfStock && cartQty === 0 && (
              <span className="text-[9px] text-gray-500 font-medium block text-right mt-0.5">
                {product.weightOptions?.length || 0} options
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

