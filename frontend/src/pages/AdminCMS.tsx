import React, { useState } from 'react';
import { useCMS, Product, Coupon, Blog } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { Trash2, Plus } from 'lucide-react';

export const AdminCMS: React.FC = () => {
  const { 
    banners, categories, products, coupons, blogs, seoSettings,
    updateProduct, addProduct, deleteProduct,
    updateBanner, addCoupon, deleteCoupon,
    addBlog, deleteBlog, updateSEOSettings, resetToDefaults 
  } = useCMS();

  const [activeTab, setActiveTab] = useState<'banners' | 'products' | 'coupons' | 'blogs' | 'seo'>('products');

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
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'products' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('products')}
            >
              📦 Products Catalog
            </button>
            <button 
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'banners' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('banners')}
            >
              🖼️ Home Banners
            </button>
            <button 
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'coupons' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('coupons')}
            >
              🎟️ Coupons & Offers
            </button>
            <button 
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'blogs' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('blogs')}
            >
              ✍️ Health Articles
            </button>
            <button 
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'seo' ? 'bg-primary/10 border border-primary/20 text-primary' : 'text-text-primary hover:bg-background'}`}
              onClick={() => setActiveTab('seo')}
            >
              🔍 SEO Meta Tags
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
                {activeTab === 'products' && 'Products Management'}
                {activeTab === 'banners' && 'Hero Banner Carousel'}
                {activeTab === 'coupons' && 'Offers & Discount Coupons'}
                {activeTab === 'blogs' && 'Health Articles CMS'}
                {activeTab === 'seo' && 'Search Optimization Meta Engine'}
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

            {/* TAB: BANNERS */}
            {activeTab === 'banners' && (
              <div className="overflow-x-auto border border-divider rounded-xl">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr>
                      <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Title</th>
                      <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Subtitle</th>
                      <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Tag</th>
                      <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Gradient Colors</th>
                      <th className="p-3.5 bg-background border-b border-divider font-bold text-text-primary whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((b) => (
                      <tr key={b.id} className="hover:bg-background/30 transition-colors">
                        <td className="p-3.5 border-b border-divider text-text-secondary"><strong>{b.title}</strong></td>
                        <td className="p-3.5 border-b border-divider text-text-secondary">{b.subtitle}</td>
                        <td className="p-3.5 border-b border-divider text-text-secondary"><span className="text-[10px] bg-background border border-divider px-2 py-1 rounded font-semibold text-text-secondary">{b.tag}</span></td>
                        <td className="p-3.5 border-b border-divider text-text-secondary">
                          <div className="flex gap-1.5">
                            {b.gradient.map((col) => (
                              <span key={col} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ background: col }} />
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 border-b border-divider text-text-secondary">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={b.active} 
                              onChange={(e) => updateBanner(b.id, { active: e.target.checked })}
                              className="w-4 h-4 rounded border-divider text-primary focus:ring-primary"
                            />
                            <span className="text-xs text-text-secondary">{b.active ? 'Active' : 'Disabled'}</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
