import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CMSProvider, useCMS } from './context/CMSContext';
import { CartWishlistProvider } from './context/CartWishlistContext';

// Pages
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Categories } from './pages/Categories';
import { Products as ShopProducts } from './pages/Products';
import { ProductDetails } from './pages/ProductDetails';
import { Brands } from './pages/Brands';
import { Offers } from './pages/Offers';
import { Blog } from './pages/Blog';
import { BlogDetails } from './pages/BlogDetails';
import { HelpCenter } from './pages/HelpCenter';
import { Careers } from './pages/Careers';
import { Locations } from './pages/Locations';
import { Stores } from './pages/Stores';
import { Legal } from './pages/Legal';
import { CustomerOrders } from './pages/CustomerOrders';
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
import { CustomerProfile } from './pages/CustomerProfile';
import { CustomerSupport } from './pages/CustomerSupport';
import { CustomerAddresses } from './pages/CustomerAddresses';
import { Search } from './pages/Search';

// Admin bundle (code-split — a storefront shopper never loads this)
const AdminApp = lazy(() => import('./AdminApp'));
// Delivery-partner bundle (code-split — only a role:'Delivery' staff user loads it)
const PartnerApp = lazy(() => import('./PartnerApp'));

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { FloatingCartBar } from './components/FloatingCartBar';
import { BottomNav } from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';

