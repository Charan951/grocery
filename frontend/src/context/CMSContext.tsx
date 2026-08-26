import React, { createContext, useContext, useState, useEffect } from 'react';
import { normalizeCategoryImageUrl } from '../components/SubcategoryCardImage';

// Interfaces for our CMS models
export interface SubCategory {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  image?: string;
  color?: string;
  showOnHome?: boolean;
  displayOrder?: number;
  promoImage?: string;
  promoLink?: string;
}

export interface SpecialGroupItem {
  id?: string;
  name: string;
  categoryId?: string;
  subCategoryName?: string;
  image?: string;
  link?: string;
  isFeatured?: boolean;
  displayOrder?: number;
}

export interface SpecialCategoryGroup {
  id: string;
  title: string;
  slug?: string;
  displayOrder?: number;
  insertAfterSubCategoryIndex?: number;
  active?: boolean;
  items: SpecialGroupItem[];
}


export interface Category {
  id: string;
  slug?: string;
  name: string;
  displayName?: string;
  icon: string;
  color: string;
  image?: string;
  subCategories?: SubCategory[];
  displayOrder?: number;
  productCount: number;
}

export interface ProductHighlight {
  productType?: string;
  imported?: boolean;
  dietaryPreference?: string;
  goodFor?: string[];
}

export interface ProductDelivery {
  returnExchange?: string;
  fastDelivery?: boolean;
}

export interface ProductSeller {
  name?: string;
  countryOfOrigin?: string;
  shelfLife?: string;
}

export interface ProductStock {
  status?: string;
  quantity?: number;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  slug?: string;
  brand: string;
  categoryId: string;
  category?: string;
  subCategory?: string;
  rating: number;
  reviewsCount: number;
  price: number;
  originalPrice?: number;
  mrp: number;
  discount?: string;
  discountPercentage?: number;
  discountText?: string;
  netQuantity?: string;
  currency?: string;
  image?: string;
  images?: string[];
  imageUrl: string;
  weightOptions?: string[];
  defaultWeight?: string;
  description?: string;
  nutritionFacts?: Record<string, string>;
  ingredients?: string[];
  isOrganic?: boolean;
  isFreshPick?: boolean;
  isBestSeller?: boolean;
  highlights?: ProductHighlight;
  delivery?: ProductDelivery;
  seller?: ProductSeller;
  stock?: ProductStock | number;
  warehouseId?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  gradient: string[];
  imageUrl?: string;
  buttonText?: string;
  linkUrl?: string;
  positionIndex?: number;
  subCategoryName?: string;
  active: boolean;
  displayOn?: 'HOME' | 'CATEGORY' | 'SUBCATEGORY' | 'ALL';
  categoryId?: string;
  subcategoryId?: string;
  position?: string;
  themeBgColor?: string;
  themeTextColor?: string;
  themeAccentColor?: string;
  startDate?: string;
  endDate?: string;
}

export interface Coupon {
  code: string;
  discount: string;
  description: string;
  minOrder: number;
  value: number; // raw discount number or percentage
  isPercent: boolean;
}

export interface Comment {
  id: string;
  authorName: string;
  content: string;
  date: string;
}

export interface Blog {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  category: string;
  comments: Comment[];
  readTime: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  feedback: string;
  rating: number;
  avatar: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  timings: string;
  coordinates: { lat: number; lng: number };
  pincodes: string[];
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string;
}

