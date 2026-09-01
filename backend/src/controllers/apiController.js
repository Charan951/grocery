import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Credentials come from the environment only — no hardcoded key fallbacks in source.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Evaluated per-call (not at import) so tests can toggle the env var.
// Test mode = explicitly forced, or no real key configured (missing / "mock_*").
const isPaymentsTestMode = () =>
  process.env.PAYMENTS_TEST_MODE === 'true' ||
  !process.env.RAZORPAY_KEY_SECRET ||
  (process.env.RAZORPAY_KEY_ID || '').startsWith('mock');

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: RAZORPAY_KEY_SECRET || 'placeholder_secret',
});
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Category, Product, Brand, SpecialGroup, Banner, PromoCard } from '../models/Catalog.js';
import { Inventory } from '../models/Inventory.js';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Coupon, Offer, Payment, WalletTransaction } from '../models/Finance.js';
import { Review, Notification, CMSPage, Blog, Settings, AuditLog, SupportTicket } from '../models/Operations.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { cancelForOrder, tryAssign } from '../services/assignmentService.js';
import { sendDeliveryCredentials } from '../services/mailService.js';
import { registerDeviceToken, removeDeviceToken, sendToOwner } from '../services/pushService.js';

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// "+91 9876543210" -> "98••••10"; keeps first 2 + last 2 of the 10-digit number.
const maskPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '').slice(-10);
  if (d.length < 6) return d ? '••' : '';
  return `${d.slice(0, 2)}••••${d.slice(-2)}`;
};

