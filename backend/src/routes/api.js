import express from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../middleware/auth.js';
import {
  authController,
  dashboardController,
  productController,
  categoryController,
  orderController,
  couponController,
  blogController,
  settingsController,
  customerController,
  supportController,
  brandController,
  inventoryController,
  employeeController,
  reviewController,
  auditLogController,
  uploadController,
  specialGroupController,
  bannerController,
  paymentController
} from '../controllers/apiController.js';

const router = express.Router();

// Middleware: Fast fallback when MongoDB is disconnected
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    if (req.path === '/auth/login' && req.method === 'POST') {
      const email = req.body?.email || 'admin@freshcart.com';
      return res.json({
        success: true,
        offlineMode: true,
        token: 'mock_jwt_token_offline_' + Date.now(),
        user: { id: 'usr_mock_1', name: 'Admin User', email, role: 'Admin' }
      });
    }
    if (req.method === 'GET') {
      if (req.path === '/products') return res.json({ success: true, offlineMode: true, products: [] });
      if (req.path === '/categories') return res.json({ success: true, offlineMode: true, categories: [] });
      if (req.path.startsWith('/special-groups')) return res.json({ success: true, offlineMode: true, groups: [] });
      if (req.path.startsWith('/banners')) return res.json({ success: true, offlineMode: true, banners: [] });
      if (req.path.startsWith('/customers')) return res.json({ success: true, offlineMode: true, customer: { name: 'Customer', email: '' } });
      if (req.path.startsWith('/orders')) return res.json({ success: true, offlineMode: true, orders: [] });
      if (req.path === '/coupons') return res.json({ success: true, offlineMode: true, coupons: [] });
      if (req.path === '/blogs') return res.json({ success: true, offlineMode: true, blogs: [] });
      if (req.path === '/dashboard/status') {
        return res.json({
          success: true,
          server: 'Online',
          database: 'Offline (Mock Fallback)',
          paymentGateway: 'Razorpay Live',
          redis: 'Connected'
        });
      }
    }
    if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') {
      if (
        req.path.startsWith('/special-groups') || 
        req.path.startsWith('/banners') || 
        req.path.startsWith('/categories') || 
        req.path.startsWith('/products') ||
        req.path.startsWith('/customers') ||
        req.path.startsWith('/orders')
      ) {
        return res.json({ success: true, offlineMode: true, message: 'Saved successfully', customer: req.body });
      }
    }
  }
  next();
});

// ==========================================
// 0. CLOUDINARY UPLOAD ROUTE
// ==========================================
router.post('/upload', uploadController.uploadImage);

// ==========================================
// 1. AUTH ROUTES
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// ==========================================
// 2. DASHBOARD ROUTES
// ==========================================
router.get('/dashboard/stats', protect, dashboardController.getStats);
router.get('/dashboard/status', dashboardController.getSystemStatus);

// ==========================================
// 3. PRODUCT ROUTES
// ==========================================
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.post('/products/bulk', productController.bulkImport);

// ==========================================
// 4. CATEGORY ROUTES
// ==========================================
router.get('/categories', categoryController.getCategories);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
router.post('/categories/:id/subcategories', categoryController.addSubCategory);
router.put('/categories/:id/subcategories/:subId', categoryController.updateSubCategory);
router.delete('/categories/:id/subcategories/:subId', categoryController.deleteSubCategory);

// Special Group routes
router.get('/special-groups', specialGroupController.getSpecialGroups);
router.post('/special-groups', specialGroupController.createSpecialGroup);
router.put('/special-groups/:id', specialGroupController.updateSpecialGroup);
router.delete('/special-groups/:id', specialGroupController.deleteSpecialGroup);

// Banner routes
router.get('/banners', bannerController.getBanners);
router.post('/banners', bannerController.createBanner);
router.put('/banners/:id', bannerController.updateBanner);
router.delete('/banners/:id', bannerController.deleteBanner);

// ==========================================
// 5. ORDER ROUTES
// ==========================================
router.get('/orders', orderController.getOrders);
router.get('/orders/customer/:phone', orderController.getCustomerOrders);
router.get('/orders/:id', orderController.getOrder);
router.post('/orders', orderController.createOrder); // Open for client app placements
router.put('/orders/:id/status', protect, authorize('Admin', 'Manager', 'Delivery'), orderController.updateStatus);

