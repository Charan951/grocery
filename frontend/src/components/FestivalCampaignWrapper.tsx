import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FestivalCampaign, useCMS } from '../context/CMSContext';
import { resolveFestivalTheme } from '../utils/festivalThemeResolver';
import { ChevronRight } from 'lucide-react';

interface FestivalCampaignWrapperProps {
  campaign: FestivalCampaign;
  currentSuperCatId?: string;
  onQuickView?: (product: any) => void;
}

const DEFAULT_GROUP_IMAGES = [
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&auto=format&fit=crop', // Gifts
  'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=400&auto=format&fit=crop', // Sweets
  'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop', // Pooja Essentials
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop'  // Flowers
];

export const FestivalCampaignWrapper: React.FC<FestivalCampaignWrapperProps> = ({
  campaign,
  currentSuperCatId
}) => {
  const navigate = useNavigate();
  const { products = [] } = useCMS();

  // Mobile viewport check
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const theme = useMemo(() => resolveFestivalTheme(campaign), [campaign]);

  if (!isMobile) return null;
  if (!campaign || campaign.isActive === false || campaign.status === 'draft') return null;

  // Date check
  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);
  if (now < start || now > end) return null;

  // Scope check
  if (currentSuperCatId) {
    const scopes = campaign.applicableSuperCategories || ['all'];
    const appliesToAll = scopes.includes('all') || scopes.includes('sc_all') || scopes.includes('All');
    if (!appliesToAll && !scopes.includes(currentSuperCatId)) {
      return null;
    }
  }

  const groups = campaign.festivalGroups || [];

  const displayGroups = groups.length > 0 ? groups : [
    { id: 'fg_gifts', displayName: 'Gifts', discountPercent: 50 },
    { id: 'fg_sweets', displayName: 'sweets', discountPercent: 20 },
    { id: 'fg_pooja', displayName: 'pooja essentials', discountPercent: 10 },
    { id: 'fg_flowers', displayName: 'flowers', discountPercent: 5 }
  ];

  return (
    <section 
      className="w-full pt-3 pb-0 relative transition-colors duration-300"
      style={{ backgroundColor: theme.gStart }}
    >
      <div className="max-w-4xl mx-auto px-3 flex flex-col items-center">
        
        {/* Festival Title Block: ✨ CELEBRATE ✨ krishnashtami (Matching Flutter festival_campaign_section.dart) */}
        <div className="flex flex-col items-center text-center mb-3">
          <div 
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em]"
            style={{ color: theme.accent }}
          >
            <span>{theme.emoji}</span>
            <span>CELEBRATE</span>
            <span>{theme.emoji}</span>
          </div>
          <h2 
            className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-0.5 font-serif italic drop-shadow-2xs"
            style={{ color: theme.text }}
          >
            {campaign.name || 'krishnashtami'}
          </h2>
        </div>

        {/* 4 Group Cards Row Layout (Matching Flutter _buildSingleGroupCard 1:1) */}
        <div className="grid grid-cols-4 gap-2 w-full mb-3">
          {displayGroups.slice(0, 4).map((grp: any, idx: number) => {
            // Resolve image for this specific group
            let groupImg = grp.image || grp.imageUrl || '';
            if (!groupImg && Array.isArray(grp.products) && grp.products.length > 0) {
              const matchedProd = products.find(p => p.id === grp.products[0] || p._id === grp.products[0]);
              if (matchedProd) {
                groupImg = matchedProd.imageUrl || matchedProd.image || '';
              }
            }
            if (!groupImg) {
              groupImg = DEFAULT_GROUP_IMAGES[idx % DEFAULT_GROUP_IMAGES.length];
            }

            const discount = grp.discountPercent || 0;

            return (
              <div
                key={grp.id || grp.displayName || idx}
                onClick={() => navigate('/products')}
                className="relative h-[125px] rounded-2xl overflow-hidden shadow-xs cursor-pointer active:scale-95 transition-all bg-gray-100 group"
                style={{ borderColor: theme.cardBorder }}
              >
                {/* Full-bleed background image */}
                <img
                  src={groupImg}
                  alt={grp.displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Dark gradient overlay at bottom for crisp title legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* Discount Badge at Top Right */}
                {discount > 0 && (
                  <div 
                    className="absolute top-1.5 right-1.5 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-2xs"
                    style={{ backgroundColor: theme.btn }}
                  >
                    {discount}% OFF
                  </div>
                )}

                {/* Content at Bottom Left & Chevron Circle Button at Bottom Right */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between gap-1">
                  <span className="text-[10px] font-black text-white leading-tight line-clamp-2 drop-shadow-sm flex-1">
                    {grp.displayName}
                  </span>
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ChevronRight size={11} className="text-gray-900" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Scallop Arch Transition (24 repeating quadratic arches matching Flutter _ScallopPainter) */}
      <div className="w-full overflow-hidden leading-none">
        <svg className="w-full h-3.5 text-white fill-current block" viewBox="0 0 1200 24" preserveAspectRatio="none">
          <path d="M0,24 Q25,0 50,24 Q75,0 100,24 Q125,0 150,24 Q175,0 200,24 Q225,0 250,24 Q275,0 300,24 Q325,0 350,24 Q375,0 400,24 Q425,0 450,24 Q475,0 500,24 Q525,0 550,24 Q575,0 600,24 Q625,0 650,24 Q675,0 700,24 Q725,0 750,24 Q775,0 800,24 Q825,0 850,24 Q875,0 900,24 Q925,0 950,24 Q975,0 1000,24 Q1025,0 1050,24 Q1075,0 1100,24 Q1125,0 1150,24 Q1175,0 1200,24 L1200,24 L0,24 Z" />
        </svg>
      </div>
    </section>
  );
};
