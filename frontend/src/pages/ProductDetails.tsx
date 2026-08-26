import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCMS, Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '../utils/imageUtils';
import { 
  Star, Heart, Plus, Minus, ShoppingBag, Truck, 
  RotateCcw, ChevronDown, ChevronUp, CheckSquare, Square,
  ArrowLeft, ChevronRight, Clock, Search, Share2, ShieldCheck, Check
} from 'lucide-react';

interface ProductDetailsProps {
  onQuickView: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ onQuickView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, categories, seoSettings } = useCMS();
  const { cart, addToCart, removeFromCart, updateCartQuantity, toggleWishlist, isInWishlist, showLimitToast } = useCartWishlist();

  // Find target product
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  const stockQty = getProductStockQuantity(product);
  const isOutOfStock = stockQty <= 0;

  // Gallery, Quantity & Variant states
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [reviewsList, setReviewsList] = useState<Array<{ author: string; rating: number; date: string; content: string }>>([]);

  // Ref to details section for "View details" scroll
  const detailsRef = useRef<HTMLDivElement | null>(null);

  // Initialize variant weight
  useEffect(() => {
    if (product) {
      setSelectedWeight(product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g');
      setActiveThumb(0);
      
      // Seed default reviews
      setReviewsList([
        { author: 'Vikram Mehta', rating: 5, date: 'July 8, 2026', content: `Excellent quality ${product.name}! Arrived in less than 20 minutes. Packed beautifully in paper bags. Highly recommended.` },
        { author: 'Sarah D.', rating: 4, date: 'July 5, 2026', content: `Fresh and juicy. Sourced exactly at peak ripeness. Will buy again weekly.` }
      ]);
    }
  }, [product]);

  // Select related products (same category)
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 8);
  }, [products, product]);

  // If product not found
  if (!product) {
    return (
      <div className="page-wrapper py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-text-secondary mb-6">The grocery item you are looking for does not exist or has been removed.</p>
          <Link to="/products" className="bg-primary text-white py-3 px-6 rounded-full font-bold">Back to Shop</Link>
        </div>
      </div>
    );
  }

  const mainProductImg = getProductImage(product);
  const galleryImages = [
    mainProductImg,
    ...(Array.isArray(product.images) && product.images.length > 1 ? product.images.slice(1).filter(Boolean) : [])
  ];

  const cartItem = cart.find(
    (item) => item.product.id === product.id && item.selectedWeight === (selectedWeight || '500 g')
  );
  const currentQtyInCart = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    addToCart(product, 1, selectedWeight || '500 g');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on FreshCart!`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const scrollToDetails = () => {
    if (detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categoryName = categories.find((c) => c.id === product.categoryId)?.name || 'Grocery';

  return (
    <div className="page-wrapper bg-[#F7F7F7] min-h-screen">
      <SEO 
        title={`${product.name} | FreshCart Organic Store`}
        description={product.description || `${product.name} fresh produce`}
        ogImage={product.imageUrl || (product.images && product.images[0]) || ''}
      />

      {/* TOP HEADER BAR (Mobile & Desktop) matching Image 2 reference */}
      <header className="sticky top-0 z-[990] bg-white/95 backdrop-blur-md border-b border-gray-100 px-3.5 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Circular Back Button */}
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/products');
              }
            }}
            className="w-9 h-9 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Muted category & title path */}
          <span className="text-xs sm:text-sm font-semibold text-gray-600 truncate max-w-[160px] sm:max-w-[340px]">
            {categoryName} &rsaquo; {product.name}
          </span>
        </div>

        {/* Action icons: Wishlist, Search, Share */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleWishlist(product)}
            className={`w-9 h-9 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center transition-all cursor-pointer ${
              isInWishlist(product.id) ? 'text-rose-500 border-rose-200 bg-rose-50' : 'text-gray-600 hover:text-rose-500'
            }`}
            aria-label="Wishlist"
          >
            <Heart size={17} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => navigate('/products')}
            className="w-9 h-9 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search size={17} />
          </button>

          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer relative"
            aria-label="Share"
          >
            <Share2 size={17} />
            {copiedShare && (
              <span className="absolute -bottom-8 right-0 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO BANNER SECTION (Image 2 Reference Style) */}
      <div className="relative bg-gradient-to-b from-[#FAF5EC] via-[#FDFBF7] to-[#F7F7F7] pt-4 pb-6 px-4 flex flex-col items-center">
        
        {/* Large Image Showcase */}
        <div className="w-full max-w-[420px] aspect-square flex items-center justify-center relative my-2">
          <img
            src={galleryImages[activeThumb]}
            alt={product.name}
            className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-all duration-300"
          />
        </div>

        {/* Carousel dot indicators if gallery images > 1 */}
        {galleryImages.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2 mb-3">
            {galleryImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveThumb(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeThumb === idx ? 'w-5 bg-gray-800' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* "View details" Floating Button at bottom right of image container */}
        <div className="w-full max-w-[460px] flex justify-end px-2 mt-1">
          <button
            onClick={scrollToDetails}
            className="border border-emerald-600/50 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1"
          >
            View details
          </button>
        </div>
      </div>

      {/* PRODUCT DETAILS CARDS CONTAINER */}
      <div className="container mx-auto px-3.5 sm:px-6 max-w-[800px] space-y-3 pb-28 sm:pb-24 -mt-2">
        
        {/* CARD 1: Delivery Badge, Title, Net Qty & Price Box */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-gray-100 space-y-3">
          
          {/* 8 mins Delivery Badge */}
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-600 bg-gray-100/70 w-fit px-2.5 py-1 rounded-full border border-gray-200/50">
            <Clock size={14} className="text-emerald-600" />
            <span>8 mins delivery</span>
          </div>

          {/* Product Title */}
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
            {product.name}
          </h1>

          {/* Net Qty */}
          <p className="text-xs sm:text-sm font-extrabold text-gray-500">
            {selectedWeight || product.netQuantity || '500 g'}
          </p>

          {/* Weight Options Pills if available */}
          {product.weightOptions && product.weightOptions.length > 1 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs font-bold text-gray-400 mr-1">Select Pack:</span>
              {product.weightOptions.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeight(w)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2.5 pt-2 border-t border-gray-100">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">
              ₹{product.price}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 line-through font-bold">
              MRP ₹{product.mrp}
            </span>
            {product.discountText && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                {product.discountText}
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: Brand / Seller Store Card ("Explore all products") */}
        <div 
          onClick={() => navigate(`/products?search=${encodeURIComponent(product.brand || categoryName)}`)}
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-2xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-800 font-black text-base shrink-0">
              🌿
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                {product.brand || 'Earth Greens'}
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                Explore all products
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </div>

        {/* CARD 3: Guarantee Policy Card ("48 hours only replacement") */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gray-200/80 flex items-center justify-center text-gray-700 shrink-0">
              <RotateCcw size={16} />
            </div>
            <span className="text-sm font-black text-gray-800">
              48 hours only replacement
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </div>

        {/* CARD 4: Top Products in this Category */}
        {relatedProducts.length > 0 && (
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-2xs space-y-3">
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Top products in this category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedProducts.slice(0, 4).map((prod) => (
                <ProductCard key={prod.id} product={prod} onQuickView={onQuickView} />
              ))}
            </div>
          </div>
        )}

        {/* TARGET OF "View Details" SCROLL */}
        <div ref={detailsRef} className="space-y-3 pt-2">
          
          {/* Highlights Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Highlights</h3>
            <div className="space-y-2 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 py-1.5 border-b border-gray-100">
                <span className="text-gray-400 font-bold">Category</span>
                <span className="font-bold text-gray-800">{categoryName}</span>
              </div>
              <div className="grid grid-cols-2 py-1.5 border-b border-gray-100">
                <span className="text-gray-400 font-bold">Dietary Preference</span>
                <span className="font-bold text-gray-800">100% Veg / Organic</span>
              </div>
              <div className="grid grid-cols-2 py-1.5 border-b border-gray-100">
                <span className="text-gray-400 font-bold">Storage Info</span>
                <span className="font-bold text-gray-800">Store in cool dry place</span>
              </div>
              <div className="grid grid-cols-2 py-1.5">
                <span className="text-gray-400 font-bold">Shelf Life</span>
                <span className="font-bold text-gray-800">4 days from delivery</span>
              </div>
            </div>
          </div>

          {/* Product Description & Information Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Product Description</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
              {product.description || 'Farm-sourced fresh quality produce, packed under hygienic conditions and delivered directly to your doorstep in minutes.'}
            </p>

            <div className="pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500 font-medium">
              <p className="font-bold text-gray-700">Seller: FreshCart Retail Private Limited</p>
              <p>FSSAI Lic. No. 10019043002698</p>
              <p>Customer Support: support@freshcart.com</p>
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Customer Reviews</h3>
              <div className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                <Star size={14} fill="currentColor" />
                <span>{product.rating} / 5</span>
              </div>
            </div>

            <div className="space-y-3">
              {reviewsList.map((rev, i) => (
                <div key={i} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-900">{rev.author}</span>
                    <span className="text-gray-400 text-[10px]">{rev.date}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-normal">{rev.content}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* STICKY BOTTOM PRODUCT ACTION BAR (Replacing general BottomNav on product details page) */}
      <div className="fixed bottom-0 left-0 right-0 z-[995] bg-white border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-8">
        <div className="max-w-[800px] mx-auto flex items-center justify-between gap-4">
          {/* Left Info: Net Qty, Price & MRP */}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500">
              {selectedWeight || product.netQuantity || '500 g'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-gray-900">
                ₹{product.price}
              </span>
              <span className="text-xs text-gray-400 line-through font-bold">
                MRP ₹{product.mrp}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold block -mt-0.5">
              Inclusive of all taxes
            </span>
          </div>

          {/* Right Action Button: Add to cart or quantity controller */}
          <div>
            {isOutOfStock ? (
              <button
                disabled
                className="bg-gray-200 text-gray-500 font-extrabold py-3 px-6 rounded-xl text-sm cursor-not-allowed border border-gray-300"
              >
                Out of Stock
              </button>
            ) : currentQtyInCart > 0 ? (
              <div className="flex items-center bg-[#1c8c2b] text-white rounded-xl h-11 px-3 gap-3 font-extrabold shadow-sm">
                <button
                  onClick={() => updateCartQuantity(product.id, selectedWeight || '500 g', currentQtyInCart - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-lg cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="text-sm font-black min-w-[18px] text-center">{currentQtyInCart}</span>
                <button
                  onClick={() => {
                    if (currentQtyInCart >= 3) {
                      showLimitToast();
                    } else {
                      addToCart(product, 1, selectedWeight || '500 g');
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-lg cursor-pointer"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.98 }}
                className="bg-[#1c8c2b] hover:bg-[#157521] text-white font-black py-3 px-7 sm:px-8 rounded-xl text-sm sm:text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Add to cart
              </motion.button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
