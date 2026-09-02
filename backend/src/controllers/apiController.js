// Barrel — the former mega-controller is now one file per domain.
// Existing imports (`routes/*`, `adminDeliveryController.js`) keep working via
// these re-exports. Shared helpers live in `./_shared.js`.
export { logAudit } from './_shared.js';

export { authController, dashboardController } from './authController.js';
export {
  productController,
  categoryController,
  superCategoryController,
  brandController,
  inventoryController,
  specialGroupController,
  bannerController,
  promoCardController,
} from './catalogController.js';
export { orderController } from './orderController.js';
export { couponController } from './couponController.js';
export { blogController } from './blogController.js';
export { settingsController } from './settingsController.js';
export { customerController } from './customerController.js';
export { supportController } from './supportController.js';
export { employeeController } from './employeeController.js';
export { reviewController } from './reviewController.js';
export { auditLogController } from './auditLogController.js';
export { uploadController } from './uploadController.js';
export { paymentController } from './paymentController.js';
