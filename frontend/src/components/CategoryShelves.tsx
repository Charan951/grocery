import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/api';
import type { Product } from '../context/CMSContext';

interface ShelfCategory {
  id: string;
  name: string;
  slug?: string;
  displayName?: string;
}

type Kind = 'bestsellers' | 'topDeals';

const MAX_CATEGORIES = 6;

const discountOf = (p: Product) => (p.mrp > p.price ? ((p.mrp - p.price) / p.mrp) * 100 : 0);
const productImage = (p: Product) => p.imageUrl || p.image || p.images?.[0] || '';

/** Ranks categories by units sold (bestsellers) or average discount (top deals). */
function buildEntries(
  kind: Kind,
  categories: ShelfCategory[],
  products: Product[],
  sales: Record<string, number>,
) {
  const out: { cat: ShelfCategory; items: Product[]; score: number }[] = [];
  for (const cat of categories) {
    let items = products.filter((p) => p.categoryId === cat.id);
    if (items.length === 0) continue;
    let score: number;
    if (kind === 'bestsellers') {
      score =
        (sales[cat.id] || 0) * 1000 +
        items.filter((p) => p.isBestSeller).length * 10 +
        items.length * 0.01;
      items = [...items].sort(
        (a, b) => Number(!!b.isBestSeller) - Number(!!a.isBestSeller) || (b.reviewsCount || 0) - (a.reviewsCount || 0),
      );
    } else {
      items = items.filter((p) => discountOf(p) > 0).sort((a, b) => discountOf(b) - discountOf(a));
      if (items.length === 0) continue;
      score = items.reduce((s, p) => s + discountOf(p), 0) / items.length;
    }
    out.push({ cat, items, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, MAX_CATEGORIES);
}

const Shelf: React.FC<{
  title: string;
  kind: Kind;
  categories: ShelfCategory[];
  products: Product[];
  sales: Record<string, number>;
}> = ({ title, kind, categories, products, sales }) => {
  const navigate = useNavigate();
  const entries = useMemo(
    () => buildEntries(kind, categories, products, sales),
    [kind, categories, products, sales],
  );
  if (entries.length === 0) return null;

  return (
    <section className="mb-5 w-full px-1">
      <h2 className="text-lg font-black text-gray-900 tracking-tight font-display mb-3">{title}</h2>
      <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
        {entries.map(({ cat, items }) => {
          const shown = items.slice(0, 4);
          const more = items.length - shown.length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/products?category=${cat.slug || cat.id}&subCategory=All`)}
              className="flex flex-col items-center bg-transparent border-none p-0 outline-none cursor-pointer text-center"
            >
              <div className="relative w-full rounded-2xl bg-[#F1F3F8] border border-gray-200/80 p-[5px]">
                <div className="grid grid-cols-2 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square rounded-[9px] bg-white overflow-hidden p-[3px]">
                      {shown[i] && (
                        <img
                          src={productImage(shown[i])}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-contain"
                          onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {more > 0 && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gray-200 bg-[#F1F3F8] px-2 py-px text-[9.5px] font-semibold text-gray-500">
                    +{more} more
                  </span>
                )}
              </div>
              <span className="mt-2.5 text-xs font-extrabold text-gray-800 leading-tight line-clamp-2 w-full">
                {cat.displayName || cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/** Blinkit-style "Bestsellers" + "Top deals" category shelves (max 6 categories each). */
export const CategoryShelves: React.FC<{ categories: ShelfCategory[]; products: Product[] }> = ({
  categories,
  products,
}) => {
  const [sales, setSales] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    fetch(apiUrl('/category-sales'))
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !Array.isArray(d?.data)) return;
        const m: Record<string, number> = {};
        for (const r of d.data) m[String(r.categoryId)] = Number(r.sold) || 0;
        setSales(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="sm:hidden">
      <Shelf title="Bestsellers" kind="bestsellers" categories={categories} products={products} sales={sales} />
      <Shelf title="Top deals" kind="topDeals" categories={categories} products={products} sales={sales} />
    </div>
  );
};
