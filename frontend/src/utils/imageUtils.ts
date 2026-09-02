import { Product } from '../context/CMSContext';

export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';

const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop',
  bun: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop',
  egg: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop',
  poultry: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop',
  fruit: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop',
  vegetable: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&auto=format&fit=crop',
  tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop',
  snack: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop',
  popcorn: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop',
  chocolate: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop',
  sweet: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop',
  chicken: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&auto=format&fit=crop',
  meat: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&auto=format&fit=crop',
  fish: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop',
  cheese: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop',
  butter: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop',
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
  noodle: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop',
  biscuit: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop',
  curd: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=600&auto=format&fit=crop',
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop',
};

export const getSmartImageFallback = (name?: string): string => {
  if (!name) return DEFAULT_PRODUCT_IMAGE;
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_FALLBACK_MAP)) {
    if (lower.includes(key)) return url;
  }
  return DEFAULT_PRODUCT_IMAGE;
};

/**
 * Robust helper to safely extract a valid image URL for any product object.
 * Checks `imageUrl`, `images[0]`, and `image` property, ignoring empty/whitespace strings.
 * Falls back to a clean Unsplash grocery placeholder if no valid image is found.
 */
export const getProductImage = (product?: Partial<Product> | null): string => {
  if (!product) return DEFAULT_PRODUCT_IMAGE;

  let rawUrl = '';
  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim().length > 0) {
    rawUrl = product.imageUrl.trim();
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    const valid = product.images.find(img => typeof img === 'string' && img.trim().length > 0);
    if (valid) rawUrl = valid.trim();
  } else if ((product as any).image && typeof (product as any).image === 'string') {
    rawUrl = (product as any).image.trim();
  }

  if (!rawUrl || rawUrl.includes('cdn.zeptonow.com')) {
    return getSmartImageFallback(product.name || product.category || product.subCategory);
  }

  return rawUrl;
};
