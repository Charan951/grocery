import React, { useState } from 'react';
import { useCMS, Product, Coupon, Blog, Banner, PromoCard, FestivalCampaign } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { Trash2, Plus, Edit2, CheckSquare, Square, Image, LayoutGrid, Upload, X, ArrowUp, ArrowDown, Smartphone, Sparkles, Layers } from 'lucide-react';
import { FESTIVAL_ASSET_LIBRARY } from '../components/festival/FestivalAssetLibrary';
import { FestivalCampaignWrapper } from '../components/FestivalCampaignWrapper';

export const AdminCMS: React.FC = () => {
  const {
    banners, promoCards, festivalCampaigns, activeFestivalCampaign, categories, specialCategoryGroups, products, coupons, blogs, seoSettings,
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

  const [activeTab, setActiveTab] = useState<'festival_campaigns' | 'banners' | 'promo_cards' | 'home_subcats' | 'special_groups' | 'products' | 'coupons' | 'blogs' | 'seo'>('festival_campaigns');

  // Festival Campaign Form States
  const [showFestivalForm, setShowFestivalForm] = useState(false);
  const [editingFestivalId, setEditingFestivalId] = useState<string | null>(null);
  const [fcName, setFcName] = useState('');
  const [fcTitle, setFcTitle] = useState('');
  const [fcSubtitle, setFcSubtitle] = useState('');
  const [fcType, setFcType] = useState<'Festival' | 'Seasonal' | 'Special Event'>('Festival');
  const [fcBgImageUrl, setFcBgImageUrl] = useState('');
  const [isUploadingFcBg, setIsUploadingFcBg] = useState(false);
  const [fcVideoUrl, setFcVideoUrl] = useState('');
  const [fcPosterUrl, setFcPosterUrl] = useState('');
  const [fcHeading, setFcHeading] = useState('');
  const [fcContentSubtitle, setFcContentSubtitle] = useState('');
  const [fcCtaText, setFcCtaText] = useState('');
  const [fcCtaLink, setFcCtaLink] = useState('');
  const [fcTextColor, setFcTextColor] = useState('#FFFFFF');
  const [fcAccentColor, setFcAccentColor] = useState('#F6C453');
  const [fcCardBackground, setFcCardBackground] = useState('#FEEAA7');
  const [fcCardTextColor, setFcCardTextColor] = useState('#4A001F');
  const [fcFeaturedBannerTitle, setFcFeaturedBannerTitle] = useState('EXPLORE ALL SPECIALS');
  const [fcAnimEnabled, setFcAnimEnabled] = useState(true);
  const [fcAnimType, setFcAnimType] = useState<'auto' | 'floral' | 'diya' | 'leaves' | 'particles'>('auto');
  const [fcBottomDecoration, setFcBottomDecoration] = useState<'scallop' | 'floral' | 'wave' | 'cutwork' | 'traditional' | 'none'>('scallop');
  // Layered Theme Engine State
  const [fcBackgroundType, setFcBackgroundType] = useState<'solid' | 'gradient' | 'image'>('solid');
  const [fcBackgroundColor, setFcBackgroundColor] = useState('#DFF4E8');
  const [fcGradientStart, setFcGradientStart] = useState('#E8F6EF');
  const [fcGradientEnd, setFcGradientEnd] = useState('#C2E8D3');
  const [fcGradientDirection, setFcGradientDirection] = useState('to bottom');
  const [fcBackgroundPattern, setFcBackgroundPattern] = useState<'none' | 'floral' | 'mandala' | 'paisley' | 'traditional' | 'dots' | 'festival'>('floral');
  const [fcPatternOpacity, setFcPatternOpacity] = useState(0.12);
  const [fcPatternScale, setFcPatternScale] = useState<'small' | 'medium' | 'large'>('medium');

  // Dynamic Asset Elements state array
  const [fcDecorativeElements, setFcDecorativeElements] = useState<any[]>([]);

  // Individual element input state inside form
  const [elAsset, setElAsset] = useState('krishna');
  const [elPosX, setElPosX] = useState(50);
  const [elPosY, setElPosY] = useState(15);
  const [elAlign, setElAlign] = useState<'left' | 'center' | 'right'>('center');
  const [elSize, setElSize] = useState(40);
  const [elOpacity, setElOpacity] = useState(100);
  const [elAnim, setElAnim] = useState<'none' | 'horizontal-move' | 'gentle-sway' | 'glow-flicker' | 'float-vertical' | 'pulse'>('none');
  const [elSpeed, setElSpeed] = useState<'slow' | 'medium' | 'fast'>('slow');

  // Title Config
  const [fcTitleText, setFcTitleText] = useState('');
  const [fcTitleSubtitle, setFcTitleSubtitle] = useState('');
  const [fcTitlePosition, setFcTitlePosition] = useState<'center' | 'left' | 'right'>('center');
  const [fcTitleColor, setFcTitleColor] = useState('#1B4D3E');
  const [fcTitleFontStyle, setFcTitleFontStyle] = useState<'festive' | 'modern'>('festive');

  const [fcOverlayOpacity, setFcOverlayOpacity] = useState(0.05);
  const [fcBackgroundPosition, setFcBackgroundPosition] = useState('center top');
  const [fcBackgroundSize, setFcBackgroundSize] = useState('cover');
  const [fcCardBorderRadius, setFcCardBorderRadius] = useState('18px');
  const [fcCardSpacing, setFcCardSpacing] = useState('8px');
  const [fcStartDate, setFcStartDate] = useState('');
  const [fcEndDate, setFcEndDate] = useState('');
  const [fcPriority, setFcPriority] = useState(10);
  const [fcIsActive, setFcIsActive] = useState(true);

  // Festival subcategory card item input state inside form
  const [fcSubcategories, setFcSubcategories] = useState<any[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [selectedSubcatId, setSelectedSubcatId] = useState('');
  const [subcardTitle, setSubcardTitle] = useState('');
  const [subcardImageUrl, setSubcardImageUrl] = useState('');
  const [subcardBadge, setSubcardBadge] = useState('');
  const [subcardIsFeatured, setSubcardIsFeatured] = useState(false);
  const [isUploadingSubImg, setIsUploadingSubImg] = useState(false);

  const resetFestivalForm = () => {
    setEditingFestivalId(null);
    setFcName('');
    setFcTitle('');
    setFcSubtitle('');
    setFcType('Festival');
    setFcBackgroundType('solid');
    setFcBackgroundColor('#DFF4E8');
    setFcGradientStart('#E8F6EF');
    setFcGradientEnd('#C2E8D3');
    setFcGradientDirection('to bottom');
    setFcBackgroundPattern('floral');
    setFcPatternOpacity(0.12);
    setFcPatternScale('medium');
    setFcDecorativeElements([]);
    setFcTitleText('');
    setFcTitleSubtitle('');
    setFcTitlePosition('center');
    setFcTitleColor('#1B4D3E');
    setFcTitleFontStyle('festive');
    setFcBgImageUrl('');
    setFcVideoUrl('');
    setFcPosterUrl('');
    setFcHeading('');
    setFcContentSubtitle('');
    setFcCtaText('');
    setFcCtaLink('');
    setFcTextColor('#1B4D3E');
    setFcAccentColor('#2E7D32');
    setFcCardBackground('#FFF9E6');
    setFcCardTextColor('#1B4D3E');
    setFcFeaturedBannerTitle('EXPLORE ALL SPECIALS');
    setFcAnimEnabled(true);
    setFcAnimType('auto');
    setFcBottomDecoration('scallop');
    setFcOverlayOpacity(0.05);
    setFcBackgroundPosition('center top');
    setFcBackgroundSize('cover');
    setFcCardBorderRadius('18px');
    setFcCardSpacing('8px');
    setFcStartDate(new Date().toISOString().split('T')[0]);
    setFcEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFcPriority(10);
    setFcIsActive(true);
    setFcSubcategories([]);
    setSelectedSubcatId('');
    setSubcardTitle('');
    setSubcardImageUrl('');
    setSubcardBadge('');
    setSubcardIsFeatured(false);
    setShowFestivalForm(false);
  };

  const handleEditFestival = (campaign: any) => {
    setEditingFestivalId(campaign.id || campaign._id);
    setFcName(campaign.name || '');
    setFcTitle(campaign.title || '');
    setFcSubtitle(campaign.subtitle || '');
    setFcType(campaign.type || 'Festival');
    setFcBackgroundType(campaign.backgroundType || 'solid');
    setFcBackgroundColor(campaign.backgroundColor || '#DFF4E8');
    setFcGradientStart(campaign.gradientStart || '#E8F6EF');
    setFcGradientEnd(campaign.gradientEnd || '#C2E8D3');
    setFcGradientDirection(campaign.gradientDirection || 'to bottom');
    setFcBackgroundPattern(campaign.backgroundPattern || 'floral');
    setFcPatternOpacity(campaign.patternOpacity ?? 0.12);
    setFcPatternScale(campaign.patternScale || 'medium');
    setFcDecorativeElements(campaign.decorativeElements || []);
    setFcTitleText(campaign.titleConfig?.title || campaign.title || '');
    setFcTitleSubtitle(campaign.titleConfig?.subtitle || campaign.subtitle || '');
    setFcTitlePosition(campaign.titleConfig?.position || 'center');
    setFcTitleColor(campaign.titleConfig?.textColor || campaign.theme?.textColor || '#1B4D3E');
    setFcTitleFontStyle(campaign.titleConfig?.fontStyle || 'festive');
    setFcBgImageUrl(campaign.backgroundImage?.url || '');
    setFcVideoUrl(campaign.video?.url || '');
    setFcPosterUrl(campaign.video?.posterUrl || '');
    setFcHeading(campaign.content?.heading || '');
    setFcContentSubtitle(campaign.content?.subtitle || '');
    setFcCtaText(campaign.content?.ctaText || '');
    setFcCtaLink(campaign.content?.ctaLink || '');
    setFcTextColor(campaign.theme?.textColor || '#1B4D3E');
    setFcAccentColor(campaign.theme?.accentColor || '#2E7D32');
    setFcCardBackground(campaign.theme?.cardBackground || '#FFF9E6');
    setFcCardTextColor(campaign.theme?.cardTextColor || '#1B4D3E');
    setFcFeaturedBannerTitle(campaign.featuredBannerTitle || 'EXPLORE ALL SPECIALS');
    setFcAnimEnabled(campaign.animationConfig?.enabled !== false);
    setFcAnimType(campaign.animationConfig?.type || 'auto');
    setFcBottomDecoration(campaign.bottomDecoration || 'scallop');
    setFcOverlayOpacity(campaign.theme?.overlayOpacity ?? 0.05);
    setFcBackgroundPosition(campaign.theme?.backgroundPosition || 'center top');
    setFcBackgroundSize(campaign.theme?.backgroundSize || 'cover');
    setFcCardBorderRadius(campaign.theme?.cardBorderRadius || '18px');
    setFcCardSpacing(campaign.theme?.cardSpacing || '8px');
    setFcStartDate(campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '');
    setFcEndDate(campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '');
    setFcPriority(campaign.priority || 10);
    setFcIsActive(campaign.isActive !== false);
    setFcSubcategories(campaign.specialSubcategories || []);
    setShowFestivalForm(true);
  };

  const handleAddDecorativeElement = () => {
    const newEl = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      asset: elAsset,
      type: 'festive',
      position: { x: elPosX, y: elPosY, align: elAlign },
      size: elSize,
      opacity: elOpacity,
      animation: elAnim,
      speed: elSpeed
    };
    setFcDecorativeElements([...fcDecorativeElements, newEl]);
  };

  const handleRemoveDecorativeElement = (idx: number) => {
    setFcDecorativeElements(fcDecorativeElements.filter((_, i) => i !== idx));
  };

  const handleAddSubcardToCampaign = () => {
    if (!subcardTitle.trim()) {
      alert('Please enter card title');
      return;
    }
    const newCard = {
      subcategoryId: selectedSubcatId || subcardTitle.trim(),
      title: subcardTitle.trim(),
      image: { url: subcardImageUrl.trim() },
      badge: subcardBadge.trim(),
      isFeatured: subcardIsFeatured,
      order: fcSubcategories.length + 1
    };
    setFcSubcategories([...fcSubcategories, newCard]);
    setSelectedSubcatId('');
    setSubcardTitle('');
    setSubcardImageUrl('');
    setSubcardBadge('');
    setSubcardIsFeatured(false);
  };

  const handleRemoveSubcard = (idx: number) => {
    setFcSubcategories(fcSubcategories.filter((_, i) => i !== idx));
  };

  const handleMoveSubcard = (idx: number, direction: 'up' | 'down') => {
    const list = [...fcSubcategories];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setFcSubcategories(list);
  };

  const handleFestivalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fcName.trim() || !fcTitle.trim()) {
      alert('Please provide campaign name and title');
      return;
    }
    if (!fcBgImageUrl.trim()) {
      alert('Please upload or provide a continuous background image URL');
      return;
    }

    const payload = {
      name: fcName.trim(),
      title: fcTitle.trim(),
      subtitle: fcSubtitle.trim(),
      type: fcType,
      backgroundType: fcBackgroundType,
      backgroundColor: fcBackgroundColor,
      gradientStart: fcGradientStart,
      gradientEnd: fcGradientEnd,
      gradientDirection: fcGradientDirection,
      backgroundImage: { url: fcBgImageUrl.trim() },
      backgroundPattern: fcBackgroundPattern,
      patternOpacity: Number(fcPatternOpacity),
      patternScale: fcPatternScale,
      decorativeElements: fcDecorativeElements,
      titleConfig: {
        title: fcTitleText.trim() || fcTitle.trim(),
        subtitle: fcTitleSubtitle.trim() || fcSubtitle.trim(),
        position: fcTitlePosition,
        textColor: fcTitleColor,
        fontStyle: fcTitleFontStyle
      },
      video: { url: fcVideoUrl.trim(), posterUrl: fcPosterUrl.trim() },
      featuredBannerTitle: fcFeaturedBannerTitle.trim() || 'EXPLORE ALL SPECIALS',
      animationConfig: {
        enabled: fcAnimEnabled,
        type: fcAnimType,
        intensity: 'subtle'
      },
      bottomDecoration: fcBottomDecoration,
      theme: {
        textColor: fcTextColor,
        accentColor: fcAccentColor,
        cardBackground: fcCardBackground,
        cardTextColor: fcCardTextColor,
        overlayOpacity: Number(fcOverlayOpacity),
        backgroundPosition: fcBackgroundPosition,
        backgroundSize: fcBackgroundSize,
        cardBorderRadius: fcCardBorderRadius,
        cardSpacing: fcCardSpacing
      },
      content: {
        heading: fcHeading.trim() || fcTitle.trim(),
        subtitle: fcContentSubtitle.trim() || fcSubtitle.trim(),
        ctaText: fcCtaText.trim(),
        ctaLink: fcCtaLink.trim()
      },
      specialSubcategories: fcSubcategories,
      startDate: fcStartDate ? new Date(fcStartDate).toISOString() : new Date().toISOString(),
      endDate: fcEndDate ? new Date(fcEndDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: Number(fcPriority) || 1,
      isActive: fcIsActive
    };

    if (editingFestivalId) {
      await updateFestivalCampaign(editingFestivalId, payload);
    } else {
      await addFestivalCampaign(payload);
    }
    resetFestivalForm();
  };

  const handleFcBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFcBg(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/festival-bg');
          setFcBgImageUrl(cUrl);
        } catch (err) {
          setFcBgImageUrl(base64);
        } finally {
          setIsUploadingFcBg(false);
        }
      };
    } catch (err) {
      setIsUploadingFcBg(false);
    }
  };

  const handleSubcardImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSubImg(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const cUrl = await uploadImage(base64, 'freshcart/festival-cards');
          setSubcardImageUrl(cUrl);
        } catch (err) {
          setSubcardImageUrl(base64);
        } finally {
          setIsUploadingSubImg(false);
        }
      };
    } catch (err) {
      setIsUploadingSubImg(false);
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
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
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
    setEditingGroupId(g.id);
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

    if (editingGroupId) {
      const payload = {
        id: editingGroupId,
        title: sgTitle.trim() || 'Special Group',
        slug: (sgTitle.trim() || 'Special Group').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        displayOrder: specialCategoryGroups.length + 1,
        insertAfterSubCategoryIndex: Number(sgInsertAfterIndex),
        active: true,
        items: nextItems
      };
      updateSpecialGroup(editingGroupId, payload);
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
      id: editingGroupId || 'sg_' + Date.now(),
      title: sgTitle.trim(),
      slug: sgTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      displayOrder: specialCategoryGroups.length + 1,
      insertAfterSubCategoryIndex: Number(sgInsertAfterIndex),
      active: true,
      items: sgItems
    };

    if (editingGroupId) {
      updateSpecialGroup(editingGroupId, payload);
      alert('Special group updated successfully!');
    } else {
      addSpecialGroup(payload);
      alert('Special group created successfully!');
    }

    setShowSpecialGroupForm(false);
    setEditingGroupId(null);
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
                {activeTab === 'festival_campaigns' && '🎉 Festival Campaigns (Blinkit Festival Concept)'}
                {activeTab === 'promo_cards' && 'Promotional Cards Management'}
                {activeTab === 'home_subcats' && 'Home Page Sub-Categories Selection'}
                {activeTab === 'special_groups' && 'Special Subcategory Groups (Zepto Mobile Grid V3)'}
                {activeTab === 'banners' && 'Dynamic Inter-Section Banners (CRUD)'}
              </h2>
            </div>

            {/* TAB: FESTIVAL CAMPAIGNS */}
            {activeTab === 'festival_campaigns' && (
              <div className="flex flex-col gap-6">
                {!showFestivalForm ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-text-secondary">
                        Manage themed continuous festival sections for mobile (e.g. Varalakshmi Vratham, Diwali, Raksha Bandhan).
                      </p>
                      <button
                        onClick={() => {
                          resetFestivalForm();
                          setShowFestivalForm(true);
                        }}
                        className="bg-primary text-white font-bold py-2.5 px-5 rounded-xl text-xs hover:bg-secondary transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>Create Festival Campaign</span>
                      </button>
                    </div>

                    {/* Campaigns List */}
                    {festivalCampaigns.length === 0 ? (
                      <div className="p-8 border border-dashed border-divider rounded-2xl text-center text-text-secondary text-sm">
                        No festival campaigns created yet. Click "Create Festival Campaign" to set up your first themed festival experience.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {festivalCampaigns.map((camp: any) => {
                          const id = camp.id || camp._id;
                          const isActive = camp.isActive !== false;
                          const bgUrl = camp.backgroundImage?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop';
                          const subCount = camp.specialSubcategories?.length || 0;

                          return (
                            <div
                              key={id}
                              className={`relative overflow-hidden border rounded-2xl p-4 transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${isActive ? 'border-primary/40 bg-primary/5 shadow-xs' : 'border-divider bg-background/50 opacity-75'
                                }`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-white/20 relative bg-black/20">
                                  <img src={bgUrl} alt={camp.name} className="w-full h-full object-cover" />
                                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white uppercase">
                                    {camp.type || 'Festival'}
                                  </div>
                                </div>

                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-base text-text-primary truncate">{camp.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isActive ? 'bg-success/20 text-success' : 'bg-divider text-text-secondary'
                                      }`}>
                                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
                                      Priority: {camp.priority || 1}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-text-secondary truncate mt-0.5">{camp.title}</p>
                                  <div className="flex items-center gap-3 text-[11px] text-text-tertiary mt-1">
                                    <span>Subcategories: <strong>{subCount} cards</strong></span>
                                    <span>•</span>
                                    <span>Starts: {camp.startDate ? new Date(camp.startDate).toLocaleDateString() : 'N/A'}</span>
                                    <span>•</span>
                                    <span>Ends: {camp.endDate ? new Date(camp.endDate).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button
                                  onClick={() => toggleFestivalCampaignStatus(id, !isActive)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isActive ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-success/10 text-success hover:bg-success/20'
                                    }`}
                                >
                                  {isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleEditFestival(camp)}
                                  className="p-2 rounded-lg border border-divider hover:bg-background text-text-primary transition-colors cursor-pointer"
                                  title="Edit Campaign"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete festival campaign "${camp.name}"?`)) {
                                      deleteFestivalCampaign(id);
                                    }
                                  }}
                                  className="p-2 rounded-lg border border-error/20 bg-error/5 text-error hover:bg-error/10 transition-colors cursor-pointer"
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
                  /* Split-Screen Festival Theme Builder Modal with LIVE MOBILE PREVIEW */
                  (() => {
                    const draftCampaign: FestivalCampaign = {
                      name: fcName || 'Festival Campaign',
                      title: fcTitleText || fcTitle || 'Krishna Janmashtami',
                      subtitle: fcTitleSubtitle || fcSubtitle || 'Celebrate the divine spirit',
                      backgroundType: fcBackgroundType,
                      backgroundColor: fcBackgroundColor,
                      gradientStart: fcGradientStart,
                      gradientEnd: fcGradientEnd,
                      gradientDirection: fcGradientDirection,
                      backgroundImage: { url: fcBgImageUrl },
                      backgroundPattern: fcBackgroundPattern,
                      patternOpacity: fcPatternOpacity,
                      patternScale: fcPatternScale,
                      decorativeElements: fcDecorativeElements,
                      titleConfig: {
                        title: fcTitleText || fcTitle,
                        subtitle: fcTitleSubtitle || fcSubtitle,
                        position: fcTitlePosition,
                        textColor: fcTitleColor,
                        fontStyle: fcTitleFontStyle
                      },
                      featuredBannerTitle: fcFeaturedBannerTitle,
                      bottomDecoration: fcBottomDecoration,
                      theme: {
                        textColor: fcTitleColor || fcTextColor,
                        accentColor: fcAccentColor,
                        cardBackground: fcCardBackground,
                        cardTextColor: fcCardTextColor,
                        overlayOpacity: fcOverlayOpacity
                      },
                      specialSubcategories: fcSubcategories,
                      isActive: true,
                      priority: fcPriority,
                      startDate: fcStartDate,
                      endDate: fcEndDate
                    };

                    return (
                      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
                        {/* LEFT COLUMN: Form Controls */}
                        <form onSubmit={handleFestivalSubmit} className="flex-1 flex flex-col gap-6 bg-background p-5 md:p-6 rounded-2xl border border-divider w-full">
                          <div className="flex items-center justify-between border-b border-divider pb-3">
                            <div>
                              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                                <Sparkles className="text-amber-500" size={20} />
                                <span>{editingFestivalId ? 'Edit Festival Campaign' : 'Create Festival Campaign'}</span>
                              </h3>
                              <p className="text-xs text-text-secondary">Configure continuous background layers, pattern design, dynamic elements & cards.</p>
                            </div>
                            <button
                              type="button"
                              onClick={resetFestivalForm}
                              className="p-1.5 rounded-full text-text-secondary hover:bg-surface transition-colors cursor-pointer"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          {/* 1. Basic Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-text-primary mb-1">Festival Name (Internal)</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Krishna Janmashtami"
                                value={fcName}
                                onChange={(e) => setFcName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-text-primary mb-1">Customer Heading Title</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Krishna Janmashtami"
                                value={fcTitle}
                                onChange={(e) => {
                                  setFcTitle(e.target.value);
                                  if (!fcTitleText) setFcTitleText(e.target.value);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-text-primary mb-1">Campaign Subtitle / Promo Tagline</label>
                              <input
                                type="text"
                                placeholder="e.g. Celebrate the divine spirit"
                                value={fcSubtitle}
                                onChange={(e) => {
                                  setFcSubtitle(e.target.value);
                                  if (!fcTitleSubtitle) setFcTitleSubtitle(e.target.value);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-divider outline-none focus:border-primary"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-text-primary mb-1">Campaign Type</label>
                              <select
                                value={fcType}
                                onChange={(e) => setFcType(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-divider outline-none"
                              >
                                <option value="Festival">Festival (e.g. Varalakshmi, Janmashtami, Diwali)</option>
                                <option value="Seasonal">Seasonal (e.g. Summer Mangoes, Winter)</option>
                                <option value="Special Event">Special Event (e.g. Weekend Flash Sale)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-text-primary mb-1">Priority</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={fcPriority}
                                onChange={(e) => setFcPriority(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-divider outline-none"
                              />
                            </div>
                          </div>

                          {/* 2. Background Layer Controls */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                              <Layers size={14} />
                              <span>2. Background Layer</span>
                            </h4>

                            <div className="flex items-center gap-4">
                              <label className="text-xs font-bold text-text-primary">Background Type:</label>
                              <div className="flex items-center gap-3">
                                {['solid', 'gradient', 'image'].map((type) => (
                                  <label key={type} className="flex items-center gap-1 text-xs capitalize cursor-pointer">
                                    <input
                                      type="radio"
                                      name="bgType"
                                      value={type}
                                      checked={fcBackgroundType === type}
                                      onChange={() => setFcBackgroundType(type as any)}
                                      className="text-primary"
                                    />
                                    <span>{type}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {fcBackgroundType === 'solid' && (
                              <div className="flex items-center gap-3 mt-1">
                                <label className="text-xs font-bold text-text-primary shrink-0">Background Color:</label>
                                <input
                                  type="color"
                                  value={fcBackgroundColor}
                                  onChange={(e) => setFcBackgroundColor(e.target.value)}
                                  className="w-8 h-8 rounded border border-divider cursor-pointer shrink-0"
                                />
                                <input
                                  type="text"
                                  value={fcBackgroundColor}
                                  onChange={(e) => setFcBackgroundColor(e.target.value)}
                                  className="w-28 px-2 py-1 text-xs rounded bg-surface border border-divider"
                                />
                                <div className="flex gap-1">
                                  {['#DFF4E8', '#FEF3C7', '#FCE7F3', '#800040', '#1B4D3E'].map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setFcBackgroundColor(c)}
                                      className="w-5 h-5 rounded-full border border-divider"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {fcBackgroundType === 'gradient' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
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

                            {fcBackgroundType === 'image' && (
                              <div className="flex gap-2 mt-1">
                                <input
                                  type="text"
                                  placeholder="https://images.unsplash.com/..."
                                  value={fcBgImageUrl}
                                  onChange={(e) => setFcBgImageUrl(e.target.value)}
                                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-surface border border-divider outline-none"
                                />
                                <label className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer shrink-0">
                                  <span>{isUploadingFcBg ? 'Uploading...' : 'Upload'}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleFcBgUpload} />
                                </label>
                              </div>
                            )}
                          </div>

                          {/* 3. Background Design / Pattern */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-wider">3. Background Design / Pattern</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Pattern Overlay</label>
                                <select
                                  value={fcBackgroundPattern}
                                  onChange={(e) => setFcBackgroundPattern(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                                >
                                  <option value="none">None</option>
                                  <option value="floral">🌸 Floral</option>
                                  <option value="mandala">☸ Mandala</option>
                                  <option value="paisley">🌿 Paisley</option>
                                  <option value="traditional">❖ Traditional</option>
                                  <option value="dots">░ Dots</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Opacity ({(fcPatternOpacity * 100).toFixed(0)}%)</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="0.4"
                                  step="0.02"
                                  value={fcPatternOpacity}
                                  onChange={(e) => setFcPatternOpacity(Number(e.target.value))}
                                  className="w-full"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Pattern Scale</label>
                                <select
                                  value={fcPatternScale}
                                  onChange={(e) => setFcPatternScale(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                                >
                                  <option value="small">Small</option>
                                  <option value="medium">Medium</option>
                                  <option value="large">Large</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* 4. Decorative Elements Array Builder (+ Add Element) */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-primary tracking-wider">4. Decorative Elements ({fcDecorativeElements.length})</h4>
                              <span className="text-[11px] text-text-tertiary">Each element receives its own animation</span>
                            </div>

                            {/* Add Element Controls Sub-form */}
                            <div className="p-3.5 bg-surface border border-divider rounded-xl flex flex-col gap-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Select Asset</label>
                                  <select
                                    value={elAsset}
                                    onChange={(e) => setElAsset(e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                  >
                                    {Object.values(FESTIVAL_ASSET_LIBRARY).map((asset) => (
                                      <option key={asset.id} value={asset.id}>
                                        {asset.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Animation</label>
                                  <select
                                    value={elAnim}
                                    onChange={(e) => setElAnim(e.target.value as any)}
                                    className="w-full px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                  >
                                    <option value="none">Static (None)</option>
                                    <option value="horizontal-move">Horizontal Move (Cloud)</option>
                                    <option value="gentle-sway">Gentle Sway (Leaf/Feather)</option>
                                    <option value="glow-flicker">Glow / Flicker (Diya)</option>
                                    <option value="float-vertical">Float Vertical</option>
                                    <option value="pulse">Pulse Scale</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Position X ({elPosX}%)</label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={elPosX}
                                    onChange={(e) => setElPosX(Number(e.target.value))}
                                    className="w-full"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Position Y ({elPosY}%)</label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="90"
                                    value={elPosY}
                                    onChange={(e) => setElPosY(Number(e.target.value))}
                                    className="w-full"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Size ({elSize}%)</label>
                                  <input
                                    type="range"
                                    min="10"
                                    max="80"
                                    value={elSize}
                                    onChange={(e) => setElSize(Number(e.target.value))}
                                    className="w-full"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Alignment</label>
                                  <select
                                    value={elAlign}
                                    onChange={(e) => setElAlign(e.target.value as any)}
                                    className="w-full px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                  >
                                    <option value="center">Center</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">Speed</label>
                                  <select
                                    value={elSpeed}
                                    onChange={(e) => setElSpeed(e.target.value as any)}
                                    className="w-full px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                  >
                                    <option value="slow">Slow</option>
                                    <option value="medium">Medium</option>
                                    <option value="fast">Fast</option>
                                  </select>
                                </div>

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleAddDecorativeElement}
                                    className="w-full py-1.5 bg-emerald-600 text-white text-xs font-extrabold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                                  >
                                    + Add Element
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Added Elements Table */}
                            {fcDecorativeElements.length > 0 && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                {fcDecorativeElements.map((el, idx) => {
                                  const assetDef = FESTIVAL_ASSET_LIBRARY[el.asset];
                                  return (
                                    <div key={el.id || idx} className="flex items-center justify-between p-2 bg-surface border border-divider rounded-xl text-xs gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 shrink-0">{assetDef?.svg()}</div>
                                        <span className="font-bold text-text-primary">{assetDef?.name || el.asset}</span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary uppercase font-bold">
                                          {el.animation || 'none'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                                        <span>X: {el.position?.x}%</span>
                                        <span>Y: {el.position?.y}%</span>
                                        <span>Size: {el.size}%</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDecorativeElement(idx)}
                                          className="p-1 text-error hover:bg-error/10 rounded"
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

                          {/* 5. Festival Title & Typography */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-wider">5. Festival Content & Title</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Heading Title</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Krishna Janmashtami"
                                  value={fcTitleText}
                                  onChange={(e) => setFcTitleText(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Text Color</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={fcTitleColor}
                                    onChange={(e) => setFcTitleColor(e.target.value)}
                                    className="w-8 h-8 rounded border border-divider cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={fcTitleColor}
                                    onChange={(e) => setFcTitleColor(e.target.value)}
                                    className="w-full px-2 py-1 text-xs rounded bg-surface border border-divider"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">Font Style</label>
                                <select
                                  value={fcTitleFontStyle}
                                  onChange={(e) => setFcTitleFontStyle(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                                >
                                  <option value="festive">Festive (Classic Serif)</option>
                                  <option value="modern">Modern (Sans-serif)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* 6. Special Subcategories Cards */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-wider">6. Campaign Subcategory Cards ({fcSubcategories.length})</h4>
                            <div className="p-3 bg-surface border border-divider rounded-xl flex flex-col gap-2">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                  value={selectedSubcatId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedSubcatId(val);
                                    const found = allSubCategories.find(s => s.id === val || s.name === val);
                                    if (found) setSubcardTitle(found.name);
                                  }}
                                  className="px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                >
                                  <option value="">-- DB Subcategory --</option>
                                  {allSubCategories.map((sub, i) => (
                                    <option key={`sub_${i}`} value={sub.name}>{sub.catName} → {sub.name}</option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  placeholder="Display Title"
                                  value={subcardTitle}
                                  onChange={(e) => setSubcardTitle(e.target.value)}
                                  className="px-2 py-1.5 text-xs rounded bg-background border border-divider outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={handleAddSubcardToCampaign}
                                  className="py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-secondary cursor-pointer"
                                >
                                  + Add Card
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 7. Bottom Decorative Border */}
                          <div className="border-t border-divider pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-wider">7. Bottom Decorative Border</h4>
                            <select
                              value={fcBottomDecoration}
                              onChange={(e) => setFcBottomDecoration(e.target.value as any)}
                              className="w-full md:w-1/2 px-2.5 py-1.5 text-xs rounded bg-surface border border-divider outline-none"
                            >
                              <option value="scallop">◠ Scallop Arch (Blinkit Style)</option>
                              <option value="floral">✿ Floral Pattern</option>
                              <option value="wave">〰 Gentle Wave</option>
                              <option value="cutwork">❖ Temple Cutwork / Lattice</option>
                              <option value="traditional">◇ Traditional Beaded Dots</option>
                              <option value="plain">― Plain Straight Edge</option>
                              <option value="none">None</option>
                            </select>
                          </div>

                          {/* Dates & Publish */}
                          <div className="border-t border-divider pt-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="fc_active"
                                checked={fcIsActive}
                                onChange={(e) => setFcIsActive(e.target.checked)}
                                className="w-4 h-4 text-primary rounded"
                              />
                              <label htmlFor="fc_active" className="text-xs font-bold cursor-pointer">Activate Campaign</label>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={resetFestivalForm}
                                className="px-4 py-2 border border-divider rounded-xl text-xs font-bold text-text-secondary hover:bg-surface cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-white text-xs font-extrabold rounded-xl hover:bg-secondary shadow-md cursor-pointer"
                              >
                                {editingFestivalId ? 'Save Changes' : 'Publish Campaign'}
                              </button>
                            </div>
                          </div>
                        </form>

                        {/* RIGHT COLUMN: LIVE MOBILE PHONE PREVIEW */}
                        <div className="w-full xl:w-[360px] shrink-0 sticky top-4 bg-gray-950 p-4 rounded-3xl border border-gray-800 flex flex-col items-center shadow-2xl">
                          <div className="flex items-center gap-2 mb-3 text-xs font-black text-amber-400 uppercase tracking-widest">
                            <Smartphone size={16} />
                            <span>Live Mobile Preview</span>
                          </div>

                          {/* Phone Device Container */}
                          <div className="w-[320px] h-[620px] rounded-2xl overflow-y-auto border-4 border-gray-700 bg-background shadow-inner relative flex flex-col">
                            {/* Fake Top App Bar */}
                            <div className="w-full h-11 bg-emerald-700 text-white flex items-center justify-between px-3 text-xs font-bold shrink-0 sticky top-0 z-30 shadow-sm">
                              <span>⚡ 10 mins</span>
                              <span className="truncate max-w-[140px]">WORK - Kukatpally</span>
                              <span>👤</span>
                            </div>

                            {/* Render Component Live */}
                            <FestivalCampaignWrapper campaign={draftCampaign} />
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
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
                          <option value="HOME">Home Page Only</option>
                          <option value="CATEGORY">Category Page</option>
                          <option value="SUBCATEGORY">Subcategory Page</option>
                          <option value="ALL">All Pages (Home, Category & Subcategory)</option>
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
                            <option value={0}>Top Hero Carousel (Main Top Banner under App Bar / Header)</option>
                            <option value={1}>In Between: After Sub-category Section #1</option>
                            <option value={2}>In Between: After Sub-category Section #2</option>
                            <option value={3}>In Between: After Sub-category Section #3</option>
                            <option value={4}>In Between: After Sub-category Section #4</option>
                            <option value={5}>In Between: After Sub-category Section #5</option>
                            <option value={6}>In Between: After Sub-category Section #6</option>
                            <option value={7}>In Between: After Sub-category Section #7</option>
                            <option value={8}>In Between: After Sub-category Section #8</option>
                            <option value={99}>Bottom of Home Page (After all subcategory sections & products)</option>
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
                              <option value="top">Top of Category Page</option>
                              <option value="before_subcategories">Before Subcategories</option>
                              <option value="after_subcategories">After Subcategories</option>
                              <option value="before_products">Before Products</option>
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
                              <option value="top">Top of Subcategory Page</option>
                              <option value="before_products">Before Products</option>
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
                          <option value={0}>Top Position (Before 1st Subcategory section)</option>
                          <option value={1}>In Between: After 1st Subcategory section</option>
                          <option value={2}>In Between: After 2nd Subcategory section</option>
                          <option value={3}>In Between: After 3rd Subcategory section</option>
                          <option value={4}>In Between: After 4th Subcategory section</option>
                          <option value={5}>In Between: After 5th Subcategory section</option>
                          <option value={99}>Bottom Position (After all Subcategory sections)</option>
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
