import React, { createContext, useContext, useState, useEffect } from 'react';

// Interfaces for our CMS models
export interface SubCategory {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
}

export interface Category {
  id: string;
  slug?: string;
  name: string;
  icon: string;
  color: string;
  subCategories?: SubCategory[];
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
  active: boolean;
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

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  phone: string;
  capacity?: number;
  zone?: string;
  coordinates: { lat: number; lng: number };
  pincodes: string[];
}

export interface CMSState {
  banners: Banner[];
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  blogs: Blog[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  stores: Store[];
  jobs: Job[];
  seoSettings: Record<string, SEOMetadata>;
  warehouses: Warehouse[];
}

interface CMSContextProps extends CMSState {
  activeHub: string;
  setActiveHub: (hub: string) => void;
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
  addSubCategory: (categoryId: string, subCategoryName: string) => void;
  updateSubCategory: (categoryId: string, subCategoryNameOrId: string, updatedName: string) => void;
  deleteSubCategory: (categoryId: string, subCategoryNameOrId: string) => void;
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
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (id: string, updated: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  uploadImage: (fileBase64OrUri: string, folder?: string) => Promise<string>;
}

const CMSContext = createContext<CMSContextProps | undefined>(undefined);

// Initial default data mirroring Flutter app models and assets
const defaultBanners: Banner[] = [
  {
    id: 'banner_1',
    title: 'Weekend Organic Freshness',
    subtitle: 'Up to 30% OFF on Fresh Greens & Organic Vegetables',
    tag: 'FLASH SALE',
    gradient: ['#10B981', '#059669'],
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
    buttonText: 'Shop Organic',
    linkUrl: '/products?category=cat_organic',
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

export const getCategoryImage = (cat: any) => {
  if (cat?.icon && (cat.icon.startsWith('http://') || cat.icon.startsWith('https://') || cat.icon.startsWith('data:') || cat.icon.startsWith('/'))) {
    return cat.icon;
  }
  if (cat?.imageUrl && (cat.imageUrl.startsWith('http://') || cat.imageUrl.startsWith('https://') || cat.imageUrl.startsWith('data:') || cat.imageUrl.startsWith('/'))) {
    return cat.imageUrl;
  }
  const nameLower = (cat?.name || '').toLowerCase();
  if (nameLower.includes('fruit') || nameLower.includes('veg')) return 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=300&auto=format&fit=crop';
  if (nameLower.includes('dairy') || nameLower.includes('milk') || nameLower.includes('egg')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop';
  if (nameLower.includes('atta') || nameLower.includes('rice') || nameLower.includes('dal') || nameLower.includes('oil')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop';
  if (nameLower.includes('meat') || nameLower.includes('fish') || nameLower.includes('seafood')) return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=300&auto=format&fit=crop';
  if (nameLower.includes('snack') || nameLower.includes('biscuit') || nameLower.includes('cookie') || nameLower.includes('sweet') || nameLower.includes('chocolate')) return 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&auto=format&fit=crop';
  if (nameLower.includes('drink') || nameLower.includes('beverage') || nameLower.includes('tea') || nameLower.includes('coffee')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop';
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cereal') || nameLower.includes('sauce') || nameLower.includes('breakfast')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&auto=format&fit=crop';
  if (nameLower.includes('ice') || nameLower.includes('kulfi') || nameLower.includes('frozen') || nameLower.includes('dessert')) return 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=300&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop';
};

const defaultCategories: Category[] = [
  { id: 'cat_organic', name: 'Organic', icon: 'Leaf', color: '#34C759', productCount: 12 },
  { id: 'cat_veg', name: 'Vegetables', icon: 'Carrot', color: '#4CAF50', productCount: 18 },
  { id: 'cat_fruits', name: 'Fruits', icon: 'Apple', color: '#FF9500', productCount: 15 },
  { id: 'cat_bakery', name: 'Bakery', icon: 'Croissant', color: '#8E8E93', productCount: 10 },
  { id: 'cat_dairy', name: 'Dairy', icon: 'Milk', color: '#007AFF', productCount: 14 },
  { id: 'cat_meat', name: 'Meat & Seafood', icon: 'Beef', color: '#FFFF3B30', productCount: 8 },
  { id: 'cat_snacks', name: 'Snacks', icon: 'Cookie', color: '#AF52DE', productCount: 22 },
  { id: 'cat_drinks', name: 'Beverages', icon: 'CupSoda', color: '#5AC8FA', productCount: 16 },
];

const defaultProducts: Product[] = [
  {
    id: 'prod_org_1',
    name: 'Organic Baby Spinach',
    brand: 'Earth Greens',
    categoryId: 'cat_organic',
    rating: 4.8,
    reviewsCount: 320,
    price: 99.0,
    mrp: 120.0,
    discountText: '17% OFF',
    weightOptions: ['150g', '300g'],
    defaultWeight: '150g',
    description: 'Farm-fresh organic baby spinach leaves, pre-washed and ready to eat. Perfect for salads, smoothies, or sautéing. Packed with Iron and Vitamins A & C.',
    nutritionFacts: { 'Calories': '23 kcal', 'Protein': '2.9g', 'Carbs': '3.6g', 'Fiber': '2.2g' },
    ingredients: ['Organic Baby Spinach'],
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop',
    isFreshPick: true,
  },
  {
    id: 'prod_org_2',
    name: 'Organic Hass Avocados',
    brand: 'Natures Choice',
    categoryId: 'cat_organic',
    rating: 4.7,
    reviewsCount: 412,
    price: 249.0,
    mrp: 299.0,
    discountText: '₹50 OFF',
    weightOptions: ['2 pcs', '4 pcs'],
    defaultWeight: '2 pcs',
    description: 'Rich, creamy organic Hass avocados sourced directly from organic orchards. High in healthy monounsaturated fats, potassium, and dietary fiber.',
    nutritionFacts: { 'Calories': '160 kcal', 'Protein': '2g', 'Fat': '15g', 'Fiber': '7g' },
    ingredients: ['Organic Avocado'],
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop',
    isBestSeller: true,
  },
  {
    id: 'prod_org_3',
    name: 'Organic Raw Honey',
    brand: 'Golden Farms',
    categoryId: 'cat_organic',
    rating: 4.9,
    reviewsCount: 154,
    price: 199.0,
    mrp: 250.0,
    discountText: '20% OFF',
    weightOptions: ['250g', '500g'],
    defaultWeight: '250g',
    description: '100% pure, raw, unpasteurized organic honey collected from wildflowers. Rich in natural antioxidants and enzymes.',
    nutritionFacts: { 'Calories': '64 kcal', 'Protein': '0g', 'Carbs': '17g', 'Sugars': '16g' },
    ingredients: ['Organic Wildflower Honey'],
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod_veg_1',
    name: 'Fresh Cherry Tomatoes',
    brand: 'FarmDirect',
    categoryId: 'cat_veg',
    rating: 4.6,
    reviewsCount: 180,
    price: 59.0,
    mrp: 75.0,
    discountText: '21% OFF',
    weightOptions: ['250g', '500g'],
    defaultWeight: '250g',
    description: 'Sweet, juicy vine-ripened cherry tomatoes. Excellent for salads, roasting, or snacking straight out of the box.',
    nutritionFacts: { 'Calories': '18 kcal', 'Protein': '0.9g', 'Carbs': '3.9g', 'Vitamin C': '20%' },
    ingredients: ['Cherry Tomatoes'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop',
    isFreshPick: true,
  },
  {
    id: 'prod_veg_2',
    name: 'Organic Broccoli Crowns',
    brand: 'Earth Greens',
    categoryId: 'cat_veg',
    rating: 4.5,
    reviewsCount: 220,
    price: 89.0,
    mrp: 110.0,
    discountText: '19% OFF',
    weightOptions: ['250g', '500g'],
    defaultWeight: '250g',
    description: 'Fresh broccoli crowns with compact florets and crisp stalks. Packed with antioxidants, vitamin K, and vitamin C.',
    nutritionFacts: { 'Calories': '34 kcal', 'Protein': '2.8g', 'Carbs': '6.6g', 'Fiber': '2.6g' },
    ingredients: ['Organic Broccoli'],
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=800&auto=format&fit=crop',
    isFreshPick: true,
  },
  {
    id: 'prod_fruit_1',
    name: 'Royal Gala Apples',
    brand: 'AppleCorp',
    categoryId: 'cat_fruits',
    rating: 4.9,
    reviewsCount: 890,
    price: 189.0,
    mrp: 240.0,
    discountText: '₹51 OFF',
    weightOptions: ['500g', '1kg'],
    defaultWeight: '500g',
    description: 'Crisp, sweet, and aromatic Royal Gala apples imported from select orchards. Excellent source of dietary fiber and vitamin C.',
    nutritionFacts: { 'Calories': '52 kcal', 'Protein': '0.3g', 'Carbs': '14g', 'Fiber': '2.4g' },
    ingredients: ['Gala Apples'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop',
    isBestSeller: true,
  },
  {
    id: 'prod_dairy_1',
    name: 'Premium Greek Yogurt',
    brand: 'DairyGold',
    categoryId: 'cat_dairy',
    rating: 4.8,
    reviewsCount: 450,
    price: 75.0,
    mrp: 90.0,
    discountText: '16% OFF',
    weightOptions: ['200g', '400g'],
    defaultWeight: '200g',
    description: 'Thick, creamy, and high-protein Greek yogurt. Sourced from grass-fed cows. Contains active live probiotic cultures for digestive health.',
    nutritionFacts: { 'Calories': '130 kcal', 'Protein': '15g', 'Carbs': '6g', 'Calcium': '20%' },
    ingredients: ['Pasteurized Milk', 'Active Yogurt Cultures'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop',
    isBestSeller: true,
  },
  {
    id: 'prod_bak_1',
    name: 'Sourdough Country Loaf',
    brand: 'Bakehouse',
    categoryId: 'cat_bakery',
    rating: 4.9,
    reviewsCount: 150,
    price: 120.0,
    mrp: 140.0,
    discountText: '₹20 OFF',
    weightOptions: ['400g slice', 'Whole Loaf'],
    defaultWeight: '400g slice',
    description: 'Artisanal sourdough loaf baked daily. Golden, crispy crust with a soft, airy, and tangy interior. Leavened with wild natural yeast.',
    nutritionFacts: { 'Calories': '220 kcal', 'Protein': '8g', 'Carbs': '45g', 'Fiber': '2g' },
    ingredients: ['Wheat Flour', 'Wild Yeast Starter', 'Water', 'Sea Salt'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop',
    isBestSeller: true,
  },
  {
    id: 'prod_snack_3',
    name: 'Premium Mixed Nuts Pack',
    brand: 'NutriBites',
    categoryId: 'cat_snacks',
    rating: 4.8,
    reviewsCount: 215,
    price: 249.0,
    mrp: 299.0,
    discountText: '16% OFF',
    weightOptions: ['200g'],
    defaultWeight: '200g',
    description: 'A premium, healthy mixture of almonds, cashews, pistachios, and walnuts, lightly roasted to perfection.',
    nutritionFacts: { 'Calories': '607 kcal', 'Protein': '20g', 'Fat': '54g', 'Carbs': '21g' },
    ingredients: ['Almonds', 'Cashews', 'Pistachios', 'Walnuts'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod_meat_2',
    name: 'Premium Salmon Fillet',
    brand: 'SeaFresh',
    categoryId: 'cat_meat',
    rating: 4.9,
    reviewsCount: 194,
    price: 899.0,
    mrp: 999.0,
    discountText: '₹100 OFF',
    weightOptions: ['250g', '500g'],
    defaultWeight: '250g',
    description: 'Premium fresh-water Atlantic salmon fillet. Rich in heart-healthy Omega-3 fatty acids, tender texture and rich flavor.',
    nutritionFacts: { 'Calories': '208 kcal', 'Protein': '20g', 'Fat': '13g', 'Sodium': '59mg' },
    ingredients: ['Salmon Fillet'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop',
    isBestSeller: true,
  },
  {
    id: 'prod_drink_1',
    name: 'Sparkling Apple Juice',
    brand: 'FizzCider',
    categoryId: 'cat_drinks',
    rating: 4.7,
    reviewsCount: 192,
    price: 120.0,
    mrp: 150.0,
    discountText: '20% OFF',
    weightOptions: ['330ml', '750ml'],
    defaultWeight: '330ml',
    description: 'Refreshing sparkling juice made from 100% organic apples. Non-alcoholic, with no added sweeteners or colors.',
    nutritionFacts: { 'Calories': '120 kcal', 'Carbs': '29g', 'Sugars': '28g', 'Vitamin C': '10%' },
    ingredients: ['Apple Juice', 'Carbonated Water'],
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod_drink_2',
    name: 'Premium Cold Brew Coffee',
    brand: 'BrewLab',
    categoryId: 'cat_drinks',
    rating: 4.8,
    reviewsCount: 220,
    price: 160.0,
    mrp: 180.0,
    discountText: '11% OFF',
    weightOptions: ['250ml', '500ml'],
    defaultWeight: '250ml',
    description: 'Artisanal cold brew coffee steeped for 18 hours using single-origin Arabica beans. Bold, smooth flavor with low acidity.',
    nutritionFacts: { 'Calories': '5 kcal', 'Carbs': '0g', 'Protein': '0g', 'Caffeine': '150mg' },
    ingredients: ['Cold Brew Coffee (Water, Arabica Coffee Beans)'],
    isOrganic: false,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop',
  }
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
  const [activeHub, setActiveHubState] = useState<string>(() => {
    return localStorage.getItem('freshcart_active_hub') || 'wh_bengaluru';
  });

  const setActiveHub = (hub: string) => {
    setActiveHubState(hub);
    localStorage.setItem('freshcart_active_hub', hub);
  };

  const defaultWarehouses: Warehouse[] = [
    { id: 'wh_bengaluru', name: '🌳 Bengaluru Hub', address: '12, 100 Feet Rd, Indiranagar, Bengaluru, KA 560038', phone: '+91 80 4910 2000', capacity: 15000, zone: 'Bengaluru Zone', coordinates: { lat: 12.9716, lng: 77.5946 }, pincodes: ['560038', '560102', '560103'] },
    { id: 'wh_mumbai', name: '🏙️ Mumbai Hub', address: 'A-2, Link Road, Bandra West, Mumbai, MH 400050', phone: '+91 22 4910 3000', capacity: 20000, zone: 'Mumbai Zone', coordinates: { lat: 19.076, lng: 72.877 }, pincodes: ['400001', '400011', '400050'] },
    { id: 'wh_delhi', name: '🕌 Delhi NCR Hub', address: '45, Barakhamba Rd, Connaught Place, New Delhi, DL 110001', phone: '+91 11 4910 4000', capacity: 18000, zone: 'Delhi NCR Zone', coordinates: { lat: 28.613, lng: 77.209 }, pincodes: ['110001', '110011', '110020'] }
  ];

  const [state, setState] = useState<CMSState>(() => {
    const cached = localStorage.getItem('freshcart_cms_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          warehouses: parsed.warehouses && parsed.warehouses.length ? parsed.warehouses : defaultWarehouses
        };
      } catch (e) {
        console.error('Failed to parse cached CMS data', e);
      }
    }
    return {
      banners: defaultBanners,
      categories: defaultCategories,
      products: defaultProducts,
      coupons: defaultCoupons,
      blogs: defaultBlogs,
      testimonials: defaultTestimonials,
      faqs: defaultFAQs,
      stores: defaultStores,
      jobs: defaultJobs,
      seoSettings: defaultSEOSettings,
      warehouses: defaultWarehouses,
    };
  });

  useEffect(() => {
    localStorage.setItem('freshcart_cms_data', JSON.stringify(state));
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

        const [pData, cData, cpData, bData, wData] = await Promise.all([
          fetchJson('http://localhost:5000/api/products').catch(() => null),
          fetchJson('http://localhost:5000/api/categories').catch(() => null),
          fetchJson('http://localhost:5000/api/coupons').catch(() => null),
          fetchJson('http://localhost:5000/api/blogs').catch(() => null),
          fetchJson('http://localhost:5000/api/warehouses').catch(() => null),
        ]);

        clearTimeout(timeoutId);

        setState((prev) => ({
          ...prev,
          products: pData?.success && pData.products?.length ? pData.products : prev.products,
          categories: cData?.success && cData.categories?.length ? cData.categories : prev.categories,
          coupons: cpData?.success && cpData.coupons?.length ? cpData.coupons : prev.coupons,
          blogs: bData?.success && bData.blogs?.length ? bData.blogs : prev.blogs,
          warehouses: wData?.success && wData.warehouses?.length ? wData.warehouses : prev.warehouses,
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
      try { return JSON.parse(saved); } catch (e) {}
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
      try { return JSON.parse(saved); } catch (e) {}
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

  const addBanner = (banner: Banner) => {
    setState((prev) => ({
      ...prev,
      banners: [...prev.banners, banner],
    }));
  };

  const deleteBanner = (id: string) => {
    setState((prev) => ({
      ...prev,
      banners: prev.banners.filter((b) => b.id !== id),
    }));
  };

  const updateBanner = (id: string, updated: Partial<Banner>) => {
    setState((prev) => ({
      ...prev,
      banners: prev.banners.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }));
  };

  const addProduct = (product: Product) => {
    setState((prev) => ({
      ...prev,
      products: [product, ...prev.products],
    }));
  };

  const deleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const updateCategory = (id: string, updated: Partial<Category>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        const isMatch = c.id === id || c.slug === id || (c as any)._id === id || (c.name && c.name.toLowerCase() === id.toLowerCase());
        return isMatch ? { ...c, ...updated } : c;
      }),
    }));
  };

  const addCategory = (category: Category) => {
    setState((prev) => ({
      ...prev,
      categories: [category, ...prev.categories],
    }));
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id && c.slug !== id && (c as any)._id !== id && (c.name && c.name.toLowerCase() !== id.toLowerCase())),
    }));
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

      return {
        ...prev,
        categories: newCategories,
      };
    });
  };

  const addSubCategory = (categoryId: string, subCategoryName: string) => {
    const subSlug = subCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newSub = { id: 'sub_' + Date.now(), name: subCategoryName, slug: subSlug, icon: 'Leaf' };

    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => {
        if (c.id === categoryId || c.slug === categoryId) {
          const subs = c.subCategories || [];
          return { ...c, subCategories: [...subs, newSub] };
        }
        return c;
      })
    }));
  };

