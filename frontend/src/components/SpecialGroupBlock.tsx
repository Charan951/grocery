import React from 'react';
import { Link } from 'react-router-dom';
import type { SpecialCategoryGroup } from '../context/CMSContext';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';

const norm = (v: string) => String(v || '').toLowerCase().replace(/^sc_/, '');

/**
 * Whether a group is targeted at a page. `superSlug` is the active super
 * category (null / 'all' = Home). Groups without targets show on Home only.
 */
export const groupAppliesTo = (group: SpecialCategoryGroup, superSlug?: string | null): boolean => {
  const targets = (group.superCategories && group.superCategories.length ? group.superCategories : ['all']).map(norm);
  const page = norm(superSlug || 'all');
  return targets.includes(page);
};

/**
 * Blinkit-style special sub-category group: a bold heading, then a plain
 * 4-column grid of tinted rounded image tiles with the name underneath.
 * No surrounding card/container.
 */
export const SpecialGroupBlock: React.FC<{ group: SpecialCategoryGroup }> = ({ group }) => (
  <section className="px-1 pt-5 pb-1">
    {group.title && (
      <h2 className="text-[19px] font-extrabold text-text-primary tracking-tight font-display mb-3">
        {group.title}
      </h2>
    )}
    <div className="grid grid-cols-4 gap-x-2.5 gap-y-4">
      {group.items.map((item, idx) => {
        const targetLink = item.link || `/products?subCategory=${encodeURIComponent(item.name)}`;
        return (
          <Link key={item.id || `sg_${idx}`} to={targetLink} className="flex flex-col items-center min-w-0 group">
            <div className="w-full aspect-square rounded-2xl bg-[#EAF4F7] overflow-hidden">
              <img
                alt={item.name}
                loading="lazy"
                decoding="async"
                src={item.image || FALLBACK_IMG}
                className="w-full h-full object-cover transition-transform group-active:scale-95"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              />
            </div>
            <span className="mt-1.5 text-[12px] leading-[1.25] font-semibold text-text-primary text-center line-clamp-2 break-words">
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  </section>
);
