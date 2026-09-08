import React from 'react';
import { useCMS, defaultSuperCategories, FestivalCampaign } from '../context/CMSContext';
import { resolveFestivalTheme } from '../utils/festivalThemeResolver';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  LayoutGrid, Coffee, Armchair, Shapes, Leaf, Headphones, Smartphone,
  Sparkles, Shirt, Utensils
} from 'lucide-react';

interface SuperCategoryNavProps {
  activeSuperCategory: string;
  onSelectSuperCategory: (slug: string) => void;
  /** The festival campaign actually rendered below the nav, so the bar's
   *  background matches the festival section exactly. Falls back to the
   *  CMS context's active campaign when not provided. */
  festivalCampaignOverride?: FestivalCampaign | null;
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
  festivalCampaignOverride,
}) => {
  const { superCategories, activeFestivalCampaign: contextFestivalCampaign } = useCMS();
  const activeFestivalCampaign = festivalCampaignOverride ?? contextFestivalCampaign;

  const isMobile = useIsMobile(768);

  const isFestivalActive = React.useMemo(() => {
    if (!isMobile || !activeFestivalCampaign || activeFestivalCampaign.isActive === false || activeFestivalCampaign.status === 'draft') {
      return false;
    }
    const now = new Date();
    const start = new Date(activeFestivalCampaign.startDate);
    const end = new Date(activeFestivalCampaign.endDate);
    if (now < start || now > end) return false;

    const scopes = activeFestivalCampaign.applicableSuperCategories || ['all'];
    const currentCat = activeSuperCategory || 'all';
    const isAllCat = currentCat === 'all' || currentCat === 'sc_all' || currentCat === 'All';

    if (isAllCat) {
      return scopes.includes('all') || scopes.includes('sc_all') || scopes.includes('All') || scopes.length === 0;
    }
    return scopes.includes(currentCat) || scopes.includes(`sc_${currentCat}`);
  }, [isMobile, activeFestivalCampaign, activeSuperCategory]);

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
    let raf = 0;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; syncIndicator(false); });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [syncIndicator]);

  const festivalTheme = React.useMemo(() => resolveFestivalTheme(activeFestivalCampaign), [activeFestivalCampaign]);

  const navBgColor = React.useMemo(() => {
    if (isFestivalActive && isMobile) {
      return festivalTheme.gStart;
    }
    return undefined;
  }, [isFestivalActive, isMobile, festivalTheme]);

  const underlineW = 8;

  return (
    <nav
      aria-label="Shop by department"
      className={`w-full sticky z-30 transition-colors border-b shadow-2xs ${
        isFestivalActive && isMobile
          ? 'border-cyan-200/40'
          : 'bg-surface border-divider'
      }`}
      style={{
        backgroundColor: navBgColor,
        top: 'calc(var(--sticky-header-h) - 1px)',
        marginTop: '-1px'
      }}
    >
      <div className="max-w-none mx-auto px-2 sm:px-4 lg:px-8 relative flex items-center group">

        {/* Scrollable Container */}
        <div
          ref={navRef}
          className={`relative w-full flex items-center overflow-x-auto scrollbar-none scroll-smooth ${
            isMobile ? 'py-1 gap-1 h-[56px]' : 'py-1.5 sm:py-2 px-1 gap-1 sm:gap-2 md:gap-3'
          }`}
        >
          {/* Desktop sliding active-tab underline — animates via transform only */}
          {!isMobile && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-t-full bg-primary-strong origin-left"
              style={{
                width: underlineW,
                transform: `translateX(${indicator.left + 14}px) scaleX(${Math.max(indicator.width - 28, 0) / underlineW})`,
                opacity: indicator.ready ? 1 : 0,
                transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease',
              }}
            />
          )}

          {items.map((cat, i) => {
            const catSlug = cat.slug || cat.id || cat.name.toLowerCase();
            const isActive = effectiveActive === catSlug || (effectiveActive === '' && catSlug === 'all');

            // Resolve icon using exact match helper matching images #3 & #4
            const IconComponent = getSuperCatIcon(cat.name, cat.icon);

            if (isMobile) {
              const activeColorClass = isFestivalActive ? 'text-black' : 'text-primary-strong';
              const activeBgClass = isFestivalActive ? 'bg-black' : 'bg-primary-strong';

              return (
                <button
                  key={cat.id || catSlug}
                  ref={(el) => { btnRefs.current[i] = el; }}
                  aria-current={isActive ? 'true' : undefined}
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
                        isActive ? activeColorClass : 'text-text-secondary'
                      }`}
                    />
                  )}

                  {/* Name BELOW Icon */}
                  <span
                    className={`text-[11px] leading-tight mt-0.5 truncate max-w-[68px] text-center ${
                      isActive
                        ? `font-extrabold ${activeColorClass}`
                        : 'font-medium text-text-secondary'
                    }`}
                  >
                    {cat.name}
                  </span>

                  {/* Active Underline Indicator — scale, not width */}
                  <span
                    className={`h-[2.5px] w-7 rounded-full mt-0.5 origin-center transition-transform duration-200 ${activeBgClass} ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
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
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  if (catSlug === effectiveActive) return;
                  setPending(catSlug);
                  onSelectSuperCategory(catSlug);
                }}
                className={`relative group inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-black transition-colors duration-200 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? 'text-white bg-primary-strong shadow-xs'
                    : 'text-text-primary bg-background hover:bg-divider/60'
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
                      isActive ? 'text-white' : 'text-text-secondary'
                    }`}
                  />
                )}
                <span className="tracking-tight whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
};
