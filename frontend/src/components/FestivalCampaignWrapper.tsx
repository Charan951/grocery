import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FestivalCampaign, useCMS } from '../context/CMSContext';
import { resolveFestivalTheme, isDarkColor } from '../utils/festivalThemeResolver';
import { useIsMobile } from '../hooks/useIsMobile';
import { ChevronRight } from 'lucide-react';

interface FestivalCampaignWrapperProps {
  campaign: FestivalCampaign;
  currentSuperCatId?: string;
  onQuickView?: (product: any) => void;
}

// Where a festival group card lands:
//  - exactly one curated product  -> that product's page
//  - several curated products     -> Products filtered to that id list
//  - none configured              -> fuzzy catalog search by the group name
function festivalGroupHref(grp: any): string {
  const ids = (Array.isArray(grp?.products) ? grp.products : [])
    .map((v: any) => (typeof v === 'string' ? v : v?.id || v?._id))
    .filter(Boolean);
  const name = (grp?.displayName || '').trim();
  if (ids.length === 1) return `/product/${ids[0]}`;
  if (ids.length > 1) {
    const t = name ? `&title=${encodeURIComponent(name)}` : '';
    return `/products?ids=${ids.map(encodeURIComponent).join(',')}${t}`;
  }
  return name ? `/products?search=${encodeURIComponent(name)}` : '/products';
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

  const isMobile = useIsMobile(768);

  const theme = useMemo(() => resolveFestivalTheme(campaign), [campaign]);

  if (!isMobile) return null;
  if (!campaign || campaign.isActive === false || campaign.status === 'draft') return null;

  // Date check
  const now = new Date();
  const start = new Date(campaign.startDate);
  const end = new Date(campaign.endDate);
  if (now < start || now > end) return null;

  // Scope check
  if (currentSuperCatId !== undefined) {
    const scopes = campaign.applicableSuperCategories || ['all'];
    const isAllCat = !currentSuperCatId || currentSuperCatId === 'all' || currentSuperCatId === 'sc_all' || currentSuperCatId === 'All';
    if (isAllCat) {
      const appliesToAll = scopes.includes('all') || scopes.includes('sc_all') || scopes.includes('All') || scopes.length === 0;
      if (!appliesToAll) return null;
    } else {
      const appliesToCurrent = scopes.includes(currentSuperCatId) || scopes.includes(`sc_${currentSuperCatId}`);
      if (!appliesToCurrent) return null;
    }
  }

  // Active groups only (admin can toggle a group off) — this must match the
  // mobile app's filter exactly so both surfaces show the same set.
  const allGroups = (campaign.festivalGroups || []).filter(
    (g: any) => g?.isActive !== false
  );

  // Prefer groups that carry real content — an explicit image or at least one
  // curated product. Name-only groups would render as an invisible tile (broken
  // stock-photo fallback on a tinted background). If every active group is
  // name-only, fall back to showing them all rather than rendering nothing.
  const realGroups = allGroups.filter(
    (g: any) =>
      (g?.image || g?.imageUrl || '').toString().trim() !== '' ||
      (Array.isArray(g?.products) && g.products.length > 0)
  );
  const displayGroups = realGroups.length > 0 ? realGroups : allGroups;

  // A campaign with no configured groups has nothing to show — render nothing
  // rather than synthesising stock photos and placeholder group names.
  if (displayGroups.length === 0) return null;

  return (
    <section
      className="w-full pt-5 pb-0 relative transition-colors duration-300"
      style={{ background: theme.bgGradient, backgroundColor: theme.gStart }}
    >
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">

        {/* Festival title block */}
        <div className="flex flex-col items-center text-center mb-4">
          <div
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em]"
            style={{ color: theme.text, opacity: 0.72 }}
          >
            <span aria-hidden>{theme.emoji}</span>
            <span>Celebrate</span>
            <span aria-hidden>{theme.emoji}</span>
          </div>
          <h2
            className="text-[30px] sm:text-[34px] font-normal leading-[1.1] mt-1"
            style={{ color: theme.text, fontFamily: theme.fontFamily }}
          >
            {campaign.name || 'Celebrate'}
          </h2>
        </div>

        {/* Group Cards Layout. style2 is a hero + fixed 2×2 grid — it can only
            show 4 groups. Outside 3–4 groups (too few = empty cells, too many =
            silently dropped) fall back to the style1 grid/carousel, which shows
            every group. */}
        {campaign.cardStyle === 'style2' && displayGroups.length >= 3 && displayGroups.length <= 4 ? (
          <div className="flex gap-3 w-full mb-5 h-[320px] sm:h-[360px]">
            {/* Left hero: one rotating product spotlight (fixed height, no jump) */}
            <div className="w-[38%] flex h-full">
              <Style2HeroRotator
                groups={displayGroups}
                products={products}
                theme={theme}
              />
            </div>

            {/* Right 2x2 Grid displaying the 4 groups */}
            <div className="w-[62%] h-full grid grid-cols-2 grid-rows-2 gap-3">
              {displayGroups.slice(0, 4).map((grp: any, idx: number) => {
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
                  <button
                    type="button"
                    key={grp.id || grp.displayName || idx}
                    onClick={() => navigate(festivalGroupHref(grp))}
                    aria-label={`Shop ${grp.displayName}${discount > 0 ? ` — up to ${discount}% off` : ''}`}
                    className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform group border"
                    style={{ borderColor: theme.cardBorder }}
                  >
                    <img
                      src={groupImg}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    {discount > 0 && (
                      <span
                        className="absolute top-2 right-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none z-10 shadow-2xs"
                        style={{ backgroundColor: theme.btn }}
                      >
                        {discount}% OFF
                      </span>
                    )}
                    <span className="absolute bottom-2.5 left-3 right-3 text-[13px] font-black text-white leading-tight line-clamp-2 text-left drop-shadow-md">
                      {grp.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (() => {
          /* Style 1 — uniform group cards in a 2×3 grid. With 6 or fewer it's
             a single static grid. With more, it becomes a horizontal
             snap-carousel where each page is its own full-width 2×3 grid:
             swipe = jump to the next set of 6. */
          const style1Groups = displayGroups.slice(0, 18);
          const paged = style1Groups.length > 6;

          const renderCard = (grp: any, gIdx: number) => {
            let groupImg = grp.image || grp.imageUrl || '';
            if (!groupImg && Array.isArray(grp.products) && grp.products.length > 0) {
              const matchedProd = products.find(p => p.id === grp.products[0] || p._id === grp.products[0]);
              if (matchedProd) {
                groupImg = matchedProd.imageUrl || matchedProd.image || '';
              }
            }
            if (!groupImg) {
              groupImg = DEFAULT_GROUP_IMAGES[gIdx % DEFAULT_GROUP_IMAGES.length];
            }

            const discount = grp.discountPercent || 0;

            return (
              <button
                type="button"
                key={grp.id || grp.displayName || gIdx}
                onClick={() => navigate(festivalGroupHref(grp))}
                aria-label={`Shop ${grp.displayName}${discount > 0 ? ` — up to ${discount}% off` : ''}`}
                className="relative h-[150px] sm:h-[168px] w-full rounded-2xl overflow-hidden shadow-xs cursor-pointer active:scale-95 transition-transform group border-0"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <img
                  src={groupImg}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {discount > 0 && (
                  <div
                    className="absolute top-1.5 right-1.5 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs"
                    style={{ backgroundColor: theme.btn }}
                  >
                    {discount}% OFF
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
                  <span className="text-[11px] font-black text-white leading-tight line-clamp-2 drop-shadow-sm flex-1 text-left">
                    {grp.displayName}
                  </span>
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ChevronRight size={11} className="text-text-primary" />
                  </div>
                </div>
              </button>
            );
          };

          if (!paged) {
            // 1–3 groups: one row of exactly that many columns (no empty cells,
            // no phantom second row). 4–6: a 3-wide grid that wraps to 2 rows.
            const colClass =
              style1Groups.length === 1 ? 'grid-cols-1'
              : style1Groups.length === 2 ? 'grid-cols-2'
              : 'grid-cols-3';
            return (
              <div className={`w-full mb-4 grid gap-2.5 ${colClass}`}>
                {style1Groups.map((grp, i) => renderCard(grp, i))}
              </div>
            );
          }

          const pages: any[][] = [];
          for (let i = 0; i < style1Groups.length; i += 6) {
            pages.push(style1Groups.slice(i, i + 6));
          }

          return (
            <div className="w-full mb-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
              {pages.map((page, pi) => (
                <div
                  key={pi}
                  className="w-full shrink-0 snap-start grid grid-cols-3 gap-2.5"
                >
                  {page.map((grp, ci) => renderCard(grp, pi * 6 + ci))}
                </div>
              ))}
            </div>
          );
        })()}
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

const Style2HeroRotator: React.FC<{ groups: any[]; products: any[]; theme: any }> = ({ groups, products, theme }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  // Build items array group-wise
  const rotatorItems = useMemo(() => {
    const items: { group: any; product: any }[] = [];
    if (Array.isArray(groups)) {
      groups.forEach((grp) => {
        if (Array.isArray(grp.products) && grp.products.length > 0) {
          grp.products.forEach((pid: string) => {
            const matched = products?.find((p: any) => p.id === pid || p._id === pid);
            if (matched) {
              items.push({ group: grp, product: matched });
            }
          });
        } else {
          items.push({
            group: grp,
            product: {
              id: grp.id || grp.displayName,
              name: grp.displayName,
              price: 0,
              mrp: 0,
              imageUrl: grp.image || grp.imageUrl || ''
            }
          });
        }
      });
    }
    return items;
  }, [groups, products]);

  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (rotatorItems.length <= 1 || paused) return;
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // 4.5s per item — long enough to read the name + price before it moves on.
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatorItems.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [rotatorItems.length, paused]);

  const currentItem = rotatorItems.length > 0 ? rotatorItems[index % rotatorItems.length] : null;
  const currentGroup = currentItem?.group;
  const currentProd = currentItem?.product;

  const offerPrice = currentProd ? (currentProd.price || 0) : 0;
  let mrp = (currentProd && currentProd.mrp > offerPrice) ? currentProd.mrp : 0;
  const discountPercent = currentGroup?.discountPercent || 0;
  if (mrp <= offerPrice && discountPercent > 0 && offerPrice > 0) {
    mrp = Math.round(offerPrice / (1 - discountPercent / 100));
  }

  const prodName = currentProd ? currentProd.name : '';
  const prodImg = currentProd ? (currentProd.imageUrl || currentProd.image || '') : (currentGroup?.imageUrl || currentGroup?.image || '');
  const darkCard = isDarkColor(theme.cardBg);

  return (
    <button
      type="button"
      aria-label={currentGroup?.displayName ? `Shop ${currentGroup.displayName}` : 'Shop festive offers'}
      onClick={() => {
        const prodId = currentProd?.id || currentProd?._id;
        if (prodId && prodId !== currentGroup?.id) {
          navigate(`/product/${prodId}`);
        } else {
          navigate(festivalGroupHref(currentGroup));
        }
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative h-full w-full overflow-hidden rounded-2xl shadow-sm text-left transition-transform duration-300 cursor-pointer active:scale-[0.98] border"
      style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
    >
      {/* Full-bleed rotating image + scrim — crossfades in place, card never resizes */}
      <div key={index} className="absolute inset-0 animate-fadeIn">
        {prodImg ? (
          <img src={prodImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 ${darkCard ? 'bg-white/10' : 'bg-black/5'}`} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      </div>

      {/* Discount badge */}
      {discountPercent > 0 && (
        <span
          className="absolute top-2.5 right-2.5 z-10 text-white text-[10px] font-black px-2 py-0.5 rounded-md leading-none shadow-2xs"
          style={{ backgroundColor: theme.btn }}
        >
          {discountPercent}% OFF
        </span>
      )}

      {/* Rotation progress — over the image, clear of the copy */}
      {rotatorItems.length > 1 && (
        <div className="absolute top-3 left-3 z-10 flex gap-1">
          {rotatorItems.slice(0, 6).map((_, i) => {
            const on = i === index % Math.min(rotatorItems.length, 6);
            return (
              <span
                key={i}
                className="h-1 rounded-full bg-white transition-all duration-300"
                style={{ width: on ? 16 : 5, opacity: on ? 0.95 : 0.45 }}
              />
            );
          })}
        </div>
      )}

      {/* Copy overlay */}
      <div key={`copy-${index}`} className="absolute inset-x-0 bottom-0 z-10 p-3.5 animate-fadeIn">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/70 line-clamp-1">
          {currentGroup?.displayName || 'Festive Offer'}
        </span>
        <span className="mt-1 block text-[15px] font-black leading-tight text-white line-clamp-2 drop-shadow-md">
          {prodName || 'Festive picks'}
        </span>
        {offerPrice > 0 && (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[19px] font-black leading-none text-white drop-shadow">₹{offerPrice}</span>
            {mrp > offerPrice && mrp > 0 && (
              <span className="text-[12px] font-semibold leading-none text-white/60 line-through">₹{mrp}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};
