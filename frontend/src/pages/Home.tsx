import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCMS } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ShieldCheck, Truck, Clock, 
  ChevronDown, ChevronUp, Star 
} from 'lucide-react';
import { Instagram } from '../components/BrandIcons';

interface HomeProps {
  onQuickView: (product: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onQuickView }) => {
  const { categories, products, testimonials, faqs, blogs, seoSettings } = useCMS();

  // Countdown timer for Flash Sale (Midnight tonight)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // FAQ Expanded State
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Flash Sale Countdown Math
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Midnight tonight
      
      const diffMs = midnight.getTime() - now.getTime();
      
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);
        const seconds = Math.floor((diffMs / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    };
    
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter shelves
  const freshPicks = products.filter((p) => p.isFreshPick).slice(0, 4);
  const organicPicks = products.filter((p) => p.isOrganic).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);

  // Schema for SEO structured FAQ data
  const faqSchema = {
    '@type': 'FAQPage',
    'mainEntity': faqs.slice(0, 4).map((f) => ({
      '@type': 'Question',
      'name': f.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.answer,
      },
    })),
  };

  const seo = seoSettings.home || {
    title: 'FreshCart | Premium Organic Groceries Delivered in 15 Mins',
    description: 'Order fresh organic vegetables, fruits, dairy, bakery, snacks, and meats. High-quality produce sourced directly from local farms. First order free!',
    keywords: 'organic groceries, fresh vegetables, grocery delivery Bengaluru, online dairy, FreshCart'
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const instagramPhotos = [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490815685287-e2e27040d346?w=500&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop',
  ];

  const zeptoCategories = [
    { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=300&auto=format&fit=crop' },
    { name: 'Dairy, Bread & Eggs', slug: 'dairy-bread-eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop' },
    { name: 'Atta, Rice, Oil & Dals', slug: 'atta-rice-oil-dals', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop' },
    { name: 'Meat, Fish & Eggs', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=300&auto=format&fit=crop' },
    { name: 'Masala & Dry Fruits', slug: 'atta-rice-oil-dals', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop' },
    { name: 'Breakfast & Sauces', slug: 'breakfast-cereals-spreads-sauces', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop' },
    { name: 'Packaged Food', slug: 'breakfast-cereals-spreads-sauces', image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&auto=format&fit=crop' },
    { name: 'Zepto Cafe', slug: 'tea-coffee-health-drinks', image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop' },
    { name: 'Tea, Coffee & More', slug: 'tea-coffee-health-drinks', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop' },
    { name: 'Ice Creams & More', slug: 'ice-creams-kulfi-frozen-desserts', image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=300&auto=format&fit=crop' },
    { name: 'Frozen Food', slug: 'ice-creams-kulfi-frozen-desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&auto=format&fit=crop' },
  ];

  return (
    <div className="w-full page-wrapper bg-background">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        schema={faqSchema}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1360px] pt-3 pb-6">

        {/* 1. Zepto Top Category Cards Scroll Row */}
        <section className="mb-6 relative group">
          <div 
            id="category-scroll-container" 
            className="flex items-center gap-3.5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth"
          >
            {zeptoCategories.map((cat, idx) => (
              <Link 
                key={idx} 
                to={`/products?category=${cat.slug}`}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl bg-surface border border-divider/60 hover:border-[#7000ff]/40 hover:shadow-md transition-all duration-200 group/card w-24 sm:w-28 text-center flex-shrink-0"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-background p-1.5 group-hover/card:scale-105 transition-transform duration-200 border border-divider">
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <span className="text-[11px] font-black text-text-primary group-hover/card:text-[#7000ff] transition-colors line-clamp-2 leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          {/* Right Scroll Nav Button */}
          <button 
            onClick={() => {
              const el = document.getElementById('category-scroll-container');
              if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
            }}
            className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black text-white items-center justify-center shadow-lg hover:bg-neutral-800 transition-transform active:scale-95 cursor-pointer z-10"
            title="Scroll Right"
          >
            <span className="text-xs font-bold">›</span>
          </button>
        </section>

        {/* 2. All Categories A-to-Z Subcategory Cards & Product Shelves */}
        {categories.map((category) => {
          const catSlug = category.slug || category.id;
          const categoryProducts = products.filter(
            p => p.categoryId === catSlug || p.category === category.name || p.categoryId === category.id
          );
          const subCats = category.subCategories || [];

          return (
            <section key={category.id} className="mb-12 border-b border-divider/40 pb-10 last:border-b-0">
              {/* Category Title Header */}
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight font-display flex items-center gap-2">
                    <span className="w-2.5 h-6 rounded-full bg-emerald-600 inline-block" />
                    {category.name}
                  </h2>
                  <p className="text-xs text-text-tertiary font-bold mt-0.5 ml-4">
                    {categoryProducts.length} items • Delivery in 10 mins
                  </p>
                </div>
                <Link 
                  to={`/products?category=${catSlug}`}
                  className="text-xs font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                >
                  <span>See All</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Subcategories Horizontal Chips / Cards Bar */}
              {subCats.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
                  {subCats.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : sub.name;
                    return (
                      <Link
                        key={idx}
                        to={`/products?category=${catSlug}&subCategory=${encodeURIComponent(subName)}`}
                        className="px-3.5 py-1.5 rounded-xl bg-surface border border-divider/70 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-700 text-xs font-extrabold transition-all flex-shrink-0 shadow-xs"
                      >
                        {subName}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Category Product Grid */}
              {categoryProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                  {categoryProducts.slice(0, 5).map((product) => (
                    <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-surface border border-divider rounded-2xl text-center text-xs text-text-tertiary font-bold">
                  Fresh stock arriving shortly in 10 minutes.
                </div>
              )}
            </section>
          );
        })}

        {/* 3. Fresh Today Shelf */}
        {freshPicks.length > 0 && (
          <section className="mb-12 md:mb-16">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Fresh Today</h2>
                <p className="text-xs md:text-sm text-text-secondary mt-1">Harvested at 4 AM and delivered to you instantly</p>
              </div>
              <Link to="/products" className="text-sm md:text-base font-bold text-primary flex items-center gap-1 hover:underline">
                <span>Browse All</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {freshPicks.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
              ))}
            </div>
          </section>
        )}

        {/* 4. Flash Sale Banner with Countdown */}
        <section className="relative overflow-hidden rounded-2xl p-6 md:p-12 mb-12 md:mb-16 flex flex-col lg:flex-row items-center justify-between gap-6 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-premium">
          <div className="flex flex-col gap-3 max-w-[600px] text-center lg:text-left items-center lg:items-start">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full w-fit uppercase tracking-widest">LIMITED TIMER RUNNING</span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display">Mid-Month Flash Sale!</h2>
            <p className="text-sm opacity-90">Get flat 30% discount on organic juices and dairy baskets. Free delivery included.</p>
            
            <div className="flex gap-4 mt-2">
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                <div className="text-xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</div>
                <div className="text-[9px] font-bold opacity-80 tracking-wider">HOURS</div>
              </div>
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                <div className="text-xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                <div className="text-[9px] font-bold opacity-80 tracking-wider">MINUTES</div>
              </div>
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                <div className="text-xl font-bold">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                <div className="text-[9px] font-bold opacity-80 tracking-wider">SECONDS</div>
              </div>
            </div>
          </div>

          <Link to="/offers" className="bg-white text-text-primary px-8 py-3.5 rounded-full font-bold text-sm md:text-base whitespace-nowrap shadow-md hover:bg-background transition-colors active:scale-95">
            Claim Offers
          </Link>
        </section>

        {/* 5. Organic Highlights Shelf */}
        {organicPicks.length > 0 && (
          <section className="mb-12 md:mb-16">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Organic Collection</h2>
                <p className="text-xs md:text-sm text-text-secondary mt-1">100% chemical-free organic groceries</p>
              </div>
              <Link to="/products?organic=true" className="text-sm md:text-base font-bold text-primary flex items-center gap-1 hover:underline">
                <span>View Organic Catalog</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {organicPicks.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
              ))}
            </div>
          </section>
        )}

        {/* 6. Why Choose FreshCart */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Why Choose FreshCart?</h2>
            <p className="text-xs md:text-sm text-text-secondary mt-1">Our commitment to quality and express delivery logistics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Truck size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary">15-Minute Express</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">Hygiene-packed orders delivered by our local rider network in under 30 minutes, or it's completely free.</p>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Direct From Farms</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">Zero middle-men storage. Sourced directly from local agricultural cooperative orchards at 4 AM daily.</p>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary">No-Questions Returns</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">Not satisfied with the freshness of your avocados or bread crowns? Return them at the door for an instant refund.</p>
            </div>
          </div>
        </section>

        {/* 7. Best Sellers Shelf */}
        {bestSellers.length > 0 && (
          <section className="mb-12 md:mb-16">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Best Sellers</h2>
                <p className="text-xs md:text-sm text-text-secondary mt-1">Customer favorites this week</p>
              </div>
              <Link to="/products" className="text-sm md:text-base font-bold text-primary flex items-center gap-1 hover:underline">
                <span>Browse All</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
              ))}
            </div>
          </section>
        )}

        {/* 8. VIP Membership Banner */}
        <section className="relative overflow-hidden rounded-2xl p-6 md:p-12 mb-12 md:mb-16 flex flex-col md:flex-row items-center justify-between gap-6 bg-primary-gradient text-white shadow-premium">
          <div className="text-center md:text-left flex flex-col gap-2">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display">Join FreshCart VIP</h2>
            <p className="text-sm opacity-90 max-w-[600px]">Get unlimited free deliveries, premium early-bird slots, and flat 15% discount on organic products.</p>
          </div>
          <Link to="/offers" className="bg-white text-text-primary px-6 py-3 rounded-full font-bold text-sm md:text-base whitespace-nowrap shadow-md hover:bg-background transition-colors active:scale-95">
            Start Free Trial
          </Link>
        </section>

        {/* 9. Customer Reviews */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">What Our Customers Say</h2>
            <p className="text-xs md:text-sm text-text-secondary mt-1">Over 50,000+ verified customer reviews</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col gap-4">
                <div className="flex gap-1 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill={i < item.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <p className="text-sm text-text-secondary italic leading-relaxed">"{item.feedback}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-divider" />
                  <div>
                    <div className="text-sm font-bold text-text-primary">{item.name}</div>
                    <div className="text-[10px] text-text-secondary">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Latest Blogs */}
        {blogs.length > 0 && (
          <section className="mb-12 md:mb-16">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Latest Health Articles</h2>
                <p className="text-xs md:text-sm text-text-secondary mt-1">Nutrition guides and quick kitchen recipes from specialists</p>
              </div>
              <Link to="/blog" className="text-sm md:text-base font-bold text-primary flex items-center gap-1 hover:underline">
                <span>Go to Blog</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogs.slice(0, 2).map((post) => (
                <Link to={`/blog/${post.id}`} key={post.id} className="bg-surface rounded-2xl border border-divider shadow-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-premium">
                  <img src={post.coverImage} alt={post.title} className="w-full aspect-[16/9] object-cover" />
                  <div className="p-5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{post.category}</span>
                    <h3 className="text-base font-extrabold text-text-primary line-clamp-1">{post.title}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{post.excerpt}</p>
                    <div className="flex justify-between text-[10px] text-text-tertiary font-medium mt-2 pt-2 border-t border-divider">
                      <span>{post.date}</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 11. FAQ Summary */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Frequently Asked Questions</h2>
            <p className="text-xs md:text-sm text-text-secondary mt-1">Find quick answers to common queries</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.slice(0, 4).map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <div key={faq.id} className="bg-surface border border-divider rounded-xl overflow-hidden shadow-card">
                  <div className="flex justify-between items-center p-4 font-bold text-sm text-text-primary cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleFaq(faq.id)}>
                    <span>{faq.question}</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 pt-0 text-xs md:text-sm text-text-secondary leading-relaxed border-t border-divider bg-background/50"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* 12. Instagram Feed */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">#FreshCartLife</h2>
            <p className="text-xs md:text-sm text-text-secondary mt-1">Join our community sharing healthy morning smoothie bowls and fresh organic dishes</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {instagramPhotos.map((url, idx) => (
              <div 
                key={idx}
                className="group rounded-2xl overflow-hidden aspect-square relative"
              >
                <img 
                  src={url} 
                  alt={`Instagram recipe highlight ${idx + 1}`} 
                  className="w-full h-full object-cover" 
                />
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                >
                  <Instagram size={24} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
