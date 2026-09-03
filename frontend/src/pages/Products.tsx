import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCMS, getSubCategoryImage, Product, deduplicateSubCategories } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { BannerCarousel } from '../components/BannerCarousel';
import { SubcategoryCardImage } from '../components/SubcategoryCardImage';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ChevronRight, SearchX, PackageX } from 'lucide-react';

interface ProductsProps {
  onQuickView: (product: Product) => void;
  onListViewChange?: (inListView: boolean) => void;
}

export const Products: React.FC<ProductsProps> = ({ onQuickView, onListViewChange }) => {
  const { products, categories, seoSettings, banners = [] } = useCMS();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { categorySlug } = useParams<{ categorySlug?: string }>();

  const subcategorySidebarRef = useRef<HTMLElement | null>(null);

  // Lock scroll propagation on the left subcategories sidebar so page doesn't scroll up/down when reaching bounds
  useEffect(() => {
    const el = subcategorySidebarRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isScrollable = scrollHeight > clientHeight;
      if (!isScrollable) return;

      const isAtTop = scrollTop <= 0 && e.deltaY < 0;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 2 && e.deltaY > 0;

      if (isAtTop || isAtBottom) {
        e.preventDefault();
      }
    };

    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = startY - currentY;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) {
        e.preventDefault();
        return;
      }

      const isAtTop = scrollTop <= 0 && deltaY < 0;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 2 && deltaY > 0;

      if (isAtTop || isAtBottom) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Search filter from URL
  const urlSearch = searchParams.get('search') || '';
  const urlCategory = searchParams.get('category') || categorySlug || '';
  const urlSubCategory = searchParams.get('subCategory') || '';
  const urlOrganic = searchParams.get('organic') === 'true';

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('fruits-vegetables');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  // Whether the sidebar + product-list layout is showing (vs. the subcategory
  // cards landing page). Kept separate from selectedSubCategory so picking
  // "All" in the sidebar can show every product in the category without
  // kicking the user back out to the cards view.
  const [inCategoryView, setInCategoryView] = useState<boolean>(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Category Banner Image & Description Map
  const categoryMetaData: Record<string, { description: string; bannerImg: string; icon: string }> = {
    'fruits-vegetables': {
      description: 'Fresh fruits and vegetables sourced daily from farms across India. From everyday onions and tomatoes to seasonal mangoes and hard-to-find avocados — get them delivered in minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=150&auto=format&fit=crop'
    },
    'dairy-bread-eggs': {
      description: 'Farm-fresh milk, artisan breads, farm eggs, paneer, and rich cream delivered cold to your doorstep within 10 minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop'
    },
    'atta-rice-oil-dals': {
      description: 'Premium quality chakki fresh atta, basmati rice, cold pressed mustard oil, and unpolished protein-rich dals for healthy home meals.',
      bannerImg: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&auto=format&fit=crop'
    },
    'breakfast-cereals-spreads-sauces': {
      description: 'Nutritious oats, muesli, organic peanut butter, artisan jams, and tomato ketchup for quick and delicious family breakfasts.',
      bannerImg: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150&auto=format&fit=crop'
    },
    'tea-coffee-health-drinks': {
      description: 'Aromatic Assam tea leaves, freshly roasted South Indian filter coffee beans, green tea, and protein health powders.',
      bannerImg: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop'
    },
    'ice-creams-kulfi-frozen-desserts': {
      description: 'Creamy gelato, classic Belgian chocolate tubs, traditional matka kulfi, and frozen desserts delivered ice-cold.',
      bannerImg: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=150&auto=format&fit=crop'
    },
    'chocolates-indian-sweets': {
      description: 'Rich dark chocolates, traditional ghee gulab jamun, kaju katli, and party sweet boxes freshly prepared.',
      bannerImg: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=150&auto=format&fit=crop'
    }
  };

  // Unique high-quality cutout sticker image for EVERY subcategory
  const subCategoryImages: Record<string, string> = {
    // Dairy, Bread & Eggs
    'Milk': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Breads & Buns': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Fresh Bakery': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Eggs': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/229a0614-71cc-410d-9242-88bcc1b4d0e7.png',
    'Curd & Probiotic Drinks': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Batters & Mixes': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'High Protein': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Milk Based Drinks': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Paneer & Cream': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Gut Friendly': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Butter': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Cheese': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Indian Breads': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'Yogurt & Shrikhand': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
    'Gourmet Store': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',

    // Fruits & Vegetables
    'Fresh Vegetables': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'New Launches in Fruits & Vegetables': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Fresh Fruits': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/54a11f26-d621-4f36-b6b2-659f230263f3.png',
    'Exotics & Premium': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/c1615f10-9118-472e-8d82-e3d8f895fb66.png',
    'Mangoes & Melons': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/54a11f26-d621-4f36-b6b2-659f230263f3.png',
    'Organics & Hydroponics': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Leafy, Herbs & Seasonings': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Flowers & Leaves': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Bouquets & Plants': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Cuts & Sprouts': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Plants & Gardening': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Gardening Accessories': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',
    'Frozen Veggies & Pulp': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/2b5f2be5-cada-4cd7-b0af-e46c0c065f71.png',

    // Atta, Rice, Oil & Dals
    'Atta': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'Rice': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'Edible Oils': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'Dals & Pulses': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',
    'Ghee': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/dc4a299d-521f-4a64-8205-c5ba8e1d13e3.png',

    // Breakfast & Sauces
    'Cereals & Oats': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/ab241d87-da5b-4830-b38f-1a6cd30d0d41.png',
    'Spreads & Peanut Butter': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/ab241d87-da5b-4830-b38f-1a6cd30d0d41.png',
    'Ketchup & Sauces': 'https://cdn.zeptonow.com/production/tr:w-210,ar-1-1,pr-true,f-auto,q-80/cms/category/ab241d87-da5b-4830-b38f-1a6cd30d0d41.png'
  };

  // Subcategory descriptions and fallback thumbnail images
  const subCategoryDescriptions: Record<string, string> = {
    // Dairy
    'Milk': 'Fresh milk restocked daily. Sourced directly from farms for peak purity.',
    'Breads & Buns': 'Artisan white, brown, multigrain breads, and burger buns baked daily.',
    'Fresh Bakery': 'Freshly baked croissants, pastries, muffins, and cookies.',
    'Eggs': 'Farm-fresh white, brown, and organic omega-3 rich eggs.',
    'Curd & Probiotic Drinks': 'Fresh thick curd, matka dahi, lassi, and gut-friendly probiotic drinks.',
    'Batters & Mixes': 'Freshly ground idli, dosa batter, and instant meal mixes.',
    'High Protein': 'Greek yogurts, protein shakes, and high-protein cottage cheese.',
    'Milk Based Drinks': 'Flavoured milk, badam drink, cold coffee, and milkshakes.',
    'Paneer & Cream': 'Soft malai paneer, cooking cream, and fresh whipping cream.',
    'Butter': 'Creamy salted butter, unpasteurized white butter, and garlic butter.',
    'Cheese': 'Cheddar, mozzarella, cheese slices, spreads, and process cheese blocks.',
    'Indian Breads': 'Freshly prepped rotis, parathas, and naan ready to heat and eat.',
    'Yogurt & Shrikhand': 'Flavoured yogurts, fruit shrikhand, and traditional mishti doi.',

    // Fruits & Veggies
    'Fresh Vegetables': 'Restocked daily from local farms — onions, tomatoes, potatoes, gourds, and seasonal greens at peak freshness.',
    'New Launches in Fruits & Vegetables': 'Seasonal veggies, fruits and exotic varieties added this week. See what landed on shelves.',
    'Fresh Fruits': 'Ripe fruits from across India and the world — apples, bananas, oranges, berries, and seasonal delights.',
    'Exotics & Premium': 'Imported and rare varieties: dragon fruit, kiwis, avocados, blueberries, and hard to find produce.',
    'Mangoes & Melons': 'Alphonso, Kesar, and Banganapalli mangoes in season, plus watermelons and muskmelons directly sourced.',
    'Organics & Hydroponics': 'Certified organic and pesticide-free hydroponic greens, vegetables, and pesticide-free fruits.',
    'Leafy, Herbs & Seasonings': 'Fresh coriander, mint, palak, methi, curry leaves, and aromatic herbs for everyday cooking.',
    'Flowers & Leaves': 'Fresh marigolds, roses, banana leaves, and pooja flowers for daily worship and festive occasions.',
    'Bouquets & Plants': 'Flower bouquets and indoor plants to brighten a room or give as a thoughtful gift.',
    'Cuts & Sprouts': 'Pre-cut fruits, ready-to-cook vegetable mixes, and sprouted moong and chana for quick meals.',
    'Plants & Gardening': 'Indoor plants, succulents, and starter saplings for a home garden.',
    'Gardening Accessories': 'Pots, soil, fertilizers, and tools for your balcony or backyard plants.',
    'Frozen Veggies & Pulp': 'Frozen peas, mixed vegetables, and fruit pulps for quick cooking without prep.'
  };

  // Sync state with URL parameter changes
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory);
      if (urlSubCategory) {
        setSelectedSubCategory(urlSubCategory === 'All' ? '' : urlSubCategory);
        setInCategoryView(true);
      } else {
        setSelectedSubCategory('');
        setInCategoryView(false);
      }
    } else if (urlSearch) {
      setSelectedCategory('');
      setSelectedSubCategory('');
      setInCategoryView(true);
    } else {
      setSelectedCategory('');
      setSelectedSubCategory('');
      setInCategoryView(false);
      navigate('/', { replace: true });
    }
  }, [urlCategory, urlSubCategory, urlSearch, categories, navigate]);

  useEffect(() => {
    setOnlyOrganic(urlOrganic);
  }, [urlOrganic]);

  // Let the app shell know when the sidebar + product-list layout is active,
  // so it can hide the app bar / category nav for that view.
  useEffect(() => {
    onListViewChange?.(inCategoryView);
  }, [inCategoryView, onListViewChange]);

  useEffect(() => {
    return () => onListViewChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active Category Object
  const currentCategoryObj = useMemo(() => {
    if (!selectedCategory && urlSearch) return categories[0];
    return categories.find(c => c.id === selectedCategory || c.slug === selectedCategory) || categories[0];
  }, [categories, selectedCategory, urlSearch]);

  const activeCategoryMeta = useMemo(() => {
    const slug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
    return categoryMetaData[slug] || {
      description: 'Sourced directly from local farms daily and delivered fresh to your door in 10 minutes.',
      bannerImg: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=600&auto=format&fit=crop',
      icon: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop'
    };
  }, [currentCategoryObj]);

  // Extract subcategories for active main category (deduplicated)
  const activeSubCategories = useMemo(() => {
    if (currentCategoryObj && currentCategoryObj.subCategories) {
      return deduplicateSubCategories(currentCategoryObj.subCategories);
    }
    return [];
  }, [currentCategoryObj]);

  // Active Subcategory Object & Color Tint for Products Panel
  const activeSubCatObj = useMemo(() => {
    if (!currentCategoryObj || !selectedSubCategory) return null;
    const subs = currentCategoryObj.subCategories || [];
    return subs.find((s: any) => (typeof s === 'string' ? s : s.name).toLowerCase() === selectedSubCategory.toLowerCase());
  }, [currentCategoryObj, selectedSubCategory]);

  const activeSubCatColor = useMemo(() => {
    let rawColor = '#10B981';
    if (activeSubCatObj && typeof activeSubCatObj === 'object' && activeSubCatObj.color) {
      rawColor = activeSubCatObj.color;
    } else if (currentCategoryObj && currentCategoryObj.color) {
      rawColor = currentCategoryObj.color;
    }

    if (!rawColor) return 'rgba(16, 185, 129, 0.12)';

    if (rawColor.startsWith('#')) {
      const hex = rawColor.length === 4
        ? '#' + rawColor[1] + rawColor[1] + rawColor[2] + rawColor[2] + rawColor[3] + rawColor[3]
        : rawColor;
      if (hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > 225) {
          return hex;
        }
        return `rgba(${r}, ${g}, ${b}, 0.16)`;
      }
    }
    return rawColor;
  }, [activeSubCatObj, currentCategoryObj]);

  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (urlSearch) {
      const q = urlSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    const shouldFilterCategory = urlCategory ? true : (!urlSearch && Boolean(selectedCategory));

    if (shouldFilterCategory && selectedCategory) {
      const catTarget = selectedCategory.toLowerCase().trim();
      const curId = (currentCategoryObj?.id || '').toLowerCase().trim();
      const curSlug = (currentCategoryObj?.slug || '').toLowerCase().trim();
      const curName = (currentCategoryObj?.name || '').toLowerCase().trim();

      result = result.filter((p) => {
        const pCatId = (p.categoryId || '').toLowerCase().trim();
        const pCat = (p.category || '').toLowerCase().trim();

        if (pCatId === catTarget || pCat === catTarget || (curId && pCatId === curId) || (curSlug && pCatId === curSlug) || (curName && pCat === curName)) return true;

        // Alias & Keyword mappings
        if ((catTarget === 'meats-fish-eggs' || catTarget === 'cat_meat' || catTarget === 'meat' || catTarget === 'mutton' || catTarget === 'chicken') &&
            (pCatId.includes('meat') || pCatId.includes('fish') || pCat.includes('meat') || pCat.includes('fish') || pCat.includes('poultry') || pCat.includes('mutton') || pCat.includes('chicken'))) return true;

        if ((catTarget === 'fruits-vegetables' || catTarget === 'cat_organic' || catTarget === 'cat_veg' || catTarget === 'cat_fruits') &&
            (pCatId.includes('fruit') || pCatId.includes('veg') || pCat.includes('fruit') || pCat.includes('veg') || pCatId.includes('organic'))) return true;

        if ((catTarget === 'dairy-bread-eggs' || catTarget === 'cat_dairy' || catTarget === 'dairy') &&
            (pCatId.includes('dairy') || pCat.includes('dairy') || pCat.includes('bread') || pCat.includes('milk'))) return true;

        if ((catTarget === 'atta-rice-oil-dals' || catTarget === 'cat_grains' || catTarget === 'atta-rice') &&
            (pCatId.includes('atta') || pCat.includes('rice') || pCat.includes('oil') || pCat.includes('dal') || pCat.includes('grain'))) return true;

        if ((catTarget === 'chocolates-indian-sweets' || catTarget === 'sweet-tooth' || catTarget === 'sweets') &&
            (pCatId.includes('chocolate') || pCatId.includes('sweet') || pCat.includes('chocolate') || pCat.includes('sweet') || pCat.includes('mithai'))) return true;

        if ((catTarget === 'masala-dry-fruits-more' || catTarget === 'cat_spices' || catTarget === 'masala') &&
            (pCatId.includes('masala') || pCatId.includes('spice') || pCat.includes('spice') || pCat.includes('dry fruit') || pCat.includes('nut'))) return true;

        if ((catTarget === 'breakfast-cereals-spreads-sauces' || catTarget === 'cat_bakery' || catTarget === 'bakery') &&
            (pCatId.includes('breakfast') || pCatId.includes('cereal') || pCat.includes('cereal') || pCat.includes('sauce') || pCat.includes('spread') || pCat.includes('bakery'))) return true;

        if ((catTarget === 'packaged-food' || catTarget === 'cat_snacks' || catTarget === 'munchies' || catTarget === 'instant-food') &&
            (pCatId.includes('snack') || pCatId.includes('package') || pCat.includes('snack') || pCat.includes('chip') || pCat.includes('biscuit') || pCat.includes('noodle'))) return true;

        if ((catTarget === 'tea-coffee-health-drinks' || catTarget === 'cold-drinks' || catTarget === 'beverages') &&
            (pCatId.includes('tea') || pCatId.includes('coffee') || pCat.includes('tea') || pCat.includes('coffee') || pCat.includes('drink') || pCat.includes('beverage') || pCat.includes('juice'))) return true;

        if (catTarget.includes(pCatId) || pCatId.includes(catTarget) || catTarget.includes(pCat) || pCat.includes(catTarget)) return true;

        return false;
      });
    }

    if (selectedSubCategory) {
      const subTarget = selectedSubCategory.toLowerCase().trim();
      const subMatches = result.filter((p) => {
        if (!p.subCategory) return false;
        const pSub = p.subCategory.toLowerCase().trim();
        return pSub === subTarget || pSub.includes(subTarget) || subTarget.includes(pSub);
      });

      if (subMatches.length > 0) {
        result = subMatches;
      } else {
        // Fallback search in name or description if subcategory is dynamic
        result = result.filter((p) =>
          p.name.toLowerCase().includes(subTarget) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(subTarget)) ||
          (p.description && p.description.toLowerCase().includes(subTarget))
        );
      }
    }

    if (onlyOrganic) {
      result = result.filter((p) => p.isOrganic);
    }

    if (onlyInStock) {
      result = result.filter((p: any) => {
        const q = p?.stock?.quantity ?? p?.stockQuantity ?? p?.stock;
        return typeof q === 'number' ? q > 0 : p?.inStock !== false;
      });
    }

    if (onlyOnSale) {
      result = result.filter((p: any) => {
        const mrp = p.originalPrice || p.mrp || 0;
        return mrp > 0 && p.price < mrp;
      });
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      result.sort((a, b) => ((b.originalPrice || b.mrp) - b.price) - ((a.originalPrice || a.mrp) - a.price));
    }

    return result;
  }, [products, urlSearch, selectedCategory, selectedSubCategory, currentCategoryObj, onlyOrganic, onlyInStock, onlyOnSale, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory, onlyOrganic, onlyInStock, onlyOnSale, sortBy, urlSearch]);

  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleClearAll = () => {
    setSelectedSubCategory('');
    setOnlyOrganic(false);
    setOnlyInStock(false);
    setOnlyOnSale(false);
    setSearchParams({});
  };

  const [isMobileDevice, setIsMobileDevice] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobileDevice(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeBanners = useMemo(() => {
    return (banners || []).filter(b => {
      if (!b.active) return false;
      const target = b.targetPlatform || 'ALL';
      if (target === 'WEB' && isMobileDevice) return false;
      if (target === 'MOBILE' && !isMobileDevice) return false;
      return true;
    });
  }, [banners, isMobileDevice]);

  // Category targeted banners
  const categoryBanners = useMemo(() => {
    const curId = (currentCategoryObj?.id || '').toLowerCase().trim();
    const curSlug = (currentCategoryObj?.slug || '').toLowerCase().trim();
    const curName = (currentCategoryObj?.name || '').toLowerCase().trim();
    const catTarget = (selectedCategory || '').toLowerCase().trim();

    return activeBanners.filter(b => {
      if (b.displayOn !== 'CATEGORY' && b.displayOn !== 'ALL') return false;
      const bCat = (b.categoryId || '').toLowerCase().trim();
      if (!bCat || bCat === 'all') return true;
      return bCat === catTarget || bCat === curId || bCat === curSlug || bCat === curName;
    });
  }, [activeBanners, selectedCategory, currentCategoryObj]);

  const beforeSubCategoryBanners = useMemo(() => categoryBanners.filter(b => b.position === 'before_subcategories'), [categoryBanners]);
  const afterSubCategoryBanners = useMemo(() => categoryBanners.filter(b => b.position === 'after_subcategories'), [categoryBanners]);
  const beforeProductsCategoryBanners = useMemo(() => categoryBanners.filter(b => b.position === 'before_products'), [categoryBanners]);

  // Subcategory targeted banners
  const subCategoryBanners = useMemo(() => {
    if (!selectedSubCategory) return [];
    const subTarget = selectedSubCategory.toLowerCase().trim();
    const catTarget = (selectedCategory || '').toLowerCase().trim();
    const curId = (currentCategoryObj?.id || '').toLowerCase().trim();
    const curSlug = (currentCategoryObj?.slug || '').toLowerCase().trim();

    return activeBanners.filter(b => {
      if (b.displayOn !== 'SUBCATEGORY' && b.displayOn !== 'ALL') return false;
      const bSub = (b.subcategoryId || b.subCategoryName || '').toLowerCase().trim();
      if (bSub) {
        const isSubMatch = bSub === subTarget || bSub.includes(subTarget) || subTarget.includes(bSub);
        if (!isSubMatch) return false;
      }
      if (!b.categoryId) return true;
      const bCat = b.categoryId.toLowerCase().trim();
      return bCat === catTarget || bCat === curId || bCat === curSlug;
    });
  }, [activeBanners, selectedCategory, selectedSubCategory, currentCategoryObj]);

  const topSubCategoryBanners = useMemo(() => subCategoryBanners.filter(b => !b.position || b.position === 'top'), [subCategoryBanners]);
  const beforeProductsSubCategoryBanners = useMemo(() => subCategoryBanners.filter(b => b.position === 'before_products'), [subCategoryBanners]);

  const seo = seoSettings.products || {
    title: 'Shop Groceries by Category | FreshCart',
    description: 'Browse fresh fruits, vegetables, dairy, snacks, and grocery essentials.',
    keywords: 'fresh vegetables, freshcart catalog, online grocery'
  };

  return (
    <div className="page-wrapper min-h-screen bg-background relative z-0">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className={`container mx-auto px-2 sm:px-4 md:px-6 max-w-[1360px] ${inCategoryView ? 'pt-2 sm:pt-3 pb-2 sm:pb-3' : 'pt-4 pb-16'}`}>

        {/* CONDITION 1: Sidebar + product-list view (either a specific subcategory
            or "All" within the current category). Mobile-first: a narrow icon rail
            sits beside the product grid at every viewport, widening into a labeled
            sidebar at lg+. */}
        {inCategoryView ? (
          <div className="flex flex-col h-[calc(100dvh-16px)] sm:h-[calc(100vh-64px)] min-h-[480px] overflow-hidden">
            <button
              onClick={() => {
                if (location.state && (location.state as any).from) {
                  navigate((location.state as any).from);
                } else {
                  navigate('/');
                }
              }}
              className="mb-2 text-[11px] sm:text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              ← Back to Home
            </button>
            <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[84px_1fr] lg:grid-cols-[96px_1fr] gap-2 sm:gap-3 lg:gap-4 items-stretch flex-1 min-h-0 overflow-hidden">

              {/* Left Subcategory Rail / Sidebar */}
              <aside
                ref={subcategorySidebarRef}
                style={{ overscrollBehavior: 'contain', overscrollBehaviorY: 'contain' }}
                className="bg-white border-r border-divider/60 py-2 px-1 h-full overflow-y-auto overscroll-contain overscroll-y-contain touch-pan-y no-scrollbar rounded-xl flex flex-col gap-1 shadow-2xs shrink-0"
              >
                <div className="flex flex-col gap-2">
                  {/* All Subcategories Button */}
                  <button
                    onClick={() => setSelectedSubCategory('')}
                    className={`relative w-full flex flex-col items-center justify-center p-1 py-1.5 rounded-xl text-center transition-all duration-200 group cursor-pointer ${selectedSubCategory === '' ? 'font-black' : 'hover:bg-background'
                      }`}
                  >
                    {selectedSubCategory === '' && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-l-full bg-emerald-600" />
                    )}
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${selectedSubCategory === '' ? 'border-emerald-500 bg-emerald-100/60 shadow-2xs' : 'border-divider/60 bg-gray-50'
                      }`}>
                      <span className="text-base sm:text-lg">🛍️</span>
                    </div>
                    <span className={`text-[10px] leading-tight line-clamp-2 mt-1 text-center font-extrabold ${selectedSubCategory === '' ? 'text-emerald-950 font-black' : 'text-text-secondary'
                      }`}>
                      All
                    </span>
                  </button>

                  {/* Subcategories List */}
                  {activeSubCategories.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : sub.name;
                    const isActive = selectedSubCategory.toLowerCase() === subName.toLowerCase();
                    const customImg = typeof sub === 'object' ? (sub.image || sub.icon || '') : '';
                    const subImg = getSubCategoryImage(subName, currentCategoryObj?.name, customImg);

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSubCategory(subName)}
                        className={`relative w-full flex flex-col items-center justify-center p-1 py-1.5 rounded-xl text-center transition-all duration-200 group cursor-pointer`}
                      >
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-l-full bg-emerald-600" />
                        )}
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 p-0.5 border ${isActive ? 'border-emerald-500 bg-emerald-100/60 shadow-2xs' : 'border-divider/60 bg-gray-50 group-hover:border-emerald-300'
                          } transition-all`}>
                          <SubcategoryCardImage
                            src={subImg}
                            alt={subName}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className={`text-[10px] leading-tight line-clamp-2 mt-1 text-center font-extrabold ${isActive ? 'text-emerald-950 font-black' : 'text-text-secondary group-hover:text-text-primary'
                          }`}>
                          {subName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Right Main Content Area: Fixed Height Scroll with Overscroll Contain */}
              <main
                style={{
                  backgroundColor: activeSubCatColor
                }}
                className="flex flex-col gap-3 sm:gap-4 min-w-0 h-full overflow-y-auto overscroll-contain no-scrollbar p-2.5 sm:p-4 rounded-xl border border-divider/60 shadow-xs transition-colors duration-300 pb-16"
              >

                {/* Top Subcategory Banners */}
                <BannerCarousel banners={topSubCategoryBanners} />

                <div className="bg-surface/90 backdrop-blur-xs border border-divider/70 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-text-primary tracking-tight font-display">
                        {urlSearch ? `Search Results for "${urlSearch}"` : (selectedSubCategory || `All ${currentCategoryObj?.name || ''}`)}
                      </h1>
                      <p className="text-[11px] sm:text-xs text-text-tertiary font-bold mt-0.5">
                        {filteredProducts.length} Products available in 10 mins
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-background border border-divider px-3 py-1.5 rounded-xl text-xs self-start sm:self-auto">
                      <ArrowUpDown size={14} className="text-emerald-600" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent font-extrabold text-text-primary outline-none cursor-pointer"
                      >
                        <option value="default">Relevance</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Popularity</option>
                        <option value="discount">Max Discount</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {([
                      ['Organic', onlyOrganic, setOnlyOrganic],
                      ['In stock', onlyInStock, setOnlyInStock],
                      ['On offer', onlyOnSale, setOnlyOnSale],
                    ] as [string, boolean, (v: boolean) => void][]).map(([label, on, set]) => (
                      <button
                        key={label}
                        onClick={() => set(!on)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          on
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-background text-text-secondary border-divider hover:border-emerald-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Before Products Subcategory Banners */}
                <BannerCarousel banners={beforeProductsSubCategoryBanners} />

                {/* Products Grid */}
                {paginatedProducts.length === 0 ? (
                  <div className="bg-surface border border-divider rounded-2xl p-10 text-center shadow-card flex flex-col items-center justify-center gap-3">
                    <PackageX size={42} className="text-amber-500/80 mb-1" />
                    <h3 className="text-base font-extrabold text-text-primary">No products available in this category currently.</h3>
                    <p className="text-xs text-text-secondary leading-normal max-w-sm">We are actively restocking fresh items for this selection. Try selecting another subcategory or resetting filters.</p>
                    <button onClick={handleClearAll} className="text-xs font-bold bg-emerald-600 text-white py-2.5 px-6 rounded-full mt-2 hover:bg-emerald-700 transition-colors">Reset All Filters</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {paginatedProducts.map((product, idx) => (
                      <ProductCard key={product.id || `prod_${idx}`} product={product} onQuickView={onQuickView} />
                    ))}
                  </div>
                )}

              </main>
            </div>
          </div>
        ) : (
          /* CONDITION 2: NO Subcategory Selected -> Show Category Landing Page with 3-Column Cards Grid */
          <main className="flex flex-col gap-6">

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
              <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
              <ChevronRight size={13} className="text-text-tertiary" />
              <span className="text-text-primary">{currentCategoryObj?.name}</span>
            </div>

            {/* Category Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden border border-divider/70 bg-gradient-to-r from-emerald-50 via-teal-50 to-rose-50 p-6 sm:p-8">
              <div className="relative z-10 w-full sm:pr-40 md:pr-52">
                <h1 className="w-full text-3xl sm:text-4xl font-black text-text-primary tracking-tight font-display">
                  {currentCategoryObj?.name}
                </h1>
                <p className="w-full mt-2 text-xs sm:text-sm text-text-secondary font-semibold leading-relaxed">
                  {activeCategoryMeta.description}
                </p>
              </div>
              <div className="hidden sm:block absolute z-10 top-6 right-6 md:top-8 md:right-8 w-32 md:w-44 h-32 md:h-44 rounded-2xl overflow-hidden border border-white/60 shadow-md">
                <img
                  src={activeCategoryMeta.bannerImg}
                  alt={currentCategoryObj?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>

            {/* Before Subcategories Category Banners */}
            <BannerCarousel banners={beforeSubCategoryBanners} />

            {/* 3-Column Subcategories Cards Grid */}
            {activeSubCategories.length > 0 && (
              <div>
                <div className="text-xs font-black text-text-secondary uppercase tracking-wider mb-3">
                  {activeSubCategories.length} SUBCATEGORIES
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {activeSubCategories.map((sub, idx) => {
                    const subName = typeof sub === 'string' ? sub : sub.name;
                    const subDesc = subCategoryDescriptions[subName] || `Fresh ${subName.toLowerCase()} restocked daily. Sourced directly for peak freshness.`;
                    const catSlug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
                    const subImg = subCategoryImages[subName] || categoryMetaData[catSlug]?.icon || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop';

                    return (
                      <div
                        key={subName || `subcard_${idx}`}
                        onClick={() => {
                          const catSlug = currentCategoryObj?.slug || currentCategoryObj?.id || 'fruits-vegetables';
                          navigate(`/products?category=${catSlug}&subCategory=${encodeURIComponent(subName)}`);
                        }}
                        className="p-3.5 rounded-2xl border bg-surface border-divider/70 hover:border-emerald-500/50 hover:shadow-xs transition-all duration-200 cursor-pointer flex gap-3 items-start group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-divider flex-shrink-0 bg-transparent group-hover:scale-105 transition-transform">
                          <SubcategoryCardImage
                            src={subImg}
                            alt={subName}
                            className="w-full h-full p-0.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-text-primary truncate group-hover:text-emerald-600 transition-colors">{subName}</h4>
                          <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed font-semibold mt-0.5">
                            {subDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* After Subcategories Category Banners */}
            <BannerCarousel banners={afterSubCategoryBanners} />

            {/* Before Products Category Banners */}
            <BannerCarousel banners={beforeProductsCategoryBanners} />

            {/* Related Items / Products Grid below Subcategories Cards */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight font-display">
                    All {currentCategoryObj?.name || 'Category'} Products
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-tertiary font-bold mt-0.5">
                    {filteredProducts.length} Products available in 10 mins
                  </p>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-surface border border-divider rounded-2xl p-10 text-center shadow-card flex flex-col items-center justify-center gap-3 my-4">
                  <PackageX size={42} className="text-amber-500/80 mb-1" />
                  <h4 className="text-base font-extrabold text-text-primary">No products available in this category currently.</h4>
                  <p className="text-xs text-text-secondary leading-normal max-w-sm">We are actively restocking fresh items for this category. Please check back soon or browse other catalog categories.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {filteredProducts.map((product, idx) => (
                    <ProductCard key={product.id || product._id || `cat_prod_${idx}`} product={product} onQuickView={onQuickView} />
                  ))}
                </div>
              )}
            </div>

          </main>
        )}

      </div>
    </div>
  );
};

export default Products;
