import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS, getCategoryImage, hexToRgba, hexToTintOnWhite, hexToDarkShade } from '../context/CMSContext';
import { LocationModal } from './LocationModal';
import { CustomerAuthModal } from './CustomerAuthModal';
import { CustomerProfileDrawer } from './CustomerProfileDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImage } from '../utils/imageUtils';
import {
  Search, Heart, MapPin, Menu, X,
  ChevronDown, Leaf, Settings, Percent, User, Zap, LogOut, Shield, LayoutGrid, ShoppingCart
} from 'lucide-react';

interface HeaderProps {
  onWishlistOpen: () => void;
  onCartOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onWishlistOpen, onCartOpen }) => {
  const { wishlist, cartCount } = useCartWishlist();
  const totalItems = cartCount;
  const setIsCartOpen = (open: boolean) => { if (open) onCartOpen(); };
  const { categories, products, coupons, banners, userLocation, updateUserLocation, activeHeroBannerIndex, activeFestivalCampaign } = useCMS();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Entire app bar (top header, search bar, category nav) tints to the active
  // category's own colour; defaults to campaign or green theme when home is active.
  const activeCategory = useMemo(
    () => categories.find(cat => {
      const catSlug = cat.slug || cat.id;
      return location.search.includes(`category=${catSlug}`) || location.pathname === `/category/${catSlug}`;
    }),
    [categories, location.search, location.pathname]
  );
  const isHomeActive = location.pathname === '/' && !activeCategory;

  const isProductListingPage =
    location.pathname === '/products' || location.pathname.startsWith('/products/');

  const isProductDetailPage =
    location.pathname.startsWith('/product/') || location.pathname.startsWith('/prn/');

  const isProfilePage =
    location.pathname.startsWith('/profile') || location.pathname.startsWith('/account/profile');

  const isOrdersPage =
    location.pathname.startsWith('/orders') || location.pathname.startsWith('/account/orders');

  const isCategoriesPage =
    location.pathname === '/categories' || location.pathname.startsWith('/categories/');

  const shouldHideCategoryAppbar =
    isProductListingPage || isProductDetailPage || isProfilePage || isOrdersPage || isCategoriesPage;

  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof products>([]);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);

  const [customerUser, setCustomerUser] = useState<any>(() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  // Rotating sample search placeholders every 2 seconds
  const SAMPLE_SEARCHES = useMemo(() => [
    'Search "ice cream"',
    'Search "bread & buns"',
    'Search "chocolate box"',
    'Search "fresh milk"',
    'Search "kurkure & snacks"',
    'Search "mangoes & fruits"',
    'Search "organic ghee"',
    'Search "paneer & cream"'
  ], []);

  const [sampleSearchIndex, setSampleSearchIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSampleSearchIndex((prev) => (prev + 1) % SAMPLE_SEARCHES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [SAMPLE_SEARCHES.length]);

  const currentPlaceholder = SAMPLE_SEARCHES[sampleSearchIndex];

  const searchRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const appBarRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Scroll direction listener for the mobile AppBar hide/show. One rAF-throttled
  // read per frame, no layout writes here — all the jank came from doing work on
  // every raw scroll event.
  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setIsScrolledDown(y > 40); // React bails when the boolean is unchanged

        if (!isMobile) { setHeaderHidden(false); lastScrollY.current = y; return; }
        if (y <= 20) { setHeaderHidden(false); lastScrollY.current = y; return; }

        const diff = y - lastScrollY.current;
        if (diff > 10 && y > 80) setHeaderHidden(true);
        else if (diff < -10) setHeaderHidden(false);
        lastScrollY.current = y;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  // Reset transient header state on route change.
  useEffect(() => {
    setHeaderHidden(false);
    setIsScrolledDown(false);
    lastScrollY.current = 0;
  }, [location.pathname, location.search]);

  // --sticky-header-h drives <main>'s padding-top and the category strip's
  // sticky offset. It must be STABLE (two discrete values), never swept through
  // every intermediate height of the collapse animation — that per-frame churn
  // was the juddering. So: measure the expanded height only while the header is
  // open, and snap the var to 0 the instant it collapses.
  const expandedHRef = useRef(0);

  useEffect(() => {
    if (headerHidden) return;
    const measure = () => {
      const el = appBarRef.current;
      if (!el) return;
      const h = el.offsetHeight;
      if (h > 0) {
        expandedHRef.current = h;
        document.documentElement.style.setProperty('--sticky-header-h', `${h}px`);
      }
    };
    measure();
    const raf = requestAnimationFrame(measure); // after paint
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [location.pathname, location.search, headerHidden, isMobile, isScrolledDown]);

  // One write per collapse/expand — the page padding + sticky category strip
  // then glide via their own CSS transitions.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sticky-header-h',
      headerHidden ? '0px' : `${expandedHRef.current || 140}px`
    );
  }, [headerHidden]);

  // Reopen the profile drawer when routed home from a sub-page's Back button
  useEffect(() => {
    if ((location.state as { openProfile?: boolean } | null)?.openProfile && customerUser) {
      setIsCustomerProfileOpen(true);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleProfileClick = () => {
    if (customerUser) {
      setIsCustomerProfileOpen(true);
    } else {
      setIsCustomerAuthOpen(true);
    }
  };

  const handleCustomerLogout = () => {
    setCustomerUser(null);
    localStorage.removeItem('customer_user');
    setIsCustomerProfileOpen(false);
    setShowProfileMenu(false);
  };

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time search filter with debouncing
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      const timer = setTimeout(() => {
        const filtered = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
        setSearchResults(filtered);
        setShowSearchResults(true);
      }, 150);

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchResultClick = (productId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const isHomePage = location.pathname === '/';

  // Festival campaign continuous header mode for Mobile
  const isFestivalActive = isHomePage && isMobile && activeFestivalCampaign && activeFestivalCampaign.isActive !== false;

  // Active campaign banners list for Home Page
  const validHomeBanners = useMemo(() => {
    if (!isHomePage) return [];
    const now = new Date();
    return banners.filter(b => {
      if (b.active === false) return false;
      const isDisplayValid = !b.displayOn || b.displayOn === 'HOME' || b.displayOn === 'ALL';
      if (!isDisplayValid) return false;
      const target = b.targetPlatform || 'ALL';
      if (target === 'WEB' && isMobile) return false;
      if (target === 'MOBILE' && !isMobile) return false;
      if (b.startDate && now < new Date(b.startDate)) return false;
      if (b.endDate && now > new Date(b.endDate)) return false;
      return true;
    });
  }, [banners, isHomePage, isMobile]);

  // Dynamic active hero banner based on activeHeroBannerIndex from BannerCarousel
  const activeCampaignBanner = useMemo(() => {
    if (validHomeBanners.length === 0) return null;
    const idx = (activeHeroBannerIndex || 0) % validHomeBanners.length;
    return validHomeBanners[idx] || validHomeBanners[0];
  }, [validHomeBanners, activeHeroBannerIndex]);

  const campaignBgColor = isHomePage ? (activeCampaignBanner?.themeBgColor || activeCampaignBanner?.gradient?.[0]) : null;
  const campaignTextColor = isHomePage ? (activeFestivalCampaign?.theme?.textColor || activeCampaignBanner?.themeTextColor) : null;
  const campaignAccentColor = isHomePage ? (activeFestivalCampaign?.theme?.accentColor || activeCampaignBanner?.themeAccentColor || '#F6C453') : '#10B981';

  const getIsDarkColor = (colorHexOrRgb?: string) => {
    if (!colorHexOrRgb) return false;
    let hex = colorHexOrRgb;
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma < 150;
    }
    return false;
  };

  const dynamicHeaderBg = useMemo(() => {
    if (isScrolledDown) {
      return '#ffffff';
    }
    if (isFestivalActive) {
      return 'transparent';
    }
    // Dynamic banner color matching ONLY applies on mobile home page
    if (isMobile && isHomePage && campaignBgColor) {
      return campaignBgColor;
    }
    if (activeCategory && activeCategory.color) {
      return hexToTintOnWhite(activeCategory.color, 0.14);
    }
    return '#ffffff';
  }, [isScrolledDown, isFestivalActive, isMobile, isHomePage, campaignBgColor, activeCategory]);

  const isDarkHeader = useMemo(() => {
    if (isScrolledDown) return false;
    if (!isHomePage || !isMobile) return false;
    if (isFestivalActive && activeFestivalCampaign?.theme?.textColor) {
      return true; // Use themed white/light text contrast over continuous campaign background
    }
    if (campaignTextColor) {
      return !getIsDarkColor(campaignTextColor);
    }
    return getIsDarkColor(dynamicHeaderBg);
  }, [isScrolledDown, isHomePage, isMobile, isFestivalActive, activeFestivalCampaign, dynamicHeaderBg, campaignTextColor]);

  const headerTextColor = isDarkHeader ? 'text-white' : 'text-text-primary';
  const headerSubTextColor = isDarkHeader ? 'text-white/90 hover:text-white' : 'text-text-secondary hover:text-primary';
  const iconColorClass = isDarkHeader ? 'text-white fill-white' : 'text-text-primary fill-text-primary';

  const festivalHeaderBgStyle: React.CSSProperties = isFestivalActive && !isScrolledDown ? {
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    boxShadow: 'none'
  } : {
    backgroundColor: dynamicHeaderBg
  };

  // On mobile these pages carry their own minimal "back + title" bar — the full
  // location / search / profile app header would just stack on top of it.
  if (isMobile && (isProductDetailPage || isCategoriesPage || isOrdersPage)) {
    return null;
  }

  return (
    <>
      <div
        ref={appBarRef}
        className={`fixed top-0 left-0 right-0 z-[1000] w-full transition-all duration-300 transform translate-y-0 border-none outline-none ${isScrolledDown ? 'shadow-sm' : 'shadow-none'
          }`}
        style={festivalHeaderBgStyle}
      >
        {/* Desktop & Mobile Header Content */}
        <header
          className={`flex items-center justify-between w-full max-w-[1280px] mx-auto px-3 md:px-8 transition-all duration-300 gap-2 md:gap-6 border-none outline-none ${headerHidden
              ? 'py-0 sm:py-2.5 max-h-0 sm:max-h-24 opacity-0 sm:opacity-100 overflow-hidden sm:overflow-visible pointer-events-none sm:pointer-events-auto'
              : 'py-2 md:py-2.5 max-h-24 opacity-100'
            }`}
          style={festivalHeaderBgStyle}
        >
          {/* Desktop Logo & Location */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <img src="/logo.png" alt="FreshCart Logo" className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105" />
              <span className="hidden xl:inline text-2xl font-extrabold tracking-tight text-primary font-display leading-none">
                FreshCart
              </span>
            </Link>

            {/* Location Selector (Desktop) */}
            <div
              onClick={() => navigate('/account/addresses')}
              className="flex flex-col cursor-pointer select-none group pl-3 sm:pl-4"
            >
              <div className={`flex items-center gap-1 font-extrabold text-sm tracking-tight leading-tight ${headerTextColor}`}>
                <Zap size={15} className={`shrink-0 ${iconColorClass}`} />
                <span className="font-black">10 minutes</span>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-bold transition-colors ${headerSubTextColor}`}>
                <span className="truncate max-w-[220px] lg:max-w-[280px]">
                  {(() => {
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
                    return '📍 Add Address';
                  })()}
                </span>
                <ChevronDown size={14} className="shrink-0" />
              </div>
            </div>
          </div>

          {/* Mobile Header Row (Compact Delivery & Profile) */}
          <div className={`flex sm:hidden items-center justify-between w-full gap-2 transition-all duration-300 ease-in-out overflow-hidden ${headerHidden ? 'max-h-0 opacity-0 py-0 pointer-events-none' : 'max-h-16 opacity-100 py-0.5'
            }`}>
            {/* Left: Express delivery badge & location dropdown */}
            <div
              onClick={() => navigate('/account/addresses')}
              className="flex flex-col cursor-pointer select-none group min-w-0"
            >
              <div className={`flex items-center gap-1 font-black text-xs tracking-tight leading-tight ${headerTextColor}`}>
                <Zap size={14} className={`shrink-0 ${iconColorClass}`} />
                <span>10 minutes</span>
              </div>
              <div className={`flex items-center gap-0.5 text-[11px] font-extrabold truncate transition-colors ${headerSubTextColor}`}>
                <span className="truncate max-w-[210px]">
                  {(() => {
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
                    return '📍 Select Location';
                  })()}
                </span>
                <ChevronDown size={12} className="shrink-0" />
              </div>
            </div>

            {/* Right: Profile Icon Button */}
            <button
              onClick={handleProfileClick}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${isDarkHeader
                  ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                  : 'border-divider bg-background text-text-primary hover:border-primary hover:text-primary'
                }`}
              title={customerUser ? `Logged in as ${customerUser.phone}` : "Customer Login"}
              aria-label={customerUser ? `Account menu — logged in as ${customerUser.phone}` : "Customer login"}
            >
              <User size={16} />
            </button>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-xl md:max-w-2xl relative hidden sm:block" ref={searchRef}>
            <form
              onSubmit={handleSearchSubmit}
              style={{
                borderColor: isDarkHeader
                  ? (campaignAccentColor || 'rgba(255,255,255,0.4)')
                  : '#CBD5E1'
              }}
              className="flex items-center w-full px-4 py-2 bg-white/95 rounded-full transition-all border focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
            >
              <Search size={17} className="text-text-tertiary mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder={currentPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
                className="w-full text-xs sm:text-sm font-normal bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </form>

            {/* Real-time search results */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-divider rounded-2xl shadow-premium overflow-hidden max-h-[380px] overflow-y-auto z-[1002] flex flex-col"
                >
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border-b border-divider cursor-pointer hover:bg-background transition-colors last:border-b-0"
                      onClick={() => handleSearchResultClick(product.id)}
                    >
                      <img src={getProductImage(product)} alt={product.name} className="w-10 h-10 object-contain rounded-md border border-divider bg-white p-1" />
                      <div className="flex-1 flex flex-col">
                        <span className="text-sm font-bold text-text-primary">{product.name}</span>
                        <span className="text-xs text-text-secondary">{product.brand}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-primary">₹{product.price}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-3 sm:gap-4 font-medium text-[14px] text-text-primary shrink-0">
            {/* My Cart Button (Disabled when items = 0, Enabled when > 0) */}
            <button
              disabled={totalItems === 0}
              onClick={() => totalItems > 0 && setIsCartOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 shadow-2xs ${totalItems > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer ring-2 ring-emerald-500/30'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                }`}
              title={totalItems > 0 ? `View My Cart (${totalItems} items)` : 'My Cart is empty'}
            >
              <ShoppingCart size={17} className="shrink-0" />
              <span>My Cart</span>
              {totalItems > 0 && (
                <span className="bg-white text-emerald-700 font-black text-[11px] px-2 py-0.5 rounded-full shadow-2xs">
                  {totalItems}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={handleProfileClick}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${isDarkHeader
                    ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                    : 'border-divider bg-background text-text-primary hover:border-primary hover:text-primary'
                  }`}
                title={customerUser ? `Logged in as ${customerUser.phone}` : "Customer Login"}
                aria-label={customerUser ? `Account menu — logged in as ${customerUser.phone}` : "Customer login"}
              >
                <User size={18} />
              </button>

              {/* Customer Profile Dropdown */}
              <AnimatePresence>
                {showProfileMenu && customerUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-divider rounded-2xl shadow-premium p-3 z-[1002] flex flex-col gap-1 text-xs"
                  >
                    <div className="px-3 py-2 border-b border-divider flex flex-col">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Logged In Customer</span>
                      <span className="text-xs font-extrabold text-text-primary truncate mt-0.5">{customerUser.phone}</span>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/admin');
                      }}
                      className="flex items-center gap-2 px-3 py-2 font-bold text-text-primary hover:bg-background rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Shield size={14} className="text-primary shrink-0" />
                      <span>Admin Control Console</span>
                    </button>

                    <button
                      onClick={handleCustomerLogout}
                      className="flex items-center gap-2 px-3 py-2 font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={14} className="shrink-0" />
                      <span>Log Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Mobile Search bar row (Hidden on Products / Subcategory Page on Mobile).
            Also collapses on scroll-down so only the category strip stays pinned. */}
        {!isProductListingPage && (
          <div
            className={`sm:hidden w-full px-3 relative transition-all duration-300 ease-in-out border-none outline-none overflow-hidden ${headerHidden ? 'max-h-0 opacity-0 py-0 pointer-events-none' : 'max-h-20 opacity-100 py-1.5'}`}
            style={{ backgroundColor: dynamicHeaderBg }}
            ref={searchRef}
          >
            <form
              onSubmit={handleSearchSubmit}
              style={{
                borderColor: isDarkHeader
                  ? (campaignAccentColor || 'rgba(255,255,255,0.4)')
                  : '#CBD5E1'
              }}
              className="flex items-center w-full px-3.5 py-1.5 bg-white rounded-full shadow-2xs border"
            >
              <Search size={15} className="text-text-tertiary mr-2 shrink-0" />
              <input
                type="text"
                placeholder={currentPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
                className="w-full text-xs bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary font-medium"
              />
            </form>

            {/* Mobile Real-time search results */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-[calc(100%+4px)] left-3 right-3 bg-white border border-divider rounded-2xl shadow-premium overflow-hidden max-h-[300px] overflow-y-auto z-[1002] flex flex-col"
                >
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2.5 p-2.5 border-b border-divider cursor-pointer hover:bg-background transition-colors last:border-b-0"
                      onClick={() => handleSearchResultClick(product.id)}
                    >
                      <img src={getProductImage(product)} alt={product.name} className="w-8 h-8 object-contain rounded-md border border-divider bg-white p-0.5" />
                      <div className="flex-1 flex flex-col">
                        <span className="text-xs font-bold text-text-primary line-clamp-1">{product.name}</span>
                        <span className="text-[10px] text-text-secondary">{product.brand}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-primary">₹{product.price}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Location Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectLocation={(loc: any) => updateUserLocation(loc)}
      />

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[1004]"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] bg-surface z-[1005] shadow-premium p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-2xl font-extrabold text-primary font-display">
                  <Leaf className="text-primary" fill="currentColor" size={24} />
                  <span className="text-text-primary font-extrabold">Fresh<span className="text-primary">Cart</span></span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-text-primary" aria-label="Close menu">
                  <X size={24} />
                </button>
              </div>

              {/* Mobile Search input */}
              <form onSubmit={handleSearchSubmit} className="my-2 mb-5">
                <div className="flex items-center w-full px-4 py-2 bg-background border border-divider rounded-full">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm bg-transparent border-none outline-none text-text-primary"
                  />
                  <button type="submit" className="text-text-secondary" aria-label="Search">
                    <Search size={18} />
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-4 overflow-y-auto">
                <Link to="/" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link to="/products" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Browse Catalog</Link>
                <Link to="/offers" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Offers & Sales</Link>
                <Link to="/blog" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Recipes & Blog</Link>
                <Link to="/about" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
                <Link to="/help" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Help Center</Link>
                <Link to="/locations" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Delivery Locations</Link>
                <Link to="/stores" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Store Finder</Link>
                <Link to="/careers" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Careers</Link>
                <Link to="/admin" className="text-base font-semibold text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2 font-bold" onClick={() => setMobileMenuOpen(false)}>Admin CMS Panel</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customer Auth Drawer Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCustomerUser(user);
          setIsCustomerAuthOpen(false);
          setIsCustomerProfileOpen(true);
        }}
      />

      {/* Customer Profile Drawer (Logged In View) */}
      <CustomerProfileDrawer
        isOpen={isCustomerProfileOpen}
        onClose={() => setIsCustomerProfileOpen(false)}
        customerUser={customerUser}
        onLogout={handleCustomerLogout}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
      />
    </>
  );
};
