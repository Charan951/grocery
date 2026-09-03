import mongoose from 'mongoose';
import { FestivalCampaign } from '../models/FestivalCampaign.js';

const defaultCampaign = {
  id: 'fc_varalakshmi_1',
  name: 'Varalakshmi Vratham',
  title: 'Celebrate Varalakshmi Vratham',
  subtitle: 'Pooja Flowers, Fresh Fruits, Sweets & Festive Essentials delivered in 10 Mins',
  type: 'Festival',
  backgroundImage: {
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop'
  },
  video: {
    url: '',
    posterUrl: ''
  },
  theme: {
    textColor: '#FFFFFF',
    accentColor: '#F6C453',
    cardBackground: 'rgba(255, 255, 255, 0.18)',
    overlayOpacity: 0.15,
    backgroundPosition: 'center top',
    backgroundSize: 'cover',
    cardBorderRadius: '16px',
    cardSpacing: '12px'
  },
  content: {
    heading: 'Varalakshmi Vratham Essentials',
    subtitle: 'Everything for your divine celebration',
    ctaText: 'Explore Collection',
    ctaLink: '#festival-cards'
  },
  specialSubcategories: [
    {
      subcategoryId: 'Fresh Vegetables',
      title: 'Pooja Essentials',
      image: { url: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop' },
      badge: 'Up to 30% OFF',
      isFeatured: true,
      order: 1
    },
    {
      subcategoryId: 'Fresh Fruits',
      title: 'Naivedyam Essentials',
      image: { url: 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=400&auto=format&fit=crop' },
      badge: 'Fresh Daily',
      isFeatured: false,
      order: 2
    },
    {
      subcategoryId: 'Organics & Hydroponics',
      title: 'Thamboolam Needs',
      image: { url: 'https://images.unsplash.com/photo-1588879460417-af2b369527f5?w=400&auto=format&fit=crop' },
      badge: 'Special Combo',
      isFeatured: false,
      order: 3
    },
    {
      subcategoryId: 'Breads & Buns',
      title: 'Indian Sweets & Ghee',
      image: { url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop' },
      badge: 'Pure Organic',
      isFeatured: false,
      order: 4
    },
    {
      subcategoryId: 'Exotics & Premium',
      title: 'Festive Ready Decor',
      image: { url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop' },
      badge: 'Express 10 Min',
      isFeatured: false,
      order: 5
    }
  ],
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  isActive: true,
  priority: 10
};

// Helper query condition matching either _id or custom string id
const buildIdQuery = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { id: id }] };
  }
  return { id: id };
};

export const festivalCampaignController = {
  // Create a new festival campaign
  createCampaign: async (req, res) => {
    try {
      const campaignData = req.body;
      if (!campaignData.id) {
        campaignData.id = 'fc_' + Date.now();
      }
      const campaign = await FestivalCampaign.create(campaignData);
      res.status(201).json({
        success: true,
        message: 'Festival campaign created successfully',
        campaign
      });
    } catch (err) {
      console.error('Error creating festival campaign:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get all festival campaigns (Admin)
  getCampaigns: async (req, res) => {
    try {
      let campaigns = await FestivalCampaign.find().sort({ priority: -1, createdAt: -1 });
      if (campaigns.length === 0) {
        // Auto seed default campaign if DB empty
        try {
          const seeded = await FestivalCampaign.create(defaultCampaign);
          campaigns = [seeded];
        } catch (e) {
          campaigns = [defaultCampaign];
        }
      }
      res.json({
        success: true,
        campaigns
      });
    } catch (err) {
      console.error('Error fetching festival campaigns:', err);
      res.json({ success: true, campaigns: [defaultCampaign] });
    }
  },

  // Get active festival campaign for customer homepage
  getActiveCampaign: async (req, res) => {
    try {
      const now = new Date();
      let activeCampaign = await FestivalCampaign.findOne({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).sort({ priority: -1, updatedAt: -1 });

      if (!activeCampaign) {
        activeCampaign = await FestivalCampaign.findOne({ isActive: true }).sort({ priority: -1 });
      }

      if (!activeCampaign) {
        const count = await FestivalCampaign.countDocuments();
        if (count === 0) {
          try {
            activeCampaign = await FestivalCampaign.create(defaultCampaign);
          } catch (e) {
            activeCampaign = null;
          }
        }
      }

      const finalCampaign = (activeCampaign && activeCampaign.isActive) ? activeCampaign : null;

      res.json({
        success: true,
        campaign: finalCampaign
      });
    } catch (err) {
      console.error('Error fetching active festival campaign:', err);
      res.json({ success: true, campaign: null });
    }
  },

  // Get single festival campaign by ID
  getCampaignById: async (req, res) => {
    try {
      const query = buildIdQuery(req.params.id);
      let campaign = await FestivalCampaign.findOne(query);
      if (!campaign && req.params.id === 'fc_varalakshmi_1') {
        campaign = defaultCampaign;
      }
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      res.json({ success: true, campaign });
    } catch (err) {
      console.error('Error fetching festival campaign by ID:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Update festival campaign
  updateCampaign: async (req, res) => {
    try {
      const query = buildIdQuery(req.params.id);
      let campaign = await FestivalCampaign.findOneAndUpdate(
        query,
        req.body,
        { new: true, runValidators: true }
      );
      if (!campaign && req.params.id === 'fc_varalakshmi_1') {
        // Create if updating default mock item
        const payload = { ...defaultCampaign, ...req.body, id: 'fc_varalakshmi_1' };
        campaign = await FestivalCampaign.create(payload);
      }
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      res.json({
        success: true,
        message: 'Campaign updated successfully',
        campaign
      });
    } catch (err) {
      console.error('Error updating festival campaign:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Toggle active status
  toggleStatus: async (req, res) => {
    try {
      const query = buildIdQuery(req.params.id);
      let campaign = await FestivalCampaign.findOne(query);
      if (!campaign && req.params.id === 'fc_varalakshmi_1') {
        campaign = await FestivalCampaign.create({
          ...defaultCampaign,
          isActive: req.body.isActive !== undefined ? req.body.isActive : false
        });
      } else if (campaign) {
        campaign.isActive = req.body.isActive !== undefined ? req.body.isActive : !campaign.isActive;
        await campaign.save();
      }

      res.json({
        success: true,
        message: `Campaign ${campaign?.isActive ? 'activated' : 'deactivated'} successfully`,
        campaign: campaign || defaultCampaign
      });
    } catch (err) {
      console.error('Error toggling campaign status:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Delete festival campaign
  deleteCampaign: async (req, res) => {
    try {
      const query = buildIdQuery(req.params.id);
      await FestivalCampaign.findOneAndDelete(query);
      res.json({
        success: true,
        message: 'Festival campaign deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting festival campaign:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
