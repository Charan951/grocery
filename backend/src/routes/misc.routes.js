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


export default router;
