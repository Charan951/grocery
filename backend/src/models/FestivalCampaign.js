import mongoose from 'mongoose';

const festivalGroupSchema = new mongoose.Schema({
  id: { type: String },
  displayName: { type: String, required: true },
  products: [{ type: String }], // Product IDs
  discountPercent: { type: Number, default: 0 },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const festivalCampaignSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Step 2: Theme & Background
  themeKey: { type: String, default: 'krishna' },
  backgroundType: { type: String, enum: ['predefined', 'solid', 'gradient'], default: 'predefined' },
  backgroundColor: { type: String, default: '#E0F2FE' },
  gradientStart: { type: String, default: '#E0F2FE' },
  gradientEnd: { type: String, default: '#CFFAFE' },
  gradientDirection: { type: String, default: 'to bottom' },

  // Step 2: Banner (Optional)
  enableBanner: { type: Boolean, default: false },
  bannerImage: { type: String, default: '' },
  bannerLink: { type: String, default: '' },

  // Step 3: Festival Product Groups
  festivalGroups: [festivalGroupSchema],

  // Step 4: Styling Tokens
  cardStyling: {
    cardBackground: { type: String, default: '#FFFBEB' },
    cardBorder: { type: String, default: '#BAE6FD' },
    accentColor: { type: String, default: '#FEF08A' },
    buttonColor: { type: String, default: '#0EA5E9' },
    textColor: { type: String, default: '#0C4A6E' }
  },

  // Step 4: Application Scope
  applicableSuperCategories: [{ type: String, default: ['all'] }], // e.g. ['all'] or ['sc_cafe', 'sc_fresh']

  // Status & Metadata
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'published'], default: 'published' }
}, { timestamps: true, strict: false });

export const FestivalCampaign = mongoose.model('FestivalCampaign', festivalCampaignSchema);
