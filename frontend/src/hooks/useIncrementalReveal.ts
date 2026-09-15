import { useEffect, useRef, useState } from 'react';

/**
 * Reveals a growing slice of a long list as the user scrolls near its end,
 * instead of mounting every item up front. Returns the count to render and
 * a sentinel ref to place after the last rendered item.
 *
 * Resets back to `batchSize` whenever `total` changes (new filter/search).
 */
export function useIncrementalReveal(total: number, batchSize = 16) {
  const [visibleCount, setVisibleCount] = useState(Math.min(batchSize, total));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(batchSize, total));
  }, [total, batchSize]);

  useEffect(() => {
    if (visibleCount >= total) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + batchSize, total));
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, total, batchSize]);

  return { visibleCount, sentinelRef };
}
