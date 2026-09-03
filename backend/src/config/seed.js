import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Category, Product, Brand, SuperCategory } from '../models/Catalog.js';
import { Coupon, Offer } from '../models/Finance.js';
import { Blog, Settings } from '../models/Operations.js';
import { Customer } from '../models/Customer.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';

// In production we never wipe-and-reseed catalog data on boot — that footgun
// could destroy a live catalog if counts ever dipped below the thresholds below.
const ALLOW_DESTRUCTIVE_RESEED = process.env.NODE_ENV !== 'production';

export const seedDatabase = async () => {
  try {
    // 1. Seed Users for all roles
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const rolesToSeed = [
        { name: 'FreshCart Admin', email: 'admin@freshcart.com', password: 'admin123', role: 'Admin' },
        { name: 'FreshCart Manager', email: 'manager@freshcart.com', password: 'manager123', role: 'Manager' },
        { name: 'FreshCart Employee', email: 'employee@freshcart.com', password: 'employee123', role: 'Employee' },
        { name: 'FreshCart Delivery Partner', email: 'delivery@freshcart.com', password: 'delivery123', role: 'Delivery' },
        { name: 'FreshCart Retail Customer', email: 'customer@freshcart.com', password: 'customer123', role: 'Customer' }
      ];

      for (const u of rolesToSeed) {
        const createdUser = await User.create({
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          status: 'Active'
        });
        
        // If it's a customer, also seed the Customer Profile details
        if (u.role === 'Customer') {
          await Customer.create({
            customerId: 'cust_' + createdUser._id.toString().slice(-6),
            name: createdUser.name,
            email: createdUser.email,
            phone: '9876543210',
            referralCode: 'SEEDREF2026',
            walletBalance: 500,
            addresses: [
              {
                type: 'Home',
                street: 'Flat 402, Apple Heights, Sector 12',
                city: 'Bengaluru',
                pincode: '560103'
              }
            ]
          });
        }
      }
      console.log('✅ Seeded users for all roles successfully!');
    }

    // Every Delivery-role user needs a DeliveryPartner profile (idempotent, self-heals).
    const deliveryUsers = await User.find({ role: 'Delivery' }).select('_id phone');
    for (const du of deliveryUsers) {
      const exists = await DeliveryPartner.findOne({ userId: du._id });
      if (!exists) {
        await DeliveryPartner.create({ userId: du._id, phone: du.phone || '' });
        console.log(`✅ Created DeliveryPartner profile for user ${du._id}`);
      }
    }


    // 2. Seed Settings
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({});
      console.log('seeded default application settings.');
    }

    // 4. Seed Categories & Subcategories
    const defaultCategoryImages = {
      'fruits-vegetables': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop',
      'dairy-bread-eggs': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop',
      'atta-rice-oil-dals': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      'meats-fish-eggs': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop',
      'masala-dry-fruits-more': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop',
      'breakfast-cereals-spreads-sauces': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop',
      'packaged-food': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
      'tea-coffee-health-drinks': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop',
      'ice-creams-kulfi-frozen-desserts': 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop',
      'chocolates-indian-sweets': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop'
    };

    const categoryCount = await Category.countDocuments();
    if (categoryCount < 7 && ALLOW_DESTRUCTIVE_RESEED) {
      await Category.deleteMany({}); // refresh categories (non-production only)
      const initialCategories = [
        {
          id: 'fruits-vegetables',
          slug: 'fruits-vegetables',
          name: 'Fruits & Vegetables',
          icon: 'Apple',
          image: defaultCategoryImages['fruits-vegetables'],
          imageUrl: defaultCategoryImages['fruits-vegetables'],
          color: '#22c55e',
          subCategories: [
            "Fresh Vegetables", "New Launches in Fruits & Vegetables", "Fresh Fruits",
            "Exotics & Premium", "Mangoes & Melons", "Organics & Hydroponics",
            "Leafy, Herbs & Seasonings", "Flowers & Leaves", "Bouquets & Plants",
            "Cuts & Sprouts", "Plants & Gardening", "Gardening Accessories", "Frozen Veggies & Pulp"
          ].map((sc, i) => ({ id: `sub_fv_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Leaf' }))
        },
        {
          id: 'dairy-bread-eggs',
          slug: 'dairy-bread-eggs',
          name: 'Dairy, Bread & Eggs',
          icon: 'Milk',
          image: defaultCategoryImages['dairy-bread-eggs'],
          imageUrl: defaultCategoryImages['dairy-bread-eggs'],
          color: '#3b82f6',
          subCategories: [
            "Milk", "Breads & Buns", "Fresh Bakery", "Eggs", "Curd & Probiotic Drinks",
            "Batters & Mixes", "High Protein", "Milk Based Drinks", "Paneer & Cream",
            "Gut Friendly", "Butter", "Cheese", "Indian Breads", "Yogurt & Shrikhand",
            "Gourmet Store", "Vegan Drinks", "Milk Drinks"
          ].map((sc, i) => ({ id: `sub_dbe_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Egg' }))
        },
        {
          id: 'atta-rice-oil-dals',
          slug: 'atta-rice-oil-dals',
          name: 'Atta, Rice, Oil & Dals',
          icon: 'Wheat',
          image: defaultCategoryImages['atta-rice-oil-dals'],
          imageUrl: defaultCategoryImages['atta-rice-oil-dals'],
          color: '#eab308',
          subCategories: [
            "Healthy Picks in Grocery", "Olive & Cold Press Oil", "Oil", "Atta",
            "Besan, Sooji & Maida", "Healthy Atta & Millets", "Healthy Ghee", "Ghee",
            "Dals & Pulses", "Healthy Dal", "Rice & More", "Healthy Rice"
          ].map((sc, i) => ({ id: `sub_arod_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'ShoppingBag' }))
        },
        {
          id: 'breakfast-cereals-spreads-sauces',
          slug: 'breakfast-cereals-spreads-sauces',
          name: 'Breakfast Cereals, Spreads & Sauces',
          icon: 'Coffee',
          image: defaultCategoryImages['breakfast-cereals-spreads-sauces'],
          imageUrl: defaultCategoryImages['breakfast-cereals-spreads-sauces'],
          color: '#f97316',
          subCategories: [
            "Top Picks in Breakfast Cereals, Spreads & Sauces", "Breakfast Cereals",
            "Ketchup & Sauces", "Muesli & Oats", "Honey & Spreads", "Peanut Butter",
            "Batter & Mixes", "Zepto Cafe", "Dates & Seeds"
          ].map((sc, i) => ({ id: `sub_bcss_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Sun' }))
        },
        {
          id: 'tea-coffee-health-drinks',
          slug: 'tea-coffee-health-drinks',
          name: 'Tea, Coffee & Health Drinks',
          icon: 'CupSoup',
          image: defaultCategoryImages['tea-coffee-health-drinks'],
          imageUrl: defaultCategoryImages['tea-coffee-health-drinks'],
          color: '#a855f7',
          subCategories: [
            "Top Picks in Tea, Coffee & Health Drinks", "Tea", "Coffee",
            "Kids' Nutrition", "Adult Nutrition", "Green & Herbal Tea",
            "Cold Coffee & Iced Tea", "Premium Coffee", "Premium Tea", "Zepto Cafe", "Drink Mixes"
          ].map((sc, i) => ({ id: `sub_tchd_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Coffee' }))
        },
        {
          id: 'ice-creams-kulfi-frozen-desserts',
          slug: 'ice-creams-kulfi-frozen-desserts',
          name: 'Ice Creams, Kulfi & Frozen Desserts',
          icon: 'IceCream',
          image: defaultCategoryImages['ice-creams-kulfi-frozen-desserts'],
          imageUrl: defaultCategoryImages['ice-creams-kulfi-frozen-desserts'],
          color: '#ec4899',
          subCategories: [
            "Tubs", "Sticks", "Cones", "Mango Mania", "Guilt Free", "Cups",
            "Cakes, Sandwiches & More", "Kulfi", "Ice Cubes & Ice Pops", "Gourmet Ice Creams"
          ].map((sc, i) => ({ id: `sub_ikfd_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Snowflake' }))
        },
        {
          id: 'chocolates-indian-sweets',
          slug: 'chocolates-indian-sweets',
          name: 'Chocolates & Indian Sweets',
          icon: 'Candy',
          image: defaultCategoryImages['chocolates-indian-sweets'],
          imageUrl: defaultCategoryImages['chocolates-indian-sweets'],
          color: '#84cc16',
          subCategories: [
            "Top Picks in Chocolates & Indian Sweets", "Chocolates", "Premium Chocolates",
            "Indian Mithai", "Pastries & Cakes", "Dessert Mixes", "Dark Chocolates",
            "Candies, Gums & Mints", "Date Bites", "Zepto Cafe"
          ].map((sc, i) => ({ id: `sub_cis_${i+1}`, name: sc, slug: sc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), icon: 'Gift' }))
        }
      ];

      await Category.insertMany(initialCategories);
      console.log('✅ Seeded 7 Zepto Categories with subcategories!');
    }

    // Auto-heal existing MongoDB categories that lack valid HTTP image URLs
    const existingCats = await Category.find();
    for (const cat of existingCats) {
      if (!cat.imageUrl || !cat.imageUrl.startsWith('http')) {
        const fallbackImg = defaultCategoryImages[cat.id] || defaultCategoryImages[cat.slug] || 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop';
        cat.imageUrl = fallbackImg;
        cat.image = fallbackImg;
        await cat.save();
      }
    }

    // 5. Seed Products with Rich Schema (5 products per subcategory)
    const prodCount = await Product.countDocuments();
    if (prodCount < 40 && ALLOW_DESTRUCTIVE_RESEED) {
      await Product.deleteMany({});
      const seedProductsList = [
        // --- MILK (5 Products) ---
        {
          id: 'prod_milk_1', name: 'Amul Taaza Toned Milk', slug: 'amul-taaza-toned-milk', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', price: 27, originalPrice: 28, mrp: 28, discount: '₹1 OFF', discountPercentage: 4, netQuantity: '500 ml', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600'], imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Calcium Rich', 'Daily Nutrition'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '2 days' }, stock: { status: 'In Stock', quantity: 150 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 890
        },
        {
          id: 'prod_milk_2', name: 'Nandini Pasteurized Toned Milk', slug: 'nandini-toned-milk', brand: 'Nandini', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', price: 24, originalPrice: 25, mrp: 25, discount: '₹1 OFF', discountPercentage: 4, netQuantity: '500 ml', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600'], imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Freshness', 'Protein'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '2 days' }, stock: { status: 'In Stock', quantity: 120 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 430
        },
        {
          id: 'prod_milk_3', name: 'Country Delight Farm Fresh Cow Milk', slug: 'country-delight-cow-milk', brand: 'Country Delight', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', price: 72, originalPrice: 80, mrp: 80, discount: '₹8 OFF', discountPercentage: 10, netQuantity: '1 L', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['A2 Protein', '100% Pure'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '3 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: true, isFreshPick: true, rating: 4.9, reviewsCount: 512
        },
        {
          id: 'prod_milk_4', name: 'Mother Dairy Full Cream Milk', slug: 'mother-dairy-full-cream', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', price: 34, originalPrice: 35, mrp: 35, discount: '₹1 OFF', discountPercentage: 3, netQuantity: '500 ml', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600'], imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Rich Cream', 'Strong Bones'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '2 days' }, stock: { status: 'In Stock', quantity: 180 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 320
        },
        {
          id: 'prod_milk_5', name: 'Epigamia Unsweetened Almond Milk', slug: 'epigamia-almond-milk', brand: 'Epigamia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Milk', price: 180, originalPrice: 220, mrp: 220, discount: '₹40 OFF', discountPercentage: 18, netQuantity: '1 L', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600'], imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600',
          highlights: { productType: 'Plant Dairy', imported: false, dietaryPreference: 'Vegan', goodFor: ['Lactose Free', 'Zero Added Sugar'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '180 days' }, stock: { status: 'In Stock', quantity: 60 }, isOrganic: true, isFreshPick: false, rating: 4.8, reviewsCount: 195
        },

        // --- BREADS & BUNS (5 Products) ---
        {
          id: 'prod_bread_1', name: 'Britannia 100% Whole Wheat Bread', slug: 'britannia-whole-wheat-bread', brand: 'Britannia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', price: 45, originalPrice: 50, mrp: 50, discount: '₹5 OFF', discountPercentage: 10, netQuantity: '400 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'], imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['High Fiber', 'Zero Trans Fat'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 110 }, isOrganic: false, isFreshPick: true, rating: 4.7, reviewsCount: 620
        },
        {
          id: 'prod_bread_2', name: 'English Oven Sandwich White Bread', slug: 'english-oven-white-bread', brand: 'English Oven', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', price: 40, originalPrice: 45, mrp: 45, discount: '₹5 OFF', discountPercentage: 11, netQuantity: '400 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600'], imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Super Soft', 'Sandwiches'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 95 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 380
        },
        {
          id: 'prod_bread_3', name: 'Modern Brown Bread', slug: 'modern-brown-bread', brand: 'Modern', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', price: 38, originalPrice: 42, mrp: 42, discount: '₹4 OFF', discountPercentage: 10, netQuantity: '400 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'], imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Healthy Toast', 'Low Fat'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 80 }, isOrganic: false, isFreshPick: false, rating: 4.6, reviewsCount: 210
        },
        {
          id: 'prod_bread_4', name: 'Freshly Baked Sesame Burger Buns', slug: 'sesame-burger-buns', brand: 'English Oven', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', price: 35, originalPrice: 40, mrp: 40, discount: '₹5 OFF', discountPercentage: 12, netQuantity: '4 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600'], imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Home Burgers', 'Sesame Topped'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '4 days' }, stock: { status: 'In Stock', quantity: 70 }, isOrganic: false, isFreshPick: true, rating: 4.7, reviewsCount: 165
        },
        {
          id: 'prod_bread_5', name: 'Soft Pav Buns for Misal & Vada Pav', slug: 'soft-pav-buns', brand: 'Britannia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Breads & Buns', price: 25, originalPrice: 30, mrp: 30, discount: '₹5 OFF', discountPercentage: 17, netQuantity: '6 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600'], imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Pav Bhaji', 'Vada Pav'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '4 days' }, stock: { status: 'In Stock', quantity: 130 }, isOrganic: false, isFreshPick: false, rating: 4.8, reviewsCount: 490
        },

        // --- FRESH BAKERY (5 Products) ---
        {
          id: 'prod_bakery_1', name: 'French Butter Croissant', slug: 'french-butter-croissant', brand: 'FreshBakery', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Fresh Bakery', price: 99, originalPrice: 120, mrp: 120, discount: '₹21 OFF', discountPercentage: 18, netQuantity: '2 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600'], imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Flaky Layers', 'Real Butter'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '2 days' }, stock: { status: 'In Stock', quantity: 50 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 310
        },
        {
          id: 'prod_bakery_2', name: 'Belgian Chocolate Fudge Muffin', slug: 'chocolate-fudge-muffin', brand: 'FreshBakery', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Fresh Bakery', price: 89, originalPrice: 110, mrp: 110, discount: '₹21 OFF', discountPercentage: 19, netQuantity: '2 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600'], imageUrl: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Rich Dark Choco', 'Soft Center'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '3 days' }, stock: { status: 'In Stock', quantity: 60 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 240
        },
        {
          id: 'prod_bakery_3', name: 'Crispy Garlic Toast Slices', slug: 'crispy-garlic-toast', brand: 'FreshBakery', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Fresh Bakery', price: 65, originalPrice: 80, mrp: 80, discount: '₹15 OFF', discountPercentage: 19, netQuantity: '150 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Tea Time', 'Garlic Butter'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '15 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 180
        },
        {
          id: 'prod_bakery_4', name: 'Choco Chip Artisan Cookies', slug: 'choco-chip-cookies', brand: 'FreshBakery', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Fresh Bakery', price: 120, originalPrice: 150, mrp: 150, discount: '₹30 OFF', discountPercentage: 20, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600'], imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Crunchy Bites', 'Real Chocolate'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '30 days' }, stock: { status: 'In Stock', quantity: 85 }, isOrganic: false, isFreshPick: false, rating: 4.8, reviewsCount: 290
        },
        {
          id: 'prod_bakery_5', name: 'Classic Salted Butter Cookies', slug: 'salted-butter-cookies', brand: 'FreshBakery', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Fresh Bakery', price: 110, originalPrice: 140, mrp: 140, discount: '₹30 OFF', discountPercentage: 21, netQuantity: '250 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600'], imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600',
          highlights: { productType: 'Bakery', imported: false, dietaryPreference: 'Veg', goodFor: ['Melts in Mouth', 'Rich Taste'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '30 days' }, stock: { status: 'In Stock', quantity: 75 }, isOrganic: false, isFreshPick: false, rating: 4.6, reviewsCount: 140
        },

        // --- EGGS (5 Products) ---
        {
          id: 'prod_egg_1', name: 'Farm Fresh Table White Eggs', slug: 'farm-fresh-white-eggs', brand: 'Eggoz', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', price: 48, originalPrice: 60, mrp: 60, discount: '₹12 OFF', discountPercentage: 20, netQuantity: '6 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600'], imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600',
          highlights: { productType: 'Eggs', imported: false, dietaryPreference: 'Non-Veg', goodFor: ['High Protein', 'UV Sanitized'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 200 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 750
        },
        {
          id: 'prod_egg_2', name: 'Organic Brown Eggs', slug: 'organic-brown-eggs', brand: 'Eggoz', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', price: 75, originalPrice: 90, mrp: 90, discount: '₹15 OFF', discountPercentage: 17, netQuantity: '6 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600'], imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600',
          highlights: { productType: 'Eggs', imported: false, dietaryPreference: 'Non-Veg', goodFor: ['100% Organic', 'Rich Yolk'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '12 days' }, stock: { status: 'In Stock', quantity: 120 }, isOrganic: true, isFreshPick: true, rating: 4.9, reviewsCount: 540
        },
        {
          id: 'prod_egg_3', name: 'Omega-3 Enriched Herbal Eggs', slug: 'omega-3-eggs', brand: 'Hen Fruit', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', price: 85, originalPrice: 105, mrp: 105, discount: '₹20 OFF', discountPercentage: 19, netQuantity: '6 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600'], imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600',
          highlights: { productType: 'Eggs', imported: false, dietaryPreference: 'Non-Veg', goodFor: ['Heart Healthy', 'Omega 3'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '12 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: true, isFreshPick: false, rating: 4.8, reviewsCount: 310
        },
        {
          id: 'prod_egg_4', name: 'Free Range Pasture Raised Eggs', slug: 'free-range-eggs', brand: 'Eggoz', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', price: 95, originalPrice: 120, mrp: 120, discount: '₹25 OFF', discountPercentage: 21, netQuantity: '6 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600'], imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600',
          highlights: { productType: 'Eggs', imported: false, dietaryPreference: 'Non-Veg', goodFor: ['Ethical Farming', 'Dark Orange Yolk'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '14 days' }, stock: { status: 'In Stock', quantity: 80 }, isOrganic: true, isFreshPick: true, rating: 4.9, reviewsCount: 220
        },
        {
          id: 'prod_egg_5', name: 'Fresh Quail Eggs Pack', slug: 'quail-eggs', brand: 'FarmDirect', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Eggs', price: 60, originalPrice: 75, mrp: 75, discount: '₹15 OFF', discountPercentage: 20, netQuantity: '10 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600'], imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600',
          highlights: { productType: 'Eggs', imported: false, dietaryPreference: 'Non-Veg', goodFor: ['Nutrient Dense', 'Gourmet Cooking'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 50 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 95
        },

        // --- CURD & PROBIOTIC DRINKS (5 Products) ---
        {
          id: 'prod_curd_1', name: 'Amul Masti Dahi Pouch', slug: 'amul-masti-dahi', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', price: 35, originalPrice: 37, mrp: 37, discount: '₹2 OFF', discountPercentage: 5, netQuantity: '400 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600'], imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Gut Health', 'Thick Texture'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 160 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 920
        },
        {
          id: 'prod_curd_2', name: 'Milky Mist Thick Set Curd Tub', slug: 'milky-mist-curd-tub', brand: 'Milky Mist', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', price: 65, originalPrice: 70, mrp: 70, discount: '₹5 OFF', discountPercentage: 7, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600'], imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Creamy Dahi', 'Probiotics'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 140 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 480
        },
        {
          id: 'prod_curd_3', name: 'Yakult Probiotic Drink 5 Bottles', slug: 'yakult-probiotic-drink', brand: 'Yakult', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', price: 90, originalPrice: 95, mrp: 95, discount: '₹5 OFF', discountPercentage: 5, netQuantity: '5 x 65 ml', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600'], imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600',
          highlights: { productType: 'Probiotic', imported: false, dietaryPreference: 'Veg', goodFor: ['Immunity', '6.5 Billion Shirota Strains'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '30 days' }, stock: { status: 'In Stock', quantity: 190 }, isOrganic: false, isFreshPick: false, rating: 4.9, reviewsCount: 1100
        },
        {
          id: 'prod_curd_4', name: 'Mother Dairy Classic Dahi', slug: 'mother-dairy-dahi', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', price: 38, originalPrice: 40, mrp: 40, discount: '₹2 OFF', discountPercentage: 5, netQuantity: '400 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600'], imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Natural Cooling', 'Digestion'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 130 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 270
        },
        {
          id: 'prod_curd_5', name: 'Epigamia Greek Yogurt Mango', slug: 'epigamia-greek-yogurt-mango', brand: 'Epigamia', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Curd & Probiotic Drinks', price: 50, originalPrice: 60, mrp: 60, discount: '₹10 OFF', discountPercentage: 17, netQuantity: '85 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600'], imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
          highlights: { productType: 'Yogurt', imported: false, dietaryPreference: 'Veg', goodFor: ['High Protein', 'Real Alfonso Mango'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '15 days' }, stock: { status: 'In Stock', quantity: 100 }, isOrganic: true, isFreshPick: true, rating: 4.8, reviewsCount: 340
        },

        // --- PANEER & CREAM (5 Products) ---
        {
          id: 'prod_paneer_1', name: 'Amul Fresh Malai Paneer', slug: 'amul-malai-paneer', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', price: 90, originalPrice: 95, mrp: 95, discount: '₹5 OFF', discountPercentage: 5, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Super Soft', 'High Protein'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 170 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 980
        },
        {
          id: 'prod_paneer_2', name: 'Milky Mist Soft Cottage Cheese Paneer', slug: 'milky-mist-paneer', brand: 'Milky Mist', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', price: 88, originalPrice: 95, mrp: 95, discount: '₹7 OFF', discountPercentage: 7, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Melt in Mouth', 'No Preservatives'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '12 days' }, stock: { status: 'In Stock', quantity: 140 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 520
        },
        {
          id: 'prod_paneer_3', name: 'Amul Fresh Cooking Cream', slug: 'amul-fresh-cream', brand: 'Amul', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', price: 67, originalPrice: 72, mrp: 72, discount: '₹5 OFF', discountPercentage: 7, netQuantity: '250 ml', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Rich Gravies', 'Dessert Whipping'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '30 days' }, stock: { status: 'In Stock', quantity: 110 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 340
        },
        {
          id: 'prod_paneer_4', name: 'Mother Dairy Soft Malai Paneer', slug: 'mother-dairy-paneer', brand: 'Mother Dairy', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', price: 92, originalPrice: 98, mrp: 98, discount: '₹6 OFF', discountPercentage: 6, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Freshness Guaranteed', 'Tikka & Curry'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 95 }, isOrganic: false, isFreshPick: false, rating: 4.8, reviewsCount: 260
        },
        {
          id: 'prod_paneer_5', name: 'Gowardhan Soft Malai Paneer Block', slug: 'gowardhan-paneer', brand: 'Gowardhan', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Paneer & Cream', price: 85, originalPrice: 95, mrp: 95, discount: '₹10 OFF', discountPercentage: 11, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600'], imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600',
          highlights: { productType: 'Dairy', imported: false, dietaryPreference: 'Veg', goodFor: ['Rich Taste', '100% Pure Milk'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 80 }, isOrganic: false, isFreshPick: false, rating: 4.6, reviewsCount: 190
        },

        // --- BATTERS & MIXES (5 Products) ---
        {
          id: 'prod_batter_1', name: 'iD Fresh Idli Dosa Batter', slug: 'id-fresh-idli-dosa-batter', brand: 'iD Fresh', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Batters & Mixes', price: 85, originalPrice: 95, mrp: 95, discount: '₹10 OFF', discountPercentage: 11, netQuantity: '1 kg', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600'], imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600',
          highlights: { productType: 'Batter', imported: false, dietaryPreference: 'Veg', goodFor: ['Naturally Fermented', 'Crispy Dosa'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 180 }, isOrganic: true, isFreshPick: true, rating: 4.9, reviewsCount: 810
        },
        {
          id: 'prod_batter_2', name: 'MTR Instant Dosa Mix', slug: 'mtr-instant-dosa-mix', brand: 'MTR', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Batters & Mixes', price: 110, originalPrice: 125, mrp: 125, discount: '₹15 OFF', discountPercentage: 12, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600'], imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600',
          highlights: { productType: 'Instant Mix', imported: false, dietaryPreference: 'Veg', goodFor: ['Quick Breakfast', 'Authentic Taste'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '180 days' }, stock: { status: 'In Stock', quantity: 130 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 420
        },
        {
          id: 'prod_batter_3', name: 'Gits Instant Khaman Dhokla Mix', slug: 'gits-dhokla-mix', brand: 'Gits', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Batters & Mixes', price: 75, originalPrice: 85, mrp: 85, discount: '₹10 OFF', discountPercentage: 12, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600'], imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600',
          highlights: { productType: 'Instant Mix', imported: false, dietaryPreference: 'Veg', goodFor: ['Spongy Dhokla', '15 Min Prep'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '180 days' }, stock: { status: 'In Stock', quantity: 110 }, isOrganic: false, isFreshPick: false, rating: 4.8, reviewsCount: 310
        },
        {
          id: 'prod_batter_4', name: 'iD Whole Wheat Malabar Parota Pack', slug: 'id-malabar-parota', brand: 'iD Fresh', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Batters & Mixes', price: 95, originalPrice: 110, mrp: 110, discount: '₹15 OFF', discountPercentage: 14, netQuantity: '5 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600'], imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600',
          highlights: { productType: 'Ready to Cook', imported: false, dietaryPreference: 'Veg', goodFor: ['Flaky Layers', 'Zero Maida'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 150 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 640
        },
        {
          id: 'prod_batter_5', name: 'MTR Instant Rava Dosa Mix', slug: 'mtr-rava-dosa-mix', brand: 'MTR', categoryId: 'dairy-bread-eggs', category: 'Dairy, Bread & Eggs', subCategory: 'Batters & Mixes', price: 115, originalPrice: 130, mrp: 130, discount: '₹15 OFF', discountPercentage: 12, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600'], imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600',
          highlights: { productType: 'Instant Mix', imported: false, dietaryPreference: 'Veg', goodFor: ['Extra Crispy', 'Curry Leaves Flavour'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '180 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 220
        },

        // --- FRESH VEGETABLES (5 Products) ---
        {
          id: 'prod_fv_1', name: 'Sweet Potato', slug: 'sweet-potato', brand: 'FreshFarm', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 38, originalPrice: 85, mrp: 85, discount: '₹47 OFF', discountPercentage: 55, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600'], imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600',
          highlights: { productType: 'Vegetable', imported: false, dietaryPreference: 'Veg', goodFor: ['Gut Health', 'Vitamin A'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '4 days' }, stock: { status: 'In Stock', quantity: 140 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 310
        },
        {
          id: 'prod_fv_2', name: 'Organically Grown Sweet Potato', slug: 'organic-sweet-potato', brand: 'OrganicLife', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 52, originalPrice: 95, mrp: 95, discount: '₹43 OFF', discountPercentage: 45, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600'], imageUrl: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600',
          highlights: { productType: 'Vegetable', imported: false, dietaryPreference: 'Veg', goodFor: ['100% Organic', 'Immunity Boost'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: true, isFreshPick: true, rating: 4.9, reviewsCount: 180
        },
        {
          id: 'prod_fv_3', name: 'Fresh Button Mushrooms', slug: 'fresh-button-mushrooms', brand: 'AgroFresh', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 49, originalPrice: 70, mrp: 70, discount: '₹21 OFF', discountPercentage: 30, netQuantity: '200 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'], imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
          highlights: { productType: 'Fungi', imported: false, dietaryPreference: 'Veg', goodFor: ['High Protein', 'Low Calorie'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '3 days' }, stock: { status: 'In Stock', quantity: 110 }, isOrganic: false, isFreshPick: true, rating: 4.7, reviewsCount: 220
        },
        {
          id: 'prod_fv_4', name: 'Red Onion Pack', slug: 'red-onion-pack', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 32, originalPrice: 55, mrp: 55, discount: '₹23 OFF', discountPercentage: 42, netQuantity: '1 kg', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600'], imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600',
          highlights: { productType: 'Vegetable', imported: false, dietaryPreference: 'Veg', goodFor: ['Cooking Essential', 'Antioxidants'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 300 }, isOrganic: false, isFreshPick: false, rating: 4.8, reviewsCount: 610
        },
        {
          id: 'prod_fv_5', name: 'Farm Fresh Potato Pack', slug: 'farm-fresh-potato', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Vegetables', price: 28, originalPrice: 45, mrp: 45, discount: '₹17 OFF', discountPercentage: 38, netQuantity: '1 kg', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600'], imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600',
          highlights: { productType: 'Vegetable', imported: false, dietaryPreference: 'Veg', goodFor: ['Energy Boost', 'Daily Cooking'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '10 days' }, stock: { status: 'In Stock', quantity: 250 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 490
        },

        // --- FRESH FRUITS (5 Products) ---
        {
          id: 'prod_ff_1', name: 'Robusta Bananas', slug: 'robusta-bananas', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 42, originalPrice: 55, mrp: 55, discount: '₹13 OFF', discountPercentage: 24, netQuantity: '1 kg', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600'], imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
          highlights: { productType: 'Fruit', imported: false, dietaryPreference: 'Veg', goodFor: ['Potassium Rich', 'Instant Energy'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '3 days' }, stock: { status: 'In Stock', quantity: 220 }, isOrganic: false, isFreshPick: true, rating: 4.9, reviewsCount: 820
        },
        {
          id: 'prod_ff_2', name: 'Royal Gala Apples Pack', slug: 'royal-gala-apples', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 149, originalPrice: 180, mrp: 180, discount: '₹31 OFF', discountPercentage: 17, netQuantity: '4 pcs', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600'], imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
          highlights: { productType: 'Fruit', imported: true, dietaryPreference: 'Veg', goodFor: ['Crunchy Sweet', 'Fiber Rich'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'New Zealand', shelfLife: '7 days' }, stock: { status: 'In Stock', quantity: 130 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 540
        },
        {
          id: 'prod_ff_3', name: 'Fresh Sweet Lime (Mosambi)', slug: 'fresh-mosambi', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 79, originalPrice: 100, mrp: 100, discount: '₹21 OFF', discountPercentage: 21, netQuantity: '1 kg', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600'], imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600',
          highlights: { productType: 'Fruit', imported: false, dietaryPreference: 'Veg', goodFor: ['Juicing', 'Vitamin C'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 160 }, isOrganic: false, isFreshPick: false, rating: 4.7, reviewsCount: 310
        },
        {
          id: 'prod_ff_4', name: 'Fresh Seedless Watermelon', slug: 'seedless-watermelon', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 69, originalPrice: 90, mrp: 90, discount: '₹21 OFF', discountPercentage: 23, netQuantity: '1 pc', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600'], imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600',
          highlights: { productType: 'Fruit', imported: false, dietaryPreference: 'Veg', goodFor: ['Hydration', 'Sweet Red Flesh'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '5 days' }, stock: { status: 'In Stock', quantity: 90 }, isOrganic: false, isFreshPick: true, rating: 4.8, reviewsCount: 420
        },
        {
          id: 'prod_ff_5', name: 'Ruby Red Fresh Pomegranate', slug: 'fresh-pomegranate', brand: 'FarmDirect', categoryId: 'fruits-vegetables', category: 'Fruits & Vegetables', subCategory: 'Fresh Fruits', price: 129, originalPrice: 160, mrp: 160, discount: '₹31 OFF', discountPercentage: 19, netQuantity: '500 g', currency: 'INR',
          images: ['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600'], imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600',
          highlights: { productType: 'Fruit', imported: false, dietaryPreference: 'Veg', goodFor: ['Antioxidants', 'Hemoglobin Boost'] },
          delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true }, seller: { name: 'FreshCart Retail Private Limited', countryOfOrigin: 'India', shelfLife: '6 days' }, stock: { status: 'In Stock', quantity: 110 }, isOrganic: false, isFreshPick: false, rating: 4.9, reviewsCount: 290
        }
      ];

      await Product.insertMany(seedProductsList);
      console.log(`✅ Seeded ${seedProductsList.length} rich product records!`);
    }

    // 6. Seed Predefined Super Categories
    const superCatCount = await SuperCategory.countDocuments();
    if (superCatCount < 7) {
      await SuperCategory.deleteMany({});
      const initialSuperCategories = [
        {
          id: 'sc_all',
          name: 'All',
          slug: 'all',
          icon: 'LayoutGrid',
          banner: '',
          categories: [],
          displayOrder: 0,
          active: true
        },
        {
          id: 'sc_cafe',
          name: 'Cafe',
          slug: 'cafe',
          icon: 'Coffee',
          banner: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1400&auto=format&fit=crop',
          bannerLink: '/products',
          categories: ['dairy-bread-eggs', 'breakfast-cereals-spreads-sauces', 'tea-coffee-health-drinks', 'ice-creams-kulfi-frozen-desserts', 'chocolates-indian-sweets'],
          subCategories: ['Milk', 'Breads & Buns', 'Fresh Bakery', 'Tea', 'Coffee', 'Chocolates', 'Cold Coffee & Iced Tea', 'Batters & Mixes'],
          products: ['prod_milk_1', 'prod_milk_2', 'prod_milk_3', 'prod_milk_4', 'prod_milk_5'],
          displayOrder: 1,
          active: true
        },
        {
          id: 'sc_home',
          name: 'Home',
          slug: 'home',
          icon: 'Home',
          banner: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1400&auto=format&fit=crop',
          categories: ['atta-rice-oil-dals'],
          subCategories: ['Oil', 'Atta', 'Ghee', 'Dals & Pulses', 'Rice & More'],
          displayOrder: 2,
          active: true
        },
        {
          id: 'sc_toys',
          name: 'Toys',
          slug: 'toys',
          icon: 'Gamepad2',
          banner: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1400&auto=format&fit=crop',
          categories: [],
          subCategories: [],
          displayOrder: 3,
          active: true
        },
        {
          id: 'sc_fresh',
          name: 'Fresh',
          slug: 'fresh',
          icon: 'Leaf',
          banner: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=1400&auto=format&fit=crop',
          categories: ['fruits-vegetables'],
          subCategories: ['Fresh Vegetables', 'Fresh Fruits', 'Exotics & Premium', 'Mangoes & Melons', 'Leafy, Herbs & Seasonings', 'Cuts & Sprouts'],
          products: ['prod_fv_1', 'prod_fv_2', 'prod_fv_3', 'prod_fv_4', 'prod_fv_5', 'prod_ff_1', 'prod_ff_2', 'prod_ff_3', 'prod_ff_4', 'prod_ff_5'],
          displayOrder: 4,
          active: true
        },
        {
          id: 'sc_electronics',
          name: 'Electronics',
          slug: 'electronics',
          icon: 'Headphones',
          banner: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&auto=format&fit=crop',
          categories: [],
          subCategories: [],
          displayOrder: 5,
          active: true
        },
        {
          id: 'sc_mobiles',
          name: 'Mobiles',
          slug: 'mobiles',
          icon: 'Smartphone',
          banner: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&auto=format&fit=crop',
          categories: [],
          subCategories: [],
          displayOrder: 6,
          active: true
        },
        {
          id: 'sc_beauty',
          name: 'Beauty',
          slug: 'beauty',
          icon: 'Sparkles',
          banner: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&auto=format&fit=crop',
          categories: [],
          subCategories: [],
          displayOrder: 7,
          active: true
        },
        {
          id: 'sc_fashion',
          name: 'Fashion',
          slug: 'fashion',
          icon: 'Shirt',
          banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&auto=format&fit=crop',
          categories: [],
          subCategories: [],
          displayOrder: 8,
          active: true
        }
      ];

      await SuperCategory.insertMany(initialSuperCategories);
      console.log('✅ Seeded predefined Super Categories!');
    }

  } catch (error) {
    console.error('database seeding failed:', error.message);
  }
};
