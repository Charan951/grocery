import React, { useState } from 'react';
import { useCMS, Product, Coupon, Blog, Banner, PromoCard, FestivalCampaign, SuperCategory, defaultSuperCategories } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { Trash2, Plus, Edit2, CheckSquare, Square, Image, LayoutGrid, Upload, X, ArrowUp, ArrowDown, Smartphone, Sparkles, Layers, Coffee, Leaf, Home, Headphones, Shirt, Gamepad2, Utensils, Check } from 'lucide-react';
import { FestivalCampaignWrapper } from '../components/FestivalCampaignWrapper';

export interface PredefinedTheme {
  key: string;
  name: string;
  emoji: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: string;
  cardBackground: string;
  cardBorder: string;
  accentColor: string;
  buttonColor: string;
  textColor: string;
}

export const PREDEFINED_FESTIVAL_THEMES: Record<string, PredefinedTheme> = {
  krishna: {
    key: 'krishna',
    name: 'Krishna Janmashtami',
    emoji: '🦚',
    gradientStart: '#E0F2FE',
    gradientEnd: '#CFFAFE',
    gradientDirection: 'to bottom',
    cardBackground: '#FFFBEB',
    cardBorder: '#BAE6FD',
    accentColor: '#F59E0B',
    buttonColor: '#0EA5E9',
    textColor: '#0C4A6E'
  },
  diwali: {
    key: 'diwali',
    name: 'Diwali',
    emoji: '🪔',
    gradientStart: '#FFF7ED',
    gradientEnd: '#FFEDD5',
    gradientDirection: 'to bottom',
    cardBackground: '#FEF3C7',
    cardBorder: '#FDBA74',
    accentColor: '#D97706',
    buttonColor: '#B91C1C',
    textColor: '#78350F'
  },
  onam: {
    key: 'onam',
    name: 'Onam',
    emoji: '🌸',
    gradientStart: '#F7FEE7',
    gradientEnd: '#ECFDF5',
    gradientDirection: 'to bottom',
    cardBackground: '#FAFAF9',
    cardBorder: '#A3E635',
    accentColor: '#D97706',
    buttonColor: '#15803D',
    textColor: '#14532D'
  },
  raksha_bandhan: {
    key: 'raksha_bandhan',
    name: 'Raksha Bandhan',
    emoji: '🧿',
    gradientStart: '#FFF1F2',
    gradientEnd: '#F3E8FF',
    gradientDirection: 'to bottom',
    cardBackground: '#FFF1F2',
    cardBorder: '#F472B6',
    accentColor: '#EC4899',
    buttonColor: '#9333EA',
    textColor: '#701A75'
  },
  ganesh_chaturthi: {
    key: 'ganesh_chaturthi',
    name: 'Ganesh Chaturthi',
    emoji: '🌺',
    gradientStart: '#FEF3C7',
    gradientEnd: '#FFEDD5',
    gradientDirection: 'to bottom',
    cardBackground: '#FFFBEB',
    cardBorder: '#FCD34D',
    accentColor: '#EA580C',
    buttonColor: '#D97706',
    textColor: '#7C2D12'
  },
  holi: {
    key: 'holi',
    name: 'Holi',
    emoji: '🎨',
    gradientStart: '#FFF1F2',
    gradientEnd: '#F0FDF4',
    gradientDirection: '135deg',
    cardBackground: '#FFFFFF',
    cardBorder: '#F472B6',
    accentColor: '#E11D48',
    buttonColor: '#2563EB',
    textColor: '#1E3A8A'
  },
  navratri: {
    key: 'navratri',
    name: 'Navratri',
    emoji: '🪷',
    gradientStart: '#FEF9C3',
    gradientEnd: '#FAF5FF',
    gradientDirection: 'to bottom',
    cardBackground: '#FFFBEB',
    cardBorder: '#E9D5FF',
    accentColor: '#9333EA',
    buttonColor: '#7E22CE',
    textColor: '#581C87'
  }
};

