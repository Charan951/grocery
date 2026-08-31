import React from 'react';
import { CampaignAnimationConfig } from '../../context/CMSContext';

interface FestivalAnimationLayerProps {
  campaignName?: string;
  config?: CampaignAnimationConfig;
  accentColor?: string;
}

export const FestivalAnimationLayer: React.FC<FestivalAnimationLayerProps> = ({
  campaignName = '',
  config,
  accentColor = '#F6C453'
}) => {
  if (config?.enabled === false) return null;

  // Determine animation type based on campaign name if set to 'auto' or undefined
  let animType = config?.type || 'auto';
  if (animType === 'auto') {
    const nameLower = campaignName.toLowerCase();
    if (nameLower.includes('varalakshmi') || nameLower.includes('raksha') || nameLower.includes('rakhi')) {
      animType = 'floral';
    } else if (nameLower.includes('diwali') || nameLower.includes('deepavali')) {
      animType = 'diya';
    } else if (nameLower.includes('vinayaka') || nameLower.includes('ganesh') || nameLower.includes('onam')) {
      animType = 'leaves';
    } else {
      animType = 'floral';
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-1 max-w-full">
      <style>{`
        @keyframes floatPetal1 {
          0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate3d(40px, 240px, 0) rotate(180deg); opacity: 0; }
        }
        @keyframes floatPetal2 {
          0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.75; }
          80% { opacity: 0.75; }
          100% { transform: translate3d(-35px, 220px, 0) rotate(-160deg); opacity: 0; }
        }
        @keyframes diyaPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.12); opacity: 0.65; }
        }
        @keyframes leafSway {
          0%, 100% { transform: rotate(-5deg) translate3d(0, 0, 0); }
          50% { transform: rotate(5deg) translate3d(8px, 12px, 0); }
        }
        @keyframes goldenParticle {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0.2; }
          50% { transform: translate3d(15px, -30px, 0) scale(1.2); opacity: 0.8; }
          100% { transform: translate3d(30px, -60px, 0) scale(0.8); opacity: 0; }
        }

        .anim-petal-1 { animation: floatPetal1 7s ease-in-out infinite; }
        .anim-petal-2 { animation: floatPetal2 8.5s ease-in-out infinite; animation-delay: 2s; }
        .anim-petal-3 { animation: floatPetal1 9s ease-in-out infinite; animation-delay: 4s; }
        .anim-diya-glow { animation: diyaPulse 4s ease-in-out infinite; }
        .anim-leaf-sway { animation: leafSway 6s ease-in-out infinite; }
        .anim-particle-1 { animation: goldenParticle 5s ease-in-out infinite; }
        .anim-particle-2 { animation: goldenParticle 6.5s ease-in-out infinite; animation-delay: 2.5s; }

        @media (prefers-reduced-motion: reduce) {
          .anim-petal-1, .anim-petal-2, .anim-petal-3,
          .anim-diya-glow, .anim-leaf-sway,
          .anim-particle-1, .anim-particle-2 {
            animation: none !important;
            opacity: 0.4 !important;
          }
        }
      `}</style>

      {/* 1. Floral Petals (Varalakshmi Vratham, Raksha Bandhan) */}
      {(animType === 'floral' || animType === 'particles') && (
        <>
          <div className="absolute top-[8%] left-[12%] w-4 h-4 text-pink-300/80 anim-petal-1">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 15 8 18 10C21 12 22 15 20 18C18 21 13 21 12 18C11 21 6 21 4 18C2 15 3 12 6 10C9 8 12 2 12 2Z"/></svg>
          </div>
          <div className="absolute top-[5%] right-[15%] w-3.5 h-3.5 text-amber-200/80 anim-petal-2">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 15 8 18 10C21 12 22 15 20 18C18 21 13 21 12 18C11 21 6 21 4 18C2 15 3 12 6 10C9 8 12 2 12 2Z"/></svg>
          </div>
          <div className="absolute top-[18%] left-[55%] w-3 h-3 text-pink-200/70 anim-petal-3">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C12 2 15 8 18 10C21 12 22 15 20 18C18 21 13 21 12 18C11 21 6 21 4 18C2 15 3 12 6 10C9 8 12 2 12 2Z"/></svg>
          </div>
        </>
      )}

      {/* 2. Diya Glow / Soft Ambient Shimmer (Diwali, Varalakshmi) */}
      {(animType === 'diya' || animType === 'floral') && (
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none anim-diya-glow filter blur-2xl"
          style={{
            background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)`
          }}
        />
      )}

      {/* 3. Swaying Mango / Banana Leaves (Vinayaka Chavithi, Onam) */}
      {animType === 'leaves' && (
        <>
          <div className="absolute top-2 left-2 w-10 h-10 text-emerald-400/60 anim-leaf-sway">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3C17 3 14 7 10 11C6 15 4 21 4 21C4 21 10 19 14 15C18 11 22 8 22 8L17 3Z"/></svg>
          </div>
          <div className="absolute top-4 right-4 w-10 h-10 text-amber-400/60 anim-leaf-sway" style={{ animationDelay: '3s' }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3C17 3 14 7 10 11C6 15 4 21 4 21C4 21 10 19 14 15C18 11 22 8 22 8L17 3Z"/></svg>
          </div>
        </>
      )}

      {/* 4. Golden Particles / Shimmer */}
      <div className="absolute bottom-[25%] left-[20%] w-2 h-2 rounded-full bg-amber-300/80 anim-particle-1" />
      <div className="absolute bottom-[35%] right-[25%] w-1.5 h-1.5 rounded-full bg-yellow-200/80 anim-particle-2" />
    </div>
  );
};
