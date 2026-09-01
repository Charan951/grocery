import express from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { protect, authorize, protectCustomer, attachCustomerOptional, protectDelivery } from '../middleware/auth.js';
import { customerAuthController } from '../controllers/authCustomerController.js';
import { deliveryController } from '../controllers/deliveryController.js';
import { adminDeliveryController } from '../controllers/adminDeliveryController.js';
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
  promoCardController,
  paymentController
} from '../controllers/apiController.js';
import { festivalCampaignController } from '../controllers/festivalCampaignController.js';

const router = express.Router();

// Middleware: Fast fallback when MongoDB is disconnected
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    // Never stub the OTP endpoints — a fake "success" with no token would break
    // real authentication. Let them fall through and fail loudly instead.
    if (req.path.startsWith('/customers/otp') || req.path.startsWith('/customers/me') || req.path.startsWith('/payment/') || req.path.startsWith('/delivery/') || req.path.startsWith('/admin/delivery')) {
      return next();
    }
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
      if (req.path.startsWith('/promo-cards')) return res.json({ success: true, offlineMode: true, promoCards: [] });
      if (req.path.startsWith('/festival-campaigns/active')) return res.json({ success: true, offlineMode: true, campaign: null });
      if (req.path.startsWith('/festival-campaigns')) return res.json({ success: true, offlineMode: true, campaigns: [] });
      if (req.path.startsWith('/customers')) return res.json({ success: true, offlineMode: true, customer: { name: 'Customer', email: '' } });
      if (req.path.startsWith('/orders')) return res.json({ success: true, offlineMode: true, orders: [] });
      if (req.path === '/app/config') {
        // Permissive default when the DB is down — never hard-block the app on a blip.
        return res.json({
          success: true,
          offlineMode: true,
          config: { minSupportedVersion: '0.0.0', latestVersion: '0.0.0', maintenance: false, maintenanceMessage: '', updateUrl: '', supportEmail: 'support@freshcart.com', supportPhone: '' },
        });
      }
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
    if (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE' || req.method === 'PATCH') {
      if (
        req.path.startsWith('/special-groups') ||
        req.path.startsWith('/banners') ||
        req.path.startsWith('/promo-cards') ||
        req.path.startsWith('/festival-campaigns') ||
        req.path.startsWith('/categories') ||
        req.path.startsWith('/products') ||
        req.path.startsWith('/customers') ||
        req.path.startsWith('/orders')
      ) {
        return res.json({ success: true, offlineMode: true, message: 'Saved successfully', campaign: req.body });
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

// Promo Card routes
router.get('/promo-cards', promoCardController.getPromoCards);
router.post('/promo-cards', promoCardController.createPromoCard);
router.put('/promo-cards/:id', promoCardController.updatePromoCard);
router.delete('/promo-cards/:id', promoCardController.deletePromoCard);

// Festival Campaign routes
router.get('/festival-campaigns/active', festivalCampaignController.getActiveCampaign);
router.get('/festival-campaigns', festivalCampaignController.getCampaigns);
router.get('/festival-campaigns/:id', festivalCampaignController.getCampaignById);
router.post('/festival-campaigns', festivalCampaignController.createCampaign);
router.put('/festival-campaigns/:id', festivalCampaignController.updateCampaign);
router.delete('/festival-campaigns/:id', festivalCampaignController.deleteCampaign);
router.patch('/festival-campaigns/:id/status', festivalCampaignController.toggleStatus);


// ==========================================
// 5. ORDER ROUTES
// ==========================================
router.get('/orders', protect, authorize('Admin', 'Manager'), orderController.getOrders); // staff only — returns all customer PII
router.get('/orders/mine', protectCustomer, orderController.getMyOrders); // signed-in customer's own orders
router.get('/orders/customer/:phone', orderController.getCustomerOrders);
router.get('/orders/:id', attachCustomerOptional, orderController.getOrder);
router.post('/orders', attachCustomerOptional, orderController.createOrder); // client app placements; uses customer token when present
router.post('/orders/:id/cancel', attachCustomerOptional, orderController.cancelOrder); // customer self-service cancel (token OR body {phone}); wallet refund if prepaid
router.post('/orders/:id/rate-partner', attachCustomerOptional, orderController.ratePartner); // customer rates the delivery partner after Delivered (token OR body {phone})
router.put('/orders/:id/status', protect, authorize('Admin', 'Manager', 'Delivery'), orderController.updateStatus);
router.post('/orders/:id/rider-location', protect, authorize('Admin', 'Manager', 'Delivery'), orderController.updateRiderLocation);

// ==========================================
// 6. COUPON ROUTES
// ==========================================
router.get('/coupons', couponController.getCoupons);
router.post('/coupons/validate', couponController.validateCoupon);
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
router.get('/app/config', settingsController.getAppConfig); // public — customer-app version gate + maintenance

// ==========================================
// 9. CUSTOMER ROUTES
// ==========================================
router.get('/customers', protect, customerController.getCustomers);

// --- Real customer authentication (OTP -> customer JWT) ---
router.post('/customers/otp/send', customerAuthController.sendOtp);
router.post('/customers/otp/verify', customerAuthController.verifyOtp);
router.get('/customers/me', protectCustomer, customerAuthController.getMe);

// Customer-scoped mutations: identity comes from the token, not the URL.
// These reuse the existing controller handlers by injecting req.params.id.
const asMe = (req, res, next) => { req.params.id = req.customer.customerId; next(); };
router.put('/customers/me/profile', protectCustomer, asMe, customerController.updateProfile);
router.post('/customers/me/addresses', protectCustomer, asMe, customerController.addAddress);
router.delete('/customers/me/addresses/:addressId', protectCustomer, asMe, customerController.deleteAddress);
router.post('/customers/me/wallet/debit', protectCustomer, customerController.walletDebit);
router.post('/customers/me/wallet/topup', protectCustomer, customerController.walletTopup);
router.post('/customers/me/wallet/topup/verify', protectCustomer, customerController.walletTopupVerify);
router.get('/customers/me/wallet/transactions', protectCustomer, customerController.walletTransactions);
router.post('/customers/me/devices', protectCustomer, customerController.registerDevice);
router.delete('/customers/me/devices/:token', protectCustomer, customerController.removeDevice);
router.delete('/customers/me', attachCustomerOptional, customerController.deleteMe); // self-service account deletion (token OR ?phone=)

// Legacy phone-keyed customer auth — still used by the web storefront (no token).
// TODO: migrate web to the OTP flow above, then lock down the :id routes below.
router.post('/customers/auth', customerController.authCustomer);
router.get('/customers/:id', customerController.getCustomerProfile);
router.put('/customers/:id/profile', customerController.updateProfile);
router.post('/customers/:id/addresses', customerController.addAddress);
router.delete('/customers/:id/addresses/:addressId', customerController.deleteAddress);
router.delete('/customers/:id', protect, authorize('Admin', 'Manager'), customerController.deleteAccount); // staff-only; customers use DELETE /customers/me
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
router.get('/products/:id/reviews', reviewController.getProductReviews); // public — approved reviews + summary
router.post('/products/:id/reviews', attachCustomerOptional, reviewController.createProductReview); // verified-purchase only (token or {phone}); enters moderation
router.get('/reviews', protect, authorize('Admin', 'Manager'), reviewController.getReviews); // staff moderation list
router.put('/reviews/bulk-status', protect, authorize('Admin', 'Manager'), reviewController.bulkUpdateReviewStatus);
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
router.post('/payment/create-order', attachCustomerOptional, paymentController.createRazorpayOrder);
router.post('/payment/verify', attachCustomerOptional, paymentController.verifyPayment);
router.post('/payment/webhook', paymentController.webhook); // raw-body parsed in app.js

// ==========================================
// 18. DELIVERY PARTNER ROUTES  (/api/delivery/*)
// Auth: protectDelivery = staff JWT + User.role 'Delivery' + status 'Active'
// ==========================================
const deliveryAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const locationLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/delivery/auth/forgot', deliveryAuthLimiter, deliveryController.forgotPassword);
router.post('/delivery/auth/reset', deliveryAuthLimiter, deliveryController.resetPassword);

router.get('/delivery/me', protectDelivery, deliveryController.getMe);
router.post('/delivery/devices', protectDelivery, deliveryController.registerDevice);
router.delete('/delivery/devices/:token', protectDelivery, deliveryController.removeDevice);
router.get('/delivery/notifications', protectDelivery, deliveryController.listNotifications);
router.post('/delivery/notifications/read', protectDelivery, deliveryController.markNotificationsRead);
router.put('/delivery/status', protectDelivery, deliveryController.setStatus);
router.post('/delivery/location', locationLimiter, protectDelivery, deliveryController.updateLocation);
router.get('/delivery/orders/active', protectDelivery, deliveryController.getActiveOrders);
router.post('/delivery/assignments/:id/accept', protectDelivery, deliveryController.acceptAssignment);
router.post('/delivery/assignments/:id/reject', protectDelivery, deliveryController.rejectAssignment);
router.get('/delivery/orders/:id', protectDelivery, deliveryController.getOrder);
router.post('/delivery/orders/:id/pickup-arrived', protectDelivery, deliveryController.pickupArrived);
router.post('/delivery/orders/:id/picked-up', protectDelivery, deliveryController.pickedUp);
router.post('/delivery/orders/:id/arrived', protectDelivery, deliveryController.arrived);
router.post('/delivery/orders/:id/complete', protectDelivery, deliveryController.completeDelivery);
router.post('/delivery/orders/:id/fail', protectDelivery, deliveryController.failDelivery);

// ==========================================
// 19. ADMIN DELIVERY / DISPATCH  (/api/admin/delivery/*, /api/admin/orders/:id/*)
// ==========================================
router.get('/admin/delivery/partners', protect, authorize('Admin', 'Manager'), adminDeliveryController.listPartners);
router.get('/admin/delivery/fleet', protect, authorize('Admin', 'Manager'), adminDeliveryController.fleet);
router.get('/admin/delivery/analytics', protect, authorize('Admin', 'Manager'), adminDeliveryController.fleetAnalytics);
router.get('/admin/delivery/partners/:userId/deliveries', protect, authorize('Admin', 'Manager'), adminDeliveryController.partnerDeliveries);
router.get('/admin/delivery/partners/:userId/performance', protect, authorize('Admin', 'Manager'), adminDeliveryController.partnerPerformance);
router.post('/admin/delivery/partners/:userId/reset-password', protect, authorize('Admin'), adminDeliveryController.resetPartnerPassword);
router.post('/admin/delivery/partners/:userId/account', protect, authorize('Admin'), adminDeliveryController.setPartnerAccount);
router.post('/admin/orders/:id/assign', protect, authorize('Admin', 'Manager'), adminDeliveryController.assignOrder);
router.post('/admin/orders/:id/reassign', protect, authorize('Admin', 'Manager'), adminDeliveryController.reassignOrder);
router.post('/admin/orders/:id/unassign', protect, authorize('Admin', 'Manager'), adminDeliveryController.unassignOrder);

export default router;
