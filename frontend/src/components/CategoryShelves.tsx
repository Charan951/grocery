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

interface ShelfEntry {
  cat: ShelfCategory;
  /** Every sold product in the category, top seller first. */
  items: Product[];
  score: number;
}

const MAX_CATEGORIES = 6;

const productImage = (p: Product) => p.imageUrl || p.image || p.images?.[0] || '';

/** Only products that have actually sold, grouped by category and ranked by units sold. */
function buildEntries(categories: ShelfCategory[], products: Product[], sales: Record<string, number>) {
  const out: ShelfEntry[] = [];
  for (const cat of categories) {
    const items = products
      .filter((p) => p.categoryId === cat.id && productImage(p) && (sales[p.id] || 0) > 0)
      .sort((a, b) => sales[b.id] - sales[a.id]);
    if (items.length === 0) continue;
    const score = items.reduce((s, p) => s + sales[p.id], 0);
    out.push({ cat, items, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, MAX_CATEGORIES);
}

const Tile: React.FC<{ p: Product }> = ({ p }) => (
  <div className="min-w-0 min-h-0 flex-1 rounded-[9px] bg-white overflow-hidden">
    <img
      src={productImage(p)}
      alt=""
      loading="lazy"
      className="w-full h-full object-cover"
      onError={(e) => ((e.target as HTMLElement).style.visibility = 'hidden')}
    />
  </div>
);

const TileRow: React.FC<{ ps: Product[] }> = ({ ps }) => (
  <div className="flex flex-1 min-h-0 gap-1">
    {ps.map((p) => (
      <Tile key={p.id} p={p} />
    ))}
  </div>
);

/** Tiles always fill the card: 1 → full, 2 → side by side, 3 → one wide on top + two below, 4 → 2×2. */
const TileGrid: React.FC<{ shown: Product[] }> = ({ shown }) => {
  const rows =
    shown.length === 1 ? [shown]
    : shown.length === 2 ? [shown]
    : shown.length === 3 ? [shown.slice(0, 1), shown.slice(1)]
    : [shown.slice(0, 2), shown.slice(2, 4)];
  return (
    <div className="aspect-square flex flex-col gap-1">
      {rows.map((r, i) => (
        <TileRow key={i} ps={r} />
      ))}
    </div>
  );
};

/** Blinkit-style "Bestsellers" category shelf (max 6 categories), ranked live from orders. */
export const CategoryShelves: React.FC<{ categories: ShelfCategory[]; products: Product[] }> = ({
  categories,
  products,
}) => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Record<string, number>>({});

  // Refetch on mount and whenever the tab regains focus so the shelf tracks
  // what is selling right now.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(apiUrl('/product-sales'), { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (!alive || !Array.isArray(d?.data)) return;
          const m: Record<string, number> = {};
          for (const r of d.data) m[String(r.productId)] = Number(r.sold) || 0;
          setSales(m);
        })
        .catch(() => {});
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const entries = useMemo(() => buildEntries(categories, products, sales), [categories, products, sales]);
  if (entries.length === 0) return null;

  const open = ({ cat, items }: ShelfEntry) => {
    const params = new URLSearchParams({
      ids: items.map((p) => p.id).join(','),
      title: `Bestsellers in ${cat.displayName || cat.name}`,
    });
    navigate(`/products?${params.toString()}`);
  };

  return (
    <div className="sm:hidden">
      <section className="mb-5 w-full px-1">
        <h2 className="text-lg font-black text-gray-900 tracking-tight font-display mb-3">Bestsellers</h2>
        <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
          {entries.map((e) => {
            const shown = e.items.slice(0, 4);
            const more = e.items.length - shown.length;
            return (
              <button
                key={e.cat.id}
                type="button"
                onClick={() => open(e)}
                className="flex flex-col items-center bg-transparent border-none p-0 outline-none cursor-pointer text-center"
              >
                <div className="relative w-full rounded-2xl bg-[#F1F3F8] border border-gray-200/80 p-[5px]">
                  <TileGrid shown={shown} />
                  {more > 0 && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gray-200 bg-[#F1F3F8] px-2 py-px text-[9.5px] font-semibold text-gray-500">
                      +{more} more
                    </span>
                  )}
                </div>
                {/* Two lines reserved so every card is the same height. */}
                <span className="mt-2.5 text-xs font-extrabold text-gray-800 leading-tight line-clamp-2 w-full min-h-[2.5em]">
                  {e.cat.displayName || e.cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
