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


export default router;
