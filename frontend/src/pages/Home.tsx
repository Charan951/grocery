import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCMS, getSubCategoryImage, getCategoryImage, hexToRgba, hexToTintOnWhite, Product, deduplicateSubCategories, defaultSuperCategories } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SubcategoryCardImage } from '../components/SubcategoryCardImage';
import { SEO } from '../components/SEO';
import { ActiveOrderBanner } from '../components/ActiveOrderBanner';
import { BannerCarousel } from '../components/BannerCarousel';
import { FestivalCampaignWrapper } from '../components/FestivalCampaignWrapper';
import { SuperCategoryNav } from '../components/SuperCategoryNav';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Truck, Clock,
  ChevronDown, ChevronUp, Star, Utensils, Coffee, Leaf, Home as HomeIcon
} from 'lucide-react';
import { Instagram } from '../components/BrandIcons';

interface HomeProps {
  onQuickView: (product: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onQuickView }) => {
  const {
    banners, promoCards, categories, specialCategoryGroups, superCategories, products,
    testimonials, faqs, blogs, seoSettings, homeSelectedSubCategories, activeFestivalCampaign
  } = useCMS();

  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const activeSuperCatSlug = searchParams.get('superCategory') || 'all';

  const handleSelectSuperCategory = (slug: string) => {
    if (slug === 'all') {
      navigate('/');
    } else {
      navigate(`/?superCategory=${encodeURIComponent(slug)}`);
    }
  };

  const currentSuperCategoryObj = useMemo(() => {
    if (activeSuperCatSlug === 'all') return null;
    const list = superCategories && superCategories.length > 0 ? superCategories : defaultSuperCategories;
    return list.find(sc => (sc.slug || sc.id) === activeSuperCatSlug) || null;
  }, [activeSuperCatSlug, superCategories]);

  const [isMobileDevice, setIsMobileDevice] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobileDevice(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeBanners = useMemo(() => {
    return banners.filter(b => {
      if (!b.active) return false;
      const isDisplayValid = !b.displayOn || b.displayOn === 'HOME' || b.displayOn === 'ALL';
      if (!isDisplayValid) return false;
      const target = b.targetPlatform || 'ALL';
      if (target === 'WEB' && isMobileDevice) return false;
      if (target === 'MOBILE' && !isMobileDevice) return false;
      return true;
    });
  }, [banners, isMobileDevice]);

  const activePromoCards = useMemo(() => {
    return (promoCards || [])
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [promoCards]);

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

  // Flat list of all subcategories across categories for unified 10-per-row grid (Blinkit Home Style)
  const allHomeSubCategories = useMemo(() => {
    const list: Array<{
      id: string;
      subName: string;
      subImg: string | null;
      catSlug: string;
      catName: string;
      catColor: string;
    }> = [];

    const seenSubs = new Set<string>();

    categories.forEach((cat, cIdx) => {
      const catSlug = cat.slug || cat.id;
      const subList = cat.subCategories || [];
      subList.forEach((sub: any, sIdx: number) => {
        const subName = typeof sub === 'string' ? sub : sub.name;
        if (!subName) return;

        // Skip duplicates across categories
        const subKey = subName.toLowerCase().trim();
        if (seenSubs.has(subKey)) return;
        seenSubs.add(subKey);

        // Respect admin homeSelectedSubCategories if configured
        if (homeSelectedSubCategories.length > 0 && !homeSelectedSubCategories.includes(subName)) {
          return;
        }
        const customImg = typeof sub === 'object' ? (sub.image || sub.icon || '') : '';
        const subImg = getSubCategoryImage(subName, cat.name, customImg);

        list.push({
          id: `sub_flat_${cIdx}_${sIdx}_${subName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          subName,
          subImg,
          catSlug,
          catName: cat.name,
          catColor: cat.color || '#4CAF50',
        });
      });
    });

    return list;
  }, [categories, homeSelectedSubCategories]);

  // Generate flat dynamic list of active subcategory sections for Home Page, ordered by displayOrder
  const subCategorySections = useMemo(() => {
    const sections: {
      id: string;
      subName: string;
      subImg?: string | null;
      catSlug: string;
      categoryColor?: string;
      subProducts: Product[];
      matchingBanners?: any[];
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

    const seenSubNames = new Set<string>();

    categories.forEach((category, catIdx) => {
      const catSlug = category.slug || category.id;
      const rawSubCats = deduplicateSubCategories(category.subCategories || []);
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
        const subKey = (subName || '').toLowerCase().trim();

        // Skip duplicate subcategory sections across categories
        if (!subKey || seenSubNames.has(subKey)) return;
        seenSubNames.add(subKey);

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

      const matchingBanners = activeBanners.filter(b => b.positionIndex === currentSectionIndex && b.positionIndex > 0 && b.positionIndex < 99 && b.position !== 'top');
      const promoImage = typeof entry.sub === 'object' ? (entry.sub.promoImage || '') : '';

      const categoryColor = category.color || '#4CAF50';

      sections.push({
        id: `${category.id}_sub_${subName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentSectionIndex}`,
        subName,
        subImg,
        catSlug,
        categoryColor,
        subProducts,
        matchingBanners,
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
    title: 'FreshCart | Premium Organic Groceries Delivered in 10 Minutes',
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

  // Category cards for active Super Category landing view
  const superCategoryCategoryCards = useMemo(() => {
    if (!currentSuperCategoryObj) return [];

    const assignedCatIds = new Set((currentSuperCategoryObj.categories || []).map(c => c.toLowerCase()));
    const assignedSubNames = new Set((currentSuperCategoryObj.subCategories || []).map(s => s.toLowerCase()));

    const list: Array<{
      id: string;
      name: string;
      image: string | null;
      catSlug: string;
      subName?: string;
    }> = [];

    // Category matches
    categories.forEach((cat) => {
      const catSlug = cat.slug || cat.id;
      if (assignedCatIds.has(cat.id.toLowerCase()) || assignedCatIds.has(catSlug.toLowerCase())) {
        list.push({
          id: `sc_cat_${cat.id}`,
          name: cat.name,
          image: cat.image || getCategoryImage(cat.name),
          catSlug: catSlug
        });
      }
    });

    // Subcategory matches
    categories.forEach((cat) => {
      const catSlug = cat.slug || cat.id;
      (cat.subCategories || []).forEach((sub: any) => {
        const subName = typeof sub === 'string' ? sub : sub.name;
        if (subName && assignedSubNames.has(subName.toLowerCase())) {
          const customImg = typeof sub === 'object' ? (sub.image || sub.icon || '') : '';
          list.push({
            id: `sc_sub_${subName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: subName,
            image: getSubCategoryImage(subName, cat.name, customImg),
            catSlug: catSlug,
            subName: subName
          });
        }
      });
    });

    return list;
  }, [currentSuperCategoryObj, categories]);

  // Filtered products for active Super Category
  const superCategoryProducts = useMemo(() => {
    if (!currentSuperCategoryObj) return [];

    const assignedCatIds = new Set((currentSuperCategoryObj.categories || []).map(c => c.toLowerCase()));
    const assignedSubNames = new Set((currentSuperCategoryObj.subCategories || []).map(s => s.toLowerCase()));
    const assignedProdIds = new Set(currentSuperCategoryObj.products || []);

    return products.filter((p) => {
      if (!p) return false;
      if (assignedProdIds.has(p.id)) return true;

      const pCatId = (p.categoryId || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pSub = (p.subCategory || '').toLowerCase();

      if (pSub && assignedSubNames.has(pSub)) return true;
      if (pCatId && assignedCatIds.has(pCatId)) return true;
      if (pCat && assignedCatIds.has(pCat)) return true;

      return false;
    });
  }, [currentSuperCategoryObj, products]);

  // All catalog categories formatted for Zepto Grid (moved from header nav)
  const zeptoCategoryGridItems = useMemo(() => {
    return categories.map((cat) => {
      const catSlug = cat.slug || cat.id;
      return {
        id: cat.id,
        name: cat.displayName || cat.name,
        image: cat.image || getCategoryImage(cat.name),
        catSlug: catSlug,
        link: `/products?category=${catSlug}`
      };
    });
  }, [categories]);

  return (
    <div className="w-full page-wrapper bg-background">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        schema={faqSchema}
      />

      {/* 0. Festival Campaign Continuous Themed Section (ONLY FOR MOBILE) */}
      {isMobileDevice && activeFestivalCampaign && activeFestivalCampaign.isActive !== false && (
        <FestivalCampaignWrapper campaign={activeFestivalCampaign} />
      )}

      {/* Zepto-Style Web Top Category Navigation Bar */}
      <SuperCategoryNav
        activeSuperCategory={activeSuperCatSlug}
        onSelectSuperCategory={handleSelectSuperCategory}
      />

      {/* Centered Web Container Layout */}
      <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 pt-0 sm:pt-3 pb-8">

        {/* Page landmark for screen readers / heading navigation — visually
            hidden, the header logo already carries the brand visually. */}
        <h1 className="sr-only">FreshCart — fresh groceries delivered in minutes</h1>

        {/* Live order strip — tap to track */}
        <ActiveOrderBanner />

        {currentSuperCategoryObj ? (
          /* SUPER CATEGORY LANDING PAGE VIEW (e.g. Cafe, Fresh, Home) */
          <div className="flex flex-col gap-6 mt-3 sm:mt-4">
            {/* Super Category Hero Banner (4:1 Aspect Ratio) */}
            {currentSuperCategoryObj.banner && (
              <div className="w-full aspect-[4/1] rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-divider/60 bg-surface">
                <Link to={currentSuperCategoryObj.bannerLink || '/products'} className="block w-full h-full">
                  <img
                    src={currentSuperCategoryObj.banner}
                    alt={currentSuperCategoryObj.name}
                    className="w-full h-full object-cover rounded-2xl md:rounded-3xl block"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </Link>
              </div>
            )}

            {/* Category Cards Row (10 per row like Zepto) */}
            {superCategoryCategoryCards.length > 0 && (
              <section className="w-full my-2 sm:my-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-black text-text-primary tracking-tight font-display flex items-center gap-2">
                    <span>Trending in {currentSuperCategoryObj.name}</span>
                  </h2>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2.5 sm:gap-3.5">
                  {superCategoryCategoryCards.map((card) => {
                    const targetLink = card.subName
                      ? `/products?category=${card.catSlug}&subCategory=${encodeURIComponent(card.subName)}`
                      : `/products?category=${card.catSlug}`;
                    return (
                      <Link
                        key={card.id}
                        to={targetLink}
                        className="flex flex-col items-center group cursor-pointer text-center"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-[#f4f7f6] dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/40 p-1 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-200 shadow-2xs">
                          <img
                            src={card.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300'}
                            alt={card.name}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300';
                            }}
                          />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-text-primary line-clamp-2 leading-tight mt-1.5 group-hover:text-emerald-600 transition-colors">
                          {card.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Super Category Filtered Products Shelves */}
            {superCategoryProducts.length > 0 ? (
              <section className="w-full mt-2">
                <div className="flex items-center justify-between mb-3 border-b border-divider/60 pb-2">
                  <h3 className="text-lg font-black text-text-primary tracking-tight font-display">
                    Popular in {currentSuperCategoryObj.name}
                  </h3>
                  <Link
                    to="/products"
                    className="text-xs font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                  >
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-3.5">
                  {superCategoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="py-12 text-center text-text-secondary border border-dashed border-divider rounded-2xl">
                <p className="text-sm font-semibold">No products directly assigned to this super category yet.</p>
                <Link to="/products" className="mt-2 inline-block text-xs font-bold text-emerald-600 hover:underline">
                  Browse All Catalog Products &rarr;
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT "ALL" HOMEPAGE MODE */
          <>
            {/* 1. Top Active Campaign Banners Carousel (Blinkit Aspect Ratio) */}
            {activeBanners.length > 0 && (
              <BannerCarousel
                banners={activeBanners.filter(b => b.positionIndex === 0 || !b.positionIndex || b.positionIndex <= 0 || b.position === 'top')}
                className="mb-3.5 sm:mb-4 md:mb-6"
              />
            )}

            {/* 2. Blinkit Promotional Cards Row (WEB ONLY - Hidden on Mobile < 768px) */}
            {activePromoCards.length > 0 && (
              <section className="hidden md:block mb-6 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                  {activePromoCards.map((card) => {
                    const targetLink = card.subCategoryName && card.categoryId
                      ? `/products?category=${card.categoryId}&subCategory=${encodeURIComponent(card.subCategoryName)}`
                      : card.categoryId
                        ? `/products?category=${card.categoryId}`
                        : card.linkUrl || '/products';

                    const isBgImg = card.bgType === 'image' && card.bgImageUrl;

                    return (
                      <Link
                        key={card.id}
                        to={targetLink}
                        className="group relative rounded-2xl md:rounded-[20px] overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 min-h-[150px] sm:min-h-[165px] border border-white/20 bg-cover bg-center"
                        style={{
                          background: isBgImg ? `url(${card.bgImageUrl}) center/cover no-repeat` : card.bgGradient || 'linear-gradient(135deg, #0284c7, #06b6d4)',
                          color: card.textColor || '#ffffff'
                        }}
                      >
                        {/* Render text overlay ONLY if color mode is active */}
                        {!isBgImg && (
                          <div className="z-10 p-5 sm:p-6 pr-24 sm:pr-28">
                            <h3 className="text-base sm:text-lg font-black leading-tight tracking-tight drop-shadow-xs">
                              {card.title}
                            </h3>
                            {card.subtitle && (
                              <p className="text-xs sm:text-xs font-medium opacity-90 mt-1 leading-snug line-clamp-2">
                                {card.subtitle}
                              </p>
                            )}
                            <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-1.5 bg-black/80 group-hover:bg-black text-white font-black text-[11px] sm:text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform group-hover:scale-105">
                              <span>{card.buttonText || 'Order Now'}</span>
                              <ArrowRight size={13} />
                            </div>
                          </div>
                        )}

                        {!isBgImg && card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            className="absolute right-1 sm:right-2 bottom-1 sm:bottom-2 w-28 sm:w-32 h-28 sm:h-32 object-contain z-10 pointer-events-none transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Zepto-Style Homepage Category Grid (Categories moved from header nav) */}
            {zeptoCategoryGridItems.length > 0 && (
              <section className="mb-8 w-full mt-2 sm:mt-4">
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight font-display">
                    Shop by Categories
                  </h2>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4">
                  {zeptoCategoryGridItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="flex flex-col items-center group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-200 bg-transparent border-none shadow-none">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300'}
                          alt={item.name}
                          className="w-full h-full object-contain rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300';
                          }}
                        />
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-text-primary line-clamp-2 leading-tight mt-2 group-hover:text-emerald-600 transition-colors">
                        {item.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

        {/* 2. Dynamic Subcategories Home Sections & Dynamic Inter-Section Banners & In-Between Mobile Special Groups */}
        {subCategorySections.map((sec, secIdx) => (
          <React.Fragment key={sec.id}>
            <section className="mb-3 border-b border-divider/40 pb-2 last:border-b-0 px-3 sm:px-0">
              {/* Subcategory Title Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  {sec.categoryColor && (
                    <span className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: sec.categoryColor }} />
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

              {/* Subcategory Product Grid (Horizontally Scrollable Cards Row) */}
              {sec.subProducts.length > 0 ? (
                <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none pb-2 flex-nowrap">
                  {sec.subProducts.map((product, pIdx) => (
                    <div key={product.id || `subp_${pIdx}`} className="w-[140px] sm:w-[160px] md:w-[175px] shrink-0">
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
                  .map((group, grpIdx) => (
                    <div key={group.id || `sp_grp_${secIdx}_${grpIdx}`} className="mb-3 bg-surface rounded-3xl border border-divider/60 p-2 sm:p-4 shadow-sm">
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
                              key={item.id || `item_${secIdx}_${idx}`}
                              id="CATEGORY_GRID_V3-element"
                              className={isWide
                                ? "relative w-[calc(50%-0.25rem)] rounded-lg overflow-hidden group"
                                : "relative box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 group"
                              }
                              style={{ aspectRatio: isWide ? '16 / 9' : '9 / 12' }}
                            >
                              <Link className="contents" to={targetLink}>
                                <img
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="relative overflow-hidden rounded-lg w-full h-full object-contain transition-transform group-hover:scale-105"
                                  src={item.image}
                                  style={{ color: 'transparent', objectFit: 'contain' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';
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

            {/* Dynamic Inter-Section Banner Carousel rendering */}
            {sec.matchingBanners && sec.matchingBanners.length > 0 && (
              <BannerCarousel banners={sec.matchingBanners} className="my-2" />
            )}
          </React.Fragment>
        ))}

        {/* Render groups positioned at bottom (insertAfterSubCategoryIndex >= 99) */}
        {specialCategoryGroups && specialCategoryGroups.length > 0 && (
          <div className="md:hidden w-full">
            {specialCategoryGroups
              .filter(g => g.active !== false && g.items && g.items.length > 0 && g.insertAfterSubCategoryIndex !== undefined && g.insertAfterSubCategoryIndex >= 99)
              .map((group, grpIdx) => (
                <div key={group.id || `btm_grp_${grpIdx}`} className="mb-3 bg-surface rounded-3xl border border-divider/60 p-2 sm:p-4 shadow-sm">
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
                          key={item.id || `btm_item_${grpIdx}_${idx}`}
                          id="CATEGORY_GRID_V3-element"
                          className={isWide
                            ? "relative w-[calc(50%-0.25rem)] rounded-lg overflow-hidden group"
                            : "relative box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 group"
                          }
                          style={{ aspectRatio: isWide ? '16 / 9' : '9 / 12' }}
                        >
                          <Link className="contents" to={targetLink}>
                            <img
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                              className="relative overflow-hidden rounded-lg w-full h-full object-contain transition-transform group-hover:scale-105"
                              src={item.image}
                              style={{ color: 'transparent', objectFit: 'contain' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';
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
                <div key={product.id || `fp_${pIdx}`} className="w-[140px] sm:w-[160px] md:w-[175px] shrink-0">
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
                <div key={product.id || `op_${pIdx}`} className="w-[140px] sm:w-[160px] md:w-[175px] shrink-0">
                  <ProductCard product={product} onQuickView={onQuickView} />
                </div>
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
              <h3 className="text-lg font-bold text-text-primary">10-Minute Express</h3>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">Hygiene-packed orders delivered by our local rider network in 10 minutes, or it's completely free.</p>
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
          <section className="hidden md:block mb-12 md:mb-16">
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
                  <div
                    className="flex justify-between items-center p-4 font-bold text-sm text-text-primary cursor-pointer select-none hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleFaq(faq.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleFaq(faq.id);
                      }
                    }}
                  >
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

        {/* Bottom Page Banners (Position 99) */}
        {activeBanners.filter(b => b.positionIndex === 99).length > 0 && (
          <section className="mb-8">
            <BannerCarousel
              banners={activeBanners.filter(b => b.positionIndex === 99)}
              className="my-4"
            />
          </section>
        )}
        </>
        )}

      </div>
    </div>
  );
};
