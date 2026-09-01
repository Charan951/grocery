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


export default router;
