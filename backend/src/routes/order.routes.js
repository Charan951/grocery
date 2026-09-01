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


export default router;
