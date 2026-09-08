import React from 'react';

interface LazyRenderProps {
  children: React.ReactNode;
  /**
   * Approx height (px) reserved before the real content mounts so the
   * scrollbar / scroll position stays stable while sections hydrate.
   */
  placeholderHeight?: number;
  /**
   * How far outside the viewport the block should start mounting.
   * A generous margin means content is ready by the time it scrolls in.
   */
  rootMargin?: string;
  /** Optional id kept on the outer element (used for in-page anchors). */
  id?: string;
  className?: string;
}

/**
 * Defers mounting of its children until it scrolls near the viewport.
 *
 * Home renders dozens of product shelves; mounting them all on first paint
 * (and again on every super-category tab switch) is what makes the page feel
 * like it "reloads". Wrapping each heavy section in <LazyRender> turns that
 * into progressive, scroll-driven rendering — only what the user can actually
 * see (plus a screen of runway) is built.
 */
export const LazyRender: React.FC<LazyRenderProps> = ({
  children,
  placeholderHeight = 360,
  rootMargin = '800px 0px',
  id,
  className,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} id={id} className={className}>
      {shown ? children : <div style={{ minHeight: placeholderHeight }} aria-hidden />}
    </div>
  );
};
