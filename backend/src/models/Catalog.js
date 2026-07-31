import mongoose from 'mongoose';

// SubCategory Schema
const subCategorySchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  slug: { type: String },
  icon: { type: String }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. fruits-vegetables
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'Leaf' },
  color: { type: String, default: '#4CAF50' },
  subCategories: [subCategorySchema],
  productCount: { type: Number, default: 0 }
}, { timestamps: true });

// Brand Schema
const brandSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logoUrl: { type: String },
  productCount: { type: Number, default: 0 }
}, { timestamps: true });

// Product Schema
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String },
  brand: { type: String, default: '' },
  categoryId: { type: String, required: true, index: true },
  category: { type: String },
  subCategory: { type: String, index: true },
  rating: { type: Number, default: 4.5 },
  reviewsCount: { type: Number, default: 12 },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  mrp: { type: Number, required: true },
  discount: { type: String },
  discountPercentage: { type: Number },
  netQuantity: { type: String, default: '500 g' },
  currency: { type: String, default: 'INR' },
  images: [{ type: String }],
  imageUrl: { type: String },
  weightOptions: [{ type: String }],
  defaultWeight: { type: String, default: '500 g' },
  description: { type: String, default: '' },
  nutritionFacts: { type: Map, of: String },
  ingredients: [{ type: String }],
  isOrganic: { type: Boolean, default: false },
  isFreshPick: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  highlights: {
    productType: { type: String, default: 'Vegetable' },
    imported: { type: Boolean, default: false },
    dietaryPreference: { type: String, default: 'Veg' },
    goodFor: [{ type: String }]
  },
  delivery: {
    returnExchange: { type: String, default: 'No Return or Exchange' },
    fastDelivery: { type: Boolean, default: true }
  },
  seller: {
    name: { type: String, default: 'Geddit Convenience Private Limited' },
    countryOfOrigin: { type: String, default: 'India' },
    shelfLife: { type: String, default: '4 days' }
  },
  stock: {
    status: { type: String, default: 'In Stock' },
    quantity: { type: Number, default: 50 }
  },
  warehouseId: { type: String, default: 'wh_main' }
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);
export const Brand = mongoose.model('Brand', brandSchema);
export const Product = mongoose.model('Product', productSchema);

