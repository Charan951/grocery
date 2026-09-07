import mongoose from 'mongoose';
import { FestivalCampaign } from '../models/FestivalCampaign.js';

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

  // Get active festival campaign for customer experience
  getActiveCampaign: async (req, res) => {
    try {
      const { superCategory } = req.query;
      const targetSlug = (superCategory || 'all').toLowerCase().trim();

      const activeCampaigns = await FestivalCampaign.find({
        isActive: true,
        status: { $ne: 'draft' }
      }).sort({ updatedAt: -1 });

      if (!activeCampaigns || activeCampaigns.length === 0) {
        return res.json({ success: true, campaign: null, activeCampaigns: [] });
      }

      const now = new Date();
      // Filter out campaigns whose date ranges are expired
      const unexpiredCampaigns = activeCampaigns.filter((camp) => {
        if (!camp.endDate) return true;
        const eDate = new Date(camp.endDate);
        return now <= eDate;
      });

      const validList = unexpiredCampaigns.length > 0 ? unexpiredCampaigns : activeCampaigns;

      let matchedCampaign = validList.find((camp) => {
        const scopes = camp.applicableSuperCategories || ['all'];
        const containsAll = scopes.some((s) => {
          const l = String(s).toLowerCase().trim();
          return l === 'all' || l === 'sc_all' || l === 'all_super_categories';
        });
        if (containsAll) return true;
        if (targetSlug === 'all' || targetSlug === 'sc_all') return true;
        return scopes.some((s) => {
          const l = String(s).toLowerCase().trim();
          return l === targetSlug || l === `sc_${targetSlug}` || (targetSlug.startsWith('sc_') && l === targetSlug.replace('sc_', ''));
        });
      });

      if (!matchedCampaign) {
        matchedCampaign = validList[0];
      }

      res.json({
        success: true,
        campaign: matchedCampaign,
        activeCampaigns: validList
      });
    } catch (err) {
      console.error('Error fetching active festival campaign:', err);
      res.json({ success: true, campaign: null, activeCampaigns: [] });
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