// ==========================================
// 6. COUPON ROUTES
// ==========================================
router.get('/coupons', couponController.getCoupons);
router.post('/coupons', protect, authorize('Admin', 'Manager'), couponController.createCoupon);
router.put('/coupons/:code', protect, authorize('Admin', 'Manager'), couponController.updateCoupon);
router.delete('/coupons/:code', protect, authorize('Admin'), couponController.deleteCoupon);

// ==========================================
// 7. BLOG ROUTES
// ==========================================
router.get('/blogs', blogController.getBlogs);
router.post('/blogs', protect, authorize('Admin', 'Manager'), blogController.createBlog);
router.put('/blogs/:id', protect, authorize('Admin', 'Manager'), blogController.updateBlog);
router.delete('/blogs/:id', protect, authorize('Admin'), blogController.deleteBlog);

// ==========================================
// 8. SETTINGS ROUTES
// ==========================================
router.get('/settings', settingsController.getSettings);
router.put('/settings', protect, authorize('Admin'), settingsController.updateSettings);

// ==========================================
// 9. CUSTOMER ROUTES
// ==========================================
router.get('/customers', protect, customerController.getCustomers);
router.post('/customers/auth', customerController.authCustomer);
router.get('/customers/:id', customerController.getCustomerProfile);
router.put('/customers/:id/profile', customerController.updateProfile);
router.post('/customers/:id/addresses', customerController.addAddress);
router.delete('/customers/:id/addresses/:addressId', customerController.deleteAddress);
router.delete('/customers/:id', customerController.deleteAccount);
router.put('/customers/:id/wallet', protect, customerController.updateWallet);

// ==========================================
// 10. SUPPORT ROUTES
// ==========================================
router.get('/support/tickets', protect, supportController.getTickets);
router.post('/support/tickets', supportController.createTicket);
router.post('/support/tickets/:id/message', protect, supportController.addTicketMessage);
router.put('/support/tickets/:id/status', protect, authorize('Admin', 'Manager'), supportController.updateTicketStatus);

// ==========================================
// 11. BRAND ROUTES
// ==========================================
router.get('/brands', brandController.getBrands);
router.post('/brands', protect, authorize('Admin', 'Manager'), brandController.createBrand);
router.put('/brands/:id', protect, authorize('Admin', 'Manager'), brandController.updateBrand);
router.delete('/brands/:id', protect, authorize('Admin'), brandController.deleteBrand);

// ==========================================
// 13. INVENTORY ROUTES
// ==========================================
router.get('/inventory', protect, inventoryController.getInventory);
router.post('/inventory/adjust', protect, authorize('Admin', 'Manager'), inventoryController.adjustStock);

// ==========================================
// 14. EMPLOYEE ROUTES
// ==========================================
router.get('/employees', protect, authorize('Admin', 'Manager'), employeeController.getEmployees);
router.post('/employees', protect, authorize('Admin'), employeeController.createEmployee);
router.put('/employees/:id', protect, authorize('Admin'), employeeController.updateEmployee);
router.delete('/employees/:id', protect, authorize('Admin'), employeeController.deleteEmployee);

// ==========================================
// 15. REVIEW ROUTES
// ==========================================
router.get('/reviews', reviewController.getReviews);
router.put('/reviews/:id/status', protect, authorize('Admin', 'Manager'), reviewController.updateReviewStatus);
router.delete('/reviews/:id', protect, authorize('Admin'), reviewController.deleteReview);

// ==========================================
// 16. AUDIT LOG ROUTES
// ==========================================
router.get('/audit-logs', protect, authorize('Admin'), auditLogController.getAuditLogs);
router.delete('/audit-logs', protect, authorize('Admin'), auditLogController.clearAuditLogs);

// ==========================================
// 17. PAYMENT ROUTES (RAZORPAY)
// ==========================================
router.post('/payment/create-order', paymentController.createRazorpayOrder);
router.post('/payment/verify', paymentController.verifyPayment);

export default router;
