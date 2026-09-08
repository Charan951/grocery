import { useState, useEffect } from 'react';

/**
 * Single source of truth for "is this a mobile viewport".
 *
 * One `matchMedia` listener per (breakpoint) value instead of every component
 * wiring its own `resize` handler + `setState`. Pass the same breakpoint the
 * layout actually switches at so the header, category nav and festival block
 * flip together instead of leaving a dead tablet band.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 0.02}px)`;

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
