import React from 'react';

export interface AssetDefinition {
  id: string;
  name: string;
  category: 'character' | 'nature' | 'lighting' | 'festive';
  svg: (color?: string) => React.ReactNode;
}

export const FESTIVAL_ASSET_LIBRARY: Record<string, AssetDefinition> = {
  krishna: {
    id: 'krishna',
    name: 'Little Krishna',
    category: 'character',
    svg: (color = '#1B4D3E') => (
      <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        {/* Halo Glow */}
        <circle cx="50" cy="40" r="32" fill="#FDE047" opacity="0.4" />
        {/* Crown / Mukut */}
        <path d="M35 30 L50 5 L65 30 Z" fill="#EAB308" stroke="#CA8A04" strokeWidth="2" />
        {/* Peacock Feather on Crown */}
        <path d="M50 5 C45 -8, 60 -15, 50 -20 C42 -10, 45 0, 50 5Z" fill="#0284C7" />
        <circle cx="50" cy="-10" r="4" fill="#EAB308" />
        {/* Head / Face */}
        <ellipse cx="50" cy="42" rx="18" ry="20" fill="#38BDF8" />
        {/* Eyes */}
        <ellipse cx="44" cy="40" rx="3" ry="2" fill="#0F172A" />
        <ellipse cx="56" cy="40" rx="3" ry="2" fill="#0F172A" />
        {/* Tilak */}
        <path d="M48 32 Q50 24 52 32 Z" fill="#EF4444" />
        <circle cx="50" cy="35" r="1.5" fill="#EAB308" />
        {/* Smile */}
        <path d="M45 50 Q50 55 55 50" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Body */}
        <path d="M32 60 Q50 55 68 60 L72 100 L28 100 Z" fill="#F59E0B" />
        {/* Flute / Bansuri in hands */}
        <rect x="20" y="65" width="60" height="6" rx="3" fill="#EAB308" transform="rotate(-10 50 68)" stroke="#B45309" strokeWidth="1" />
        <circle cx="30" cy="67" r="1.5" fill="#78350F" />
        <circle cx="40" cy="65" r="1.5" fill="#78350F" />
        <circle cx="50" cy="63" r="1.5" fill="#78350F" />
      </svg>
    )
  },

  ganesha: {
    id: 'ganesha',
    name: 'Lord Ganesha',
    category: 'character',
    svg: () => (
      <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        <circle cx="50" cy="45" r="30" fill="#FDE047" opacity="0.3" />
        {/* Mukut */}
        <path d="M32 30 L50 8 L68 30 Z" fill="#EAB308" stroke="#B45309" strokeWidth="2" />
        {/* Face */}
        <path d="M30 35 C30 55, 38 60, 50 60 C62 60, 70 55, 70 35 Z" fill="#F97316" />
        {/* Ears */}
        <ellipse cx="22" cy="45" rx="12" ry="16" fill="#FB923C" />
        <ellipse cx="78" cy="45" rx="12" ry="16" fill="#FB923C" />
        {/* Trunk */}
        <path d="M46 55 Q44 80, 60 85 Q65 85, 60 78 Q52 75, 52 55 Z" fill="#F97316" />
        {/* Tilak */}
        <path d="M47 36 H53 V44 H47 Z" fill="#EF4444" />
        <circle cx="50" cy="48" r="2" fill="#EAB308" />
        {/* Modak */}
        <path d="M60 85 Q65 75 70 85 Z" fill="#FDE047" />
      </svg>
    )
  },

  lakshmi: {
    id: 'lakshmi',
    name: 'Goddess Lakshmi',
    category: 'character',
    svg: () => (
      <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        <circle cx="50" cy="40" r="32" fill="#FEF08A" opacity="0.4" />
        {/* Lotus Base */}
        <path d="M20 95 Q50 75 80 95 Q50 115 20 95 Z" fill="#F43F5E" />
        <path d="M30 85 Q50 70 70 85 Q50 105 30 85 Z" fill="#FB7185" />
        {/* Crown */}
        <path d="M36 28 L50 10 L64 28 Z" fill="#EAB308" />
        {/* Body saree */}
        <path d="M35 55 L50 40 L65 55 L75 90 L25 90 Z" fill="#DC2626" />
      </svg>
    )
  },

  peacock_feather: {
    id: 'peacock_feather',
    name: 'Peacock Feather',
    category: 'festive',
    svg: () => (
      <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm">
        <path d="M40 110 Q38 60 40 10" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
        {/* Outer Feather Fluff */}
        <path d="M40 15 C10 25 15 65 40 85 C65 65 70 25 40 15 Z" fill="#166534" opacity="0.85" />
        <path d="M40 22 C20 30 22 60 40 75 C58 60 60 30 40 22 Z" fill="#0284C7" />
        <path d="M40 28 C28 34 30 52 40 62 C50 52 52 34 40 28 Z" fill="#EAB308" />
        <ellipse cx="40" cy="42" rx="6" ry="9" fill="#1E1B4B" />
      </svg>
    )
  },

  peacock: {
    id: 'peacock',
    name: 'Peacock',
    category: 'nature',
    svg: () => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        <path d="M30 80 C10 60 10 20 50 20 C90 20 90 60 70 80 Z" fill="#047857" opacity="0.8" />
        <path d="M45 80 C40 50 42 35 50 35 C58 35 60 50 55 80 Z" fill="#0284C7" />
        <circle cx="50" cy="30" r="8" fill="#0369A1" />
        <path d="M50 22 L52 14 M50 22 L47 14 M50 22 L55 16" stroke="#EAB308" strokeWidth="2" />
      </svg>
    )
  },

  cloud: {
    id: 'cloud',
    name: 'Divine Cloud',
    category: 'nature',
    svg: () => (
      <svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm opacity-90">
        <path d="M20 50 C10 50 5 40 15 30 C15 20 30 15 40 22 C50 10 75 10 85 25 C95 20 110 30 105 42 C115 50 105 60 95 60 L20 60 Z" fill="#FFFFFF" opacity="0.9" />
      </svg>
    )
  },

  leaf: {
    id: 'leaf',
    name: 'Mango / Banana Leaf',
    category: 'nature',
    svg: () => (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-xs">
        <path d="M40 5 C65 30 75 75 40 95 C5 75 15 30 40 5 Z" fill="#15803D" />
        <path d="M40 5 V95" stroke="#4ADE80" strokeWidth="2" opacity="0.6" />
        <path d="M40 30 L60 45 M40 50 L65 65 M40 30 L20 45 M40 50 L15 65" stroke="#4ADE80" strokeWidth="1.5" opacity="0.5" />
      </svg>
    )
  },

  flower: {
    id: 'flower',
    name: 'Lotus Flower',
    category: 'nature',
    svg: () => (
      <svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm">
        <path d="M45 10 C55 30 75 40 85 55 C70 70 45 80 45 80 C45 80 20 70 5 55 C15 40 35 30 45 10 Z" fill="#F43F5E" />
        <path d="M45 20 C52 35 68 42 75 55 C62 65 45 72 45 72 C45 72 28 65 15 55 C22 42 38 35 45 20 Z" fill="#FB7185" />
        <path d="M45 32 C49 42 58 48 62 55 C52 62 45 66 45 66 C45 66 38 62 28 55 C32 48 41 42 45 32 Z" fill="#FFE4E6" />
        <circle cx="45" cy="52" r="5" fill="#EAB308" />
      </svg>
    )
  },

  diya: {
    id: 'diya',
    name: 'Glowing Diya Lamp',
    category: 'lighting',
    svg: () => (
      <svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        {/* Flame Glow */}
        <circle cx="45" cy="25" r="18" fill="#FDE047" opacity="0.5" />
        {/* Flame */}
        <path d="M45 10 C52 22 54 32 45 38 C36 32 38 22 45 10 Z" fill="#F97316" />
        <path d="M45 16 C49 24 50 30 45 34 C40 30 41 24 45 16 Z" fill="#FDE047" />
        {/* Diya Base */}
        <path d="M15 45 Q45 35 75 45 L65 72 Q45 82 25 72 Z" fill="#B45309" stroke="#78350F" strokeWidth="2" />
        <path d="M20 48 Q45 42 70 48" stroke="#F59E0B" strokeWidth="2" fill="none" />
      </svg>
    )
  },

  rakhi: {
    id: 'rakhi',
    name: 'Rakhi Thread',
    category: 'festive',
    svg: () => (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm">
        {/* Thread */}
        <path d="M5 50 H95" stroke="#EF4444" strokeWidth="4" strokeDasharray="4 2" />
        {/* Central Dial */}
        <circle cx="50" cy="50" r="22" fill="#EAB308" stroke="#B45309" strokeWidth="2" />
        <circle cx="50" cy="50" r="15" fill="#DC2626" />
        <circle cx="50" cy="50" r="8" fill="#FDE047" />
        {/* Petal beads around */}
        <circle cx="50" cy="24" r="4" fill="#3B82F6" />
        <circle cx="50" cy="76" r="4" fill="#3B82F6" />
        <circle cx="24" cy="50" r="4" fill="#3B82F6" />
        <circle cx="76" cy="50" r="4" fill="#3B82F6" />
      </svg>
    )
  },

  kalash: {
    id: 'kalash',
    name: 'Pooja Kalash',
    category: 'festive',
    svg: () => (
      <svg viewBox="0 0 90 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-md">
        {/* Coconut */}
        <ellipse cx="45" cy="22" rx="14" ry="16" fill="#78350F" />
        {/* Mango Leaves around neck */}
        <path d="M25 35 L45 20 L65 35" stroke="#15803D" strokeWidth="8" strokeLinecap="round" />
        {/* Kalash Pot */}
        <path d="M30 38 H60 L72 65 C72 82 18 82 18 65 Z" fill="#EAB308" stroke="#CA8A04" strokeWidth="2" />
        {/* Swastik / Red Thread */}
        <rect x="25" y="48" width="40" height="4" fill="#DC2626" />
      </svg>
    )
  },

  flute: {
    id: 'flute',
    name: 'Bansuri Flute',
    category: 'festive',
    svg: () => (
      <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm">
        <rect x="10" y="16" width="100" height="10" rx="5" fill="#EAB308" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="30" cy="21" r="2" fill="#78350F" />
        <circle cx="45" cy="21" r="2" fill="#78350F" />
        <circle cx="60" cy="21" r="2" fill="#78350F" />
        <circle cx="75" cy="21" r="2" fill="#78350F" />
        <circle cx="90" cy="21" r="2" fill="#78350F" />
        {/* Tassel */}
        <path d="M100 21 L110 32 M100 21 L112 28" stroke="#DC2626" strokeWidth="2" />
      </svg>
    )
  }
};
