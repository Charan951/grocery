import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FestivalCampaign, CampaignSubcategory } from '../context/CMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FestivalPatternLayer } from './festival/FestivalPatternLayer';
import { FestivalElementsLayer } from './festival/FestivalElementsLayer';
import { FestivalBottomDecoration } from './festival/FestivalBottomDecoration';

interface FestivalCampaignWrapperProps {
  campaign: FestivalCampaign;
}

export const FestivalCampaignWrapper: React.FC<FestivalCampaignWrapperProps> = ({ campaign }) => {
  const navigate = useNavigate();

  if (!campaign || campaign.isActive === false) return null;

  const {
    name,
    title,
    subtitle,
    backgroundType = 'gradient',
    backgroundColor = '#DFF4E8',
    gradientStart = '#E8F6EF',
    gradientEnd = '#C2E8D3',
    gradientDirection = 'to bottom',
    backgroundImage,
    backgroundPattern = 'floral',
    patternOpacity = 0.10,
    patternScale = 'medium',
    decorativeElements = [],
    titleConfig,
    theme,
    content,
    specialSubcategories,
    featuredItems,
    featuredBannerTitle,
    bottomDecoration = 'scallop'
  } = campaign;

  // Background Style Assembly
  let bgStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || '#DFF4E8'
  };

  if (backgroundType === 'gradient') {
    bgStyle = {
      background: `linear-gradient(${gradientDirection || 'to bottom'}, ${gradientStart || '#E8F6EF'}, ${gradientEnd || '#C2E8D3'})`
    };
  } else if (backgroundType === 'image' && backgroundImage?.url) {
    bgStyle = {
      backgroundImage: `url("${backgroundImage.url}")`,
      backgroundPosition: theme?.backgroundPosition || 'center top',
      backgroundSize: theme?.backgroundSize || 'cover',
      backgroundColor: backgroundColor || '#800040'
    };
  }

  const textColor = titleConfig?.textColor || theme?.textColor || '#1B4D3E';
  const accentColor = theme?.accentColor || '#2E7D32';
  const cardBgColor = (theme?.cardBackground && theme.cardBackground !== 'rgba(255, 255, 255, 0.18)' && theme.cardBackground !== 'rgba(255, 255, 255, 0.15)')
    ? theme.cardBackground
    : '#FFF9E6';
  const cardTextColor = theme?.cardTextColor || '#1B4D3E';
  const cardRadius = theme?.cardBorderRadius || '18px';

  // Featured Banner Item List
  const bannerItemList = (featuredItems && featuredItems.length > 0)
    ? featuredItems
    : (specialSubcategories || []).map((sub, i) => ({
      name: sub.title,
      originalPrice: i === 0 ? '499' : i === 1 ? '350' : '599',
      offerPrice: i === 0 ? '199' : i === 1 ? '149' : '299',
      image: sub.image?.url || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=400&auto=format&fit=crop',
      link: `/products?search=${encodeURIComponent(sub.subcategoryId || sub.title)}`
    }));

  const [activeItemIndex, setActiveItemIndex] = useState(0);

  useEffect(() => {
    if (bannerItemList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveItemIndex((prev) => (prev + 1) % bannerItemList.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [bannerItemList.length]);

  const activeFeaturedItem = bannerItemList[activeItemIndex] || bannerItemList[0];
  const sortedSubcategories = [...(specialSubcategories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleCardClick = (sub: CampaignSubcategory) => {
    if (!sub) return;
    const searchTarget = encodeURIComponent(sub.subcategoryId || sub.title);
    navigate(`/products?search=${searchTarget}`);
  };

  return (
    <section className="relative w-full overflow-hidden transition-all duration-300 min-h-[360px]">
      {/* 1. Base Background Layer (Solid / Gradient / Image) */}
      <div
        className="absolute inset-0 z-0 bg-no-repeat transition-all duration-500"
        style={bgStyle}
      />

      {/* 2. Pattern Layer Overlay */}
      <FestivalPatternLayer
        pattern={backgroundPattern}
        opacity={patternOpacity}
        scale={patternScale}
        color={textColor}
      />

      {/* 3. Layered Decorative Elements with Element-Specific Animations */}
      <FestivalElementsLayer elements={decorativeElements} />

      {/* 4. Festival Content Container */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-3 sm:px-6 pt-[var(--sticky-header-h,140px)] pb-3">

        {/* Campaign Header / Title */}
        <div className="flex flex-col items-center text-center my-2 sm:my-4 relative px-2">
          <div className="flex items-center justify-center gap-2 w-full mb-0.5">
            <svg className="w-6 h-4 opacity-90" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C22 8 30 14 38 14C32 20 24 24 20 30C16 24 8 20 2 14C10 14 18 8 20 0Z" fill={accentColor} />
            </svg>
            <span
              className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] font-serif"
              style={{ color: accentColor }}
            >
              CELEBRATE
            </span>
            <svg className="w-6 h-4 opacity-90" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C22 8 30 14 38 14C32 20 24 24 20 30C16 24 8 20 2 14C10 14 18 8 20 0Z" fill={accentColor} />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs opacity-80 font-serif" style={{ color: accentColor }}>◇</span>
            <h2
              className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm leading-tight text-center ${titleConfig?.fontStyle === 'modern' ? 'font-sans' : 'font-serif'
                }`}
              style={{ color: textColor }}
            >
              {titleConfig?.title || content?.heading || title}
            </h2>
            <span className="text-xs opacity-80 font-serif" style={{ color: accentColor }}>◇</span>
          </div>

          {(titleConfig?.subtitle || content?.subtitle || subtitle) && (
            <p
              className="mt-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider max-w-md opacity-95 drop-shadow-xs"
              style={{ color: accentColor }}
            >
              {titleConfig?.subtitle || content?.subtitle || subtitle}
            </p>
          )}
        </div>

        {/* 5. Blinkit Featured Top Banner Card */}
        <div
          className="w-full max-w-2xl mx-auto mb-3 rounded-2xl border border-black/10 shadow-md overflow-hidden relative transition-all"
          style={{
            backgroundColor: cardBgColor,
            borderRadius: cardRadius
          }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#1B4D3E_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="grid grid-cols-12 items-center p-3 sm:p-4 min-h-[110px] sm:min-h-[135px] relative z-10">
            <div className="col-span-7 flex flex-col justify-center pr-2">
              <span
                className="text-[10px] sm:text-xs font-black uppercase tracking-wider font-serif mb-1 opacity-80"
                style={{ color: cardTextColor }}
              >
                {featuredBannerTitle || 'EXPLORE ALL SPECIALS'}
              </span>

              {activeFeaturedItem && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItemIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col"
                  >
                    <h3
                      className="text-xs sm:text-sm md:text-base font-extrabold font-serif line-clamp-1 leading-snug"
                      style={{ color: cardTextColor }}
                    >
                      {activeFeaturedItem.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-1.5">
                      {activeFeaturedItem.originalPrice && (
                        <span className="text-[11px] font-bold text-gray-500 line-through">
                          ₹{activeFeaturedItem.originalPrice}
                        </span>
                      )}
                      {activeFeaturedItem.offerPrice && (
                        <span
                          className="px-2 py-0.5 rounded-md text-white text-[11px] font-black uppercase shadow-2xs"
                          style={{ backgroundColor: accentColor }}
                        >
                          ₹{activeFeaturedItem.offerPrice}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="col-span-5 h-20 sm:h-28 flex items-center justify-end relative overflow-hidden">
              {activeFeaturedItem?.image && (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeItemIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    src={activeFeaturedItem.image}
                    alt={activeFeaturedItem.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md"
                  />
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* 6. Blinkit 4-Column Compact Grid */}
        {sortedSubcategories.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 mt-2">
            {sortedSubcategories.slice(0, 4).map((sub, idx) => {
              const imgUrl = sub.image?.url || 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=300&auto=format&fit=crop';

              return (
                <motion.div
                  key={sub._id || `sub_card_${idx}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCardClick(sub)}
                  className="col-span-1 relative cursor-pointer group flex flex-col items-center justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-black/10 min-h-[105px] sm:min-h-[130px] p-1.5 sm:p-2 gap-1"
                  style={{
                    backgroundColor: cardBgColor,
                    borderRadius: cardRadius
                  }}
                >
                  <div className="text-center flex flex-col items-center shrink-0">
                    <span
                      className="text-[10px] sm:text-xs font-black font-serif line-clamp-2 leading-tight tracking-tight"
                      style={{ color: cardTextColor }}
                    >
                      {sub.title}
                    </span>
                    {sub.badge && (
                      <span
                        className="mt-0.5 px-1 py-0.2 rounded text-[8px] font-black uppercase"
                        style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
                      >
                        {sub.badge}
                      </span>
                    )}
                  </div>

                  <div className="relative w-full flex-1 min-h-[55px] sm:min-h-[75px] flex items-center justify-center overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={sub.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow-xs"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=300&auto=format&fit=crop';
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Optional CTA Button */}
        {content?.ctaText && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => {
                if (content.ctaLink) {
                  navigate(content.ctaLink);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF'
              }}
            >
              <span>{content.ctaText}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>

      {/* 7. Bottom Decorative Border */}
      <FestivalBottomDecoration type={bottomDecoration} accentColor={accentColor} />
    </section>
  );
};
