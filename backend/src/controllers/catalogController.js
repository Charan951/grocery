import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
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
import { signToken, maskPhone, isPaymentsTestMode, razorpayInstance, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, logAudit } from './_shared.js';

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



