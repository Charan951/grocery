import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCMS, Product } from '../context/CMSContext';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { ProductCard } from '../components/ProductCard';
import { ProductReviews } from '../components/ProductReviews';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '../utils/imageUtils';
import { 
  Star, Heart, Plus, Minus, ShoppingBag, Truck, 
  RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ArrowLeft, Clock, Search, Share2, ShieldCheck, Check, Zap, Tag,
  ShoppingBag as CartIcon, User, MapPin, ExternalLink, X
} from 'lucide-react';

interface ProductDetailsProps {
  onQuickView: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ onQuickView }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, categories } = useCMS();
  const { cart, addToCart, removeFromCart, updateCartQuantity, toggleWishlist, isInWishlist, showLimitToast, cartCount, cartSubtotal } = useCartWishlist();

  // Find target product (by id or slug or _id)
  const product = useMemo(() => {
    if (!id) return undefined;
    return products.find((p) => p.id === id || p._id === id || p.slug === id);
  }, [products, id]);

  const stockQty = getProductStockQuantity(product);
  const isOutOfStock = stockQty <= 0;

  // Gallery, Quantity & Variant states
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Amazon/Blinkit Image Hover Zoom States (Desktop)
  const [isZooming, setIsZooming] = useState(false);
  const [lensPos, setLensPos] = useState({ left: 0, top: 0, width: 140, height: 140 });
  const [zoomPercent, setZoomPercent] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Gallery thumbnails scroll ref
  const thumbScrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize variant weight & thumb index
  useEffect(() => {
    if (product) {
      setSelectedWeight(product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g');
      setActiveThumb(0);
    }
  }, [product]);

  // Select related products (same category) & people also bought
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => (p.categoryId === product.categoryId || p.category === product.category) && p.id !== product.id).slice(0, 6);
  }, [products, product]);

  const peopleAlsoBought = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.id !== product.id).slice(6, 12);
  }, [products, product]);

  // Gallery images array normalization
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const mainImg = getProductImage(product);
    let list: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      list = product.images.filter(img => typeof img === 'string' && img.trim().length > 0);
    }
    if (mainImg && !list.includes(mainImg)) {
      list.unshift(mainImg);
    }
    return list.length > 0 ? list : [mainImg];
  }, [product]);

  // Image Hover Zoom Tracking Logic (Desktop)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const lensWidth = 140;
    const lensHeight = 140;

    let left = mouseX - lensWidth / 2;
    let top = mouseY - lensHeight / 2;

    left = Math.max(0, Math.min(left, rect.width - lensWidth));
    top = Math.max(0, Math.min(top, rect.height - lensHeight));

    const percentX = (rect.width - lensWidth) > 0 ? (left / (rect.width - lensWidth)) * 100 : 0;
    const percentY = (rect.height - lensHeight) > 0 ? (top / (rect.height - lensHeight)) * 100 : 0;

    setLensPos({ left, top, width: lensWidth, height: lensHeight });
    setZoomPercent({ x: percentX, y: percentY });
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  // Thumbnail navigation buttons
  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbScrollRef.current) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      thumbScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleShare = () => {
    if (navigator.share && product) {
      navigator.share({
        title: product.name,
        text: `Buy ${product.name} on FreshCart`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // If product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center py-20 px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-2xl">
            🛒
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">The item you are looking for does not exist or was removed from catalog.</p>
          <button onClick={() => navigate('/products')} className="bg-[#0c831f] text-white py-3 px-8 rounded-xl font-bold hover:bg-[#096618] transition-all cursor-pointer">
            Return to Shop
          </button>
        </div>
      </div>
    );
  }

  const currentImage = galleryImages[activeThumb] || galleryImages[0];
  const cartItem = cart.find((item) => item.product.id === product.id && item.selectedWeight === (selectedWeight || '500 g'));
  const currentQtyInCart = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    addToCart(product, 1, selectedWeight || '500 g');
  };

  const categoryName = categories.find((c) => c.id === product.categoryId || c.slug === product.categoryId)?.name || product.category || 'Grocery';

  const handleBackNav = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  return (
    <>
      <SEO 
        title={`${product.name} - Buy Online at Best Price in India | FreshCart`}
        description={product.description || `Buy ${product.name} online at best prices. Fast 10-minute delivery to your doorstep.`}
        ogImage={currentImage}
      />

      {/* ========================================================================= */}
      {/* 1. MOBILE BLINKIT-STYLE PRODUCT DETAIL PAGE (Visible only on < 768px screens) */}
      {/* ========================================================================= */}
      <div className="block md:hidden bg-[#F4F5F7] min-h-screen pb-28 select-none">
        
        {/* MOBILE PRODUCT IMAGE AREA WITH FLOATING OVERLAY CONTROLS */}
        <div className="relative w-full bg-white border-b border-gray-100 overflow-hidden">
          
          {/* Floating Top Bar (Over Image) */}
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
            {/* Top Left: Back Button */}
            <button
              onClick={handleBackNav}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md flex items-center justify-center text-gray-800 active:scale-95 pointer-events-auto cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            {/* Top Right: Actions Row */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Wishlist */}
              <button
                onClick={() => toggleWishlist(product)}
                className={`w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                  isInWishlist(product.id) ? 'text-rose-500 bg-rose-50' : 'text-gray-700'
                }`}
                aria-label="Wishlist"
              >
                <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
              </button>

              {/* Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md flex items-center justify-center text-gray-700 active:scale-95 cursor-pointer"
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md flex items-center justify-center text-gray-700 active:scale-95 cursor-pointer relative"
                aria-label="Share product"
              >
                <Share2 size={18} />
                {copiedShare && (
                  <span className="absolute -bottom-8 right-0 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-40">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Floating Mobile Search Bar (If active) */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-3 right-3 z-30 bg-white rounded-2xl shadow-xl p-2 border border-gray-200 flex items-center gap-2"
              >
                <Search size={16} className="text-gray-400 ml-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="flex-1 text-xs bg-transparent border-none outline-none font-medium text-gray-800"
                  autoFocus
                />
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Image Viewport */}
          <div className="relative w-full h-[310px] sm:h-[360px] flex items-center justify-center p-6 bg-white">
            <img
              src={currentImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-xs transition-all duration-300"
            />

            {/* Discount Badge */}
            {(product.discountText || (product.originalPrice && product.originalPrice > product.price)) && (
              <div className="absolute bottom-3 left-3 bg-[#2554d7] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tight shadow-xs z-10">
                {product.discountText || `${Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}% OFF`}
              </div>
            )}
          </div>

          {/* Multiple Images Dots Indicator */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-3 bg-white">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveThumb(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeThumb === idx ? 'w-5 bg-[#0c831f]' : 'w-1.5 bg-gray-300'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT INFORMATION CARD */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs mx-3.5 mt-3 flex flex-col gap-2.5">
          {/* Delivery Time & Stock Row */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#0c831f] border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-tight">
              <Zap size={12} className="fill-[#0c831f]" />
              <span>8 mins delivery</span>
            </div>
            {stockQty > 0 && stockQty <= 5 && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                Only {stockQty} left!
              </span>
            )}
          </div>

          {/* Product Title */}
          <h1 className="text-base font-black text-gray-900 leading-snug tracking-tight">
            {product.name}
          </h1>

          {/* Weight / Unit Pack Selector */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="text-xs font-bold text-gray-500">Unit:</span>
            {product.weightOptions && product.weightOptions.length > 0 ? (
              product.weightOptions.map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeight(w)}
                  className={`px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    selectedWeight === w
                      ? 'bg-emerald-50 border-[#0c831f] text-[#0c831f] shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {w}
                </button>
              ))
            ) : (
              <span className="px-3 py-1 rounded-xl text-xs font-black border border-gray-200 bg-gray-50 text-gray-700">
                {selectedWeight || product.netQuantity || '500 g'}
              </span>
            )}
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2 pt-1 border-t border-gray-100 mt-1">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              ₹{product.price}
            </span>
            {(product.originalPrice || product.mrp) > product.price && (
              <span className="text-xs text-gray-400 line-through font-bold">
                MRP ₹{product.originalPrice || product.mrp}
              </span>
            )}
            {product.discountText && (
              <span className="text-[10px] font-black text-[#0c831f] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {product.discountText}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
            Inclusive of all taxes
          </span>
        </div>

        {/* REPLACEMENT / QUALITY POLICY CARD */}
        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-2xs mx-3.5 mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#0c831f] flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-gray-900 leading-tight">
                {product.delivery?.returnExchange || '48 hours replacement policy'}
              </span>
              <span className="text-[11px] text-gray-500 font-medium leading-tight">
                Guarantee of fresh quality or instant replacement
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400 shrink-0" />
        </div>

        {/* TOP PRODUCTS IN THIS CATEGORY CAROUSEL */}
        {relatedProducts.length > 0 && (
          <div className="mt-4 px-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                Top products in this category
              </h2>
              <Link
                to={`/products?category=${product.categoryId}`}
                className="text-xs font-black text-[#0c831f]"
              >
                See all
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
              {relatedProducts.map((prod) => (
                <div key={prod.id} className="w-[145px] shrink-0">
                  <ProductCard product={prod} onQuickView={onQuickView} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PEOPLE ALSO BOUGHT CAROUSEL */}
        {peopleAlsoBought.length > 0 && (
          <div className="mt-4 px-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                People also bought
              </h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
              {peopleAlsoBought.map((prod) => (
                <div key={prod.id} className="w-[145px] shrink-0">
                  <ProductCard product={prod} onQuickView={onQuickView} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCT DETAILS ACCORDION */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs mx-3.5 mt-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
            Product Details
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            {product.description || 'Sourced fresh from top certified local farms under standard quality controls.'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1 text-[11px] text-gray-500 font-medium">
            <p><strong className="text-gray-700">Shelf Life:</strong> {product.seller?.shelfLife || '4 days'}</p>
            <p><strong className="text-gray-700">Country of Origin:</strong> {product.seller?.countryOfOrigin || 'India'}</p>
            <p><strong className="text-gray-700">FSSAI Lic:</strong> 10019043002698</p>
          </div>
        </div>

        {/* RATINGS & REVIEWS (mobile) */}
        {product && (
          <div className="mx-3.5">
            <ProductReviews productId={product.id || product._id || id || ''} />
          </div>
        )}

        {/* STICKY BOTTOM ADD TO CART PURCHASE BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-[999] bg-white border-t border-gray-200 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between">
          {/* Left: Unit & Price */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-gray-500">
              {selectedWeight || product.netQuantity || '500 g'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-gray-900">
                ₹{product.price}
              </span>
              {(product.originalPrice || product.mrp) > product.price && (
                <span className="text-xs text-gray-400 line-through font-bold">
                  ₹{product.originalPrice || product.mrp}
                </span>
              )}
            </div>
            <span className="text-[9px] text-gray-400 font-medium">Inclusive of all taxes</span>
          </div>

          {/* Right: Add to Cart CTA / Quantity Controller */}
          <div>
            {isOutOfStock ? (
              <button
                disabled
                className="bg-gray-200 text-gray-500 font-extrabold py-2.5 px-6 rounded-xl text-xs cursor-not-allowed border border-gray-300"
              >
                Out of Stock
              </button>
            ) : currentQtyInCart > 0 ? (
              <div className="inline-flex items-center bg-[#0c831f] text-white rounded-xl h-10 px-3 gap-3 font-black shadow-sm">
                <button
                  onClick={() => updateCartQuantity(product.id, selectedWeight || '500 g', currentQtyInCart - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-lg cursor-pointer"
                  aria-label="Decrease"
                >
                  -
                </button>
                <span className="text-sm font-black min-w-[16px] text-center">{currentQtyInCart}</span>
                <button
                  onClick={() => {
                    if (currentQtyInCart >= 3) {
                      showLimitToast();
                    } else {
                      addToCart(product, 1, selectedWeight || '500 g');
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-lg cursor-pointer"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.96 }}
                className="bg-[#0c831f] hover:bg-[#096618] text-white font-black py-2.5 px-7 rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Add to cart
              </motion.button>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP PRODUCT DETAIL PAGE (Visible only on md: 768px+ screens) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-[#F8F9FB] min-h-screen font-sans text-gray-900 pb-20">
        
        {/* TOP NAVIGATION BAR (ONLY BACK BUTTON) */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-4 py-2.5 flex items-center">
            <button
              onClick={handleBackNav}
              className="inline-flex items-center gap-1.5 text-xs font-black text-gray-700 hover:text-emerald-700 bg-gray-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all border border-gray-200 cursor-pointer shadow-2xs active:scale-95"
              title="Go back to previous page"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* MAIN TWO-COLUMN CONTAINER */}
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-4 sm:p-8 relative">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Main Image Viewport & Amazon-style Zoom Lens & Thumbnails (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                {/* Main Product Image Frame */}
                <div className="relative w-full aspect-square bg-[#FAFAFA] rounded-2xl border border-gray-200/80 overflow-hidden flex items-center justify-center p-4 group">
                  
                  {/* Image Container with Mouse Tracking for Zoom Lens */}
                  <div
                    ref={imageContainerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative w-full h-full flex items-center justify-center cursor-crosshair select-none"
                  >
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-200"
                    />

                    {/* Translucent Amazon-style Zoom Lens Rect */}
                    {isZooming && (
                      <div
                        className="absolute border-2 border-[#0c831f] bg-[#0c831f]/15 backdrop-blur-[0.5px] pointer-events-none rounded-sm shadow-2xs z-20"
                        style={{
                          left: `${lensPos.left}px`,
                          top: `${lensPos.top}px`,
                          width: `${lensPos.width}px`,
                          height: `${lensPos.height}px`
                        }}
                      />
                    )}
                  </div>

                  {/* Discount Badge overlay */}
                  {(product.discountText || (product.originalPrice && product.originalPrice > product.price)) && (
                    <div className="absolute top-3 left-3 bg-[#2554d7] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs uppercase tracking-tight z-10">
                      {product.discountText || `${Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}% OFF`}
                    </div>
                  )}

                  {/* Wishlist Heart */}
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer ${
                      isInWishlist(product.id) ? 'text-rose-500 bg-rose-50 border-rose-200' : 'text-gray-400 hover:text-rose-500'
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Thumbnails Gallery Carousel Row */}
                {galleryImages.length > 0 && (
                  <div className="relative flex items-center">
                    {galleryImages.length > 4 && (
                      <button
                        onClick={() => scrollThumbnails('left')}
                        className="absolute -left-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    )}

                    <div
                      ref={thumbScrollRef}
                      className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-1 w-full"
                    >
                      {galleryImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveThumb(idx)}
                          className={`relative shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-all cursor-pointer ${
                            activeThumb === idx
                              ? 'border-[#0c831f] ring-2 ring-[#0c831f]/20 scale-105 shadow-2xs'
                              : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain p-1" />
                        </button>
                      ))}
                    </div>

                    {galleryImages.length > 4 && (
                      <button
                        onClick={() => scrollThumbnails('right')}
                        className="absolute -right-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Product Meta, Pricing, Add to Cart & Blinkit "Why shop" Box OR Zoom Preview (7 cols) */}
              <div className="lg:col-span-7 relative flex flex-col gap-5">
                
                {/* HIGH DEFINITION AMAZON/BLINKIT ZOOM PREVIEW PANEL */}
                {isZooming ? (
                  <div className="absolute inset-0 z-50 bg-white rounded-2xl border-2 border-[#0c831f]/30 shadow-2xl overflow-hidden min-h-[380px] flex flex-col p-2">
                    <div className="bg-[#FAFAFA] text-[11px] font-extrabold text-[#0c831f] px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
                      <span>MAGNIFIED HIGH DEFINITION PREVIEW</span>
                      <span className="text-[10px] text-gray-400 font-bold">2.5X ZOOM</span>
                    </div>
                    <div
                      className="w-full flex-1 bg-no-repeat rounded-xl"
                      style={{
                        backgroundImage: `url(${currentImage})`,
                        backgroundSize: '280% 280%',
                        backgroundPosition: `${zoomPercent.x}% ${zoomPercent.y}%`
                      }}
                    />
                  </div>
                ) : null}

                {/* Standard Right Column Content */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    {product.brand || categoryName}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                    {product.name}
                  </h1>
                  
                  {/* Quantity / Weight tag */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-black text-gray-700 mb-4">
                    <Clock size={14} className="text-[#0c831f]" />
                    <span>{selectedWeight || product.netQuantity || '500 g'}</span>
                  </div>

                  {/* Pack Options selector if available */}
                  {product.weightOptions && product.weightOptions.length > 1 && (
                    <div className="mb-4">
                      <span className="text-xs font-bold text-gray-500 block mb-2">Select Unit Pack:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {product.weightOptions.map((w, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedWeight(w)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              selectedWeight === w
                                ? 'bg-emerald-50 border-[#0c831f] text-[#0c831f] shadow-2xs'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Display */}
                  <div className="flex items-baseline gap-3 pt-2 pb-4 border-t border-b border-gray-100 my-2">
                    <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                      ₹{product.price}
                    </span>
                    {(product.originalPrice || product.mrp) > product.price && (
                      <span className="text-base text-gray-400 line-through font-bold">
                        MRP ₹{product.originalPrice || product.mrp}
                      </span>
                    )}
                    {product.discountText && (
                      <span className="text-xs font-black text-[#0c831f] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {product.discountText}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-medium block">
                      (Inclusive of all taxes)
                    </span>
                  </div>

                  {/* Add to Cart / Quantity Controller */}
                  <div className="pt-2 pb-4">
                    {isOutOfStock ? (
                      <button
                        disabled
                        className="w-full sm:w-auto bg-gray-200 text-gray-500 font-extrabold py-3.5 px-10 rounded-xl text-sm cursor-not-allowed border border-gray-300"
                      >
                        Out of Stock
                      </button>
                    ) : currentQtyInCart > 0 ? (
                      <div className="inline-flex items-center bg-[#0c831f] text-white rounded-xl h-12 px-4 gap-4 font-black shadow-md">
                        <button
                          onClick={() => updateCartQuantity(product.id, selectedWeight || '500 g', currentQtyInCart - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-xl cursor-pointer"
                          aria-label="Decrease"
                        >
                          -
                        </button>
                        <span className="text-base font-black min-w-[20px] text-center">{currentQtyInCart}</span>
                        <button
                          onClick={() => {
                            if (currentQtyInCart >= 3) {
                              showLimitToast();
                            } else {
                              addToCart(product, 1, selectedWeight || '500 g');
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-xl cursor-pointer"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <motion.button
                        onClick={handleAddToCart}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto bg-[#0c831f] hover:bg-[#096618] text-white font-black py-3.5 px-10 rounded-xl text-sm sm:text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        Add to cart
                      </motion.button>
                    )}
                  </div>

                  {/* "WHY SHOP FROM FRESHCART?" SECTION */}
                  <div className="mt-4 p-5 rounded-2xl bg-[#F8F9FA] border border-gray-200/80 flex flex-col gap-4">
                    <h3 className="font-extrabold text-sm text-gray-900">Why shop from FreshCart?</h3>

                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100/80 border border-amber-200/60 flex items-center justify-center text-amber-700 text-lg shrink-0">
                          ⚡
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-xs font-black text-gray-900">Round The Clock Delivery</h4>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                            Get items delivered to your doorstep from dark stores near you, whenever you need them.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100/80 border border-amber-200/60 flex items-center justify-center text-amber-700 text-lg shrink-0">
                          🏷️
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-xs font-black text-gray-900">Best Prices & Offers</h4>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                            Best price destination with offers directly from the manufacturers.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center text-emerald-800 text-lg shrink-0">
                          🛒
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-xs font-black text-gray-900">Wide Assortment</h4>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                            Choose from 30,000+ products across food, personal care, household & other categories.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* PRODUCT DETAILS & SPECIFICATIONS ACCORDION */}
            <div className="mt-10 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-black text-gray-900 mb-4">Product Details</h2>

              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-gray-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-gray-700">
                  <div className="flex flex-col gap-1 pb-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-bold text-[11px]">Type / Category</span>
                    <span className="font-extrabold text-gray-900">{categoryName}</span>
                  </div>
                  <div className="flex flex-col gap-1 pb-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-bold text-[11px]">Net Quantity</span>
                    <span className="font-extrabold text-gray-900">{selectedWeight || product.netQuantity || '500 g'}</span>
                  </div>
                  <div className="flex flex-col gap-1 pb-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-bold text-[11px]">Shelf Life</span>
                    <span className="font-extrabold text-gray-900">{product.seller?.shelfLife || '4 days from delivery'}</span>
                  </div>
                  <div className="flex flex-col gap-1 pb-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-bold text-[11px]">Country of Origin</span>
                    <span className="font-extrabold text-gray-900">{product.seller?.countryOfOrigin || 'India'}</span>
                  </div>
                </div>

                {showMoreDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-gray-200 space-y-3 text-xs text-gray-600 leading-relaxed font-medium"
                  >
                    <div>
                      <h4 className="font-black text-gray-900 mb-1">Description</h4>
                      <p>{product.description || 'Sourced fresh from top certified local farms under standard quality controls.'}</p>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 space-y-1 text-[11px] text-gray-500">
                      <p><strong className="text-gray-700">Seller Name:</strong> {product.seller?.name || 'FreshCart Retail Private Limited'}</p>
                      <p><strong className="text-gray-700">FSSAI License No:</strong> 10019043002698</p>
                      <p><strong className="text-gray-700">Customer Support:</strong> support@freshcart.com</p>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="text-[#0c831f] text-xs font-black flex items-center gap-1 hover:underline cursor-pointer pt-1"
                >
                  <span>{showMoreDetails ? 'View less details' : 'View more details'}</span>
                  {showMoreDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* RATINGS & REVIEWS */}
            {product && <ProductReviews productId={product.id || product._id || id || ''} />}

            {/* SIMILAR PRODUCTS SECTION */}
            {relatedProducts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-black text-gray-900 mb-5">Similar products</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {relatedProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} onQuickView={onQuickView} />
                  ))}
                </div>
              </div>
            )}

            {/* PEOPLE ALSO BOUGHT SECTION */}
            {peopleAlsoBought.length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-black text-gray-900 mb-5">People also bought</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {peopleAlsoBought.map((prod) => (
                    <ProductCard key={prod.id} product={prod} onQuickView={onQuickView} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* FRESHCART FOOTER */}
        <footer className="mt-16 bg-white border-t border-gray-200 pt-12 pb-16">
          <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-3">
              <h3 className="font-extrabold text-sm text-gray-900 mb-4">Useful Links</h3>
              <div className="grid grid-cols-3 gap-y-2 text-xs font-semibold text-gray-500">
                <Link to="/blog" className="hover:text-gray-900">Blog</Link>
                <Link to="/stores" className="hover:text-gray-900">Partner</Link>
                <Link to="/about" className="hover:text-gray-900">Recipes</Link>
                <Link to="/legal" className="hover:text-gray-900">Privacy</Link>
                <Link to="/stores" className="hover:text-gray-900">Franchise</Link>
                <Link to="/about" className="hover:text-gray-900">Bistro</Link>
                <Link to="/legal" className="hover:text-gray-900">Terms</Link>
                <Link to="/admin" className="hover:text-gray-900">Seller</Link>
                <Link to="/locations" className="hover:text-gray-900">District</Link>
                <Link to="/help" className="hover:text-gray-900">FAQs</Link>
                <Link to="/locations" className="hover:text-gray-900">Warehouse</Link>
                <Link to="/about" className="hover:text-gray-900">FreshCart Express</Link>
                <Link to="/legal" className="hover:text-gray-900">Security</Link>
                <Link to="/careers" className="hover:text-gray-900">Deliver</Link>
                <Link to="/about" className="hover:text-gray-900">Feeding India</Link>
                <Link to="/help" className="hover:text-gray-900">Contact</Link>
                <Link to="/about" className="hover:text-gray-900">Resources</Link>
              </div>
            </div>

            <div className="md:col-span-8 space-y-3 border-t md:border-t-0 md:border-l border-gray-200 pt-8 md:pt-0 md:pl-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm text-gray-900">Categories</h3>
                <Link to="/categories" className="text-xs font-bold text-[#0c831f] hover:underline">see all</Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs font-semibold text-gray-500">
                <Link to="/products?category=fruits-vegetables" className="hover:text-gray-900">Vegetables & Fruits</Link>
                <Link to="/products?category=dairy-bread-eggs" className="hover:text-gray-900">Dairy, Bread & Eggs</Link>
                <Link to="/products?category=meats-fish-eggs" className="hover:text-gray-900">Meats, Fish & Eggs</Link>
                <Link to="/products?category=tea-coffee-health-drinks" className="hover:text-gray-900">Drinks & Juices</Link>
                <Link to="/products?category=atta-rice-oil-dals" className="hover:text-gray-900">Atta, Rice & Dal</Link>
                <Link to="/products?category=breakfast-cereals-spreads-sauces" className="hover:text-gray-900">Breakfast & Sauces</Link>
                <Link to="/products?category=packaged-food" className="hover:text-gray-900">Packaged Food</Link>
                <Link to="/products?category=chocolates-indian-sweets" className="hover:text-gray-900">Sweets & Chocolates</Link>
                <Link to="/products?category=masala-dry-fruits-more" className="hover:text-gray-900">Masala & Dry Fruits</Link>
              </div>
            </div>
          </div>

          <div className="max-w-[1280px] mx-auto px-4 pt-8 mt-8 border-t border-gray-200 text-center text-xs text-gray-400 font-medium">
            © FreshCart Retail Private Limited, 2026. All rights reserved.
          </div>
        </footer>

      </div>
    </>
  );
};

export default ProductDetails;
