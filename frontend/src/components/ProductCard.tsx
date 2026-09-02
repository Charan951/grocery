import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity, MAX_CUSTOMER_QTY_LIMIT } from '../context/CartWishlistContext';
import { Heart, Plus, Minus } from 'lucide-react';
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
  const isVeg = product.highlights?.dietaryPreference !== 'Non-Veg';

  return (
    <div className="bg-transparent flex flex-col h-full group border-0 shadow-none">
      {/* 1. Image Container Wrapper (Outline Border ONLY around Image Box) */}
      <div className="relative w-full aspect-square bg-[#f9fafb] dark:bg-emerald-950/20 rounded-2xl border border-divider overflow-hidden flex items-center justify-center p-2 group/img shadow-2xs">

        {/* Wishlist Heart Icon */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 z-20 w-6.5 h-6.5 rounded-full bg-white/95 dark:bg-black/60 flex items-center justify-center border border-divider/40 shadow-2xs transition-transform active:scale-90 ${favorited ? 'text-rose-500 fill-rose-500' : 'text-text-secondary hover:text-rose-500'}`}
          title={favorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={13} className={favorited ? 'fill-rose-500 text-rose-500' : ''} />
        </button>

        {/* Veg / Non-Veg Indicator at Bottom Left */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center justify-center w-3.5 h-3.5 border border-emerald-600 bg-white p-0.5 rounded-[3px]">
          <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 z-20 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs uppercase">
            Out of Stock
          </div>
        )}

        {/* Product Image */}
        <Link to={`/product/${product.id}`} className="w-full h-full flex items-center justify-center p-1">
          <img
            src={displayImage}
            alt={product.name}
            className={`w-full h-full object-contain transition-transform duration-200 group-hover/img:scale-105 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            loading="lazy"
          />
        </Link>

        {/* ADD Button Floating on Bottom Right of Image Container */}
        <div className="absolute bottom-2 right-2 z-20">
          {isOutOfStock ? (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-400 text-[9.5px] font-bold px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700">
              Sold Out
            </span>
          ) : cartQty > 0 ? (
            <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md font-black text-xs overflow-hidden">
              <button onClick={handleDecrement} className="p-1.5 hover:bg-emerald-700 transition-colors">
                <Minus size={12} strokeWidth={3} />
              </button>
              <span className="px-2 font-black text-xs">{cartQty}</span>
              <button
                onClick={handleIncrement}
                disabled={cartQty >= stockQty}
                className={`p-1.5 transition-colors ${cartQty >= stockQty ? 'opacity-40 cursor-not-allowed bg-emerald-800' : 'hover:bg-emerald-700'}`}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="bg-white border-2 border-rose-500 text-rose-600 font-extrabold text-[11px] px-3.5 py-1 rounded-xl hover:bg-rose-600 hover:text-white transition-all duration-200 cursor-pointer shadow-sm uppercase tracking-wider flex flex-col items-center leading-none"
            >
              <span>ADD</span>
              {hasOptions && (
                <span className="text-[8px] font-medium lowercase leading-none mt-0.5 text-rose-500 group-hover:text-white">
                  {product.weightOptions?.length} options
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Details Section (Outside Image Container, NO outline border) */}
      <div className="pt-2 sm:pt-2.5 flex flex-col flex-1">
        {/* Price Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="bg-emerald-700 text-white font-black text-xs px-2 py-0.5 rounded-md">
            ₹{product.price}
          </span>
          {originalPrice > product.price && (
            <span className="text-xs text-text-secondary line-through font-medium">
              ₹{originalPrice}
            </span>
          )}
        </div>

        {/* Discount Amount Tag */}
        {originalPrice > product.price && (
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight mt-1">
            ₹{originalPrice - product.price} OFF
          </div>
        )}

        {/* Product Title */}
        <Link to={`/product/${product.id}`} className="block mt-1">
          <h3 className="text-xs sm:text-sm font-bold text-text-primary leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Net Quantity / Weight */}
        <div className="text-xs text-text-secondary font-medium mt-0.5">
          {netWeight}
        </div>

        {/* Brand Tag & Rating Row */}
        <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
          {product.brand && (
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-semibold px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {product.brand}
            </span>
          )}
          {product.rating && (
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 ml-auto">
              <span>★ {product.rating}</span>
              {product.reviewsCount ? <span className="text-text-secondary font-normal">({product.reviewsCount})</span> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
