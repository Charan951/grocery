import React, { useState } from 'react';
import { useCMS, Product, Coupon, Blog, Banner } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { Trash2, Plus, Edit2, CheckSquare, Square, Image, LayoutGrid, Upload } from 'lucide-react';

export const AdminCMS: React.FC = () => {
  const { 
    banners, categories, specialCategoryGroups, products, coupons, blogs, seoSettings,
    homeSelectedSubCategories, updateHomeSubCategories, toggleHomeSubCategory,
    updateProduct, addProduct, deleteProduct,
    addBanner, updateBanner, deleteBanner,
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

  const [activeTab, setActiveTab] = useState<'banners' | 'home_subcats' | 'special_groups' | 'products' | 'coupons' | 'blogs' | 'seo'>('special_groups');


  // Banner Add/Edit Form States
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [bannerPosition, setBannerPosition] = useState(1);

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
    setBannerPosition(b.positionIndex || 1);
    setSelectedSubCategory(b.subCategoryName || (b.linkUrl ? decodeURIComponent(b.linkUrl.split('subCategory=')[1] || '') : '') || (allSubCategories[0]?.name || ''));
    setShowBannerForm(true);
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      alert('Please enter banner name.');
      return;
    }

    const subObj = allSubCategories.find(s => s.name === selectedSubCategory);
    const linkUrl = subObj 
      ? `/products?category=${subObj.catSlug}&subCategory=${encodeURIComponent(subObj.name)}`
      : (selectedSubCategory ? `/products?subCategory=${encodeURIComponent(selectedSubCategory)}` : '/products');

    const payload = {
      title: bannerTitle.trim(),
      imageUrl: bannerImageUrl.trim(),
      subCategoryName: selectedSubCategory || undefined,
      linkUrl: linkUrl,
      positionIndex: bannerPosition,
      subtitle: selectedSubCategory ? `Special deals on ${selectedSubCategory}` : 'Everyday Low Prices',
      tag: 'PROMO',
      buttonText: 'Shop Deals',
      gradient: ['#10B981', '#059669'],
      active: true
    };

    if (editingBannerId) {
      updateBanner(editingBannerId, payload);
      alert('Banner updated successfully!');
    } else {
      addBanner({
        ...payload,
        id: 'banner_' + Date.now(),
      });
      alert('Banner created successfully!');
    }

    setShowBannerForm(false);
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerImageUrl('');
    setSelectedSubCategory('');
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
                {activeTab === 'home_subcats' && 'Home Page Sub-Categories Selection'}
                {activeTab === 'special_groups' && 'Special Subcategory Groups (Zepto Mobile Grid V3)'}
                {activeTab === 'banners' && 'Dynamic Inter-Section Banners (CRUD)'}
              </h2>
            </div>

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
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-bold ${
                                  isSelected 
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

            {/* TAB: BANNERS (DYNAMIC CRUD) */}
            {activeTab === 'banners' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-text-secondary font-medium">
                    Add, edit and rearrange dynamic promo banners displayed between sub-category sections on the home page.
                  </p>
                  {!showBannerForm && (
                    <button 
                      onClick={() => {
                        setEditingBannerId(null);
                        setBannerTitle('');
                        setBannerImageUrl('');
                        setSelectedSubCategory('');
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
                        {editingBannerId ? '✏️ Edit Inter-Section Banner' : '✨ Add Dynamic Inter-Section Banner'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. Banner Name */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-text-primary">Banner Name</label>
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
                        <label className="text-xs font-bold text-text-primary">Banner Image</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="https://images.unsplash.com/... or upload file" 
                            value={bannerImageUrl} 
                            onChange={(e) => setBannerImageUrl(e.target.value)} 
                            className="flex-1 px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-medium" 
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
                        {bannerImageUrl && (
                          <div className="mt-2 w-full max-h-36 rounded-xl overflow-hidden border border-divider bg-surface">
                            <img src={bannerImageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* 3. Select Subcategory */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Select Subcategory</label>
                        <select
                          value={selectedSubCategory}
                          onChange={(e) => setSelectedSubCategory(e.target.value)}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                        >
                          <option value="">-- Select Target Subcategory --</option>
                          {allSubCategories.map((sub) => (
                            <option key={sub.id + sub.name} value={sub.name}>
                              {sub.catName} &rarr; {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Display Position / Order */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">Display Position (Order)</label>
                        <select
                          value={bannerPosition}
                          onChange={(e) => setBannerPosition(parseInt(e.target.value) || 1)}
                          className="w-full px-3.5 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-emerald-500 text-text-primary font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pos) => (
                            <option key={pos} value={pos}>
                              After Sub-category Section #{pos}
                            </option>
                          ))}
                        </select>
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
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              {b.tag || 'BANNER'}
                            </span>
                            <span className="text-[10px] font-bold text-text-tertiary px-2 py-0.5 rounded-full bg-surface border border-divider">
                              Placement: After Section #{b.positionIndex || 1}
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
