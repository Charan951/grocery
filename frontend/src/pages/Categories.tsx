import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCMS, getSubCategoryImage, getCategoryImage } from '../context/CMSContext';
import { SubcategoryCardImage } from '../components/SubcategoryCardImage';
import { SEO } from '../components/SEO';
import { LocationModal } from '../components/LocationModal';
import { Search, ChevronDown, Zap } from 'lucide-react';

export const Categories: React.FC = () => {
  const { categories = [], products = [], userLocation, updateUserLocation, seoSettings } = useCMS();
  const navigate = useNavigate();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Dynamic Trending Searches from real database (NO DUMMY DATA)
  const trendingSearches = useMemo(() => {
    // Real Categories & Subcategories
    const catTags = categories
      .flatMap((c) => [c.name, ...(c.subCategories || []).map((s) => (typeof s === 'string' ? s : s.name))])
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    // Real Products
    const prodTags = products
      .map((p) => p.name)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    // Real Brands
    const brandTags = products
      .map((p) => p.brand)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8);

    return {
      categories: catTags,
      products: prodTags,
      brands: brandTags,
    };
  }, [categories, products]);

  // Dynamic Popular Searches from real database products (NO DUMMY DATA)
  const popularSearches = useMemo(() => {
    const prods = products
      .map((p) => p.name)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(10, 28);

    if (prods.length < 5) {
      const fallback = categories.flatMap((c) => (c.subCategories || []).map((s) => (typeof s === 'string' ? s : s.name)));
      return Array.from(new Set([...prods, ...fallback])).slice(0, 20);
    }

    return prods;
  }, [categories, products]);

  const handleTagClick = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    // Match Category
    const matchedCat = categories.find(
      (c) =>
        c.name.toLowerCase() === trimmed.toLowerCase() ||
        (c.slug && c.slug.toLowerCase() === trimmed.toLowerCase())
    );

    if (matchedCat) {
      navigate(`/products?category=${matchedCat.slug || matchedCat.id}&subCategory=All`);
      return;
    }

    // Match Subcategory
    for (const cat of categories) {
      const subs = cat.subCategories || [];
      const matchedSub = subs.find(
        (s) => (typeof s === 'string' ? s : s.name).toLowerCase() === trimmed.toLowerCase()
      );
      if (matchedSub) {
        const subName = typeof matchedSub === 'string' ? matchedSub : matchedSub.name;
        navigate(`/products?category=${cat.slug || cat.id}&subCategory=${encodeURIComponent(subName)}`);
        return;
      }
    }

    // Otherwise Product Search
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const formattedLocation = useMemo(() => {
    if (typeof userLocation === 'object' && userLocation !== null && (userLocation.houseNo || userLocation.area || userLocation.address || userLocation.fullAddress)) {
      const parts = [];
      if (userLocation.label) parts.push(userLocation.label);
      if (userLocation.houseNo) parts.push(userLocation.houseNo);
      parts.push(userLocation.area || userLocation.address || userLocation.fullAddress);
      return parts.join(' - ');
    }
    if (typeof userLocation === 'string' && (userLocation as string).trim()) {
      return userLocation;
    }
    return 'Select Location';
  }, [userLocation]);

  const seo = seoSettings?.['categories'] || {
    title: 'All Categories | FreshCart Delivery in Minutes',
    description: 'Explore all grocery categories, fresh produce, dairy, bakery, snacks, drinks delivered in 10 minutes.',
    keywords: 'categories, fresh fruits, vegetables, dairy, bakery, snacks, instant delivery',
  };

  return (
    <div className="min-h-screen bg-white text-text-primary pb-16">
      <SEO title={seo.title} description={seo.description} keywords={seo.keywords} />

      {/* Top Location Header Bar (No search input bar, no category pills) */}
      <header className="sticky top-0 z-[999] bg-white border-b border-divider px-3.5 py-2.5 flex items-center justify-between shadow-2xs">
        {/* Left Side: Location */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            onClick={() => setIsLocationModalOpen(true)}
            className="flex flex-col justify-center cursor-pointer select-none group min-w-0"
          >
            <div className="flex items-center gap-1 text-[13px] font-black text-text-primary tracking-tight leading-none">
              <Zap size={14} className="text-primary fill-primary shrink-0" />
              <span className="whitespace-nowrap">Delivery in minutes*</span>
            </div>
            <div className="flex items-center gap-0.5 text-xs font-bold text-text-secondary group-hover:text-primary transition-colors mt-0.5 min-w-0">
              <span className="truncate max-w-[200px] sm:max-w-[280px]">{formattedLocation}</span>
              <ChevronDown size={13} className="shrink-0" />
            </div>
          </div>
        </div>

        {/* Right Side: Search Icon */}
        <button
          onClick={() => {
            const firstCat = categories[0]?.slug || categories[0]?.id || 'fruits-vegetables';
            navigate(`/products?category=${firstCat}&subCategory=All`);
          }}
          className="p-1.5 rounded-full hover:bg-background transition-colors text-text-primary cursor-pointer shrink-0 ml-2"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </header>

      {/* Main Content Area (Clean Canvas - Our Actual Grocery Categories) */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-7">

        {/* Main Categories & Subcategories Sections */}
        <div className="space-y-7">
          {categories.map((cat) => {
            const catSlug = cat.slug || cat.id;
            const subList = cat.subCategories || [];

            return (
              <section key={cat.id} className="w-full">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight font-display">
                    {cat.name}
                  </h2>
                  <Link
                    to={`/products?category=${catSlug}&subCategory=All`}
                    state={{ from: '/categories' }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    See All
                  </Link>
                </div>

                {/* Subcategories Grid (Single Card Tile - Matching Image 3 Reference) */}
                {subList.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
                    {subList.map((sub, idx) => {
                      const subName = typeof sub === 'string' ? sub : sub.name;
                      const customImg = typeof sub === 'object' ? sub.image || sub.icon : undefined;
                      const imgUrl = getSubCategoryImage(subName, cat.name, customImg);

                      return (
                        <div
                          key={idx}
                          onClick={() =>
                            navigate(`/products?category=${catSlug}&subCategory=${encodeURIComponent(subName)}`, { state: { from: '/categories' } })
                          }
                          className="flex flex-col items-center group cursor-pointer text-center col-span-1"
                        >
                          <div className="w-full aspect-square bg-[#F4F5F7] rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden group-hover:scale-[1.03] transition-transform duration-200">
                            <SubcategoryCardImage
                              src={imgUrl}
                              alt={subName}
                              fallbackSrc={getCategoryImage(cat)}
                              className="w-full h-full"
                            />
                          </div>

                          {/* Subcategory Label */}
                          <span className="text-[11px] sm:text-xs font-bold text-text-primary line-clamp-2 leading-tight mt-1.5 group-hover:text-primary transition-colors">
                            {subName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-text-tertiary">
                    No subcategories available.
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Zepto Trending Searches & Popular Searches */}
        <section className="pt-7 border-t border-divider/60 space-y-6">

          {/* Trending Searches */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-text-primary font-display tracking-tight mb-3">
              Trending Searches
            </h2>

            {/* Categories */}
            {trendingSearches.categories.length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-xs font-extrabold text-text-primary mb-1">Categories</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-text-secondary leading-relaxed">
                  {trendingSearches.categories.map((catName, idx) => (
                    <React.Fragment key={`t_cat_${idx}`}>
                      <button
                        onClick={() => handleTagClick(catName)}
                        className="hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                      >
                        {catName}
                      </button>
                      {idx < trendingSearches.categories.length - 1 && (
                        <span className="text-text-tertiary select-none">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {trendingSearches.products.length > 0 && (
              <div className="mb-3.5">
                <h3 className="text-xs font-extrabold text-text-primary mb-1">Products</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-text-secondary leading-relaxed">
                  {trendingSearches.products.map((prodName, idx) => (
                    <React.Fragment key={`t_prod_${idx}`}>
                      <button
                        onClick={() => handleTagClick(prodName)}
                        className="hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                      >
                        {prodName}
                      </button>
                      {idx < trendingSearches.products.length - 1 && (
                        <span className="text-text-tertiary select-none">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Brands */}
            {trendingSearches.brands.length > 0 && (
              <div>
                <h3 className="text-xs font-extrabold text-text-primary mb-1">Brands</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-text-secondary leading-relaxed">
                  {trendingSearches.brands.map((brandName, idx) => (
                    <React.Fragment key={`t_brand_${idx}`}>
                      <button
                        onClick={() => handleTagClick(brandName)}
                        className="hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                      >
                        {brandName}
                      </button>
                      {idx < trendingSearches.brands.length - 1 && (
                        <span className="text-text-tertiary select-none">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Popular Searches */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-text-primary font-display tracking-tight mb-3">
              Popular Searches
            </h2>

            {popularSearches.length > 0 && (
              <div>
                <h3 className="text-xs font-extrabold text-text-primary mb-1">Products</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-text-secondary leading-relaxed">
                  {popularSearches.map((item, idx) => (
                    <React.Fragment key={`p_prod_${idx}`}>
                      <button
                        onClick={() => handleTagClick(item)}
                        className="hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                      >
                        {item}
                      </button>
                      {idx < popularSearches.length - 1 && (
                        <span className="text-text-tertiary select-none">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Location Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectLocation={(loc: any) => updateUserLocation(loc)}
      />
    </div>
  );
};

export default Categories;
