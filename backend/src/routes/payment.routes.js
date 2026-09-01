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
// 17. PAYMENT ROUTES (RAZORPAY)
// ==========================================
router.post('/payment/create-order', attachCustomerOptional, paymentController.createRazorpayOrder);
router.post('/payment/verify', attachCustomerOptional, paymentController.verifyPayment);
router.post('/payment/webhook', paymentController.webhook); // raw-body parsed in app.js


export default router;
