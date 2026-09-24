import express from 'express';
import { protect, authorize, attachCustomerOptional, protectDelivery } from '../middleware/auth.js';
import { returnController as rc } from '../controllers/returnController.js';

const router = express.Router();

// ==========================================
// 20. RETURNS & EXCHANGES
// Customer routes accept a customer token OR { phone } (body / query), same
// as cancel / rate / tip.
// ==========================================
router.get('/returns/config', rc.getConfig);
router.get('/returns/mine', attachCustomerOptional, rc.listMine);
router.get('/returns/:id', attachCustomerOptional, rc.getMine);
router.post('/returns/:id/cancel', attachCustomerOptional, rc.cancelMine);
router.get('/orders/:id/returns', attachCustomerOptional, rc.getOrderReturns);
router.post('/orders/:id/returns', attachCustomerOptional, rc.createReturn);

// Delivery partner — pickup offers and the collect-with-proof flow.
router.get('/delivery/returns/offers', protectDelivery, rc.partnerOffers);
router.get('/delivery/returns/active', protectDelivery, rc.partnerActive);
router.get('/delivery/returns/history', protectDelivery, rc.partnerHistory);
router.get('/delivery/returns/:id', protectDelivery, rc.partnerGet);
router.post('/delivery/returns/:id/accept', protectDelivery, rc.partnerAccept);
router.post('/delivery/returns/:id/reject', protectDelivery, rc.partnerReject);
router.post('/delivery/returns/:id/arrived', protectDelivery, rc.partnerArrived);
router.post('/delivery/returns/:id/collect', protectDelivery, rc.partnerCollect);
router.post('/delivery/returns/:id/refuse', protectDelivery, rc.partnerRefuse);
router.post('/delivery/returns/:id/fail', protectDelivery, rc.partnerFail);
router.post('/delivery/returns/:id/complete', protectDelivery, rc.partnerComplete);

// Admin
router.get('/admin/returns', protect, authorize('Admin', 'Manager'), rc.adminList);
router.get('/admin/returns/:id', protect, authorize('Admin', 'Manager'), rc.adminGet);
router.post('/admin/returns/:id/assign', protect, authorize('Admin', 'Manager'), rc.adminAssign);
router.post('/admin/returns/:id/requeue', protect, authorize('Admin', 'Manager'), rc.adminRequeue);
router.post('/admin/returns/:id/reject', protect, authorize('Admin', 'Manager'), rc.adminReject);
router.post('/admin/returns/:id/complete', protect, authorize('Admin', 'Manager'), rc.adminComplete);
router.post('/admin/returns/:id/refund', protect, authorize('Admin'), rc.adminRefundNow);

export default router;