// Scroll To Top on page navigation.
// Switching the Home super-category tab only mutates the `?superCategory=`
// query on the same `/` route — that should feel like an in-place tab swap,
// not a fresh page load, so we skip the hard scroll reset in that case.
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  const prev = useRef({ pathname, search });
  useEffect(() => {
    const last = prev.current;
    prev.current = { pathname, search };

    if (last.pathname === pathname && pathname === '/') {
      const strip = (s: string) => {
        const p = new URLSearchParams(s);
        p.delete('superCategory');
        return p.toString();
      };
      // Only the super-category tab changed — keep the scroll position.
      if (strip(last.search) === strip(search)) return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  // True while the Products page is showing its sidebar + product-list view
  // (a subcategory, or "All" within a category) rather than the category
  // landing page — the app bar / category nav hide for that view.
  const [productsListView, setProductsListView] = useState(false);

  // Admin Session State
  const [adminUser, setAdminUser] = useState<any>(() => {
    const cached = localStorage.getItem('admin_user');
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (user: any) => {
    setAdminUser(user);
    localStorage.setItem('admin_token', user.token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    navigate(user?.role === 'Delivery' ? '/partner/dashboard' : '/admin');
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPartnerRoute = location.pathname.startsWith('/partner');
  const isConsoleRoute = isAdminRoute || isPartnerRoute;
  const isDeliveryUser = adminUser?.role === 'Delivery';

  useEffect(() => {
    document.documentElement.classList.toggle('no-scrollbar', isConsoleRoute);
    return () => document.documentElement.classList.remove('no-scrollbar');
  }, [isConsoleRoute]);

  if (isConsoleRoute) {
    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0F2A1B] text-white/70 text-sm font-semibold">Loading console…</div>}>
          {!adminUser ? (
            <AdminApp adminUser={adminUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />
          ) : isDeliveryUser ? (
            isAdminRoute
              ? <Navigate to="/partner/dashboard" replace />
              : <PartnerApp onLogout={handleLogout} />
          ) : (
            isPartnerRoute
              ? <Navigate to="/admin" replace />
              : <AdminApp adminUser={adminUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />
          )}
        </Suspense>
      </>
    );
  }


  const isMainTabRoute =
    location.pathname === '/' ||
    location.pathname === '/categories' ||
    location.pathname === '/search' ||
    location.pathname === '/orders' ||
    location.pathname === '/account/orders' ||
    location.pathname === '/profile' ||
    location.pathname === '/account' ||
    location.pathname === '/account/profile';

  const isStandalonePage = !isMainTabRoute;
  const isBottomNavHidden = !isMainTabRoute;

  const isMobile = useIsMobile(640);

  const isPDP = location.pathname.startsWith('/product/') || location.pathname.startsWith('/prn/');
  const isProductsListingPage = location.pathname === '/products' || location.pathname.startsWith('/products/');
  const isCategoriesPage = location.pathname === '/categories' || location.pathname.startsWith('/categories/');
  const isSearchPage = location.pathname === '/search' || location.pathname.startsWith('/search');
  const isProfilePage = location.pathname === '/profile' || location.pathname.startsWith('/account/profile');
  const isOrdersPage = location.pathname === '/orders' || location.pathname.startsWith('/orders/') || location.pathname.startsWith('/account/orders');
  const isAddressesPage =
    location.pathname.startsWith('/locations') ||
    location.pathname.startsWith('/saved-addresses') ||
    location.pathname.startsWith('/account/addresses');
  const { festivalCampaigns, activeFestivalCampaign } = useCMS();
  const isFestivalMobileHome = useMemo(() => {
    if (!isMobile || location.pathname !== '/') return false;
    const activeList = (festivalCampaigns || []).filter((c) => c.isActive && c.status !== 'draft');
    if (activeList.length === 0 && activeFestivalCampaign && activeFestivalCampaign.isActive !== false) {
      activeList.push(activeFestivalCampaign);
    }
    if (activeList.length === 0) return false;

    const searchParams = new URLSearchParams(location.search);
    const superCat = searchParams.get('superCategory') || 'all';

    return activeList.some((camp) => {
      const scopes = camp.applicableSuperCategories || ['all'];
      const isAll = superCat === 'all' || superCat === 'sc_all' || superCat === 'All';
      if (isAll) {
        return scopes.includes('all') || scopes.includes('sc_all') || scopes.includes('All') || scopes.length === 0;
      }
      return scopes.includes(superCat) || scopes.includes(`sc_${superCat}`) || (superCat.startsWith('sc_') && scopes.includes(superCat.replace('sc_', '')));
    });
  }, [isMobile, location.pathname, location.search, festivalCampaigns, activeFestivalCampaign]);

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      
      {/* Header Layout (Always rendered across all pages) */}
      <Header 
        onWishlistOpen={() => setWishlistOpen(true)} 
        onCartOpen={() => setCartOpen(true)} 
      />

      {/* Main Pages */}
      <main
        className="flex-grow"
        style={{ paddingTop: isMobile && (isPDP || isProductsListingPage || isCategoriesPage || isSearchPage || isProfilePage || isOrdersPage || isAddressesPage) ? 0 : 'var(--sticky-header-h)' }}
      >
        <Routes>
          <Route path="/" element={<Home onQuickView={setQuickViewProduct} />} />
          <Route path="/about" element={<About />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/search" element={<Search />} />
          <Route path="/category/:categorySlug" element={<ShopProducts onQuickView={setQuickViewProduct} onListViewChange={setProductsListView} />} />
          <Route path="/products" element={<ShopProducts onQuickView={setQuickViewProduct} onListViewChange={setProductsListView} />} />
          <Route path="/product/:id" element={<ProductDetails onQuickView={setQuickViewProduct} />} />
          <Route path="/prn/:slug/prid/:id" element={<ProductDetails onQuickView={setQuickViewProduct} />} />
          <Route path="/brands" element={<Brands onQuickView={setQuickViewProduct} />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetails />} />
          <Route path="/help" element={<CustomerSupport />} />
          <Route path="/support" element={<CustomerSupport />} />
          <Route path="/account/support" element={<CustomerSupport />} />
          <Route path="/customer-support" element={<CustomerSupport />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/locations" element={<CustomerAddresses />} />
          <Route path="/saved-addresses" element={<CustomerAddresses />} />
          <Route path="/account/addresses" element={<CustomerAddresses />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/orders" element={<CustomerOrders />} />
          <Route path="/account/orders" element={<CustomerOrders />} />
          <Route path="/track/:orderId" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm font-semibold">Loading tracker…</div>}><TrackOrder /></Suspense>} />
          <Route path="/profile" element={<CustomerProfile />} />
          <Route path="/account/profile" element={<CustomerProfile />} />
          <Route path="/s/terms-of-service" element={<Legal defaultTab="terms" />} />
          <Route path="/s/privacy-policy" element={<Legal defaultTab="privacy" />} />
          <Route path="/terms-of-service" element={<Legal defaultTab="terms" />} />
          <Route path="/privacy-policy" element={<Legal defaultTab="privacy" />} />
        </Routes>
      </main>

      {/* Footer Layout (Home page only) */}
      {location.pathname === '/' && <Footer />}

      {/* Bottom Tab Navigation (mobile only - hidden on product details and subcategories pages) */}
      {!isBottomNavHidden && <BottomNav />}
      {!isBottomNavHidden && <div className="sm:hidden" style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }} />}

      {/* Overlays Drawers & Modals */}
      <WishlistDrawer 
        isOpen={wishlistOpen} 
        onClose={() => setWishlistOpen(false)} 
      />
      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)} 
      />
      {!isStandalonePage && (
        <FloatingCartBar 
          onCartOpen={() => setCartOpen(true)} 
        />
      )}
      {quickViewProduct && (
        <QuickViewModal 
          product={quickViewProduct} 
          onClose={() => setQuickViewProduct(null)} 
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CMSProvider>
      <CartWishlistProvider>
        <Router>
          <AppContent />
        </Router>
      </CartWishlistProvider>
    </CMSProvider>
  );
};
export default App;

