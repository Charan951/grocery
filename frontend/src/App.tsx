import React, { useState, useEffect, Suspense, lazy } from 'react';
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

// Admin bundle (code-split — a storefront shopper never loads this)
const AdminApp = lazy(() => import('./AdminApp'));

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { FloatingCartBar } from './components/FloatingCartBar';
import { BottomNav } from './components/BottomNav';

// Scroll To Top on page navigation
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
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
    navigate('/admin');
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    document.documentElement.classList.toggle('no-scrollbar', isAdminRoute);
    return () => document.documentElement.classList.remove('no-scrollbar');
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0F2A1B] text-white/70 text-sm font-semibold">Loading console…</div>}>
          <AdminApp adminUser={adminUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} />
        </Suspense>
      </>
    );
  }


  const isStandalonePage =
    location.pathname.startsWith('/categories') ||
    location.pathname.startsWith('/product/') ||
    location.pathname.startsWith('/prn/') ||
    (location.pathname.startsWith('/products') && productsListView) ||
    location.pathname.startsWith('/s/') ||
    location.pathname.startsWith('/terms-of-service') ||
    location.pathname.startsWith('/privacy-policy') || 
    location.pathname === '/legal' ||
    location.pathname.startsWith('/orders') ||
    location.pathname.startsWith('/account/orders') ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/account/profile') ||
    location.pathname.startsWith('/support') ||
    location.pathname.startsWith('/account/support') ||
    location.pathname.startsWith('/customer-support') ||
    location.pathname.startsWith('/locations') ||
    location.pathname.startsWith('/saved-addresses') ||
    location.pathname.startsWith('/account/addresses');

  const isBottomNavHidden =
    location.pathname.startsWith('/product/') ||
    location.pathname.startsWith('/prn/') ||
    location.pathname.startsWith('/products');

  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPDP = location.pathname.startsWith('/product/') || location.pathname.startsWith('/prn/');
  const isCategoriesPage = location.pathname === '/categories' || location.pathname.startsWith('/categories/');
  const { activeFestivalCampaign } = useCMS();
  const isFestivalMobileHome = isMobile && location.pathname === '/' && !!activeFestivalCampaign && activeFestivalCampaign.isActive !== false;

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
        style={{
          paddingTop: isMobile && (isPDP || isCategoriesPage || isFestivalMobileHome) ? 0 : 'var(--sticky-header-h, 140px)',
          transition: 'padding-top 200ms ease',
        }}
      >
        <Routes>
          <Route path="/" element={<Home onQuickView={setQuickViewProduct} />} />
          <Route path="/about" element={<About />} />
          <Route path="/categories" element={<Categories />} />
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

