import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FestivalCampaign, useCMS } from '../context/CMSContext';
import { PREDEFINED_FESTIVAL_THEMES } from '../pages/AdminCMS';

interface FestivalCampaignWrapperProps {
  campaign: FestivalCampaign;
  currentSuperCatId?: string;
  onQuickView?: (product: any) => void;
}

export const FestivalCampaignWrapper: React.FC<FestivalCampaignWrapperProps> = ({
  campaign,
  currentSuperCatId
}) => {
  const navigate = useNavigate();
  const { products } = useCMS();

  // 1. Strictly MOBILE ONLY: Hide entirely on Desktop Web (screen width >= 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) {
    return null; // Festival theme continuous section is strictly for Mobile
  }

  if (!campaign || campaign.isActive === false || campaign.status === 'draft') {
    return null;
  }

  // Strict Date/Time Bounds Check
  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);
  if (now < start || now > end) {
    return null;
  }

  // Scope check
  if (currentSuperCatId) {
    const scopes = campaign.applicableSuperCategories || ['all'];
    const appliesToAll = scopes.includes('all') || scopes.includes('sc_all') || scopes.includes('All');
    if (!appliesToAll && !scopes.includes(currentSuperCatId)) {
      return null;
    }
  }

  const themePreset = PREDEFINED_FESTIVAL_THEMES[campaign.themeKey || 'krishna'] || PREDEFINED_FESTIVAL_THEMES.krishna;
  const styling = campaign.cardStyling || {};

  const bgStyle: React.CSSProperties = campaign.backgroundType === 'solid'
    ? { backgroundColor: campaign.backgroundColor || '#800040' }
    : campaign.backgroundType === 'gradient'
    ? { background: `linear-gradient(${campaign.gradientDirection || 'to bottom'}, ${campaign.gradientStart || '#800040'}, ${campaign.gradientEnd || '#58002C'})` }
    : { background: `linear-gradient(to bottom, ${themePreset.gradientStart || '#800040'}, ${themePreset.gradientEnd || '#58002C'})` };

  const cardBg = styling.cardBackground || '#FFF9E6';
  const cardTextColor = styling.textColor || '#4A001F';
  const accentColor = styling.accentColor || '#F6C453';

  const groups = campaign.festivalGroups || [];

  // Map product groups to cards
  const displayGroups = groups.length > 0 ? groups : [
    { id: 'fg_pooja', displayName: 'Pooja Essentials', products: [], discountPercent: 30 },
    { id: 'fg_naivedyam', displayName: 'Naivedyam Essentials', products: [], discountPercent: 20 },
    { id: 'fg_thamboolam', displayName: 'Thamboolam Needs', products: [], discountPercent: 15 },
    { id: 'fg_sweets', displayName: 'Indian Sweets', products: [], discountPercent: 25 },
    { id: 'fg_festive', displayName: 'Festive Ready', products: [], discountPercent: 20 }
  ];

  const firstGroup = displayGroups[0];
  const rightGridGroups = displayGroups.slice(1, 5);

  // Get sample product or image for a group
  const getGroupDetails = (grp: any) => {
    const groupProducts = (grp.products || [])
      .map((pid: string) => products.find((p) => p.id === pid || p._id === pid))
      .filter(Boolean);

    const firstProd = groupProducts[0];
    const image = firstProd?.imageUrl || firstProd?.image || 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop';
    const mrp = firstProd?.mrp || firstProd?.price || 70;
    const discount = grp.discountPercent || 20;
    const offerPrice = firstProd?.price ? Math.round(firstProd.price * (1 - discount / 100)) : Math.round(mrp * (1 - discount / 100));

    return { image, mrp, offerPrice, title: grp.displayName, prodName: firstProd?.name || 'Special Item' };
  };

  const leftCard = getGroupDetails(firstGroup);

  return (
    <section className="relative w-full overflow-hidden transition-all duration-300 pt-2 pb-0" style={bgStyle}>
      <div className="relative z-10 w-full px-3 pt-2 pb-4 flex flex-col gap-3">

        {/* Blinkit Style Header Header: — CELEBRATE — Varalakshmi Vratham */}
        <div className="flex flex-col items-center text-center my-1">
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <span className="text-xs text-amber-300 opacity-90 font-serif">◇</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200 font-serif">
              CELEBRATE
            </span>
            <span className="text-xs text-amber-300 opacity-90 font-serif">◇</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-100 font-serif leading-tight drop-shadow-md">
            {campaign.name}
          </h2>
        </div>

        {/* Optional Banner */}
        {campaign.enableBanner && campaign.bannerImage && (
          <div
            onClick={() => {
              if (campaign.bannerLink) navigate(campaign.bannerLink);
            }}
            className="w-full rounded-2xl overflow-hidden shadow-md border border-white/20 mb-2"
          >
            <img src={campaign.bannerImage} alt={campaign.name} className="w-full h-auto max-h-[140px] object-cover" />
          </div>
        )}

        {/* Blinkit 2-Column Section Layout: Tall Card on Left + 2x2 Grid on Right */}
        <div className="grid grid-cols-12 gap-2.5 items-stretch min-h-[260px]">

          {/* Left Column: 1 Tall Featured Card (Pooja Essentials) */}
          <div
            onClick={() => navigate('/products')}
            className="col-span-5 rounded-2xl p-2.5 flex flex-col justify-between shadow-md relative overflow-hidden border border-black/10 cursor-pointer active:scale-98 transition-transform"
            style={{ backgroundColor: '#FEEAA7' }}
          >
            <div className="flex flex-col">
              <h3 className="font-extrabold text-sm font-serif leading-tight text-center" style={{ color: cardTextColor }}>
                {leftCard.title}
              </h3>

              <div className="flex flex-col items-center mt-2">
                <span className="text-[10px] font-extrabold text-gray-600 line-through">
                  ₹{leftCard.mrp}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-gray-900 font-black text-xs shadow-2xs mt-0.5">
                  ₹{leftCard.offerPrice}
                </span>
                <span className="text-[10px] font-bold text-gray-700 line-clamp-1 mt-1 text-center">
                  {leftCard.prodName}
                </span>
              </div>
            </div>

            <div className="w-full h-28 flex items-center justify-center overflow-hidden mt-1">
              <img
                src={leftCard.image}
                alt={leftCard.title}
                className="max-h-full max-w-full object-contain filter drop-shadow-sm"
              />
            </div>
          </div>

          {/* Right Column: 2x2 Grid of Cards */}
          <div className="col-span-7 grid grid-cols-2 gap-2">
            {rightGridGroups.map((grp, idx) => {
              const details = getGroupDetails(grp);
              return (
                <div
                  key={grp.id || idx}
                  onClick={() => navigate('/products')}
                  className="rounded-2xl p-2 flex flex-col justify-between shadow-sm relative overflow-hidden border border-black/10 cursor-pointer active:scale-98 transition-transform min-h-[120px]"
                  style={{ backgroundColor: cardBg }}
                >
                  <h4 className="font-extrabold text-[11px] font-serif leading-tight text-center line-clamp-2" style={{ color: cardTextColor }}>
                    {details.title}
                  </h4>

                  <div className="w-full h-16 flex items-center justify-center overflow-hidden mt-1">
                    <img
                      src={details.image}
                      alt={details.title}
                      className="max-h-full max-w-full object-contain filter drop-shadow-2xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scallop Arch Ornamental Border at Bottom */}
      <div className="w-full overflow-hidden leading-none relative z-10 text-white">
        <svg className="w-full h-5" viewBox="0 0 1200 30" preserveAspectRatio="none" fill="currentColor">
          <path d="M0,0 C30,20 60,20 90,0 C120,20 150,20 180,0 C210,20 240,20 270,0 C300,20 330,20 360,0 C390,20 420,20 450,0 C480,20 510,20 540,0 C570,20 600,20 630,0 C660,20 690,20 720,0 C750,20 780,20 810,0 C840,20 870,20 900,0 C930,20 960,20 990,0 C1020,20 1050,20 1080,0 C1110,20 1140,20 1170,0 C1200,20 1230,20 1260,0 L1200,30 L0,30 Z" />
        </svg>
      </div>
    </section>
  );
};
