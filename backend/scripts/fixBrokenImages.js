import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Product, Category, SpecialGroup } from '../src/models/Catalog.js';
import { FestivalCampaign } from '../src/models/FestivalCampaign.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/freshcart';

const REPLACEMENTS = [
  {
    pattern: /purepng\.com.*cheese/i,
    replacement: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800&auto=format&fit=crop'
  },
  {
    pattern: /purepng\.com.*egg/i,
    replacement: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop'
  },
  {
    pattern: /purepng\.com/i,
    replacement: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop'
  },
  {
    pattern: /th\.bing\.com/i,
    replacement: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop'
  },
  {
    pattern: /^data:image\/webp;base64/i,
    replacement: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1598170845058-12ef4a457939/i,
    replacement: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1527325678964-549216468488/i,
    replacement: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1585059819970-072f24d7764a/i,
    replacement: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1447175008436-08417090e4b0/i,
    replacement: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1588879460417-af2b369527f5/i,
    replacement: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1585994191611-726a88060c2d/i,
    replacement: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1490815685287-e2e27040d346/i,
    replacement: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&auto=format&fit=crop'
  },
  {
    pattern: /photo-1425543103986-22413b10d829/i,
    replacement: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=800&auto=format&fit=crop'
  }
];

function fixUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let updated = url;
  for (const r of REPLACEMENTS) {
    if (r.pattern.test(updated)) {
      updated = r.replacement;
    }
  }
  return updated;
}

async function fixAll() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  // 1. Fix Products
  const products = await Product.find();
  let updatedProdCount = 0;
  for (const p of products) {
    let changed = false;
    const newMain = fixUrl(p.imageUrl);
    if (newMain !== p.imageUrl) {
      p.imageUrl = newMain;
      changed = true;
    }
    if (Array.isArray(p.images)) {
      const newImgs = p.images.map(fixUrl);
      if (JSON.stringify(newImgs) !== JSON.stringify(p.images)) {
        p.images = newImgs;
        changed = true;
      }
    }
    if (changed) {
      await p.save();
      updatedProdCount++;
    }
  }
  console.log(`Updated ${updatedProdCount} products with clean image URLs.`);

  // 2. Fix Special Groups
  const groups = await SpecialGroup.find();
  let updatedGroupCount = 0;
  for (const g of groups) {
    let changed = false;
    if (Array.isArray(g.items)) {
      for (let i = 0; i < g.items.length; i++) {
        const itemImg = g.items[i].image;
        if (typeof itemImg === 'string') {
          const fixed = fixUrl(itemImg);
          if (fixed !== itemImg) {
            g.items[i].image = fixed;
            changed = true;
          }
        } else if (itemImg && typeof itemImg === 'object' && itemImg.url) {
          const fixed = fixUrl(itemImg.url);
          if (fixed !== itemImg.url) {
            g.items[i].image.url = fixed;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await g.save();
      updatedGroupCount++;
    }
  }
  console.log(`Updated ${updatedGroupCount} special groups with clean image URLs.`);

  // 3. Fix Festival Campaigns
  const campaigns = await FestivalCampaign.find();
  let updatedCampCount = 0;
  for (const c of campaigns) {
    let changed = false;
    if (c.backgroundImage && c.backgroundImage.url) {
      const fixed = fixUrl(c.backgroundImage.url);
      if (fixed !== c.backgroundImage.url) {
        c.backgroundImage.url = fixed;
        changed = true;
      }
    }
    if (Array.isArray(c.specialSubcategories)) {
      for (let i = 0; i < c.specialSubcategories.length; i++) {
        if (c.specialSubcategories[i].image && c.specialSubcategories[i].image.url) {
          const fixed = fixUrl(c.specialSubcategories[i].image.url);
          if (fixed !== c.specialSubcategories[i].image.url) {
            c.specialSubcategories[i].image.url = fixed;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await c.save();
      updatedCampCount++;
    }
  }
  console.log(`Updated ${updatedCampCount} festival campaigns.`);

  // 4. Fix Categories
  const categories = await Category.find();
  let updatedCatCount = 0;
  for (const cat of categories) {
    let changed = false;
    const newImg = fixUrl(cat.image);
    const newImgUrl = fixUrl(cat.imageUrl);
    if (newImg !== cat.image) {
      cat.image = newImg;
      changed = true;
    }
    if (newImgUrl !== cat.imageUrl) {
      cat.imageUrl = newImgUrl;
      changed = true;
    }
    if (Array.isArray(cat.subCategories)) {
      for (let i = 0; i < cat.subCategories.length; i++) {
        if (cat.subCategories[i].image) {
          const fixed = fixUrl(cat.subCategories[i].image);
          if (fixed !== cat.subCategories[i].image) {
            cat.subCategories[i].image = fixed;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await cat.save();
      updatedCatCount++;
    }
  }
  console.log(`Updated ${updatedCatCount} categories.`);

  await mongoose.disconnect();
  console.log('Done!');
}

fixAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
