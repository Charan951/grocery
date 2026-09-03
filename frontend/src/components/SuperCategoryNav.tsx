import React from 'react';
import { useCMS, SuperCategory, defaultSuperCategories } from '../context/CMSContext';
import {
  LayoutGrid, Coffee, Leaf, Home, Headphones, Smartphone,
  Sparkles, Shirt, Gamepad2, Utensils, Gift, ShoppingBag,
  Apple, Milk, Wheat, IceCream, Candy, ChevronRight, ChevronLeft
} from 'lucide-react';

interface SuperCategoryNavProps {
  activeSuperCategory: string; // slug or id, e.g. 'all', 'cafe', 'fresh'
  onSelectSuperCategory: (slug: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  Coffee,
  Leaf,
  Home,
  Headphones,
  Smartphone,
  Sparkles,
  Shirt,
  Gamepad2,
  Utensils,
  Gift,
  ShoppingBag,
  Apple,
  Milk,
  Wheat,
  IceCream,
  Candy,
};

export const SuperCategoryNav: React.FC<SuperCategoryNavProps> = ({
  activeSuperCategory,
  onSelectSuperCategory,
}) => {
  const { superCategories, activeFestivalCampaign } = useCMS();

  // Use super categories list sorted by displayOrder
  const items = React.useMemo(() => {
    const list = superCategories && superCategories.length > 0 ? superCategories : defaultSuperCategories;
    return list
      .filter((sc) => sc.active !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [superCategories]);

  const navRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0, ready: false });

  // Optimistic selection: highlight + slide the underline the instant a tab is
  // tapped, without waiting for the parent's route change to re-render and feed
  // back a new `activeSuperCategory` prop. Cleared once the prop catches up.
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

  // Slide the underline to the active tab. Measurement + any scroll is deferred
  // to the next frame (never in a layout effect) so it can't stall the click.
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

  const [isMobile, setIsMobile] = React.useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isFestivalActive = React.useMemo(() => {
    if (!isMobile) return false;
    if (!activeFestivalCampaign || activeFestivalCampaign.isActive === false || activeFestivalCampaign.status === 'draft') return false;
    const now = new Date();
    const start = new Date(activeFestivalCampaign.startDate);
    const end = new Date(activeFestivalCampaign.endDate);
    return now >= start && now <= end;
  }, [isMobile, activeFestivalCampaign]);

  return (
    <nav
      className={`w-full sticky z-30 transition-colors ${
        isFestivalActive
          ? 'bg-transparent border-none shadow-none'
          : 'bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-2xs'
      }`}
      style={{ top: 'var(--sticky-header-h, 64px)' }}
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
          className="relative w-full flex items-center gap-1 sm:gap-2 md:gap-3 overflow-x-auto scrollbar-none py-1.5 sm:py-2 px-1 scroll-smooth"
        >
          {/* Sliding active-tab underline */}
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-0 h-[3px] rounded-t-full ${
              isFestivalActive ? 'bg-white' : 'bg-emerald-600 dark:bg-emerald-500'
            }`}
            style={{
              left: indicator.left + 14,
              width: Math.max(indicator.width - 28, 0),
              opacity: indicator.ready ? 1 : 0,
              transition: 'left 280ms cubic-bezier(0.4, 0, 0.2, 1), width 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease',
            }}
          />
          {items.map((cat, i) => {
            const catSlug = cat.slug || cat.id || cat.name.toLowerCase();
            const isActive = effectiveActive === catSlug || (effectiveActive === '' && catSlug === 'all');

            // Resolve icon
            const IconComponent = ICON_MAP[cat.icon] || (catSlug === 'all' ? LayoutGrid : Utensils);

            return (
              <button
                key={cat.id || catSlug}
                ref={(el) => { btnRefs.current[i] = el; }}
                onClick={() => {
                  if (catSlug === effectiveActive) return;
                  setPending(catSlug);            // instant highlight + underline
                  onSelectSuperCategory(catSlug); // parent routes (wrapped in a transition)
                }}
                className={`relative group inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 select-none ${
                  isFestivalActive
                    ? isActive
                      ? 'text-white bg-white/20 shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : isActive
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                {/* Icon rendering */}
                {cat.icon && cat.icon.startsWith('http') ? (
                  <img
                    src={cat.icon}
                    alt={cat.name}
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 object-contain"
                  />
                ) : (
                  <IconComponent
                    size={17}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isFestivalActive
                        ? 'text-white'
                        : isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600'
                    }`}
                  />
                )}

                {/* Name */}
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
