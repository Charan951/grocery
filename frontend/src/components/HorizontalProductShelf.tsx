import React, { useRef } from 'react';
import { Product } from '../context/CMSContext';
import { ProductCard } from './ProductCard';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HorizontalProductShelfProps {
  title: string;
  subtitle?: string;
  products: Product[];
  onQuickView?: (product: any) => void;
  seeAllLink?: string;
  categoryColor?: string;
  id?: string;
  className?: string;
}

export const HorizontalProductShelf: React.FC<HorizontalProductShelfProps> = ({
  title,
  subtitle,
  products,
  onQuickView = () => {},
  seeAllLink,
  categoryColor,
  id,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section id={id} className={`w-full relative group/shelf ${className}`}>
      {/* Shelf Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2.5">
          {categoryColor && (
            <span
              className="w-1.5 h-6 rounded-full shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
          )}
          <div>
            <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight font-display">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-text-secondary font-medium mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="text-xs font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
          >
            <span>See All</span>
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* Container with Navigation Arrows */}
      <div className="relative w-full">
        {/* Left Arrow Button (Desktop Web) */}
        <button
          onClick={() => handleScroll('left')}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700 items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover/shelf:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Scroll Left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow Button (Desktop Web) */}
        <button
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700 items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover/shelf:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Scroll Right"
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Horizontal Product Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-2 flex-nowrap scroll-smooth px-0.5"
        >
          {products.map((product, pIdx) => (
            <div
              key={product.id || `p_${pIdx}`}
              className="w-[125px] sm:w-[135px] md:w-[142px] shrink-0"
            >
              <ProductCard product={product} onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
