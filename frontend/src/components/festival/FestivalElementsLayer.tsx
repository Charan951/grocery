import React from 'react';
import { DecorativeElement } from '../../context/CMSContext';
import { FESTIVAL_ASSET_LIBRARY } from './FestivalAssetLibrary';

interface FestivalElementsLayerProps {
  elements?: DecorativeElement[];
}

export const FestivalElementsLayer: React.FC<FestivalElementsLayerProps> = ({ elements = [] }) => {
  if (!elements || elements.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-2 w-full h-full">
      <style>{`
        @keyframes animHorizontalMove {
          0% { transform: translate3d(-10%, 0, 0); }
          50% { transform: translate3d(15%, 0, 0); }
          100% { transform: translate3d(-10%, 0, 0); }
        }
        @keyframes animGentleSway {
          0%, 100% { transform: rotate(-6deg) translate3d(0, 0, 0); }
          50% { transform: rotate(6deg) translate3d(4px, 6px, 0); }
        }
        @keyframes animGlowFlicker {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.08); }
        }
        @keyframes animFloatVertical {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }
        @keyframes animPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        .anim-horizontal-move-slow { animation: animHorizontalMove 16s ease-in-out infinite; }
        .anim-horizontal-move-medium { animation: animHorizontalMove 10s ease-in-out infinite; }
        .anim-horizontal-move-fast { animation: animHorizontalMove 6s ease-in-out infinite; }

        .anim-gentle-sway-slow { animation: animGentleSway 7s ease-in-out infinite; }
        .anim-gentle-sway-medium { animation: animGentleSway 4.5s ease-in-out infinite; }
        .anim-gentle-sway-fast { animation: animGentleSway 2.5s ease-in-out infinite; }

        .anim-glow-flicker-slow { animation: animGlowFlicker 4.5s ease-in-out infinite; }
        .anim-glow-flicker-medium { animation: animGlowFlicker 2.8s ease-in-out infinite; }
        .anim-glow-flicker-fast { animation: animGlowFlicker 1.5s ease-in-out infinite; }

        .anim-float-vertical-slow { animation: animFloatVertical 6s ease-in-out infinite; }
        .anim-float-vertical-medium { animation: animFloatVertical 3.8s ease-in-out infinite; }
        .anim-float-vertical-fast { animation: animFloatVertical 2.2s ease-in-out infinite; }

        .anim-pulse-slow { animation: animPulse 5s ease-in-out infinite; }
        .anim-pulse-medium { animation: animPulse 3s ease-in-out infinite; }
        .anim-pulse-fast { animation: animPulse 1.8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .anim-horizontal-move-slow, .anim-horizontal-move-medium, .anim-horizontal-move-fast,
          .anim-gentle-sway-slow, .anim-gentle-sway-medium, .anim-gentle-sway-fast,
          .anim-glow-flicker-slow, .anim-glow-flicker-medium, .anim-glow-flicker-fast,
          .anim-float-vertical-slow, .anim-float-vertical-medium, .anim-float-vertical-fast,
          .anim-pulse-slow, .anim-pulse-medium, .anim-pulse-fast {
            animation: none !important;
          }
        }
      `}</style>

      {elements.map((el, idx) => {
        const key = el.id || `el_${idx}`;
        const assetDef = FESTIVAL_ASSET_LIBRARY[el.asset];
        const anim = el.animation || 'none';
        const speed = el.speed || 'slow';

        let animClass = '';
        if (anim !== 'none') {
          animClass = `anim-${anim}-${speed}`;
        }

        // Positioning logic
        const posX = el.position?.x ?? 50;
        const posY = el.position?.y ?? 10;
        const align = el.position?.align || 'center';
        const size = el.size || 30;
        const opacity = (el.opacity ?? 100) / 100;

        let transformStyle = '';
        if (align === 'center') {
          transformStyle = 'translateX(-50%)';
        } else if (align === 'right') {
          transformStyle = 'translateX(-100%)';
        }

        return (
          <div
            key={key}
            className={`absolute transition-all duration-300 ${animClass}`}
            style={{
              top: `${posY}%`,
              left: `${posX}%`,
              width: `${size}%`,
              maxWidth: '220px',
              minWidth: '24px',
              opacity: opacity,
              transform: transformStyle || undefined,
              zIndex: anim === 'none' ? 2 : 3
            }}
          >
            {assetDef ? (
              assetDef.svg()
            ) : el.asset?.startsWith('http') || el.asset?.startsWith('data:') ? (
              <img src={el.asset} alt="Festival element" className="w-full h-auto object-contain filter drop-shadow-md" />
            ) : (
              <span className="text-2xl">✨</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
