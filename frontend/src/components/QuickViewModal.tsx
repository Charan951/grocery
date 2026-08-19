import React, { useState } from 'react';
import { Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { motion } from 'framer-motion';
import { X, Star, ShoppingBag, Plus, Minus, Zap, ShieldCheck, Store, Truck, CheckCircle2 } from 'lucide-react';

interface QuickViewModalProps {
  product: Product;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose }) => {
  const { addToCart } = useCartWishlist();

  const stockQty = getProductStockQuantity(product);
  const isOutOfStock = stockQty <= 0;
  const isLimitedStock = stockQty > 0 && stockQty < 10;

  const imageList = (product.images && product.images.length > 0) 
    ? product.images 
    : [product.imageUrl || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600'];

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const netWeight = product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g';
  const [quantity, setQuantity] = useState(1);

  const incrementQty = () => {
    if (quantity >= stockQty) {
      alert(`Only ${stockQty} items left in stock!`);
      return;
    }
    setQuantity((prev) => prev + 1);
  };
  const decrementQty = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (isOutOfStock) {
      alert(`Sorry, "${product.name}" is Out of Stock!`);
      return;
    }
    addToCart(product, quantity, netWeight);
    onClose();
  };

  const discountLabel = product.discount || (product.discountPercentage ? `${product.discountPercentage}% OFF` : product.discountText);
  const originalPrice = product.originalPrice || product.mrp || product.price;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        className="bg-surface border border-divider rounded-2xl w-full max-w-[900px] max-h-[92vh] overflow-y-auto p-5 md:p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <button 
          className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors z-20 w-8 h-8 rounded-full bg-background flex items-center justify-center border border-divider" 
          onClick={onClose} 
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-3">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-background border border-divider/60 relative flex items-center justify-center shadow-inner">
              {discountLabel && (
                <span className="absolute top-3 left-3 bg-pink-600 text-white text-xs font-black px-2.5 py-1 rounded-md z-10 uppercase tracking-wider shadow-sm">
                  {discountLabel}
                </span>
              )}
              <img 
                src={imageList[activeImgIndex]} 
                alt={product.name} 
                className="w-full h-full object-cover transition-all duration-300" 
              />
            </div>

            {/* Thumbnail Carousel */}
            {imageList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {imageList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIndex(idx)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 bg-background transition-all ${
                      activeImgIndex === idx ? 'border-emerald-500 scale-105 shadow-sm' : 'border-divider opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Specs */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md">
                {product.subCategory || product.category || product.brand || 'Fresh Produce'}
              </span>
              <h2 className="text-2xl font-black text-text-primary leading-tight mt-2">{product.name}</h2>
              <p className="text-xs text-text-tertiary font-bold mt-1">Net Quantity: {netWeight}</p>
              {isOutOfStock && (
                <span className="inline-block mt-2 bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-1 rounded-lg border border-rose-200">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 border-y border-divider/60 py-3">
              <span className="text-3xl font-black text-text-primary">₹{product.price}</span>
              {originalPrice > product.price && (
                <span className="text-lg line-through text-text-tertiary font-medium">₹{originalPrice}</span>
              )}
              {discountLabel && (
                <span className="text-xs font-extrabold text-pink-600 bg-pink-500/10 px-2 py-0.5 rounded">
                  {discountLabel}
                </span>
              )}
            </div>

            {/* Delivery Info Badge */}
            <div className="flex items-center gap-4 bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
                <Zap size={18} className="fill-emerald-500" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-emerald-400 block">Superfast Delivery in 10 Mins</span>
                <span className="text-text-tertiary">{product.delivery?.returnExchange || 'No Return or Exchange'}</span>
              </div>
            </div>

            {/* Highlights Chips */}
            {product.highlights && (
              <div className="flex flex-wrap gap-2 text-xs">
                {product.highlights.dietaryPreference && (
                  <span className="bg-surface border border-divider px-2.5 py-1 rounded-lg font-bold text-text-secondary flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {product.highlights.dietaryPreference}
                  </span>
                )}
                {product.highlights.goodFor && product.highlights.goodFor.map((tag, i) => (
                  <span key={i} className="bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-lg font-extrabold">
                    🌱 {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Seller Information Card */}
            {product.seller && (
              <div className="bg-background border border-divider/60 p-3 rounded-xl text-xs space-y-1 text-text-secondary">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <Store size={14} className="text-emerald-600" />
                  <span>Seller: {product.seller.name}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 text-text-tertiary">
                  <span>Origin: {product.seller.countryOfOrigin || 'India'}</span>
                  <span>Shelf Life: {product.seller.shelfLife || '4 days'}</span>
                </div>
              </div>
            )}

            {/* Quantity Selector & Add Button */}
            {isOutOfStock ? (
              <div className="pt-2">
                <button disabled className="w-full bg-gray-200 text-gray-500 font-extrabold py-3 px-6 rounded-xl text-sm border border-gray-300 cursor-not-allowed">
                  Out of Stock
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center border border-divider rounded-xl overflow-hidden bg-background">
                  <button onClick={decrementQty} className="px-3.5 py-2.5 text-text-secondary hover:bg-surface font-bold">
                    <Minus size={16} />
                  </button>
                  <span className="px-4 font-black text-sm text-text-primary">{quantity}</span>
                  <button 
                    onClick={incrementQty} 
                    disabled={quantity >= stockQty}
                    className={`px-3.5 py-2.5 font-bold transition-colors ${quantity >= stockQty ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-text-secondary hover:bg-surface'}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <motion.button 
                  onClick={handleAddToCart}
                  className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ShoppingBag size={18} />
                  <span>Add to Cart • ₹{product.price * quantity}</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
