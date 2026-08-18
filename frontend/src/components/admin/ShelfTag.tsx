import React from 'react';

type ShelfTagTone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

interface ShelfTagProps {
  tone: ShelfTagTone;
  children: React.ReactNode;
  className?: string;
}

export const ShelfTag: React.FC<ShelfTagProps> = ({ tone, children, className = '' }) => (
  <span className={`shelf-tag shelf-tag-${tone} ${className}`}>{children}</span>
);

export default ShelfTag;
