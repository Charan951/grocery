import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCMS, Product } from '../context/CMSContext';
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
  const { banners, categories, specialCategoryGroups, products, testimonials, faqs, blogs, seoSettings, homeSelectedSubCategories } = useCMS();

  const activeBanners = banners.filter(b => b.active);

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



  // Generate flat dynamic list of active subcategory sections for Home Page, ordered by displayOrder
  const subCategorySections = useMemo(() => {
    const sections: {
      id: string;
      subName: string;
      subImg?: string | null;
      catSlug: string;
      subProducts: Product[];
      matchingBanner?: any;
      promoImage?: string;
    }[] = [];

    const rawEntries: Array<{
      sub: any;
      subName: string;
      subImg: string | null;
      category: any;
      catSlug: string;
      catNameLower: string;
      catIdLower: string;
      categoryProducts: Product[];
      displayOrder: number;
      subIdx: number;
    }> = [];

    categories.forEach((category, catIdx) => {
      const catSlug = category.slug || category.id;
      const rawSubCats = category.subCategories || [];
      const catNameLower = (category.name || '').toLowerCase();
      const catIdLower = (category.id || '').toLowerCase();

      // Category products
      const categoryProducts = products.filter((p) => {
        if (!p) return false;
        const pCatId = (p.categoryId || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        return pCatId === catIdLower || pCatId === catSlug.toLowerCase() || pCat === catNameLower || catNameLower.includes(pCat) || pCat.includes(catNameLower);
      });

      // Filter enabled subcategories for home
      const enabledSubCats = rawSubCats.filter((sub: any) => {
        const isShowOnHome = typeof sub === 'object' && sub.showOnHome !== undefined ? sub.showOnHome : true;
        return isShowOnHome;
      });

      const subList = enabledSubCats.length > 0 ? enabledSubCats : (rawSubCats.length === 0 ? [{ name: category.name, showOnHome: true }] : []);

      subList.forEach((sub: any, subIdx: number) => {
        const subName = typeof sub === 'string' ? sub : sub.name;
        const subImg = typeof sub === 'object' ? (sub.image || sub.icon || null) : null;
        const baseCatOrder = (catIdx + 1) * 100;
        const displayOrder = typeof sub === 'object' && sub.displayOrder !== undefined && sub.displayOrder > 0
          ? sub.displayOrder
          : baseCatOrder + subIdx + 1;

        rawEntries.push({
          sub,
          subName,
          subImg,
          category,
          catSlug,
          catNameLower,
          catIdLower,
          categoryProducts,
          displayOrder,
          subIdx,
        });
      });
    });

    // Sort entries by displayOrder ascending
    rawEntries.sort((a, b) => a.displayOrder - b.displayOrder);

    let globalCounter = 0;
    rawEntries.forEach((entry) => {
      globalCounter++;
      const currentSectionIndex = globalCounter;
      const { subName, subImg, category, catSlug, catNameLower, catIdLower, categoryProducts, subIdx } = entry;
      const subNameLower = subName.toLowerCase();

      let subProducts = products.filter((p) => {
        if (!p) return false;
        const pSub = (p.subCategory || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        const pCatId = (p.categoryId || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();

        if (pSub && (pSub === subNameLower || subNameLower.includes(pSub) || pSub.includes(subNameLower))) return true;

        const isParentMatch = pCatId === catIdLower || pCatId === catSlug.toLowerCase() || pCat === catNameLower || catNameLower.includes(pCat);
        if (isParentMatch && (pName.includes(subNameLower) || subNameLower.split(' ').some((w: string) => w.length > 3 && pName.includes(w)))) return true;

        return false;
      });

      if (subProducts.length === 0 && subIdx === 0 && categoryProducts.length > 0) {
        subProducts = categoryProducts;
      }

      const matchingBanner = activeBanners.find(b => (b.positionIndex || 1) === currentSectionIndex);
      const promoImage = typeof entry.sub === 'object' ? (entry.sub.promoImage || '') : '';

      sections.push({
        id: `${category.id}_sub_${subIdx}_${currentSectionIndex}`,
        subName,
        subImg,
        catSlug,
        subProducts,
        matchingBanner,
        promoImage,
      });
    });

    return sections;
  }, [categories, products, homeSelectedSubCategories, activeBanners]);

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

  return (
    <div className="w-full page-wrapper bg-background">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        schema={faqSchema}
      />

      <div className="w-full px-4 md:px-8 pt-3 pb-6">

        {/* Helper component rendering a Special Subcategory Group (Mobile Only - md:hidden) */}
        {specialCategoryGroups && specialCategoryGroups.length > 0 && (
          <div className="md:hidden w-full">
            {specialCategoryGroups
              .filter(g => g.active !== false && g.items && g.items.length > 0 && (!g.insertAfterSubCategoryIndex || g.insertAfterSubCategoryIndex === 0))
              .map((group, grpIdx) => (
                <div key={group.id || `grp_${grpIdx}`} className="mb-3 bg-surface rounded-3xl border border-divider/60 p-2 sm:p-4 shadow-sm">
                  {group.title && (
                    <h2 className="text-lg font-black text-text-primary tracking-tight font-display px-3 pt-2 pb-1">
                      {group.title}
                    </h2>
                  )}
                  <div className="flex cursor-pointer flex-row flex-wrap items-center justify-start gap-y-3 gap-x-2 p-2">
                    {group.items.map((item, idx) => {
                      const isWide = item.isFeatured || idx === 0;
                      const targetLink = item.link || `/products?subCategory=${encodeURIComponent(item.name)}`;
                      return (
                        <div 
                          key={item.id || idx}
                          id="CATEGORY_GRID_V3-element"
                          className={isWide 
                            ? "relative w-[calc(50%-0.25rem)] rounded-lg overflow-hidden group"
                            : "relative box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 group"
                          }
                          style={{ aspectRatio: isWide ? '1.46 / 1' : '0.67568 / 1' }}
                        >
                          <Link className="contents" to={targetLink}>
                            <img 
                              key={item.image || item.id || idx}
                              alt={item.name} 
                              fetchPriority="high" 
                              loading="eager" 
                              decoding="async" 
                              className="relative overflow-hidden rounded-lg w-full h-full object-cover transition-transform group-hover:scale-105"
                              src={item.image}
                              style={{ color: 'transparent', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png';
                              }}
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] sm:text-[10px] font-extrabold p-1 text-center truncate rounded-b-lg tracking-wide z-10 backdrop-blur-[1px]">
                              {item.name}
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* 2. Dynamic Subcategories Home Sections & Dynamic Inter-Section Banners & In-Between Mobile Special Groups */}
        {subCategorySections.map((sec, secIdx) => (
          <React.Fragment key={sec.id}>
            <section className="mb-3 border-b border-divider/40 pb-2 last:border-b-0">
              {/* Subcategory Title Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  {sec.subImg && (
                    <img 
                      src={sec.subImg} 
                      alt={sec.subName} 
                      className="w-8 h-8 rounded-lg object-cover shadow-xs border border-divider/60"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight font-display">
                    {sec.subName}
                  </h2>
                </div>
                <Link
                  to={`/products?category=${sec.catSlug}&subCategory=${encodeURIComponent(sec.subName)}`}
                  className="text-xs font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                >
                  <span>See All</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Special Subcategory Promo Banner (Full 100% Image Visible - Zero Cut-off) */}
              {sec.promoImage && (
                <div className="mb-3 w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-divider/60 bg-surface">
                  <Link 
                    to={`/products?category=${sec.catSlug}&subCategory=${encodeURIComponent(sec.subName)}`}
                    className="block w-full cursor-pointer group"
                    title={`Click to view all ${sec.subName} promo products`}
                  >
                    <img 
                      src={sec.promoImage} 
                      alt={`${sec.subName} Promo`} 
                      className="w-full h-auto block rounded-2xl md:rounded-3xl object-contain group-hover:scale-[1.005] transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </Link>
                </div>
              )}

              {/* Subcategory Product Grid (Horizontally Scrollable 4 Cards Row) */}
              {sec.subProducts.length > 0 ? (
                <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
                  {sec.subProducts.map((product, pIdx) => (
                    <div key={product.id || `subp_${pIdx}`} className="w-[155px] sm:w-[180px] md:w-[205px] shrink-0">
                      <ProductCard product={product} onQuickView={onQuickView} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-surface border border-divider rounded-2xl text-center text-xs text-text-tertiary font-bold">
                  Fresh stock arriving shortly in 10 minutes.
                </div>
              )}
            </section>

            {/* In-Between Special Category Groups (Mobile Only - md:hidden) */}
            {specialCategoryGroups && specialCategoryGroups.length > 0 && (
              <div className="md:hidden w-full">
                {specialCategoryGroups
                  .filter(g => g.active !== false && g.items && g.items.length > 0 && g.insertAfterSubCategoryIndex === (secIdx + 1))
                  .map((group) => (
                    <div key={group.id} className="mb-3 bg-surface rounded-3xl border border-divider/60 p-2 sm:p-4 shadow-sm">
                      {group.title && (
                        <h2 className="text-lg font-black text-text-primary tracking-tight font-display px-3 pt-2 pb-1">
                          {group.title}
                        </h2>
                      )}
                      <div className="flex cursor-pointer flex-row flex-wrap items-center justify-start gap-y-3 gap-x-2 p-2">
                        {group.items.map((item, idx) => {
                          const isWide = item.isFeatured || idx === 0;
                          const targetLink = item.link || `/products?subCategory=${encodeURIComponent(item.name)}`;
                          return (
                            <div 
                              key={item.id || idx}
                              id="CATEGORY_GRID_V3-element"
                              className={isWide 
                                ? "relative w-[calc(50%-0.25rem)] rounded-lg overflow-hidden group"
                                : "relative box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 group"
                              }
                              style={{ aspectRatio: isWide ? '1.46 / 1' : '0.67568 / 1' }}
                            >
                              <Link className="contents" to={targetLink}>
                                <img 
                                  key={item.image || item.id || idx}
                                  alt={item.name} 
                                  fetchPriority="high" 
                                  loading="eager" 
                                  decoding="async" 
                                  className="relative overflow-hidden rounded-lg w-full h-full object-contain transition-transform group-hover:scale-105" 
                                  src={item.image} 
                                  style={{ color: 'transparent', objectFit: 'contain' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png';
                                  }}
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] sm:text-[10px] font-extrabold p-1 text-center truncate rounded-b-lg tracking-wide z-10 backdrop-blur-[1px]">
                                  {item.name}
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Dynamic Inter-Section Banner rendering - Full 100% Image Visible - Zero Cut-off */}
            {sec.matchingBanner && sec.matchingBanner.imageUrl && (
              <div className="mb-8 w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-divider/60 bg-surface">
                <Link 
                  to={sec.matchingBanner.linkUrl || '/products'} 
                  className="block w-full cursor-pointer group"
                  title={sec.matchingBanner.title || 'Special Offer'}
                >
                  <img 
                    key={sec.matchingBanner.imageUrl || sec.matchingBanner.id}
                    src={sec.matchingBanner.imageUrl} 
                    alt={sec.matchingBanner.title || 'Promo Banner'} 
                    className="w-full h-auto block rounded-2xl md:rounded-3xl object-contain group-hover:scale-[1.005] transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </Link>
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Render groups positioned at bottom (insertAfterSubCategoryIndex >= 99) */}
        {specialCategoryGroups && specialCategoryGroups.length > 0 && (
          <div className="md:hidden w-full">
            {specialCategoryGroups
              .filter(g => g.active !== false && g.items && g.items.length > 0 && g.insertAfterSubCategoryIndex !== undefined && g.insertAfterSubCategoryIndex >= 99)
              .map((group) => (
                <div key={group.id} className="mb-3 bg-surface rounded-3xl border border-divider/60 p-2 sm:p-4 shadow-sm">
                  {group.title && (
                    <h2 className="text-lg font-black text-text-primary tracking-tight font-display px-3 pt-2 pb-1">
                      {group.title}
                    </h2>
                  )}
                  <div className="flex cursor-pointer flex-row flex-wrap items-center justify-start gap-y-3 gap-x-2 p-2">
                    {group.items.map((item, idx) => {
                      const isWide = item.isFeatured || idx === 0;
                      const targetLink = item.link || `/products?subCategory=${encodeURIComponent(item.name)}`;
                      return (
                        <div 
                          key={item.id || idx}
                          id="CATEGORY_GRID_V3-element"
                          className={isWide 
                            ? "relative w-[calc(50%-0.25rem)] rounded-lg overflow-hidden group"
                            : "relative box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 group"
                          }
                          style={{ aspectRatio: isWide ? '1.46 / 1' : '0.67568 / 1' }}
                        >
                          <Link className="contents" to={targetLink}>
                            <img 
                              key={item.image || item.id || idx}
                              alt={item.name} 
                              fetchPriority="high" 
                              loading="eager" 
                              decoding="async" 
                              className="relative overflow-hidden rounded-lg w-full h-full object-cover transition-transform group-hover:scale-105"
                              src={item.image}
                              style={{ color: 'transparent', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png';
                              }}
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] sm:text-[10px] font-extrabold p-1 text-center truncate rounded-b-lg tracking-wide z-10 backdrop-blur-[1px]">
                              {item.name}
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

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

            <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
              {freshPicks.map((product, pIdx) => (
                <div key={product.id || `fp_${pIdx}`} className="w-[155px] sm:w-[180px] md:w-[205px] shrink-0">
                  <ProductCard product={product} onQuickView={onQuickView} />
                </div>
              ))}
            </div>
          </section>
        )}



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

            <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
              {organicPicks.map((product, pIdx) => (
                <div key={product.id || `op_${pIdx}`} className="w-[155px] sm:w-[180px] md:w-[205px] shrink-0">
                  <ProductCard product={product} onQuickView={onQuickView} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Why Choose FreshCart */}
        <section className="mb-12 md:mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-[#111827]">Why Choose FreshCart?</h2>
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

            <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
              {bestSellers.map((product) => (
                <div key={product.id} className="w-[155px] sm:w-[180px] md:w-[205px] shrink-0">
                  <ProductCard product={product} onQuickView={onQuickView} />
                </div>
              ))}
            </div>
          </section>
        )}



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
        <section className="mb-12 md:mb-16 hidden md:block">
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
        <section className="mb-12 md:mb-16 hidden md:block">
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
