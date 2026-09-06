import React from 'react';
import { useCMS, defaultSuperCategories } from '../context/CMSContext';
import { resolveFestivalTheme } from '../utils/festivalThemeResolver';
import {
  LayoutGrid, Coffee, Armchair, Shapes, Leaf, Headphones, Smartphone,
  Sparkles, Shirt, Utensils, ChevronRight, ChevronLeft
} from 'lucide-react';

interface SuperCategoryNavProps {
  activeSuperCategory: string;
  onSelectSuperCategory: (slug: string) => void;
}

function getSuperCatIcon(name: string, iconKey?: string) {
  const k = `${iconKey || ''} ${name || ''}`.toLowerCase();
  if (k.includes('grid') || k.includes('all')) return LayoutGrid;
  if (k.includes('coffee') || k.includes('cafe')) return Coffee;
  if (k.includes('decor') || k.includes('chair') || k.includes('home') || k.includes('furniture') || k.includes('sofa')) return Armchair;
  if (k.includes('toy') || k.includes('shape') || k.includes('game')) return Shapes;
  if (k.includes('leaf') || k.includes('fresh') || k.includes('eco')) return Leaf;
  if (k.includes('headphone') || k.includes('electronic')) return Headphones;
  if (k.includes('mobile') || k.includes('phone') || k.includes('smartphone')) return Smartphone;
  if (k.includes('sparkle') || k.includes('beauty')) return Sparkles;
  if (k.includes('shirt') || k.includes('fashion') || k.includes('hanger') || k.includes('cloth')) return Shirt;
  return LayoutGrid;
}

