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

const router = express.Router();

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
