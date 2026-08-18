import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCMS, Product } from '../context/CMSContext';
import { useCartWishlist } from '../context/CartWishlistContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Heart, Plus, Minus, ShoppingBag, Truck, 
  RotateCcw, ChevronDown, ChevronUp, CheckSquare, Square 
} from 'lucide-react';

interface ProductDetailsProps {
  onQuickView: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ onQuickView }) => {
  const { id } = useParams<{ id: string }>();
  const { products, categories, seoSettings } = useCMS();
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlist();

  // Find target product
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  // Gallery, Quantity & Variant states
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<string | null>('desc');

  // Bundle selection states (for 2 products)
  const [bundleChecked1, setBundleChecked1] = useState(true);
  const [bundleChecked2, setBundleChecked2] = useState(true);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewsList, setReviewsList] = useState<Array<{ author: string; rating: number; date: string; content: string }>>([]);

  // Initialize variant weight
  useEffect(() => {
    if (product) {
      setSelectedWeight(product.netQuantity || product.defaultWeight || (product.weightOptions && product.weightOptions[0]) || '500 g');
      setQuantity(1);
      setActiveThumb(0);
      
      // Seed default reviews
      setReviewsList([
        { author: 'Vikram Mehta', rating: 5, date: 'July 8, 2026', content: `Excellent quality ${product.name}! Arrived in less than 20 minutes. Packed beautifully in paper bags. Highly recommended.` },
        { author: 'Sarah D.', rating: 4, date: 'July 5, 2026', content: `Fresh and juicy. Sourced exactly at peak ripeness. Will buy again weekly.` }
      ]);
    }
  }, [product]);

  // If product not found
  if (!product) {
    return (
      <div className="page-wrapper py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-text-secondary mb-6">The grocery item you are looking for does not exist or has been removed by the admin.</p>
          <Link to="/products" className="bg-primary text-white py-3 px-6 rounded-full font-bold">Back to Shop</Link>
        </div>
      </div>
    );
  }

  // Generate 3 mock gallery thumbnails
  const galleryImages = [
    product.imageUrl,
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=800&auto=format&fit=crop',
  ];

  // Select 2 bundle products from other categories/products
  const bundleItems = useMemo(() => {
    return products.filter((p) => p.id !== product.id).slice(0, 2);
  }, [products, product]);

  // Select related products (same category)
  const relatedProducts = useMemo(() => {
    return products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  }, [products, product]);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedWeight);
  };

  const handleAddBundle = () => {
    // Add main product
    addToCart(product, 1, selectedWeight);
    // Add checked bundle items
    if (bundleChecked1 && bundleItems[0]) addToCart(bundleItems[0], 1, bundleItems[0].defaultWeight);
    if (bundleChecked2 && bundleItems[1]) addToCart(bundleItems[1], 1, bundleItems[1].defaultWeight);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewText.trim()) {
      alert('Please fill out your name and review details.');
      return;
    }
    const newReview = {
      author: reviewAuthor,
      rating: reviewRating,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      content: reviewText
    };
    setReviewsList([newReview, ...reviewsList]);
    setReviewAuthor('');
    setReviewText('');
    alert('Thank you! Your review has been published.');
  };

  // Math for bundle pricing
  let bundleSubtotal = product.price;
  if (bundleChecked1 && bundleItems[0]) bundleSubtotal += bundleItems[0].price;
  if (bundleChecked2 && bundleItems[1]) bundleSubtotal += bundleItems[1].price;

  const categoryName = categories.find((c) => c.id === product.categoryId)?.name || 'Grocery';

  return (
    <div className="page-wrapper">
      <SEO 
        title={`${product.name} | FreshCart Organic Store`}
        description={product.description || `${product.name} fresh produce`}
        ogImage={product.imageUrl || (product.images && product.images[0]) || ''}
        schema={{
          '@type': 'Product',
          'name': product.name,
          'image': product.imageUrl || (product.images && product.images[0]) || '',
          'description': product.description || `${product.name} fresh produce`,
          'brand': {
            '@type': 'Brand',
            'name': product.brand,
          },
          'offers': {
            '@type': 'Offer',
            'price': product.price,
            'priceCurrency': 'INR',
            'availability': 'https://schema.org/InStock',
          },
        }}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1200px] py-4 pb-12">
        
        {/* 2-Column Zepto Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8 items-start mb-12 pt-2">
          
          {/* LEFT COLUMN: Vertical Gallery & Add To Cart Button (100% Frozen flush under constant sticky header) */}
          <div
            style={{ top: 'calc(var(--sticky-header-h, 260px) + 12px)' }}
            className="flex flex-col gap-4 lg:sticky self-start z-10"
          >
            
            <div className="flex gap-4 items-start">
              {/* Vertical Thumbnail Strip */}
              <div className="flex flex-col gap-2.5 flex-shrink-0">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveThumb(idx)}
                    className={`w-14 h-14 bg-surface border rounded-xl overflow-hidden p-1 flex items-center justify-center transition-all cursor-pointer ${
                      activeThumb === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-divider hover:border-emerald-500/50'
                    }`}
                  >
                    <img src={imgUrl} alt="Thumbnail preview" className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>

              {/* Main Product Image Container */}
              <div className="bg-surface border border-divider/70 rounded-2xl p-6 flex-1 aspect-square max-h-[380px] flex items-center justify-center overflow-hidden shadow-xs relative">
                <img src={galleryImages[activeThumb]} alt={product.name} className="max-h-full max-w-full object-contain" />
              </div>
            </div>

            {/* Bright Magenta/Pink Add to Cart Button Full Width */}
            <motion.button 
              onClick={handleAddToCart}
              className="w-full bg-[#ff0060] hover:bg-[#e00054] text-white font-black py-3.5 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <ShoppingBag size={20} />
              <span>Add to Cart</span>
            </motion.button>

          </div>

          {/* RIGHT COLUMN: Independent Scrollable Details Panel (Image stays frozen while right side scrolls) */}
          <div className="flex flex-col gap-5 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-2 scrollbar-none">
            
            {/* Breadcrumbs Navigation */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-tertiary">
              <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
              <span>›</span>
              <Link to={`/products?category=${product.categoryId}`} className="hover:text-emerald-600 transition-colors">{categoryName}</Link>
              {product.subCategory && (
                <>
                  <span>›</span>
                  <span className="text-text-secondary">{product.subCategory}</span>
                </>
              )}
              <span>›</span>
              <span className="text-text-primary font-black">{product.name}</span>
            </div>
            
            {/* CARD 1: Title, Quantity, Price Tag & Delivery Policy */}
            <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl font-black text-text-primary tracking-tight font-display">
                    {product.name}
                  </h1>
                  <p className="text-xs text-text-tertiary font-extrabold mt-1">
                    Net Qty: {selectedWeight || product.netQuantity || '500 g'}
                  </p>
                </div>

                <button 
                  onClick={() => toggleWishlist(product)}
                  className={`w-10 h-10 border rounded-full flex items-center justify-center transition-all ${
                    isInWishlist(product.id) ? 'border-emerald-600 text-emerald-600 bg-emerald-500/10' : 'border-divider text-text-tertiary hover:text-emerald-600'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart size={18} fill={isInWishlist(product.id) ? '#10b981' : 'none'} />
                </button>
              </div>

              {/* Price Box */}
              <div className="flex items-center gap-3 pt-2">
                <div className="bg-emerald-600 text-white font-black text-xl px-3 py-1 rounded-xl">
                  ₹{product.price}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary line-through font-bold">MRP ₹{product.mrp}</span>
                    <span className="text-xs font-black text-[#ff0060] bg-[#ff0060]/10 px-2 py-0.5 rounded-full">
                      {product.discountText || '55% OFF'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-tertiary font-semibold">Inclusive of all taxes</span>
                </div>
              </div>

              {/* Circular Delivery Policy Badges */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-divider/60">
                <div className="flex items-center gap-2.5 bg-background p-3 rounded-xl border border-divider/60">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <RotateCcw size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-text-primary">No Return</span>
                    <span className="text-[9px] font-bold text-text-tertiary">or Exchange</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-background p-3 rounded-xl border border-divider/60">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Truck size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-text-primary">Fast Delivery</span>
                    <span className="text-[9px] font-bold text-text-tertiary">In 10 minutes</span>
                  </div>
                </div>
              </div>

            </div>

            {/* CARD 2: Highlights Card */}
            <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-black text-text-primary tracking-wide mb-4">Highlights</h3>
              <div className="space-y-2.5 text-xs font-semibold text-text-secondary">
                <div className="grid grid-cols-2 py-1.5 border-b border-divider/50">
                  <span className="text-text-tertiary">Product Type</span>
                  <span className="font-bold text-text-primary">{product.category || 'Vegetable'}</span>
                </div>
                <div className="grid grid-cols-2 py-1.5 border-b border-divider/50">
                  <span className="text-text-tertiary">Imported</span>
                  <span className="font-bold text-text-primary">No</span>
                </div>
                <div className="grid grid-cols-2 py-1.5 border-b border-divider/50">
                  <span className="text-text-tertiary">Dietary Preference</span>
                  <span className="font-bold text-text-primary">Veg</span>
                </div>
                <div className="grid grid-cols-2 py-1.5">
                  <span className="text-text-tertiary">Good For</span>
                  <span className="font-bold text-text-primary">Gut Health, Immunity</span>
                </div>
              </div>
            </div>

            {/* CARD 3: Information & Seller Details Card */}
            <div className="bg-surface border border-divider/70 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-text-primary tracking-wide">Information</h3>
              
              <div className="space-y-3.5 text-[11px] leading-relaxed text-text-secondary">
                <div>
                  <span className="font-black text-text-primary block mb-1">Disclaimer</span>
                  <p className="text-text-tertiary font-semibold leading-normal">
                    All images are for representational purposes only. Every effort is made to maintain accuracy of information, ingredient lists, direction for use, and nutritional claims. Sourced directly from local farms for peak quality.
                  </p>
                </div>

                <div className="border-t border-divider/50 pt-3">
                  <span className="font-black text-text-primary block mb-0.5">Customer Care Details</span>
                  <p className="text-text-tertiary font-semibold">In case of any issues, write to us at support@freshcart.com</p>
                </div>

                <div className="border-t border-divider/50 pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-black text-text-primary">Seller Name</span>
                    <span className="text-text-secondary font-bold">FreshCart Retail Private Limited</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-text-primary">Seller Address</span>
                    <span className="text-text-secondary font-bold text-right max-w-[240px]">12, 100 Feet Rd, Indiranagar, Bengaluru, KA 560038</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-text-primary">Seller License No.</span>
                    <span className="text-text-secondary font-bold">10019043002698</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-text-primary">Country Of Origin</span>
                    <span className="text-text-secondary font-bold">India</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-black text-text-primary">Shelf Life</span>
                    <span className="text-text-secondary font-bold">4 days</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 3. Frequently Bought Together (Bundles) */}
        {bundleItems.length > 0 && (
          <section className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card mb-16">
            <h3 className="text-lg font-extrabold text-text-primary mb-6">Frequently Bought Together</h3>
            <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 justify-between">
              {/* Main Product */}
              <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-divider w-full max-w-[280px]">
                <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-contain" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-text-primary line-clamp-1">{product.name}</span>
                  <span className="text-xs font-bold text-primary">₹{product.price}</span>
                </div>
              </div>

              {/* Plus Sign */}
              <span className="text-xl font-bold text-text-tertiary">+</span>

              {/* Bundle 1 */}
              {bundleItems[0] && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setBundleChecked1(!bundleChecked1)} className={bundleChecked1 ? 'text-primary' : 'text-text-tertiary'}>
                    {bundleChecked1 ? <CheckSquare size={20} fill="rgba(76,175,80,0.1)" /> : <Square size={20} />}
                  </button>
                  <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-divider w-full max-w-[280px]">
                    <img src={bundleItems[0].imageUrl} alt={bundleItems[0].name} className="w-16 h-16 object-contain" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-text-primary line-clamp-1">{bundleItems[0].name}</span>
                      <span className="text-xs font-bold text-primary">₹{bundleItems[0].price}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Plus Sign */}
              {bundleItems[1] && <span className="text-xl font-bold text-text-tertiary">+</span>}

              {/* Bundle 2 */}
              {bundleItems[1] && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setBundleChecked2(!bundleChecked2)} className={bundleChecked2 ? 'text-primary' : 'text-text-tertiary'}>
                    {bundleChecked2 ? <CheckSquare size={20} fill="rgba(76,175,80,0.1)" /> : <Square size={20} />}
                  </button>
                  <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-divider w-full max-w-[280px]">
                    <img src={bundleItems[1].imageUrl} alt={bundleItems[1].name} className="w-16 h-16 object-contain" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-text-primary line-clamp-1">{bundleItems[1].name}</span>
                      <span className="text-xs font-bold text-primary">₹{bundleItems[1].price}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bundle Checkout Widget */}
              <div className="flex flex-col items-center lg:items-end gap-3 w-full lg:w-auto">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-text-secondary">Bundle Price:</span>
                  <span className="text-xl font-extrabold text-text-primary">₹{bundleSubtotal}</span>
                </div>
                <button onClick={handleAddBundle} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors whitespace-nowrap cursor-pointer">
                  Add Bundle to Basket
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 4. Customer Reviews Segment */}
        <section className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card mb-16">
          <h3 className="text-lg font-extrabold text-text-primary mb-6">Customer Feedbacks & Ratings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-divider pb-8 mb-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-5xl font-extrabold text-text-primary">{product.rating}</div>
              <div className="flex text-amber-500 gap-0.5 my-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="text-xs text-text-secondary font-medium">Based on {reviewsList.length} reviews</span>
            </div>

            <div className="flex flex-col gap-2 justify-center">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviewsList.filter((r) => r.rating === stars).length;
                const percent = reviewsList.length > 0 ? (count / reviewsList.length) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="w-11">{stars} Star</span>
                    <div className="flex-1 h-2 bg-divider rounded-full overflow-hidden w-[150px] md:w-[200px]">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of reviews */}
          <div className="flex flex-col gap-6 mb-8">
            {reviewsList.map((rev, i) => (
              <div key={i} className="border-b border-divider pb-6 last:border-b-0 last:pb-0 flex flex-col gap-2">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <div className="font-bold text-text-primary">{rev.author}</div>
                    <div className="flex text-amber-500 gap-0.5 mt-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={12} fill={idx < rev.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <span className="text-text-tertiary">{rev.date}</span>
                </div>
                <p className="text-xs md:text-sm text-text-secondary leading-relaxed">{rev.content}</p>
              </div>
            ))}
          </div>

          {/* Review write form */}
          <form onSubmit={handleReviewSubmit} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
            <h4 className="font-bold text-sm text-text-primary">Write a Customer Review</h4>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Your Rating:</span>
              <div className="flex text-text-tertiary gap-1 cursor-pointer">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <Star
                    key={stars}
                    size={18}
                    onClick={() => setReviewRating(stars)}
                    fill={stars <= reviewRating ? 'currentColor' : 'none'}
                    className={`transition-colors hover:text-amber-400 ${stars <= reviewRating ? 'text-amber-500' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Your Name"
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
                required
              />
            </div>

            <textarea
              placeholder="Detailed review content (how fresh was it? packaging standards? delivery speed?)"
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
              required
            />

            <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors w-fit cursor-pointer">
              Submit Review
            </button>
          </form>
        </section>

        {/* 5. Related Products Grid */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-text-primary mb-6">Related Fresh Groceries</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} onQuickView={onQuickView} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
