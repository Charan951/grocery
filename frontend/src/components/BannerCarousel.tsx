import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banner, useCMS } from '../context/CMSContext';

interface BannerCarouselProps {
  banners: Banner[];
  autoSlideInterval?: number; // milliseconds, default 3000
  aspectRatioClass?: string;
  className?: string;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  banners = [],
  autoSlideInterval = 3000,
  aspectRatioClass = "h-[180px] sm:h-[220px] md:h-[260px] lg:h-[280px] w-full",
  className = ""
}) => {
  const { setActiveHeroBannerIndex } = useCMS();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter valid banners with images
  const validBanners = banners.filter((b) => b && (b.imageUrl || b.title));

  // Sync current index with global context
  useEffect(() => {
    setActiveHeroBannerIndex(currentIndex);
  }, [currentIndex, setActiveHeroBannerIndex]);

  // Reset index if banners array changes or index gets out of bounds
  useEffect(() => {
    if (currentIndex >= validBanners.length && validBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [validBanners.length, currentIndex]);

  // Auto slide interval (every 3 seconds)
  useEffect(() => {
    if (validBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validBanners.length);
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [validBanners.length, autoSlideInterval, currentIndex]);

  if (validBanners.length === 0) return null;

  // Single Banner Display (No pagination dots or auto-slide needed)
  if (validBanners.length === 1) {
    const banner = validBanners[0];
    return (
      <div className={`mb-4 sm:mb-6 w-full rounded-none sm:rounded-2xl md:sm:rounded-3xl overflow-hidden border-none shadow-none relative ${aspectRatioClass} ${className}`}>
        <Link 
          to={banner.linkUrl || '/products'} 
          className="block w-full h-full cursor-pointer group relative"
          title={banner.title || 'Special Offer'}
        >
          <img 
            src={banner.imageUrl} 
            alt={banner.title || 'Promo Banner'} 
            className="w-full h-full block rounded-none sm:rounded-2xl md:sm:rounded-3xl object-cover object-center group-hover:scale-[1.005] transition-transform duration-300"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />

          {/* Banner Image */}
        </Link>
      </div>
    );
  }

  const currentBanner = validBanners[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validBanners.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validBanners.length);
  };

  return (
    <div className={`mb-4 sm:mb-6 w-full flex flex-col items-center ${className}`}>
      {/* Main Banner Slide Container */}
      <div className={`relative w-full rounded-none sm:rounded-2xl md:sm:rounded-3xl overflow-hidden border-none shadow-none ${aspectRatioClass} group`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner.id || currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full relative"
          >
            <Link 
              to={currentBanner.linkUrl || '/products'} 
              className="block w-full h-full cursor-pointer relative"
              title={currentBanner.title || 'Special Offer'}
            >
              <img 
                src={currentBanner.imageUrl} 
                alt={currentBanner.title || 'Promo Banner'} 
                className="w-full h-full block rounded-none sm:rounded-2xl md:sm:rounded-3xl object-cover object-center group-hover:scale-[1.005] transition-transform duration-300"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Previous Button (visible on hover) */}
        <button
          onClick={handlePrev}
          aria-label="Previous Slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs z-10 cursor-pointer shadow-md"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Next Button (visible on hover) */}
        <button
          onClick={handleNext}
          aria-label="Next Slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs z-10 cursor-pointer shadow-md"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Pagination Dots Indicator (● ○ ○ ○ ○) */}
      <div className="flex items-center justify-center gap-2 mt-2.5 mb-1">
        {validBanners.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to banner slide ${idx + 1}`}
              className={`transition-all duration-300 cursor-pointer flex items-center justify-center ${
                isActive 
                  ? 'w-3.5 h-3.5 bg-emerald-600 text-emerald-600 rounded-full scale-110 shadow-sm ring-2 ring-emerald-500/20' 
                  : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 rounded-full'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