  const deleteSubCategory = (categoryId: string, subCategoryNameOrId: string) => {
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
  };

  const updateCoupon = (code: string, updated: Partial<Coupon>) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) => (c.code === code ? { ...c, ...updated } : c)),
    }));
  };

  const addCoupon = (coupon: Coupon) => {
    setState((prev) => ({
      ...prev,
      coupons: [coupon, ...prev.coupons],
    }));
  };

  const deleteCoupon = (code: string) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((c) => c.code !== code),
    }));
  };

  const updateBlog = (id: string, updated: Partial<Blog>) => {
    setState((prev) => ({
      ...prev,
      blogs: prev.blogs.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
  };

  const addBlog = (blog: Blog) => {
    setState((prev) => ({
      ...prev,
      blogs: [blog, ...prev.blogs],
    }));
  };

  const deleteBlog = (id: string) => {
    setState((prev) => ({
      ...prev,
      blogs: prev.blogs.filter((b) => b.id !== id),
    }));
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

  const addWarehouse = (warehouse: Warehouse) => {
    setState((prev) => ({
      ...prev,
      warehouses: [warehouse, ...prev.warehouses],
    }));
  };

  const updateWarehouse = (id: string, updated: Partial<Warehouse>) => {
    setState((prev) => ({
      ...prev,
      warehouses: prev.warehouses.map((w) => (w.id === id ? { ...w, ...updated } : w)),
    }));
  };

  const deleteWarehouse = (id: string) => {
    setState((prev) => ({
      ...prev,
      warehouses: prev.warehouses.filter((w) => w.id !== id),
    }));
  };

  const resetToDefaults = () => {
    setState({
      banners: defaultBanners,
      categories: defaultCategories,
      products: defaultProducts,
      coupons: defaultCoupons,
      blogs: defaultBlogs,
      testimonials: defaultTestimonials,
      faqs: defaultFAQs,
      stores: defaultStores,
      jobs: defaultJobs,
      seoSettings: defaultSEOSettings,
      warehouses: defaultWarehouses,
    });
  };

  const uploadImage = async (fileBase64OrUri: string, folder?: string): Promise<string> => {
    try {
      const response = await fetch('http://localhost:5000/api/upload', {
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
        deleteSubCategory,
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
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
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
