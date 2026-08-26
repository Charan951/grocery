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
  ChevronDown, Leaf, Settings, Percent, User, Zap, LogOut, Shield, LayoutGrid
} from 'lucide-react';

interface HeaderProps {
  onWishlistOpen: () => void;
  onCartOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onWishlistOpen }) => {
  const { wishlist } = useCartWishlist();
  const { categories, products, coupons, banners, userLocation, updateUserLocation, activeHeroBannerIndex } = useCMS();
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
    () => categories.find(cat => location.search.includes(`category=${cat.slug || cat.id}`)),
    [categories, location.search]
  );
  const isHomeActive = location.pathname === '/' && !activeCategory;

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
  const ticking = useRef(false);

  // Scroll direction listener for smooth mobile AppBar hide/show behavior (Desktop remains 100% static & fixed)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolledDown(currentScrollY > 40);

      // On desktop, header never hides or moves
      if (!isMobile) {
        setHeaderHidden(false);
        return;
      }

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const diff = currentScrollY - lastScrollY.current;

          if (currentScrollY <= 15) {
            setHeaderHidden(false);
          } else if (diff > 8 && currentScrollY > 50) {
            setHeaderHidden(true);
          } else if (diff < -8) {
            setHeaderHidden(false);
          }
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Measure header height for page padding
  useEffect(() => {
    const el = appBarRef.current;
    if (!el) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty('--sticky-header-h', `${el.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--sticky-header-h');
    };
  }, []);

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

  // Active campaign banners list for Home Page
  const validHomeBanners = useMemo(() => {
    if (!isHomePage) return [];
    const now = new Date();
    return banners.filter(b => {
      if (b.active === false) return false;
      const isDisplayValid = !b.displayOn || b.displayOn === 'HOME' || b.displayOn === 'ALL';
      if (!isDisplayValid) return false;
      if (b.startDate && now < new Date(b.startDate)) return false;
      if (b.endDate && now > new Date(b.endDate)) return false;
      return true;
    });
  }, [banners, isHomePage]);

  // Dynamic active hero banner based on activeHeroBannerIndex from BannerCarousel
  const activeCampaignBanner = useMemo(() => {
    if (validHomeBanners.length === 0) return null;
    const idx = (activeHeroBannerIndex || 0) % validHomeBanners.length;
    return validHomeBanners[idx] || validHomeBanners[0];
  }, [validHomeBanners, activeHeroBannerIndex]);

  const campaignBgColor = isHomePage ? (activeCampaignBanner?.themeBgColor || activeCampaignBanner?.gradient?.[0]) : null;
  const campaignTextColor = isHomePage ? activeCampaignBanner?.themeTextColor : null;
  const campaignAccentColor = isHomePage ? (activeCampaignBanner?.themeAccentColor || '#F6C453') : '#10B981';

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
    // Dynamic banner color matching ONLY applies on mobile home page
    if (isMobile && isHomePage && campaignBgColor) {
      return campaignBgColor;
    }
    if (activeCategory && activeCategory.color) {
      return hexToTintOnWhite(activeCategory.color, 0.14);
    }
    return '#ffffff';
  }, [isScrolledDown, isMobile, isHomePage, campaignBgColor, activeCategory]);

  const isDarkHeader = useMemo(() => {
    if (isScrolledDown) return false;
    if (!isHomePage || !isMobile) return false;
    if (campaignTextColor) {
      return !getIsDarkColor(campaignTextColor);
    }
    return getIsDarkColor(dynamicHeaderBg);
  }, [isScrolledDown, isHomePage, isMobile, dynamicHeaderBg, campaignTextColor]);

  const headerTextColor = isDarkHeader ? 'text-white' : 'text-text-primary';
  const headerSubTextColor = isDarkHeader ? 'text-white/90 hover:text-white' : 'text-text-secondary hover:text-primary';
  const iconColorClass = isDarkHeader ? 'text-white fill-white' : 'text-text-primary fill-text-primary';

  return (
    <>
      <div
        ref={appBarRef}
        className={`fixed top-0 left-0 right-0 z-[1000] w-full transition-all duration-300 transform translate-y-0 border-none outline-none ${
          isScrolledDown ? 'shadow-sm' : 'shadow-none'
        }`}
        style={{ backgroundColor: dynamicHeaderBg }}
      >
        {/* Desktop & Mobile Header Content */}
        <header
          className={`flex items-center justify-between w-full px-3 md:px-8 transition-all duration-300 gap-2 md:gap-6 border-none outline-none ${
            headerHidden
              ? 'py-0 sm:py-2.5 max-h-0 sm:max-h-24 opacity-0 sm:opacity-100 overflow-hidden sm:overflow-visible pointer-events-none sm:pointer-events-auto'
              : 'py-2 md:py-2.5 max-h-24 opacity-100'
          }`}
          style={{ backgroundColor: dynamicHeaderBg }}
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
          <div className={`flex sm:hidden items-center justify-between w-full gap-2 transition-all duration-300 ease-in-out overflow-hidden ${
            headerHidden ? 'max-h-0 opacity-0 py-0 pointer-events-none' : 'max-h-16 opacity-100 py-0.5'
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
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isDarkHeader
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
          <div className="hidden sm:flex items-center gap-3 sm:gap-5 font-medium text-[14px] text-text-primary shrink-0">
            <div className="relative">
              <button
                onClick={handleProfileClick}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                  isDarkHeader
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

        {/* Mobile Search bar row */}
        <div className="sm:hidden w-full px-3 py-1.5 relative transition-colors duration-300 border-none outline-none" style={{ backgroundColor: dynamicHeaderBg }} ref={searchRef}>
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

        {/* Compact Horizontal Category Navigation Bar */}
        <nav
          className="px-2 md:px-8 py-1 md:py-2 overflow-x-auto scrollbar-none transition-colors duration-300 border-none outline-none ring-0 shadow-none"
          style={{ backgroundColor: dynamicHeaderBg }}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-max pb-0.5">
            {/* All Link */}
            <Link
              to="/"
              style={location.pathname === '/' && !location.search.includes('category=') ? {
                backgroundColor: isDarkHeader ? 'rgba(255, 255, 255, 0.18)' : hexToTintOnWhite('#10B981', 0.16),
              } : undefined}
              className={`flex flex-col items-center justify-between p-1 sm:p-1.5 md:p-2 rounded-xl sm:rounded-2xl transition-all shrink-0 w-[60px] sm:w-20 md:w-24 h-[72px] sm:h-[94px] md:h-[104px] border-0 shadow-none ${
                location.pathname === '/' && !location.search.includes('category=')
                  ? ''
                  : (isDarkHeader ? 'bg-transparent hover:bg-white/10' : 'bg-transparent hover:bg-black/5')
              }`}
            >
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
                location.pathname === '/' && !location.search.includes('category=')
                  ? (isDarkHeader ? 'bg-white text-emerald-700 shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs')
                  : (isDarkHeader ? 'bg-white/20 text-white' : 'bg-background text-text-secondary border border-divider/40')
              }`}>
                <LayoutGrid size={18} className="sm:hidden" />
                <LayoutGrid size={22} className="hidden sm:block" />
              </div>
              <div className="h-[2.2em] flex items-center justify-center text-center w-full px-0.5">
                <span
                  style={location.pathname === '/' && !location.search.includes('category=') ? {
                    color: isDarkHeader ? '#ffffff' : hexToDarkShade('#10B981', 0.4)
                  } : undefined}
                  className={`text-[10px] sm:text-xs text-center leading-tight line-clamp-2 ${
                    location.pathname === '/' && !location.search.includes('category=')
                      ? 'font-black'
                      : (isDarkHeader ? 'text-white/90 font-semibold' : 'text-text-primary font-semibold')
                  }`}
                >
                  All
                </span>
              </div>
              {location.pathname === '/' && !location.search.includes('category=') ? (
                <div
                  className="w-full h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: isDarkHeader ? (campaignAccentColor || '#ffffff') : '#10B981' }}
                />
              ) : (
                <div className="w-full h-1 bg-transparent rounded-full mt-0.5" />
              )}
            </Link>

            {/* Categories Links */}
            {categories.map((cat) => {
              const catSlug = cat.slug || cat.id;
              const isActive = location.search.includes(`category=${catSlug}`);
              const label = cat.displayName?.trim() || cat.name;
              const catColor = cat.color || '#4CAF50';

              const activeBg = isDarkHeader ? 'rgba(255, 255, 255, 0.18)' : hexToTintOnWhite(catColor, 0.16);
              const activeTextColor = isDarkHeader ? '#ffffff' : hexToDarkShade(catColor, 0.4);

              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${catSlug}`}
                  style={isActive ? {
                    backgroundColor: activeBg,
                  } : undefined}
                  className={`flex flex-col items-center justify-between p-1 sm:p-1.5 md:p-2 rounded-xl sm:rounded-2xl transition-all shrink-0 w-[60px] sm:w-20 md:w-24 h-[72px] sm:h-[94px] md:h-[104px] border-0 shadow-none ${
                    isActive
                      ? ''
                      : (isDarkHeader ? 'bg-transparent hover:bg-white/10' : 'bg-transparent hover:bg-black/5')
                  }`}
                >
                  <div
                    style={{
                      backgroundColor: isActive 
                        ? (isDarkHeader ? 'rgba(255, 255, 255, 0.25)' : hexToTintOnWhite(catColor, 0.18))
                        : (isDarkHeader ? 'rgba(255, 255, 255, 0.15)' : hexToTintOnWhite(catColor, 0.08))
                    }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border-0 shrink-0 transition-colors"
                  >
                    <img src={getCategoryImage(cat)} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <div className="h-[2.2em] flex items-center justify-center text-center w-full px-0.5">
                    <span
                      style={isActive ? { color: activeTextColor } : undefined}
                      className={`text-[10px] sm:text-xs text-center leading-tight line-clamp-2 ${
                        isActive ? 'font-black' : (isDarkHeader ? 'text-white/90 font-semibold' : 'text-text-primary font-semibold')
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {isActive ? (
                    <div
                      style={{ backgroundColor: isDarkHeader ? (campaignAccentColor || '#ffffff') : catColor }}
                      className="w-full h-1 rounded-full mt-0.5"
                    />
                  ) : (
                    <div className="w-full h-1 bg-transparent rounded-full mt-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
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
