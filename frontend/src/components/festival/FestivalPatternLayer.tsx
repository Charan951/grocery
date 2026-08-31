import React from 'react';

interface FestivalPatternLayerProps {
  pattern?: 'none' | 'floral' | 'mandala' | 'paisley' | 'traditional' | 'dots' | 'festival';
  opacity?: number;
  scale?: 'small' | 'medium' | 'large';
  color?: string;
}

export const FestivalPatternLayer: React.FC<FestivalPatternLayerProps> = ({
  pattern = 'floral',
  opacity = 0.10,
  scale = 'medium',
  color = '#000000'
}) => {
  if (pattern === 'none') return null;

  const bgSize = scale === 'small' ? '16px 16px' : scale === 'large' ? '40px 40px' : '24px 24px';

  let patternBg = '';
  if (pattern === 'dots') {
    patternBg = `radial-gradient(${color} 1.5px, transparent 1.5px)`;
  } else if (pattern === 'mandala' || pattern === 'festival') {
    patternBg = `radial-gradient(circle, ${color} 1px, transparent 1px), radial-gradient(circle, ${color} 1px, transparent 1px)`;
  } else {
    // Default floral / traditional SVG data pattern
    patternBg = `radial-gradient(${color} 1.2px, transparent 1.2px)`;
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-1 w-full h-full transition-opacity duration-300"
      style={{
        backgroundImage: patternBg,
        backgroundSize: bgSize,
        backgroundPosition: '0 0, 12px 12px',
        opacity: opacity
      }}
    />
  );
};
