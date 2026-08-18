import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { CMSProvider } from './context/CMSContext';
import { CartWishlistProvider } from './context/CartWishlistContext';

// Pages
import { Home } from './pages/Home';
import { About } from './pages/About';
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
import { CustomerProfile } from './pages/CustomerProfile';
import { CustomerSupport } from './pages/CustomerSupport';
import { CustomerAddresses } from './pages/CustomerAddresses';

// Admin Components
import { Login } from './pages/admin/Login';
import { AdminLayout } from './components/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { Products as AdminProducts } from './pages/admin/Products';
import { AdminCMS } from './pages/AdminCMS';
import { 
  CategoriesModule, SubCategoriesModule, InventoryModule, CustomersModule, 
  DeliveryModule, EmployeesModule, CouponsModule, FinanceModule, 
  AnalyticsModule, ReviewsModule, SupportModule, AuditLogsModule, SettingsModule 
} from './pages/admin/Modules';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { FloatingCartBar } from './components/FloatingCartBar';

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
    if (!adminUser) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }
    return (
      <>
        <ScrollToTop />
        <Routes>
          <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLayout onLogout={handleLogout}><Dashboard /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout onLogout={handleLogout}><Orders /></AdminLayout>} />
          <Route path="/admin/products" element={<AdminLayout onLogout={handleLogout}><AdminProducts /></AdminLayout>} />
          <Route path="/admin/categories" element={<AdminLayout onLogout={handleLogout}><CategoriesModule /></AdminLayout>} />
          <Route path="/admin/subcategories" element={<AdminLayout onLogout={handleLogout}><SubCategoriesModule /></AdminLayout>} />
          <Route path="/admin/inventory" element={<AdminLayout onLogout={handleLogout}><InventoryModule /></AdminLayout>} />
          <Route path="/admin/customers" element={<AdminLayout onLogout={handleLogout}><CustomersModule /></AdminLayout>} />
          <Route path="/admin/delivery" element={<AdminLayout onLogout={handleLogout}><DeliveryModule /></AdminLayout>} />
          <Route path="/admin/employees" element={<AdminLayout onLogout={handleLogout}><EmployeesModule /></AdminLayout>} />
          <Route path="/admin/coupons" element={<AdminLayout onLogout={handleLogout}><CouponsModule /></AdminLayout>} />
          <Route path="/admin/cms" element={<AdminLayout onLogout={handleLogout}><AdminCMS /></AdminLayout>} />
          <Route path="/admin/finance" element={<AdminLayout onLogout={handleLogout}><FinanceModule /></AdminLayout>} />
          <Route path="/admin/analytics" element={<AdminLayout onLogout={handleLogout}><AnalyticsModule /></AdminLayout>} />
          <Route path="/admin/reviews" element={<AdminLayout onLogout={handleLogout}><ReviewsModule /></AdminLayout>} />
          <Route path="/admin/support" element={<AdminLayout onLogout={handleLogout}><SupportModule /></AdminLayout>} />
          <Route path="/admin/notifications" element={<AdminLayout onLogout={handleLogout}><SupportModule /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout onLogout={handleLogout}><SettingsModule /></AdminLayout>} />
          <Route path="/admin/audit-logs" element={<AdminLayout onLogout={handleLogout}><AuditLogsModule /></AdminLayout>} />
        </Routes>
      </>
    );
  }


  const isStandalonePage =
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

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      
      {/* Header Layout (Hidden on standalone pages) */}
      {!isStandalonePage && (
        <Header 
          onWishlistOpen={() => setWishlistOpen(true)} 
          onCartOpen={() => setCartOpen(true)} 
        />
      )}

      {/* Main Pages */}
      <main
        className="flex-grow"
        style={!isStandalonePage ? { paddingTop: 'var(--sticky-header-h, 320px)' } : undefined}
      >
        <Routes>
          <Route path="/" element={<Home onQuickView={setQuickViewProduct} />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<ShopProducts onQuickView={setQuickViewProduct} onListViewChange={setProductsListView} />} />
          <Route path="/product/:id" element={<ProductDetails onQuickView={setQuickViewProduct} />} />
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

