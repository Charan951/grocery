import mongoose from 'mongoose';
import { FestivalCampaign } from '../models/FestivalCampaign.js';

// Helper query condition matching either _id or custom string id
const buildIdQuery = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { id: id }] };
  }
  return { id: id };
};

// Check if campaign date range & super-category scope overlaps with existing published campaigns
const checkCampaignOverlap = async (startDate, endDate, scopes, excludeId = null) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const query = {
    isActive: true,
    status: { $ne: 'draft' },
    startDate: { $lt: end },
    endDate: { $gt: start }
  };

  if (excludeId) {
    if (mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: excludeId };
    } else {
      query.id = { $ne: excludeId };
    }
  }

  const existingCampaigns = await FestivalCampaign.find(query);

  for (const camp of existingCampaigns) {
    const existingScopes = camp.applicableSuperCategories || ['all'];
    const newScopes = scopes || ['all'];

    const newHasAll = newScopes.includes('all') || newScopes.includes('sc_all');
    const existingHasAll = existingScopes.includes('all') || existingScopes.includes('sc_all');

    if (newHasAll || existingHasAll) {
      return camp;
    }

    const overlapScope = newScopes.some((s) => existingScopes.includes(s));
    if (overlapScope) {
      return camp;
    }
  }
  return null;
};

export const festivalCampaignController = {
  // Create a new festival campaign
  createCampaign: async (req, res) => {
    try {
      const campaignData = req.body;
      if (!campaignData.id) {
        campaignData.id = 'fc_' + Date.now();
      }

      // Overlap validation if publishing active
      if (campaignData.isActive !== false && campaignData.status !== 'draft') {
        const overlap = await checkCampaignOverlap(
          campaignData.startDate,
          campaignData.endDate,
          campaignData.applicableSuperCategories
        );
        if (overlap) {
          return res.status(400).json({
            success: false,
            message: `Campaign overlap conflict: Campaign "${overlap.name}" is already scheduled for overlapping scope and time window.`
          });
        }
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
      const campaigns = await FestivalCampaign.find().sort({ createdAt: -1 });
      res.json({
        success: true,
        campaigns
      });
    } catch (err) {
      console.error('Error fetching festival campaigns:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get active festival campaign for customer experience (Strict Date/Time)
  getActiveCampaign: async (req, res) => {
    try {
      const now = new Date();
      const activeCampaign = await FestivalCampaign.findOne({
        isActive: true,
        status: { $ne: 'draft' },
        startDate: { $lte: now },
        endDate: { $gte: now }
      }).sort({ updatedAt: -1 });

      res.json({
        success: true,
        campaign: activeCampaign || null
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
      const campaign = await FestivalCampaign.findOne(query);
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
      const payload = req.body;

      if (payload.isActive !== false && payload.status !== 'draft' && payload.startDate && payload.endDate) {
        const overlap = await checkCampaignOverlap(
          payload.startDate,
          payload.endDate,
          payload.applicableSuperCategories,
          req.params.id
        );
        if (overlap) {
          return res.status(400).json({
            success: false,
            message: `Campaign overlap conflict: Campaign "${overlap.name}" is already scheduled for overlapping scope and time window.`
          });
        }
      }

      const campaign = await FestivalCampaign.findOneAndUpdate(
        query,
        payload,
        { new: true, runValidators: true }
      );
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
      const campaign = await FestivalCampaign.findOne(query);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      const newIsActive = req.body.isActive !== undefined ? req.body.isActive : !campaign.isActive;

      if (newIsActive && campaign.status !== 'draft') {
        const overlap = await checkCampaignOverlap(
          campaign.startDate,
          campaign.endDate,
          campaign.applicableSuperCategories,
          req.params.id
        );
        if (overlap) {
          return res.status(400).json({
            success: false,
            message: `Cannot activate: Overlaps with active campaign "${overlap.name}".`
          });
        }
      }

      campaign.isActive = newIsActive;
      await campaign.save();

      res.json({
        success: true,
        message: `Campaign ${campaign.isActive ? 'activated' : 'deactivated'} successfully`,
        campaign
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
