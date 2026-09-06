import React from 'react';
import {
  Apple, Milk, Wheat, IceCream, Candy, Coffee, Utensils,
  Leaf, Home, Headphones, Smartphone, Sparkles, Shirt,
  Gamepad2, Gift, ShoppingBag, Flame, Droplet, Fish, Egg,
  Carrot, Pizza, Cookie, Wine, Package, LayoutGrid, Store,
  Zap, Heart, Shield, HelpCircle, MapPin
} from 'lucide-react';

export const SEMANTIC_ICON_MAP: Record<string, React.ElementType> = {
  // Fruits & Veg
  fruit: Apple,
  fruits: Apple,
  vegetable: Carrot,
  vegetables: Carrot,
  fresh: Leaf,
  organic: Leaf,

  // Dairy & Bakery
  dairy: Milk,
  milk: Milk,
  egg: Egg,
  eggs: Egg,
  bread: Wheat,
  bakery: Wheat,
  atta: Wheat,
  flour: Wheat,
  rice: Wheat,

  // Snacks & Sweets
  snack: Cookie,
  snacks: Cookie,
  sweet: Candy,
  sweets: Candy,
  icecream: IceCream,
  chocolate: Candy,
  munchies: Cookie,
  pizza: Pizza,

  // Beverages & Cafe
  beverage: Coffee,
  beverages: Coffee,
  drink: Wine,
  drinks: Wine,
  tea: Coffee,
  coffee: Coffee,
  cafe: Coffee,

  // Meat & Seafood
  meat: Fish,
  meats: Fish,
  fish: Fish,
  seafood: Fish,
  poultry: Egg,

  // Electronics & Games
  electronic: Smartphone,
  electronics: Smartphone,
  phone: Smartphone,
  headphone: Headphones,
  headphones: Headphones,
  game: Gamepad2,
  gaming: Gamepad2,

  // Home, Fashion & Beauty
  home: Home,
  household: Home,
  beauty: Sparkles,
  grooming: Sparkles,
  fashion: Shirt,
  apparel: Shirt,
  gift: Gift,
  gifts: Gift,

  // Default fallbacks
  all: LayoutGrid,
  default: ShoppingBag,
};

/**
 * Resolves a category string into a semantic Lucide icon component.
 * Fallback is LayoutGrid or ShoppingBag.
 */
export function resolveCategoryIcon(categoryName?: string): React.ElementType {
  if (!categoryName) return SEMANTIC_ICON_MAP.default;

  const normalized = categoryName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  for (const [key, icon] of Object.entries(SEMANTIC_ICON_MAP)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }

  return SEMANTIC_ICON_MAP.default;
}
