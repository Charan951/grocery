import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCMS } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { QuickViewModal } from '../components/QuickViewModal';
import { 
  Search as SearchIcon, 
  X, 
  TrendingUp, 
  Clock, 
  ShoppingBag,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_TRENDING_TERMS = [
  'Fresh Milk',
  'Atta & Flours',
  'Amul Butter',
  'Paneer & Cream',
  'Mangoes & Fruits',
  'Basmati Rice',
  'Organic Ghee',
  'Chips & Snacks',
  'Cold Drinks',
  'Dry Fruits'
];

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';
  
  const { products = [], categories = [] } = useCMS();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Recent Searches stored in localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('freshcart_recent_searches');
      return cached ? JSON.parse(cached) : ['Atta', 'Milk', 'Butter', 'Paneer'];
    } catch {
      return ['Atta', 'Milk', 'Butter', 'Paneer'];
    }
  });

  // Focus input on mount if query is empty
  useEffect(() => {
    if (!initialQuery && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      if (query.trim()) {
        setSearchParams({ q: query.trim() }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, setSearchParams]);

  // Save term to recent searches
  const handleSelectTerm = (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    setQuery(cleanTerm);
    setRecentSearches(prev => {
      const updated = [cleanTerm, ...prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase())].slice(0, 8);
      localStorage.setItem('freshcart_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('freshcart_recent_searches');
  };

  // Filter products by debounced search term
  const searchResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];

    return products.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const brandMatch = p.brand ? p.brand.toLowerCase().includes(q) : false;
      const catMatch = p.category ? p.category.toLowerCase().includes(q) : false;
      const subCatMatch = p.subCategory ? p.subCategory.toLowerCase().includes(q) : false;
      const descMatch = p.description ? p.description.toLowerCase().includes(q) : false;

      return nameMatch || brandMatch || catMatch || subCatMatch || descMatch;
    });
  }, [debouncedQuery, products]);

  // Dynamic trending terms derived from live catalog + defaults
  const trendingTerms = useMemo(() => {
    const liveCatNames = categories.map(c => c.name).filter(Boolean);
    const liveProdNames = products.slice(0, 6).map(p => p.name).filter(Boolean);
    const combined = Array.from(new Set([...liveCatNames, ...liveProdNames, ...DEFAULT_TRENDING_TERMS]));
    return combined.slice(0, 10);
  }, [categories, products]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 font-sans">
      <SEO 
        title={debouncedQuery ? `Search results for "${debouncedQuery}" | FreshCart` : "Search Products | FreshCart"}
        description="Search from thousands of fresh groceries, fruits, vegetables, dairy and daily essentials."
      />

      {/* Sticky Mobile Search Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs px-4 py-3">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Search Input Container */}
          <div className="flex-1 relative flex items-center bg-gray-100 hover:bg-gray-100/80 rounded-2xl px-3.5 py-2.5 transition-all focus-within:border-[#0C831F] border border-transparent">
            <SearchIcon size={18} className="text-gray-400 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for atta, dal, milk, coke and more..."
              className="w-full bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  if (inputRef.current) inputRef.current.focus();
                }}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors ml-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {!debouncedQuery ? (
          /* DISCOVERY VIEW: Recent Searches + Trending Terms */
          <div className="space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
                    <Clock size={14} className="text-gray-400" />
                    <span>Recent Searches</span>
                  </div>
                  <button
                    onClick={handleClearRecent}
                    className="text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSelectTerm(term)}
                      className="bg-gray-100 hover:bg-[#0C831F]/10 hover:text-[#0C831F] text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0C831F] mb-3">
                <TrendingUp size={16} className="text-[#0C831F]" />
                <span>Trending Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSelectTerm(term)}
                    className="bg-emerald-50/60 hover:bg-[#0C831F] hover:text-white border border-emerald-100/80 text-emerald-900 text-xs font-extrabold px-3.5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles size={12} className="opacity-70" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Categories Grid */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">
                Explore Categories
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {categories.slice(0, 8).map((cat) => (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => navigate(`/products?category=${cat.slug || cat.id}`)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-gray-100 transition-all cursor-pointer text-center group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-xs overflow-hidden mb-2 group-hover:scale-105 transition-transform">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-[#0C831F]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-[#0C831F]">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div>
            {/* Results Count Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-500">
                Found <span className="font-black text-gray-900">{searchResults.length}</span> {searchResults.length === 1 ? 'product' : 'products'} for "{debouncedQuery}"
              </p>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-3">
                {searchResults.map((product) => (
                  <ProductCard
                    key={product.id || product._id}
                    product={product}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            ) : (
              /* EMPTY RESULTS STATE */
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs my-8">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                  <SearchIcon size={28} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">No products found</h3>
                <p className="text-xs font-medium text-gray-500 max-w-xs mx-auto mb-5">
                  We couldn't find anything matching "{debouncedQuery}". Try checking for spelling errors or searching another keyword.
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="bg-[#0C831F] hover:bg-emerald-700 text-white font-black text-xs px-6 py-2.5 rounded-full shadow-xs transition-all cursor-pointer"
                >
                  Clear Search & Browse
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
};
