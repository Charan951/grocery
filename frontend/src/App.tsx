import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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

// Admin Components
import { Login } from './pages/admin/Login';
import { AdminLayout } from './components/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { Products as AdminProducts } from './pages/admin/Products';
import { 
  CategoriesModule, BrandsModule, InventoryModule, WarehousesModule, CustomersModule, 
  DeliveryModule, EmployeesModule, CouponsModule, CMSModule, FinanceModule, 
  ReportsModule, AnalyticsModule, ReviewsModule, SupportModule, AuditLogsModule, SettingsModule 
} from './pages/admin/Modules';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';

// Scroll To Top on page navigation
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
};

const AppContent: React.FC = () => {
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);

  // Admin Session State
  const [adminUser, setAdminUser] = useState<any>(() => {
    const cached = localStorage.getItem('admin_user');
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (user: any) => {
    setAdminUser(user);
    localStorage.setItem('admin_token', user.token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    if (!adminUser) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }
    return (
      <>
        <ScrollToTop />
        <Routes>
          <Route path="/admin" element={<AdminLayout onLogout={handleLogout}><Dashboard /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout onLogout={handleLogout}><Orders /></AdminLayout>} />
          <Route path="/admin/products" element={<AdminLayout onLogout={handleLogout}><AdminProducts /></AdminLayout>} />
          <Route path="/admin/categories" element={<AdminLayout onLogout={handleLogout}><CategoriesModule /></AdminLayout>} />
          <Route path="/admin/brands" element={<AdminLayout onLogout={handleLogout}><BrandsModule /></AdminLayout>} />
          <Route path="/admin/inventory" element={<AdminLayout onLogout={handleLogout}><InventoryModule /></AdminLayout>} />
          <Route path="/admin/warehouses" element={<AdminLayout onLogout={handleLogout}><WarehousesModule /></AdminLayout>} />
          <Route path="/admin/customers" element={<AdminLayout onLogout={handleLogout}><CustomersModule /></AdminLayout>} />
          <Route path="/admin/delivery" element={<AdminLayout onLogout={handleLogout}><DeliveryModule /></AdminLayout>} />
          <Route path="/admin/employees" element={<AdminLayout onLogout={handleLogout}><EmployeesModule /></AdminLayout>} />
          <Route path="/admin/coupons" element={<AdminLayout onLogout={handleLogout}><CouponsModule /></AdminLayout>} />
          <Route path="/admin/offers" element={<AdminLayout onLogout={handleLogout}><CouponsModule /></AdminLayout>} />
          <Route path="/admin/marketing" element={<AdminLayout onLogout={handleLogout}><CouponsModule /></AdminLayout>} />
          <Route path="/admin/cms" element={<AdminLayout onLogout={handleLogout}><CMSModule /></AdminLayout>} />
          <Route path="/admin/finance" element={<AdminLayout onLogout={handleLogout}><FinanceModule /></AdminLayout>} />
          <Route path="/admin/reports" element={<AdminLayout onLogout={handleLogout}><ReportsModule /></AdminLayout>} />
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


  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      
      {/* Header Layout */}
      <Header 
        onWishlistOpen={() => setWishlistOpen(true)} 
        onCartOpen={() => setCartOpen(true)} 
      />

      {/* Main Pages */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home onQuickView={setQuickViewProduct} />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<ShopProducts onQuickView={setQuickViewProduct} />} />
          <Route path="/product/:id" element={<ProductDetails onQuickView={setQuickViewProduct} />} />
          <Route path="/brands" element={<Brands onQuickView={setQuickViewProduct} />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetails />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/legal" element={<Legal />} />
        </Routes>
      </main>

      {/* Footer Layout */}
      <Footer />

      {/* Overlays Drawers & Modals */}
      <WishlistDrawer 
        isOpen={wishlistOpen} 
        onClose={() => setWishlistOpen(false)} 
      />
      <CartDrawer 
        isOpen={cartOpen} 
        onClose={() => setCartOpen(false)} 
      />
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