export const AdminCMS: React.FC = () => {
  const {
    banners, promoCards, festivalCampaigns, activeFestivalCampaign, categories, specialCategoryGroups, products, coupons, blogs, seoSettings,
    superCategories, updateSuperCategory, reorderSuperCategories,
    homeSelectedSubCategories, updateHomeSubCategories, toggleHomeSubCategory,
    updateProduct, addProduct, deleteProduct,
    addBanner, updateBanner, deleteBanner,
    addPromoCard, updatePromoCard, deletePromoCard,
    addFestivalCampaign, updateFestivalCampaign, deleteFestivalCampaign, toggleFestivalCampaignStatus,
    addSpecialGroup, updateSpecialGroup, deleteSpecialGroup,
    addCoupon, deleteCoupon,
    addBlog, deleteBlog, updateSEOSettings, resetToDefaults, uploadImage
  } = useCMS();

  const allSubCategories = categories.flatMap(cat =>
    (cat.subCategories || []).map(sub => ({
      id: sub.id || sub.name,
      name: sub.name,
      catSlug: cat.slug || cat.id,
      catName: cat.name,
      catId: cat.id
    }))
  );

  const [activeTab, setActiveTab] = useState<'super_categories' | 'festival_campaigns' | 'banners' | 'promo_cards' | 'home_subcats' | 'special_groups' | 'products' | 'coupons' | 'blogs' | 'seo'>('super_categories');

  // Super Category Editing State
  const [editingSuperCatId, setEditingSuperCatId] = useState<string | null>(null);
  const [scIcon, setScIcon] = useState('Coffee');
  const [scBannerUrl, setScBannerUrl] = useState('');
  const [scDisplayOrder, setScDisplayOrder] = useState(0);
  const [scActive, setScActive] = useState(true);
  const [scCategories, setScCategories] = useState<string[]>([]);
  const [scSubCategories, setScSubCategories] = useState<string[]>([]);
  const [scProducts, setScProducts] = useState<string[]>([]);
  const [isUploadingScBanner, setIsUploadingScBanner] = useState(false);
  const [prodSearchTerm, setProdSearchTerm] = useState('');

  // Clean 4-Step Festival Campaign Wizard Form States
  const [showFestivalForm, setShowFestivalForm] = useState(false);
  const [editingFestivalId, setEditingFestivalId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Festival Basic Details
  const [fcName, setFcName] = useState('');
  const [fcStartDate, setFcStartDate] = useState('');
  const [fcStartTime, setFcStartTime] = useState('00:00');
  const [fcEndDate, setFcEndDate] = useState('');
  const [fcEndTime, setFcEndTime] = useState('23:59');

  // Step 2: Festival Theme & Banner
  const [fcThemeKey, setFcThemeKey] = useState('krishna');
  const [fcBackgroundType, setFcBackgroundType] = useState<'predefined' | 'solid' | 'gradient'>('predefined');
  const [fcBackgroundColor, setFcBackgroundColor] = useState('#E0F2FE');
  const [fcGradientStart, setFcGradientStart] = useState('#E0F2FE');
  const [fcGradientEnd, setFcGradientEnd] = useState('#CFFAFE');
  const [fcGradientDirection, setFcGradientDirection] = useState('to bottom');

  const [fcEnableBanner, setFcEnableBanner] = useState(false);
  const [fcBannerImage, setFcBannerImage] = useState('');
  const [fcBannerLink, setFcBannerLink] = useState('');
  const [isUploadingFcBanner, setIsUploadingFcBanner] = useState(false);

  // Step 3: Festival Product Groups
  const [fcGroups, setFcGroups] = useState<any[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDiscountInput, setGroupDiscountInput] = useState(20);
  const [groupOrderInput, setGroupOrderInput] = useState(1);
  const [groupProductsInput, setGroupProductsInput] = useState<string[]>([]);
  const [showProductPickerModal, setShowProductPickerModal] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState('');
  const [productPickerCategory, setProductPickerCategory] = useState('');

  // Step 4: Theme Styling & Scope
  const [fcCardBackground, setFcCardBackground] = useState('#FFFBEB');
  const [fcCardBorder, setFcCardBorder] = useState('#BAE6FD');
  const [fcAccentColor, setFcAccentColor] = useState('#F59E0B');
  const [fcButtonColor, setFcButtonColor] = useState('#0EA5E9');
  const [fcTextColor, setFcTextColor] = useState('#0C4A6E');
  const [fcApplicableScopes, setFcApplicableScopes] = useState<string[]>(['all']);

  const applyPredefinedTheme = (themeKey: string) => {
    setFcThemeKey(themeKey);
    const preset = PREDEFINED_FESTIVAL_THEMES[themeKey];
    if (preset) {
      setFcBackgroundType('predefined');
      setFcGradientStart(preset.gradientStart);
      setFcGradientEnd(preset.gradientEnd);
      setFcGradientDirection(preset.gradientDirection);
      setFcCardBackground(preset.cardBackground);
      setFcCardBorder(preset.cardBorder);
      setFcAccentColor(preset.accentColor);
      setFcButtonColor(preset.buttonColor);
      setFcTextColor(preset.textColor);
    }
  };

  const resetFestivalForm = () => {
    setEditingFestivalId(null);
    setWizardStep(1);
    setFcName('');

    const todayStr = new Date().toISOString().split('T')[0];
    const endStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFcStartDate(todayStr);
    setFcStartTime('00:00');
    setFcEndDate(endStr);
    setFcEndTime('23:59');

    applyPredefinedTheme('krishna');

    setFcEnableBanner(false);
    setFcBannerImage('');
    setFcBannerLink('');

    setFcGroups([]);
    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupDiscountInput(20);
    setGroupOrderInput(1);
    setGroupProductsInput([]);
    setShowProductPickerModal(false);

    setFcApplicableScopes(['all']);
    setShowFestivalForm(false);
  };

  const handleEditFestival = (campaign: any) => {
    setEditingFestivalId(campaign.id || campaign._id);
    setWizardStep(1);
    setFcName(campaign.name || '');

    if (campaign.startDate) {
      const sDate = new Date(campaign.startDate);
      setFcStartDate(sDate.toISOString().split('T')[0]);
      setFcStartTime(sDate.toTimeString().slice(0, 5));
    } else {
      setFcStartDate(new Date().toISOString().split('T')[0]);
      setFcStartTime('00:00');
    }

    if (campaign.endDate) {
      const eDate = new Date(campaign.endDate);
      setFcEndDate(eDate.toISOString().split('T')[0]);
      setFcEndTime(eDate.toTimeString().slice(0, 5));
    } else {
      setFcEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setFcEndTime('23:59');
    }

    setFcThemeKey(campaign.themeKey || 'krishna');
    setFcBackgroundType(campaign.backgroundType || 'predefined');
    setFcBackgroundColor(campaign.backgroundColor || '#E0F2FE');
    setFcGradientStart(campaign.gradientStart || '#E0F2FE');
    setFcGradientEnd(campaign.gradientEnd || '#CFFAFE');
    setFcGradientDirection(campaign.gradientDirection || 'to bottom');

    setFcEnableBanner(campaign.enableBanner || false);
    setFcBannerImage(campaign.bannerImage || '');
    setFcBannerLink(campaign.bannerLink || '');

    setFcGroups(campaign.festivalGroups || []);

    const styling = campaign.cardStyling || {};
    setFcCardBackground(styling.cardBackground || '#FFFBEB');
    setFcCardBorder(styling.cardBorder || '#BAE6FD');
    setFcAccentColor(styling.accentColor || '#F59E0B');
    setFcButtonColor(styling.buttonColor || '#0EA5E9');
    setFcTextColor(styling.textColor || '#0C4A6E');

    setFcApplicableScopes(campaign.applicableSuperCategories || ['all']);
    setShowFestivalForm(true);
  };

  const handleFcBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFcBanner(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/festival-banner');
          setFcBannerImage(cUrl);
        } catch (err) {
          setFcBannerImage(base64);
        } finally {
          setIsUploadingFcBanner(false);
        }
      };
    } catch (err) {
      setIsUploadingFcBanner(false);
    }
  };

  const handleSaveGroup = () => {
    if (!groupNameInput.trim()) {
      alert('Please enter group display name');
      return;
    }
    if (groupProductsInput.length === 0) {
      alert('Please select at least 1 product for this festival group');
      return;
    }

    const gId = editingGroupId || 'fg_' + Date.now();
    const newGroup = {
      id: gId,
      displayName: groupNameInput.trim(),
      discountPercent: Number(groupDiscountInput) || 0,
      displayOrder: Number(groupOrderInput) || 1,
      products: groupProductsInput,
      isActive: true
    };

    if (editingGroupId) {
      setFcGroups(prev => prev.map(g => g.id === editingGroupId ? newGroup : g));
    } else {
      setFcGroups(prev => [...prev, newGroup]);
    }

    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupDiscountInput(20);
    setGroupOrderInput(fcGroups.length + 2);
    setGroupProductsInput([]);
  };

  const handleEditGroup = (grp: any) => {
    setEditingGroupId(grp.id);
    setGroupNameInput(grp.displayName || '');
    setGroupDiscountInput(grp.discountPercent ?? 20);
    setGroupOrderInput(grp.displayOrder ?? 1);
    setGroupProductsInput(grp.products || []);
  };

  const handleRemoveGroup = (groupId: string) => {
    setFcGroups(prev => prev.filter(g => g.id !== groupId));
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
      setGroupNameInput('');
      setGroupProductsInput([]);
    }
  };

  const handleToggleProductInGroup = (prodId: string) => {
    // Check if product is in ANOTHER group of this campaign
    const existingOtherGroup = fcGroups.find(
      g => g.id !== editingGroupId && (g.products || []).includes(prodId)
    );
    if (existingOtherGroup) {
      alert(`Product is already assigned to festival group "${existingOtherGroup.displayName}". A product can belong to only one group per campaign.`);
      return;
    }

    setGroupProductsInput(prev =>
      prev.includes(prodId) ? prev.filter(p => p !== prodId) : [...prev, prodId]
    );
  };

  const handleToggleScope = (scopeId: string) => {
    if (scopeId === 'all') {
      setFcApplicableScopes(['all']);
    } else {
      setFcApplicableScopes(prev => {
        const cleanPrev = prev.filter(s => s !== 'all' && s !== 'sc_all');
        if (cleanPrev.includes(scopeId)) {
          const next = cleanPrev.filter(s => s !== scopeId);
          return next.length === 0 ? ['all'] : next;
        } else {
          return [...cleanPrev, scopeId];
        }
      });
    }
  };

  const handleSaveCampaignSubmit = async (publishStatus: 'draft' | 'published') => {
    if (!fcName.trim()) {
      alert('Please enter Festival Name in Step 1');
      setWizardStep(1);
      return;
    }
    if (!fcStartDate || !fcEndDate) {
      alert('Please enter Start Date and End Date in Step 1');
      setWizardStep(1);
      return;
    }

    const startDateTime = new Date(`${fcStartDate}T${fcStartTime || '00:00'}:00`);
    const endDateTime = new Date(`${fcEndDate}T${fcEndTime || '23:59'}:00`);

    if (endDateTime <= startDateTime) {
      alert('End Date & Time must be strictly after Start Date & Time');
      setWizardStep(1);
      return;
    }

    const payload = {
      id: editingFestivalId || 'fc_' + Date.now(),
      name: fcName.trim(),
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      themeKey: fcThemeKey,
      backgroundType: fcBackgroundType,
      backgroundColor: fcBackgroundColor,
      gradientStart: fcGradientStart,
      gradientEnd: fcGradientEnd,
      gradientDirection: fcGradientDirection,
      enableBanner: fcEnableBanner,
      bannerImage: fcBannerImage.trim(),
      bannerLink: fcBannerLink.trim(),
      festivalGroups: fcGroups,
      cardStyling: {
        cardBackground: fcCardBackground,
        cardBorder: fcCardBorder,
        accentColor: fcAccentColor,
        buttonColor: fcButtonColor,
        textColor: fcTextColor
      },
      applicableSuperCategories: fcApplicableScopes,
      isActive: publishStatus === 'published',
      status: publishStatus
    };

    try {
      if (editingFestivalId) {
        await updateFestivalCampaign(editingFestivalId, payload);
      } else {
        await addFestivalCampaign(payload);
      }
      resetFestivalForm();
      alert(`Festival campaign ${publishStatus === 'published' ? 'published' : 'saved as draft'} successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save festival campaign');
    }
  };


  // Banner Add/Edit Form States
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerDisplayOn, setBannerDisplayOn] = useState<'HOME' | 'CATEGORY' | 'SUBCATEGORY' | 'ALL'>('HOME');
  const [bannerTargetPlatform, setBannerTargetPlatform] = useState<'ALL' | 'WEB' | 'MOBILE'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');
  const [bannerPosition, setBannerPosition] = useState<string | number>(0);
  const [bannerThemeBg, setBannerThemeBg] = useState('#8F1239');
  const [bannerThemeText, setBannerThemeText] = useState('#FFFFFF');
  const [bannerThemeAccent, setBannerThemeAccent] = useState('#F6C453');
  const [bannerStartDate, setBannerStartDate] = useState('');
  const [bannerEndDate, setBannerEndDate] = useState('');

  // Promo Card Form States
  const [showPromoCardForm, setShowPromoCardForm] = useState(false);
  const [editingPromoCardId, setEditingPromoCardId] = useState<string | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSubtitle, setPromoSubtitle] = useState('');
  const [promoButtonText, setPromoButtonText] = useState('Order Now');
  const [promoBgType, setPromoBgType] = useState<'color' | 'image'>('color');
  const [promoBgGradient, setPromoBgGradient] = useState('linear-gradient(135deg, #0284c7, #06b6d4)');
  const [promoBgImageUrl, setPromoBgImageUrl] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [promoTextColor, setPromoTextColor] = useState('#ffffff');
  const [promoDisplayOn, setPromoDisplayOn] = useState<'HOME' | 'CATEGORY' | 'SUBCATEGORY' | 'ALL'>('HOME');
  const [promoCategoryId, setPromoCategoryId] = useState('');
  const [promoSubCategoryId, setPromoSubCategoryId] = useState('');
  const [promoSubCategoryName, setPromoSubCategoryName] = useState('');
  const [promoDisplayOrder, setPromoDisplayOrder] = useState<number>(0);
  const [promoActive, setPromoActive] = useState(true);
  const [isUploadingPromoImage, setIsUploadingPromoImage] = useState(false);
  const [isUploadingPromoBgImage, setIsUploadingPromoBgImage] = useState(false);

  // Product Add Form States
  const [showProductForm, setShowProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pCategory, setPCategory] = useState('cat_organic');
  const [pPrice, setPPrice] = useState(99);
  const [pMrp, setPMrp] = useState(120);
  const [pWeight, setPWeight] = useState('250g');
  const [pDesc, setPDesc] = useState('');
  const [pImg, setPImg] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop');
  const [pOrganic, setPOrganic] = useState(false);

  // Coupon Add Form States
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cDiscount, setCDiscount] = useState('₹50 OFF');
  const [cDesc, setCDesc] = useState('Applicable on orders above ₹499');
  const [cMinOrder, setCMinOrder] = useState(499);
  const [cVal, setCVal] = useState(50);
  const [cPercent, setCPercent] = useState(false);

  // Blog Add Form States
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [bTitle, setBTitle] = useState('');
  const [bExcerpt, setBExcerpt] = useState('');
  const [bContent, setBContent] = useState('');
  const [bImg, setBImg] = useState('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop');
  const [bAuthorName, setBAuthorName] = useState('');
  const [bAuthorRole, setBAuthorRole] = useState('Nutritionist');
  const [bCategory, setBCategory] = useState('Nutrition');

  // SEO Editing States
  const [selectedSeoPage, setSelectedSeoPage] = useState('home');
  const [seoTitle, setSeoTitle] = useState(seoSettings.home?.title || '');
  const [seoDesc, setSeoDesc] = useState(seoSettings.home?.description || '');
  const [seoKeys, setSeoKeys] = useState(seoSettings.home?.keywords || '');

  // Special Groups Form States
  const [showSpecialGroupForm, setShowSpecialGroupForm] = useState(false);
  const [editingSpecialGroupId, setEditingSpecialGroupId] = useState<string | null>(null);
  const [sgTitle, setSgTitle] = useState('');
  const [sgInsertAfterIndex, setSgInsertAfterIndex] = useState<number>(0);
  const [sgItems, setSgItems] = useState<any[]>([]);
  const [itemSubName, setItemSubName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemImg, setItemImg] = useState('');
  const [itemFeatured, setItemFeatured] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCloudinary(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/special-groups');
          setItemImg(cUrl);
          if (editingItemIdx !== null) {
            setSgItems((prev) => {
              const updated = [...prev];
              if (updated[editingItemIdx]) {
                updated[editingItemIdx] = { ...updated[editingItemIdx], image: cUrl };
              }
              return updated;
            });
          }
        } catch (err) {
          console.warn('Cloudinary upload error, using local image data:', err);
          setItemImg(base64);
          if (editingItemIdx !== null) {
            setSgItems((prev) => {
              const updated = [...prev];
              if (updated[editingItemIdx]) {
                updated[editingItemIdx] = { ...updated[editingItemIdx], image: base64 };
              }
              return updated;
            });
          }
        } finally {
          setIsUploadingCloudinary(false);
        }
      };
    } catch (err) {
      console.error('File reading failed:', err);
      setIsUploadingCloudinary(false);
    }
  };

  const handleOpenEditGroup = (g: any) => {
    setEditingSpecialGroupId(g.id);
    setSgTitle(g.title);
    setSgInsertAfterIndex(g.insertAfterSubCategoryIndex !== undefined ? Number(g.insertAfterSubCategoryIndex) : 0);
    setSgItems(g.items || []);
    setEditingItemIdx(null);
    setItemSubName('');
    setItemImg('');
    setItemFeatured(false);
    setShowSpecialGroupForm(true);
  };

  const handleEditItemInGroup = (idx: number) => {
    const item = sgItems[idx];
    if (!item) return;
    setItemSubName(item.name || item.subCategoryName || '');
    setItemImg(item.image || '');
    setItemFeatured(item.isFeatured || false);
    setItemCatId(item.categoryId || '');
    setEditingItemIdx(idx);
  };

  const handleAddItemToGroup = () => {
    if (!itemSubName.trim()) {
      alert('Please select or type a subcategory name');
      return;
    }
    const subObj = allSubCategories.find(s => s.name === itemSubName);
    const catId = itemCatId || (subObj ? subObj.catId : (categories[0]?.id || 'cat_organic'));
    const linkUrl = subObj
      ? `/products?category=${subObj.catSlug}&subCategory=${encodeURIComponent(subObj.name)}`
      : `/products?subCategory=${encodeURIComponent(itemSubName.trim())}`;

    let nextItems = [...sgItems];
    if (editingItemIdx !== null) {
      nextItems[editingItemIdx] = {
        ...nextItems[editingItemIdx],
        name: itemSubName.trim(),
        subCategoryName: itemSubName.trim(),
        categoryId: catId,
        image: itemImg.trim() || 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
        link: linkUrl,
        isFeatured: itemFeatured
      };
      setSgItems(nextItems);
      setEditingItemIdx(null);
    } else {
      const newItem = {
        id: 'sgi_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        name: itemSubName.trim(),
        categoryId: catId,
        subCategoryName: itemSubName.trim(),
        image: itemImg.trim() || 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png',
        link: linkUrl,
        isFeatured: itemFeatured,
        displayOrder: sgItems.length
      };
      nextItems = [...sgItems, newItem];
      setSgItems(nextItems);
    }

    if (editingSpecialGroupId) {
      const payload = {
        id: editingSpecialGroupId,
        title: sgTitle.trim() || 'Special Group',
        slug: (sgTitle.trim() || 'Special Group').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        displayOrder: specialCategoryGroups.length + 1,
        insertAfterSubCategoryIndex: Number(sgInsertAfterIndex),
        active: true,
        items: nextItems
      };
      updateSpecialGroup(editingSpecialGroupId, payload);
    }

    setItemSubName('');
    setItemImg('');
    setItemFeatured(false);
  };

  const handleRemoveItemFromGroup = (idx: number) => {
    setSgItems(sgItems.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setItemSubName('');
      setItemImg('');
      setItemFeatured(false);
    }
  };

  const handleSaveSpecialGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sgTitle.trim()) {
      alert('Please enter group title (e.g. Grocery & Kitchen)');
      return;
    }
    if (sgItems.length === 0) {
      alert('Please add at least one subcategory item to the group');
      return;
    }

    const payload = {
      id: editingSpecialGroupId || 'sg_' + Date.now(),
      title: sgTitle.trim(),
      slug: sgTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      displayOrder: specialCategoryGroups.length + 1,
      insertAfterSubCategoryIndex: Number(sgInsertAfterIndex),
      active: true,
      items: sgItems
    };

    if (editingSpecialGroupId) {
      updateSpecialGroup(editingSpecialGroupId, payload);
      alert('Special group updated successfully!');
    } else {
      addSpecialGroup(payload);
      alert('Special group created successfully!');
    }

    setShowSpecialGroupForm(false);
    setEditingSpecialGroupId(null);
    setEditingItemIdx(null);
    setSgTitle('');
    setSgInsertAfterIndex(0);
    setSgItems([]);
    setItemSubName('');
    setItemImg('');
    setItemFeatured(false);
  };


  const handleEditBanner = (b: Banner) => {
    setEditingBannerId(b.id);
    setBannerTitle(b.title);
    setBannerImageUrl(b.imageUrl || '');
    const displayOnVal = b.displayOn || 'HOME';
    setBannerDisplayOn(displayOnVal);
    setBannerTargetPlatform(b.targetPlatform || 'ALL');
    setSelectedCategoryId(b.categoryId || (categories[0]?.id || ''));
    setSelectedSubCategoryId(b.subcategoryId || b.subCategoryName || '');
    setBannerPosition(b.position || b.positionIndex || 1);
    setBannerThemeBg(b.themeBgColor || (b.gradient?.[0] || '#8F1239'));
    setBannerThemeText(b.themeTextColor || '#FFFFFF');
    setBannerThemeAccent(b.themeAccentColor || '#F6C453');
    setBannerStartDate(b.startDate ? b.startDate.split('T')[0] : '');
    setBannerEndDate(b.endDate ? b.endDate.split('T')[0] : '');
    setShowBannerForm(true);
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      alert('Please enter banner name.');
      return;
    }

    let linkUrl = '/products';
    let gradient = ['#10B981', '#059669'];
    let catId = selectedCategoryId || (categories[0]?.id || 'fruits-vegetables');
    let subId = selectedSubCategoryId;

    if (bannerDisplayOn === 'HOME' || bannerDisplayOn === 'ALL') {
      linkUrl = '/products';
    } else if (bannerDisplayOn === 'CATEGORY') {
      const catObj = categories.find(c => c.id === catId || c.slug === catId);
      if (catObj) {
        catId = catObj.id || catObj.slug || catId;
        if (catObj.color) {
          gradient = [catObj.color, catObj.color];
        }
      }
      linkUrl = `/products?category=${encodeURIComponent(catId)}`;
    } else if (bannerDisplayOn === 'SUBCATEGORY') {
      const catObj = categories.find(c => c.id === catId || c.slug === catId);
      if (catObj) {
        catId = catObj.id || catObj.slug || catId;
        if (catObj.color) {
          gradient = [catObj.color, catObj.color];
        }
      }
      linkUrl = `/products?category=${encodeURIComponent(catId)}&subCategory=${encodeURIComponent(subId)}`;
    }

    const posNum = typeof bannerPosition === 'number' ? bannerPosition : (parseInt(String(bannerPosition)) || 1);
    const posStr = String(bannerPosition);

    const payload: Partial<Banner> = {
      title: bannerTitle.trim(),
      imageUrl: bannerImageUrl.trim(),
      displayOn: bannerDisplayOn,
      targetPlatform: bannerTargetPlatform,
      categoryId: bannerDisplayOn !== 'HOME' ? catId : undefined,
      subcategoryId: bannerDisplayOn === 'SUBCATEGORY' ? subId : undefined,
      subCategoryName: bannerDisplayOn === 'SUBCATEGORY' ? subId : undefined,
      position: posStr,
      positionIndex: posNum,
      linkUrl: linkUrl,
      subtitle: bannerDisplayOn === 'SUBCATEGORY'
        ? `Special deals on ${subId}`
        : (bannerDisplayOn === 'CATEGORY' ? `Deals on ${catId}` : 'Everyday Low Prices'),
      tag: 'PROMO',
      buttonText: 'Shop Deals',
      gradient: [bannerThemeBg.trim() || gradient[0], bannerThemeBg.trim() || gradient[1] || gradient[0]],
      themeBgColor: bannerThemeBg.trim(),
      themeTextColor: bannerThemeText.trim(),
      themeAccentColor: bannerThemeAccent.trim(),
      startDate: bannerStartDate ? new Date(bannerStartDate).toISOString() : undefined,
      endDate: bannerEndDate ? new Date(bannerEndDate).toISOString() : undefined,
      active: true
    };

    if (editingBannerId) {
      updateBanner(editingBannerId, payload);
      alert('Banner updated successfully!');
    } else {
      addBanner({
        ...payload,
        id: 'banner_' + Date.now(),
      } as Banner);
      alert('Banner created successfully!');
    }

    setShowBannerForm(false);
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerImageUrl('');
    setBannerDisplayOn('HOME');
    setBannerTargetPlatform('ALL');
    setSelectedCategoryId('');
    setSelectedSubCategoryId('');
    setBannerPosition(1);
    setBannerThemeBg('#8F1239');
    setBannerThemeText('#FFFFFF');
    setBannerThemeAccent('#F6C453');
    setBannerStartDate('');
    setBannerEndDate('');
  };

  const handleReset = () => {
    if (window.confirm('⚠️ Are you sure you want to reset all CMS modifications? This will restore original Flutter app mock values.')) {
      resetToDefaults();
      alert('CMS pre-populated defaults restored.');
    }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pBrand.trim() || !pDesc.trim()) {
      alert('Please fill out all product details.');
      return;
    }

    const discountValue = pMrp - pPrice;
    const discountText = discountValue > 0 ? `₹${discountValue} OFF` : 'Best Seller';

    const newProd: Product = {
      id: 'prod_custom_' + Date.now(),
      name: pName.trim(),
      brand: pBrand.trim(),
      categoryId: pCategory,
      rating: 4.8,
      reviewsCount: 1,
      price: pPrice,
      mrp: pMrp,
      discountText,
      weightOptions: [pWeight],
      defaultWeight: pWeight,
      description: pDesc.trim(),
      nutritionFacts: { 'Calories': '45 kcal', 'Protein': '1g' },
      ingredients: [pName],
      isOrganic: pOrganic,
      imageUrl: pImg.trim(),
      isFreshPick: true
    };

    addProduct(newProd);
    setShowProductForm(false);
    // Reset inputs
    setPName('');
    setPBrand('');
    setPDesc('');
    alert('Product added successfully!');
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim() || !cDiscount.trim()) {
      alert('Please fill out coupon details.');
      return;
    }

    const newCoupon: Coupon = {
      code: cCode.trim().toUpperCase(),
      discount: cDiscount,
      description: cDesc,
      minOrder: cMinOrder,
      value: cVal,
      isPercent: cPercent
    };

    addCoupon(newCoupon);
    setShowCouponForm(false);
    setCCode('');
    alert('Coupon added successfully!');
  };

  const handleBlogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bAuthorName.trim() || !bContent.trim()) {
      alert('Please fill out blog post details.');
      return;
    }

    const newPost: Blog = {
      id: 'blog_custom_' + Date.now(),
      title: bTitle.trim(),
      excerpt: bExcerpt.trim() || bTitle.slice(0, 50) + '...',
      content: bContent.trim(),
      coverImage: bImg.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      author: {
        name: bAuthorName.trim(),
        role: bAuthorRole,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop'
      },
      category: bCategory,
      comments: [],
      readTime: '3 min read'
    };

    addBlog(newPost);
    setShowBlogForm(false);
    setBTitle('');
    setBExcerpt('');
    setBContent('');
    setBAuthorName('');
    alert('Article published successfully!');
  };

  const handleSeoSelectChange = (pageKey: string) => {
    setSelectedSeoPage(pageKey);
    const settings = seoSettings[pageKey] || { title: '', description: '', keywords: '' };
    setSeoTitle(settings.title);
    setSeoDesc(settings.description);
    setSeoKeys(settings.keywords);
  };

  const handleSeoUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateSEOSettings(selectedSeoPage, {
      title: seoTitle,
      description: seoDesc,
      keywords: seoKeys
    });
    alert('SEO meta tags updated successfully!');
  };

  const handlePromoCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) {
      alert('Please provide a title for the promotional card.');
      return;
    }

    let targetLink = '/products';
    if (promoCategoryId) {
      if (promoSubCategoryName) {
        targetLink = `/products?category=${promoCategoryId}&subCategory=${encodeURIComponent(promoSubCategoryName)}`;
      } else {
        targetLink = `/products?category=${promoCategoryId}`;
      }
    }

    const payload: PromoCard = {
      id: editingPromoCardId || 'promo_' + Date.now(),
      title: promoTitle.trim(),
      subtitle: promoSubtitle.trim(),
      buttonText: promoButtonText.trim() || 'Order Now',
      bgType: promoBgType,
      bgGradient: promoBgGradient,
      bgImageUrl: promoBgImageUrl.trim(),
      imageUrl: promoImageUrl.trim(),
      textColor: promoTextColor,
      displayOn: promoDisplayOn,
      categoryId: promoCategoryId,
      subCategoryId: promoSubCategoryId,
      subCategoryName: promoSubCategoryName,
      linkUrl: targetLink,
      displayOrder: Number(promoDisplayOrder) || 0,
      active: promoActive
    };

    if (editingPromoCardId) {
      await updatePromoCard(editingPromoCardId, payload);
    } else {
      await addPromoCard(payload);
    }

    setShowPromoCardForm(false);
    setEditingPromoCardId(null);
    setPromoTitle('');
    setPromoSubtitle('');
    setPromoButtonText('Order Now');
    setPromoBgType('color');
    setPromoBgGradient('linear-gradient(135deg, #0284c7, #06b6d4)');
    setPromoBgImageUrl('');
    setPromoImageUrl('');
    setPromoDisplayOn('HOME');
    setPromoCategoryId('');
    setPromoSubCategoryId('');
    setPromoSubCategoryName('');
    setPromoDisplayOrder(0);
    setPromoActive(true);
  };

  const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPromoImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/promo-cards');
          setPromoImageUrl(cUrl);
        } catch (err) {
          setPromoImageUrl(base64);
        } finally {
          setIsUploadingPromoImage(false);
        }
      };
    } catch (err) {
      setIsUploadingPromoImage(false);
    }
  };

  const handlePromoBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPromoBgImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/promo-bg');
          setPromoBgImageUrl(cUrl);
        } catch (err) {
          setPromoBgImageUrl(base64);
        } finally {
          setIsUploadingPromoBgImage(false);
        }
      };
    } catch (err) {
      setIsUploadingPromoBgImage(false);
    }
  };

  // Super Category Handlers
  const handleOpenEditSuperCat = (sc: SuperCategory) => {
    setEditingSuperCatId(sc.id);
    setScIcon(sc.icon || 'Coffee');
    setScBannerUrl(sc.banner || '');
    setScDisplayOrder(sc.displayOrder || 0);
    setScActive(sc.active !== false);
    setScCategories(sc.categories || []);
    setScSubCategories(sc.subCategories || []);
    setScProducts(sc.products || []);
  };

  const handleSaveSuperCat = (scId: string) => {
    updateSuperCategory(scId, {
      icon: scIcon,
      banner: scBannerUrl.trim(),
      displayOrder: Number(scDisplayOrder),
      active: scActive,
      categories: scCategories,
      subCategories: scSubCategories,
      products: scProducts
    });
    setEditingSuperCatId(null);
    alert('Super Category updated successfully!');
  };

  const handleScBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingScBanner(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/super-categories');
          setScBannerUrl(cUrl);
        } catch (err) {
          setScBannerUrl(base64);
        } finally {
          setIsUploadingScBanner(false);
        }
      };
    } catch (err) {
      setIsUploadingScBanner(false);
    }
  };

  const toggleCategorySelection = (catId: string) => {
    setScCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const toggleSubCategorySelection = (subName: string) => {
    setScSubCategories(prev =>
      prev.includes(subName) ? prev.filter(s => s !== subName) : [...prev, subName]
    );
  };

  const toggleProductSelection = (prodId: string) => {
    setScProducts(prev =>
      prev.includes(prodId) ? prev.filter(p => p !== prodId) : [...prev, prodId]
    );
  };

  return (
    <div className="page-wrapper">
      <SEO
        title="Admin CMS Dashboard | FreshCart Control"
        description="FreshCart content management system dashboard. Admin page to control sitemaps, categories, products, blogs, coupons, and testimonials."
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">

          {/* Left Navigation Sidebar */}
          <aside className="bg-surface border border-divider rounded-2xl p-4 shadow-card flex flex-col gap-1.5 h-fit">
            <div className="text-[10px] font-bold text-text-secondary px-3 py-1 border-b border-divider mb-2">CMS MODULES</div>

            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'super_categories' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('super_categories')}
            >
              ✨ Super Categories (Zepto Style)
            </button>
            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'festival_campaigns' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('festival_campaigns')}
            >
              🎉 Festival Campaigns
            </button>
            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'promo_cards' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('promo_cards')}
            >
              💳 Promotional Cards
            </button>
            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'home_subcats' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('home_subcats')}
            >
              🏷️ Home Sub-Categories
            </button>
            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'special_groups' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('special_groups')}
            >
              ⭐ Special Subcategory Groups
            </button>
            <button
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'banners' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('banners')}
            >
              🖼️ Inter-Section Banners
            </button>

            <button
              onClick={handleReset}
              className="w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-error border-t border-divider mt-4 pt-4 hover:bg-error/5"
            >
              🔄 Reset to Defaults
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card flex flex-col gap-6">

            {/* Header section */}
            <div className="border-b border-divider pb-4">
              <h2 className="text-xl font-extrabold text-text-primary font-display">
                {activeTab === 'super_categories' && '✨ Super Categories & Navigation Header (Zepto Style Concept)'}
                {activeTab === 'festival_campaigns' && '🎉 Festival Campaigns (Blinkit Festival Concept)'}
                {activeTab === 'promo_cards' && 'Promotional Cards Management'}
                {activeTab === 'home_subcats' && 'Home Page Sub-Categories Selection'}
                {activeTab === 'special_groups' && 'Special Subcategory Groups (Zepto Mobile Grid V3)'}
                {activeTab === 'banners' && 'Dynamic Inter-Section Banners (CRUD)'}
              </h2>
            </div>

            {/* TAB: SUPER CATEGORIES */}
            {activeTab === 'super_categories' && (
              <div className="flex flex-col gap-6">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold text-sm mb-1">Zepto-Style Super Category Navigation Architecture</p>
                  <p>
                    Configure presentation, banners, display order, and multi-selected catalog categories, subcategories, or products for each platform Super Category. Enabled Super Categories appear in the web top navigation bar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(superCategories && superCategories.length > 0 ? superCategories : defaultSuperCategories)
                    .slice()
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((sc) => {
                      const isEditing = editingSuperCatId === sc.id;

                      return (
                        <div key={sc.id} className="border border-divider rounded-2xl p-5 bg-background shadow-xs flex flex-col gap-4">
                          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-divider/60 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                                {sc.icon === 'Coffee' && <Coffee size={20} />}
                                {sc.icon === 'Leaf' && <Leaf size={20} />}
                                {sc.icon === 'Home' && <Home size={20} />}
                                {sc.icon === 'Headphones' && <Headphones size={20} />}
                                {sc.icon === 'Smartphone' && <Smartphone size={20} />}
                                {sc.icon === 'Sparkles' && <Sparkles size={20} />}
                                {sc.icon === 'Shirt' && <Shirt size={20} />}
                                {sc.icon === 'Gamepad2' && <Gamepad2 size={20} />}
                                {sc.icon === 'LayoutGrid' && <LayoutGrid size={20} />}
                                {!['Coffee','Leaf','Home','Headphones','Smartphone','Sparkles','Shirt','Gamepad2','LayoutGrid'].includes(sc.icon) && (
                                  <Utensils size={20} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-extrabold text-text-primary">{sc.name}</h3>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-divider text-text-secondary">
                                    slug: {sc.slug}
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                  {sc.categories?.length || 0} Categories • {sc.subCategories?.length || 0} Subcategories • {sc.products?.length || 0} Explicit Products
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Status Toggle */}
                              <button
                                onClick={() => updateSuperCategory(sc.id, { active: sc.active === false ? true : false })}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                  sc.active !== false
                                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                    : 'bg-gray-200 text-gray-600 border border-gray-300'
                                }`}
                              >
                                {sc.active !== false ? 'Enabled' : 'Disabled'}
                              </button>

                              <button
                                onClick={() => handleOpenEditSuperCat(sc)}
                                className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:bg-primary-hover transition-all"
                              >
                                <Edit2 size={14} />
                                <span>Configure</span>
                              </button>
                            </div>
                          </div>

                          {/* Hero Banner Preview */}
                          {sc.banner && (
                            <div className="w-full h-24 rounded-xl overflow-hidden relative border border-divider">
                              <img src={sc.banner} alt={sc.name} className="w-full h-full object-cover" />
                              <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                Super Category Hero Banner
                              </span>
                            </div>
                          )}

                          {/* inline Edit Drawer / Form */}
                          {isEditing && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-emerald-500/30 flex flex-col gap-4 shadow-sm">
                              <div className="flex items-center justify-between border-b border-divider pb-2">
                                <h4 className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                                  Edit Configuration for {sc.name}
                                </h4>
                                <button
                                  onClick={() => setEditingSuperCatId(null)}
                                  className="text-text-secondary hover:text-text-primary p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-text-primary mb-1">Display Order</label>
                                  <input
                                    type="number"
                                    value={scDisplayOrder}
                                    onChange={(e) => setScDisplayOrder(Number(e.target.value))}
                                    className="w-full text-xs p-2 rounded-xl border border-divider bg-background"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-text-primary mb-1">Icon Key</label>
                                  <select
                                    value={scIcon}
                                    onChange={(e) => setScIcon(e.target.value)}
                                    className="w-full text-xs p-2 rounded-xl border border-divider bg-background"
                                  >
                                    <option value="Coffee">Coffee (Cafe)</option>
                                    <option value="Leaf">Leaf (Fresh)</option>
                                    <option value="Home">Home (Home)</option>
                                    <option value="Gamepad2">Gamepad2 (Toys)</option>
                                    <option value="Headphones">Headphones (Electronics)</option>
                                    <option value="Smartphone">Smartphone (Mobiles)</option>
                                    <option value="Sparkles">Sparkles (Beauty)</option>
                                    <option value="Shirt">Shirt (Fashion)</option>
                                    <option value="LayoutGrid">LayoutGrid (All)</option>
                                    <option value="Utensils">Utensils</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-text-primary mb-1">Visibility Status</label>
                                  <button
                                    type="button"
                                    onClick={() => setScActive(!scActive)}
                                    className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors ${
                                      scActive ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}
                                  >
                                    {scActive ? 'Active / Visible' : 'Hidden'}
                                  </button>
                                </div>
                              </div>

                              {/* Banner Upload */}
                              <div>
                                <label className="block text-xs font-bold text-text-primary mb-1">Hero Banner Image</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={scBannerUrl}
                                    onChange={(e) => setScBannerUrl(e.target.value)}
                                    placeholder="Upload or enter Banner Image URL"
                                    className="flex-1 text-xs p-2 rounded-xl border border-divider bg-background"
                                  />
                                  <label className="cursor-pointer px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0">
                                    <Upload size={14} />
                                    <span>{isUploadingScBanner ? 'Uploading...' : 'Upload'}</span>
                                    <input type="file" accept="image/*" onChange={handleScBannerUpload} className="hidden" />
                                  </label>
                                </div>
                              </div>

                              {/* Multi-Select Main Catalog Categories */}
                              <div>
                                <label className="block text-xs font-bold text-text-primary mb-2">
                                  Select Categories (Multi-Select):
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-divider rounded-xl bg-background">
                                  {categories.map((c) => {
                                    const isSelected = scCategories.includes(c.id) || scCategories.includes(c.slug || '');
                                    return (
                                      <button
                                        type="button"
                                        key={c.id}
                                        onClick={() => toggleCategorySelection(c.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold border transition-all ${
                                          isSelected
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                            : 'border-divider text-text-primary hover:bg-surface'
                                        }`}
                                      >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${isSelected ? 'bg-emerald-600' : 'border border-gray-300'}`}>
                                          {isSelected && <Check size={12} />}
                                        </div>
                                        <span className="truncate">{c.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Multi-Select Subcategories */}
                              <div>
                                <label className="block text-xs font-bold text-text-primary mb-2">
                                  Select Subcategories (Multi-Select):
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-divider rounded-xl bg-background">
                                  {allSubCategories.map((scItem, idx) => {
                                    const isSelected = scSubCategories.includes(scItem.name);
                                    return (
                                      <button
                                        type="button"
                                        key={`subsel_${idx}_${scItem.name}`}
                                        onClick={() => toggleSubCategorySelection(scItem.name)}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold border transition-all ${
                                          isSelected
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                            : 'border-divider text-text-primary hover:bg-surface'
                                        }`}
                                      >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${isSelected ? 'bg-emerald-600' : 'border border-gray-300'}`}>
                                          {isSelected && <Check size={12} />}
                                        </div>
                                        <span className="truncate">{scItem.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex justify-end gap-2 pt-2 border-t border-divider">
                                <button
                                  type="button"
                                  onClick={() => setEditingSuperCatId(null)}
                                  className="px-4 py-2 rounded-xl border border-divider text-xs font-bold text-text-secondary hover:bg-background"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSuperCat(sc.id)}
                                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                                >
                                  Save Super Category
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: FESTIVAL CAMPAIGNS */}
            {activeTab === 'festival_campaigns' && (
              <div className="flex flex-col gap-6">
                {!showFestivalForm ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-extrabold text-text-primary">Festival Campaign Management</h2>
                        <p className="text-xs text-text-secondary">
                          Create lightweight, date-bound themed festival campaigns with temporary product merchandising groups and dynamic discounts.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          resetFestivalForm();
                          setShowFestivalForm(true);
                        }}
                        className="bg-primary text-white font-bold py-2.5 px-5 rounded-xl text-xs hover:bg-secondary transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <Plus size={16} />
                        <span>Create Festival Campaign</span>
                      </button>
                    </div>

                    {/* Campaigns List */}
                    {festivalCampaigns.length === 0 ? (
                      <div className="p-8 border border-dashed border-divider rounded-2xl text-center text-text-secondary text-sm">
                        No festival campaigns created yet. Click "Create Festival Campaign" to launch your first 4-step festival campaign wizard.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {festivalCampaigns.map((camp: any) => {
                          const id = camp.id || camp._id;
                          const isPublished = camp.status === 'published' && camp.isActive !== false;
                          const now = new Date();
                          const sDate = camp.startDate ? new Date(camp.startDate) : null;
                          const eDate = camp.endDate ? new Date(camp.endDate) : null;
                          const isLiveNow = isPublished && sDate && eDate && now >= sDate && now <= eDate;
                          const isExpired = eDate && now > eDate;

                          const themePreset = PREDEFINED_FESTIVAL_THEMES[camp.themeKey || 'krishna'] || PREDEFINED_FESTIVAL_THEMES.krishna;
                          const groupsCount = camp.festivalGroups?.length || 0;
                          const totalProductsCount = (camp.festivalGroups || []).reduce((acc: number, g: any) => acc + (g.products?.length || 0), 0);
                          const scopes = camp.applicableSuperCategories || ['all'];
                          const scopeLabel = (scopes.includes('all') || scopes.includes('sc_all')) ? 'All Super Categories' : `${scopes.length} Super Categories`;

                          return (
                            <div
                              key={id}
                              className={`relative overflow-hidden border rounded-2xl p-4 transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
                                isLiveNow
                                  ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md'
                                  : isPublished
                                  ? 'border-primary/40 bg-surface'
                                  : 'border-divider bg-background/50 opacity-75'
                              }`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div
                                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border border-black/10 shadow-xs"
                                  style={{ background: `linear-gradient(135deg, ${themePreset.gradientStart}, ${themePreset.gradientEnd})` }}
                                >
                                  <span>{themePreset.emoji}</span>
                                </div>

                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-extrabold text-base text-text-primary truncate">{camp.name}</h3>

                                    {isLiveNow && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white animate-pulse">
                                        ⚡ LIVE NOW
                                      </span>
                                    )}

                                    {!isLiveNow && isPublished && !isExpired && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                        SCHEDULED
                                      </span>
                                    )}

                                    {isExpired && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        EXPIRED
                                      </span>
                                    )}

                                    {!isPublished && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                        DRAFT
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-text-secondary mt-1 flex-wrap">
                                    <span>Theme: <strong>{themePreset.name}</strong></span>
                                    <span>•</span>
                                    <span>Groups: <strong>{groupsCount}</strong> ({totalProductsCount} products)</span>
                                    <span>•</span>
                                    <span>Scope: <strong>{scopeLabel}</strong></span>
                                  </div>

                                  <div className="text-[11px] text-text-tertiary mt-1">
                                    {sDate ? sDate.toLocaleString() : 'N/A'} → {eDate ? eDate.toLocaleString() : 'N/A'}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button
                                  onClick={() => toggleFestivalCampaignStatus(id, !isPublished)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    isPublished ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  {isPublished ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                  onClick={() => handleEditFestival(camp)}
                                  className="p-2 rounded-xl border border-divider hover:bg-background text-text-primary transition-colors cursor-pointer"
                                  title="Edit Campaign Wizard"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete festival campaign "${camp.name}"?`)) {
                                      deleteFestivalCampaign(id);
                                    }
                                  }}
                                  className="p-2 rounded-xl border border-error/20 bg-error/5 text-error hover:bg-error/10 transition-colors cursor-pointer"
                                  title="Delete Campaign"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* CLEAN 4-STEP FESTIVAL CAMPAIGN WIZARD */
                  <div className="flex flex-col gap-6 bg-background p-6 rounded-2xl border border-divider w-full">
                    {/* Top Wizard Header */}
                    <div className="flex items-center justify-between border-b border-divider pb-4">
                      <div>
                        <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                          <Sparkles className="text-amber-500" size={20} />
                          <span>{editingFestivalId ? 'Edit Festival Campaign Wizard' : 'Create Festival Campaign Wizard'}</span>
                        </h3>
                        <p className="text-xs text-text-secondary">Follow the step-by-step wizard to build lightweight date-bound festival campaigns.</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetFestivalForm}
                        className="px-3 py-1.5 rounded-xl border border-divider text-xs font-bold text-text-secondary hover:bg-surface transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <X size={16} />
                        <span>Cancel Wizard</span>
                      </button>
                    </div>

                    {/* Step Navigation Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-surface p-1.5 rounded-xl border border-divider">
                      {[
                        { step: 1, title: 'Step 1: Details', desc: 'Name & Schedule' },
                        { step: 2, title: 'Step 2: Theme & Banner', desc: 'CSS Style & Banner' },
                        { step: 3, title: 'Step 3: Product Groups', desc: 'Group Discounts' },
                        { step: 4, title: 'Step 4: Scope & Save', desc: 'Super Categories & Publish' }
                      ].map((item) => (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() => setWizardStep(item.step as any)}
                          className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col ${
                            wizardStep === item.step
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : wizardStep > item.step
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-text-secondary hover:bg-background'
                          }`}
                        >
                          <span className="text-xs font-black">{item.title}</span>
                          <span className={`text-[10px] truncate opacity-90 ${wizardStep === item.step ? 'text-white' : 'text-text-tertiary'}`}>
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* STEP 1 — FESTIVAL BASIC DETAILS */}
                    {wizardStep === 1 && (
                      <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="border-b border-divider pb-3">
                          <h4 className="text-sm font-extrabold text-text-primary">Step 1 — Festival Basic Details</h4>
                          <p className="text-xs text-text-secondary">Set the festival name and date/time window. The campaign will automatically activate and expire based on these times.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-text-primary mb-1.5">Festival Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Krishna Janmashtami"
                              value={fcName}
                              onChange={(e) => setFcName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary font-bold text-text-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-text-primary mb-1.5">Start Date</label>
                            <input
                              type="date"
                              required
                              value={fcStartDate}
                              onChange={(e) => setFcStartDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary text-text-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-text-primary mb-1.5">Start Time</label>
                            <input
                              type="time"
                              required
                              value={fcStartTime}
                              onChange={(e) => setFcStartTime(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary text-text-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-text-primary mb-1.5">End Date</label>
                            <input
                              type="date"
                              required
                              value={fcEndDate}
                              onChange={(e) => setFcEndDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary text-text-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-text-primary mb-1.5">End Time</label>
                            <input
                              type="time"
                              required
                              value={fcEndTime}
                              onChange={(e) => setFcEndTime(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary text-text-primary"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-divider">
                          <button
                            type="button"
                            onClick={resetFestivalForm}
                            className="px-4 py-2 border border-divider rounded-xl text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!fcName.trim()) {
                                alert('Please enter Festival Name');
                                return;
                              }
                              if (!fcStartDate || !fcEndDate) {
                                alert('Please select valid Start and End dates');
                                return;
                              }
                              const sDT = new Date(`${fcStartDate}T${fcStartTime}:00`);
                              const eDT = new Date(`${fcEndDate}T${fcEndTime}:00`);
                              if (eDT <= sDT) {
                                alert('End Date & Time must be strictly after Start Date & Time');
                                return;
                              }
                              setWizardStep(2);
                            }}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <span>Next: Theme & Banner</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 — FESTIVAL THEME & BANNER */}
                    {wizardStep === 2 && (
                      <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="border-b border-divider pb-3">
                          <h4 className="text-sm font-extrabold text-text-primary">Step 2 — Festival Theme & Banner</h4>
                          <p className="text-xs text-text-secondary">Select a predefined lightweight CSS theme or customize background colors. Theme assets are 100% CSS-based for optimal load speed.</p>
                        </div>

                        {/* Predefined Themes Grid */}
                        <div>
                          <label className="block text-xs font-bold text-text-primary mb-2">Select Predefined Festival Theme:</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {Object.values(PREDEFINED_FESTIVAL_THEMES).map((preset) => {
                              const isSelected = fcThemeKey === preset.key && fcBackgroundType === 'predefined';
                              return (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() => applyPredefinedTheme(preset.key)}
                                  className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md bg-surface'
                                      : 'border-divider bg-surface/50 hover:bg-surface'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-2xl">{preset.emoji}</span>
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-extrabold text-text-primary line-clamp-1">{preset.name}</span>

                                  {/* Color Preview Bar */}
                                  <div className="flex items-center h-2 rounded-full overflow-hidden border border-black/10">
                                    <div className="flex-1 h-full" style={{ backgroundColor: preset.gradientStart }} />
                                    <div className="flex-1 h-full" style={{ backgroundColor: preset.cardBackground }} />
                                    <div className="flex-1 h-full" style={{ backgroundColor: preset.buttonColor }} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Background Mode Fallback */}
                        <div className="p-4 rounded-xl border border-divider bg-surface/50 flex flex-col gap-3">
                          <label className="text-xs font-bold text-text-primary">Or Custom Background Mode:</label>
                          <div className="flex items-center gap-4">
                            {['predefined', 'solid', 'gradient'].map((mode) => (
                              <label key={mode} className="flex items-center gap-1.5 text-xs font-semibold text-text-primary cursor-pointer capitalize">
                                <input
                                  type="radio"
                                  name="bgType"
                                  value={mode}
                                  checked={fcBackgroundType === mode}
                                  onChange={() => setFcBackgroundType(mode as any)}
                                  className="text-emerald-600"
                                />
                                <span>{mode}</span>
                              </label>
                            ))}
                          </div>

                          {fcBackgroundType === 'solid' && (
                            <div className="flex items-center gap-3 mt-1">
                              <label className="text-xs font-bold text-text-primary">Solid Color:</label>
                              <input
                                type="color"
                                value={fcBackgroundColor}
                                onChange={(e) => setFcBackgroundColor(e.target.value)}
                                className="w-8 h-8 rounded border border-divider cursor-pointer"
                              />
                              <input
                                type="text"
                                value={fcBackgroundColor}
                                onChange={(e) => setFcBackgroundColor(e.target.value)}
                                className="w-28 px-2 py-1 text-xs rounded bg-surface border border-divider"
                              />
                            </div>
                          )}

                          {fcBackgroundType === 'gradient' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Start Color</label>
                                <input
                                  type="color"
                                  value={fcGradientStart}
                                  onChange={(e) => setFcGradientStart(e.target.value)}
                                  className="w-full h-8 rounded border border-divider cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">End Color</label>
                                <input
                                  type="color"
                                  value={fcGradientEnd}
                                  onChange={(e) => setFcGradientEnd(e.target.value)}
                                  className="w-full h-8 rounded border border-divider cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Direction</label>
                                <select
                                  value={fcGradientDirection}
                                  onChange={(e) => setFcGradientDirection(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                                >
                                  <option value="to bottom">To Bottom ↓</option>
                                  <option value="to right">To Right →</option>
                                  <option value="135deg">Diagonal ↘</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Optional Festival Banner */}
                        <div className="p-4 rounded-xl border border-divider bg-surface/50 flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="enable_banner"
                              checked={fcEnableBanner}
                              onChange={(e) => setFcEnableBanner(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <label htmlFor="enable_banner" className="text-xs font-extrabold text-text-primary cursor-pointer">
                              Enable Festival Banner (Optional)
                            </label>
                          </div>

                          {fcEnableBanner && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 animate-fadeIn">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Banner Image URL / Upload</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="https://images.unsplash.com/..."
                                    value={fcBannerImage}
                                    onChange={(e) => setFcBannerImage(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs bg-surface border border-divider rounded-xl outline-none"
                                  />
                                  <label className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0">
                                    <span>{isUploadingFcBanner ? '...' : 'Upload'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFcBannerUpload} />
                                  </label>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Banner Click Link (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. /products?search=sweets"
                                  value={fcBannerLink}
                                  onChange={(e) => setFcBannerLink(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs bg-surface border border-divider rounded-xl outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-divider">
                          <button
                            type="button"
                            onClick={() => setWizardStep(1)}
                            className="px-4 py-2 border border-divider rounded-xl text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <span>Next: Product Groups</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3 — FESTIVAL PRODUCT GROUPS */}
                    {wizardStep === 3 && (
                      <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="border-b border-divider pb-3">
                          <h4 className="text-sm font-extrabold text-text-primary">Step 3 — Festival Product Groups</h4>
                          <p className="text-xs text-text-secondary">
                            Create temporary campaign display groups (e.g. "Gifts", "Krishna Specials"). You can select products from MULTIPLE existing categories for each group.
                          </p>
                        </div>

                        {/* Created Groups List */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-text-primary">Created Merchandising Groups ({fcGroups.length}):</label>
                            {editingGroupId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGroupId(null);
                                  setGroupNameInput('');
                                  setGroupProductsInput([]);
                                }}
                                className="text-xs text-rose-500 font-bold hover:underline"
                              >
                                Cancel Group Editing
                              </button>
                            )}
                          </div>

                          {fcGroups.length === 0 ? (
                            <div className="p-4 border border-dashed border-divider rounded-xl text-center text-xs text-text-secondary">
                              No product groups created yet. Use the form below to create your first group (e.g. "Gifts" with 20% OFF).
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {fcGroups.map((grp) => {
                                const prodCount = (grp.products || []).length;
                                return (
                                  <div
                                    key={grp.id}
                                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                                      editingGroupId === grp.id ? 'border-emerald-600 bg-emerald-500/10' : 'border-divider bg-surface'
                                    }`}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-xs text-text-primary truncate">{grp.displayName}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                                          {grp.discountPercent}% OFF
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-text-secondary mt-0.5">{prodCount} products selected</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleEditGroup(grp)}
                                        className="p-1.5 rounded-lg border border-divider hover:bg-background text-text-primary"
                                        title="Edit Group"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveGroup(grp.id)}
                                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                        title="Delete Group"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Add / Edit Group Inline Form */}
                        <div className="p-4 rounded-xl border border-divider bg-surface flex flex-col gap-4">
                          <h5 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            {editingGroupId ? `Edit Group "${groupNameInput}"` : '+ Add New Festival Group'}
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Group Display Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Gifts or Sweets & Chocolates"
                                value={groupNameInput}
                                onChange={(e) => setGroupNameInput(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-divider outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Discount (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={groupDiscountInput}
                                onChange={(e) => setGroupDiscountInput(Number(e.target.value))}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-divider outline-none font-bold text-emerald-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Display Order</label>
                              <input
                                type="number"
                                min="1"
                                value={groupOrderInput}
                                onChange={(e) => setGroupOrderInput(Number(e.target.value))}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-divider outline-none"
                              />
                            </div>
                          </div>

                          {/* Selected Products Preview & Selector Modal Launcher */}
                          <div className="flex flex-col gap-2 border-t border-divider pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-text-primary">
                                Selected Products ({groupProductsInput.length}):
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowProductPickerModal(true)}
                                className="px-3 py-1.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={14} />
                                <span>Select Products ({groupProductsInput.length})</span>
                              </button>
                            </div>

                            {/* Tags of selected products */}
                            {groupProductsInput.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-background border border-divider rounded-xl">
                                {groupProductsInput.map((pid) => {
                                  const prod = products.find((p) => p.id === pid || p._id === pid);
                                  return (
                                    <span
                                      key={pid}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                                    >
                                      <span>{prod?.name || pid}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleProductInGroup(pid)}
                                        className="hover:text-rose-500 ml-1 text-xs"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={handleSaveGroup}
                              className="px-5 py-2 bg-emerald-700 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-800 cursor-pointer shadow-xs"
                            >
                              {editingGroupId ? 'Update Group' : '+ Save Group to Campaign'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-divider">
                          <button
                            type="button"
                            onClick={() => setWizardStep(2)}
                            className="px-4 py-2 border border-divider rounded-xl text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (fcGroups.length === 0) {
                                alert('Please create at least 1 festival product group before proceeding');
                                return;
                              }
                              setWizardStep(4);
                            }}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <span>Next: Scope & Save</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 4 — STYLING & SCOPE + SUMMARY & SAVE */}
                    {wizardStep === 4 && (
                      <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="border-b border-divider pb-3">
                          <h4 className="text-sm font-extrabold text-text-primary">Step 4 — Styling & Application Scope</h4>
                          <p className="text-xs text-text-secondary">Review light card styling tokens and select which Super Categories receive this festival campaign experience.</p>
                        </div>

                        {/* Styling Tokens */}
                        <div className="p-4 rounded-xl border border-divider bg-surface flex flex-col gap-3">
                          <h5 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Card Theme Styling (Pre-populated from Theme)</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Card Background</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={fcCardBackground}
                                  onChange={(e) => setFcCardBackground(e.target.value)}
                                  className="w-7 h-7 rounded border border-divider cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={fcCardBackground}
                                  onChange={(e) => setFcCardBackground(e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded bg-background border border-divider"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Card Border</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={fcCardBorder}
                                  onChange={(e) => setFcCardBorder(e.target.value)}
                                  className="w-7 h-7 rounded border border-divider cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={fcCardBorder}
                                  onChange={(e) => setFcCardBorder(e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded bg-background border border-divider"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Accent Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={fcAccentColor}
                                  onChange={(e) => setFcAccentColor(e.target.value)}
                                  className="w-7 h-7 rounded border border-divider cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={fcAccentColor}
                                  onChange={(e) => setFcAccentColor(e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded bg-background border border-divider"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-primary mb-1">Button Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={fcButtonColor}
                                  onChange={(e) => setFcButtonColor(e.target.value)}
                                  className="w-7 h-7 rounded border border-divider cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={fcButtonColor}
                                  onChange={(e) => setFcButtonColor(e.target.value)}
                                  className="w-full px-2 py-1 text-xs rounded bg-background border border-divider"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Application Scope */}
                        <div className="p-4 rounded-xl border border-divider bg-surface flex flex-col gap-3">
                          <h5 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Apply Festival Campaign To:</h5>
                          <p className="text-[11px] text-text-secondary">
                            When customers visit selected Super Categories during active campaign dates, festival theme styling and merchandising groups will be displayed.
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
                            {/* ALL Checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleScope('all')}
                              className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                (fcApplicableScopes.includes('all') || fcApplicableScopes.includes('sc_all'))
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-background border-divider text-text-primary hover:bg-surface'
                              }`}
                            >
                              <span>✨ All Super Categories</span>
                              {(fcApplicableScopes.includes('all') || fcApplicableScopes.includes('sc_all')) && <Check size={14} />}
                            </button>

                            {/* Dynamic Super Categories from DB */}
                            {superCategories.map((sc) => {
                              const isChecked = !fcApplicableScopes.includes('all') && fcApplicableScopes.includes(sc.id);
                              return (
                                <button
                                  type="button"
                                  key={sc.id}
                                  onClick={() => handleToggleScope(sc.id)}
                                  className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                      : 'bg-background border-divider text-text-primary hover:bg-surface'
                                  }`}
                                >
                                  <span className="truncate">{sc.name}</span>
                                  {isChecked && <Check size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* EMBEDDED SUMMARY CARD */}
                        {(() => {
                          const themePreset = PREDEFINED_FESTIVAL_THEMES[fcThemeKey] || PREDEFINED_FESTIVAL_THEMES.krishna;
                          const totalProds = fcGroups.reduce((acc, g) => acc + (g.products?.length || 0), 0);
                          const discounts = fcGroups.map((g) => g.discountPercent || 0);
                          const minDisc = discounts.length ? Math.min(...discounts) : 0;
                          const maxDisc = discounts.length ? Math.max(...discounts) : 0;
                          const discLabel = minDisc === maxDisc ? `${minDisc}% OFF` : `${minDisc}% - ${maxDisc}% OFF`;
                          const scopes = fcApplicableScopes.includes('all') ? 'All Super Categories' : `${fcApplicableScopes.length} selected areas`;

                          return (
                            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-3">
                              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                <h5 className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                  <span>{themePreset.emoji}</span>
                                  <span>{fcName || 'Festival Campaign'} Summary</span>
                                </h5>
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">READY TO PUBLISH</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-text-secondary text-[11px]">Schedule:</span>
                                  <div className="font-bold text-text-primary">{fcStartDate || 'N/A'} {fcStartTime} → {fcEndDate || 'N/A'} {fcEndTime}</div>
                                </div>

                                <div>
                                  <span className="text-text-secondary text-[11px]">Selected Theme:</span>
                                  <div className="font-bold text-text-primary">{themePreset.name}</div>
                                </div>

                                <div>
                                  <span className="text-text-secondary text-[11px]">Festival Groups:</span>
                                  <div className="font-bold text-text-primary">{fcGroups.length} groups ({totalProds} products)</div>
                                </div>

                                <div>
                                  <span className="text-text-secondary text-[11px]">Discount Range:</span>
                                  <div className="font-bold text-emerald-600">{discLabel}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action Buttons: Save Draft / Publish Campaign */}
                        <div className="flex items-center justify-between pt-4 border-t border-divider">
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            className="px-4 py-2 border border-divider rounded-xl text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                          >
                            ← Back
                          </button>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSaveCampaignSubmit('draft')}
                              className="px-5 py-2.5 border border-divider rounded-xl text-xs font-extrabold text-text-primary hover:bg-surface cursor-pointer"
                            >
                              Save Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCampaignSubmit('published')}
                              className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-md cursor-pointer flex items-center gap-1"
                            >
                              <span>Publish Campaign</span>
                              <span>✓</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PRODUCT PICKER MODAL FOR STEP 3 */}
            {showProductPickerModal && (
              <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-background border border-divider rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-divider flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-text-primary">Select Products for Festival Group</h4>
                      <p className="text-xs text-text-secondary">Products can be selected from multiple existing categories.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductPickerModal(false)}
                      className="p-1 rounded-full text-text-secondary hover:bg-surface"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Filter & Search Controls */}
                  <div className="p-3 border-b border-divider bg-surface flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Search products by name or brand..."
                      value={productPickerSearch}
                      onChange={(e) => setProductPickerSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-background border border-divider rounded-xl outline-none"
                    />

                    <select
                      value={productPickerCategory}
                      onChange={(e) => setProductPickerCategory(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background border border-divider rounded-xl outline-none shrink-0"
                    >
                      <option value="">All Database Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Products Grid */}
                  <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 flex-1">
                    {products
                      .filter((p) => {
                        const matchesCat = !productPickerCategory || p.categoryId === productPickerCategory || p.category === productPickerCategory;
                        const matchesSearch = !productPickerSearch || p.name.toLowerCase().includes(productPickerSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(productPickerSearch.toLowerCase());
                        return matchesCat && matchesSearch;
                      })
                      .map((prod) => {
                        const isSelectedInCurrentGroup = groupProductsInput.includes(prod.id) || (prod._id && groupProductsInput.includes(prod._id));
                        const otherGroup = fcGroups.find((g) => g.id !== editingGroupId && (g.products || []).some((pid: string) => pid === prod.id || pid === prod._id));

                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              if (!otherGroup) {
                                handleToggleProductInGroup(prod.id);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              isSelectedInCurrentGroup
                                ? 'border-emerald-600 bg-emerald-500/10'
                                : otherGroup
                                ? 'border-divider bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                                : 'border-divider bg-surface hover:bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={prod.imageUrl || prod.image}
                                alt={prod.name}
                                className="w-9 h-9 object-contain rounded bg-white p-0.5 shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-text-primary truncate">{prod.name}</span>
                                <span className="text-[10px] text-text-secondary">₹{prod.price}</span>
                                {otherGroup && (
                                  <span className="text-[9px] font-bold text-amber-600 truncate">
                                    Assigned to "{otherGroup.displayName}"
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-xs shrink-0 ${isSelectedInCurrentGroup ? 'bg-emerald-600' : 'border border-divider'}`}>
                              {isSelectedInCurrentGroup && <Check size={14} />}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-3 border-t border-divider bg-surface flex items-center justify-between">
                    <span className="text-xs font-bold text-text-secondary">{groupProductsInput.length} products selected for group</span>
                    <button
                      type="button"
                      onClick={() => setShowProductPickerModal(false)}
                      className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer"
                    >
                      Done Selecting
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRODUCTS */}
            {activeTab === 'products' && (
              <div className="flex flex-col gap-6">
                {!showProductForm ? (
                  <button onClick={() => setShowProductForm(true)} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer flex items-center gap-2 self-start">
                    <Plus size={16} />
                    <span>Add New Product</span>
                  </button>
                ) : (
                  <form onSubmit={handleProductSubmit} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
                    <h3 className="font-bold text-sm text-text-primary border-b border-divider pb-2 mb-2">Add Product Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Product Name</label>
                        <input type="text" placeholder="e.g. Organic Baby Carrots" value={pName} onChange={(e) => setPName(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Brand Name</label>
                        <input type="text" placeholder="e.g. Earth Greens" value={pBrand} onChange={(e) => setPBrand(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Category</label>
                        <select value={pCategory} onChange={(e) => setPCategory(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary">
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Default Weight Option</label>
                        <input type="text" placeholder="e.g. 250g or 1 packet" value={pWeight} onChange={(e) => setPWeight(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Price (₹)</label>
                        <input type="number" value={pPrice} onChange={(e) => setPPrice(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">MRP (₹)</label>
                        <input type="number" value={pMrp} onChange={(e) => setPMrp(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Description</label>
                        <textarea placeholder="Write full description..." rows={3} value={pDesc} onChange={(e) => setPDesc(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Unsplash Image URL</label>
                        <input type="text" value={pImg} onChange={(e) => setPImg(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center text-xs text-text-secondary cursor-pointer select-none font-bold">
                          <input type="checkbox" checked={pOrganic} onChange={(e) => setPOrganic(e.target.checked)} className="w-4 h-4 rounded border-divider text-primary focus:ring-primary mr-2" />
                          <span>100% Organic certified</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer">Save Product</button>
                      <button type="button" onClick={() => setShowProductForm(false)} className="bg-background text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-full text-xs hover:bg-surface hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}

                {/* Table listing */}
                <div className="overflow-x-auto border border-divider rounded-xl">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Image</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Name</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Brand</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Category</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Price</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">MRP</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Type</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-background/30 transition-colors">
                          <td className="p-3.5 border-b border-divider text-text-secondary"><img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 object-contain rounded bg-background border border-divider" /></td>
                          <td className="p-3.5 border-b border-divider text-text-secondary"><strong>{prod.name}</strong></td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{prod.brand}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{categories.find((c) => c.id === prod.categoryId)?.name || prod.categoryId}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">₹{prod.price}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">₹{prod.mrp}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{prod.isOrganic ? '🟢 Organic' : 'Standard'}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary text-right">
                            <button onClick={() => deleteProduct(prod.id)} className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors" title="Delete product">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: HOME SUB-CATEGORIES SELECTION */}
            {activeTab === 'home_subcats' && (
              <div className="flex flex-col gap-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-medium">
                  <strong>💡 Admin Home Configuration:</strong> Select which sub-categories appear on the customer Home page. Toggle checkboxes to enable/disable sub-categories in real-time.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map((cat) => {
                    const subCats = cat.subCategories || [];
                    if (subCats.length === 0) return null;

                    return (
                      <div key={cat.id} className="p-5 rounded-2xl bg-background border border-divider space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-divider/60 pb-2">
                          <h4 className="font-extrabold text-sm text-text-primary flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || '#10B981' }} />
                            {cat.name}
                          </h4>
                          <span className="text-[10px] font-bold text-text-tertiary">{subCats.length} sub-categories</span>
                        </div>

                        <div className="space-y-2">
                          {subCats.map((sub, idx) => {
                            const subName = typeof sub === 'string' ? sub : sub.name;
                            const isSelected = homeSelectedSubCategories.length === 0 || homeSelectedSubCategories.includes(subName);

                            return (
                              <label
                                key={idx}
                                onClick={() => toggleHomeSubCategory(subName)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-bold ${isSelected
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
                                  : 'bg-surface border-divider/60 text-text-secondary opacity-60'
                                  }`}
                              >
                                <span>{subName}</span>
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-emerald-600" />
                                ) : (
                                  <Square size={16} className="text-text-tertiary" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: PROMO CARDS */}
            {activeTab === 'promo_cards' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-text-primary">Promotional Cards Management</h3>
                    <p className="text-xs text-text-secondary font-medium">
                      Upload and manage top promotional cards. Select target categories & background style (solid color/gradient or HD promotional card upload).
                    </p>
                  </div>
                  {!showPromoCardForm && (
                    <button
                      onClick={() => {
                        setEditingPromoCardId(null);
                        setPromoTitle('');
                        setPromoSubtitle('');
                        setPromoButtonText('Order Now');
                        setPromoBgType('color');
                        setPromoBgGradient('linear-gradient(135deg, #0284c7, #06b6d4)');
                        setPromoBgImageUrl('');
                        setPromoImageUrl('');
                        setPromoDisplayOn('HOME');
                        setPromoCategoryId(categories[0]?.id || categories[0]?.slug || '');
                        setPromoSubCategoryId('');
                        setPromoSubCategoryName('');
                        setPromoDisplayOrder(promoCards.length + 1);
                        setPromoActive(true);
                        setShowPromoCardForm(true);
                      }}
                      className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-full text-xs hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={16} />
                      <span>Create Promo Card</span>
                    </button>
                  )}
                </div>

                {showPromoCardForm && (
                  <form onSubmit={handlePromoCardSubmit} className="bg-background p-6 rounded-2xl border border-divider flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-divider pb-3">
                      <h3 className="font-extrabold text-sm text-text-primary">
                        {editingPromoCardId ? '✏️ Edit Promotional Card' : '✨ Add New Promotional Card'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Background Mode Switch: Color/Gradient vs Promotional Card Upload */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2 pb-2">
                        <label className="text-xs font-bold text-text-primary">Card Background Style *</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPromoBgType('color')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold border transition-all ${promoBgType === 'color'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-surface text-text-primary border-divider hover:bg-background'
                              }`}
                          >
                            🎨 Solid / Color Gradient
                          </button>
                          <button
                            type="button"
                            onClick={() => setPromoBgType('image')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold border transition-all ${promoBgType === 'image'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-surface text-text-primary border-divider hover:bg-background'
                              }`}
                          >
                            🖼️ Promotional Card Upload
                          </button>
                        </div>
                      </div>

                      {/* Options when Color mode is active */}
                      {promoBgType === 'color' && (
                        <>
                          {/* Title */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-text-primary">Card Headline / Title *</label>
                            <input
                              type="text"
                              value={promoTitle}
                              onChange={(e) => setPromoTitle(e.target.value)}
                              placeholder="e.g. Pharmacy at your doorstep! or Cold Drinks & Juices"
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required={promoBgType === 'color'}
                            />
                          </div>

                          {/* Subtitle */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-text-primary">Subtitle / Description</label>
                            <input
                              type="text"
                              value={promoSubtitle}
                              onChange={(e) => setPromoSubtitle(e.target.value)}
                              placeholder="e.g. Cough syrups, pain relief sprays & more"
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary"
                            />
                          </div>

                          {/* Button Text */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-text-primary">Button Label</label>
                            <input
                              type="text"
                              value={promoButtonText}
                              onChange={(e) => setPromoButtonText(e.target.value)}
                              placeholder="Order Now"
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                            />
                          </div>
                        </>
                      )}

                      {/* Display Location Scope */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Display Location *</label>
                        <select
                          value={promoDisplayOn}
                          onChange={(e) => setPromoDisplayOn(e.target.value as any)}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                        >
                          <option value="HOME">📍 Home Page (Top Promotional Cards Grid below Hero Banner)</option>
                          <option value="CATEGORY">📍 Category Landing Page (Top Header of Category Catalog)</option>
                          <option value="SUBCATEGORY">📍 Subcategory Page (Top Header of Subcategory Product List)</option>
                          <option value="ALL">📍 All Pages (Visible on Home, Category & Subcategory Pages)</option>
                        </select>
                      </div>

                      {/* Target Category Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Target Category *</label>
                        <select
                          value={promoCategoryId}
                          onChange={(e) => {
                            setPromoCategoryId(e.target.value);
                            setPromoSubCategoryId('');
                            setPromoSubCategoryName('');
                          }}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((cat) => (
                            <option key={cat.id || cat.slug} value={cat.id || cat.slug}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Target Subcategory Selector */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Target Subcategory (Optional)</label>
                        <select
                          value={promoSubCategoryName}
                          onChange={(e) => {
                            setPromoSubCategoryName(e.target.value);
                            const foundSub = categories
                              .flatMap((c) => c.subCategories || [])
                              .find((s: any) => (typeof s === 'string' ? s : s.name) === e.target.value);
                            setPromoSubCategoryId(typeof foundSub === 'object' && foundSub ? (foundSub.id || foundSub.name) : e.target.value);
                          }}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                        >
                          <option value="">-- All Subcategories in Category --</option>
                          {categories
                            .find((c) => (c.id || c.slug) === promoCategoryId)
                            ?.subCategories?.map((sub: any, idx: number) => {
                              const sName = typeof sub === 'string' ? sub : sub.name;
                              return (
                                <option key={idx} value={sName}>
                                  {sName}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Controls based on bgType selection */}
                      {promoBgType === 'color' ? (
                        <>
                          <div className="flex flex-col gap-1.5 sm:col-span-2 border-t border-divider pt-3">
                            <label className="text-xs font-bold text-text-primary">Background Color Gradient Presets</label>
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {[
                                { name: 'Teal/Green', val: 'linear-gradient(135deg, #0d9488, #10b981)' },
                                { name: 'Cyan (Pharmacy)', val: 'linear-gradient(135deg, #0284c7, #06b6d4)' },
                                { name: 'Amber (Pet Care)', val: 'linear-gradient(135deg, #d97706, #f59e0b)' },
                                { name: 'Lavender (Baby Care)', val: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
                                { name: 'Rose/Pink', val: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
                                { name: 'Emerald Gold', val: 'linear-gradient(135deg, #059669, #10b981)' },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => setPromoBgGradient(preset.val)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-white transition-transform ${promoBgGradient === preset.val ? 'ring-2 ring-emerald-500 scale-105 shadow-sm' : 'opacity-90 hover:opacity-100'}`}
                                  style={{ background: preset.val }}
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={promoBgGradient}
                              onChange={(e) => setPromoBgGradient(e.target.value)}
                              placeholder="linear-gradient(135deg, #0284c7, #06b6d4)"
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-mono"
                            />
                          </div>

                          {/* Graphic Overlay Image */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-text-primary">Graphic Overlay Image (Optional - Product graphic on right)</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={promoImageUrl}
                                onChange={(e) => setPromoImageUrl(e.target.value)}
                                placeholder="Image URL or upload file below"
                                className="flex-1 px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-mono"
                              />
                              <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                                <Upload size={14} />
                                <span>{isUploadingPromoImage ? 'Uploading...' : 'Upload Overlay'}</span>
                                <input type="file" accept="image/*" onChange={handlePromoImageUpload} className="hidden" />
                              </label>
                            </div>
                            {promoImageUrl && (
                              <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border border-divider bg-surface p-1">
                                <img src={promoImageUrl} alt="Overlay Preview" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1.5 sm:col-span-2 border-t border-divider pt-3">
                          <label className="text-xs font-bold text-text-primary">Promotional Card Image Banner (HD Upload) *</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={promoBgImageUrl}
                              onChange={(e) => setPromoBgImageUrl(e.target.value)}
                              placeholder="Image URL or upload banner image file below"
                              className="flex-1 px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-mono"
                              required={promoBgType === 'image'}
                            />
                            <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 shadow-sm">
                              <Upload size={14} />
                              <span>{isUploadingPromoBgImage ? 'Uploading...' : 'Upload Promo Banner'}</span>
                              <input type="file" accept="image/*" onChange={handlePromoBgImageUpload} className="hidden" />
                            </label>
                          </div>
                          {promoBgImageUrl && (
                            <div className="mt-2 w-full h-36 rounded-xl overflow-hidden border border-divider bg-surface">
                              <img src={promoBgImageUrl} alt="Promotional Banner Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display Order & Active Toggle */}
                      <div className="flex items-center gap-4 sm:col-span-2">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <label className="text-xs font-bold text-text-primary">Display Order</label>
                          <input
                            type="number"
                            value={promoDisplayOrder}
                            onChange={(e) => setPromoDisplayOrder(parseInt(e.target.value) || 0)}
                            className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer bg-surface px-4 py-2 rounded-xl border border-divider">
                            <input
                              type="checkbox"
                              checked={promoActive}
                              onChange={(e) => setPromoActive(e.target.checked)}
                              className="w-4 h-4 rounded border-divider text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-text-primary">Active</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-emerald-600 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm">
                        {editingPromoCardId ? 'Update Promo Card' : 'Save Promo Card'}
                      </button>
                      <button type="button" onClick={() => setShowPromoCardForm(false)} className="bg-background text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-surface transition-colors cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Promo Cards Live Preview Listing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {promoCards.length === 0 ? (
                    <div className="col-span-3 p-8 border border-dashed border-divider rounded-2xl text-center text-xs font-bold text-text-tertiary">
                      No promotional cards created yet. Click "Create Promo Card" above to add promotional banner cards.
                    </div>
                  ) : (
                    promoCards.map((card) => {
                      const targetCat = categories.find((c) => (c.id || c.slug) === card.categoryId);
                      const catLabel = card.subCategoryName
                        ? `${targetCat?.name || card.categoryId} › ${card.subCategoryName}`
                        : targetCat?.name || card.categoryId || 'All Products';

                      const isBgImg = card.bgType === 'image' && card.bgImageUrl;

                      return (
                        <div
                          key={card.id}
                          className="relative rounded-2xl overflow-hidden flex flex-col justify-between shadow-md border border-white/20 min-h-[165px] bg-cover bg-center"
                          style={{
                            background: isBgImg ? `url(${card.bgImageUrl}) center/cover no-repeat` : card.bgGradient || 'linear-gradient(135deg, #0284c7, #06b6d4)',
                            color: card.textColor || '#ffffff'
                          }}
                        >
                          {/* If color mode, render title, subtitle & button */}
                          {!isBgImg && (
                            <div className="z-10 p-5 pr-24">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/40 text-white border border-white/20 inline-block mb-1.5">
                                {catLabel}
                              </span>
                              <h4 className="text-base font-black leading-tight tracking-tight drop-shadow-xs">{card.title}</h4>
                              {card.subtitle && (
                                <p className="text-xs font-medium opacity-90 mt-1 line-clamp-2">{card.subtitle}</p>
                              )}
                              <button className="mt-4 bg-black/80 hover:bg-black text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-sm w-fit transition-transform active:scale-95">
                                {card.buttonText || 'Order Now'}
                              </button>
                            </div>
                          )}

                          {!isBgImg && card.imageUrl && (
                            <img
                              src={card.imageUrl}
                              alt={card.title}
                              className="absolute right-2 bottom-2 w-28 h-28 object-contain z-10 pointer-events-none drop-shadow-md"
                            />
                          )}

                          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-xs p-1 rounded-xl">
                            <button
                              onClick={() => {
                                setEditingPromoCardId(card.id);
                                setPromoTitle(card.title);
                                setPromoSubtitle(card.subtitle || '');
                                setPromoButtonText(card.buttonText || 'Order Now');
                                setPromoBgType(card.bgType || 'color');
                                setPromoBgGradient(card.bgGradient || 'linear-gradient(135deg, #0284c7, #06b6d4)');
                                setPromoBgImageUrl(card.bgImageUrl || '');
                                setPromoImageUrl(card.imageUrl || '');
                                setPromoTextColor(card.textColor || '#ffffff');
                                setPromoDisplayOn(card.displayOn || 'HOME');
                                setPromoCategoryId(card.categoryId || '');
                                setPromoSubCategoryId(card.subCategoryId || '');
                                setPromoSubCategoryName(card.subCategoryName || '');
                                setPromoDisplayOrder(card.displayOrder || 0);
                                setPromoActive(card.active !== false);
                                setShowPromoCardForm(true);
                              }}
                              className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors"
                              title="Edit Promo Card"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete promo card "${card.title}"?`)) deletePromoCard(card.id);
                              }}
                              className="p-1.5 rounded-lg text-white hover:bg-red-500/80 transition-colors"
                              title="Delete Promo Card"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: BANNERS (DYNAMIC CRUD) */}
            {activeTab === 'banners' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-text-secondary font-medium">
                    Add, edit and target promo banners across Home, Category, and Subcategory pages.
                  </p>
                  {!showBannerForm && (
                    <button
                      onClick={() => {
                        setEditingBannerId(null);
                        setBannerTitle('');
                        setBannerImageUrl('');
                        setBannerDisplayOn('HOME');
                        setSelectedCategoryId(categories[0]?.id || '');
                        setSelectedSubCategoryId('');
                        setBannerPosition(0);
                        setShowBannerForm(true);
                      }}
                      className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-full text-xs hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={16} />
                      <span>Create New Banner</span>
                    </button>
                  )}
                </div>

                {showBannerForm && (
                  <form onSubmit={handleBannerSubmit} className="bg-background p-6 rounded-2xl border border-divider flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-divider pb-3">
                      <h3 className="font-extrabold text-sm text-text-primary">
                        {editingBannerId ? '✏️ Edit Banner' : '✨ Add New Banner'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. Banner Name */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Banner Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Weekend Organic Freshness Banner"
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-semibold"
                          required
                        />
                      </div>

                      {/* 2. Banner Image & Upload */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Banner Image *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... or upload file"
                            value={bannerImageUrl}
                            onChange={(e) => setBannerImageUrl(e.target.value)}
                            className="flex-1 px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-medium"
                            required
                          />
                          <label className="bg-surface border border-divider text-text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-background cursor-pointer flex items-center gap-1.5 shrink-0">
                            <Upload size={14} />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    try {
                                      const url = await uploadImage(reader.result as string, 'banners');
                                      if (url) {
                                        setBannerImageUrl(url);
                                        alert('✅ Image uploaded successfully!');
                                      }
                                    } catch (err) {
                                      alert('Image upload failed.');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[11px] text-text-tertiary font-semibold mt-1">
                          Recommended: 1600 × 400 px · 4:1 landscape ratio
                        </p>
                        {bannerImageUrl && (
                          <div className="mt-2 w-full aspect-[21/5] max-h-44 rounded-xl overflow-hidden border border-divider bg-surface">
                            <img src={bannerImageUrl} alt="Banner Preview" className="w-full h-full object-cover object-center" />
                          </div>
                        )}
                      </div>

                      {/* 3. Display On * */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Display On *</label>
                        <select
                          value={bannerDisplayOn}
                          onChange={(e) => {
                            const val = e.target.value as 'HOME' | 'CATEGORY' | 'SUBCATEGORY' | 'ALL';
                            setBannerDisplayOn(val);
                            if (val === 'HOME' || val === 'ALL') {
                              setBannerPosition(0);
                            } else if (val === 'CATEGORY' || val === 'SUBCATEGORY') {
                              setBannerPosition('top');
                              if (!selectedCategoryId && categories.length > 0) {
                                setSelectedCategoryId(categories[0].id || categories[0].slug || '');
                              }
                            }
                          }}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                          required
                        >
                          <option value="HOME">Home</option>
                          <option value="CATEGORY">Category</option>
                          <option value="SUBCATEGORY">Subcategory</option>
                          <option value="ALL">All (Home, Category & Subcategory)</option>
                        </select>
                      </div>

                      {/* 3b. Target Platform / Device * */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                          <span>Target Platform / Device *</span>
                          <span className="text-[11px] font-normal text-text-tertiary">Select device visibility</span>
                        </label>
                        <select
                          value={bannerTargetPlatform}
                          onChange={(e) => setBannerTargetPlatform(e.target.value as 'ALL' | 'WEB' | 'MOBILE')}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold cursor-pointer"
                          required
                        >
                          <option value="ALL">🌐 Both Web & Mobile (All Devices)</option>
                          <option value="WEB">💻 Web Only (Desktop / Laptop View)</option>
                          <option value="MOBILE">📱 Mobile Only (Smartphone / App View)</option>
                        </select>
                      </div>

                      {/* 4. Dynamic Targeting Fields based on Display On */}
                      {(bannerDisplayOn === 'HOME' || bannerDisplayOn === 'ALL') && (
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-xs font-bold text-text-primary">Display Position on Home Page *</label>
                          <select
                            value={bannerPosition}
                            onChange={(e) => setBannerPosition(parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0)}
                            className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold cursor-pointer"
                          >
                            <option value={0}>📍 Top Hero Carousel (Main Header Banner under Navigation Bar)</option>
                            <option value={1}>📍 Inter-Section Banner #1 (Placed after 1st Subcategory section)</option>
                            <option value={2}>📍 Inter-Section Banner #2 (Placed after 2nd Subcategory section)</option>
                            <option value={3}>📍 Inter-Section Banner #3 (Placed after 3rd Subcategory section)</option>
                            <option value={4}>📍 Inter-Section Banner #4 (Placed after 4th Subcategory section)</option>
                            <option value={5}>📍 Inter-Section Banner #5 (Placed after 5th Subcategory section)</option>
                            <option value={6}>📍 Inter-Section Banner #6 (Placed after 6th Subcategory section)</option>
                            <option value={7}>📍 Inter-Section Banner #7 (Placed after 7th Subcategory section)</option>
                            <option value={8}>📍 Inter-Section Banner #8 (Placed after 8th Subcategory section)</option>
                            <option value={99}>📍 Bottom Banner (Placed at the very bottom of Home page)</option>
                          </select>
                        </div>
                      )}

                      {bannerDisplayOn === 'CATEGORY' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Category *</label>
                            <select
                              value={selectedCategoryId}
                              onChange={(e) => setSelectedCategoryId(e.target.value)}
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required
                            >
                              <option value="">-- Select Category --</option>
                              {categories.map((cat) => (
                                <option key={cat.id || cat.slug} value={cat.id || cat.slug}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Category Page Position *</label>
                            <select
                              value={bannerPosition}
                              onChange={(e) => setBannerPosition(e.target.value)}
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required
                            >
                              <option value="top">📍 Top Banner (Header area above category filter tabs)</option>
                              <option value="before_subcategories">📍 Above Subcategories Grid</option>
                              <option value="after_subcategories">📍 Between Subcategories & Product Grid</option>
                              <option value="before_products">📍 Directly Above Product Cards Shelf</option>
                            </select>
                          </div>
                        </>
                      )}

                      {bannerDisplayOn === 'SUBCATEGORY' && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Category *</label>
                            <select
                              value={selectedCategoryId}
                              onChange={(e) => {
                                setSelectedCategoryId(e.target.value);
                                setSelectedSubCategoryId('');
                              }}
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required
                            >
                              <option value="">-- Select Category --</option>
                              {categories.map((cat) => (
                                <option key={cat.id || cat.slug} value={cat.id || cat.slug}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Subcategory *</label>
                            <select
                              value={selectedSubCategoryId}
                              onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required
                            >
                              <option value="">-- Select Subcategory --</option>
                              {(categories.find(c => c.id === selectedCategoryId || c.slug === selectedCategoryId)?.subCategories || []).map((sub, idx) => {
                                const subName = typeof sub === 'string' ? sub : sub.name;
                                return (
                                  <option key={idx + subName} value={subName}>
                                    {subName}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-text-primary">Subcategory Page Position *</label>
                            <select
                              value={bannerPosition}
                              onChange={(e) => setBannerPosition(e.target.value)}
                              className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                              required
                            >
                              <option value="top">📍 Top Header Banner of Subcategory Page</option>
                              <option value="before_products">📍 Directly Above Subcategory Products</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* 5. Campaign Theme Colors & Active Dates (Admin CMS Manual Customization) */}
                      <div className="sm:col-span-2 p-4 rounded-xl bg-surface border border-divider flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-2 border-b border-divider pb-2">
                          <span className="text-xs font-extrabold text-text-primary uppercase tracking-wide">🎨 Campaign Theme Colors & Active Dates</span>
                          <span className="text-[10px] text-text-tertiary">(Controls Home AppBar, Header, Top Categories strip & Accents)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Theme Background Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bannerThemeBg}
                                onChange={(e) => setBannerThemeBg(e.target.value)}
                                className="w-9 h-9 p-0.5 rounded-lg border border-divider cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={bannerThemeBg}
                                onChange={(e) => setBannerThemeBg(e.target.value)}
                                placeholder="#8F1239"
                                className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background font-mono text-text-primary uppercase"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Theme Text Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bannerThemeText}
                                onChange={(e) => setBannerThemeText(e.target.value)}
                                className="w-9 h-9 p-0.5 rounded-lg border border-divider cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={bannerThemeText}
                                onChange={(e) => setBannerThemeText(e.target.value)}
                                placeholder="#FFFFFF"
                                className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background font-mono text-text-primary uppercase"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Theme Accent Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bannerThemeAccent}
                                onChange={(e) => setBannerThemeAccent(e.target.value)}
                                className="w-9 h-9 p-0.5 rounded-lg border border-divider cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={bannerThemeAccent}
                                onChange={(e) => setBannerThemeAccent(e.target.value)}
                                placeholder="#F6C453"
                                className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background font-mono text-text-primary uppercase"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-divider pt-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">Start Date (Optional)</label>
                            <input
                              type="date"
                              value={bannerStartDate}
                              onChange={(e) => setBannerStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background text-text-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-text-primary">End Date (Optional)</label>
                            <input
                              type="date"
                              value={bannerEndDate}
                              onChange={(e) => setBannerEndDate(e.target.value)}
                              className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background text-text-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-emerald-600 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm">
                        {editingBannerId ? 'Update Banner' : 'Save Banner'}
                      </button>
                      <button type="button" onClick={() => setShowBannerForm(false)} className="bg-background text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-surface transition-colors cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Banner cards listing */}
                <div className="grid grid-cols-1 gap-4">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border border-divider bg-background shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      style={{
                        background: b.gradient ? `linear-gradient(135deg, ${b.gradient[0]}15, ${b.gradient[1] || b.gradient[0]}25)` : undefined
                      }}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {b.imageUrl && (
                          <img src={b.imageUrl} alt={b.title} className="w-20 h-20 rounded-xl object-cover border border-divider/60 flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              {b.displayOn || 'HOME'}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${b.targetPlatform === 'WEB'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : b.targetPlatform === 'MOBILE'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              {b.targetPlatform === 'WEB' ? '💻 Web Only' : b.targetPlatform === 'MOBILE' ? '📱 Mobile Only' : '🌐 Web & Mobile'}
                            </span>
                            <span className="text-[10px] font-bold text-text-tertiary px-2 py-0.5 rounded-full bg-surface border border-divider">
                              {(!b.displayOn || b.displayOn === 'HOME') && `Position: After Section #${b.positionIndex || 1}`}
                              {b.displayOn === 'ALL' && `All Pages · Pos: After Section #${b.positionIndex || 1}`}
                              {b.displayOn === 'CATEGORY' && `Category: ${b.categoryId || 'All'} · Pos: ${b.position || 'top'}`}
                              {b.displayOn === 'SUBCATEGORY' && `Subcategory: ${b.subcategoryId || b.subCategoryName} · Pos: ${b.position || 'top'}`}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-text-primary mt-1.5">{b.title}</h4>
                          <p className="text-xs text-text-secondary mt-0.5">{b.subtitle}</p>
                          {b.linkUrl && (
                            <p className="text-[11px] text-emerald-600 font-bold mt-1">Target: {b.linkUrl}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <label className="flex items-center gap-2 cursor-pointer bg-surface px-3 py-1.5 rounded-xl border border-divider shadow-2xs">
                          <input
                            type="checkbox"
                            checked={b.active}
                            onChange={(e) => updateBanner(b.id, { active: e.target.checked })}
                            className="w-4 h-4 rounded border-divider text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-bold text-text-primary">{b.active ? 'Active' : 'Disabled'}</span>
                        </label>

                        <button
                          onClick={() => handleEditBanner(b)}
                          className="p-2 rounded-xl border border-divider text-text-secondary hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          title="Edit banner"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete banner "${b.title}"?`)) deleteBanner(b.id);
                          }}
                          className="p-2 rounded-xl border border-divider text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                          title="Delete banner"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: COUPONS */}
            {activeTab === 'coupons' && (
              <div className="flex flex-col gap-6">
                {!showCouponForm ? (
                  <button onClick={() => setShowCouponForm(true)} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer flex items-center gap-2 self-start">
                    <Plus size={16} />
                    <span>Create New Coupon</span>
                  </button>
                ) : (
                  <form onSubmit={handleCouponSubmit} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
                    <h3 className="font-bold text-sm text-text-primary border-b border-divider pb-2 mb-2">Create Coupon</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Coupon Code</label>
                        <input type="text" placeholder="e.g. MONSOON40" value={cCode} onChange={(e) => setCCode(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Discount Text</label>
                        <input type="text" placeholder="e.g. ₹40 OFF or 10% OFF" value={cDiscount} onChange={(e) => setCDiscount(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Description</label>
                        <input type="text" placeholder="e.g. Applicable on orders above ₹199" value={cDesc} onChange={(e) => setCDesc(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Min Order Value (₹)</label>
                        <input type="number" value={cMinOrder} onChange={(e) => setCMinOrder(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Value Amount</label>
                        <input type="number" value={cVal} onChange={(e) => setCVal(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="flex items-center text-xs text-text-secondary cursor-pointer select-none font-bold">
                          <input type="checkbox" checked={cPercent} onChange={(e) => setCPercent(e.target.checked)} className="w-4 h-4 rounded border-divider text-primary focus:ring-primary mr-2" />
                          <span>Percentage Discount (instead of flat ₹ amount)</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer">Save Coupon</button>
                      <button type="button" onClick={() => setShowCouponForm(false)} className="bg-background text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-full text-xs hover:bg-surface hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto border border-divider rounded-xl">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Code</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Discount</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Description</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Min Order</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => (
                        <tr key={coupon.code} className="hover:bg-background/30 transition-colors">
                          <td className="p-3.5 border-b border-divider text-text-secondary"><strong>{coupon.code}</strong></td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{coupon.discount}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{coupon.description}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">₹{coupon.minOrder}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary text-right">
                            <button onClick={() => deleteCoupon(coupon.code)} className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors" title="Delete coupon">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BLOGS */}
            {activeTab === 'blogs' && (
              <div className="flex flex-col gap-6">
                {!showBlogForm ? (
                  <button onClick={() => setShowBlogForm(true)} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer flex items-center gap-2 self-start">
                    <Plus size={16} />
                    <span>Publish Health Article</span>
                  </button>
                ) : (
                  <form onSubmit={handleBlogSubmit} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
                    <h3 className="font-bold text-sm text-text-primary border-b border-divider pb-2 mb-2">Create Article</h3>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Article Title</label>
                      <input type="text" placeholder="e.g. Why Raw Honey Improves Digestion" value={bTitle} onChange={(e) => setBTitle(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Excerpt / Subtitle Summary</label>
                      <input type="text" placeholder="e.g. Raw wildflower honey contains enzymes and minerals..." value={bExcerpt} onChange={(e) => setBExcerpt(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Author Name</label>
                        <input type="text" placeholder="e.g. Chef Sarah" value={bAuthorName} onChange={(e) => setBAuthorName(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Author Bio Title</label>
                        <input type="text" placeholder="e.g. Nutritionist" value={bAuthorRole} onChange={(e) => setBAuthorRole(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Category</label>
                        <select value={bCategory} onChange={(e) => setBCategory(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary">
                          <option value="Nutrition">Nutrition</option>
                          <option value="Recipes">Recipes</option>
                          <option value="Sustainability">Sustainability</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Cover Image URL</label>
                        <input type="text" value={bImg} onChange={(e) => setBImg(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-text-primary">Article Body Content</label>
                      <textarea placeholder="Write full article body text..." rows={6} value={bContent} onChange={(e) => setBContent(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer">Publish Article</button>
                      <button type="button" onClick={() => setShowBlogForm(false)} className="bg-background text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-full text-xs hover:bg-surface hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto border border-divider rounded-xl">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Cover</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Title</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Category</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Author</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Date</th>
                        <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blogs.map((post) => (
                        <tr key={post.id} className="hover:bg-background/30 transition-colors">
                          <td className="p-3.5 border-b border-divider text-text-secondary"><img src={post.coverImage} alt={post.title} className="w-10 h-10 object-contain rounded bg-background border border-divider" /></td>
                          <td className="p-3.5 border-b border-divider text-text-secondary"><strong>{post.title}</strong></td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{post.category}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{post.author.name}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary">{post.date}</td>
                          <td className="p-3.5 border-b border-divider text-text-secondary text-right">
                            <button onClick={() => deleteBlog(post.id)} className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-colors" title="Delete post">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: SPECIAL SUB-CATEGORY GROUPS (MOBILE GRID V3) */}
            {activeTab === 'special_groups' && (
              <div className="flex flex-col gap-6">
                {!showSpecialGroupForm ? (
                  <button
                    onClick={() => {
                      setEditingGroupId(null);
                      setSgTitle('');
                      setSgItems([]);
                      setShowSpecialGroupForm(true);
                    }}
                    className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer flex items-center gap-2 self-start shadow-md"
                  >
                    <Plus size={16} />
                    <span>Create Special Group (e.g. Grocery & Kitchen)</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveSpecialGroup} className="bg-background p-6 rounded-2xl border border-divider flex flex-col gap-5">
                    <h3 className="font-extrabold text-sm text-text-primary border-b border-divider pb-2 flex justify-between items-center">
                      <span>{editingGroupId ? 'Edit Special Subcategory Group' : 'Create Special Subcategory Group'}</span>
                      <span className="text-[11px] font-normal text-text-tertiary">Mobile Zepto Category Grid V3</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Group Title / Special Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Grocery & Kitchen, Snacks & Beverages"
                          value={sgTitle}
                          onChange={(e) => setSgTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-semibold"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                          <span>Mobile View Display Position</span>
                          <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            📱 Mobile Only (Hidden on Web)
                          </span>
                        </label>
                        <select
                          value={sgInsertAfterIndex}
                          onChange={(e) => setSgInsertAfterIndex(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-semibold cursor-pointer"
                        >
                          <option value={0}>📍 Top Header Position (Immediately below Hero Banners, before 1st Subcategory row)</option>
                          <option value={1}>📍 Mid-Page Section 1 (Placed after 1st Homepage Subcategory section)</option>
                          <option value={2}>📍 Mid-Page Section 2 (Placed after 2nd Homepage Subcategory section)</option>
                          <option value={3}>📍 Mid-Page Section 3 (Placed after 3rd Homepage Subcategory section)</option>
                          <option value={4}>📍 Mid-Page Section 4 (Placed after 4th Homepage Subcategory section)</option>
                          <option value={5}>📍 Mid-Page Section 5 (Placed after 5th Homepage Subcategory section)</option>
                          <option value={99}>📍 Bottom Footer Position (Placed below all Homepage sections & products)</option>
                        </select>
                      </div>
                    </div>

                    {/* Subcategory Item Builder */}
                    <div className="p-4 rounded-xl border border-divider bg-surface flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center justify-between">
                        <span>{editingItemIdx !== null ? `Editing Subcategory Card (#${editingItemIdx + 1})` : 'Add Subcategory Card to Group'}</span>
                        {editingItemIdx !== null && (
                          <span className="text-[11px] text-blue-600 font-extrabold flex items-center gap-1">
                            <Edit2 size={12} /> Editing Mode Active
                          </span>
                        )}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">Subcategory Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Fruits & Vegetables"
                            list="subcat-options"
                            value={itemSubName}
                            onChange={(e) => setItemSubName(e.target.value)}
                            className="w-full px-3 py-2 border border-divider rounded-lg text-xs bg-background text-text-primary"
                          />
                          <datalist id="subcat-options">
                            {allSubCategories.map((s, idx) => (
                              <option key={idx} value={s.name}>{s.catName} &gt; {s.name}</option>
                            ))}
                          </datalist>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-text-secondary flex items-center justify-between">
                            <span>Upload Subcategory Image (Cloudinary)</span>
                            {isUploadingCloudinary && (
                              <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 animate-pulse">
                                <span>☁️</span> Uploading to Cloudinary...
                              </span>
                            )}
                          </label>

                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl cursor-pointer transition-all group">
                              <Upload size={16} className="text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                              <span className="text-xs font-bold text-emerald-700 truncate">
                                {isUploadingCloudinary ? 'Uploading image...' : itemImg ? 'Change Image File' : 'Upload Card Image to Cloudinary'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCardImageUpload}
                                className="hidden"
                              />
                            </label>

                            {itemImg && (
                              <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-divider flex-shrink-0 bg-surface shadow-xs group">
                                <img src={itemImg} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setItemImg('')}
                                  className="absolute inset-0 bg-black/70 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Or paste image URL (Cloudinary / CDN)..."
                            value={itemImg}
                            onChange={(e) => setItemImg(e.target.value)}
                            className="w-full px-3 py-1.5 border border-divider rounded-lg text-[11px] bg-background text-text-secondary placeholder:text-text-tertiary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-text-primary">
                          <input
                            type="checkbox"
                            checked={itemFeatured}
                            onChange={(e) => setItemFeatured(e.target.checked)}
                            className="rounded border-divider text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>Featured Card (2-Columns Wide Card layout: aspect-ratio 1.46 / 1)</span>
                        </label>

                        <div className="flex items-center gap-2">
                          {editingItemIdx !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemIdx(null);
                                setItemSubName('');
                                setItemImg('');
                                setItemFeatured(false);
                              }}
                              className="bg-surface text-text-secondary border border-divider font-bold py-1.5 px-3 rounded-lg text-xs hover:bg-background transition-colors cursor-pointer"
                            >
                              Cancel Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleAddItemToGroup}
                            className={`${editingItemIdx !== null ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5`}
                          >
                            {editingItemIdx !== null ? (
                              <>
                                <Edit2 size={13} />
                                <span>Update Card in Group</span>
                              </>
                            ) : (
                              <span>+ Add Card to Group</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview list of items in this group */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                        <span>Selected Group Subcategories ({sgItems.length})</span>
                        <span className="text-[11px] font-normal text-text-tertiary">Click blue edit icon on any card to edit its image or details</span>
                      </label>
                      <div className="flex cursor-pointer flex-row flex-wrap items-center justify-start gap-y-3 gap-x-2 p-3 bg-surface rounded-2xl border border-divider">
                        {sgItems.length === 0 ? (
                          <div className="w-full text-center text-xs text-text-tertiary p-4">No subcategories added to group yet. Select a subcategory above and click "+ Add Card to Group".</div>
                        ) : (
                          sgItems.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className={`relative group ${item.isFeatured || idx === 0 ? 'w-[calc(50%-0.25rem)] rounded-lg' : 'box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1'} border ${editingItemIdx === idx ? 'border-blue-500 ring-2 ring-blue-500/50 scale-[1.02]' : 'border-divider'} bg-background transition-all`}
                              style={{ aspectRatio: item.isFeatured || idx === 0 ? '1.46 / 1' : '0.67568 / 1' }}
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-contain rounded-lg"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png'; }}
                              />
                              <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                                <button
                                  type="button"
                                  onClick={() => handleEditItemInGroup(idx)}
                                  className="p-1.5 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 hover:scale-110 transition-all active:scale-95 cursor-pointer"
                                  title="Edit Card Image & Details"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromGroup(idx)}
                                  className="p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 hover:scale-110 transition-all active:scale-95 cursor-pointer"
                                  title="Remove Item"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold p-1 text-center truncate rounded-b-lg">
                                {item.name} {item.isFeatured || idx === 0 ? '(Featured 2-Col)' : ''}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-3 border-t border-divider">
                      <button
                        type="button"
                        onClick={() => setShowSpecialGroupForm(false)}
                        className="px-5 py-2.5 rounded-xl border border-divider text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-primary text-white font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md"
                      >
                        Save Special Group
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Special Groups */}
                <div className="flex flex-col gap-4">
                  {(specialCategoryGroups || []).map((group) => (
                    <div key={group.id} className="p-4 rounded-2xl border border-divider bg-background/50 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-base text-text-primary">{group.title}</h4>
                          <span className="text-[11px] text-text-secondary font-bold uppercase">{group.items?.length || 0} Subcategory Cards</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditGroup(group)}
                            className="px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-bold text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 size={13} />
                            <span>Edit Group</span>
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete special group "${group.title}"?`)) {
                                deleteSpecialGroup(group.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-bold text-text-secondary hover:text-error hover:bg-error/10 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Zepto Mobile Grid V3 Live Preview */}
                      <div className="flex cursor-pointer flex-row flex-wrap items-center justify-start gap-y-3 gap-x-2 p-4 bg-surface rounded-xl border border-divider">
                        {(group.items || []).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className={item.isFeatured || idx === 0
                              ? 'w-[calc(50%-0.25rem)] rounded-lg lg:mr-1 lg:w-[calc(24%-0.5rem)] lg:first:ml-[0.3rem]'
                              : 'box-border flex w-[calc(25%-0.4rem)] flex-col items-center justify-between overflow-hidden rounded-lg p-1 lg:w-[calc(12.3%-0.4rem)]'
                            }
                            style={{ aspectRatio: item.isFeatured || idx === 0 ? '1.46 / 1' : '0.67568 / 1' }}
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-contain rounded-lg"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.zeptonow.com/production/tr:w-210,ar-225-333,pr-true,f-auto,q-40/cms/category/474e6e58-1894-4378-86f1-168cc7266d1a.png'; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SEO METADATA */}

            {activeTab === 'seo' && (
              <form onSubmit={handleSeoUpdate} className="bg-background p-6 rounded-xl border border-divider flex flex-col gap-4">
                <h3 className="font-bold text-sm text-text-primary border-b border-divider pb-2 mb-2">Global SEO Head Engine</h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-primary">Select Target Page to Configure</label>
                  <select
                    value={selectedSeoPage}
                    onChange={(e) => handleSeoSelectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="home">Home Page (/)</option>
                    <option value="about">About Page (/about)</option>
                    <option value="products">Shop Page (/products)</option>
                    <option value="offers">Offers Page (/offers)</option>
                    <option value="blog">Blog Directory (/blog)</option>
                    <option value="help">Help Center (/help)</option>
                    <option value="careers">Careers Board (/careers)</option>
                    <option value="locations">Delivery coverage (/locations)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-primary">Page Title Tag (&lt;title&gt;)</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-primary">Meta Description Tag</label>
                  <textarea
                    rows={3}
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-primary">Meta Keywords Tag (Comma separated)</label>
                  <input
                    type="text"
                    value={seoKeys}
                    onChange={(e) => setSeoKeys(e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>

                <button type="submit" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer w-fit mt-2">
                  Save SEO Config
                </button>
              </form>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};
