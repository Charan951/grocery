import mongoose from 'mongoose';

const campaignSubcategorySchema = new mongoose.Schema({
  subcategoryId: { type: String, required: true },
  title: { type: String, required: true },
  image: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  badge: { type: String, default: '' },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
});

const featuredItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalPrice: { type: String, default: '' },
  offerPrice: { type: String, default: '' },
  image: { type: String, default: '' },
  link: { type: String, default: '' }
});

const decorativeElementSchema = new mongoose.Schema({
  id: { type: String },
  asset: { type: String, required: true },
  type: { type: String, default: 'festive' },
  position: {
    x: { type: Number, default: 10 },
    y: { type: Number, default: 10 },
    align: { type: String, default: 'left' }
  },
  size: { type: Number, default: 30 },
  opacity: { type: Number, default: 100 },
  animation: { type: String, default: 'none' }, // 'none' | 'horizontal-move' | 'gentle-sway' | 'glow-flicker' | 'float-vertical' | 'pulse'
  speed: { type: String, default: 'slow' }, // 'slow' | 'medium' | 'fast'
  intensity: { type: String, default: 'low' }
});

const festivalCampaignSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Festival', 'Seasonal', 'Special Event'],
    default: 'Festival'
  },

  // Layered Theme Engine Config
  backgroundType: { type: String, enum: ['solid', 'gradient', 'image'], default: 'solid' },
  backgroundColor: { type: String, default: '#DFF4E8' },
  gradientStart: { type: String, default: '#DFF4E8' },
  gradientEnd: { type: String, default: '#B8E6CB' },
  gradientDirection: { type: String, default: 'to bottom' },
  backgroundImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  backgroundPattern: { type: String, default: 'floral' }, // 'none' | 'floral' | 'mandala' | 'paisley' | 'traditional' | 'dots' | 'festival'
  patternOpacity: { type: Number, default: 0.10 },
  patternScale: { type: String, default: 'medium' },

  // Array of Dynamic Asset Elements
  decorativeElements: [decorativeElementSchema],

  // Title Config
  titleConfig: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    position: { type: String, default: 'center' },
    textColor: { type: String, default: '#1B4D3E' },
    fontStyle: { type: String, default: 'festive' },
    animation: { type: String, default: 'soft-reveal' }
  },

  video: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    posterUrl: { type: String, default: '' }
  },
  featuredBannerTitle: { type: String, default: 'EXPLORE ALL ESSENTIALS' },
  featuredItems: [featuredItemSchema],
  animationConfig: {
    enabled: { type: Boolean, default: true },
    type: { type: String, default: 'auto' },
    intensity: { type: String, default: 'subtle' }
  },
  bottomDecoration: { type: String, default: 'scallop' },
  theme: {
    textColor: { type: String, default: '#1B4D3E' },
    accentColor: { type: String, default: '#2E7D32' },
    cardBackground: { type: String, default: '#FFF9E6' },
    cardTextColor: { type: String, default: '#1B4D3E' },
    overlayOpacity: { type: Number, default: 0.1 },
    backgroundPosition: { type: String, default: 'center top' },
    backgroundSize: { type: String, default: 'cover' },
    cardBorderRadius: { type: String, default: '18px' },
    cardSpacing: { type: String, default: '8px' }
  },
  content: {
    heading: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '' }
  },
  specialSubcategories: [campaignSubcategorySchema],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 1 }
}, { timestamps: true });

export const FestivalCampaign = mongoose.model('FestivalCampaign', festivalCampaignSchema);
