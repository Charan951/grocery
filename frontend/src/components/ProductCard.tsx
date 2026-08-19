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
      className="bg-surface border border-divider/60 rounded-2xl p-2.5 sm:p-3 relative flex flex-col h-full transition-all duration-300 shadow-2xs hover:shadow-md hover:border-primary/40 group overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Image Container (Zepto Style soft background box) */}
      <div className="relative w-full aspect-square rounded-2xl bg-neutral-100/60 dark:bg-neutral-800/40 mb-1.5 flex items-center justify-center p-1 group/img overflow-hidden">
        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 z-20 bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
            Out of Stock
          </div>
        )}

        {/* Product Image */}
        <Link to={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
          <img src={displayImage} alt={product.name} className={`w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`} loading="lazy" />
        </Link>

        {/* Floating Add CTA inside Image Box (Bottom Right Corner) */}
        <div className="absolute bottom-2 right-2 z-20">
          {isOutOfStock ? (
            <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-300">
              Unavailable
            </span>
          ) : cartQty > 0 ? (
            <div className="flex items-center bg-pink-600 text-white rounded-xl shadow-md font-bold text-[10px] sm:text-xs overflow-hidden">
              <button onClick={handleDecrement} className="p-1 sm:p-1.5 hover:bg-pink-700 transition-colors">
                <Minus size={12} />
              </button>
              <span className="px-1.5 sm:px-2 font-black text-[10px] sm:text-xs">{cartQty}</span>
              <button 
                onClick={handleIncrement} 
                disabled={cartQty >= stockQty}
                className={`p-1 sm:p-1.5 transition-colors ${cartQty >= stockQty ? 'opacity-40 cursor-not-allowed bg-pink-800' : 'hover:bg-pink-700'}`}
                title={cartQty >= stockQty ? `Only ${stockQty} available in stock` : 'Increase'}
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <motion.button 
              onClick={handleAddToCart}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white border-2 border-pink-500 text-pink-600 flex items-center justify-center shadow-md font-extrabold hover:bg-pink-600 hover:text-white transition-all duration-200 cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Add to Cart"
            >
              <Plus size={16} strokeWidth={3} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Info Details below Image Box */}
      <div className="flex flex-col flex-1">
        {/* Price Row: Green solid badge + MRP */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="bg-emerald-600 text-white text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg inline-block shadow-2xs">
            ₹{product.price}
          </span>
          {originalPrice > product.price && (
            <span className="text-[10px] sm:text-xs line-through text-text-tertiary font-medium">
              ₹{originalPrice}
            </span>
          )}
        </div>

        {/* Discount Tag below price */}
        {discountLabel && (
          <span className="text-emerald-600 font-extrabold text-[10px] block mb-1">
            {discountLabel}
          </span>
        )}

        {/* Product Title */}
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs sm:text-[13px] font-bold text-text-primary leading-snug mb-1 line-clamp-2 min-h-[2.2em] sm:min-h-[2.4em] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Net Quantity / Weight */}
        <span className="text-[10px] sm:text-[11px] font-semibold text-text-tertiary mb-1.5">{netWeight}</span>

        {/* Rating Badge at Bottom */}
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-auto pt-1">
          <div className="flex items-center gap-0.5 bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold">
            <Star size={9} className="fill-emerald-500 text-emerald-500" />
            <span>{product.rating || 4.8}</span>
          </div>
          <span className="text-text-tertiary text-[9px] sm:text-[10px]">({product.reviewsCount || 45})</span>
        </div>
      </div>
    </motion.div>
  );
};
