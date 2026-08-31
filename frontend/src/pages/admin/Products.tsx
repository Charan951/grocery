import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, ArrowUpDown, Download, Upload,
  X, Check, AlertTriangle, Eye, HelpCircle
} from 'lucide-react';
import { useCMS, Product } from '../../context/CMSContext';
import { PageHeader } from '../../components/admin/PageHeader';
import { ShelfTag } from '../../components/admin/ShelfTag';
import { getProductImage } from '../../utils/imageUtils';

export const Products: React.FC = () => {
  const { products: contextProducts, categories, addProduct: contextAdd, deleteProduct: contextDelete, updateProduct: contextUpdate, uploadImage } = useCMS();
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Drawer / Form States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  
  // Form fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('fruits-vegetables');
  const [subCategory, setSubCategory] = useState('Fresh Vegetables');
  const [price, setPrice] = useState(38);
  const [mrp, setMrp] = useState(85);
  const [netQuantity, setNetQuantity] = useState('500 g');
  const [desc, setDesc] = useState('');
  const [img, setImg] = useState('https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [organic, setOrganic] = useState(false);
  const [stock, setStock] = useState(50);

  // SubCategory creator state
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [showSubCatModal, setShowSubCatModal] = useState(false);

  const { addSubCategory: contextAddSubCategory } = useCMS();

  // REST API connection helper
  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Sync state with context
  useEffect(() => {
    setProductsList(contextProducts);
  }, [contextProducts]);

  const fetchLiveProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0 && !data.offlineMode) {
        setProductsList(data.products);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLiveProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
    } catch (e) {}

    contextDelete(id);
    setProductsList(prev => prev.filter(p => p.id !== id));
    alert('Product deleted successfully!');
  };

  // Active Category Object for SubCategories
  const currentCategoryObj = categories.find(c => c.id === category || c.slug === category) || categories[0];

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setBrand('');
    const defaultCat = categories[0]?.slug || categories[0]?.id || 'fruits-vegetables';
    setCategory(defaultCat);
    setSubCategory('');
    setPrice(38);
    setMrp(85);
    setNetQuantity('500 g');
    setDesc('');
    const defaultImg = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600';
    setImg(defaultImg);
    setImagesList([defaultImg]);
    setNewImageUrl('');
    setOrganic(false);
    setStock(50);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBrand(p.brand || '');
    setCategory(p.categoryId || p.category || 'fruits-vegetables');
    setSubCategory(p.subCategory || '');
    setPrice(p.price);
    setMrp(p.originalPrice || p.mrp);
    setNetQuantity(p.netQuantity || p.defaultWeight || '500 g');
    setDesc(p.description || '');
    const existingImgs = (Array.isArray(p.images) && p.images.length > 0)
      ? p.images.filter(Boolean)
      : [p.imageUrl || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600'];
    setImg(p.imageUrl || existingImgs[0] || '');
    setImagesList(existingImgs);
    setNewImageUrl('');
    setOrganic(!!p.isOrganic);
    setStock(typeof p.stock === 'number' ? p.stock : (p.stock?.quantity || 50));
    setDrawerOpen(true);
  };

  const handleAddSubCategory = async () => {
    if (!newSubCategoryName.trim()) return;
    try {
      await fetch(`${API_URL}/categories/${category}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name: newSubCategoryName.trim() })
      });
    } catch (e) {}

    contextAddSubCategory(category, newSubCategoryName.trim());
    setSubCategory(newSubCategoryName.trim());
    setNewSubCategoryName('');
    setShowSubCatModal(false);
    alert(`Subcategory "${newSubCategoryName.trim()}" created successfully!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter product name.');
      return;
    }

    const discountVal = mrp - price;
    const discountText = discountVal > 0 ? `₹${discountVal} OFF` : 'Best Price';
    const discountPercentage = mrp > 0 ? Math.round((discountVal / mrp) * 100) : 0;

    const validImages = imagesList.filter(url => typeof url === 'string' && url.trim().length > 0);
    let primaryImg = img.trim();
    if (!primaryImg && validImages.length > 0) primaryImg = validImages[0];
    if (primaryImg && !validImages.includes(primaryImg)) validImages.unshift(primaryImg);
    if (validImages.length === 0) validImages.push('https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600');
    if (!primaryImg) primaryImg = validImages[0];

    const pData: Partial<Product> = {
      name: name.trim(),
      brand: brand.trim() || 'FreshCart',
      categoryId: category,
      category: currentCategoryObj?.name || category,
      subCategory: subCategory,
      price,
      mrp,
      originalPrice: mrp,
      discount: discountText,
      discountText,
      discountPercentage,
      netQuantity: netQuantity.trim() || '500 g',
      weightOptions: [netQuantity.trim() || '500 g'],
      defaultWeight: netQuantity.trim() || '500 g',
      description: desc.trim() || `${name} fresh produce`,
      imageUrl: primaryImg,
      images: validImages,
      isOrganic: organic,
      stock: { status: stock > 0 ? 'In Stock' : 'Out of Stock', quantity: stock },
      seller: { name: 'Geddit Convenience Private Limited', countryOfOrigin: 'India', shelfLife: '4 days' },
      delivery: { returnExchange: 'No Return or Exchange', fastDelivery: true },
      highlights: { productType: 'Produce', imported: false, dietaryPreference: 'Veg', goodFor: ['Freshness Guaranteed'] }
    };

    if (editingProduct) {
      try {
        await fetch(`${API_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(pData)
        });
      } catch (e) {}

      contextUpdate(editingProduct.id, pData);
      setProductsList(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...pData } : p));
      alert('Product updated successfully!');
    } else {
      const newId = 'prod_' + Date.now();
      const newP: Product = {
        id: newId,
        rating: 4.8,
        reviewsCount: 12,
        isFreshPick: true,
        ...pData
      } as Product;

      try {
        await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(newP)
        });
      } catch (e) {}

      contextAdd(newP);
      setProductsList(prev => [newP, ...prev]);
      alert('Product added successfully!');
    }

    setDrawerOpen(false);
  };

  // Bulk Import
  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) throw new Error('Data must be a JSON array of products');

      // Call API
      try {
        await fetch(`${API_URL}/products/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ products: parsed })
        });
      } catch (e) {}

      parsed.forEach(p => contextAdd(p));
      setProductsList(prev => [...parsed, ...prev]);
      setImportOpen(false);
      setImportJson('');
      alert(`Imported ${parsed.length} products successfully!`);
    } catch (err: any) {
      alert('Failed to parse JSON. Error: ' + err.message);
    }
  };

  // Bulk Export
  const handleBulkExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(productsList, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `products_export_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const filteredProducts = productsList.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products Catalog"
        actions={
          <>
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-2 px-3.5 py-2 border border-admin-ledger-line rounded-md text-[11px] font-semibold bg-admin-surface hover:bg-admin-paper text-admin-text-muted hover:text-admin-text transition-all cursor-pointer font-admin-mono uppercase tracking-wide"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 border border-admin-ledger-line rounded-md text-[11px] font-semibold bg-admin-surface hover:bg-admin-paper text-admin-text-muted hover:text-admin-text transition-all cursor-pointer font-admin-mono uppercase tracking-wide"
            >
              <Upload size={13} />
              <span>Import</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-semibold bg-admin-ink text-white hover:bg-admin-ink-soft transition-all cursor-pointer font-admin-mono uppercase tracking-wide"
            >
              <Plus size={13} />
              <span>Add Product</span>
            </button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-admin-surface p-3 rounded-lg border border-admin-ledger-line">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-admin-text-faint" size={15} />
          <input
            type="text"
            placeholder="Search by name, brand, or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-admin-ledger-line rounded-md text-xs bg-admin-paper focus:outline-none focus:border-admin-green text-admin-text font-medium placeholder:text-admin-text-faint"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-admin-ledger-line rounded-md text-xs font-semibold bg-admin-paper focus:outline-none focus:border-admin-green text-admin-text"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product Ledger Table */}
      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="font-admin-mono">
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Image</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Product</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Category</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Price / MRP</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Stock</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap">Type</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const catObj = categories.find(c => c.id === p.categoryId || c.slug === p.categoryId);
                const stockQty = typeof p.stock === 'number' ? p.stock : (p.stock?.quantity ?? 50);
                const isLowStock = stockQty < 15;
                const weightText = p.netQuantity || p.defaultWeight || (p.weightOptions && p.weightOptions[0]) || '500 g';
                return (
                  <tr key={p.id} className="hover:bg-admin-paper/70 transition-colors border-b border-admin-ledger-line last:border-b-0">
                    <td className="p-3.5">
                      <img src={getProductImage(p)} alt={p.name} className="w-11 h-11 object-cover rounded-md bg-admin-paper border border-admin-ledger-line" />
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-admin-text">{p.name}</div>
                      <div className="font-admin-mono text-[10px] text-admin-text-faint font-medium uppercase mt-0.5">{p.brand} • {weightText}</div>
                    </td>
                    <td className="p-3.5">
                      <ShelfTag tone="neutral">{catObj?.name || p.categoryId}</ShelfTag>
                    </td>
                    <td className="p-3.5">
                      <div className="font-admin-mono font-semibold text-admin-text tabular-nums">₹{p.price}</div>
                      {(p.originalPrice || p.mrp) > p.price && (
                        <div className="font-admin-mono text-[10px] text-admin-text-faint line-through tabular-nums">₹{p.originalPrice || p.mrp}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <ShelfTag tone={isLowStock ? 'red' : 'green'}>{stockQty} units</ShelfTag>
                    </td>
                    <td className="p-3.5">
                      <ShelfTag tone={p.isOrganic ? 'green' : 'neutral'}>{p.isOrganic ? 'Certified organic' : 'Standard'}</ShelfTag>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-md text-admin-text-muted hover:text-admin-green hover:bg-admin-green-soft transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-md text-admin-text-muted hover:text-admin-red hover:bg-admin-red-soft transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-admin-text-faint font-medium">
                    No products found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT DRAWER SLIDER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-surface h-full shadow-premium flex flex-col p-6 overflow-y-auto z-10 border-l border-divider">
            <div className="flex items-center justify-between border-b border-divider pb-4 mb-4">
              <h2 className="text-base font-extrabold text-text-primary">{editingProduct ? 'Edit Catalog Item' : 'Add New Catalog Item'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg border border-divider hover:bg-background cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-primary">Product Title</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sweet Potato" className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-primary">Brand Name</label>
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. FreshFarm" className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary">
                    {categories.map(c => (
                      <option key={c.id} value={c.slug || c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">SubCategory</label>
                  <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary">
                    <option value="">Select Subcategory</option>
                    {currentCategoryObj?.subCategories?.map(sc => (
                      <option key={sc.name} value={sc.name}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">Net Quantity</label>
                  <input type="text" value={netQuantity} onChange={(e) => setNetQuantity(e.target.value)} placeholder="e.g. 500 g" className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">Stock Quantity</label>
                  <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">Price (₹)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">MRP (₹)</label>
                  <input type="number" value={mrp} onChange={(e) => setMrp(Number(e.target.value))} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-primary">Initial Stock (Qty)</label>
                  <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
                </div>
              </div>

              {/* Multi-Image Gallery Section */}
              <div className="flex flex-col gap-2 p-3 bg-background/60 rounded-2xl border border-divider">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Product Gallery Images ({imagesList.length})</label>
                  <span className="text-[10px] text-text-secondary font-medium">Primary image shown on product cards</span>
                </div>

                {/* Primary Image Input & File Upload */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={img}
                    onChange={(e) => {
                      const newMain = e.target.value;
                      setImg(newMain);
                      if (newMain && !imagesList.includes(newMain)) {
                        setImagesList(prev => [newMain, ...prev.filter(x => x !== img)]);
                      }
                    }}
                    placeholder="Primary Image URL..."
                    className="flex-1 px-3 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-mono"
                    required
                  />
                  <label className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-2xs">
                    <Upload size={14} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64 = reader.result as string;
                            let uploadedUrl = base64;
                            try {
                              const cloudUrl = await uploadImage(base64, 'freshcart/products');
                              if (cloudUrl) uploadedUrl = cloudUrl;
                            } catch (err) {}
                            setImg(uploadedUrl);
                            setImagesList(prev => [uploadedUrl, ...prev.filter(x => x !== uploadedUrl)]);
                            alert('✅ Image uploaded successfully!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Add Additional Image URL bar */}
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste additional image URL (e.g. back view, side view)..."
                    className="flex-1 px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrl.trim()) return;
                      const url = newImageUrl.trim();
                      if (!imagesList.includes(url)) {
                        setImagesList(prev => [...prev, url]);
                        if (!img) setImg(url);
                      }
                      setNewImageUrl('');
                    }}
                    className="px-3 py-1.5 bg-admin-ink text-white rounded-xl text-xs font-bold hover:bg-admin-ink-soft transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Thumbnails list */}
                {imagesList.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-divider/60 mt-1">
                    {imagesList.map((url, idx) => {
                      const isMain = url === img;
                      return (
                        <div key={idx} className={`relative group w-16 h-16 rounded-xl border-2 overflow-hidden bg-white shadow-2xs ${isMain ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-divider'}`}>
                          <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          {isMain && (
                            <span className="absolute top-0.5 left-0.5 bg-emerald-600 text-white text-[8px] font-black px-1 rounded-sm leading-tight">
                              MAIN
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                            {!isMain && (
                              <button
                                type="button"
                                onClick={() => setImg(url)}
                                title="Set as Main Image"
                                className="p-1 bg-emerald-600 text-white rounded-md text-[9px] font-bold cursor-pointer hover:bg-emerald-700"
                              >
                                Main
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const nextList = imagesList.filter((_, i) => i !== idx);
                                setImagesList(nextList);
                                if (isMain && nextList.length > 0) {
                                  setImg(nextList[0]);
                                }
                              }}
                              title="Remove Image"
                              className="p-1 bg-rose-600 text-white rounded-md text-[9px] font-bold cursor-pointer hover:bg-rose-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-primary">Description</label>
                <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Write details here..." className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="organic" checked={organic} onChange={(e) => setOrganic(e.target.checked)} className="w-4.5 h-4.5 rounded border-divider text-primary focus:ring-primary" />
                <label htmlFor="organic" className="text-xs font-bold text-text-secondary cursor-pointer select-none">Mark as 100% Organic certified</label>
              </div>

              <div className="flex gap-3 mt-4 border-t border-divider pt-4">
                <button type="submit" className="flex-1 bg-primary text-white font-bold py-2.5 rounded-full text-xs hover:bg-secondary cursor-pointer shadow-sm">Save Changes</button>
                <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 bg-background text-text-secondary border border-divider font-bold py-2.5 rounded-full text-xs hover:bg-surface cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT DRAWER */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setImportOpen(false)} />
          <div className="relative w-full max-w-[500px] bg-surface h-full shadow-premium flex flex-col p-6 z-10 border-l border-divider">
            <div className="flex items-center justify-between border-b border-divider pb-4 mb-4">
              <h2 className="text-base font-extrabold text-text-primary">Bulk Import JSON</h2>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg border border-divider hover:bg-background cursor-pointer"><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                {"Paste a JSON array of products matching the catalog structure. Ex: [{\"id\":\"p1\", \"name\":\"Apple\", \"brand\":\"...\", \"categoryId\":\"cat_fruits\", \"price\":150, \"mrp\":180, \"defaultWeight\":\"1kg\", \"description\":\"...\", \"imageUrl\":\"...\"}]"}
              </p>


              <textarea 
                rows={15} 
                value={importJson} 
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="[ { ... }, { ... } ]" 
                className="w-full flex-1 p-3 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-mono"
              />
              <button 
                onClick={handleBulkImport}
                className="w-full bg-primary text-white font-bold py-2.5 rounded-full text-xs hover:bg-secondary cursor-pointer shadow-sm mt-2"
              >
                Execute Bulk Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Products;
