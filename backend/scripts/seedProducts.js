import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Product, Category } from '../src/models/Catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/freshcart';

const categoriesToSeed = [
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

const productsToSeed = [
  // ================= 1. FRUITS & VEGETABLES =================
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

  // ================= 2. DAIRY, BREAD & EGGS =================
  // Milk
  { id: 'p_dbe_m1', name: 'Amul Taaza Homogenised Toned Milk', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 3200, price: 54, mrp: 56, discountText: 'Best Value', weightOptions: ['1L'], defaultWeight: '1L', description: 'Pasteurized toned milk.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m2', name: 'Nandini GoodLife Pure Cow Milk', brand: 'Nandini', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 2400, price: 52, mrp: 55, discountText: '5% OFF', weightOptions: ['1L'], defaultWeight: '1L', description: 'Pure cow milk in Tetra Pak.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m3', name: 'Mother Dairy Full Cream Milk', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.8, reviewsCount: 1540, price: 66, mrp: 68, discountText: 'Fresh Daily', weightOptions: ['1L'], defaultWeight: '1L', description: 'Rich full cream milk.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m4', name: 'Country Delight Farm A2 Cow Milk', brand: 'Country Delight', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 980, price: 85, mrp: 95, discountText: '₹10 OFF', weightOptions: ['1L'], defaultWeight: '1L', description: 'Natural unadulterated A2 milk.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_m5', name: 'Amul Gold Buffalo Full Cream Milk', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', rating: 4.9, reviewsCount: 1890, price: 68, mrp: 70, discountText: 'Best Value', weightOptions: ['1L'], defaultWeight: '1L', description: 'Thick buffalo milk for tea and sweets.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },

  // Breads & Buns
  { id: 'p_dbe_b1', name: 'Britannia 100% Whole Wheat Bread', brand: 'Britannia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 1420, price: 45, mrp: 50, discountText: '10% OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Soft 100% brown wheat loaf.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b2', name: 'English Oven Multigrain Bread', brand: 'English Oven', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 620, price: 55, mrp: 65, discountText: '15% OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Nine-grain healthy loaf.', imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b3', name: 'Modern Soft White Sandwich Bread', brand: 'Modern', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.7, reviewsCount: 890, price: 38, mrp: 42, discountText: '₹4 OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Classic white sandwich bread.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b4', name: 'Bakehouse Sesame Burger Buns', brand: 'Bakehouse', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.8, reviewsCount: 310, price: 40, mrp: 50, discountText: '20% OFF', weightOptions: ['4 pcs'], defaultWeight: '4 pcs', description: 'Soft bakery burger buns.', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_b5', name: 'Fresh Ladi Pav Buns', brand: 'Bakehouse', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', rating: 4.9, reviewsCount: 780, price: 30, mrp: 35, discountText: '14% OFF', weightOptions: ['6 pcs'], defaultWeight: '6 pcs', description: 'Soft ladi pav for vada pav & bhaji.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop' },

  // Eggs
  { id: 'p_dbe_e1', name: 'Eggoz Herbal Brown Eggs', brand: 'Eggoz', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.9, reviewsCount: 880, price: 115, mrp: 140, discountText: '₹25 OFF', weightOptions: ['12 pcs'], defaultWeight: '12 pcs', description: 'Cage-free organic brown eggs.', imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e2', name: 'Fresh Farm Table White Eggs', brand: 'FreshFarm', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.8, reviewsCount: 1540, price: 195, mrp: 220, discountText: '₹25 OFF', weightOptions: ['30 pcs tray'], defaultWeight: '30 pcs tray', description: 'Clean farm white eggs.', imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e3', name: 'UPF Omega-3 Enriched Eggs', brand: 'UPF', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.8, reviewsCount: 420, price: 75, mrp: 90, discountText: '16% OFF', weightOptions: ['6 pcs'], defaultWeight: '6 pcs', description: 'Omega-3 enriched eggs.', imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e4', name: 'Organic Free Range Country Eggs', brand: 'FarmFresh', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.9, reviewsCount: 310, price: 95, mrp: 120, discountText: '20% OFF', weightOptions: ['6 pcs'], defaultWeight: '6 pcs', description: 'Pasture raised free-range desi eggs.', imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_e5', name: 'Quail Eggs Specialty Pack', brand: 'ExoFarm', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', rating: 4.7, reviewsCount: 190, price: 85, mrp: 105, discountText: '19% OFF', weightOptions: ['12 pcs'], defaultWeight: '12 pcs', description: 'Nutritious specialty quail eggs.', imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop' },

  // Curd & Probiotic Drinks
  { id: 'p_dbe_c1', name: 'Amul Masti Dahi Tub 400g', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', rating: 4.9, reviewsCount: 2100, price: 40, mrp: 45, discountText: '₹5 OFF', weightOptions: ['400g'], defaultWeight: '400g', description: 'Thick pasteurized curd tub.', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_c2', name: 'Yakult Probiotic Health Drink', brand: 'Yakult', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', rating: 4.9, reviewsCount: 1450, price: 80, mrp: 90, discountText: '11% OFF', weightOptions: ['5 bottles x 65ml'], defaultWeight: '5 bottles x 65ml', description: 'Probiotic drink for gut health.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_c3', name: 'Milky Mist Pouch Curd 1kg', brand: 'Milky Mist', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', rating: 4.8, reviewsCount: 980, price: 75, mrp: 85, discountText: '12% OFF', weightOptions: ['1kg'], defaultWeight: '1kg', description: 'Thick set pouch curd.', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_c4', name: 'Mother Dairy Mango Lassi', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', rating: 4.8, reviewsCount: 650, price: 25, mrp: 30, discountText: '16% OFF', weightOptions: ['200ml'], defaultWeight: '200ml', description: 'Delicious mango lassi drink.', imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_c5', name: 'Epigamia Greek Yogurt Blueberry', brand: 'Epigamia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', rating: 4.9, reviewsCount: 820, price: 60, mrp: 70, discountText: '14% OFF', weightOptions: ['90g'], defaultWeight: '90g', description: 'High protein Greek yogurt with real fruit.', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop' },

  // Paneer & Cream
  { id: 'p_dbe_p1', name: 'Amul Fresh Malai Paneer', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', rating: 4.9, reviewsCount: 2800, price: 95, mrp: 105, discountText: '₹10 OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Soft malai cottage cheese.', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_p2', name: 'Milky Mist Low Fat Paneer', brand: 'Milky Mist', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', rating: 4.8, reviewsCount: 640, price: 98, mrp: 110, discountText: '11% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'High protein low fat paneer.', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_p3', name: 'Amul Fresh Cooking Cream', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', rating: 4.8, reviewsCount: 1100, price: 65, mrp: 72, discountText: '₹7 OFF', weightOptions: ['250ml'], defaultWeight: '250ml', description: 'Low fat fresh cream for curries & desserts.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_p4', name: 'Nandini Fresh Malai Paneer', brand: 'Nandini', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', rating: 4.8, reviewsCount: 890, price: 90, mrp: 100, discountText: '10% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Pure cow milk paneer cubes.', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_p5', name: 'Mother Dairy Heavy Whipping Cream', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', rating: 4.7, reviewsCount: 390, price: 75, mrp: 85, discountText: '12% OFF', weightOptions: ['200ml'], defaultWeight: '200ml', description: 'Rich cream for baking and cooking.', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop' },

  // Butter
  { id: 'p_dbe_bt1', name: 'Amul Pasteurised Salted Butter 500g', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Butter', rating: 4.9, reviewsCount: 4500, price: 275, mrp: 290, discountText: '5% OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Classic salted butter pack.', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_bt2', name: 'Delicious White Unsalted Butter', brand: 'Delicious', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Butter', rating: 4.8, reviewsCount: 520, price: 110, mrp: 125, discountText: '12% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Fresh white makhan for parathas.', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_bt3', name: 'Nutralite Garlic & Herbs Butter', brand: 'Nutralite', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Butter', rating: 4.7, reviewsCount: 380, price: 65, mrp: 75, discountText: '13% OFF', weightOptions: ['100g'], defaultWeight: '100g', description: 'Flavored garlic butter spread.', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_bt4', name: 'Amul Unsalted Cooking Butter', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Butter', rating: 4.8, reviewsCount: 890, price: 115, mrp: 125, discountText: '₹10 OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Unsalted butter for baking.', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_bt5', name: 'Mother Dairy Salted Butter 500g', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Butter', rating: 4.8, reviewsCount: 960, price: 270, mrp: 290, discountText: '₹20 OFF', weightOptions: ['500g'], defaultWeight: '500g', description: 'Rich table butter.', imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop' },

  // Cheese
  { id: 'p_dbe_ch1', name: 'Amul Processed Cheese Slices', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Cheese', rating: 4.9, reviewsCount: 3100, price: 140, mrp: 155, discountText: '10% OFF', weightOptions: ['200g / 10 slices'], defaultWeight: '200g / 10 slices', description: 'Individually wrapped cheese slices.', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_ch2', name: 'Britannia Processed Cheese Block', brand: 'Britannia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Cheese', rating: 4.8, reviewsCount: 1120, price: 135, mrp: 150, discountText: '10% OFF', weightOptions: ['200g block'], defaultWeight: '200g block', description: 'Gratable cheese block.', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_ch3', name: 'Dlecta Shredded Mozzarella Cheese', brand: 'Dlecta', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Cheese', rating: 4.8, reviewsCount: 750, price: 180, mrp: 210, discountText: '14% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Melty mozzarella for pizzas.', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_ch4', name: 'Amul Creamy Cheese Spread Plain', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Cheese', rating: 4.9, reviewsCount: 1890, price: 95, mrp: 105, discountText: '₹10 OFF', weightOptions: ['200g tub'], defaultWeight: '200g tub', description: 'Smooth cheese spread for bread.', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop' },
  { id: 'p_dbe_ch5', name: 'Go Processed Cheese Cubes', brand: 'Go Cheese', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Cheese', rating: 4.7, reviewsCount: 620, price: 125, mrp: 140, discountText: '11% OFF', weightOptions: ['200g'], defaultWeight: '200g', description: 'Pre-cut cheese cubes.', imageUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop' }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB database.');

    // Upsert Categories into MongoDB
    await Category.deleteMany({});
    await Category.insertMany(categoriesToSeed);
    console.log(`📁 Seeded ${categoriesToSeed.length} categories into MongoDB.`);

    // Upsert Products into MongoDB
    await Product.deleteMany({});
    const inserted = await Product.insertMany(productsToSeed);
    console.log(`🎉 Successfully seeded ${inserted.length} distinct products into MongoDB!`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding database:', err.message);
    process.exit(1);
  }
};

seedDB();
