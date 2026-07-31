import React, { useState, useMemo } from 'react';
import { useCMS, Product } from '../context/CMSContext';
import { ProductCard } from '../components/ProductCard';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface BrandsProps {
  onQuickView: (product: Product) => void;
}

export const Brands: React.FC<BrandsProps> = ({ onQuickView }) => {
  const { products } = useCMS();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Static brand registry with premium metadata
  const brandRegistry = [
    { name: 'Earth Greens', desc: 'Certified chemical-free organic leaf spinach, broccoli crowns, and fresh organic greens.', location: 'Hosur Cooperative Farms', certs: 'USDA Organic, India Organic', rating: 4.8 },
    { name: 'FarmDirect', desc: 'Fresh farm-harvested daily vegetables, carrots, vine-ripened tomatoes, and essential root crops.', location: 'Malur Agriculture Board', certs: 'ISO 22000, Farm Audit Passed', rating: 4.6 },
    { name: 'Golden Farms', desc: 'Raw unpasteurized forest wildflower honey, natural oils, and sweet nectars.', location: 'Nilgiri Bee Farms', certs: 'FSSAI Grade A, 100% Raw', rating: 4.9 },
    { name: 'Bakehouse', desc: 'Artisanal local bakers baking natural yeast sourdough loaves and cookies daily.', location: 'Indiranagar Craft Bakery', certs: 'Fresh Baked Standard', rating: 4.8 },
    { name: 'DairyGold', desc: 'Grass-fed cow milk butter, high-protein Greek yogurts, and fresh farm paneer.', location: 'Nandi Hills Cooperatives', certs: 'NABL Certified Milk', rating: 4.7 },
    { name: 'NutriBites', desc: 'Dry-roasted cashew packs, whole almonds, and premium trail nut mixtures.', location: 'Kollam Nut Processors', certs: 'Premium Import Quality', rating: 4.6 },
    { name: 'SeaFresh', desc: 'Atlantic freshwater salmon fillets and premium frozen clean prawns.', location: 'Kochi Deepsea Hub', certs: 'HACCP Safety Standards', rating: 4.9 },
    { name: 'MeatMaster', desc: 'Skinless lean chicken breasts and mutton chops cut from pasture-raised lambs.', location: 'Hosuri Poultry Cooperative', certs: 'Halal Certified, Vet Inspected', rating: 4.8 }
  ];

  // Derive products list for chosen brand
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return products.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
  }, [products, selectedBrand]);

  const activeBrandDetails = useMemo(() => {
    if (!selectedBrand) return null;
    return brandRegistry.find((b) => b.name.toLowerCase() === selectedBrand.toLowerCase()) || {
      name: selectedBrand,
      desc: 'Premium fresh goods partner and verified supplier of FreshCart groceries.',
      location: 'Local Agriculture Board',
      certs: 'Verified Quality',
      rating: 4.7
    };
  }, [selectedBrand]);

  return (
    <div className="page-wrapper">
      <SEO 
        title={selectedBrand ? `${selectedBrand} Partner Farm | FreshCart` : 'Our Partner Brands & Cooperatives | FreshCart'}
        description="Meet the local organic cooperative farmers, artisanal bakers, and grass-fed dairies that harvest daily for FreshCart."
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-8 pb-16">
        <AnimatePresence mode="wait">
          {!selectedBrand ? (
            /* BRAND LISTING VIEW */
            <motion.div
              key="listing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Our Trusted Partners</h1>
                <p className="text-sm text-text-secondary">We partner with certified organic cooperatives and craft bakeries to guarantee freshness.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {brandRegistry.map((brand, idx) => (
                  <motion.div
                    key={brand.name}
                    className="bg-surface border border-divider rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer shadow-card hover:-translate-y-1 hover:shadow-premium hover:border-primary transition-all duration-200"
                    onClick={() => setSelectedBrand(brand.name)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg mb-4">
                      {brand.name[0]}
                    </div>
                    <h3 className="text-base font-extrabold text-text-primary mb-1">{brand.name}</h3>
                    <p className="text-xs text-text-secondary leading-normal mb-4">{brand.desc}</p>
                    <div className="flex flex-col gap-1 text-[10px] text-text-secondary font-semibold">
                      <span>📍 {brand.location}</span>
                      <span>⭐ {brand.rating} Rating</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* BRAND DETAIL VIEW */
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button className="flex items-center gap-1.5 text-sm font-bold text-primary mb-8 hover:underline" onClick={() => setSelectedBrand(null)}>
                <ArrowLeft size={16} />
                <span>Back to Partner Brands</span>
              </button>

              {activeBrandDetails && (
                <div className="flex flex-col md:flex-row gap-6 bg-surface p-6 rounded-2xl border border-divider shadow-card items-start md:items-center">
                  <div className="bg-primary/10 text-primary flex items-center justify-center font-bold w-20 h-20 text-3xl rounded-2xl flex-shrink-0">
                    {activeBrandDetails.name[0]}
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-text-primary">{activeBrandDetails.name}</h1>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{activeBrandDetails.desc}</p>
                    
                    <div className="flex gap-4 mt-4 text-xs flex-wrap">
                      <span className="bg-background px-3 py-1 rounded-md text-text-secondary">📍 Origin: <strong className="text-text-primary">{activeBrandDetails.location}</strong></span>
                      <span className="bg-background px-3 py-1 rounded-md text-text-secondary">🛡️ Audits: <strong className="text-text-primary">{activeBrandDetails.certs}</strong></span>
                      <span className="bg-background px-3 py-1 rounded-md text-text-secondary">⭐ Score: <strong className="text-text-primary">{activeBrandDetails.rating}/5.0</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <h2 className="text-xl font-extrabold text-text-primary my-8 font-display">
                Products Supplied by {activeBrandDetails?.name}
              </h2>

              {brandProducts.length === 0 ? (
                <div className="bg-surface p-12 rounded-2xl border border-divider text-center shadow-card">
                  <p className="text-sm text-text-secondary">No active catalog items are currently linked to this brand.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {brandProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} onQuickView={onQuickView} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
