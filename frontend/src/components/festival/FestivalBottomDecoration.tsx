import React from 'react';

interface FestivalBottomDecorationProps {
  type?: 'scallop' | 'floral' | 'wave' | 'cutwork' | 'traditional' | 'plain' | 'none';
  accentColor?: string;
}

export const FestivalBottomDecoration: React.FC<FestivalBottomDecorationProps> = ({
  type = 'scallop',
  accentColor = '#F6C453'
}) => {
  if (type === 'none' || type === 'plain') return null;

  return (
    <div className="relative w-full overflow-hidden pointer-events-none z-10 select-none">
      {type === 'scallop' && (
        <div className="w-full h-4 sm:h-5 overflow-hidden">
          <svg className="w-full h-full text-background fill-current" viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path d="M0,0 Q30,35 60,0 Q90,35 120,0 Q150,35 180,0 Q210,35 240,0 Q270,35 300,0 Q330,35 360,0 Q390,35 420,0 Q450,35 480,0 Q510,35 540,0 Q570,35 600,0 Q630,35 660,0 Q690,35 720,0 Q750,35 780,0 Q810,35 840,0 Q870,35 900,0 Q930,35 960,0 Q990,35 1020,0 Q1050,35 1080,0 Q1110,35 1140,0 Q1170,35 1200,0 L1200,40 L0,40 Z"></path>
          </svg>
        </div>
      )}

      {type === 'wave' && (
        <div className="w-full h-4 sm:h-6 overflow-hidden">
          <svg className="w-full h-full text-background fill-current" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,0 C150,50 350,-20 500,40 C650,100 900,-10 1200,30 L1200,60 L0,60 Z"></path>
          </svg>
        </div>
      )}

      {type === 'floral' && (
        <div className="w-full h-5 sm:h-6 flex items-center justify-center border-t border-dashed" style={{ borderColor: `${accentColor}55` }}>
          <div className="flex items-center gap-6 opacity-80" style={{ color: accentColor }}>
            <span className="text-xs">✿</span>
            <span className="text-xs">❖</span>
            <span className="text-xs">✿</span>
            <span className="text-xs">❖</span>
            <span className="text-xs">✿</span>
          </div>
        </div>
      )}

      {type === 'traditional' && (
        <div className="w-full py-1.5 flex items-center justify-center border-t-2 border-dotted" style={{ borderColor: `${accentColor}66` }}>
          <div className="flex items-center gap-3 text-[10px] font-serif" style={{ color: accentColor }}>
            <span>❖</span>
            <span>◇</span>
            <span>❖</span>
          </div>
        </div>
      )}

      {type === 'cutwork' && (
        <div className="w-full h-4 overflow-hidden border-t" style={{ borderColor: `${accentColor}44` }}>
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent opacity-60" />
        </div>
      )}
    </div>
  );
};
