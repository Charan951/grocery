import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../context/CMSContext';
import { useCartWishlist } from '../context/CartWishlistContext';
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, netWeight);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      className="bg-surface border border-divider/60 rounded-xl p-3.5 relative flex flex-col h-full transition-all duration-300 shadow-sm hover:shadow-md hover:border-primary/40 group overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Badges */}
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-background mb-3 flex items-center justify-center">
        {discountLabel && (
          <span className="absolute top-2 left-2 bg-pink-600 text-white text-[10px] font-black px-2 py-0.5 rounded z-10 shadow-sm uppercase tracking-wider">
            {discountLabel}
          </span>
        )}

        <button 
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center text-text-secondary z-10 shadow-sm transition-all duration-200 hover:bg-surface hover:text-primary hover:scale-110"
          onClick={handleWishlistToggle}
          aria-label="Toggle wishlist"
        >
          <Heart size={16} fill={favorited ? 'var(--primary)' : 'none'} color={favorited ? 'var(--primary)' : 'currentColor'} />
        </button>

        <Link to={`/product/${product.id}`} className="w-full h-full">
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        </Link>

        {/* Delivery Time Badge */}
        <div className="absolute bottom-2 left-2 bg-emerald-950/80 text-emerald-300 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
          <Zap size={10} className="fill-emerald-400 text-emerald-400" />
          <span>10 MINS</span>
        </div>

        <button 
          className="absolute bottom-2 right-2 bg-text-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full opacity-0 z-10 transition-all duration-300 shadow-md group-hover:opacity-100 hidden sm:block"
          onClick={handleQuickViewClick}
        >
          View
        </button>
      </div>

      {/* Info Details */}
      <div className="flex flex-col flex-1">
        <span className="text-[11px] font-bold text-text-tertiary mb-0.5">{netWeight}</span>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs sm:text-sm font-bold text-text-primary leading-snug mb-2 line-clamp-2 h-9 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warning mb-3">
          <div className="flex items-center gap-0.5 bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
            <Star size={10} className="fill-amber-500 text-amber-500" />
            <span>{product.rating || 4.8}</span>
          </div>
          <span className="text-text-tertiary text-[10px]">({product.reviewsCount || 45})</span>
        </div>

        {/* Footer: Price and Dynamic Add CTA */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-divider/40">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-extrabold text-text-primary">
              ₹{product.price}
            </span>
            {originalPrice > product.price && (
              <span className="text-[11px] line-through text-text-tertiary">
                ₹{originalPrice}
              </span>
            )}
          </div>

          {cartQty > 0 ? (
            <div className="flex items-center bg-primary text-white rounded-lg shadow-sm font-bold text-xs overflow-hidden">
              <button onClick={handleDecrement} className="p-1.5 hover:bg-primary-hover transition-colors">
                <Minus size={14} />
              </button>
              <span className="px-2 font-black text-xs">{cartQty}</span>
              <button onClick={handleIncrement} className="p-1.5 hover:bg-primary-hover transition-colors">
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <motion.button 
              onClick={handleAddToCart}
              className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={14} />
              <span>ADD</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
