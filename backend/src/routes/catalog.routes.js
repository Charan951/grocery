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
  superCategoryController
} from '../controllers/apiController.js';

import { Order } from '../models/Order.js';

const router = express.Router();

// ==========================================
// 3. PRODUCT ROUTES
// ==========================================
router.get('/products', productController.getProducts);
// Units sold per category (non-cancelled orders), highest first. Drives the
// home page "Bestsellers" shelf; clients fall back to catalog order when empty.
router.get('/category-sales', async (_req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Failed', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', sold: { $sum: { $ifNull: ['$items.quantity', 1] } } } },
      { $lookup: { from: 'products', localField: '_id', foreignField: 'id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { _id: '$p.categoryId', sold: { $sum: '$sold' } } },
      { $sort: { sold: -1 } },
      { $limit: 20 },
    ]);
    res.json({ success: true, data: rows.map((r) => ({ categoryId: r._id, sold: r.sold })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});
// Units sold per product (non-cancelled orders), highest first. Computed live
// from orders on every request so the Bestsellers shelf always reflects what
// is actually selling.
router.get('/product-sales', async (_req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Failed', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', sold: { $sum: { $ifNull: ['$items.quantity', 1] } } } },
      { $sort: { sold: -1 } },
      { $limit: 300 },
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: rows.map((r) => ({ productId: r._id, sold: r.sold })) });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});
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

// Super Category routes
router.get('/super-categories', superCategoryController.getSuperCategories);
router.put('/super-categories/:id', superCategoryController.updateSuperCategory);

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



export default router;
