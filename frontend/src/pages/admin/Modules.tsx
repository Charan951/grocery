import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FolderTree, Award, Boxes, Warehouse, Users, Truck, UserCheck, Ticket, 
  Tag, Megaphone, Layers, DollarSign, FileText, LineChart, Star, LifeBuoy, 
  Bell, Settings, ShieldAlert, Plus, Trash2, Edit2, Search, ArrowRight, ArrowLeft,
  Send, UserMinus, Shield, Key, Download, CheckSquare, Sparkles, RefreshCw,
  ArrowUp, ArrowDown, X, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { useCMS, getCategoryImage, getSubCategoryImage } from '../../context/CMSContext';

// ==========================================
// 1. CATEGORIES MODULE
// ==========================================
export const CategoriesModule: React.FC = () => {
  const navigate = useNavigate();
  const { 
    categories, addCategory, updateCategory, deleteCategory, moveCategory, uploadImage,
    addSubCategory, updateSubCategory, deleteSubCategory 
  } = useCMS();
  const [showAdd, setShowAdd] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [cName, setCName] = useState('');
  const [cDisplayName, setCDisplayName] = useState('');
  const [cColor, setCColor] = useState('#4CAF50');
  const [cIcon, setCIcon] = useState('https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop');

  // Subcategory management state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [editingSub, setEditingSub] = useState<{ categoryId: string; subId: string; name: string } | null>(null);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCName('');
    setCDisplayName('');
    setCColor('#4CAF50');
    setCIcon('https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop');
    setShowAdd(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategory(cat);
    setCName(cat.name);
    setCDisplayName(cat.displayName || '');
    setCColor(cat.color || '#4CAF50');
    setCIcon(cat.icon || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop');
    setShowAdd(true);
  };

  const handleAddCategory = async () => {
    if (!cName.trim()) return;

    if (editingCategory) {
      // Edit Mode
      const updatedData = {
        name: cName.trim(),
        displayName: cDisplayName.trim(),
        icon: cIcon,
        color: cColor
      };
      updateCategory(editingCategory.id, updatedData);
      try {
        await fetch(`${API_URL}/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(updatedData)
        });
      } catch (err) {
        console.warn('Backend update skipped, saved locally');
      }
      alert('Category updated successfully!');
    } else {
      // Add Mode
      const catId = 'cat_' + cName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
      const catData = {
        id: catId,
        name: cName.trim(),
        displayName: cDisplayName.trim(),
        icon: cIcon,
        color: cColor,
        productCount: 0
      };

      try {
        const res = await fetch(`${API_URL}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(catData)
        });
        const data = await res.json();
        if (data.success) {
          addCategory(data.category || catData);
          alert(`Category '${cName}' created successfully on backend!`);
        } else {
          addCategory(catData);
          alert(`Category '${cName}' saved locally!`);
        }
      } catch (err) {
        addCategory(catData);
        alert(`Category '${cName}' added locally! (Offline mode)`);
      }
    }

    setShowAdd(false);
    setCName('');
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        deleteCategory(id);
        alert('Category deleted successfully on backend!');
      } else {
        deleteCategory(id);
        alert('Category deleted locally!');
      }
    } catch (err) {
      deleteCategory(id);
      alert('Category deleted locally! (Offline mode)');
    }
  };

  // Subcategory CRUD Handlers
  const handleAddSubCategory = async (catId: string) => {
    if (!newSubName.trim()) return;
    const subName = newSubName.trim();
    addSubCategory(catId, subName);

    try {
      await fetch(`${API_URL}/categories/${catId}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name: subName })
      });
    } catch (err) {
      console.warn('Subcategory save fallback to local state');
    }
    setNewSubName('');
  };

  const handleDeleteSubCategory = async (catId: string, subIdOrName: string) => {
    if (!window.confirm('Are you sure you want to delete this subcategory?')) return;
    deleteSubCategory(catId, subIdOrName);

    try {
      await fetch(`${API_URL}/categories/${catId}/subcategories/${encodeURIComponent(subIdOrName)}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
    } catch (err) {
      console.warn('Subcategory delete fallback to local state');
    }
  };

  const handleUpdateSubCategory = async (catId: string, subIdOrName: string, updatedName: string) => {
    if (!updatedName.trim()) return;
    updateSubCategory(catId, subIdOrName, updatedName.trim());

    try {
      await fetch(`${API_URL}/categories/${catId}/subcategories/${encodeURIComponent(subIdOrName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name: updatedName.trim() })
      });
    } catch (err) {
      console.warn('Subcategory update fallback to local state');
    }
    setEditingSub(null);
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">Categories Directory</h2>
          <p className="text-[10px] text-text-secondary font-medium">Manage product departments and hierarchy</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center gap-1 bg-primary text-white font-bold py-2 px-5 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md">
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Pop-up Modal Window for Add / Edit Category */}
      {showAdd && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdd(false);
              setEditingCategory(null);
            }
          }}
        >
          <div className="bg-surface border border-divider p-6 rounded-3xl shadow-2xl w-[520px] max-w-[92vw] flex-shrink-0 flex flex-col gap-4 relative animate-in fade-in zoom-in duration-200 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-divider">
              <h3 className="font-extrabold text-base text-text-primary">
                {editingCategory ? 'Edit Department' : 'Add Department'}
              </h3>
              <button 
                onClick={() => { setShowAdd(false); setEditingCategory(null); }}
                className="p-1.5 rounded-full hover:bg-background text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dairy, Bread & Eggs"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-semibold"
                />
                <p className="text-[10px] text-text-tertiary font-medium mt-1">Internal name used across the admin panel and URLs.</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Display Name (shown on Home page & app bar)</label>
                <input
                  type="text"
                  placeholder="Leave blank to use the department name above"
                  value={cDisplayName}
                  onChange={(e) => setCDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-semibold"
                />
                <p className="text-[10px] text-text-tertiary font-medium mt-1">A shorter or customer-friendly label customers see on the Home page and top nav bar.</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Background Colour (app bar & home page icon)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cColor}
                    onChange={(e) => setCColor(e.target.value)}
                    className="w-11 h-11 rounded-xl border border-divider cursor-pointer bg-background p-1"
                  />
                  <input
                    type="text"
                    value={cColor}
                    onChange={(e) => setCColor(e.target.value)}
                    placeholder="#4CAF50"
                    className="flex-1 px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-semibold uppercase"
                  />
                </div>
                <p className="text-[10px] text-text-tertiary font-medium mt-1">Tint shown behind this category's icon in the app bar and Home page rail.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Category Icon / Image (Cloudinary or URL)</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="https://res.cloudinary.com/..." 
                    value={cIcon} 
                    onChange={(e) => setCIcon(e.target.value)} 
                    className="flex-1 px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" 
                  />
                  <label className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors flex items-center gap-1 flex-shrink-0">
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
                            try {
                              const uploadedUrl = await uploadImage(reader.result as string, 'freshcart/categories');
                              setCIcon(uploadedUrl);
                              alert('✅ Category image uploaded to Cloudinary!');
                            } catch (err: any) {
                              alert('❌ Upload Error: ' + err.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Big Live Image Preview (100x148px 25:37) */}
                {cIcon && (cIcon.startsWith('http') || cIcon.startsWith('data:') || cIcon.startsWith('/')) && (
                  <div className="mt-2 flex items-center justify-between p-4 bg-background rounded-2xl border border-divider">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Big Preview (100 × 148 px):</span>
                    <div className="w-[100px] h-[148px] min-w-[100px] min-h-[148px] rounded-2xl border border-divider overflow-hidden bg-surface p-1 shadow-md flex items-center justify-center">
                      <img 
                        src={cIcon} 
                        alt="Category Preview" 
                        className="w-full h-full object-contain rounded-xl" 
                        style={{ aspectRatio: '25/37' }}
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop'; }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-divider mt-2">
              <button 
                onClick={() => { setShowAdd(false); setEditingCategory(null); }} 
                className="bg-surface text-text-secondary border border-divider font-bold py-2.5 px-6 rounded-full text-xs hover:bg-background transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCategory} 
                className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md"
              >
                Save Department
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {categories.map((c, index) => {
          const imgSrc = getCategoryImage(c);
          const subList = c.subCategories || [];
          const isExpanded = expandedCategoryId === c.id;

          return (
            <div 
              key={c.id} 
              onClick={() => navigate(`/admin/subcategories?category=${c.id}`)}
              className="p-4 rounded-2xl border border-divider bg-background/50 flex flex-col gap-3 hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Order Number Badge */}
                  <div className="w-9 h-9 rounded-xl bg-surface border border-divider text-xs font-black text-primary flex items-center justify-center flex-shrink-0 shadow-sm" title={`Category Position #${index + 1}`}>
                    #{index + 1}
                  </div>

                  {/* Big Category Thumbnail (100x148px Aspect 25:37) */}
                  <div className="w-[80px] h-[118px] rounded-2xl border border-divider overflow-hidden bg-surface flex items-center justify-center p-1.5 flex-shrink-0 shadow-sm">
                    <img 
                      src={imgSrc} 
                      alt={c.name} 
                      className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform" 
                      style={{ aspectRatio: '25/37' }} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop';
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-text-primary group-hover:text-primary transition-colors">{c.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-secondary font-bold uppercase">{c.productCount || 0} Products</span>
                      <span className="text-[11px] text-emerald-600 font-bold uppercase">• {subList.length} Subcategories</span>
                    </div>
                    <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">Order Position #{index + 1}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Subcategories Page Link Button */}
                  <button 
                    onClick={() => navigate(`/admin/subcategories?category=${c.id}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-white border border-primary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-secondary"
                    title="Open Subcategories Page for this Category"
                  >
                    <FolderTree size={14} className="text-white" />
                    <span>Subcategories ({subList.length})</span>
                    <ArrowRight size={13} className="text-white" />
                  </button>

                  {/* Reorder Buttons (Move Up / Move Down) */}
                  <div className="flex items-center bg-surface border border-divider rounded-xl p-0.5 mr-1">
                    <button 
                      disabled={index === 0}
                      onClick={() => moveCategory(c.id, 'up')}
                      className="p-1 rounded-lg text-text-secondary hover:text-primary disabled:opacity-30 disabled:hover:text-text-secondary cursor-pointer transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(c.id, 'down')}
                      className="p-1 rounded-lg text-text-secondary hover:text-primary disabled:opacity-30 disabled:hover:text-text-secondary cursor-pointer transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleOpenEdit(c)}
                    className="px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-bold text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(c.id)}
                    className="px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-bold text-text-secondary hover:text-error hover:bg-error/10 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



// ==========================================
// 2. SUBCATEGORIES MODULE (DEDICATED PAGE)
// ==========================================
export const SubCategoriesModule: React.FC = () => {
  const { 
    categories, addSubCategory, updateSubCategory, deleteSubCategory, products,
    uploadImage, homeSelectedSubCategories, toggleHomeSubCategory
  } = useCMS();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCat = searchParams.get('category') || 'ALL';
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>(initialCat);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetCatId, setTargetCatId] = useState<string>('');
  const [subNameInput, setSubNameInput] = useState<string>('');
  const [subImageInput, setSubImageInput] = useState<string>('');
  const [subColorInput, setSubColorInput] = useState<string>('#10B981');
  const [subShowOnHome, setSubShowOnHome] = useState<boolean>(true);
  const [subOrderInput, setSubOrderInput] = useState<number>(1);
  const [subPromoImageInput, setSubPromoImageInput] = useState<string>('');
  const [insertAfterSubName, setInsertAfterSubName] = useState<string>('');

  const [editingSub, setEditingSub] = useState<{
    categoryId: string;
    subId: string;
    name: string;
    image: string;
    color: string;
    showOnHome: boolean;
    displayOrder: number;
    promoImage: string;
  } | null>(null);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCatFilter(cat);
  }, [searchParams]);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Compile flattened subcategories list with images, display order, promo image, and home display status
  const subCategoriesList = React.useMemo(() => {
    const items: Array<{
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      subId: string;
      name: string;
      slug: string;
      image: string;
      color: string;
      showOnHome: boolean;
      displayOrder: number;
      promoImage: string;
      productCount: number;
    }> = [];

    categories.forEach((cat) => {
      const subs = cat.subCategories || [];
      subs.forEach((sub: any, idx: number) => {
        const sName = typeof sub === 'string' ? sub : sub.name;
        const sId = typeof sub === 'object' && sub.id ? sub.id : sName;
        const sSlug = typeof sub === 'object' && sub.slug ? sub.slug : sName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const sImage = getSubCategoryImage(sName, cat.name, typeof sub === 'object' ? (sub.image || sub.icon || '') : '');
        const sPromoImage = typeof sub === 'object' ? (sub.promoImage || '') : '';
        const sOrder = typeof sub === 'object' && sub.displayOrder !== undefined ? sub.displayOrder : idx + 1;
        
        const isSelectedOnHome = typeof sub === 'object' && sub.showOnHome !== undefined 
          ? sub.showOnHome 
          : true;

        // Count products matching category & subcategory
        const prodCount = products.filter((p) => {
          const isCatMatch = p.categoryId === cat.id || p.category === cat.name;
          const isSubMatch = p.subCategory && p.subCategory.toLowerCase() === sName.toLowerCase();
          return isCatMatch && isSubMatch;
        }).length;

        const sColor = typeof sub === 'object' && sub.color ? sub.color : '#10B981';

        items.push({
          categoryId: cat.id,
          categoryName: cat.name,
          categoryColor: cat.color || '#10B981',
          subId: sId,
          name: sName,
          slug: sSlug,
          image: sImage,
          color: sColor,
          showOnHome: isSelectedOnHome,
          displayOrder: sOrder,
          promoImage: sPromoImage,
          productCount: prodCount,
        });
      });
    });

    // Sort items by displayOrder ascending
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categories, products, homeSelectedSubCategories]);

  const currentSelectedCat = categories.find(
    (c) => c.id === selectedCatFilter || c.slug === selectedCatFilter || c.name.toLowerCase() === selectedCatFilter.toLowerCase()
  );

  const filteredSubCategories = subCategoriesList.filter(
    (item) => item.categoryId === selectedCatFilter || item.categoryName.toLowerCase() === selectedCatFilter.toLowerCase()
  );

  // Filter items for search
  const filteredItems = subCategoriesList.filter((item) => {
    const matchesCat =
      selectedCatFilter === 'ALL' ||
      item.categoryId === selectedCatFilter ||
      item.categoryName.toLowerCase() === selectedCatFilter.toLowerCase();
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleOpenAdd = (catId?: string, insertAfterItem?: any) => {
    setTargetCatId(catId || (categories[0]?.id || ''));
    setSubNameInput('');
    setSubImageInput('https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop');
    setSubShowOnHome(true);
    setSubPromoImageInput('');

    if (insertAfterItem) {
      setSubOrderInput((insertAfterItem.displayOrder || 1) + 1);
      setInsertAfterSubName(insertAfterItem.name);
    } else {
      setSubOrderInput((subCategoriesList.length || 0) + 1);
      setInsertAfterSubName('');
    }
    setShowAddModal(true);
  };

  const handleAddSubCategorySubmit = async () => {
    if (!subNameInput.trim() || !targetCatId) {
      alert('Please enter subcategory name and choose parent department.');
      return;
    }
    const sName = subNameInput.trim();
    const targetOrder = Number(subOrderInput) || 1;

    // Shift any existing subcategories with displayOrder >= targetOrder dynamically
    subCategoriesList.forEach(async (item) => {
      if (item.displayOrder >= targetOrder) {
        const newOrder = item.displayOrder + 1;
        updateSubCategory(item.categoryId, item.subId, { displayOrder: newOrder });
        try {
          await fetch(`${API_URL}/categories/${item.categoryId}/subcategories/${encodeURIComponent(item.subId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ displayOrder: newOrder })
          });
        } catch (e) {}
      }
    });

    const subPayload = {
      name: sName,
      image: subImageInput,
      icon: subImageInput,
      color: subColorInput || '#10B981',
      showOnHome: subShowOnHome,
      displayOrder: targetOrder,
      promoImage: subPromoImageInput,
    };

    addSubCategory(targetCatId, subPayload);

    setShowAddModal(false);
    setSubNameInput('');
    setSubImageInput('');
    setSubPromoImageInput('');
    setInsertAfterSubName('');
  };

  const handleMoveSubUp = async (item: any, currentIndex: number) => {
    if (currentIndex <= 0) return;
    const prevItem = filteredItems[currentIndex - 1];
    if (!prevItem) return;

    const currentOrder = item.displayOrder;
    const prevOrder = prevItem.displayOrder;

    updateSubCategory(item.categoryId, item.subId, { displayOrder: prevOrder });
    updateSubCategory(prevItem.categoryId, prevItem.subId, { displayOrder: currentOrder });

    try {
      await Promise.all([
        fetch(`${API_URL}/categories/${item.categoryId}/subcategories/${encodeURIComponent(item.subId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ displayOrder: prevOrder })
        }),
        fetch(`${API_URL}/categories/${prevItem.categoryId}/subcategories/${encodeURIComponent(prevItem.subId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ displayOrder: currentOrder })
        })
      ]);
    } catch (err) {}
  };

  const handleMoveSubDown = async (item: any, currentIndex: number) => {
    if (currentIndex >= filteredItems.length - 1) return;
    const nextItem = filteredItems[currentIndex + 1];
    if (!nextItem) return;

    const currentOrder = item.displayOrder;
    const nextOrder = nextItem.displayOrder;

    updateSubCategory(item.categoryId, item.subId, { displayOrder: nextOrder });
    updateSubCategory(nextItem.categoryId, nextItem.subId, { displayOrder: currentOrder });

    try {
      await Promise.all([
        fetch(`${API_URL}/categories/${item.categoryId}/subcategories/${encodeURIComponent(item.subId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ displayOrder: nextOrder })
        }),
        fetch(`${API_URL}/categories/${nextItem.categoryId}/subcategories/${encodeURIComponent(nextItem.subId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ displayOrder: currentOrder })
        })
      ]);
    } catch (err) {}
  };

  const handleEditSubCategorySubmit = async () => {
    if (!editingSub || !editingSub.name.trim()) return;
    const { categoryId, subId, name, image, color, showOnHome, displayOrder, promoImage } = editingSub;
    const subPayload = { name: name.trim(), image, icon: image, color: color || '#10B981', showOnHome, displayOrder: Number(displayOrder) || 1, promoImage };

    updateSubCategory(categoryId, subId, subPayload);

    try {
      await fetch(`${API_URL}/categories/${categoryId}/subcategories/${encodeURIComponent(subId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(subPayload)
      });
    } catch (err) {
      console.warn('Subcategory update fallback to local state');
    }

    setEditingSub(null);
  };

  const handleToggleHomeDisplay = async (catId: string, subId: string, name: string, currentShowOnHome: boolean) => {
    const nextVal = !currentShowOnHome;
    updateSubCategory(catId, subId, { name, showOnHome: nextVal });

    try {
      await fetch(`${API_URL}/categories/${catId}/subcategories/${encodeURIComponent(subId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ showOnHome: nextVal })
      });
    } catch (err) {
      console.warn('Home display toggle fallback to local state');
    }
  };

  const handleDeleteSubCategorySubmit = async (catId: string, subId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete subcategory "${name}"?`)) return;
    deleteSubCategory(catId, subId);

    try {
      await fetch(`${API_URL}/categories/${catId}/subcategories/${encodeURIComponent(subId)}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
    } catch (err) {
      console.warn('Subcategory delete fallback to local state');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-divider gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button 
              onClick={() => navigate('/admin/categories')} 
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline transition-all cursor-pointer bg-primary/10 px-3 py-1 rounded-lg border border-primary/20"
            >
              <ArrowLeft size={13} />
              <span>Back to Categories</span>
            </button>
          </div>
          <h2 className="font-extrabold text-lg text-text-primary mt-1">
            {selectedCatFilter !== 'ALL' && currentSelectedCat
              ? `Subcategories for "${currentSelectedCat.name}"`
              : 'Subcategories Management'}
          </h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">
            Manage subcategories, upload promo images, set display order & home page visibility
          </p>
        </div>
        <button 
          onClick={() => handleOpenAdd(selectedCatFilter !== 'ALL' ? selectedCatFilter : undefined)} 
          className="flex items-center gap-1.5 bg-primary text-white font-bold py-2.5 px-5 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md"
        >
          <Plus size={15} /> Add Subcategory
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-background border border-divider">
        {/* Active Category Display Badge */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {selectedCatFilter !== 'ALL' && currentSelectedCat ? (
            <div className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-white shadow-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>{currentSelectedCat.name}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                {filteredSubCategories.length} Subcategories
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-white shadow-xs">
              All Subcategories ({subCategoriesList.length})
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search subcategory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-divider rounded-xl text-xs bg-surface text-text-primary focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* SUBCATEGORIES TABLE / LIST */}
      <div className="overflow-x-auto rounded-2xl border border-divider bg-surface">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-divider bg-background/50 text-[11px] font-extrabold text-text-secondary uppercase tracking-wider">
              <th className="p-4 w-20 text-center">Order #</th>
              <th className="p-4">Image</th>
              <th className="p-4">Subcategory Name</th>
              <th className="p-4">Parent Department</th>
              <th className="p-4">Products Mapped</th>
              <th className="p-4">Home Display</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider text-xs">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const subImgSrc = getSubCategoryImage(item.name, item.categoryName, item.image);
                return (
                  <tr key={item.subId + '_' + idx} className="hover:bg-background/40 transition-colors">
                    {/* Display Order Number */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveSubUp(item, idx)}
                            disabled={idx === 0}
                            className="p-0.5 hover:bg-background rounded text-text-secondary hover:text-primary disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveSubDown(item, idx)}
                            disabled={idx === filteredItems.length - 1}
                            className="p-0.5 hover:bg-background rounded text-text-secondary hover:text-primary disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <input 
                          type="number"
                          min="1"
                          value={item.displayOrder || idx + 1}
                          onChange={(e) => {
                            const newOrd = parseInt(e.target.value) || 1;
                            updateSubCategory(item.categoryId, item.subId, { name: item.name, displayOrder: newOrd });
                          }}
                          className="w-12 px-1.5 py-1 border border-divider rounded-xl text-xs font-extrabold text-center bg-background text-text-primary focus:outline-none focus:border-primary shadow-xs"
                          title="Edit display order position"
                        />
                      </div>
                    </td>

                    {/* Subcategory Image Thumbnail */}
                    <td className="p-4">
                      <div className="w-12 h-12 rounded-xl border border-divider overflow-hidden bg-background flex items-center justify-center p-0.5 shadow-xs">
                        <img 
                          src={subImgSrc} 
                          alt={item.name} 
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=150&auto=format&fit=crop';
                          }}
                        />
                      </div>
                    </td>

                    {/* Subcategory Name & Slug */}
                    <td className="p-4">
                      <div className="font-extrabold text-text-primary text-xs flex items-center gap-1.5">
                        <Tag size={12} className="text-primary" />
                        <span>{item.name}</span>
                      </div>
                      <div className="font-mono text-[10px] text-text-secondary mt-0.5">{item.slug}</div>
                    </td>

                    {/* Parent Department */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-background border border-divider text-text-primary">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                        {item.categoryName}
                      </span>
                    </td>

                    {/* Mapped Products */}
                    <td className="p-4 font-bold text-text-primary">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 font-extrabold text-[11px]">
                        {item.productCount} Products
                      </span>
                    </td>

                    {/* Home Page Display Toggle Switch */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleHomeDisplay(item.categoryId, item.subId, item.name, item.showOnHome)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          item.showOnHome
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/25'
                            : 'bg-surface border-divider text-text-tertiary hover:bg-background'
                        }`}
                        title="Click to toggle display on Customer Home page"
                      >
                        {item.showOnHome ? (
                          <>
                            <CheckSquare size={14} className="text-emerald-600" />
                            <span>Displayed on Home</span>
                          </>
                        ) : (
                          <>
                            <X size={14} className="text-text-tertiary" />
                            <span>Hidden from Home</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdd(item.categoryId, item)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Insert new subcategory directly after ${item.name}`}
                        >
                          <Plus size={13} />
                          <span>Insert After</span>
                        </button>
                        <button
                          onClick={() => setEditingSub({
                            categoryId: item.categoryId,
                            subId: item.subId,
                            name: item.name,
                            image: item.image || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop',
                            color: item.color || '#10B981',
                            showOnHome: item.showOnHome,
                            displayOrder: item.displayOrder || 1,
                            promoImage: item.promoImage || ''
                          })}
                          className="px-2.5 py-1.5 rounded-xl bg-background border border-divider text-[11px] font-bold text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit Subcategory"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubCategorySubmit(item.categoryId, item.subId, item.name)}
                          className="px-2.5 py-1.5 rounded-xl bg-background border border-divider text-[11px] font-bold text-text-secondary hover:text-error hover:bg-error/10 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Delete Subcategory"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-tertiary italic">
                  No subcategories found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: ADD SUBCATEGORY */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-surface border border-divider p-6 rounded-3xl shadow-2xl w-[520px] max-w-[92vw] flex flex-col gap-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-divider">
              <h3 className="font-extrabold text-base text-text-primary flex items-center gap-2">
                <Plus size={16} className="text-primary" />
                <span>Add New Subcategory</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {insertAfterSubName && (
                <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Dynamically inserting after <strong>"{insertAfterSubName}"</strong> at Position #{subOrderInput}</span>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Parent Department</label>
                <select
                  value={targetCatId}
                  onChange={(e) => setTargetCatId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background text-text-primary font-bold focus:outline-none focus:border-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Subcategory Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cold Pressed Oil, Organic Atta, Exotic Fruits..."
                  value={subNameInput}
                  onChange={(e) => setSubNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background text-text-primary font-bold focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Display Order Number (Position)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1, 2, 3..."
                  value={subOrderInput}
                  onChange={(e) => setSubOrderInput(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Subcategory Background Color & Accent Tint Input */}
              <div className="p-3 bg-background rounded-2xl border border-divider flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-primary uppercase flex items-center justify-between">
                  <span>Subcategory Background Color & Accent Tint</span>
                  <span className="text-primary font-mono text-[11px] font-bold">{subColorInput}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {[
                    { name: 'Emerald', hex: '#10B981' },
                    { name: 'Light Green', hex: '#E8F5E9' },
                    { name: 'Teal', hex: '#14B8A6' },
                    { name: 'Cyan', hex: '#06B6D4' },
                    { name: 'Sky', hex: '#0EA5E9' },
                    { name: 'Blue', hex: '#3B82F6' },
                    { name: 'Amber', hex: '#F59E0B' },
                    { name: 'Light Amber', hex: '#FFF8E1' },
                    { name: 'Rose', hex: '#F43F5E' },
                    { name: 'Purple', hex: '#8B5CF6' }
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setSubColorInput(preset.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        subColorInput === preset.hex ? 'border-primary scale-110 shadow-sm' : 'border-divider hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={`${preset.name} (${preset.hex})`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={subColorInput || '#10B981'}
                    onChange={(e) => setSubColorInput(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-divider p-1 bg-surface shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="#10B981 or #E8F5E9"
                    value={subColorInput}
                    onChange={(e) => setSubColorInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-divider rounded-xl text-xs bg-surface text-text-primary font-bold focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Subcategory Image Upload & Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Subcategory Image / Icon (Cloudinary or URL)</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="https://res.cloudinary.com/..." 
                    value={subImageInput} 
                    onChange={(e) => setSubImageInput(e.target.value)} 
                    className="flex-1 px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" 
                  />
                  <label className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors flex items-center gap-1 flex-shrink-0">
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
                              const uploadedUrl = await uploadImage(reader.result as string, 'freshcart/subcategories');
                              setSubImageInput(uploadedUrl);
                              alert('✅ Subcategory image uploaded to Cloudinary!');
                            } catch (err: any) {
                              alert('❌ Upload Error: ' + err.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Subcategory Image Preview Box */}
                {subImageInput && (
                  <div className="mt-1 flex items-center justify-between p-3 bg-background rounded-2xl border border-divider">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Image Preview:</span>
                    <div className="w-14 h-14 rounded-xl border border-divider overflow-hidden bg-surface p-0.5 shadow-sm">
                      <img 
                        src={subImageInput} 
                        alt="Subcategory Preview" 
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop'; }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Promo / Special Banner (Image Only) Field */}
              <div className="flex flex-col gap-2 p-3 bg-background rounded-2xl border border-divider">
                <label className="text-[11px] font-bold text-text-primary uppercase flex items-center gap-1">
                  <span>Promo / Special Banner (Image Only)</span>
                </label>
                <p className="text-[10px] text-text-secondary font-medium">
                  Attach a promo banner image for this subcategory. Clicking it will redirect customers to this subcategory's products.
                </p>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="https://res.cloudinary.com/... (Promo Banner URL)" 
                    value={subPromoImageInput} 
                    onChange={(e) => setSubPromoImageInput(e.target.value)} 
                    className="flex-1 px-4 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" 
                  />
                  <label className="bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer hover:bg-secondary transition-colors flex items-center gap-1 flex-shrink-0">
                    <span>Upload Promo</span>
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
                              const uploadedUrl = await uploadImage(reader.result as string, 'freshcart/promos');
                              setSubPromoImageInput(uploadedUrl);
                              alert('✅ Promo Banner image uploaded to Cloudinary!');
                            } catch (err: any) {
                              alert('❌ Upload Error: ' + err.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {subPromoImageInput && (
                  <div className="mt-1 flex items-center justify-between p-2 bg-surface rounded-xl border border-divider">
                    <span className="text-[10px] font-bold text-text-secondary">Promo Preview:</span>
                    <div className="w-24 h-12 rounded-lg border border-divider overflow-hidden bg-background shadow-xs">
                      <img src={subPromoImageInput} alt="Promo Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Display on Home Page Toggle */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-background border border-divider cursor-pointer select-none">
                <div>
                  <div className="text-xs font-extrabold text-text-primary">Display on Customer Home Page?</div>
                  <div className="text-[10px] text-text-secondary font-medium">Toggle whether this subcategory appears in the Home page chips/grid</div>
                </div>
                <input
                  type="checkbox"
                  checked={subShowOnHome}
                  onChange={(e) => setSubShowOnHome(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-divider mt-2">
              <button 
                onClick={() => setShowAddModal(false)}
                className="bg-surface text-text-secondary border border-divider font-bold py-2.5 px-5 rounded-full text-xs hover:bg-background transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSubCategorySubmit}
                className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md"
              >
                Create Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUBCATEGORY */}
      {editingSub && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSub(null); }}
        >
          <div className="bg-surface border border-divider p-6 rounded-3xl shadow-2xl w-[520px] max-w-[92vw] flex flex-col gap-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-divider">
              <h3 className="font-extrabold text-base text-text-primary flex items-center gap-2">
                <Edit2 size={16} className="text-primary" />
                <span>Edit Subcategory</span>
              </h3>
              <button 
                onClick={() => setEditingSub(null)}
                className="p-1.5 rounded-full hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Subcategory Name</label>
                <input
                  type="text"
                  value={editingSub.name}
                  onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background text-text-primary font-bold focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-secondary uppercase mb-1.5 block">Display Order Number (Position)</label>
                <input
                  type="number"
                  min="1"
                  value={editingSub.displayOrder || 1}
                  onChange={(e) => setEditingSub({ ...editingSub, displayOrder: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 border border-divider rounded-xl text-xs bg-background text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* Subcategory Background Color & Accent Tint Input */}
              <div className="p-3 bg-background rounded-2xl border border-divider flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-primary uppercase flex items-center justify-between">
                  <span>Subcategory Background Color & Accent Tint</span>
                  <span className="text-primary font-mono text-[11px] font-bold">{editingSub.color || '#10B981'}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {[
                    { name: 'Emerald', hex: '#10B981' },
                    { name: 'Light Green', hex: '#E8F5E9' },
                    { name: 'Teal', hex: '#14B8A6' },
                    { name: 'Cyan', hex: '#06B6D4' },
                    { name: 'Sky', hex: '#0EA5E9' },
                    { name: 'Blue', hex: '#3B82F6' },
                    { name: 'Amber', hex: '#F59E0B' },
                    { name: 'Light Amber', hex: '#FFF8E1' },
                    { name: 'Rose', hex: '#F43F5E' },
                    { name: 'Purple', hex: '#8B5CF6' }
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setEditingSub({ ...editingSub, color: preset.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        editingSub.color === preset.hex ? 'border-primary scale-110 shadow-sm' : 'border-divider hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={`${preset.name} (${preset.hex})`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={editingSub.color || '#10B981'}
                    onChange={(e) => setEditingSub({ ...editingSub, color: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-divider p-1 bg-surface shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="#10B981 or #E8F5E9"
                    value={editingSub.color || '#10B981'}
                    onChange={(e) => setEditingSub({ ...editingSub, color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-divider rounded-xl text-xs bg-surface text-text-primary font-bold focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              {/* Subcategory Image Upload & Field */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Subcategory Image / Icon (Cloudinary or URL)</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="https://res.cloudinary.com/..." 
                    value={editingSub.image} 
                    onChange={(e) => setEditingSub({ ...editingSub, image: e.target.value })} 
                    className="flex-1 px-4 py-2.5 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" 
                  />
                  <label className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors flex items-center gap-1 flex-shrink-0">
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
                              const uploadedUrl = await uploadImage(reader.result as string, 'freshcart/subcategories');
                              setEditingSub({ ...editingSub, image: uploadedUrl });
                              alert('✅ Subcategory image uploaded to Cloudinary!');
                            } catch (err: any) {
                              alert('❌ Upload Error: ' + err.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Subcategory Image Preview Box */}
                {editingSub.image && (
                  <div className="mt-1 flex items-center justify-between p-3 bg-background rounded-2xl border border-divider">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">Image Preview:</span>
                    <div className="w-14 h-14 rounded-xl border border-divider overflow-hidden bg-surface p-0.5 shadow-sm">
                      <img 
                        src={editingSub.image} 
                        alt="Subcategory Preview" 
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=200&auto=format&fit=crop'; }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Promo / Special Banner (Image Only) Field */}
              <div className="flex flex-col gap-2 p-3 bg-background rounded-2xl border border-divider">
                <label className="text-[11px] font-bold text-text-primary uppercase flex items-center gap-1">
                  <span>Promo / Special Banner (Image Only)</span>
                </label>
                <p className="text-[10px] text-text-secondary font-medium">
                  Attach a promo banner image for this subcategory. Clicking it will redirect customers to this subcategory's products.
                </p>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="https://res.cloudinary.com/... (Promo Banner URL)" 
                    value={editingSub.promoImage || ''} 
                    onChange={(e) => setEditingSub({ ...editingSub, promoImage: e.target.value })} 
                    className="flex-1 px-4 py-2 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" 
                  />
                  <label className="bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer hover:bg-secondary transition-colors flex items-center gap-1 flex-shrink-0">
                    <span>Upload Promo</span>
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
                              const uploadedUrl = await uploadImage(reader.result as string, 'freshcart/promos');
                              setEditingSub({ ...editingSub, promoImage: uploadedUrl });
                              alert('✅ Promo Banner image uploaded to Cloudinary!');
                            } catch (err: any) {
                              alert('❌ Upload Error: ' + err.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {editingSub.promoImage && (
                  <div className="mt-1 flex items-center justify-between p-2 bg-surface rounded-xl border border-divider">
                    <span className="text-[10px] font-bold text-text-secondary">Promo Preview:</span>
                    <div className="w-24 h-12 rounded-lg border border-divider overflow-hidden bg-background shadow-xs">
                      <img src={editingSub.promoImage} alt="Promo Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Display on Home Page Toggle */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-background border border-divider cursor-pointer select-none">
                <div>
                  <div className="text-xs font-extrabold text-text-primary">Display on Customer Home Page?</div>
                  <div className="text-[10px] text-text-secondary font-medium">Toggle whether this subcategory appears in the Home page chips/grid</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingSub.showOnHome}
                  onChange={(e) => setEditingSub({ ...editingSub, showOnHome: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-divider mt-2">
              <button 
                onClick={() => setEditingSub(null)}
                className="bg-surface text-text-secondary border border-divider font-bold py-2.5 px-5 rounded-full text-xs hover:bg-background transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSubCategorySubmit}
                className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-xs hover:bg-secondary transition-colors cursor-pointer shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// ==========================================
// 3. INVENTORY MODULE
// ==========================================
export const InventoryModule: React.FC = () => {
  const { products, updateProduct, categories } = useCMS();
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success) {
        setInventoryList(data.inventory || []);
      }
    } catch (e) {
      console.warn('Failed to fetch inventory');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAdjust = async (p: any, diff: number) => {
    const productId = p.id || p._id;
    const invItem = inventoryList.find((i: any) => 
      i.productId === p.id || i.productId === p._id || i.product === p.id || i.product === p._id
    );
    const currentQty = invItem ? invItem.stockQty : (typeof p.stock === 'number' ? p.stock : (typeof p.stock === 'object' && p.stock !== null ? (p.stock.quantity ?? 50) : 50));
    const newQty = Math.max(0, currentQty + diff);

    // Optimistic UI update for inventory list
    setInventoryList(prev => {
      const existingIdx = prev.findIndex(i => i.productId === productId || i.product === productId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], stockQty: newQty };
        return updated;
      } else {
        return [...prev, { productId, stockQty: newQty, batchNumber: 'B-MAIN-01', lowStockThreshold: 15 }];
      }
    });

    // Optimistic update in CMSContext so all other components sync stock
    updateProduct(productId, { stock: newQty });
    showToast(`Updated stock for "${p.name}" to ${newQty} units`);

    try {
      await fetch(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          productId,
          qty: diff,
          action: 'Adjustment',
          note: `Manual stock adjustment of ${diff >= 0 ? '+' : ''}${diff} units`
        })
      });
    } catch (err) {
      console.warn('Stock adjustment API failed, maintained in offline state');
    }
  };

  const handleDirectSetStock = async (p: any) => {
    const productId = p.id || p._id;
    const invItem = inventoryList.find((i: any) => 
      i.productId === p.id || i.productId === p._id || i.product === p.id || i.product === p._id
    );
    const currentQty = invItem ? invItem.stockQty : (typeof p.stock === 'number' ? p.stock : (typeof p.stock === 'object' && p.stock !== null ? (p.stock.quantity ?? 50) : 50));
    
    const input = prompt(`Enter target stock quantity for "${p.name}":`, String(currentQty));
    if (input === null) return;
    const targetQty = parseInt(input.trim(), 10);
    if (isNaN(targetQty) || targetQty < 0) {
      alert('Please enter a valid non-negative integer for stock quantity.');
      return;
    }

    const diff = targetQty - currentQty;
    if (diff === 0) return;

    await handleAdjust(p, diff);
  };

  // Helper to resolve stock qty for a product
  const getProductStock = (p: any) => {
    const invItem = inventoryList.find((i: any) => 
      i.productId === p.id || i.productId === p._id || i.product === p.id || i.product === p._id
    );
    const rawQty = invItem ? invItem.stockQty : (typeof p.stock === 'number' ? p.stock : (typeof p.stock === 'object' && p.stock !== null ? (p.stock.quantity ?? 50) : 50));
    return typeof rawQty === 'number' ? rawQty : 0;
  };

  // Filter products dynamically based on search, category & stock status
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                            p.categoryId === selectedCategory || 
                            p.category === selectedCategory;
    
    const qty = getProductStock(p);
    const matchesStock = stockFilter === 'all' ? true :
                         stockFilter === 'low' ? (qty > 0 && qty < 15) :
                         stockFilter === 'out' ? (qty === 0) : true;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Calculate inventory metrics
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => {
    const q = getProductStock(p);
    return q > 0 && q < 15;
  }).length;
  const outOfStockCount = products.filter(p => getProductStock(p) === 0).length;
  const inStockCount = totalProducts - lowStockCount - outOfStockCount;

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-toast-in">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-base text-text-primary flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary" />
            Stock Controller
          </h2>
          <p className="text-xs text-text-secondary font-medium">Monitor batch codes, expire tracking, and real-time stock levels across products</p>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchInventory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-divider bg-background hover:bg-background/80 transition-all text-xs font-bold text-text-primary self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          <span>Sync Backend</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-background border border-divider flex flex-col gap-1">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total Products</span>
          <span className="text-xl font-extrabold text-text-primary">{totalProducts}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-success/10 border border-success/20 flex flex-col gap-1">
          <span className="text-[11px] font-bold text-success uppercase tracking-wider">In Stock</span>
          <span className="text-xl font-extrabold text-success">{inStockCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/20 flex flex-col gap-1">
          <span className="text-[11px] font-bold text-warning uppercase tracking-wider">Low Stock (&lt;15)</span>
          <span className="text-xl font-extrabold text-warning">{lowStockCount}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-error/10 border border-error/20 flex flex-col gap-1">
          <span className="text-[11px] font-bold text-error uppercase tracking-wider">Out of Stock</span>
          <span className="text-xl font-extrabold text-error">{outOfStockCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background p-3 rounded-2xl border border-divider">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface border border-divider text-text-primary focus:outline-none focus:border-primary transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface border border-divider text-text-primary font-medium focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Stock Filter Tabs */}
          <div className="flex bg-surface p-1 rounded-xl border border-divider gap-1">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stockFilter === 'all' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stockFilter === 'low' ? 'bg-warning text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                stockFilter === 'out' ? 'bg-error text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto rounded-2xl border border-divider">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold text-text-secondary">
              <th className="p-3.5">Product ID</th>
              <th className="p-3.5">Product Details</th>
              <th className="p-3.5">Batch ID</th>
              <th className="p-3.5">Stock Level</th>
              <th className="p-3.5 text-right">Stock Adjustments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-secondary font-medium">
                  No products found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => {
                const invItem = inventoryList.find((i: any) => 
                  i.productId === p.id || i.productId === p._id || i.product === p.id || i.product === p._id
                );
                const qty = getProductStock(p);
                const batch = invItem?.batchNumber || `B-${(p.categoryId || 'MAIN').substring(0, 4).toUpperCase()}-01`;
                const threshold = invItem?.lowStockThreshold ?? 15;
                const isOut = qty === 0;
                const isLow = qty > 0 && qty < threshold;

                return (
                  <tr key={p.id} className="hover:bg-background/40 transition-colors">
                    {/* Product ID */}
                    <td className="p-3.5 font-mono font-bold text-primary">
                      <span className="bg-primary/10 px-2 py-1 rounded-lg text-[11px]">{p.id}</span>
                    </td>

                    {/* Product Name & Image */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.imageUrl || (p.images && p.images[0]) || p.image || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=100'} 
                          alt={p.name}
                          className="w-9 h-9 object-contain rounded-lg bg-background p-1 border border-divider flex-shrink-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-text-primary text-xs">{p.name}</span>
                          <span className="text-[10px] font-medium text-text-secondary">
                            {p.category || p.categoryId || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Batch ID */}
                    <td className="p-3.5 font-mono font-bold text-text-secondary">
                      <span className="bg-background border border-divider px-2 py-0.5 rounded text-[11px]">{batch}</span>
                    </td>

                    {/* Stock Level Badge */}
                    <td className="p-3.5 font-extrabold">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => handleDirectSetStock(p)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-105 ${
                            isOut ? 'bg-error/15 text-error border border-error/30' :
                            isLow ? 'bg-warning/15 text-warning border border-warning/30 animate-pulse' :
                            'bg-success/15 text-success border border-success/30'
                          }`}
                          title="Click to set custom stock quantity"
                        >
                          {qty} units
                        </span>
                        {isLow && (
                          <span className="text-[10px] text-warning font-semibold bg-warning/10 px-1.5 py-0.5 rounded">Low</span>
                        )}
                        {isOut && (
                          <span className="text-[10px] text-error font-semibold bg-error/10 px-1.5 py-0.5 rounded">Empty</span>
                        )}
                      </div>
                    </td>

                    {/* Fast Adjustment Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleAdjust(p, -10)} 
                          className="px-2 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 cursor-pointer font-bold text-[10px] transition-all"
                          title="Decrease by 10"
                        >
                          -10
                        </button>
                        <button 
                          onClick={() => handleAdjust(p, -5)} 
                          className="px-2 py-1 rounded-lg bg-error/15 text-error hover:bg-error/25 cursor-pointer font-bold text-[10px] transition-all"
                          title="Decrease by 5"
                        >
                          -5
                        </button>
                        <button 
                          onClick={() => handleAdjust(p, -1)} 
                          className="px-2 py-1 rounded-lg bg-error/20 text-error hover:bg-error/30 cursor-pointer font-bold text-[10px] transition-all"
                          title="Decrease by 1"
                        >
                          -1
                        </button>

                        <button 
                          onClick={() => handleDirectSetStock(p)} 
                          className="px-2 py-1 rounded-lg bg-background border border-divider text-text-primary hover:bg-surface cursor-pointer font-bold text-[10px] transition-all mx-0.5"
                          title="Set exact stock value"
                        >
                          Set
                        </button>

                        <button 
                          onClick={() => handleAdjust(p, 1)} 
                          className="px-2 py-1 rounded-lg bg-success/20 text-success hover:bg-success/30 cursor-pointer font-bold text-[10px] transition-all"
                          title="Increase by 1"
                        >
                          +1
                        </button>
                        <button 
                          onClick={() => handleAdjust(p, 5)} 
                          className="px-2 py-1 rounded-lg bg-success/15 text-success hover:bg-success/25 cursor-pointer font-bold text-[10px] transition-all"
                          title="Increase by 5"
                        >
                          +5
                        </button>
                        <button 
                          onClick={() => handleAdjust(p, 10)} 
                          className="px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20 cursor-pointer font-bold text-[10px] transition-all"
                          title="Increase by 10"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 5. CUSTOMERS MODULE
// ==========================================
export const CustomersModule: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchCustomersAndOrders = async () => {
    try {
      const authHeader = getAuthHeader();
      const [cRes, oRes] = await Promise.all([
        fetch(`${API_URL}/customers`, { headers: authHeader }),
        fetch(`${API_URL}/orders`, { headers: authHeader })
      ]);
      const cData = await cRes.json();
      const oData = await oRes.json();
      if (cData.success) setCustomers(cData.customers || []);
      if (oData.success) setOrders(oData.orders || []);
    } catch (e) {
      console.warn('Failed to fetch customers and orders');
    }
  };

  useEffect(() => {
    fetchCustomersAndOrders();
  }, []);

  const handleWalletAdjust = async (id: string) => {
    const amt = prompt('Enter wallet balance adjustment amount (₹):', '100');
    if (amt === null) return;
    const num = Number(amt);
    if (isNaN(num)) return;

    try {
      const res = await fetch(`${API_URL}/customers/${id}/wallet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          amount: Math.abs(num),
          type: num >= 0 ? 'Credit' : 'Debit',
          description: 'Wallet adjusted by administrator'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(prev => prev.map(c => c.customerId === id ? { ...c, walletBalance: data.walletBalance } : c));
        alert('Wallet balance updated successfully on backend!');
      } else {
        alert('Failed to update wallet: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Wallet adjustment failed.');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="pb-3 border-b border-divider">
        <h2 className="font-extrabold text-sm text-text-primary">Customers Registry</h2>
        <p className="text-[10px] text-text-secondary font-medium">Adjust wallets, review membership hierarchies, and track timelines</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold">
              <th className="p-3">Customer ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Membership</th>
              <th className="p-3">Total Orders</th>
              <th className="p-3">Wallet Balance</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const custOrders = orders.filter(o => o.customerId === c.customerId).length;
              const isVip = c.membershipType === 'VIP';
              return (
                <tr key={c.customerId} className="border-b border-divider hover:bg-background/20 transition-all">
                  <td className="p-3 font-mono font-bold text-primary">{c.customerId}</td>
                  <td className="p-3">
                    <div className="font-extrabold text-text-primary">{c.name}</div>
                    <div className="text-[10px] text-text-secondary">{c.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isVip ? 'text-amber-600 bg-amber-500/10' : 'text-text-secondary bg-background border border-divider'}`}>
                      {isVip ? '⭐ VIP Premium' : 'Regular Member'}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-text-secondary">{custOrders} orders</td>
                  <td className="p-3 font-extrabold text-text-primary">₹{c.walletBalance}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleWalletAdjust(c.customerId)} className="text-primary hover:underline font-bold text-[10px] cursor-pointer">Adjust Wallet</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 6. DELIVERY MODULE
// ==========================================
export const DeliveryModule: React.FC = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchRiders = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.employees) {
        setRiders(data.employees.filter((e: any) => e.role === 'Delivery'));
      }
    } catch (e) {
      console.warn('Failed to fetch riders');
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || 'delivery123',
          role: 'Delivery'
        })
      });
      const data = await res.json();
      if (data.success) {
        setRiders(prev => [...prev, data.employee]);
        alert('Delivery rider registered successfully on backend!');
      } else {
        alert('Failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to register rider.');
    }

    setName('');
    setEmail('');
    setPassword('');
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this rider from the fleet?')) return;

    try {
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setRiders(prev => prev.filter(r => r._id !== id));
        alert('Rider removed successfully!');
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">Delivery Fleet Dispatcher</h2>
          <p className="text-[10px] text-text-secondary font-medium">Assign dark store riders and check coverage zones</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary cursor-pointer">
          <Plus size={12} /> Add Rider
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-background p-4 rounded-2xl border border-divider flex flex-col gap-3">
          <h3 className="font-bold text-xs">Add Rider Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Rider Name" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
            <input type="password" placeholder="Password (default: delivery123)" value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="bg-surface text-text-secondary border border-divider font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riders.map(r => (
          <div key={r._id} className="p-4 border border-divider rounded-2xl bg-background flex flex-col gap-2 shadow-sm relative group">
            <button 
              onClick={() => handleDelete(r._id)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface border border-divider text-text-secondary hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Remove Rider"
            >
              <Trash2 size={11} />
            </button>
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-xs text-text-primary">🚴 {r.name}</span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full text-success bg-success/10">Active Fleet</span>
            </div>
            <div className="text-[10px] text-text-secondary font-semibold mt-1">
              <div>Email: {r.email}</div>
              <div>Status: Available</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmployeesModule: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.employees) {
        setEmployees(data.employees);
      }
    } catch (e) {
      console.warn('Failed to fetch employees');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || 'staff123',
          role
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(prev => [...prev, data.employee]);
        alert('Employee created successfully on backend!');
      } else {
        alert('Failed to save employee: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to create employee profile.');
    }

    setName('');
    setEmail('');
    setPassword('');
    setRole('Employee');
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this employee profile?')) return;

    try {
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(prev => prev.filter(emp => emp._id !== id));
        alert('Employee deleted successfully!');
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">Corporate Employees Registry</h2>
          <p className="text-[10px] text-text-secondary font-medium">Add, update, and manage permissions of administrative system users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary cursor-pointer">
          <Plus size={12} /> Add Employee
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-background p-4 rounded-2xl border border-divider flex flex-col gap-3">
          <h3 className="font-bold text-xs">Register Staff Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
            <input type="password" placeholder="Password (default: staff123)" value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-bold">
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
              <option value="Delivery">Delivery Rider</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="bg-surface text-text-secondary border border-divider font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id} className="border-b border-divider hover:bg-background/20 transition-all">
                <td className="p-3 font-extrabold text-text-primary">{emp.name}</td>
                <td className="p-3 font-semibold text-text-secondary">{emp.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    emp.role === 'Admin' ? 'text-rose-600 bg-rose-500/10' :
                    emp.role === 'Manager' ? 'text-amber-600 bg-amber-500/10' : 'text-blue-600 bg-blue-500/10'
                  }`}>
                    🛡️ {emp.role}
                  </span>
                </td>
                <td className="p-3"><span className="text-[10px] text-success font-bold">Active</span></td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(emp._id)} className="text-error hover:underline font-bold text-[10px] cursor-pointer">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 8. COUPONS & OFFERS MODULE
// ==========================================
export const CouponsModule: React.FC = () => {
  const { coupons, addCoupon, deleteCoupon } = useCMS();
  const [code, setCode] = useState('');
  const [val, setVal] = useState(50);
  const [minOrder, setMinOrder] = useState(499);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setCode('');
    setVal(50);
    setMinOrder(499);
    setShowForm(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCoupon(c);
    setCode(c.code);
    setVal(c.value || 50);
    setMinOrder(c.minOrder || 499);
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    const couponData = {
      code: code.toUpperCase().trim(),
      discount: `₹${val} OFF`,
      description: 'Coupon promo offer',
      minOrder: Number(minOrder),
      value: Number(val),
      isPercent: false
    };

    if (editingCoupon) {
      try {
        const res = await fetch(`${API_URL}/coupons/${editingCoupon.code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(couponData)
        });
        const data = await res.json();
        if (data.success) {
          alert('Coupon updated successfully on backend!');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to update coupon.');
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/coupons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(couponData)
        });
        const data = await res.json();
        if (data.success) {
          addCoupon(data.coupon || couponData);
          alert(`Coupon code '${code.toUpperCase()}' created on backend!`);
        }
      } catch (err) {
        addCoupon(couponData);
        alert(`Coupon code '${code.toUpperCase()}' added locally!`);
      }
    }

    setCode('');
    setEditingCoupon(null);
    setShowForm(false);
  };

  const handleDelete = async (couponCode: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const res = await fetch(`${API_URL}/coupons/${couponCode}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        deleteCoupon(couponCode);
        alert('Coupon deleted on backend!');
      }
    } catch (err) {
      deleteCoupon(couponCode);
      alert('Coupon deleted locally!');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">Promo Codes Engine</h2>
          <p className="text-[10px] text-text-secondary font-medium">Create promotional vouchers and adjust savings rules</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center gap-1 bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary cursor-pointer">
          <Plus size={12} /> Add Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-background p-4 border border-divider rounded-2xl">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary">Coupon Code</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MONSOON40" className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary uppercase font-bold" required disabled={!!editingCoupon} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary">Flat Value Amount (₹)</label>
            <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-bold" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-secondary">Min Order threshold (₹)</label>
            <input type="number" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary font-bold" required />
          </div>
          <div className="flex gap-2 self-end h-9">
            <button type="submit" className="bg-primary text-white font-bold text-xs rounded-xl px-4 flex-1 hover:bg-secondary cursor-pointer">Save</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingCoupon(null); }} className="bg-surface text-text-secondary border border-divider font-bold text-xs rounded-xl px-4 flex-1 cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold">
              <th className="p-3">Coupon Code</th>
              <th className="p-3">Discount Details</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.code} className="border-b border-divider hover:bg-background/20 transition-all">
                <td className="p-3 font-bold text-text-primary font-mono">{c.code}</td>
                <td className="p-3 font-semibold text-text-secondary">{c.discount} • Min order: ₹{c.minOrder}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <button onClick={() => handleOpenEdit(c)} className="text-primary hover:underline font-bold text-[10px] cursor-pointer">Edit</button>
                  <button onClick={() => handleDelete(c.code)} className="text-error hover:underline font-bold text-[10px] cursor-pointer">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CMSModule: React.FC = () => {
  const { blogs, deleteBlog, addBlog, updateBlog } = useCMS();
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop');
  const [category, setCategory] = useState('Nutrition');

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleOpenAdd = () => {
    setEditingBlog(null);
    setTitle('');
    setExcerpt('');
    setContent('');
    setCover('https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop');
    setCategory('Nutrition');
    setShowForm(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBlog(b);
    setTitle(b.title);
    setExcerpt(b.excerpt || '');
    setContent(b.content || '');
    setCover(b.coverImage || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop');
    setCategory(b.category || 'Nutrition');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      coverImage: cover.trim(),
      category: category,
      author: {
        name: 'FreshCart Editorial',
        role: 'Verified Nutritionist',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
      }
    };

    if (editingBlog) {
      try {
        const res = await fetch(`${API_URL}/blogs/${editingBlog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          updateBlog(editingBlog.id, data.blog || payload);
          alert('Article updated on backend!');
          window.location.reload();
        }
      } catch (err) {
        alert('Offline fallback update.');
      }
    } else {
      const newId = 'blog_' + Date.now();
      const newBlog = {
        ...payload,
        id: newId,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        comments: [],
        readTime: '5 min read'
      };
      try {
        const res = await fetch(`${API_URL}/blogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(newBlog)
        });
        const data = await res.json();
        if (data.success) {
          addBlog(data.blog || newBlog);
          alert('Article created on backend!');
          window.location.reload();
        }
      } catch (err) {
        addBlog(newBlog);
        alert('Article created locally!');
      }
    }

    setShowForm(false);
    setEditingBlog(null);
  };

  const handleDeleteBlog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;

    try {
      const res = await fetch(`${API_URL}/blogs/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        deleteBlog(id);
        alert('Article deleted successfully on backend!');
      }
    } catch (err) {
      deleteBlog(id);
      alert('Article deleted locally!');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">CMS & Blog Publisher</h2>
          <p className="text-[10px] text-text-secondary font-medium">Update health blogs and customer sitemaps</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center gap-1 bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary cursor-pointer">
          <Plus size={12} /> Add Article
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-background p-4 border border-divider rounded-2xl flex flex-col gap-3">
          <h3 className="font-bold text-xs">{editingBlog ? 'Edit Article' : 'Publish Article'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" required />
            <input type="text" placeholder="Category (e.g. Nutrition)" value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
            <input type="text" placeholder="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary sm:col-span-2" />
            <input type="text" placeholder="Cover Image URL" value={cover} onChange={(e) => setCover(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary sm:col-span-2" />
            <textarea placeholder="Article Content..." value={content} onChange={(e) => setContent(e.target.value)} className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary sm:col-span-2 h-24" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Publish</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingBlog(null); }} className="bg-surface text-text-secondary border border-divider font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3">
        {blogs.map(b => (
          <div key={b.id} className="p-4 border border-divider rounded-2xl bg-background flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-3">
              <img src={b.coverImage} alt={b.title} className="w-12 h-12 object-cover rounded-xl bg-white border border-divider" />
              <div>
                <div className="font-extrabold text-xs text-text-primary line-clamp-1">{b.title}</div>
                <div className="text-[9px] text-text-secondary font-semibold mt-0.5">{b.author?.name} • {b.date} • {b.category}</div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => handleOpenEdit(b)} className="p-2 rounded-xl hover:bg-primary/10 text-text-secondary hover:text-primary cursor-pointer"><Edit2 size={13} /></button>
              <button onClick={() => handleDeleteBlog(b.id)} className="p-2 rounded-xl hover:bg-error/10 text-text-secondary hover:text-error cursor-pointer"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FinanceModule: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchPaidOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.warn('Failed to fetch paid orders');
    }
  };

  useEffect(() => {
    fetchPaidOrders();
  }, []);

  const transactions = orders.map((o: any) => ({
    txId: 'TXN-' + o.orderId.slice(-5).toUpperCase(),
    order: o.orderId,
    method: o.paymentMethod || 'COD',
    amt: o.grandTotal,
    status: o.paymentStatus || 'Pending',
    date: new Date(o.createdAt).toLocaleTimeString() + ' ' + new Date(o.createdAt).toLocaleDateString()
  }));

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="pb-3 border-b border-divider">
        <h2 className="font-extrabold text-sm text-text-primary">Finance Transaction Ledger</h2>
        <p className="text-[10px] text-text-secondary font-medium">Verify daily transaction records, taxes, and settlements</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold">
              <th className="p-3">Transaction ID</th>
              <th className="p-3">Order ID</th>
              <th className="p-3">Gateway & Method</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.txId} className="border-b border-divider hover:bg-background/20 transition-all">
                <td className="p-3 font-mono font-bold text-text-primary">{tx.txId}</td>
                <td className="p-3 font-extrabold text-primary">{tx.order}</td>
                <td className="p-3 font-semibold text-text-secondary">{tx.method}</td>
                <td className="p-3 font-extrabold text-text-primary">₹{tx.amt}</td>
                <td className={`p-3 font-bold ${tx.status === 'Paid' ? 'text-success' : 'text-warning'}`}>{tx.status}</td>
                <td className="p-3 text-right text-text-secondary font-semibold">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 12. ANALYTICS MODULE
// ==========================================
export const AnalyticsModule: React.FC = () => {
  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="pb-3 border-b border-divider">
        <h2 className="font-extrabold text-sm text-text-primary">Hyperlocal Sales Trend</h2>
        <p className="text-[10px] text-text-secondary font-medium">Visual heatmaps and stock forecast trajectories</p>
      </div>

      <div className="h-[200px] w-full flex items-end relative pt-4">
        <svg className="w-full h-full" viewBox="0 0 600 200">
          <line x1="0" y1="50" x2="600" y2="50" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="600" y2="100" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="0" y1="150" x2="600" y2="150" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />

          {/* Bar Chart Bars */}
          <rect x="35" y="80" width="30" height="120" fill="#4CAF50" rx="4" />
          <rect x="115" y="50" width="30" height="150" fill="#4CAF50" rx="4" />
          <rect x="195" y="110" width="30" height="90" fill="#4CAF50" rx="4" />
          <rect x="275" y="70" width="30" height="130" fill="#4CAF50" rx="4" />
          <rect x="355" y="120" width="30" height="80" fill="#4CAF50" rx="4" />
          <rect x="435" y="40" width="30" height="160" fill="#4CAF50" rx="4" />
          <rect x="515" y="90" width="30" height="110" fill="#4CAF50" rx="4" />
        </svg>
      </div>
      <div className="flex justify-between px-6 text-[9px] font-bold text-text-secondary mt-1">
        <span>Bengaluru (Central)</span>
        <span>Bengaluru (South)</span>
        <span>Mumbai (West)</span>
        <span>Delhi NCR</span>
      </div>
    </div>
  );
};

// ==========================================
// 13. REVIEWS MODULE
// ==========================================
export const ReviewsModule: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews`);
      const data = await res.json();
      if (data.success && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (e) {
      console.warn('Failed to fetch reviews');
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/reviews/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setReviews(prev => prev.map(r => r._id === id ? { ...r, status: newStatus } : r));
        alert(`Review ${newStatus.toLowerCase()} successfully!`);
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setReviews(prev => prev.filter(r => r._id !== id));
        alert('Review deleted.');
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="pb-3 border-b border-divider">
        <h2 className="font-extrabold text-sm text-text-primary">Customer Review Moderation</h2>
        <p className="text-[10px] text-text-secondary font-medium">Moderate incoming product reviews and feedback</p>
      </div>

      <div className="flex flex-col gap-4">
        {reviews.map(r => (
          <div key={r._id} className="p-4 border border-divider rounded-2xl bg-background flex flex-col gap-3 relative shadow-sm group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg bg-surface border border-divider text-text-secondary hover:text-error hover:bg-error/10 cursor-pointer" title="Delete Review"><Trash2 size={11} /></button>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-xs text-text-primary">{r.customerName || 'Anonymous Customer'}</span>
                <span className="text-[10px] text-text-secondary font-semibold ml-2">item: {r.productId}</span>
              </div>
              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${r.status === 'Approved' ? 'text-success bg-success/10' : r.status === 'Rejected' ? 'text-error bg-error/10' : 'text-warning bg-warning/10'}`}>{r.status}</span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} className={i < r.rating ? 'fill-warning text-warning' : 'text-divider'} />
              ))}
            </div>
            <p className="text-xs text-text-secondary font-medium leading-relaxed italic">"{r.comment}"</p>
            <div className="flex gap-2">
              {r.status !== 'Approved' && (
                <button onClick={() => handleStatusUpdate(r._id, 'Approved')} className="bg-primary text-white font-bold py-1 px-4 rounded-full text-[10px] cursor-pointer">Approve Review</button>
              )}
              {r.status !== 'Rejected' && (
                <button onClick={() => handleStatusUpdate(r._id, 'Rejected')} className="bg-surface border border-divider text-text-secondary font-bold py-1 px-4 rounded-full text-[10px] cursor-pointer hover:bg-error/10 hover:text-error">Reject Review</button>
              )}
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-xs text-text-secondary italic text-center py-4">No reviews submitted yet.</p>
        )}
      </div>
    </div>
  );
};

export const SupportModule: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/support/tickets`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.tickets) {
        setTickets(data.tickets);
        if (data.tickets.length > 0 && !activeTicket) {
          setActiveTicket(data.tickets[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch tickets');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    try {
      const res = await fetch(`${API_URL}/support/tickets/${activeTicket.ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          sender: 'Agent',
          content: replyText.trim(),
          status: 'In Progress'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveTicket(data.ticket);
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      alert('Failed to send reply.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`${API_URL}/support/tickets/${activeTicket.ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setActiveTicket(data.ticket);
        alert(`Ticket status updated to ${newStatus}!`);
        fetchTickets();
      }
    } catch (err) {
      alert('Status update failed.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-surface border border-divider p-4 rounded-[28px] shadow-card flex flex-col gap-4 h-[450px]">
        <h3 className="font-extrabold text-xs text-text-primary pb-2 border-b border-divider">Support Tickets Registry</h3>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 custom-scrollbar">
          {tickets.map(t => (
            <div 
              key={t.ticketId} 
              onClick={() => setActiveTicket(t)}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                activeTicket?.ticketId === t.ticketId ? 'border-primary bg-primary/5' : 'border-divider hover:bg-background/40'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-text-primary">{t.ticketId}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                  t.status === 'Resolved' ? 'text-success bg-success/10' : 'text-error bg-error/10'
                }`}>{t.status}</span>
              </div>
              <div className="font-extrabold text-xs text-text-primary mt-1 line-clamp-1">{t.subject}</div>
              <div className="text-[10px] text-text-secondary mt-0.5">{t.customerName}</div>
            </div>
          ))}
          {tickets.length === 0 && (
            <p className="text-xs text-text-secondary italic text-center py-4">No active tickets.</p>
          )}
        </div>
      </div>

      <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6 h-[450px] md:col-span-2">
        {activeTicket ? (
          <>
            <div className="pb-3 border-b border-divider flex justify-between items-center">
              <div>
                <h2 className="font-extrabold text-sm text-text-primary">{activeTicket.subject}</h2>
                <p className="text-[10px] text-text-secondary font-medium">Customer: {activeTicket.customerName} • Ticket ID: {activeTicket.ticketId}</p>
              </div>
              <div className="flex gap-2">
                <select 
                  value={activeTicket.status} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-2.5 py-1 border border-divider rounded-xl text-[10px] font-bold bg-background text-text-primary focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-2 bg-background border border-divider rounded-2xl custom-scrollbar">
              {activeTicket.messages?.map((chat: any, idx: number) => (
                <div key={idx} className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold leading-relaxed flex flex-col gap-1 ${
                  chat.sender === 'Customer' 
                    ? 'bg-surface border border-divider self-start rounded-tl-none' 
                    : 'bg-primary text-white self-end rounded-tr-none'
                }`}>
                  <span>{chat.content}</span>
                  <span className={`text-[8px] font-bold mt-1 self-end ${chat.sender === 'Customer' ? 'text-text-tertiary' : 'text-white/80'}`}>
                    {new Date(chat.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
              <input 
                type="text" 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type agent reply to customer..." 
                className="flex-grow px-4 py-2 border border-divider rounded-full text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-medium"
                required 
              />
              <button type="submit" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-secondary cursor-pointer transition-all"><Send size={15} /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-text-secondary italic">Select a ticket to begin resolution</div>
        )}
      </div>
    </div>
  );
};

export const AuditLogsModule: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit-logs`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all system audit logs?')) return;
    try {
      const res = await fetch(`${API_URL}/audit-logs`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
        alert('Audit log trail successfully cleared.');
      }
    } catch (e) {
      alert('Clear logs operation failed.');
    }
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-divider">
        <div>
          <h2 className="font-extrabold text-sm text-text-primary">System Audit Log Trail</h2>
          <p className="text-[10px] text-text-secondary font-medium">Audit logs recording administrative user actions</p>
        </div>
        <button onClick={handleClearLogs} className="bg-error/15 text-error hover:bg-error/20 border border-error/20 font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">
          Clear Log Trail
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-background border-b border-divider font-bold">
              <th className="p-3">Actor / Admin</th>
              <th className="p-3">Action Type</th>
              <th className="p-3">Action Summary Details</th>
              <th className="p-3">IP Address</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx} className="border-b border-divider hover:bg-background/20 transition-all">
                <td className="p-3 font-extrabold text-text-primary">{log.userName || log.userId}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase">{log.action}</span></td>
                <td className="p-3 font-semibold text-text-secondary">{log.details}</td>
                <td className="p-3 font-mono font-semibold text-text-tertiary">{log.ipAddress || 'Internal'}</td>
                <td className="p-3 text-right text-text-secondary font-semibold">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-text-secondary italic">No audit logs logged in trail.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SettingsModule: React.FC = () => {
  const [bName, setBName] = useState('FreshCart Enterprise India');
  const [bEmail, setBEmail] = useState('contact@freshcart.in');
  const [apiKey, setApiKey] = useState('rzp_live_8F0aK912h83Gka');

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.settings) {
        setBName(data.settings.businessName || 'FreshCart Enterprise India');
        setBEmail(data.settings.supportEmail || 'contact@freshcart.in');
        setApiKey(data.settings.gatewayKeys?.razorpayId || 'rzp_live_8F0aK912h83Gka');
      }
    } catch (e) {
      console.warn('Failed to load settings from server');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          businessName: bName,
          supportEmail: bEmail,
          gatewayKeys: {
            razorpayId: apiKey
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Enterprise settings successfully updated on database!');
        fetchSettings();
      }
    } catch (err) {
      alert('Save operation failed.');
    }
  };

  const handleBackup = () => {
    alert('DB backup snapshot requested. Creating cloud backup compression...');
  };

  return (
    <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-6">
      <div className="pb-3 border-b border-divider">
        <h2 className="font-extrabold text-sm text-text-primary">General Enterprise Settings</h2>
        <p className="text-[10px] text-text-secondary font-medium">Update tax percent, gateway keys, and initiate backups</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-text-primary">Registered Business Name</label>
            <input type="text" value={bName} onChange={(e) => setBName(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-bold" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-text-primary">Support Dispatcher Email</label>
            <input type="email" value={bEmail} onChange={(e) => setBEmail(e.target.value)} className="w-full px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary" required />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-text-primary">Razorpay Live API Token Key</label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 text-text-secondary" size={15} />
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-mono" required />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-2">
          <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-full text-xs hover:bg-secondary cursor-pointer shadow-sm">Save Configuration</button>
          <button type="button" onClick={handleBackup} className="flex items-center gap-1.5 border border-divider hover:border-primary/20 bg-background hover:bg-primary/5 py-2 px-6 rounded-full text-xs font-bold text-primary cursor-pointer transition-all"><RefreshCw size={14} /> Back Up Database</button>
        </div>
      </form>
    </div>
  );
};
