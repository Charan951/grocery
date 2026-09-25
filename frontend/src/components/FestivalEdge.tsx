import React from 'react';

/**
 * Per-theme bottom edge of the festival section. Each predefined theme has its
 * own repeating tile (16px tall, painted in `currentColor` with evenodd so a
 * sub-path can punch a hole). The tile is repeated a whole number of times and
 * stretched horizontally to fit exactly — no clipped half-tile at the end.
 * Mirrors mobileapp/lib/features/home/presentation/widgets/festival_edge.dart —
 * keep the tile markup identical on both.
 */
export const FESTIVAL_EDGE_HEIGHT = 16;

const EDGE_TILES: Record<string, { w: number; svg: string }> = {
  // Flowing Yamuna waves + peacock-eye dots over the troughs.
  krishna: {
    w: 40,
    svg: '<path d="M0 16V8C3.3 4.7 6.7 3 10 3S16.7 4.7 20 8S26.7 13 30 13S36.7 11.3 40 8V16Z"/><circle cx="30" cy="6.5" r="1.6"/>',
  },
  // Round modak scallops, each with a dot punched through.
  ganesh_chaturthi: {
    w: 24,
    svg: '<path d="M0 16V13C0 6.4 5.4 3 12 3S24 6.4 24 13V16Z M10 9.5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z"/>',
  },
  // Diya flame points with a spark between each flame.
  diwali: {
    w: 24,
    svg: '<path d="M0 16V14C5 14 9 11 10.5 7C11.3 4.8 11.7 2.5 12 1C12.3 2.5 12.7 4.8 13.5 7C15 11 19 14 24 14V16Z"/><circle cx="0" cy="8" r="1.3"/><circle cx="24" cy="8" r="1.3"/>',
  },
  // Pookalam petals — alternating big (with a flower centre) and small.
  onam: {
    w: 32,
    svg: '<path d="M0 16V14C1.5 5 6 2 8 2S14.5 5 16 14C17.5 9 20.5 7 24 7S30.5 9 32 14V16Z M6.5 9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z"/>',
  },
  // Rakhi thread strung with pearls and small beads.
  raksha_bandhan: {
    w: 16,
    svg: '<path d="M0 16V12H16V16Z"/><circle cx="8" cy="8.5" r="4"/><circle cx="0" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/>',
  },
  // Soft colour wave with scattered splash dots of varying sizes.
  holi: {
    w: 48,
    svg: '<path d="M0 16V12Q6 9 12 12T24 12T36 12T48 12V16Z"/><circle cx="6" cy="5" r="2"/><circle cx="17" cy="7" r="1.2"/><circle cx="27" cy="3" r="1.6"/><circle cx="38" cy="6" r="2.4"/><circle cx="45" cy="2" r="1"/>',
  },
  // Garba zigzag with a dot above every peak.
  navratri: {
    w: 20,
    svg: '<path d="M0 16V14L10 6L20 14V16Z"/><circle cx="10" cy="2.6" r="1.6"/>',
  },
  // Classic scallop for unknown / custom theme keys.
  scallop: {
    w: 15,
    svg: '<path d="M0 16Q7.5 0 15 16Z"/>',
  },
};

/** Full SVG body for a given width. Same algorithm as Flutter's `buildFestivalEdgeSvg`. */
export function buildFestivalEdgeSvgBody(themeKey: string, width: number): string {
  const tile = EDGE_TILES[themeKey] ?? EDGE_TILES.scallop;
  const n = Math.max(1, Math.round(width / tile.w));
  const sx = width / (n * tile.w);
  let body = '';
  for (let i = 0; i < n; i++) {
    body += `<g transform="translate(${(i * tile.w * sx).toFixed(2)},0) scale(${sx.toFixed(4)},1)">${tile.svg}</g>`;
  }
  return `<g fill="currentColor" fill-rule="evenodd">${body}</g>`;
}

export const FestivalEdge: React.FC<{ themeKey: string; className?: string }> = ({ themeKey, className }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(360);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tile markup is a static constant above — never user input.
  const body = React.useMemo(() => buildFestivalEdgeSvgBody(themeKey, width), [themeKey, width]);

  return (
    <div ref={ref} className={`w-full overflow-hidden leading-none ${className ?? ''}`} aria-hidden="true">
      <svg
        className="block"
        width={width}
        height={FESTIVAL_EDGE_HEIGHT}
        viewBox={`0 0 ${width} ${FESTIVAL_EDGE_HEIGHT}`}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
};
