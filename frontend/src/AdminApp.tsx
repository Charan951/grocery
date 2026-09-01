import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/admin/Login';
import { AdminLayout } from './components/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Orders } from './pages/admin/Orders';
import { Products as AdminProducts } from './pages/admin/Products';
import { AdminCMS } from './pages/AdminCMS';
import { PartnerDetail } from './pages/admin/PartnerDetail';
import {
  CategoriesModule, SubCategoriesModule, InventoryModule, CustomersModule,
  DeliveryModule, EmployeesModule, CouponsModule, FinanceModule,
  AnalyticsModule, ReviewsModule, SupportModule, AuditLogsModule, SettingsModule
} from './pages/admin/Modules';

interface AdminAppProps {
  adminUser: any;
  onLoginSuccess: (user: any) => void;
  onLogout: () => void;
}

/**
 * The entire /admin/* tree, code-split from the storefront bundle — it's
 * lazy-loaded from App.tsx since a storefront shopper never touches it.
 * Routing/logic is unchanged, just relocated out of App.tsx.
 */
const AdminApp: React.FC<AdminAppProps> = ({ adminUser, onLoginSuccess, onLogout }) => {
  if (!adminUser) {
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <Routes>
      <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminLayout onLogout={onLogout}><Dashboard /></AdminLayout>} />
      <Route path="/admin/orders" element={<AdminLayout onLogout={onLogout}><Orders /></AdminLayout>} />
      <Route path="/admin/products" element={<AdminLayout onLogout={onLogout}><AdminProducts /></AdminLayout>} />
      <Route path="/admin/categories" element={<AdminLayout onLogout={onLogout}><CategoriesModule /></AdminLayout>} />
      <Route path="/admin/subcategories" element={<AdminLayout onLogout={onLogout}><SubCategoriesModule /></AdminLayout>} />
      <Route path="/admin/inventory" element={<AdminLayout onLogout={onLogout}><InventoryModule /></AdminLayout>} />
      <Route path="/admin/customers" element={<AdminLayout onLogout={onLogout}><CustomersModule /></AdminLayout>} />
      <Route path="/admin/delivery" element={<AdminLayout onLogout={onLogout}><DeliveryModule /></AdminLayout>} />
      <Route path="/admin/delivery/:userId" element={<AdminLayout onLogout={onLogout}><PartnerDetail /></AdminLayout>} />
      <Route path="/admin/employees" element={<AdminLayout onLogout={onLogout}><EmployeesModule /></AdminLayout>} />
      <Route path="/admin/coupons" element={<AdminLayout onLogout={onLogout}><CouponsModule /></AdminLayout>} />
      <Route path="/admin/cms" element={<AdminLayout onLogout={onLogout}><AdminCMS /></AdminLayout>} />
      <Route path="/admin/finance" element={<AdminLayout onLogout={onLogout}><FinanceModule /></AdminLayout>} />
      <Route path="/admin/analytics" element={<AdminLayout onLogout={onLogout}><AnalyticsModule /></AdminLayout>} />
      <Route path="/admin/reviews" element={<AdminLayout onLogout={onLogout}><ReviewsModule /></AdminLayout>} />
      <Route path="/admin/support" element={<AdminLayout onLogout={onLogout}><SupportModule /></AdminLayout>} />
      <Route path="/admin/notifications" element={<AdminLayout onLogout={onLogout}><SupportModule /></AdminLayout>} />
      <Route path="/admin/settings" element={<AdminLayout onLogout={onLogout}><SettingsModule /></AdminLayout>} />
      <Route path="/admin/audit-logs" element={<AdminLayout onLogout={onLogout}><AuditLogsModule /></AdminLayout>} />
    </Routes>
  );
};

export default AdminApp;