export interface CMSState {
  banners: Banner[];
  categories: Category[];
  specialCategoryGroups: SpecialCategoryGroup[];
  products: Product[];
  coupons: Coupon[];
  blogs: Blog[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  stores: Store[];
  jobs: Job[];
  seoSettings: Record<string, SEOMetadata>;
}

interface CMSContextProps extends CMSState {
  activeHub: string;
  setActiveHub: (hub: string) => void;
  activeHeroBannerIndex: number;
  setActiveHeroBannerIndex: (index: number) => void;
  homeSelectedSubCategories: string[];
  updateHomeSubCategories: (subCats: string[]) => void;
  toggleHomeSubCategory: (subCatName: string) => void;
  userLocation: {
    address: string;
    area: string;
    city: string;
    pincode: string;
    lat: number;
    lng: number;
    flatNo?: string;
    landmark?: string;
    label?: string;
    houseNo?: string;
    fullAddress?: string;
  };
  updateUserLocation: (loc: any) => void;
  addBanner: (banner: Banner) => void;
  updateBanner: (id: string, updated: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  updateCategory: (id: string, updated: Partial<Category>) => void;
  addCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: 'up' | 'down') => void;
  addSubCategory: (categoryId: string, subCategory: Partial<SubCategory> | string) => void;
  updateSubCategory: (categoryId: string, subCategoryNameOrId: string, updated: Partial<SubCategory> | string) => void;
  deleteSubCategory: (categoryId: string, subCategoryNameOrId: string) => void;
  addSpecialGroup: (group: SpecialCategoryGroup) => void;
  updateSpecialGroup: (id: string, updated: Partial<SpecialCategoryGroup>) => void;
  deleteSpecialGroup: (id: string) => void;
  updateCoupon: (code: string, updated: Partial<Coupon>) => void;
  addCoupon: (coupon: Coupon) => void;
  deleteCoupon: (code: string) => void;
  updateBlog: (id: string, updated: Partial<Blog>) => void;
  addBlog: (blog: Blog) => void;
  deleteBlog: (id: string) => void;
  addBlogComment: (blogId: string, comment: Omit<Comment, 'id' | 'date'>) => void;
  updateFAQ: (id: string, updated: Partial<FAQ>) => void;
  addFAQ: (faq: FAQ) => void;
  deleteFAQ: (id: string) => void;
  updateTestimonial: (id: string, updated: Partial<Testimonial>) => void;
  addTestimonial: (testimonial: Testimonial) => void;
  deleteTestimonial: (id: string) => void;
  updateStore: (id: string, updated: Partial<Store>) => void;
  updateJob: (id: string, updated: Partial<Job>) => void;
  updateSEOSettings: (pageKey: string, updated: SEOMetadata) => void;
  resetToDefaults: () => void;
  uploadImage: (fileBase64OrUri: string, folder?: string) => Promise<string>;
}

const CMSContext = createContext<CMSContextProps | undefined>(undefined);

// Initial default data mirroring Flutter app models and assets
const defaultBanners: Banner[] = [
  {
    id: 'banner_1',
    title: 'Varalakshmi Vratham Festival Campaign',
    subtitle: 'Special Puja Flowers, Fresh Fruits & Organic Sweets Delivered in 10 Mins',
    tag: 'FESTIVAL SPECIAL',
    gradient: ['#8F1239', '#8F1239'],
    themeBgColor: '#8F1239',
    themeTextColor: '#FFFFFF',
    themeAccentColor: '#F6C453',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
    buttonText: 'Shop Festive Needs',
    linkUrl: '/products',
    positionIndex: 1,
    active: true,
  },
  {
    id: 'banner_2',
    title: 'Farm Fresh Milk & Dairy Basket',
    subtitle: 'Free Express 15-min delivery on all daily breakfast orders',
    tag: 'EXPRESS DELIVERY',
    gradient: ['#3B82F6', '#1D4ED8'],
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop',
    buttonText: 'Order Dairy',
    linkUrl: '/products?category=cat_dairy',
    positionIndex: 2,
    active: true,
  },
  {
    id: 'banner_3',
    title: 'Exotic Seasonal Fruits',
    subtitle: 'Handpicked organic Hass avocados, berries and fresh Gala apples',
    tag: 'FARM DIRECT',
    gradient: ['#F59E0B', '#D97706'],
    imageUrl: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=800&auto=format&fit=crop',
    buttonText: 'Explore Fruits',
    linkUrl: '/products?category=cat_fruits',
    positionIndex: 3,
    active: true,
  },
];

export const subCategoryImages: Record<string, string> = {
  // Fruits & Vegetables
  'Fresh Vegetables': 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop',
  'Fresh Fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop',
  'Exotics & Premium': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&auto=format&fit=crop',
  'Mangoes & Melons': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=300&auto=format&fit=crop',
  'Organics & Hydroponics': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop',
  'Leafy, Herbs & Seasonings': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&auto=format&fit=crop',
  'Flowers & Leaves': 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=300&auto=format&fit=crop',
  'Bouquets & Plants': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=300&auto=format&fit=crop',
  'Cuts & Sprouts': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop',
  'Plants & Gardening': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&auto=format&fit=crop',
  'Gardening Accessories': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&auto=format&fit=crop',
  'Frozen Veggies & Pulp': 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop',

  // Dairy, Bread & Eggs
  'Milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop',
  'Breads & Buns': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop',
  'Fresh Bakery': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop',
  'Eggs': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&auto=format&fit=crop',
  'Curd & Probiotic Drinks': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&auto=format&fit=crop',
  'Batters & Mixes': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300&auto=format&fit=crop',
  'High Protein': 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=300&auto=format&fit=crop',
  'Milk Based Drinks': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop',
  'Paneer & Cream': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop',
  'Gut Friendly': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop',
  'Butter': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop',
  'Cheese': 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=300&auto=format&fit=crop',
  'Indian Breads': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&auto=format&fit=crop',
  'Yogurt & Shrikhand': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&auto=format&fit=crop',

  // Atta, Rice, Oil & Dals
  'Atta': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop',
  'Rice': 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=300&auto=format&fit=crop',
  'Edible Oils': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop',
  'Dals & Pulses': 'https://images.unsplash.com/photo-1585994191611-726a88060c2d?w=300&auto=format&fit=crop',
  'Ghee': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop',
  'Spices & Masala': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop',
  'Dry Fruits & Nuts': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=300&auto=format&fit=crop',

  // Cold Drinks & Juices
  'Soft Drinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop',
  'Fruit Juices': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop',
  'Energy Drinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop',
  'Cold Drinks': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop',

  // Snacks & Munchies
  'Chips & Namkeen': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop',
  'Biscuits & Cookies': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop',
  'Chocolates & Candies': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop',

  // Breakfast & Sauces
  'Cereals & Oats': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop',
  'Spreads & Peanut Butter': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&auto=format&fit=crop',
  'Ketchup & Sauces': 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=300&auto=format&fit=crop',

  // Cleaning & Household
  'Detergents & Dishwash': 'https://images.unsplash.com/photo-1585832770485-e68a5fcfad52?w=300&auto=format&fit=crop',
  'Surface Cleaners': 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=300&auto=format&fit=crop',

  // Personal Care
  'Soaps & Body Wash': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&auto=format&fit=crop',
  'Shampoos & Hair Care': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300&auto=format&fit=crop'
};

export const getSubCategoryImage = (subName: string, catName?: string, customImg?: string) => {
  if (customImg && (customImg.startsWith('http://') || customImg.startsWith('https://') || customImg.startsWith('data:'))) {
    if (!customImg.includes('cdn.zeptonow.com')) {
      return normalizeCategoryImageUrl(customImg);
    }
  }

  // Exact subcategory match
  if (subCategoryImages[subName]) {
    return normalizeCategoryImageUrl(subCategoryImages[subName]);
  }

  // Case-insensitive match or substring match
  const sLower = (subName || '').toLowerCase();
  for (const [key, url] of Object.entries(subCategoryImages)) {
    if (key.toLowerCase() === sLower || sLower.includes(key.toLowerCase()) || key.toLowerCase().includes(sLower)) {
      return normalizeCategoryImageUrl(url);
    }
  }

  // Category fallback matching
  const cLower = (catName || '').toLowerCase();
  if (cLower.includes('dairy') || cLower.includes('milk') || cLower.includes('egg') || sLower.includes('milk') || sLower.includes('cheese') || sLower.includes('butter') || sLower.includes('paneer')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop';
  }
  if (cLower.includes('atta') || cLower.includes('rice') || cLower.includes('dal') || cLower.includes('oil') || sLower.includes('atta') || sLower.includes('flour') || sLower.includes('grain')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop';
  }
  if (cLower.includes('drink') || cLower.includes('beverage') || cLower.includes('juice') || sLower.includes('drink') || sLower.includes('juice') || sLower.includes('soda')) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop';
  }
  if (cLower.includes('snack') || cLower.includes('munch') || cLower.includes('biscuit') || sLower.includes('snack') || sLower.includes('chip') || sLower.includes('biscuit')) {
    return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop';
  }
  if (cLower.includes('clean') || cLower.includes('household') || sLower.includes('clean') || sLower.includes('wash')) {
    return 'https://images.unsplash.com/photo-1585832770485-e68a5fcfad52?w=300&auto=format&fit=crop';
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';
};

const categoryImages: Record<string, string> = {
  'fruits-vegetables': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&auto=format&fit=crop',
  'Fruits & Vegetables': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&auto=format&fit=crop',
  'dairy-bread-eggs': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
  'Dairy, Bread & Eggs': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
  'atta-rice-oil-dals': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop',
  'Atta, Rice, Oil & Dals': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop',
  'meats-fish-eggs': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop',
  'Meats, Fish & Eggs': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop',
  'masala-dry-fruits-more': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop',
  'Masala & Dry Fruits': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop',
  'breakfast-cereals-spreads-sauces': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop',
  'Breakfast & Sauces': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop',
  'packaged-food': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&auto=format&fit=crop',
  'Packaged Food': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&auto=format&fit=crop',
  'tea-coffee-health-drinks': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&auto=format&fit=crop',
  'Beverages': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&auto=format&fit=crop',
  'Cold Drinks & Juices': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&auto=format&fit=crop',
};

// Converts a #rrggbb hex color into an rgba() string with the given alpha,
// used to tint category avatar/card backgrounds with an admin-chosen color.
export const hexToRgba = (hex: string | undefined, alpha: number): string => {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) return `rgba(76, 175, 80, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Same tint as hexToRgba but pre-blended onto white and returned as an
// opaque rgb() — used for surfaces (like the fixed header) that must stay
// fully solid so scrolled page content can never show through them.
export const hexToTintOnWhite = (hex: string | undefined, alpha: number): string => {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) hex = '#4CAF50';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
};

// Converts a #rrggbb hex color into a darker shade for text/borders
export const hexToDarkShade = (hex: string | undefined, factor: number = 0.55): string => {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) hex = '#15803d';
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
};

export const getCategoryImage = (category: Category | string): string => {
  if (!category) {
    return 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop';
  }

  if (typeof category === 'object') {
    if (category.image && (category.image.startsWith('http://') || category.image.startsWith('https://') || category.image.startsWith('data:'))) {
      return category.image;
    }
    if (category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://') || category.icon.startsWith('data:'))) {
      return category.icon;
    }
    if (category.id && categoryImages[category.id]) {
      return categoryImages[category.id];
    }
    if (category.name && categoryImages[category.name]) {
      return categoryImages[category.name];
    }
    if (category.subCategories && category.subCategories.length > 0) {
      const firstSub = category.subCategories[0];
      const subImg = getSubCategoryImage(firstSub.name, category.name, firstSub.image || firstSub.icon);
      if (subImg) return subImg;
    }
  } else if (typeof category === 'string') {
    if (category.startsWith('http://') || category.startsWith('https://') || category.startsWith('data:')) {
      return category;
    }
    if (categoryImages[category]) {
      return categoryImages[category];
    }
  }

  return 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop';
};

export const deduplicateSubCategories = (subs: any[] = []): any[] => {
  if (!Array.isArray(subs)) return [];
  const seen = new Set<string>();
  return subs.filter((sub) => {
    const nameKey = (typeof sub === 'string' ? sub : sub?.name || '').toLowerCase().trim();
    if (!nameKey || seen.has(nameKey)) return false;
    seen.add(nameKey);
    return true;
  });
};

export const sanitizeCategoryList = (cats: Category[] = []): Category[] => {
  if (!Array.isArray(cats)) return [];
  return cats.map((cat) => ({
    ...cat,
    subCategories: deduplicateSubCategories(cat.subCategories || [])
  }));
};

const defaultCategories: Category[] = [
  {
    id: 'fruits-vegetables',
    slug: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    icon: 'Carrot',
    color: '#4CAF50',
    productCount: 35,
    subCategories: [
      { name: 'Fresh Vegetables', showOnHome: true, displayOrder: 1 },
      { name: 'Fresh Fruits', showOnHome: true, displayOrder: 2 },
      { name: 'Exotics & Premium', showOnHome: true, displayOrder: 3 },
      { name: 'Organics & Hydroponics', showOnHome: true, displayOrder: 4 },
      { name: 'Leafy, Herbs & Seasonings', showOnHome: true, displayOrder: 5 },
      { name: 'Mangoes & Melons', showOnHome: true, displayOrder: 6 },
      { name: 'Cuts & Sprouts', showOnHome: true, displayOrder: 7 }
    ]
  },
  {
    id: 'dairy-bread-eggs',
    slug: 'dairy-bread-eggs',
    name: 'Dairy, Bread & Eggs',
    icon: 'Milk',
    color: '#007AFF',
    productCount: 35,
    subCategories: [
      { name: 'Milk', showOnHome: true, displayOrder: 1 },
      { name: 'Breads & Buns', showOnHome: true, displayOrder: 2 },
      { name: 'Eggs', showOnHome: true, displayOrder: 3 },
      { name: 'Curd & Probiotic Drinks', showOnHome: true, displayOrder: 4 },
      { name: 'Paneer & Cream', showOnHome: true, displayOrder: 5 },
      { name: 'Butter', showOnHome: true, displayOrder: 6 },
      { name: 'Cheese', showOnHome: true, displayOrder: 7 }
    ]
  },
  {
    id: 'atta-rice-oil-dals',
    slug: 'atta-rice-oil-dals',
    name: 'Atta, Rice, Oil & Dals',
    icon: 'Wheat',
    color: '#FF9500',
    productCount: 25,
    subCategories: [
      { name: 'Atta', showOnHome: true, displayOrder: 1 },
      { name: 'Rice', showOnHome: true, displayOrder: 2 },
      { name: 'Edible Oils', showOnHome: true, displayOrder: 3 },
      { name: 'Dals & Pulses', showOnHome: true, displayOrder: 4 },
      { name: 'Ghee', showOnHome: true, displayOrder: 5 }
    ]
  },
  {
    id: 'meats-fish-eggs',
    slug: 'meats-fish-eggs',
    name: 'Meats, Fish & Eggs',
    icon: 'Beef',
    color: '#FF3B30',
    productCount: 20,
    subCategories: [
      { name: 'Chicken', showOnHome: true, displayOrder: 1 },
      { name: 'Mutton', showOnHome: true, displayOrder: 2 },
      { name: 'Fish & Seafood', showOnHome: true, displayOrder: 3 },
      { name: 'Eggs & Poultry', showOnHome: true, displayOrder: 4 }
    ]
  },
  {
    id: 'masala-dry-fruits-more',
    slug: 'masala-dry-fruits-more',
    name: 'Masala & Dry Fruits',
    icon: 'Spices',
    color: '#AF52DE',
    productCount: 20,
    subCategories: [
      { name: 'Whole Spices', showOnHome: true, displayOrder: 1 },
      { name: 'Powdered Spices', showOnHome: true, displayOrder: 2 },
      { name: 'Almonds & Cashews', showOnHome: true, displayOrder: 3 },
      { name: 'Raisins & Walnuts', showOnHome: true, displayOrder: 4 }
    ]
  },
  {
    id: 'breakfast-cereals-spreads-sauces',
    slug: 'breakfast-cereals-spreads-sauces',
    name: 'Breakfast & Sauces',
    icon: 'Croissant',
    color: '#FFCC00',
    productCount: 15,
    subCategories: [
      { name: 'Cereals & Oats', showOnHome: true, displayOrder: 1 },
      { name: 'Spreads & Peanut Butter', showOnHome: true, displayOrder: 2 },
      { name: 'Ketchup & Sauces', showOnHome: true, displayOrder: 3 }
    ]
  },
  {
    id: 'packaged-food',
    slug: 'packaged-food',
    name: 'Packaged Food',
    icon: 'Cookie',
    color: '#5856D6',
    productCount: 20,
    subCategories: [
      { name: 'Chips & Namkeen', showOnHome: true, displayOrder: 1 },
      { name: 'Noodles & Pasta', showOnHome: true, displayOrder: 2 },
      { name: 'Biscuits & Cookies', showOnHome: true, displayOrder: 3 },
      { name: 'Popcorn & Snacks', showOnHome: true, displayOrder: 4 }
    ]
  },
  {
    id: 'tea-coffee-health-drinks',
    slug: 'tea-coffee-health-drinks',
    name: 'Beverages',
    icon: 'CupSoda',
    color: '#5AC8FA',
    productCount: 15,
    subCategories: [
      { name: 'Tea', showOnHome: true, displayOrder: 1 },
      { name: 'Coffee', showOnHome: true, displayOrder: 2 },
      { name: 'Fruit Juices & Soft Drinks', showOnHome: true, displayOrder: 3 }
    ]
  }
];

const defaultProducts: Product[] = [
  // Fresh Vegetables
  { id: 'p_fv_v1', name: 'Farm Fresh Red Tomatoes', brand: 'Earth Greens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', rating: 4.8, reviewsCount: 290, price: 45, mrp: 60, discountText: '25% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Ripe vine tomatoes bursting with natural flavor.', imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop' },
  { id: 'p_fv_v2', name: 'Sweet Orange Carrots', brand: 'Natures Direct', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', rating: 4.8, reviewsCount: 220, price: 65, mrp: 80, discountText: '18% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Fresh farm-cut carrots rich in beta-carotene.', imageUrl: 'https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=800&auto=format&fit=crop' },
  { id: 'p_fv_v3', name: 'Fresh White Cauliflower', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', rating: 4.7, reviewsCount: 180, price: 40, mrp: 55, discountText: '27% OFF', weightOptions: ['1 pc'], defaultWeight: '1 pc', description: 'Compact white cauliflower head directly harvested.', imageUrl: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=800&auto=format&fit=crop' },
  { id: 'p_fv_v4', name: 'Green Bell Pepper Capsicum', brand: 'Earth Greens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', rating: 4.6, reviewsCount: 150, price: 50, mrp: 65, discountText: '23% OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Crisp green Shimla mirch peppers.', imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop' },
  { id: 'p_fv_v5', name: 'Fresh Lady Finger Bhindi', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', rating: 4.7, reviewsCount: 195, price: 42, mrp: 55, discountText: '₹13 OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Tender green okra for stir frying.', imageUrl: 'https://images.unsplash.com/photo-1425543103986-22413b10d829?w=800&auto=format&fit=crop' },

  // Fresh Fruits
  { id: 'p_fv_f1', name: 'Royal Gala Apples', brand: 'AppleCorp', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', rating: 4.9, reviewsCount: 890, price: 189, mrp: 240, discountText: '₹51 OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Crisp, sweet imported Royal Gala apples.', imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop' },
  { id: 'p_fv_f2', name: 'Robusta Golden Bananas', brand: 'FruitLand', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', rating: 4.8, reviewsCount: 1200, price: 55, mrp: 70, discountText: '21% OFF', weightOptions: ['1 Dozen'], defaultWeight: '1 Dozen', description: 'Naturally ripened sweet bananas.', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop' },
  { id: 'p_fv_f3', name: 'Sweet Nagpur Oranges', brand: 'Natures Direct', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', rating: 4.8, reviewsCount: 450, price: 99, mrp: 130, discountText: '23% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Juicy citrus oranges packed with Vitamin C.', imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&auto=format&fit=crop' },
  { id: 'p_fv_f4', name: 'Seedless Green Grapes', brand: 'FreshField', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', rating: 4.7, reviewsCount: 380, price: 110, mrp: 140, discountText: '₹30 OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Sweet, crunchy seedless green grapes.', imageUrl: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=800&auto=format&fit=crop' },
  { id: 'p_fv_f5', name: 'Fresh Pomegranate Anar', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', rating: 4.9, reviewsCount: 510, price: 199, mrp: 250, discountText: '20% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Ruby red pomegranate seeds bursting with antioxidants.', imageUrl: 'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=800&auto=format&fit=crop' },

  // Exotics & Premium
  { id: 'p_fv_e1', name: 'Organic Hass Avocados', brand: 'Natures Choice', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Exotics & Premium', rating: 4.9, reviewsCount: 412, price: 249, mrp: 299, discountText: '₹50 OFF', weightOptions: ['2 pcs'], defaultWeight: '2 pcs', description: 'Rich, creamy Hass avocados high in healthy fats.', imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop' },
  { id: 'p_fv_e2', name: 'Fresh Imported Blueberries', brand: 'BerryFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Exotics & Premium', rating: 4.9, reviewsCount: 310, price: 299, mrp: 350, discountText: '14% OFF', weightOptions: ['125g'], defaultWeight: '125g', description: 'Plump blue berries packed with antioxidants.', imageUrl: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=800&auto=format&fit=crop' },
  { id: 'p_fv_e3', name: 'Sweet Red Strawberries', brand: 'BerryFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Exotics & Premium', rating: 4.8, reviewsCount: 520, price: 160, mrp: 200, discountText: '20% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Fresh Mahabaleshwar red strawberries.', imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop' },
  { id: 'p_fv_e4', name: 'Exotic Red Dragon Fruit', brand: 'ExoFruit', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Exotics & Premium', rating: 4.7, reviewsCount: 190, price: 120, mrp: 150, discountText: '₹30 OFF', weightOptions: ['1 pc'], defaultWeight: '1 pc', description: 'Vibrant pink dragon fruit with sweet speckled flesh.', imageUrl: 'https://images.unsplash.com/photo-1527325678964-549216468488?w=800&auto=format&fit=crop' },
  { id: 'p_fv_e5', name: 'New Zealand Green Kiwi', brand: 'Zespri', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Exotics & Premium', rating: 4.8, reviewsCount: 280, price: 135, mrp: 160, discountText: '15% OFF', weightOptions: ['3 pcs'], defaultWeight: '3 pcs', description: 'Tangy sweet Zespri green kiwis.', imageUrl: 'https://images.unsplash.com/photo-1585059819970-072f24d7764a?w=800&auto=format&fit=crop' },

  // Organics & Hydroponics
  { id: 'p_fv_o1', name: 'Hydroponic Butterhead Lettuce', brand: 'UrbanGreens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Organics & Hydroponics', rating: 4.9, reviewsCount: 150, price: 89, mrp: 110, discountText: '19% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Pesticide-free hydroponically grown tender lettuce.', imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&auto=format&fit=crop' },
  { id: 'p_fv_o2', name: 'Organic Tender Baby Spinach', brand: 'Earth Greens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Organics & Hydroponics', rating: 4.9, reviewsCount: 410, price: 55, mrp: 75, discountText: '₹20 OFF', weightOptions: ['250g'], defaultWeight: '250g', description: 'Certified organic baby spinach.', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop' },
  { id: 'p_fv_o3', name: 'Organic Cherry Tomatoes', brand: 'Earth Greens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Organics & Hydroponics', rating: 4.8, reviewsCount: 210, price: 79, mrp: 99, discountText: '20% OFF', weightOptions: ['250g'], defaultWeight: '250g', description: 'Sweet vine organic cherry tomatoes.', imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop' },
  { id: 'p_fv_o4', name: 'Hydroponic English Cucumber', brand: 'UrbanGreens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Organics & Hydroponics', rating: 4.7, reviewsCount: 175, price: 65, mrp: 85, discountText: '23% OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Crisp seedless hydroponic cucumber.', imageUrl: 'https://images.unsplash.com/photo-1447175008436-08417090e4b0?w=800&auto=format&fit=crop' },
  { id: 'p_fv_o5', name: 'Organic Zucchini Green', brand: 'Earth Greens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Organics & Hydroponics', rating: 4.8, reviewsCount: 130, price: 95, mrp: 120, discountText: '20% OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Tender organic green zucchini.', imageUrl: 'https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=800&auto=format&fit=crop' },

  // Leafy, Herbs & Seasonings
  { id: 'p_fv_lh1', name: 'Fresh Green Coriander Dhania', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Leafy, Herbs & Seasonings', rating: 4.8, reviewsCount: 650, price: 18, mrp: 25, discountText: '28% OFF', weightOptions: ['1 Bunch'], defaultWeight: '1 Bunch', description: 'Aromatic fresh coriander leaves.', imageUrl: 'https://images.unsplash.com/photo-1588879460417-af2b369527f5?w=800&auto=format&fit=crop' },
  { id: 'p_fv_lh2', name: 'Fresh Mint Pudina Leaves', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Leafy, Herbs & Seasonings', rating: 4.8, reviewsCount: 420, price: 15, mrp: 20, discountText: '25% OFF', weightOptions: ['100g'], defaultWeight: '100g', description: 'Cooling mint leaves for chutneys & drinks.', imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800&auto=format&fit=crop' },
  { id: 'p_fv_lh3', name: 'Fresh Methi Fenugreek Bunch', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Leafy, Herbs & Seasonings', rating: 4.7, reviewsCount: 310, price: 25, mrp: 35, discountText: '₹10 OFF', weightOptions: ['250g'], defaultWeight: '250g', description: 'Fresh green methi leaves for parathas.', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop' },
  { id: 'p_fv_lh4', name: 'Fresh Fragrant Curry Leaves', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Leafy, Herbs & Seasonings', rating: 4.9, reviewsCount: 540, price: 12, mrp: 18, discountText: '33% OFF', weightOptions: ['100g'], defaultWeight: '100g', description: 'Fresh curry leaves for tempering.', imageUrl: 'https://images.unsplash.com/photo-1588879460417-af2b369527f5?w=800&auto=format&fit=crop' },
  { id: 'p_fv_lh5', name: 'Fresh Italian Basil Leaves', brand: 'UrbanGreens', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Leafy, Herbs & Seasonings', rating: 4.8, reviewsCount: 190, price: 45, mrp: 60, discountText: '25% OFF', weightOptions: ['50g'], defaultWeight: '50g', description: 'Aromatic sweet basil for pasta and pesto.', imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=800&auto=format&fit=crop' },

  // Mangoes & Melons
  { id: 'p_fv_m1', name: 'Ratnagiri Alphonso Hapus Mangoes', brand: 'MangoKing', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Mangoes & Melons', rating: 4.9, reviewsCount: 1890, price: 699, mrp: 850, discountText: '₹151 OFF', weightOptions: ['6 pcs box'], defaultWeight: '6 pcs box', description: 'Original GI tagged Ratnagiri Alphonso mangoes.', imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop' },
  { id: 'p_fv_m2', name: 'Devgad Kesar Mangoes', brand: 'MangoKing', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Mangoes & Melons', rating: 4.8, reviewsCount: 920, price: 450, mrp: 550, discountText: '18% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Sweet saffron scented Kesar mangoes.', imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop' },
  { id: 'p_fv_m3', name: 'Striped Red Watermelon', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Mangoes & Melons', rating: 4.7, reviewsCount: 610, price: 85, mrp: 110, discountText: '22% OFF', weightOptions: ['1 pc ~2kg'], defaultWeight: '1 pc ~2kg', description: 'Juicy sweet dark red watermelon.', imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop' },
  { id: 'p_fv_m4', name: 'Sweet Muskmelon Kharbooza', brand: 'FarmFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Mangoes & Melons', rating: 4.8, reviewsCount: 420, price: 65, mrp: 85, discountText: '23% OFF', weightOptions: ['1 pc'], defaultWeight: '1 pc', description: 'Aromatic orange muskmelon.', imageUrl: 'https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=800&auto=format&fit=crop' },
  { id: 'p_fv_m5', name: 'Banganapalli Safeda Mangoes', brand: 'MangoKing', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Mangoes & Melons', rating: 4.8, reviewsCount: 780, price: 299, mrp: 360, discountText: '17% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Large sweet Banganapalli mangoes.', imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop' },

  // Cuts & Sprouts
  { id: 'p_fv_c1', name: 'Fresh Cut Mixed Fruit Bowl', brand: 'FreshCut', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Cuts & Sprouts', rating: 4.8, reviewsCount: 490, price: 120, mrp: 150, discountText: '20% OFF', weightOptions: ['300g'], defaultWeight: '300g', description: 'Ready to eat cut fruits bowl.', imageUrl: 'https://images.unsplash.com/photo-1490815685287-e2e27040d346?w=800&auto=format&fit=crop' },
  { id: 'p_fv_c2', name: 'Sprouted Green Moong Beans', brand: 'FreshCut', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Cuts & Sprouts', rating: 4.9, reviewsCount: 380, price: 45, mrp: 60, discountText: '25% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'High protein fresh sprouted moong.', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop' },
  { id: 'p_fv_c3', name: 'Peeled Fresh Garlic Cloves', brand: 'FreshCut', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Cuts & Sprouts', rating: 4.8, reviewsCount: 290, price: 60, mrp: 75, discountText: '20% OFF', weightOptions: ['100g'], defaultWeight: '100g', description: 'Ready to cook peeled garlic cloves.', imageUrl: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=800&auto=format&fit=crop' },
  { id: 'p_fv_c4', name: 'Cut Sambar Veggie Mix', brand: 'FreshCut', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Cuts & Sprouts', rating: 4.7, reviewsCount: 310, price: 75, mrp: 95, discountText: '21% OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Pre-washed cut vegetables for Sambar.', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop' },
  { id: 'p_fv_c5', name: 'Sprouted Mixed Kala Chana & Moong', brand: 'FreshCut', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Cuts & Sprouts', rating: 4.8, reviewsCount: 260, price: 55, mrp: 70, discountText: '21% OFF', weightOptions: ['250g'], defaultWeight: '250g', description: 'Nutritious sprouted legumes salad mix.', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop' },

  // Dairy - Milk
  { id: 'p_dbe_m1', name: 'Amul Taaza Homogenised Toned Milk', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 3200, price: 54, mrp: 56, discountText: 'Best Value', weightOptions: ['1L'], defaultWeight: '1L', description: 'Pasteurized toned milk.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m2', name: 'Nandini GoodLife Pure Cow Milk', brand: 'Nandini', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 2400, price: 52, mrp: 55, discountText: '5% OFF', weightOptions: ['1L'], defaultWeight: '1L', description: 'Pure cow milk in Tetra Pak.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m3', name: 'Mother Dairy Full Cream Milk', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.8, reviewsCount: 1540, price: 66, mrp: 68, discountText: 'Fresh Daily', weightOptions: ['1L'], defaultWeight: '1L', description: 'Rich full cream milk.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m4', name: 'Country Delight Farm A2 Cow Milk', brand: 'Country Delight', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 980, price: 85, mrp: 95, discountText: '₹10 OFF', weightOptions: ['1L'], defaultWeight: '1L', description: 'Natural unadulterated A2 milk.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m5', name: 'Amul Gold Buffalo Full Cream Milk', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 1890, price: 68, mrp: 70, discountText: 'Best Value', weightOptions: ['1L'], defaultWeight: '1L', description: 'Thick buffalo milk for tea and sweets.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },

  // Dairy - Breads & Buns
  { id: 'p_dbe_b1', name: 'Britannia 100% Whole Wheat Bread', brand: 'Britannia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 1420, price: 45, mrp: 50, discountText: '10% OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Soft 100% brown wheat loaf.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b2', name: 'English Oven Multigrain Bread', brand: 'English Oven', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 620, price: 55, mrp: 65, discountText: '15% OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Nine-grain healthy loaf.', imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b3', name: 'Modern Soft White Sandwich Bread', brand: 'Modern', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.7, reviewsCount: 890, price: 38, mrp: 42, discountText: '₹4 OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Classic white sandwich bread.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b4', name: 'Bakehouse Sesame Burger Buns', brand: 'Bakehouse', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 310, price: 40, mrp: 50, discountText: '20% OFF', weightOptions: ['4 pcs'], defaultWeight: '4 pcs', description: 'Soft bakery burger buns.', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b5', name: 'Fresh Ladi Pav Buns', brand: 'Bakehouse', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.9, reviewsCount: 780, price: 30, mrp: 35, discountText: '14% OFF', weightOptions: ['6 pcs'], defaultWeight: '6 pcs', description: 'Soft ladi pav for vada pav & bhaji.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },

  // Dairy - Eggs
  { id: 'p_dbe_e1', name: 'Eggoz Herbal Brown Eggs', brand: 'Eggoz', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.9, reviewsCount: 880, price: 115, mrp: 140, discountText: '₹25 OFF', weightOptions: ['12 pcs'], defaultWeight: '12 pcs', description: 'Cage-free organic brown eggs.', imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e2', name: 'Fresh Farm Table White Eggs', brand: 'FreshFarm', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.8, reviewsCount: 1540, price: 195, mrp: 220, discountText: '₹25 OFF', weightOptions: ['30 pcs tray'], defaultWeight: '30 pcs tray', description: 'Clean farm white eggs.', imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e3', name: 'UPF Omega-3 Enriched Eggs', brand: 'UPF', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.8, reviewsCount: 420, price: 75, mrp: 90, discountText: '16% OFF', weightOptions: ['6 pcs'], defaultWeight: '6 pcs', description: 'Omega-3 enriched eggs.', imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e5', name: 'Quail Eggs Specialty Pack', brand: 'ExoFarm', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.7, reviewsCount: 190, price: 85, mrp: 105, discountText: '19% OFF', weightOptions: ['12 pcs'], defaultWeight: '12 pcs', description: 'Nutritious specialty quail eggs.', imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop' }
];

const defaultCoupons: Coupon[] = [
  { code: 'FRESH50', discount: '₹50 OFF', description: 'Applicable on orders above ₹499', minOrder: 499, value: 50, isPercent: false },
  { code: 'SUPERVIP', discount: '10% OFF', description: 'Maximum discount of ₹100', minOrder: 299, value: 10, isPercent: true },
  { code: 'FREEFORTY', discount: '₹40 OFF', description: 'On organic dairy items', minOrder: 199, value: 40, isPercent: false }
];

const defaultBlogs: Blog[] = [
  {
    id: 'blog_1',
    title: 'The Ultimate Guide to Eating Organic',
    excerpt: 'Discover why organic farming matters and how it improves your daily energy levels and long-term health metrics.',
    content: 'Eating organic is more than a trend—it is a choice to reduce chemical exposure and increase nutrient intake. Organic foods contain higher levels of antioxidants and essential vitamins. Sourced directly from local farms, our organic catalog ensures zero synthetic pesticides, offering clean fuel for your body. Try incorporating small swaps like organic spinach or local wild honey into your daily routine and observe the energy boost!',
    coverImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop',
    date: 'July 10, 2026',
    author: {
      name: 'Dr. Sarah Jenkins',
      role: 'Organic Nutritionist',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop'
    },
    category: 'Nutrition',
    comments: [
      { id: 'c1', authorName: 'Elena Rostova', content: 'This article was highly informative! I started replacing my morning veggies with organic ones.', date: 'July 11, 2026' }
    ],
    readTime: '4 min read'
  },
  {
    id: 'blog_2',
    title: '5 Easy Breakfast Smoothie Bowls',
    excerpt: 'Quick, high-protein, and gorgeous smoothie bowls to kickstart your mornings in less than ten minutes.',
    content: 'Mornings are busy, but your breakfast shouldn\'t suffer. Smoothie bowls are the perfect canvas for packing nutrients, healthy fats, and fruits into one meal. Try blending organic Hass avocados with Greek yogurt and spinach, topped with blueberries and chia seeds. It keeps you full until lunch and satisfies your sweet tooth naturally. We outline 5 recipes you can blend in under 10 minutes.',
    coverImage: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&auto=format&fit=crop',
    date: 'July 8, 2026',
    author: {
      name: 'Chef Marcus Green',
      role: 'Culinary Specialist',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop'
    },
    category: 'Recipes',
    comments: [],
    readTime: '3 min read'
  }
];

const defaultTestimonials: Testimonial[] = [
  { id: 't1', name: 'Priya Sharma', role: 'VIP Member', feedback: 'FreshCart completely transformed my grocery shopping. The delivery is incredibly fast (under 30 minutes) and the organic spinach is always crisp!', rating: 5, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop' },
  { id: 't2', name: 'Jessica Miller', role: 'Working Mother', feedback: 'I save hours every single week. The app is simple to use, but having the website available makes planning weekly meal prep a breeze!', rating: 5, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop' },
  { id: 't3', name: 'Amit Kumar', role: 'Tech Entrepreneur', feedback: 'Premium quality items and stellar client support. The sitemaps, interactive delivery locator, and order flows are world-class.', rating: 4, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop' }
];

const defaultFAQs: FAQ[] = [
  { id: 'faq_1', question: 'How long does delivery take?', answer: 'We deliver within 15 to 30 minutes in our active service areas. You can check if your location is covered using our Delivery Locations page checker.', category: 'Shipping' },
  { id: 'faq_2', question: 'What is your return policy?', answer: 'We offer a no-questions-asked return policy. If you are not satisfied with the freshness of any product, you can initiate a return or refund request within 24 hours of delivery.', category: 'Returns' },
  { id: 'faq_3', question: 'How do I cancel my order?', answer: 'Orders can be cancelled before they leave our local fulfillment centers (usually within 5 minutes of placing the order). Go to your order list in the profile section to cancel.', category: 'Refunds' },
  { id: 'faq_4', question: 'Is there a membership subscription?', answer: 'Yes! Our FreshCart VIP Membership offers unlimited free delivery on orders above ₹199, double reward points, and exclusive member-only discounts.', category: 'Payments' }
];

const defaultStores: Store[] = [
  { id: 'st_1', name: 'FreshCart Flagship Store', address: '12, 100 Feet Rd, Indiranagar, Bengaluru, KA 560038', phone: '+91 80 4910 2000', timings: '7:00 AM - 11:00 PM', coordinates: { lat: 12.97189, lng: 77.64115 }, pincodes: ['560038', '560008', '560042'] },
  { id: 'st_2', name: 'FreshCart HSR Experience Center', address: '504, 27th Main Rd, HSR Layout, Sector 1, Bengaluru, KA 560102', phone: '+91 80 4910 3000', timings: '7:00 AM - 11:00 PM', coordinates: { lat: 12.9103, lng: 77.6450 }, pincodes: ['560102', '560034', '560103'] },
  { id: 'st_3', name: 'FreshCart Whitefield Hub', address: 'ITTPL Campus, Whitefield Main Rd, Bengaluru, KA 560066', phone: '+91 80 4910 4000', timings: '6:00 AM - 12:00 AM', coordinates: { lat: 12.9844, lng: 77.7479 }, pincodes: ['560066', '560048', '560067'] }
];

const defaultJobs: Job[] = [
  {
    id: 'job_1',
    title: 'Senior Frontend Engineer (React/TypeScript)',
    department: 'Engineering',
    location: 'Remote (India)',
    type: 'Full-time',
    experience: '4+ Years',
    description: 'We are looking for a Senior Frontend Engineer to lead the design and implementation of our consumer-facing web experiences. You will design fluid animations and maintain standard page performance.',
    requirements: [
      'Strong expertise in React, TypeScript, and modern CSS practices (CSS Modules, transitions).',
      'Experience with animation libraries like Framer Motion.',
      'A deep eye for visual layout, UX patterns, and performance metrics (Lighthouse scores).'
    ]
  },
  {
    id: 'job_2',
    title: 'Logistics & Operations Manager',
    department: 'Operations',
    location: 'Bengaluru, India',
    type: 'Full-time',
    experience: '3+ Years',
    description: 'Manage delivery operations, rider dispatch systems, and micro-fulfillment centers across South Bengaluru. Ensure delivery times stay under 25 minutes.',
    requirements: [
      'Proven background in hyper-local logistics or e-commerce delivery networks.',
      'Strong team leadership and optimization analytical skills.',
      'Willingness to work in shifts and supervise fast-paced warehouses.'
    ]
  }
];

export const defaultSpecialGroups: SpecialCategoryGroup[] = [
  {
    id: 'sg_grocery_kitchen',
    title: 'Grocery & Kitchen',
    slug: 'grocery-kitchen',
    displayOrder: 1,
    active: true,
    items: [
      {
        id: 'sgi_1',
        name: 'Fruits & Vegetables',
        categoryId: 'cat_organic',
        subCategoryName: 'Fruits & Vegetables',
        image: 'https://cdn.zeptonow.com/production/tr:w-420,ar-486-333,pr-true,f-auto,q-40/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
        link: '/products?category=cat_organic',
        isFeatured: true,
        displayOrder: 0,
      },
      {
        id: 'sgi_2',
        name: 'Dairy, Bread & Eggs',
        categoryId: 'cat_dairy',
        subCategoryName: 'Dairy, Bread & Eggs',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
        link: '/products?category=cat_dairy',
        isFeatured: false,
        displayOrder: 1,
      },
      {
        id: 'sgi_3',
        name: 'Atta, Rice, Oil & Dals',
        categoryId: 'cat_grains',
        subCategoryName: 'Atta, Rice, Oil & Dals',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
        link: '/products?category=cat_grains',
        isFeatured: false,
        displayOrder: 2,
      },
      {
        id: 'sgi_4',
        name: 'Meats, Fish & Eggs',
        categoryId: 'cat_meat',
        subCategoryName: 'Meats, Fish & Eggs',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/229a0614-71cc-410d-9242-88bcc1b4d0e7.png',
        link: '/products?category=cat_meat',
        isFeatured: false,
        displayOrder: 3,
      },
      {
        id: 'sgi_5',
        name: 'Masala, Dry Fruits & More',
        categoryId: 'cat_spices',
        subCategoryName: 'Masala & Spices',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/8d4d3977-5197-49d9-9867-8a670524e48b.png',
        link: '/products?category=cat_spices',
        isFeatured: false,
        displayOrder: 4,
      },
      {
        id: 'sgi_6',
        name: 'Breakfast & Sauces',
        categoryId: 'cat_bakery',
        subCategoryName: 'Breakfast & Sauces',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/ab241d87-da5b-4830-b38f-1a6cd30d0d41.png',
        link: '/products?category=cat_bakery',
        isFeatured: false,
        displayOrder: 5,
      },
      {
        id: 'sgi_7',
        name: 'Packaged Food',
        categoryId: 'cat_snacks',
        subCategoryName: 'Packaged Food',
        image: 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/3b0ce887-3b38-4450-b7da-9da0ad8b799d.png',
        link: '/products?category=cat_snacks',
        isFeatured: false,
        displayOrder: 6,
      },
    ]
  }
];

const defaultSEOSettings: Record<string, SEOMetadata> = {
  home: { title: 'FreshCart | Premium Organic Groceries Delivered in 15 Mins', description: 'Order fresh organic vegetables, fruits, dairy, bakery, snacks, and meats. High-quality produce sourced directly from local farms. First order free!', keywords: 'organic groceries, fresh vegetables, grocery delivery Bengaluru, online dairy, FreshCart' },
  about: { title: 'Our Story & Vision | FreshCart Groceries', description: 'Learn about FreshCart mission to bring fresh organic farm products directly to your doorstep. Explore our leadership, milestones, and core values.', keywords: 'about freshcart, local farming sustainable, freshcart timeline' },
  products: { title: 'Shop Organic Products | FreshCart Catalog', description: 'Browse and filter our catalog of fresh organic fruits, greens, hand-baked bread, grass-fed dairy, and wild honey.', keywords: 'shop groceries, organic broccoli, fresh apple gala, sugar-free snacks' },
  offers: { title: 'Active Coupons & Flash Sales | FreshCart Offers', description: 'Get maximum savings on your monthly groceries. Save up to ₹100 using active codes, festival sales, and friend referrals.', keywords: 'grocery coupons, discount freshcart code, referral cashback' },
  blog: { title: 'FreshCart Blog | Cooking Recipes & Healthy Living Guides', description: 'Read articles written by verified nutritionists and chefs. Discover morning smoothie bowl recipes and guide to eating organic.', keywords: 'healthy recipes, organic benefit nutrition, cold brew guide' },
  help: { title: 'Help Center & Support FAQs | FreshCart', description: 'Have questions about returns, refunds, order tracking, or subscription billing? Read our FAQs or contact our 24/7 client support.', keywords: 'freshcart contact, return policy refund, track delivery status' },
  careers: { title: 'Careers at FreshCart | Join the Fast-Growing Grocery Startup', description: 'We are hiring! Explore open positions in software development, marketing, and logistics. Apply now to shape hyper-local delivery.', keywords: 'careers startup bangalore, hiring react engineer, logistics jobs' },
  locations: { title: 'Delivery Locations & Areas Covered | FreshCart', description: 'Enter your postcode to check if our 15-minute delivery service is active in your neighborhood. Discover covered zones.', keywords: 'delivery coverage pincode, freshcart cities' }
};

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeHeroBannerIndex, setActiveHeroBannerIndex] = useState<number>(0);
  const [activeHub, setActiveHubState] = useState<string>(() => {
    return localStorage.getItem('freshcart_active_hub') || 'wh_bengaluru';
  });

  const setActiveHub = (hub: string) => {
    setActiveHubState(hub);
    localStorage.setItem('freshcart_active_hub', hub);
  };

  const [state, setState] = useState<CMSState>(() => {
    const cached = localStorage.getItem('freshcart_cms_data_v2');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!parsed.specialCategoryGroups || parsed.specialCategoryGroups.length === 0) {
          parsed.specialCategoryGroups = defaultSpecialGroups;
        }
        if (!parsed.products || parsed.products.length < 30) {
          parsed.products = defaultProducts;
        }
        if (!parsed.categories || parsed.categories.length < 5) {
          parsed.categories = defaultCategories;
        }
        parsed.categories = sanitizeCategoryList(parsed.categories);
        return parsed;
      } catch (e) {
        console.error('Failed to parse cached CMS data', e);
      }
    }
    return {
      banners: defaultBanners,
      categories: sanitizeCategoryList(defaultCategories),
      specialCategoryGroups: defaultSpecialGroups,
      products: defaultProducts,
      coupons: defaultCoupons,
      blogs: defaultBlogs,
      testimonials: defaultTestimonials,
      faqs: defaultFAQs,
      stores: defaultStores,
      jobs: defaultJobs,
      seoSettings: defaultSEOSettings,
    };
  });


  useEffect(() => {
    localStorage.setItem('freshcart_cms_data_v2', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const syncWithBackend = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      try {
        const fetchJson = async (url: string) => {
          const res = await fetch(url, { signal: controller.signal });
          return res.ok ? await res.json() : null;
        };

        const [pData, cData, sgData, bannerData, cpData, bData] = await Promise.all([
          fetchJson('/api/products').catch(() => null),
          fetchJson('/api/categories').catch(() => null),
          fetchJson('/api/special-groups').catch(() => null),
          fetchJson('/api/banners').catch(() => null),
          fetchJson('/api/coupons').catch(() => null),
          fetchJson('/api/blogs').catch(() => null),
        ]);

        clearTimeout(timeoutId);

        setState((prev) => ({
          ...prev,
          products: pData?.success && pData.products?.length ? pData.products : prev.products,
          categories: cData?.success && cData.categories?.length ? sanitizeCategoryList(cData.categories) : sanitizeCategoryList(prev.categories),
          specialCategoryGroups: sgData?.success && sgData.groups?.length ? sgData.groups : prev.specialCategoryGroups,
          banners: bannerData?.success && bannerData.banners?.length ? bannerData.banners : prev.banners,
          coupons: cpData?.success && cpData.coupons?.length ? cpData.coupons : prev.coupons,
          blogs: bData?.success && bData.blogs?.length ? bData.blogs : prev.blogs,
        }));
        console.log('✅ FreshCart context synchronized with live MERN server database.');
      } catch (err) {
        console.warn('⚠️ FreshCart MERN server not connected or timed out. Using local offline state.');
      } finally {
        clearTimeout(timeoutId);
      }
    };
    syncWithBackend();
  }, []);



  const [userLocation, setUserLocationState] = useState(() => {
    const saved = localStorage.getItem('freshcart_delivery_location');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      address: 'Indiranagar 100ft Road, Bengaluru, KA 560038',
      area: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      lat: 12.9716,
      lng: 77.5946
    };
  });

  const updateUserLocation = (loc: any) => {
    setUserLocationState(loc);
    localStorage.setItem('freshcart_delivery_location', JSON.stringify(loc));
  };

  const [homeSelectedSubCategories, setHomeSelectedSubCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('freshcart_home_subcategories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });

  const updateHomeSubCategories = (subCats: string[]) => {
    setHomeSelectedSubCategories(subCats);
    localStorage.setItem('freshcart_home_subcategories', JSON.stringify(subCats));
  };

  const toggleHomeSubCategory = (subCatName: string) => {
    setHomeSelectedSubCategories((prev) => {
      const exists = prev.includes(subCatName);
      const next = exists ? prev.filter((s) => s !== subCatName) : [...prev, subCatName];
      localStorage.setItem('freshcart_home_subcategories', JSON.stringify(next));
      return next;
    });
  };

  const addBanner = async (banner: Banner) => {
    setState((prev) => ({
      ...prev,
      banners: [...prev.banners, banner],
    }));
    try {
      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner)
      });
    } catch (e) {
      console.warn('API sync addBanner offline', e);
    }
  };

  const deleteBanner = async (id: string) => {
    setState((prev) => ({
      ...prev,
      banners: prev.banners.filter((b) => b.id !== id),
    }));
    try {
      await fetch(`/api/banners/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API sync deleteBanner offline', e);
    }
  };

  const updateBanner = async (id: string, updated: Partial<Banner>) => {
    setState((prev) => ({
      ...prev,
      banners: prev.banners.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
    try {
      await fetch(`/api/banners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('API sync updateBanner offline', e);
    }
  };

  const updateProduct = async (id: string, updated: Partial<Product>) => {
    const payload = { ...updated };
    delete payload._id;

    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id || (p._id && p._id === id) ? { ...p, ...payload } : p)),
    }));
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product) {
          setState((prev) => ({
            ...prev,
            products: prev.products.map((p) => (p.id === id || (p._id && p._id === id) ? { ...p, ...data.product } : p)),
          }));
        }
      }
    } catch (e) {
      console.warn('API sync updateProduct offline/error', e);
    }
  };

  const addProduct = async (product: Product) => {
    const payload = { ...product };
    delete payload._id;

    setState((prev) => ({
      ...prev,
      products: [payload as Product, ...prev.products],
    }));
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product) {
          setState((prev) => ({
            ...prev,
            products: prev.products.map((p) => (p.id === product.id ? data.product : p)),
          }));
        }
      }
    } catch (e) {
      console.warn('API sync addProduct offline/error', e);
    }
  };

  const deleteProduct = async (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id && (p._id && p._id !== id)),
    }));
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.warn('API sync deleteProduct offline', e);
    }
  };

  const updateCategory = async (id: string, updated: Partial<Category>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        const isMatch = c.id === id || c.slug === id || (c as any)._id === id || (c.name && c.name.toLowerCase() === id.toLowerCase());
        return isMatch ? { ...c, ...updated } : c;
      }),
    }));
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('API sync updateCategory offline', e);
    }
  };

  const addCategory = async (category: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [category, ...prev.categories],
    }));
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
    } catch (e) {
      console.warn('API sync addCategory offline', e);
    }
  };

  const deleteCategory = async (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id && c.slug !== id && (c as any)._id !== id && (c.name && c.name.toLowerCase() !== id.toLowerCase())),
    }));
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API sync deleteCategory offline', e);
    }
  };

  const moveCategory = (id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const idx = prev.categories.findIndex(
        (c) => c.id === id || c.slug === id || (c as any)._id === id || (c.name && c.name.toLowerCase() === id.toLowerCase())
      );
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.categories.length) return prev;

      const newCategories = [...prev.categories];
      const [moved] = newCategories.splice(idx, 1);
      newCategories.splice(newIdx, 0, moved);
      const updatedCategories = newCategories.map((cat, i) => ({
        ...cat,
        displayOrder: i + 1,
      }));

      // Sync updated displayOrder to backend
      updatedCategories.forEach(async (cat) => {
        try {
          await fetch(`/api/categories/${cat.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: cat.displayOrder })
          });
        } catch (e) {
          // offline fallback
        }
      });

      return {
        ...prev,
        categories: updatedCategories,
      };
    });
  };

  const addSubCategory = async (categoryId: string, subCategoryDataOrName: Partial<SubCategory> | string) => {
    const isString = typeof subCategoryDataOrName === 'string';
    const nameVal = isString ? subCategoryDataOrName : (subCategoryDataOrName.name || '');
    const subSlug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newSub = isString
      ? { id: 'sub_' + Date.now(), name: nameVal, slug: subSlug, icon: 'Leaf', image: '', showOnHome: true, displayOrder: 0, promoImage: '', promoLink: '' }
      : {
        id: subCategoryDataOrName.id || 'sub_' + Date.now(),
        name: nameVal,
        slug: subCategoryDataOrName.slug || subSlug,
        icon: subCategoryDataOrName.image || subCategoryDataOrName.icon || 'Leaf',
        image: subCategoryDataOrName.image || subCategoryDataOrName.icon || '',
        showOnHome: subCategoryDataOrName.showOnHome !== undefined ? subCategoryDataOrName.showOnHome : true,
        displayOrder: subCategoryDataOrName.displayOrder !== undefined ? Number(subCategoryDataOrName.displayOrder) : 0,
        color: subCategoryDataOrName.color || '#10B981',
        promoImage: subCategoryDataOrName.promoImage || '',
        promoLink: subCategoryDataOrName.promoLink || ''
      };

    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id === categoryId || c.slug === categoryId) {
          const subs = c.subCategories || [];
          const nameKey = nameVal.toLowerCase().trim();
          const existingIdx = subs.findIndex((s: any) => (typeof s === 'string' ? s : s.name || '').toLowerCase().trim() === nameKey);
          let newSubs;
          if (existingIdx >= 0) {
            newSubs = [...subs];
            newSubs[existingIdx] = typeof subs[existingIdx] === 'object' ? { ...subs[existingIdx], ...newSub } : newSub;
          } else {
            newSubs = [...subs, newSub];
          }
          return { ...c, subCategories: deduplicateSubCategories(newSubs) };
        }
        return c;
      })
    }));

    if (newSub.showOnHome && !homeSelectedSubCategories.includes(nameVal)) {
      toggleHomeSubCategory(nameVal);
    }

    try {
      await fetch(`/api/categories/${categoryId}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      });
    } catch (e) {
      console.warn('API sync addSubCategory offline', e);
    }
  };

  const updateSubCategory = async (categoryId: string, subCategoryNameOrId: string, updatedDataOrName: Partial<SubCategory> | string) => {
    const isString = typeof updatedDataOrName === 'string';
    const updatedName = isString ? updatedDataOrName : updatedDataOrName.name;
    const newSlug = updatedName ? updatedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;
    const subPayload = isString ? { name: updatedName } : updatedDataOrName;

    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id === categoryId || c.slug === categoryId) {
          const subs = (c.subCategories || []).map((sc: any) => {
            const scId = sc.id || sc.name;
            if (scId === subCategoryNameOrId || sc.name === subCategoryNameOrId || sc.slug === subCategoryNameOrId) {
              if (isString) {
                return { ...sc, name: updatedName, slug: newSlug };
              }
              return {
                ...sc,
                ...updatedDataOrName,
                name: updatedName || sc.name,
                slug: newSlug || sc.slug
              };
            }
            return sc;
          });
          return { ...c, subCategories: subs };
        }
        return c;
      })
    }));

    if (!isString && updatedDataOrName.showOnHome !== undefined && updatedName) {
      const isCurrentlySelected = homeSelectedSubCategories.includes(updatedName);
      if (updatedDataOrName.showOnHome && !isCurrentlySelected) {
        toggleHomeSubCategory(updatedName);
      } else if (!updatedDataOrName.showOnHome && isCurrentlySelected) {
        toggleHomeSubCategory(updatedName);
      }
    }

    try {
      await fetch(`/api/categories/${categoryId}/subcategories/${encodeURIComponent(subCategoryNameOrId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subPayload)
      });
    } catch (e) {
      console.warn('API sync updateSubCategory offline', e);
    }
  };

  const deleteSubCategory = async (categoryId: string, subCategoryNameOrId: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id === categoryId || c.slug === categoryId) {
          const subs = (c.subCategories || []).filter(
            (sc) => sc.id !== subCategoryNameOrId && sc.name !== subCategoryNameOrId && sc.slug !== subCategoryNameOrId
          );
          return { ...c, subCategories: subs };
        }
        return c;
      })
    }));

    try {
      await fetch(`/api/categories/${categoryId}/subcategories/${encodeURIComponent(subCategoryNameOrId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API sync deleteSubCategory offline', e);
    }
  };

  const addSpecialGroup = async (group: SpecialCategoryGroup) => {
    setState((prev) => ({
      ...prev,
      specialCategoryGroups: [...(prev.specialCategoryGroups || []), group],
    }));

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/special-groups', {
        method: 'POST',
        headers,
        body: JSON.stringify(group)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.group) {
          setState((prev) => ({
            ...prev,
            specialCategoryGroups: (prev.specialCategoryGroups || []).map((g) => (g.id === group.id ? data.group : g)),
          }));
        }
      }
    } catch (e) {
      console.warn('API sync addSpecialGroup offline', e);
    }
  };

  const updateSpecialGroup = async (id: string, updated: Partial<SpecialCategoryGroup>) => {
    setState((prev) => ({
      ...prev,
      specialCategoryGroups: (prev.specialCategoryGroups || []).map((g) => (g.id === id ? { ...g, ...updated } : g)),
    }));

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/special-groups/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.group) {
          setState((prev) => ({
            ...prev,
            specialCategoryGroups: (prev.specialCategoryGroups || []).map((g) => (g.id === id ? data.group : g)),
          }));
        }
      }
    } catch (e) {
      console.warn('API sync updateSpecialGroup offline', e);
    }
  };

  const deleteSpecialGroup = async (id: string) => {
    setState((prev) => ({
      ...prev,
      specialCategoryGroups: (prev.specialCategoryGroups || []).filter((g) => g.id !== id),
    }));

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('freshcart_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/special-groups/${id}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.warn('API sync deleteSpecialGroup offline', e);
    }
  };

  const updateCoupon = async (code: string, updated: Partial<Coupon>) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) => (c.code === code ? { ...c, ...updated } : c)),
    }));
    try {
      await fetch(`/api/coupons/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('API sync updateCoupon offline', e);
    }
  };

  const addCoupon = async (coupon: Coupon) => {
    setState((prev) => ({
      ...prev,
      coupons: [coupon, ...prev.coupons],
    }));
    try {
      await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon)
      });
    } catch (e) {
      console.warn('API sync addCoupon offline', e);
    }
  };

  const deleteCoupon = async (code: string) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((c) => c.code !== code),
    }));
    try {
      await fetch(`/api/coupons/${code}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API sync deleteCoupon offline', e);
    }
  };

  const updateBlog = async (id: string, updated: Partial<Blog>) => {
    setState((prev) => ({
      ...prev,
      blogs: prev.blogs.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
    try {
      await fetch(`/api/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.warn('API sync updateBlog offline', e);
    }
  };

  const addBlog = async (blog: Blog) => {
    setState((prev) => ({
      ...prev,
      blogs: [blog, ...prev.blogs],
    }));
    try {
      await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blog)
      });
    } catch (e) {
      console.warn('API sync addBlog offline', e);
    }
  };

  const deleteBlog = async (id: string) => {
    setState((prev) => ({
      ...prev,
      blogs: prev.blogs.filter((b) => b.id !== id),
    }));
    try {
      await fetch(`/api/blogs/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('API sync deleteBlog offline', e);
    }
  };

  const addBlogComment = (blogId: string, comment: Omit<Comment, 'id' | 'date'>) => {
    const fullComment: Comment = {
      id: 'comment_' + Date.now(),
      authorName: comment.authorName,
      content: comment.content,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    setState((prev) => ({
      ...prev,
      blogs: prev.blogs.map((b) =>
        b.id === blogId ? { ...b, comments: [...b.comments, fullComment] } : b
      ),
    }));
  };

  const updateFAQ = (id: string, updated: Partial<FAQ>) => {
    setState((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    }));
  };

  const addFAQ = (faq: FAQ) => {
    setState((prev) => ({
      ...prev,
      faqs: [faq, ...prev.faqs],
    }));
  };

  const deleteFAQ = (id: string) => {
    setState((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((f) => f.id !== id),
    }));
  };

  const updateTestimonial = (id: string, updated: Partial<Testimonial>) => {
    setState((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  };

  const addTestimonial = (testimonial: Testimonial) => {
    setState((prev) => ({
      ...prev,
      testimonials: [testimonial, ...prev.testimonials],
    }));
  };

  const deleteTestimonial = (id: string) => {
    setState((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((t) => t.id !== id),
    }));
  };

  const updateStore = (id: string, updated: Partial<Store>) => {
    setState((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => (s.id === id ? { ...s, ...updated } : s)),
    }));
  };

  const updateJob = (id: string, updated: Partial<Job>) => {
    setState((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) => (j.id === id ? { ...j, ...updated } : j)),
    }));
  };

  const updateSEOSettings = (pageKey: string, updated: SEOMetadata) => {
    setState((prev) => ({
      ...prev,
      seoSettings: {
        ...prev.seoSettings,
        [pageKey]: updated,
      },
    }));
  };

  const resetToDefaults = () => {
    setState({
      banners: defaultBanners,
      categories: defaultCategories,
      specialCategoryGroups: defaultSpecialGroups,
      products: defaultProducts,
      coupons: defaultCoupons,
      blogs: defaultBlogs,
      testimonials: defaultTestimonials,
      faqs: defaultFAQs,
      stores: defaultStores,
      jobs: defaultJobs,
      seoSettings: defaultSEOSettings,
    });
  };

  const uploadImage = async (fileBase64OrUri: string, folder?: string): Promise<string> => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: fileBase64OrUri, folder: folder || 'freshcart' }),
      });
      const data = await response.json();
      if (data.success && data.url) {
        return data.url;
      }
      throw new Error(data.message || 'Cloudinary upload failed');
    } catch (err: any) {
      console.error('Image upload error:', err);
      throw err;
    }
  };

  return (
    <CMSContext.Provider
      value={{
        ...state,
        activeHub,
        setActiveHub,
        activeHeroBannerIndex,
        setActiveHeroBannerIndex,
        homeSelectedSubCategories,
        updateHomeSubCategories,
        toggleHomeSubCategory,
        userLocation,
        updateUserLocation,
        addBanner,
        updateBanner,
        deleteBanner,
        updateProduct,
        addProduct,
        deleteProduct,
        updateCategory,
        addCategory,
        deleteCategory,
        moveCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        addSpecialGroup,
        updateSpecialGroup,
        deleteSpecialGroup,
        updateCoupon,
        addCoupon,
        deleteCoupon,
        updateBlog,
        addBlog,
        deleteBlog,
        addBlogComment,
        updateFAQ,
        addFAQ,
        deleteFAQ,
        updateTestimonial,
        addTestimonial,
        deleteTestimonial,
        updateStore,
        updateJob,
        updateSEOSettings,
        resetToDefaults,
        uploadImage,
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return context;
};
