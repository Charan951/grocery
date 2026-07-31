import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import { Category, Product, Brand } from '../src/models/Catalog.js';
import { Coupon } from '../src/models/Finance.js';
import { Blog, SupportTicket } from '../src/models/Operations.js';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file!');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const showHelp = () => {
  console.log(`
🚀 FreshCart Database CLI Tool
==============================
Usage:
  node scripts/dbTool.js [command] [arguments]

Commands:
  --clear
      Removes all products, categories, coupons, blogs, and support tickets from the database.
      Example: node scripts/dbTool.js --clear

  --category [name] [icon] [color]
      Creates a new category in the database.
      Example: node scripts/dbTool.js --category "Fresh Veggies" "Carrot" "#4CAF50"

  --product [name] [brand] [categoryId] [price] [mrp] [weight] [desc] [imageUrl] [isOrganic] [stock]
      Creates a new product in the database.
      Example: node scripts/dbTool.js --product "Organic Spinach" "Earth Greens" "cat_organic" 99 120 "250g" "Fresh spinach" "https://images.unsplash.com/photo-1576045057995-568f588f82fb" true 100
  `);
};

const clearDatabase = async () => {
  console.log('⚠️ Clearing database products, categories, coupons, blogs, and support tickets...');
  try {
    const pCount = await Product.deleteMany({});
    const cCount = await Category.deleteMany({});
    const bCount = await Brand.deleteMany({});
    const cpCount = await Coupon.deleteMany({});
    const bgCount = await Blog.deleteMany({});
    const sCount = await SupportTicket.deleteMany({});

    console.log(`✅ Cleared all dummy data!`);
    console.log(`   - Deleted ${pCount.deletedCount} products`);
    console.log(`   - Deleted ${cCount.deletedCount} categories`);
    console.log(`   - Deleted ${bCount.deletedCount} brands`);
    console.log(`   - Deleted ${cpCount.deletedCount} coupons`);
    console.log(`   - Deleted ${bgCount.deletedCount} blog articles`);
    console.log(`   - Deleted ${sCount.deletedCount} support tickets`);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
  }
};

const createCategory = async (name, icon = 'Leaf', color = '#4CAF50') => {
  if (!name) {
    console.error('❌ Category name is required.');
    process.exit(1);
  }
  const id = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  try {
    const existing = await Category.findOne({ id });
    if (existing) {
      console.log(`⚠️ Category with ID "${id}" already exists: "${existing.name}"`);
      return;
    }
    const cat = await Category.create({ id, name, icon, color });
    console.log(`✅ Category created successfully:`);
    console.log(JSON.stringify(cat, null, 2));
  } catch (err) {
    console.error('❌ Error creating category:', err.message);
  }
};

const createProduct = async (name, brand, categoryId, priceStr, mrpStr, weight, desc, imageUrl, isOrganicStr, stockStr) => {
  if (!name || !brand || !categoryId || !priceStr || !mrpStr || !weight || !desc || !imageUrl) {
    console.error('❌ Missing required product fields.');
    console.log('Required arguments: name, brand, categoryId, price, mrp, weight, desc, imageUrl, [isOrganic], [stock]');
    process.exit(1);
  }

  const price = Number(priceStr);
  const mrp = Number(mrpStr);
  const isOrganic = isOrganicStr === 'true' || isOrganicStr === '1' || isOrganicStr === true;
  const stock = stockStr ? Number(stockStr) : 50;

  if (isNaN(price) || isNaN(mrp)) {
    console.error('❌ Price and MRP must be numeric values.');
    process.exit(1);
  }

  const id = 'prod_custom_' + Date.now();
  const discountVal = mrp - price;
  const discountText = discountVal > 0 ? `₹${discountVal} OFF` : 'Best Price';

  const productData = {
    id,
    name,
    brand,
    categoryId,
    price,
    mrp,
    discountText,
    weightOptions: [weight],
    defaultWeight: weight,
    description: desc,
    imageUrl,
    isOrganic,
    stock,
    rating: 4.8,
    reviewsCount: 0,
    nutritionFacts: { 'Calories': '45 kcal', 'Protein': '1g' },
    ingredients: [name]
  };

  try {
    // Verify category exists
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      console.log(`⚠️ Warning: Category "${categoryId}" does not exist. Creating category first...`);
      // Auto create the category
      const catName = categoryId.replace('cat_', '').replace(/_/g, ' ');
      const formattedCatName = catName.charAt(0).toUpperCase() + catName.slice(1);
      await createCategory(formattedCatName);
    }

    const prod = await Product.create(productData);
    // Increment category product count
    await Category.updateOne({ id: categoryId }, { $inc: { productCount: 1 } });

    console.log(`✅ Product created successfully:`);
    console.log(JSON.stringify(prod, null, 2));
  } catch (err) {
    console.error('❌ Error creating product:', err.message);
  }
};

const run = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showHelp();
    process.exit(0);
  }

  await connectDB();

  switch (command) {
    case '--clear':
      await clearDatabase();
      break;
    case '--category':
      await createCategory(args[1], args[2], args[3]);
      break;
    case '--product':
      await createProduct(
        args[1], // name
        args[2], // brand
        args[3], // categoryId
        args[4], // price
        args[5], // mrp
        args[6], // weight
        args[7], // desc
        args[8], // imageUrl
        args[9], // isOrganic
        args[10] // stock
      );
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from database.');
  process.exit(0);
};

run();
