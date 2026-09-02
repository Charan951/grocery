import React, { useState } from 'react';

interface SubcategoryCardImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

/**
 * Normalizes image URLs for category & subcategory cards.
 * If Cloudinary URLs are supplied, applies automatic transparent padding (b_transparent)
 * and quality formatting (f_auto, q_auto) to ensure transparent cutout rendering.
 */
export const normalizeCategoryImageUrl = (url: string, altText?: string): string => {
  if (!url || url.includes('cdn.zeptonow.com')) {
    if (altText) {
      const lower = altText.toLowerCase();
      if (lower.includes('milk')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop';
      if (lower.includes('bread') || lower.includes('bun')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop';
      if (lower.includes('egg') || lower.includes('poultry')) return 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300&auto=format&fit=crop';
      if (lower.includes('tea')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop';
      if (lower.includes('coffee')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop';
      if (lower.includes('snack') || lower.includes('popcorn')) return 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=300&auto=format&fit=crop';
      if (lower.includes('fruit')) return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop';
  }

  // 1. Cloudinary URL optimization: pad with b_transparent for clean background-free object framing
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/upload/f_auto') && !url.includes('/upload/c_') && !url.includes('b_transparent')) {
      return url.replace('/upload/', '/upload/f_auto,q_auto,c_pad,w_300,h_300,b_transparent/');
    }
  }

  // 2. Unsplash URL optimization
  if (url.includes('images.unsplash.com')) {
    if (!url.includes('w=')) {
      return `${url}&w=300&auto=format&fit=crop`;
    }
  }

  return url;
};

export const SubcategoryCardImage: React.FC<SubcategoryCardImageProps> = ({
  src,
  alt,
  fallbackSrc = 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop',
  className = '',
}) => {
  const [imgSrc, setImgSrc] = useState(() => normalizeCategoryImageUrl(src));
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(normalizeCategoryImageUrl(fallbackSrc));
    }
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}>
      <img
        src={imgSrc}
        alt={alt}
        decoding="async"
        onError={handleError}
        className="w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-105"
      />
    </div>
  );
};

export default SubcategoryCardImage;
