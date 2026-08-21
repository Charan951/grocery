import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { motion } from 'framer-motion';
import { Star, Heart, Plus, Minus, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const { toggleWishlist, isInWishlist, addToCart, cart, updateCartQuantity, removeFromCart } = useCartWishlist();
  
  const netWeight = product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g';
  const favorited = isInWishlist(product.id);

  // Check if product is in cart
  const cartItem = cart.find(item => item.product.id === product.id);
  const cartQty = cartItem ? cartItem.quantity : 0;

  const displayImage = (product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600');
  const discountLabel = product.discount || (product.discountPercentage ? `${product.discountPercentage}% OFF` : product.discountText);
  const originalPrice = product.originalPrice || product.mrp || product.price;

  const stockQty = getProductStockQuantity(product);
  const isOutOfStock = stockQty <= 0;
  const isLimitedStock = stockQty > 0 && stockQty < 10;

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

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <motion.div 
      layout
      className="bg-surface border border-divider/60 rounded-3xl p-2.5 sm:p-3 relative flex flex-col h-full transition-all duration-300 shadow-2xs hover:shadow-md hover:border-emerald-500/40 group overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Image Box */}
      <div className="relative w-full aspect-square rounded-2xl bg-white border border-divider/60 mb-2 flex items-center justify-center p-1.5 group/img overflow-hidden shadow-2xs">
        {/* Wishlist Heart Icon */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center border border-divider/60 shadow-xs transition-transform active:scale-90 ${
            favorited ? 'text-rose-500 fill-rose-500' : 'text-text-tertiary hover:text-rose-500'
          }`}
          title={favorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label={favorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-pressed={favorited}
        >
          <Heart size={14} className={favorited ? 'fill-rose-500 text-rose-500' : ''} />
        </button>

        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 z-20 bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
            Out of Stock
          </div>
        )}

        {/* Product Image */}
        <Link to={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
          <img 
            src={displayImage} 
            alt={product.name} 
            className={`w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover/img:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`} 
            loading="lazy" 
          />
        </Link>
      </div>

      {/* Weight Variant & ADD Button Row (Matching Image 4) */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="bg-white border border-divider text-text-primary text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-xl shadow-xs truncate max-w-[55%]">
          {netWeight}
        </span>

        <div>
          {isOutOfStock ? (
            <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-gray-200">
              Offstock
            </span>
          ) : cartQty > 0 ? (
            <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-xs font-black text-xs overflow-hidden">
              <button onClick={handleDecrement} className="p-1 sm:p-1.5 hover:bg-emerald-700 transition-colors" aria-label="Decrease quantity">
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="px-1.5 sm:px-2 font-black text-xs" aria-live="polite">{cartQty}</span>
              <button
                onClick={handleIncrement}
                disabled={cartQty >= stockQty}
                className={`p-1 sm:p-1.5 transition-colors ${cartQty >= stockQty ? 'opacity-40 cursor-not-allowed bg-emerald-800' : 'hover:bg-emerald-700'}`}
                title={cartQty >= stockQty ? `Only ${stockQty} available` : 'Increase'}
                aria-label={cartQty >= stockQty ? `Only ${stockQty} available` : 'Increase quantity'}
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="bg-white border-2 border-emerald-600 text-emerald-600 font-extrabold text-xs sm:text-xs px-3 sm:px-4 py-1 rounded-xl hover:bg-emerald-600 hover:text-white transition-all duration-200 cursor-pointer shadow-2xs uppercase tracking-wider"
            >
              ADD
            </button>
          )}
        </div>
      </div>

      {/* Info Details below (Price, Title, Delivery Time - Image 4 Style) */}
      <div className="flex flex-col flex-1 justify-between pt-0.5">
        <div>
          {/* Price Row: Bold Price + Line-through MRP */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-text-primary">
              ₹{product.price}
            </span>
            {originalPrice > product.price && (
              <span className="text-xs line-through text-text-tertiary font-semibold">
                ₹{originalPrice}
              </span>
            )}
            {discountLabel && (
              <span className="text-[10px] font-black text-emerald-600 ml-auto">
                {discountLabel}
              </span>
            )}
          </div>

          {/* Product Title */}
          <Link to={`/product/${product.id}`}>
            <h3 className="text-xs sm:text-[13px] font-extrabold text-text-primary leading-snug mt-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Delivery Time (Clock icon + 8 mins - Image 4 Style) */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-text-tertiary mt-2">
          <Zap size={12} className="text-emerald-600 fill-emerald-600" />
          <span>8 mins delivery</span>
        </div>
      </div>
    </motion.div>
  );
};
