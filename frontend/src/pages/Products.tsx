import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCMS, Product } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ChevronRight, RefreshCw, X } from 'lucide-react';

interface ProductsProps {
  onQuickView: (product: Product) => void;
}

export const Products: React.FC<ProductsProps> = ({ onQuickView }) => {
  const { products, categories, seoSettings } = useCMS();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter from URL
  const urlSearch = searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || '';
  const urlSubCategory = searchParams.get('subCategory') || '';
  const urlOrganic = searchParams.get('organic') === 'true';

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('fruits-vegetables');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Category Banner Image & Description Map
  const categoryMetaData: Record<string, { description: string; bannerImg: string; icon: string }> = {
    'fruits-vegetables': {
      description: 'Fresh fruits and vegetables sourced daily from farms across India. From everyday onions and tomatoes to seasonal mangoes and hard-to-find avocados — get them delivered in minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop'
    },
    'dairy-bread-eggs': {
      description: 'Farm-fresh milk, artisan breads, farm eggs, paneer, and rich cream delivered cold to your doorstep within 10 minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop'
    },
    'atta-rice-oil-dals': {
      description: 'Premium quality chakki fresh atta, basmati rice, cold pressed mustard oil, and unpolished protein-rich dals for healthy home meals.',
      bannerImg: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop'
    },
    'breakfast-cereals-spreads-sauces': {
      description: 'Nutritious oats, muesli, organic peanut butter, artisan jams, and tomato ketchup for quick and delicious family breakfasts.',
      bannerImg: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150&auto=format&fit=crop'
    },
    'tea-coffee-health-drinks': {
      description: 'Aromatic Assam tea leaves, freshly roasted South Indian filter coffee beans, green tea, and protein health powders.',
      bannerImg: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop'
    },
    'ice-creams-kulfi-frozen-desserts': {
      description: 'Creamy gelato, classic Belgian chocolate tubs, traditional matka kulfi, and frozen desserts delivered ice-cold.',
      bannerImg: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=150&auto=format&fit=crop'
    },
    'chocolates-indian-sweets': {
      description: 'Rich dark chocolates, traditional ghee gulab jamun, kaju katli, and party sweet boxes freshly prepared.',
      bannerImg: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=150&auto=format&fit=crop'
    }
  };

  // Unique high-quality thumbnail image for EVERY subcategory
  const subCategoryImages: Record<string, string> = {
    // Dairy, Bread & Eggs
    'Milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
    'Breads & Buns': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop',
    'Fresh Bakery': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop',
    'Eggs': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop',
    'Curd & Probiotic Drinks': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&auto=format&fit=crop',
    'Batters & Mixes': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=200&auto=format&fit=crop',
    'High Protein': 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=200&auto=format&fit=crop',
    'Milk Based Drinks': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200&auto=format&fit=crop',
    'Paneer & Cream': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop',
    'Gut Friendly': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200&auto=format&fit=crop',
    'Butter': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop',
    'Cheese': 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=200&auto=format&fit=crop',
    'Indian Breads': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&auto=format&fit=crop',
    'Yogurt & Shrikhand': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&auto=format&fit=crop',
    'Gourmet Store': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop',

    // Fruits & Vegetables
    'Fresh Vegetables': 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop',
    'New Launches in Fruits & Vegetables': 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop',
    'Fresh Fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&auto=format&fit=crop',
    'Exotics & Premium': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop',
    'Mangoes & Melons': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop',
    'Organics & Hydroponics': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop',
    'Leafy, Herbs & Seasonings': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&auto=format&fit=crop',
    'Flowers & Leaves': 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&auto=format&fit=crop',
    'Bouquets & Plants': 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=200&auto=format&fit=crop',
    'Cuts & Sprouts': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&auto=format&fit=crop',
    'Plants & Gardening': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=200&auto=format&fit=crop',
    'Gardening Accessories': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop',
    'Frozen Veggies & Pulp': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop',

    // Atta, Rice, Oil & Dals
    'Atta': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop',
    'Rice': 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&auto=format&fit=crop',
    'Edible Oils': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop',
    'Dals & Pulses': 'https://images.unsplash.com/photo-1585994191611-726a88060c2d?w=200&auto=format&fit=crop',
    'Ghee': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop',

    // Breakfast & Sauces
    'Cereals & Oats': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop',
    'Spreads & Peanut Butter': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200&auto=format&fit=crop',
    'Ketchup & Sauces': 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=200&auto=format&fit=crop'
  };

  // Subcategory descriptions and fallback thumbnail images
  const subCategoryDescriptions: Record<string, string> = {
    // Dairy
    'Milk': 'Fresh milk restocked daily. Sourced directly from farms for peak purity.',
    'Breads & Buns': 'Artisan white, brown, multigrain breads, and burger buns baked daily.',
    'Fresh Bakery': 'Freshly baked croissants, pastries, muffins, and cookies.',
    'Eggs': 'Farm-fresh white, brown, and organic omega-3 rich eggs.',
    'Curd & Probiotic Drinks': 'Fresh thick curd, matka dahi, lassi, and gut-friendly probiotic drinks.',
    'Batters & Mixes': 'Freshly ground idli, dosa batter, and instant meal mixes.',
    'High Protein': 'Greek yogurts, protein shakes, and high-protein cottage cheese.',
    'Milk Based Drinks': 'Flavoured milk, badam drink, cold coffee, and milkshakes.',
    'Paneer & Cream': 'Soft malai paneer, cooking cream, and fresh whipping cream.',
    'Butter': 'Creamy salted butter, unpasteurized white butter, and garlic butter.',
    'Cheese': 'Cheddar, mozzarella, cheese slices, spreads, and process cheese blocks.',
    'Indian Breads': 'Freshly prepped rotis, parathas, and naan ready to heat and eat.',
    'Yogurt & Shrikhand': 'Flavoured yogurts, fruit shrikhand, and traditional mishti doi.',

    // Fruits & Veggies
    'Fresh Vegetables': 'Restocked daily from local farms — onions, tomatoes, potatoes, gourds, and seasonal greens at peak freshness.',
    'New Launches in Fruits & Vegetables': 'Seasonal veggies, fruits and exotic varieties added this week. See what landed on shelves.',
    'Fresh Fruits': 'Ripe fruits from across India and the world — apples, bananas, oranges, berries, and seasonal delights.',
    'Exotics & Premium': 'Imported and rare varieties: dragon fruit, kiwis, avocados, blueberries, and hard to find produce.',
    'Mangoes & Melons': 'Alphonso, Kesar, and Banganapalli mangoes in season, plus watermelons and muskmelons directly sourced.',
    'Organics & Hydroponics': 'Certified organic and pesticide-free hydroponic greens, vegetables, and pesticide-free fruits.',
    'Leafy, Herbs & Seasonings': 'Fresh coriander, mint, palak, methi, curry leaves, and aromatic herbs for everyday cooking.',
    'Flowers & Leaves': 'Fresh marigolds, roses, banana leaves, and pooja flowers for daily worship and festive occasions.',
    'Bouquets & Plants': 'Flower bouquets and indoor plants to brighten a room or give as a thoughtful gift.',
    'Cuts & Sprouts': 'Pre-cut fruits, ready-to-cook vegetable mixes, and sprouted moong and chana for quick meals.',
    'Plants & Gardening': 'Indoor plants, succulents, and starter saplings for a home garden.',
    'Gardening Accessories': 'Pots, soil, fertilizers, and tools for your balcony or backyard plants.',
    'Frozen Veggies & Pulp': 'Frozen peas, mixed vegetables, and fruit pulps for quick cooking without prep.'
  };

  // Sync state with URL parameter changes
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    } else if (categories.length > 0) {
      setSelectedCategory(categories[0].slug || categories[0].id);
    }
    if (urlSubCategory) {
      setSelectedSubCategory(urlSubCategory);
    } else {
      setSelectedSubCategory('');
    }
  }, [urlCategory, urlSubCategory, categories]);

  useEffect(() => {
    setOnlyOrganic(urlOrganic);
  }, [urlOrganic]);

  // Active Category Object
  const currentCategoryObj = useMemo(() => {
    return categories.find(c => c.id === selectedCategory || c.slug === selectedCategory) || categories[0];
  }, [categories, selectedCategory]);

  const activeCategoryMeta = useMemo(() => {
    const slug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
    return categoryMetaData[slug] || {
      description: 'Sourced directly from local farms daily and delivered fresh to your door in 10 minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop'
    };
  }, [currentCategoryObj]);

  // Extract subcategories for active main category
  const activeSubCategories = useMemo(() => {
    if (currentCategoryObj && currentCategoryObj.subCategories) {
      return currentCategoryObj.subCategories;
    }
    return [];
  }, [currentCategoryObj]);

  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (urlSearch) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(urlSearch.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(urlSearch.toLowerCase()))
      );
    }

    if (selectedCategory) {
      result = result.filter((p) => 
        p.categoryId === selectedCategory || 
        p.category === selectedCategory || 
        (currentCategoryObj && (p.categoryId === currentCategoryObj.id || p.category === currentCategoryObj.name))
      );
    }

    if (selectedSubCategory) {
      const subTarget = selectedSubCategory.toLowerCase();
      const subFiltered = result.filter((p) => {
        if (!p.subCategory) return false;
        const pSub = p.subCategory.toLowerCase();
        return pSub === subTarget || pSub.includes(subTarget) || subTarget.includes(pSub);
      });
      if (subFiltered.length > 0) {
        result = subFiltered;
      }
    }

    if (onlyOrganic) {
      result = result.filter((p) => p.isOrganic);
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      result.sort((a, b) => ((b.originalPrice || b.mrp) - b.price) - ((a.originalPrice || a.mrp) - a.price));
    }

    return result;
  }, [products, urlSearch, selectedCategory, selectedSubCategory, currentCategoryObj, onlyOrganic, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory, onlyOrganic, sortBy, urlSearch]);

  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleClearAll = () => {
    setSelectedSubCategory('');
    setOnlyOrganic(false);
    setSearchParams({});
  };

  const seo = seoSettings.products || {
    title: 'Shop Groceries by Category | FreshCart',
    description: 'Browse fresh fruits, vegetables, dairy, snacks, and grocery essentials.',
    keywords: 'fresh vegetables, freshcart catalog, online grocery'
  };

  return (
    <div className="page-wrapper min-h-screen bg-background">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1360px] pt-4 pb-16">
        
        {/* Top Navigation & Breadcrumb Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-text-tertiary">
            <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <span>›</span>
            <span 
              onClick={() => setSelectedSubCategory('')} 
              className={`cursor-pointer hover:text-emerald-600 ${!selectedSubCategory ? 'text-text-primary font-black' : ''}`}
            >
              {currentCategoryObj?.name || 'Catalog'}
            </span>
            {selectedSubCategory && (
              <>
                <span>›</span>
                <span className="text-emerald-600 font-black">{selectedSubCategory}</span>
              </>
            )}
          </div>

          {selectedSubCategory && (
            <button 
              onClick={() => setSelectedSubCategory('')}
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              ← Back to All {currentCategoryObj?.name} Subcategories
            </button>
          )}
        </div>

        {/* CONDITION 1: Subcategory IS Selected -> Show Subcategory View with Left Subcategory Sidebar */}
        {selectedSubCategory ? (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            
            {/* Left Subcategory Sidebar */}
            <aside className="bg-surface border border-divider/70 rounded-2xl p-4 shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between border-b border-divider/60 pb-3">
                <h3 className="font-black text-xs text-text-primary tracking-wider uppercase">
                  Subcategories ({activeSubCategories.length})
                </h3>
              </div>

              <div className="space-y-1 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedSubCategory('')}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 ${
                    selectedSubCategory === ''
                      ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                      : 'hover:bg-background text-text-primary font-bold'
                  }`}
                >
                  <span className="text-xs truncate">All {currentCategoryObj?.name}</span>
                </button>

                {activeSubCategories.map((sub, idx) => {
                  const subName = typeof sub === 'string' ? sub : sub.name;
                  const isActive = selectedSubCategory.toLowerCase() === subName.toLowerCase();
                  const catSlug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
                  const subImg = subCategoryImages[subName] || categoryMetaData[catSlug]?.icon || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop';

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedSubCategory(subName)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-200 group ${
                        isActive 
                          ? 'bg-emerald-600 text-white font-extrabold shadow-sm' 
                          : 'hover:bg-background text-text-primary font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-divider bg-background">
                          <img src={subImg} alt={subName} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs truncate">{subName}</span>
                      </div>

                      <ChevronRight size={14} className={`flex-shrink-0 opacity-60 ${isActive ? 'text-white' : 'text-text-tertiary'}`} />
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-divider/60 space-y-3">
                <div className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-text-secondary">Organic Only</span>
                  <input
                    type="checkbox"
                    checked={onlyOrganic}
                    onChange={(e) => setOnlyOrganic(e.target.checked)}
                    className="w-4 h-4 rounded border-divider text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </aside>

            {/* Right Main Content Area: Subcategory Header & Products Grid */}
            <main className="flex flex-col gap-6">
              
              <div className="bg-surface border border-divider/70 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-text-primary tracking-tight font-display">
                    {selectedSubCategory}
                  </h1>
                  <p className="text-xs text-text-tertiary font-bold mt-0.5">
                    {filteredProducts.length} Products available in 10 mins
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-background border border-divider px-3 py-1.5 rounded-xl text-xs">
                  <ArrowUpDown size={14} className="text-emerald-600" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent font-extrabold text-text-primary outline-none cursor-pointer"
                  >
                    <option value="default">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Popularity</option>
                    <option value="discount">Max Discount</option>
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              {paginatedProducts.length === 0 ? (
                <div className="bg-surface border border-divider rounded-2xl p-12 text-center shadow-card flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={36} className="text-text-tertiary animate-spin" />
                  <h3 className="text-base font-bold text-text-primary">No matching products found</h3>
                  <p className="text-xs text-text-secondary leading-normal">Try selecting another subcategory or clearing search queries.</p>
                  <button onClick={handleClearAll} className="text-xs font-bold bg-emerald-600 text-white py-2.5 px-6 rounded-full mt-2 hover:bg-emerald-700 transition-colors">Reset All Filters</button>
                </div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

            </main>
          </div>
        ) : (
          /* CONDITION 2: NO Subcategory Selected -> Show Category Landing Page with 3-Column Cards Grid */
          <main className="flex flex-col gap-6">
            
            {/* Category Hero Card Banner */}
            <div className="bg-[#f4f5f7] border border-divider/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="max-w-[580px] z-10">
                <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight font-display">
                  {currentCategoryObj ? currentCategoryObj.name : 'Category Catalog'}
                </h1>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold mt-2">
                  {activeCategoryMeta.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-500/10 w-fit px-3 py-1 rounded-full">
                  <span>⚡ Delivery in 10 minutes</span>
                </div>
              </div>

              <div className="w-32 h-32 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-xs border border-divider bg-surface flex-shrink-0 z-10">
                <img 
                  src={activeCategoryMeta.bannerImg} 
                  alt={currentCategoryObj?.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 3-Column Subcategories Cards Grid */}
            {activeSubCategories.length > 0 && (
              <div>
                <div className="text-xs font-black text-text-secondary uppercase tracking-wider mb-3">
                  {activeSubCategories.length} SUBCATEGORIES
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {activeSubCategories.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : sub.name;
                    const subDesc = subCategoryDescriptions[subName] || `Fresh ${subName.toLowerCase()} restocked daily. Sourced directly for peak freshness.`;
                    const catSlug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
                    const subImg = subCategoryImages[subName] || categoryMetaData[catSlug]?.icon || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop';

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedSubCategory(subName)}
                        className="p-3.5 rounded-2xl border bg-surface border-divider/70 hover:border-emerald-500/50 hover:shadow-xs transition-all duration-200 cursor-pointer flex gap-3 items-start group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-divider flex-shrink-0 bg-background group-hover:scale-105 transition-transform">
                          <img src={subImg} alt={subName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-text-primary truncate group-hover:text-emerald-600 transition-colors">{subName}</h4>
                          <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed font-semibold mt-0.5">
                            {subDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </main>
        )}

      </div>
    </div>
  );
};

export default Products;
