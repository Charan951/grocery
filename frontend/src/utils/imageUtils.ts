import { Product } from '../context/CMSContext';

export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600';

/**
 * Robust helper to safely extract a valid image URL for any product object.
 * Checks `imageUrl`, `images[0]`, and `image` property, ignoring empty/whitespace strings.
 * Falls back to a clean Unsplash grocery placeholder if no valid image is found.
 */
export const getProductImage = (product?: Partial<Product> | null): string => {
  if (!product) return DEFAULT_PRODUCT_IMAGE;

  // 1. Check imageUrl
  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0) {
    return product.imageUrl.trim();
  }

  // 2. Check images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const img of product.images) {
      if (img && typeof img === 'string' && img.trim().length > 0) {
        return img.trim();
      }
    }
  }

  // 3. Check singular image property if present
  const singularImage = (product as any).image;
  if (singularImage && typeof singularImage === 'string' && singularImage.trim().length > 0) {
    return singularImage.trim();
  }

  return DEFAULT_PRODUCT_IMAGE;
};
