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
export const normalizeCategoryImageUrl = (url: string): string => {
  if (!url || url.includes('cdn.zeptonow.com')) {
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
    <div className={`relative w-full h-full flex items-center justify-center bg-transparent p-0.5 select-none overflow-hidden ${className}`}>
      {/* 
        Clean Transparent Image Rendering:
        - Image container is strictly bg-transparent.
        - Preserves native transparency of PNG/WebP cutouts.
        - Object-contain ensures consistent visual scaling without cropping or stretching.
      */}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={handleError}
        className="w-full h-full object-contain object-center scale-100 transition-transform duration-200 group-hover:scale-105 bg-transparent"
      />
    </div>
  );
};

export default SubcategoryCardImage;
