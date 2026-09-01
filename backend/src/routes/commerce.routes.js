import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize, protectCustomer, attachCustomerOptional, protectDelivery } from '../middleware/auth.js';
import { customerAuthController } from '../controllers/authCustomerController.js';
import { deliveryController } from '../controllers/deliveryController.js';
import { adminDeliveryController } from '../controllers/adminDeliveryController.js';
import { festivalCampaignController } from '../controllers/festivalCampaignController.js';
import {
  authController, dashboardController, productController, categoryController,
  orderController, couponController, blogController, settingsController,
  customerController, supportController, brandController, inventoryController,
  employeeController, reviewController, auditLogController, uploadController,
  specialGroupController, bannerController, promoCardController, paymentController,
} from '../controllers/apiController.js';

const router = express.Router();

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


export default router;
