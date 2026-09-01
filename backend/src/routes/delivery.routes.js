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
router.get('/delivery/earnings', protectDelivery, deliveryController.getEarnings);
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
router.get('/admin/delivery/partners/:userId/earnings', protect, authorize('Admin', 'Manager'), adminDeliveryController.partnerEarnings);
router.post('/admin/delivery/partners/:userId/earnings/settle', protect, authorize('Admin'), adminDeliveryController.settlePartnerEarnings);
router.post('/admin/delivery/partners/:userId/reset-password', protect, authorize('Admin'), adminDeliveryController.resetPartnerPassword);
router.post('/admin/delivery/partners/:userId/account', protect, authorize('Admin'), adminDeliveryController.setPartnerAccount);
router.post('/admin/orders/:id/assign', protect, authorize('Admin', 'Manager'), adminDeliveryController.assignOrder);
router.post('/admin/orders/:id/reassign', protect, authorize('Admin', 'Manager'), adminDeliveryController.reassignOrder);
router.post('/admin/orders/:id/unassign', protect, authorize('Admin', 'Manager'), adminDeliveryController.unassignOrder);

export default router;