// ==========================================
// 1. AUTHENTICATION CONTROLLER
// ==========================================
export const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      const user = await User.create({ name, email, password, role: role || 'Customer' });
      const token = signToken(user._id);

      // Create Customer profile if role is Customer
      if (user.role === 'Customer') {
        await Customer.create({
          customerId: 'cust_' + user._id.toString().slice(-6),
          name: user.name,
          email: user.email,
          phone: user.phone || '9999999999',
          referralCode: 'REF_' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          walletBalance: 100 // Welcome bonus
        });
      }

      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      if (user.status === 'Suspended') {
        return res.status(403).json({ success: false, message: 'Account suspended' });
      }
      const token = signToken(user._id);
      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getMe: async (req, res) => {
    try {
      res.json({ success: true, user: req.user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 2. DASHBOARD STATS CONTROLLER
// ==========================================
export const dashboardController = {
  getStats: async (req, res) => {
    try {
      // Fetch aggregations or use defaults if no orders
      const orders = await Order.find();
      const productsCount = await Product.countDocuments();
      const categoriesCount = await Category.countDocuments();
      const customersCount = await Customer.countDocuments();
      const lowStockProducts = await Product.find({ 'stock.quantity': { $lt: 15 } });

      let totalRevenue = 0;
      let todayRevenue = 0;
      let todayOrders = 0;
      let pendingOrders = 0;

      const today = new Date().toDateString();

      orders.forEach(o => {
        // Schema field is `totalAmount` — `grandTotal` never existed, which made
        // every revenue figure NaN once real orders were present.
        const orderValue = Number(o.totalAmount) || 0;
        if (o.status !== 'Cancelled') {
          totalRevenue += orderValue;
          if (new Date(o.createdAt).toDateString() === today) {
            todayRevenue += orderValue;
            todayOrders++;
          }
        }
        if (o.status === 'Pending') {
          pendingOrders++;
        }
      });

      const averageOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

      res.json({
        success: true,
        stats: {
          todayRevenue,
          todayOrders,
          monthlyRevenue: totalRevenue * 0.4, // Simulated monthly split
          yearlyRevenue: totalRevenue,
          averageOrderValue,
          conversionRate: 3.8, // 3.8% mock
          customerGrowth: 14.5, // 14.5% mock
          returningCustomers: 64, // 64% mock
          productsCount,
          categoriesCount,
          customersCount,
          pendingOrdersCount: pendingOrders,
          lowStockCount: lowStockProducts.length
        },
        lowStockItems: lowStockProducts.slice(0, 5),
        charts: {
          revenue: [
            { name: 'Jan', value: totalRevenue * 0.05 + 5000 },
            { name: 'Feb', value: totalRevenue * 0.08 + 8000 },
            { name: 'Mar', value: totalRevenue * 0.12 + 12000 },
            { name: 'Apr', value: totalRevenue * 0.15 + 15000 },
            { name: 'May', value: totalRevenue * 0.20 + 20000 },
            { name: 'Jun', value: totalRevenue * 0.25 + 25000 },
            { name: 'Jul', value: totalRevenue * 0.15 + todayRevenue }
          ],
          categories: [
            { name: 'Organic', value: 35 },
            { name: 'Vegetables', value: 25 },
            { name: 'Fruits', value: 20 },
            { name: 'Dairy', value: 15 },
            { name: 'Others', value: 5 }
          ]
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getSystemStatus: async (req, res) => {
    try {
      res.json({
        success: true,
        server: 'Online',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        paymentGateway: 'Razorpay Live',
        redis: 'Connected',
        bullQueue: 'BullMQ Idle'
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 3. PRODUCT CATALOG CONTROLLER
// ==========================================
export const productController = {
  getProducts: async (req, res) => {
    try {
      const {
        categoryId, category, subCategory, search, isOrganic,
        minPrice, maxPrice, sort, brand, inStock, onSale, page, limit,
      } = req.query;
      let query = {};

      if (categoryId || category) {
        const catVal = categoryId || category;
        const catRegex = new RegExp(catVal.replace(/-/g, '.*'), 'i');
        query.$or = [
          { categoryId: catVal },
          { categoryId: catRegex },
          { category: catRegex },
          { category: catVal }
        ];
      }

      if (subCategory) {
        const subRegex = new RegExp(subCategory.replace(/-/g, '.*'), 'i');
        query.subCategory = subRegex;
      }

      if (isOrganic) query.isOrganic = isOrganic === 'true';

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      if (brand) {
        const brands = String(brand).split(',').map((b) => b.trim()).filter(Boolean);
        if (brands.length) query.brand = { $in: brands.map((b) => new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
      }

      if (inStock === 'true') query['stock.quantity'] = { $gt: 0 };

      if (onSale === 'true') {
        query.$expr = { $and: [{ $gt: ['$mrp', 0] }, { $lt: ['$price', '$mrp'] }] };
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex }
        ];
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'price-low') sortOptions = { price: 1 };
      else if (sort === 'price-high') sortOptions = { price: -1 };
      else if (sort === 'rating') sortOptions = { rating: -1 };

      // Pagination is opt-in: callers that pass neither page nor limit still get
      // the full list (unchanged shape) so existing clients keep working.
      if (page != null || limit != null) {
        const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const pg = Math.max(Number(page) || 1, 1);
        const total = await Product.countDocuments(query);
        const list = await Product.find(query).sort(sortOptions).skip((pg - 1) * lim).limit(lim);
        return res.json({
          success: true, count: list.length, total,
          page: pg, limit: lim, totalPages: Math.ceil(total / lim),
          products: list,
        });
      }

      const list = await Product.find(query).sort(sortOptions);
      res.json({ success: true, count: list.length, total: list.length, products: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const query = mongoose.isValidObjectId(productId)
        ? { $or: [{ id: productId }, { _id: productId }] }
        : { id: productId };
      const prod = await Product.findOne(query);
      if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, product: prod });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createProduct: async (req, res) => {
    try {
      const prodData = { ...req.body };
      delete prodData._id;
      if (!prodData.id) {
        prodData.id = 'prod_' + Date.now();
      }
      if (!prodData.slug && prodData.name) {
        prodData.slug = prodData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (prodData.price && !prodData.mrp) prodData.mrp = prodData.originalPrice || prodData.price;
      if (prodData.mrp && !prodData.originalPrice) prodData.originalPrice = prodData.mrp;

      // Clean and normalize image fields
      let validImages = Array.isArray(prodData.images)
        ? prodData.images.filter(img => typeof img === 'string' && img.trim().length > 0)
        : [];
      let mainImg = prodData.imageUrl || prodData.image || (validImages.length > 0 ? validImages[0] : '');
      if (mainImg) mainImg = mainImg.trim();

      if (mainImg && !validImages.includes(mainImg)) {
        validImages.unshift(mainImg);
      }

      prodData.imageUrl = mainImg || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600';
      prodData.images = validImages.length > 0 ? validImages : [prodData.imageUrl];

      const prod = await Product.create(prodData);
      if (prod.categoryId) {
        await Category.updateOne({ $or: [{ id: prod.categoryId }, { slug: prod.categoryId }] }, { $inc: { productCount: 1 } });
      }
      res.status(201).json({ success: true, product: prod });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const prodData = { ...req.body };
      const productId = req.params.id;

      // Crucial: remove immutable _id property from update payload to avoid MongoDB 500 error
      delete prodData._id;
      if (!prodData.id) prodData.id = productId;

      if (prodData.price && prodData.originalPrice) {
        prodData.mrp = prodData.originalPrice;
      }

      // Clean and normalize image fields
      let validImages = Array.isArray(prodData.images)
        ? prodData.images.filter(img => typeof img === 'string' && img.trim().length > 0)
        : [];
      let mainImg = prodData.imageUrl || prodData.image || (validImages.length > 0 ? validImages[0] : '');
      if (mainImg) mainImg = mainImg.trim();

      if (mainImg && !validImages.includes(mainImg)) {
        validImages.unshift(mainImg);
      }

      if (mainImg) prodData.imageUrl = mainImg;
      if (validImages.length > 0) prodData.images = validImages;

      const query = mongoose.isValidObjectId(productId)
        ? { $or: [{ id: productId }, { _id: productId }] }
        : { id: productId };

      const prod = await Product.findOneAndUpdate(
        query,
        { $set: prodData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      res.json({ success: true, product: prod });
    } catch (err) {
      console.error('Error in updateProduct:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const query = mongoose.isValidObjectId(productId)
        ? { $or: [{ id: productId }, { _id: productId }] }
        : { id: productId };
      const prod = await Product.findOneAndDelete(query);
      if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
      if (prod.categoryId) {
        await Category.updateOne({ $or: [{ id: prod.categoryId }, { slug: prod.categoryId }] }, { $inc: { productCount: -1 } });
      }
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  bulkImport: async (req, res) => {
    try {
      const { products } = req.body;
      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ success: false, message: 'Products array is required' });
      }
      await Product.insertMany(products, { ordered: false });
      res.json({ success: true, message: `Successfully imported ${products.length} products.` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 4. CATEGORY CONTROLLER
// ==========================================
export const categoryController = {
  getCategories: async (req, res) => {
    try {
      const list = await Category.find().sort({ displayOrder: 1, createdAt: 1, _id: 1 });
      const sanitized = list.map((catDoc) => {
        const cat = catDoc.toObject ? catDoc.toObject() : catDoc;
        if (cat.subCategories && Array.isArray(cat.subCategories)) {
          const seen = new Set();
          cat.subCategories = cat.subCategories.filter((sub) => {
            const nameKey = (sub.name || '').toLowerCase().trim();
            if (!nameKey || seen.has(nameKey)) return false;
            seen.add(nameKey);
            return true;
          });
        }
        return cat;
      });
      res.json({ success: true, categories: sanitized });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const catData = req.body;
      if (!catData.slug && catData.name) {
        catData.slug = catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      if (!catData.id) {
        catData.id = catData.slug || 'cat_' + Date.now();
      }
      const cat = await Category.create(catData);
      res.status(201).json({ success: true, category: cat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const cat = await Category.findOneAndUpdate(
        { $or: [{ id: req.params.id }, { slug: req.params.id }] },
        req.body,
        { new: true }
      );
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, category: cat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      await Category.findOneAndDelete({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
      res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addSubCategory: async (req, res) => {
    try {
      const { name, icon, image, color, showOnHome, displayOrder, promoImage, promoLink } = req.body;
      const subSlug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      const subId = 'sub_' + Date.now();
      const imgVal = image || icon || '';

      const cat = await Category.findOne({ $or: [{ id: req.params.id }, { slug: req.params.id }] });
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

      cat.subCategories = cat.subCategories || [];
      const nameKey = (name || '').toLowerCase().trim();
      const existingIdx = cat.subCategories.findIndex(
        (s) => (s.name || '').toLowerCase().trim() === nameKey || (subSlug && s.slug === subSlug)
      );

      const subObject = {
        id: subId,
        name,
        slug: subSlug,
        icon: imgVal,
        image: imgVal,
        color: color || '#10B981',
        showOnHome: showOnHome !== undefined ? showOnHome : true,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
        promoImage: promoImage || '',
        promoLink: promoLink || ''
      };

      if (existingIdx >= 0) {
        cat.subCategories[existingIdx] = {
          ...cat.subCategories[existingIdx],
          ...subObject,
          id: cat.subCategories[existingIdx].id || subId
        };
      } else {
        cat.subCategories.push(subObject);
      }

      await cat.save();
      res.json({ success: true, category: cat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateSubCategory: async (req, res) => {
    try {
      const { id, subId } = req.params;
      const { name, icon, image, color, showOnHome, displayOrder, promoImage, promoLink } = req.body;
      const subSlug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;

      const cat = await Category.findOne({ $or: [{ id }, { slug: id }] });
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

      const sub = (cat.subCategories || []).find((s) => s.id === subId || s.slug === subId || s.name === subId);
      if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });

      if (name !== undefined) sub.name = name;
      if (subSlug !== undefined) sub.slug = subSlug;
      if (icon !== undefined) sub.icon = icon;
      if (image !== undefined) sub.image = image;
      if (color !== undefined) sub.color = color;
      if (showOnHome !== undefined) sub.showOnHome = showOnHome;
      if (displayOrder !== undefined) sub.displayOrder = Number(displayOrder);
      if (promoImage !== undefined) sub.promoImage = promoImage;
      if (promoLink !== undefined) sub.promoLink = promoLink;

      await cat.save();
      res.json({ success: true, category: cat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteSubCategory: async (req, res) => {
    try {
      const { id, subId } = req.params;
      const cat = await Category.findOneAndUpdate(
        { $or: [{ id }, { slug: id }] },
        { $pull: { subCategories: { $or: [{ id: subId }, { slug: subId }, { name: subId }] } } },
        { new: true }
      );
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, category: cat });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 5. ORDER CONTROLLER
// ==========================================
export const orderController = {
  getOrders: async (req, res) => {
    try {
      const list = await Order.find().sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getCustomerOrders: async (req, res) => {
    try {
      const { phone } = req.params;
      const list = await Order.find({ customerPhone: phone }).sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/orders/mine  (protectCustomer)
  getMyOrders: async (req, res) => {
    try {
      const cid = req.customer.customerId;
      const phone10 = String(req.customer.phone || '').replace(/\D/g, '').slice(-10);
      const list = await Order.find({
        $or: [
          { customerId: cid },
          ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : [])
        ]
      }).sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Ownership: a customer token may only read its own order.
      let isOwner = false;
      if (req.customer) {
        const phone10 = String(req.customer.phone || '').replace(/\D/g, '').slice(-10);
        isOwner = order.customerId === req.customer.customerId
          || (!!phone10 && String(order.customerPhone || '').endsWith(phone10));
        if (!isOwner) return res.status(403).json({ success: false, message: 'Not your order' });
      }

      const view = order.toObject();

      // The rider verifies against the customer's OTP — only the authenticated
      // owner sees it, and only once the order is actually out for delivery.
      const REVEAL = ['Out For Delivery', 'Arrived'];
      if (!(isOwner && REVEAL.includes(order.status))) delete view.deliveryOtp;
      if (!isOwner) view.customerPhone = maskPhone(order.customerPhone);

      // Rider tracking block for the customer map — masked until the reveal window.
      if (order.deliveryPartnerUserId && !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(order.status)) {
        const partner = await DeliveryPartner.findOne({ userId: order.deliveryPartnerUserId }).lean();
        const revealed = REVEAL.includes(order.status);
        const rawPhone = partner?.phone || order.deliveryPartnerPhone || '';
        view.delivery = {
          partnerName: String(order.deliveryPartnerName || 'Delivery partner').split(' ')[0],
          phoneMasked: maskPhone(rawPhone),
          phone: revealed ? rawPhone : null,
          canContact: revealed && !!rawPhone,
          revealed,
          vehicleType: partner?.vehicleType || null,
          rating: partner?.rating ?? null,
          location: revealed && partner?.currentLocation?.coordinates
            ? { lat: partner.currentLocation.coordinates[1], lng: partner.currentLocation.coordinates[0] }
            : null,
          locationUpdatedAt: revealed ? partner?.locationUpdatedAt || null : null,
        };
      }
      view.pickup = view.pickup || null;

      res.json({ success: true, order: view });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createOrder: async (req, res) => {
    try {
      const orderData = req.body || {};
      // When the request carries a valid customer token (attachCustomerOptional),
      // trust the server-side identity over anything in the body.
      const authedCustomer = req.customer || null;
      const cleanPhone = (
        authedCustomer?.phone || orderData.customerPhone || orderData.phone || '9626626626'
      ).replace(/\D/g, '').slice(-10);

      const normalizedOrder = {
        orderId: orderData.orderId || orderData.orderNumber || 'PNNHJHTYP' + Math.floor(100000 + Math.random() * 900000),
        customerId: authedCustomer?.customerId || orderData.customerId || 'cust_' + cleanPhone,
        customerName: authedCustomer?.name || orderData.customerName || 'Customer',
        customerPhone: `+91 ${cleanPhone}`,
        items: Array.isArray(orderData.items) ? orderData.items.map((it) => ({
          id: it.id || it.productId || 'p_1',
          productId: it.productId || it.id || 'p_1',
          name: it.name || it.product?.name || 'Grocery Item',
          weightSpec: it.weightSpec || it.selectedWeight || '500g',
          quantity: Number(it.quantity || it.qty || 1),
          qty: Number(it.quantity || it.qty || 1),
          price: Number(it.price || it.product?.price || 50),
          image: it.image || it.product?.imageUrl || ''
        })) : [],
        itemTotal: Number(orderData.itemTotal || orderData.totalAmount || 100),
        totalAmount: Number(orderData.totalAmount || orderData.itemTotal || 100),
        discount: Number(orderData.discount || 0),
        deliveryFee: Number(orderData.deliveryFee || 0),
        handlingFee: Number(orderData.handlingFee || 0),
        // COD/cash is collected on delivery — it is Pending until then, never
        // "Paid" on creation. Prepaid methods default to Paid unless the caller
        // says otherwise (e.g. a failed gateway attempt).
        paymentStatus: orderData.paymentStatus
          || (/cod|cash/i.test(orderData.paymentMethod || '') ? 'Pending' : 'Paid'),
        paymentMethod: orderData.paymentMethod || 'Razorpay UPI/Card',
        paymentId: orderData.paymentId || undefined,
        paymentRef: orderData.paymentRef || orderData.razorpayOrderId || undefined,
        status: orderData.status || 'In Transit',
        deliveryAddress: typeof orderData.deliveryAddress === 'string'
          ? orderData.deliveryAddress
          : orderData.address?.fullAddress || 'Selected Delivery Address'
      };

      // Resolve drop coordinates (for dispatch / ETA) + dark-store pickup origin.
      const dropLat = Number(orderData.deliveryLat ?? orderData.address?.lat ?? orderData.lat);
      const dropLng = Number(orderData.deliveryLng ?? orderData.address?.lng ?? orderData.lng);
      if (Number.isFinite(dropLat) && Number.isFinite(dropLng)) {
        normalizedOrder.deliveryLocation = { lat: dropLat, lng: dropLng };
      }
      try {
        const s = await Settings.findOne();
        if (s?.storeOrigin) normalizedOrder.pickup = { name: s.storeOrigin.name, lat: s.storeOrigin.lat, lng: s.storeOrigin.lng };
      } catch (_) {}

      let order;
      try {
        order = await Order.create(normalizedOrder);
        // Reconciliation record (best-effort).
        Payment.create({
          transactionId: normalizedOrder.paymentId || `txn_${normalizedOrder.orderId}`,
          orderId: normalizedOrder.orderId,
          customerId: normalizedOrder.customerId,
          amount: normalizedOrder.totalAmount,
          status: normalizedOrder.paymentStatus === 'Paid' ? 'Success' : 'Pending',
          gateway: normalizedOrder.paymentMethod?.toLowerCase().includes('wallet') ? 'Wallet' : 'Razorpay',
        }).catch(() => {});
        if (normalizedOrder.items && Array.isArray(normalizedOrder.items)) {
          for (const item of normalizedOrder.items) {
            if (item.productId) {
              // Product.stock is an object { status, quantity } — decrement the
              // nested quantity, not the object itself.
              await Product.updateOne(
                { id: item.productId },
                { $inc: { 'stock.quantity': -Number(item.quantity || 0) } }
              ).catch(() => { });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Order DB create note:', dbErr.message);
        order = { ...normalizedOrder, _id: 'ord_mock_' + Date.now() };
      }

      const io = req.app.get('io');
      if (io) {
        io.to(normalizedOrder.orderId).emit('order_status_update', {
          orderId: normalizedOrder.orderId,
          status: order.status || normalizedOrder.status,
          note: 'Order placed',
          eta: order.estimatedDelivery,
          at: new Date().toISOString(),
        });
      }

      res.status(201).json({ success: true, order });
    } catch (err) {
      console.warn('createOrder fallback note:', err.message);
      res.status(201).json({ success: true, order: { orderId: 'PNNHJHTYP' + Date.now(), status: 'In Transit' } });
    }
  },

  // POST /api/orders/:id/cancel  { reason, phone? }  (attachCustomerOptional)
  // Customer self-service cancel — identity from the app's customer token, or
  // from a { phone } in the body for the token-less web storefront. Allowed
  // only before the order leaves the store; a prepaid order is refunded to
  // the wallet.
  cancelOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) {
        return res.status(401).json({ success: false, message: 'Sign in to cancel this order' });
      }
      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const owns = order.customerId === cust.customerId
        || (phone10 && String(order.customerPhone || '').endsWith(phone10));
      if (!owns) return res.status(403).json({ success: false, message: 'Not your order' });

      if (order.status === 'Cancelled') {
        return res.status(409).json({ success: false, message: 'Order is already cancelled' });
      }
      const CANCELLABLE = ['Pending', 'In Transit', 'Accepted', 'Packed', 'Ready'];
      if (!CANCELLABLE.includes(order.status)) {
        return res.status(409).json({
          success: false,
          message: `An order that is ${order.status.toLowerCase()} can no longer be cancelled`,
        });
      }

      const reason = String(req.body.reason || '').trim().slice(0, 300) || 'Cancelled by customer';
      order.status = 'Cancelled';
      order.failureReason = reason;
      order.trackingTimeline.push({ status: 'Cancelled', note: reason });

      // Release any rider that was already offered/assigned this order.
      await cancelForOrder(order.orderId, 'order cancelled').catch(() => {});
      order.deliveryPartnerUserId = undefined;
      order.assignmentId = undefined;

      // Refund a prepaid (non-COD) order to the wallet.
      let walletBalance;
      const isCod = /cod|cash/i.test(order.paymentMethod || '');
      const refunded = order.paymentStatus === 'Paid' && Number(order.totalAmount) > 0 && !isCod;
      if (refunded) {
        const amt = Number(order.totalAmount);
        cust.walletBalance = (cust.walletBalance || 0) + amt;
        await cust.save();
        walletBalance = cust.walletBalance;
        order.paymentStatus = 'Refunded';
        await WalletTransaction.create({
          customerId: cust.customerId,
          amount: amt,
          type: 'Credit',
          description: `Refund for cancelled order ${order.orderId}`,
        });
      }

      await order.save();

      const io = req.app.get('io');
      if (io) {
        io.to(order.orderId).emit('order_status_update', {
          orderId: order.orderId,
          status: 'Cancelled',
          note: reason,
          timeline: order.trackingTimeline,
          at: new Date().toISOString(),
        });
      }

      res.json({ success: true, order, refunded, walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/orders/:id/rate-partner  { stars (1-5), comment? }
  // attachCustomerOptional — app customer token OR { phone } in the body (web).
  // Only the order owner, only after Delivered, one rating per order (re-submit
  // to edit). Recomputes DeliveryPartner.rating/ratingCount from every rated
  // order for that partner.
  ratePartner: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) return res.status(401).json({ success: false, message: 'Sign in to rate this delivery' });

      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const owns = order.customerId === cust.customerId
        || (phone10 && String(order.customerPhone || '').endsWith(phone10));
      if (!owns) return res.status(403).json({ success: false, message: 'Not your order' });

      if (order.status !== 'Delivered') {
        return res.status(409).json({ success: false, message: 'You can rate the delivery only after it is delivered' });
      }
      if (!order.deliveryPartnerUserId) {
        return res.status(409).json({ success: false, message: 'This order had no delivery partner to rate' });
      }

      const stars = Number(req.body.stars ?? req.body.rating);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      const comment = String(req.body.comment || '').trim().slice(0, 500);

      order.deliveryRating = { stars: Math.round(stars), comment: comment || undefined, at: new Date() };
      await order.save();

      // Recompute the partner's aggregate rating from all their rated orders.
      const partnerUserId = order.deliveryPartnerUserId;
      const [agg] = await Order.aggregate([
        { $match: { deliveryPartnerUserId: partnerUserId, 'deliveryRating.stars': { $gte: 1 } } },
        { $group: { _id: null, avg: { $avg: '$deliveryRating.stars' }, count: { $sum: 1 } } },
      ]);
      const ratingCount = agg?.count || 0;
      const rating = agg ? Math.round(agg.avg * 100) / 100 : 5;
      await DeliveryPartner.updateOne({ userId: partnerUserId }, { $set: { rating, ratingCount } });

      // Low-rating alert for ops.
      if (order.deliveryRating.stars <= 2) {
        try {
          const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } }).select('_id');
          await Notification.insertMany(admins.map((a) => ({
            userId: String(a._id),
            title: 'Low delivery rating',
            body: `Order ${order.orderId} rated ${order.deliveryRating.stars}★${comment ? `: "${comment}"` : ''}.`,
            type: 'Order',
          })));
        } catch (_) {}
      }

      res.json({ success: true, deliveryRating: order.deliveryRating, partnerRating: rating, partnerRatingCount: ratingCount });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status, note, deliveryPartnerId, deliveryPartnerName } = req.body;
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      order.status = status;
      if (deliveryPartnerId) {
        order.deliveryPartnerId = deliveryPartnerId;
        order.deliveryPartnerName = deliveryPartnerName;
      }
      order.trackingTimeline.push({
        status,
        note: note || `Order status updated to ${status}.`
      });

      if (status === 'Delivered') {
        order.paymentStatus = 'Paid';
        order.deliveredAt = order.deliveredAt || new Date();
      }

      // If an assigned order gets cancelled here, release the partner + revoke.
      if (['Cancelled', 'Returned', 'Refunded'].includes(status)) {
        await cancelForOrder(order.orderId, `order ${status.toLowerCase()}`).catch(() => {});
        order.deliveryPartnerUserId = undefined;
        order.assignmentId = undefined;
      }

      await order.save();

      // Auto-dispatch: when an order becomes Ready with no partner, offer it to
      // the nearest available rider (P1-D1). Non-blocking, opt-out via Settings.
      if (status === 'Ready' && !order.deliveryPartnerUserId) {
        Settings.findOne()
          .then((s) => {
            if (!s || s.autoAssignEnabled !== false) return tryAssign(order.orderId);
          })
          .catch(() => {});
      }

      // Push the change to anyone watching this order's room.
      const io = req.app.get('io');
      if (io) {
        io.to(order.orderId).emit('order_status_update', {
          orderId: order.orderId,
          status: order.status,
          note: order.trackingTimeline.at(-1)?.note || '',
          eta: order.estimatedDelivery,
          timeline: order.trackingTimeline,
          at: new Date().toISOString(),
        });
      }

      // FCM to the customer's devices for the milestones they care about.
      const PUSHABLE = {
        'Out For Delivery': 'Your order is on the way',
        Arrived: 'Your delivery partner has arrived',
        Delivered: 'Order delivered',
        Cancelled: 'Order cancelled',
      };
      if (PUSHABLE[order.status] && order.customerId) {
        sendToOwner(order.customerId, {
          title: PUSHABLE[order.status],
          body: `Order ${order.orderId} is now ${order.status}.`,
          data: { type: 'order_update', orderId: order.orderId, status: order.status },
        }).catch(() => {});
      }

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/orders/:id/rider-location  { lat, lng, etaMinutes }  (staff/delivery)
  // A rider/dispatch producer for the tracking map. Emits to the order room.
  updateRiderLocation: async (req, res) => {
    try {
      const { lat, lng, etaMinutes, riderName, riderPhone } = req.body;
      const io = req.app.get('io');
      if (io) {
        io.to(req.params.id).emit('rider_location_update', {
          orderId: req.params.id,
          lat: Number(lat),
          lng: Number(lng),
          etaMinutes: etaMinutes != null ? Number(etaMinutes) : undefined,
          riderName,
          riderPhone,
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 6. COUPON CONTROLLER
// ==========================================
export const couponController = {
  getCoupons: async (req, res) => {
    try {
      const list = await Coupon.find().sort({ createdAt: -1 });
      res.json({ success: true, coupons: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/coupons/validate  { code, subtotal }
  // Server-side discount calc so the client can't fabricate one.
  validateCoupon: async (req, res) => {
    try {
      const code = String(req.body.code || '').trim().toUpperCase();
      const subtotal = Number(req.body.subtotal) || 0;
      if (!code) {
        return res.status(400).json({ success: false, valid: false, message: 'Coupon code is required' });
      }

      const coupon = await Coupon.findOne({ code: new RegExp(`^${code}$`, 'i') });
      if (!coupon || coupon.active === false) {
        return res.json({ success: true, valid: false, discount: 0, message: 'This coupon is not valid' });
      }
      if (subtotal < (coupon.minOrder || 0)) {
        return res.json({
          success: true,
          valid: false,
          discount: 0,
          message: `Add items worth ₹${(coupon.minOrder - subtotal).toFixed(0)} more to use ${coupon.code}`
        });
      }

      let discount = coupon.isPercent
        ? Math.round((subtotal * Number(coupon.value)) / 100)
        : Number(coupon.value);
      // Percentage coupons are capped at ₹100 (matches the web storefront).
      if (coupon.isPercent) discount = Math.min(discount, 100);
      discount = Math.max(0, Math.min(discount, subtotal));

      res.json({
        success: true,
        valid: true,
        code: coupon.code,
        discount,
        description: coupon.description || coupon.discount,
        message: `${coupon.code} applied — you saved ₹${discount}`
      });
    } catch (err) {
      res.status(500).json({ success: false, valid: false, message: err.message });
    }
  },

  createCoupon: async (req, res) => {
    try {
      const coupon = await Coupon.create(req.body);
      res.status(201).json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      await Coupon.findOneAndDelete({ code: req.params.code });
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const coupon = await Coupon.findOneAndUpdate({ code: req.params.code }, req.body, { new: true });
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
      res.json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 7. BLOG CONTROLLER
// ==========================================
export const blogController = {
  getBlogs: async (req, res) => {
    try {
      const list = await Blog.find().sort({ createdAt: -1 });
      res.json({ success: true, blogs: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createBlog: async (req, res) => {
    try {
      const blogData = req.body;
      if (!blogData.id) {
        blogData.id = 'blog_' + Date.now();
      }
      if (!blogData.date) {
        blogData.date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      const blog = await Blog.create(blogData);
      res.status(201).json({ success: true, blog });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteBlog: async (req, res) => {
    try {
      await Blog.findOneAndDelete({ id: req.params.id });
      res.json({ success: true, message: 'Article deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateBlog: async (req, res) => {
    try {
      const blog = await Blog.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      if (!blog) return res.status(404).json({ success: false, message: 'Blog article not found' });
      res.json({ success: true, blog });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 8. SETTINGS CONTROLLER
// ==========================================
export const settingsController = {
  getSettings: async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      let settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/app/config  (public) — customer-app runtime config: version gate,
  // maintenance flag, support contacts. Kept small and cache-friendly.
  getAppConfig: async (req, res) => {
    try {
      const s = await Settings.findOne();
      const c = (s && s.appConfig) || {};
      res.json({
        success: true,
        config: {
          minSupportedVersion: c.minSupportedVersion || '1.0.0',
          latestVersion: c.latestVersion || c.minSupportedVersion || '1.0.0',
          maintenance: !!c.maintenance,
          maintenanceMessage:
            c.maintenanceMessage ||
            'FreshCart is briefly down for maintenance. Please try again shortly.',
          updateUrl: c.updateUrl || '',
          supportEmail: (s && s.supportEmail) || 'support@freshcart.com',
          supportPhone: (s && s.supportPhone) || '',
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 9. CUSTOMERS CONTROLLER
// ==========================================
export const customerController = {
  getCustomers: async (req, res) => {
    try {
      const list = await Customer.find().sort({ createdAt: -1 });
      res.json({ success: true, customers: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  authCustomer: async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const formattedPhone = `+91 ${cleanPhone}`;

      let customer = await Customer.findOne({
        $or: [
          { phone: formattedPhone },
          { phone: phone },
          { phone: new RegExp(cleanPhone + '$') }
        ]
      });

      if (!customer) {
        const customerId = 'cust_' + cleanPhone;
        customer = await Customer.create({
          customerId,
          phone: formattedPhone,
          name: `Customer (${cleanPhone.slice(-4)})`,
          email: '',
          addresses: [
            {
              id: 'addr_' + Date.now(),
              label: 'Home',
              houseNo: 'Flat 402, Balaji Heights',
              landmark: 'Near Balaji Temple',
              area: 'KPHB Phase 3',
              fullAddress: 'Flat 402, Balaji Heights, KPHB Phase 3, Kukatpally, Hyderabad, Telangana 500072, India',
              city: 'Hyderabad',
              pincode: '500072',
              lat: 17.4842,
              lng: 78.3888,
              isDefault: true
            }
          ]
        });
      }

      res.json({ success: true, customer });
    } catch (err) {
      console.warn('authCustomer DB error, returning phone fallback object:', err.message);
      const cleanPhone = (req.body.phone || '9876543210').replace(/\D/g, '').slice(-10);
      res.json({
        success: true,
        customer: {
          customerId: 'cust_' + cleanPhone,
          phone: `+91 ${cleanPhone}`,
          name: `Customer (${cleanPhone.slice(-4)})`,
          email: '',
          addresses: []
        }
      });
    }
  },

  getCustomerProfile: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };
      const customer = await Customer.findOne(query);
      if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
      res.json({ success: true, customer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const { name, email } = req.body;

      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      let customer = await Customer.findOneAndUpdate(
        query,
        { $set: { name, email } },
        { new: true, upsert: true }
      );

      if (!customer.phone) {
        customer.phone = id;
        customer.customerId = 'cust_' + Date.now();
        await customer.save();
      }

      res.json({ success: true, customer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addAddress: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const { name, receiverPhone, label, houseNo, landmark, area, fullAddress, pincode, lat, lng } = req.body;

      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      let customer = await Customer.findOne(query);
      if (!customer) {
        customer = await Customer.create({
          customerId: 'cust_' + (cleanPhone || Date.now()),
          phone: `+91 ${cleanPhone}`,
          name: name || `Customer (${cleanPhone.slice(-4)})`,
          addresses: []
        });
      }

      const newAddress = {
        id: 'addr_' + Date.now(),
        name: name || customer.name || '',
        receiverPhone: receiverPhone || customer.phone || '',
        label: label || 'Home',
        houseNo: houseNo || '',
        landmark: landmark || '',
        area: area || 'KPHB Colony',
        fullAddress: fullAddress || `${houseNo ? houseNo + ', ' : ''}${landmark ? landmark + ', ' : ''}${area || 'KPHB Colony'}`,
        pincode: pincode || '500072',
        lat: lat || 17.4842,
        lng: lng || 78.3888,
        isDefault: customer.addresses ? customer.addresses.length === 0 : true
      };

      if (!customer.addresses) customer.addresses = [];
      customer.addresses.push(newAddress);
      if (name && (!customer.name || customer.name.startsWith('Customer'))) {
        customer.name = name;
      }
      await customer.save();

      res.json({ success: true, addresses: customer.addresses, newAddress });
    } catch (err) {
      console.warn('addAddress DB fallback note:', err.message);
      const newAddress = {
        id: 'addr_' + Date.now(),
        name: req.body.name || 'Customer',
        receiverPhone: req.body.receiverPhone || '',
        label: req.body.label || 'Home',
        houseNo: req.body.houseNo || '',
        landmark: req.body.landmark || '',
        area: req.body.area || 'KPHB Colony',
        fullAddress: req.body.fullAddress || 'Selected Delivery Address',
        pincode: req.body.pincode || '500072',
        lat: req.body.lat || 17.4842,
        lng: req.body.lng || 78.3888,
        isDefault: true
      };
      res.json({ success: true, addresses: [newAddress], newAddress });
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const { id, addressId } = req.params;
      const customer = await Customer.findOne({ $or: [{ customerId: id }, { phone: id }] });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      customer.addresses = customer.addresses.filter(a => a.id !== addressId);
      await customer.save();

      res.json({ success: true, addresses: customer.addresses });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/:id  (staff only) — admin removal of a customer record.
  deleteAccount: async (req, res) => {
    try {
      const customer = await Customer.findOneAndDelete({ $or: [{ customerId: req.params.id }, { phone: req.params.id }] });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/me  (attachCustomerOptional — app token OR ?phone= for
  // the token-less web storefront). Customer self-service account deletion:
  // removes the profile + wallet ledger + their reviews, and scrubs the name
  // from past orders (kept as financial/delivery records).
  deleteMe: async (req, res) => {
    try {
      let customer = req.customer;
      if (!customer) {
        const raw = String(req.query.phone || req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) customer = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!customer) {
        return res.status(401).json({ success: false, message: 'Sign in to delete your account' });
      }

      const cid = customer.customerId;
      const phone10 = String(customer.phone || '').replace(/\D/g, '').slice(-10);

      await Promise.allSettled([
        Customer.deleteOne({ customerId: cid }),
        Review.deleteMany({ customerId: cid }),
        WalletTransaction.deleteMany({ customerId: cid }),
        Order.updateMany(
          {
            $or: [
              { customerId: cid },
              ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : []),
            ],
          },
          { $set: { customerName: 'Deleted user' } },
        ),
      ]);

      res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateWallet: async (req, res) => {
    try {
      const { amount, type, description } = req.body; // type: Credit / Debit
      const customer = await Customer.findOne({ customerId: req.params.id });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });

      const numVal = Number(amount);
      if (type === 'Credit') {
        customer.walletBalance += numVal;
      } else {
        customer.walletBalance = Math.max(0, customer.walletBalance - numVal);
      }

      await customer.save();
      await WalletTransaction.create({ customerId: customer.customerId, amount: numVal, type, description });

      res.json({ success: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/wallet/debit  { amount, orderId }  (protectCustomer)
  // Server-side wallet payment for checkout. Rejects if the balance is short.
  walletDebit: async (req, res) => {
    try {
      const customer = req.customer;
      const val = Number(req.body.amount);
      if (!val || val <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }
      if ((customer.walletBalance || 0) < val) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
      customer.walletBalance -= val;
      await customer.save();
      await WalletTransaction.create({
        customerId: customer.customerId,
        amount: val,
        type: 'Debit',
        description: req.body.orderId ? `Payment for order ${req.body.orderId}` : 'Order payment',
      });
      res.json({ success: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/wallet/topup  { amount }  (protectCustomer)
  // Step 1: create a Razorpay order for a wallet top-up. Nothing is credited yet.
  walletTopup: async (req, res) => {
    try {
      const val = Math.round(Number(req.body.amount));
      if (!val || val < 1 || val > 100000) {
        return res.status(400).json({ success: false, message: 'Enter an amount between ₹1 and ₹1,00,000' });
      }
      const receipt = `wallet_${req.customer.customerId}_${Date.now()}`.slice(0, 40);
      try {
        const order = await razorpayInstance.orders.create({ amount: val * 100, currency: 'INR', receipt });
        return res.json({
          success: true, testMode: isPaymentsTestMode(),
          orderId: order.id, amount: order.amount, currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID || '',
        });
      } catch (err) {
        if (isPaymentsTestMode()) {
          return res.json({
            success: true, testMode: true,
            orderId: `order_test_${Date.now()}`, amount: val * 100, currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID || '',
          });
        }
        throw err;
      }
    } catch (err) {
      res.status(502).json({ success: false, message: 'Could not start the top-up. Try again.' });
    }
  },

  // POST /api/customers/me/wallet/topup/verify
  //   { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }
  // Step 2: verify the payment, then credit the wallet + write a ledger row.
  walletTopupVerify: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const val = Math.round(Number(req.body.amount));
      if (!val || val < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

      if (!isPaymentsTestMode()) {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({ success: false, message: 'Missing Razorpay verification fields' });
        }
        const expected = crypto
          .createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(String(razorpay_signature), 'utf8');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return res.status(400).json({ success: false, verified: false, message: 'Signature verification failed' });
        }
      }

      const customer = req.customer;
      customer.walletBalance = (customer.walletBalance || 0) + val;
      await customer.save();
      await WalletTransaction.create({
        customerId: customer.customerId,
        amount: val,
        type: 'Credit',
        description: `Wallet top-up${razorpay_payment_id ? ` (${razorpay_payment_id})` : ''}`,
      });
      res.json({ success: true, verified: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/customers/me/wallet/transactions?limit=  (protectCustomer)
  // The signed-in customer's own wallet ledger, newest first.
  walletTransactions: async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const list = await WalletTransaction.find({ customerId: req.customer.customerId })
        .sort({ date: -1 })
        .limit(limit);
      res.json({
        success: true,
        walletBalance: req.customer.walletBalance || 0,
        transactions: list,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/devices  { token, platform }
  registerDevice: async (req, res) => {
    try {
      const { token, platform } = req.body || {};
      if (!token) return res.status(400).json({ success: false, message: 'token required' });
      await registerDeviceToken({ ownerType: 'customer', ownerId: req.customer.customerId, token, platform });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/me/devices/:token
  removeDevice: async (req, res) => {
    try {
      await removeDeviceToken(req.params.token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 10. SUPPORT CONTROLLER
// ==========================================
export const supportController = {
  getTickets: async (req, res) => {
    try {
      const list = await SupportTicket.find().sort({ updatedAt: -1 });
      res.json({ success: true, tickets: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addTicketMessage: async (req, res) => {
    try {
      const { sender, content, status } = req.body;
      const ticket = await SupportTicket.findOne({ ticketId: req.params.id });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      ticket.messages.push({ sender, content });
      if (status) ticket.status = status;

      await ticket.save();
      res.json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createTicket: async (req, res) => {
    try {
      const { customerId, customerName, subject, priority, message } = req.body;
      const ticketId = 'TCK-' + Math.floor(1000 + Math.random() * 9000);
      const ticket = await SupportTicket.create({
        ticketId,
        customerId,
        customerName,
        subject,
        priority,
        messages: [{ sender: 'Customer', content: message }]
      });
      res.status(201).json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateTicketStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const ticket = await SupportTicket.findOneAndUpdate({ ticketId: req.params.id }, { status }, { new: true });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const brandController = {
  getBrands: async (req, res) => {
    try {
      const list = await Brand.find().sort({ name: 1 });
      res.json({ success: true, brands: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  createBrand: async (req, res) => {
    try {
      const brand = await Brand.create(req.body);
      res.status(201).json({ success: true, brand });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  updateBrand: async (req, res) => {
    try {
      const brand = await Brand.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
      res.json({ success: true, brand });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  deleteBrand: async (req, res) => {
    try {
      const brand = await Brand.findOneAndDelete({ id: req.params.id });
      if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
      res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const inventoryController = {
  getInventory: async (req, res) => {
    try {
      const list = await Inventory.find().sort({ updatedAt: -1 });
      res.json({ success: true, inventory: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  adjustStock: async (req, res) => {
    try {
      const { productId, warehouseId, qty, action, note } = req.body;
      let item = await Inventory.findOne({ productId, warehouseId });
      const prevQty = item ? item.stockQty : 0;
      const newQty = Math.max(0, prevQty + Number(qty));

      if (!item) {
        item = await Inventory.create({
          productId,
          warehouseId,
          stockQty: newQty,
          logs: [{ action: action || 'Adjustment', qty, prevQty, newQty, note: note || 'Initial adjustment' }]
        });
      } else {
        item.stockQty = newQty;
        item.logs.push({ action: action || 'Adjustment', qty, prevQty, newQty, note });
        await item.save();
      }

      // Sync product main stock level. Product.stock is { status, quantity } —
      // write the nested fields instead of clobbering the object with a number.
      await Product.updateOne(
        { id: productId },
        {
          $set: {
            'stock.quantity': newQty,
            'stock.status': newQty <= 0 ? 'Out of Stock' : (newQty < 15 ? 'Low Stock' : 'In Stock')
          }
        }
      );

      res.json({ success: true, inventory: item });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const employeeController = {
  getEmployees: async (req, res) => {
    try {
      const list = await User.find({ role: { $ne: 'Customer' } }).sort({ name: 1 });
      res.json({ success: true, employees: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  createEmployee: async (req, res) => {
    try {
      const { name, email, phone, role } = req.body;
      const plainPassword = req.body.password || (role === 'Delivery' ? 'delivery123' : 'staff123');
      const employee = await User.create({
        name,
        email,
        phone,
        password: plainPassword,
        role: role || 'Employee',
        status: 'Active'
      });

      // Email the login credentials to a newly-created delivery partner.
      // Non-blocking — a mail hiccup must not fail account creation.
      if ((role || '') === 'Delivery' && email) {
        sendDeliveryCredentials({
          to: email,
          name,
          email,
          password: plainPassword,
          mode: 'created',
        }).catch((e) => console.error('[mail] createEmployee credentials:', e?.message || e));
      }

      res.status(201).json({ success: true, employee });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  updateEmployee: async (req, res) => {
    try {
      const employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, employee });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      const employee = await User.findByIdAndDelete(req.params.id);
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// Recompute a product's aggregate rating from its Approved reviews.
async function recomputeProductRating(productId) {
  if (!productId) return;
  const approved = await Review.find({ productId, status: 'Approved' });
  if (!approved.length) return;
  const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
  await Product.updateOne(
    { id: productId },
    { $set: { rating: Math.round(avg * 10) / 10, reviewsCount: approved.length } },
  ).catch(() => {});
}

export const reviewController = {
  getReviews: async (req, res) => {
    try {
      const list = await Review.find().sort({ createdAt: -1 });
      res.json({ success: true, reviews: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/products/:id/reviews  (public) — Approved reviews + a rating summary.
  getProductReviews: async (req, res) => {
    try {
      const productId = req.params.id;
      const list = await Review.find({ productId, status: 'Approved' }).sort({ createdAt: -1 });
      const count = list.length;
      const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
      const distribution = [0, 0, 0, 0, 0]; // index 0 => 1 star
      for (const r of list) {
        if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1] += 1;
      }
      res.json({
        success: true,
        summary: { average: Math.round(average * 10) / 10, count, distribution },
        reviews: list,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/products/:id/reviews  { rating, comment, phone? }  (attachCustomerOptional)
  // Identity from the app's customer token, or from a { phone } in the body for
  // the token-less web storefront. Only a customer who has received this product
  // in a Delivered order may review it, one review per product (a repeat call
  // edits the existing one). New/edited reviews enter moderation as 'Pending'.
  createProductReview: async (req, res) => {
    try {
      const productId = req.params.id;
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      const product = await Product.findOne({ id: productId });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) {
        return res.status(401).json({ success: false, message: 'Sign in to write a review' });
      }
      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const delivered = await Order.findOne({
        status: 'Delivered',
        'items.productId': productId,
        $or: [
          { customerId: cust.customerId },
          ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : []),
        ],
      });
      if (!delivered) {
        return res.status(403).json({
          success: false,
          message: 'You can review this only after receiving it in an order',
        });
      }

      const comment = String(req.body.comment || '').trim().slice(0, 1000);
      const existing = await Review.findOne({ productId, customerId: cust.customerId });
      if (existing) {
        existing.rating = rating;
        existing.comment = comment;
        existing.customerName = cust.name || existing.customerName || 'Customer';
        existing.status = 'Pending';
        await existing.save();
        return res.json({ success: true, review: existing, updated: true });
      }
      const review = await Review.create({
        productId,
        customerId: cust.customerId,
        customerName: cust.name || 'Customer',
        rating,
        comment,
        status: 'Pending',
      });
      res.status(201).json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateReviewStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      recomputeProductRating(review.productId);
      res.json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  deleteReview: async (req, res) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      recomputeProductRating(review.productId);
      res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /api/reviews/bulk-status  { ids: [], status: 'Approved' | 'Rejected' | 'Pending' }
  bulkUpdateReviewStatus: async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !ids.length || !['Approved', 'Rejected', 'Pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'ids[] and a valid status are required' });
      }
      const affected = await Review.find({ _id: { $in: ids } }).select('productId').lean();
      const r = await Review.updateMany({ _id: { $in: ids } }, { $set: { status } });
      [...new Set(affected.map((a) => a.productId))].forEach(recomputeProductRating);
      res.json({ success: true, updated: r.modifiedCount ?? r.nModified ?? 0 });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const auditLogController = {
  getAuditLogs: async (req, res) => {
    try {
      const list = await AuditLog.find().sort({ timestamp: -1 });
      res.json({ success: true, logs: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  clearAuditLogs: async (req, res) => {
    try {
      await AuditLog.deleteMany({});
      res.json({ success: true, message: 'Audit logs cleared' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const uploadController = {
  uploadImage: async (req, res) => {
    try {
      const { image, folder } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, message: 'No image data provided' });
      }
      try {
        const result = await uploadToCloudinary(image, folder || 'freshcart');
        return res.json({
          success: true,
          url: result.url,
          public_id: result.public_id
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning, returning local data URI fallback:', cloudErr.message);
        return res.json({
          success: true,
          url: image,
          public_id: 'local_fallback_' + Date.now(),
          fallback: true
        });
      }
    } catch (err) {
      console.error('Upload controller error:', err);
      res.status(500).json({ success: false, message: err.message || 'Image upload failed' });
    }
  }
};

export const logAudit = async (userId, userName, action, details) => {
  try {
    await AuditLog.create({ userId, userName, action, details });
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
};

export const specialGroupController = {
  getSpecialGroups: async (req, res) => {
    try {
      const groups = await SpecialGroup.find().sort({ displayOrder: 1 });
      res.json({ success: true, groups });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createSpecialGroup: async (req, res) => {
    try {
      const { id, title, displayOrder, active, items } = req.body;
      const groupId = id || 'sg_' + Date.now();
      const group = await SpecialGroup.create({
        id: groupId,
        title,
        slug: title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
        displayOrder: displayOrder || 0,
        active: active !== undefined ? active : true,
        items: items || []
      });
      res.status(201).json({ success: true, group });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateSpecialGroup: async (req, res) => {
    try {
      const { id } = req.params;
      let group = await SpecialGroup.findOneAndUpdate(
        { id },
        { $set: req.body },
        { new: true }
      );
      if (!group) {
        group = await SpecialGroup.findOneAndUpdate(
          { id },
          { $set: { ...req.body, id } },
          { new: true, upsert: true }
        );
      }
      res.json({ success: true, group });
    } catch (err) {
      console.error('updateSpecialGroup error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteSpecialGroup: async (req, res) => {
    try {
      const { id } = req.params;
      await SpecialGroup.findOneAndDelete({ id });
      res.json({ success: true, message: 'Special group deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const bannerController = {
  getBanners: async (req, res) => {
    try {
      const banners = await Banner.find().sort({ positionIndex: 1 });
      res.json({ success: true, banners });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createBanner: async (req, res) => {
    try {
      const { id, title, subtitle, tag, gradient, imageUrl, buttonText, linkUrl, positionIndex, subCategoryName, active, displayOn, targetPlatform, categoryId, subcategoryId, position, themeBgColor, themeTextColor, themeAccentColor, startDate, endDate } = req.body;
      const bannerId = id || 'banner_' + Date.now();
      const banner = await Banner.create({
        id: bannerId,
        title,
        subtitle,
        tag,
        gradient: gradient || ['#10B981', '#059669'],
        imageUrl,
        buttonText,
        linkUrl,
        positionIndex: positionIndex || 1,
        subCategoryName,
        active: active !== undefined ? active : true,
        displayOn: displayOn || 'HOME',
        targetPlatform: targetPlatform || 'ALL',
        categoryId,
        subcategoryId,
        position,
        themeBgColor: themeBgColor || '',
        themeTextColor: themeTextColor || '',
        themeAccentColor: themeAccentColor || '',
        startDate,
        endDate
      });
      res.status(201).json({ success: true, banner });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      let banner = await Banner.findOneAndUpdate(
        { id },
        { $set: req.body },
        { new: true }
      );
      if (!banner) {
        banner = await Banner.findOneAndUpdate(
          { id },
          { $set: { ...req.body, id } },
          { new: true, upsert: true }
        );
      }
      res.json({ success: true, banner });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;
      await Banner.findOneAndDelete({ id });
      res.json({ success: true, message: 'Banner deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

export const promoCardController = {
  getPromoCards: async (req, res) => {
    try {
      const cards = await PromoCard.find().sort({ displayOrder: 1 });
      res.json({ success: true, promoCards: cards });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createPromoCard: async (req, res) => {
    try {
      const { id, title, subtitle, buttonText, bgType, bgGradient, bgImageUrl, imageUrl, textColor, displayOn, categoryId, subCategoryId, subCategoryName, linkUrl, displayOrder, active } = req.body;
      const promoId = id || 'promo_' + Date.now();
      const card = await PromoCard.create({
        id: promoId,
        title,
        subtitle: subtitle || '',
        buttonText: buttonText || 'Order Now',
        bgType: bgType || 'color',
        bgGradient: bgGradient || 'linear-gradient(135deg, #00b09b, #96c93d)',
        bgImageUrl: bgImageUrl || '',
        imageUrl: imageUrl || '',
        textColor: textColor || '#ffffff',
        displayOn: displayOn || 'HOME',
        categoryId: categoryId || '',
        subCategoryId: subCategoryId || '',
        subCategoryName: subCategoryName || '',
        linkUrl: linkUrl || '',
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
        active: active !== undefined ? active : true
      });
      res.status(201).json({ success: true, promoCard: card });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updatePromoCard: async (req, res) => {
    try {
      const { id } = req.params;
      let card = await PromoCard.findOneAndUpdate(
        { id },
        { $set: req.body },
        { new: true }
      );
      if (!card) {
        card = await PromoCard.findOneAndUpdate(
          { id },
          { $set: { ...req.body, id } },
          { new: true, upsert: true }
        );
      }
      res.json({ success: true, promoCard: card });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deletePromoCard: async (req, res) => {
    try {
      const { id } = req.params;
      await PromoCard.findOneAndDelete({ id });
      res.json({ success: true, message: 'Promo card deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


export const paymentController = {
  createRazorpayOrder: async (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    try {
      const { amount, currency = 'INR', receipt } = req.body;
      const options = {
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
      };

      const order = await razorpayInstance.orders.create(options);
      res.json({
        success: true,
        testMode: isPaymentsTestMode(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: keyId,
      });
    } catch (err) {
      console.warn('Razorpay order creation fallback:', err.message);
      // Only fall back to a fake order id when we're intentionally in test mode.
      if (isPaymentsTestMode()) {
        return res.json({
          success: true,
          testMode: true,
          orderId: `order_test_${Date.now()}`,
          amount: Math.round(Number(req.body.amount || 100) * 100),
          currency: 'INR',
          key: keyId,
        });
      }
      res.status(502).json({ success: false, message: 'Could not create a payment order. Try again.' });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Dev/demo path: no real Razorpay secret configured. Report verified but
      // flag it clearly so the client can gate real order confirmation on env.
      if (isPaymentsTestMode()) {
        return res.json({
          success: true,
          verified: true,
          testMode: true,
          message: 'Payment accepted in test mode (no signature check performed)',
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Missing razorpay_order_id, razorpay_payment_id or razorpay_signature',
        });
      }

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      // Constant-time comparison to avoid timing leaks.
      const a = Buffer.from(expectedSignature, 'utf8');
      const b = Buffer.from(String(razorpay_signature), 'utf8');
      const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Payment signature verification failed',
        });
      }

      res.json({
        success: true,
        verified: true,
        testMode: false,
        message: 'Payment verified successfully',
      });
    } catch (err) {
      res.status(500).json({ success: false, verified: false, message: err.message });
    }
  },

  // POST /api/payment/webhook — Razorpay server-to-server events.
  // Body is a raw Buffer (see app.js). Verifies X-Razorpay-Signature and marks
  // the matching order Paid on payment.captured / order.paid.
  webhook: async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

      if (!secret || !signature) {
        return res.status(400).json({ success: false, message: 'Missing webhook secret or signature' });
      }
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(String(signature), 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }

      const event = JSON.parse(raw.toString('utf8'));
      const entity = event?.payload?.payment?.entity || event?.payload?.order?.entity || {};
      const rzpOrderId = entity.order_id || entity.id;
      const paymentId = entity.id;

      if ((event.event === 'payment.captured' || event.event === 'order.paid') && rzpOrderId) {
        await Order.updateOne(
          { paymentRef: rzpOrderId },
          { $set: { paymentStatus: 'Paid', ...(paymentId ? { paymentId } : {}) } }
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.warn('Razorpay webhook error:', err.message);
      res.status(200).json({ success: false }); // 200 so Razorpay doesn't spam retries on parse errors
    }
  },
};