export const SuperCategoryNav: React.FC<SuperCategoryNavProps> = ({
  activeSuperCategory,
  onSelectSuperCategory,
}) => {
  const { superCategories, activeFestivalCampaign } = useCMS();

  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isFestivalActive = isMobile && activeFestivalCampaign && activeFestivalCampaign.isActive !== false && activeFestivalCampaign.status !== 'draft';

  const items = React.useMemo(() => {
    const list = superCategories && superCategories.length > 0 ? superCategories : defaultSuperCategories;
    return list
      .filter((sc) => sc.active !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [superCategories]);

  const navRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0, ready: false });

  const [pending, setPending] = React.useState<string | null>(null);
  const effectiveActive = pending ?? activeSuperCategory;
  React.useEffect(() => { setPending(null); }, [activeSuperCategory]);

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      navRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const activeIndex = React.useMemo(
    () => items.findIndex((cat) => {
      const s = cat.slug || cat.id || cat.name.toLowerCase();
      return effectiveActive === s || (effectiveActive === '' && s === 'all');
    }),
    [items, effectiveActive]
  );

  const syncIndicator = React.useCallback((scroll: boolean) => {
    const track = navRef.current;
    const el = btnRefs.current[activeIndex];
    if (!track || !el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    if (scroll) {
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      if (left < track.scrollLeft || right > track.scrollLeft + track.clientWidth) {
        track.scrollTo({ left: left - track.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => syncIndicator(true));
    return () => cancelAnimationFrame(raf);
  }, [syncIndicator, items.length]);

  React.useEffect(() => {
    const onResize = () => syncIndicator(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncIndicator]);

  const [isScrolledPastFestival, setIsScrolledPastFestival] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile || !isFestivalActive) {
      setIsScrolledPastFestival(false);
      return;
    }
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setIsScrolledPastFestival(window.scrollY > 140);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, isFestivalActive]);

  const festivalTheme = React.useMemo(() => resolveFestivalTheme(activeFestivalCampaign), [activeFestivalCampaign]);

  const navBgColor = React.useMemo(() => {
    if (isFestivalActive && isMobile) {
      return isScrolledPastFestival ? '#ffffff' : festivalTheme.gStart;
    }
    return undefined;
  }, [isFestivalActive, isMobile, isScrolledPastFestival, festivalTheme]);

  return (
    <nav
      className={`w-full sticky z-30 transition-colors border-b shadow-2xs ${
        isFestivalActive && !isScrolledPastFestival
          ? 'border-cyan-200/40' 
          : 'border-gray-200 dark:border-zinc-800'
      }`}
      style={{
        backgroundColor: navBgColor,
        top: 'var(--sticky-header-h, 64px)'
      }}
    >
      <div className="max-w-[1280px] mx-auto px-2 sm:px-4 lg:px-8 relative flex items-center group">
        
        {/* Left Arrow Button for Desktop Scroll */}
        <button
          onClick={() => scrollNav('left')}
          className="hidden md:flex absolute left-1 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-md border border-gray-200 dark:border-zinc-700 items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          aria-label="Scroll Left"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Scrollable Container */}
        <div
          ref={navRef}
          className={`relative w-full flex items-center overflow-x-auto scrollbar-none scroll-smooth ${
            isMobile ? 'py-1 gap-1 h-[56px]' : 'py-1.5 sm:py-2 px-1 gap-1 sm:gap-2 md:gap-3'
          }`}
        >
          {/* Desktop Sliding active-tab underline */}
          {!isMobile && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 h-[3px] rounded-t-full bg-emerald-600 dark:bg-emerald-500"
              style={{
                left: indicator.left + 14,
                width: Math.max(indicator.width - 28, 0),
                opacity: indicator.ready ? 1 : 0,
                transition: 'left 280ms cubic-bezier(0.4, 0, 0.2, 1), width 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease',
              }}
            />
          )}

          {items.map((cat, i) => {
            const catSlug = cat.slug || cat.id || cat.name.toLowerCase();
            const isActive = effectiveActive === catSlug || (effectiveActive === '' && catSlug === 'all');

            // Resolve icon using exact match helper matching images #3 & #4
            const IconComponent = getSuperCatIcon(cat.name, cat.icon);

            if (isMobile) {
              const activeColorClass = isFestivalActive ? 'text-black' : 'text-[#0C831F]';
              const activeBgClass = isFestivalActive ? 'bg-black' : 'bg-[#0C831F]';

              return (
                <button
                  key={cat.id || catSlug}
                  ref={(el) => { btnRefs.current[i] = el; }}
                  onClick={() => {
                    if (catSlug === effectiveActive) return;
                    setPending(catSlug);
                    onSelectSuperCategory(catSlug);
                  }}
                  className="flex flex-col items-center justify-center h-full min-w-[62px] px-1.5 cursor-pointer border-none bg-transparent shrink-0 select-none group"
                >
                  {/* Icon on TOP */}
                  {cat.icon && cat.icon.startsWith('http') ? (
                    <img
                      src={cat.icon}
                      alt={cat.name}
                      className="w-5 h-5 object-contain"
                    />
                  ) : (
                    <IconComponent
                      size={20}
                      fill={isActive && (cat.name.toLowerCase().includes('cafe') || cat.icon === 'Coffee') ? 'currentColor' : 'none'}
                      className={`transition-colors duration-200 ${
                        isActive ? activeColorClass : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  )}

                  {/* Name BELOW Icon */}
                  <span
                    className={`text-[10.5px] leading-tight mt-0.5 truncate max-w-[68px] text-center ${
                      isActive
                        ? `font-extrabold ${activeColorClass}`
                        : 'font-medium text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {cat.name}
                  </span>

                  {/* Active Underline Indicator */}
                  <span
                    className={`h-[2.5px] rounded-full mt-0.5 transition-all duration-200 ${
                      isActive ? `w-7 ${activeBgClass}` : 'w-0 bg-transparent'
                    }`}
                  />
                </button>
              );
            }

            // Desktop Layout (Pills)
            return (
              <button
                key={cat.id || catSlug}
                ref={(el) => { btnRefs.current[i] = el; }}
                onClick={() => {
                  if (catSlug === effectiveActive) return;
                  setPending(catSlug);
                  onSelectSuperCategory(catSlug);
                }}
                className={`relative group inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-black transition-all duration-200 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? 'text-white bg-gray-900 shadow-xs'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {cat.icon && cat.icon.startsWith('http') ? (
                  <img
                    src={cat.icon}
                    alt={cat.name}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain"
                  />
                ) : (
                  <IconComponent
                    size={15}
                    className={`transition-transform duration-200 ${
                      isActive ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                )}
                <span className="tracking-tight whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button for Desktop Scroll */}
        <button
          onClick={() => scrollNav('right')}
          className="hidden md:flex absolute right-1 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow-md border border-gray-200 dark:border-zinc-700 items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          aria-label="Scroll Right"
        >
          <ChevronRight size={16} />
        </button>

      </div>
    </nav>
  );
};
