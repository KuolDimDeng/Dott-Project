/**
 * Advertising API Service
 * Handles all advertising campaign related API calls
 */

import api from './api';

const advertisingApi = {
  // Campaign CRUD operations
  campaigns: {
    /**
     * Get all campaigns for the current business
     * @param {Object} params - Query parameters (status, type)
     */
    list: async (params = {}) => {
      try {
        const response = await api.get('/advertising/campaigns/', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }
    },

    /**
     * Get a specific campaign by ID
     * @param {string} id - Campaign ID
     */
    get: async (id) => {
      try {
        const response = await api.get(`/advertising/campaigns/${id}/`);
        return response.data;
      } catch (error) {
        console.error('Error fetching campaign:', error);
        throw error;
      }
    },

    /**
     * Create a new campaign (FREE - auto-activates and publishes)
     * @param {Object} data - Campaign data
     */
    create: async (data) => {
      try {
        // Set status to active since it's free
        const campaignData = {
          ...data,
          status: 'active',
          auto_publish_to_marketplace: true  // Auto-publish since it's free
        };
        const response = await api.post('/advertising/campaigns/', campaignData);
        return response.data;
      } catch (error) {
        console.error('Error creating campaign:', error);
        throw error;
      }
    },

    /**
     * Update an existing campaign
     * @param {string} id - Campaign ID
     * @param {Object} data - Updated campaign data
     */
    update: async (id, data) => {
      try {
        const response = await api.patch(`/advertising/campaigns/${id}/`, data);
        return response.data;
      } catch (error) {
        console.error('Error updating campaign:', error);
        throw error;
      }
    },

    /**
     * Delete a campaign
     * @param {string} id - Campaign ID
     */
    delete: async (id) => {
      try {
        const response = await api.delete(`/advertising/campaigns/${id}/`);
        return response.data;
      } catch (error) {
        console.error('Error deleting campaign:', error);
        throw error;
      }
    },
  },

  // Campaign actions
  actions: {
    /**
     * Activate a campaign after payment
     * @param {string} id - Campaign ID
     * @param {Object} paymentData - Payment information
     */
    activate: async (id, paymentData = {}) => {
      try {
        const response = await api.post(`/advertising/campaigns/${id}/activate/`, paymentData);
        return response.data;
      } catch (error) {
        console.error('Error activating campaign:', error);
        throw error;
      }
    },

    /**
     * Pause an active campaign
     * @param {string} id - Campaign ID
     */
    pause: async (id) => {
      try {
        const response = await api.post(`/advertising/campaigns/${id}/pause/`);
        return response.data;
      } catch (error) {
        console.error('Error pausing campaign:', error);
        throw error;
      }
    },

    /**
     * Resume a paused campaign
     * @param {string} id - Campaign ID
     */
    resume: async (id) => {
      try {
        const response = await api.post(`/advertising/campaigns/${id}/resume/`);
        return response.data;
      } catch (error) {
        console.error('Error resuming campaign:', error);
        throw error;
      }
    },

    /**
     * Publish campaign to marketplace
     * @param {string} id - Campaign ID
     */
    publishToMarketplace: async (id) => {
      try {
        const response = await api.post(`/advertising/campaigns/${id}/publish_to_marketplace/`);
        return response.data;
      } catch (error) {
        console.error('Error publishing to marketplace:', error);
        throw error;
      }
    },
  },

  // Image management
  images: {
    /**
     * Upload an image to Cloudinary
     * @param {File} file - Image file
     * @param {string} imageType - Type of image (logo, cover, gallery, banner)
     * @param {string} folder - Cloudinary folder (default: campaigns)
     */
    upload: async (file, imageType = 'general', folder = 'campaigns') => {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('image_type', imageType);
        formData.append('folder', folder);

        const response = await api.post('/advertising/campaigns/upload_image/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    },

    /**
     * Update campaign images after upload
     * @param {string} campaignId - Campaign ID
     * @param {string} imageType - Type of image (logo, cover, gallery)
     * @param {string} url - Cloudinary URL
     * @param {string} publicId - Cloudinary public ID
     */
    updateCampaignImage: async (campaignId, imageType, url, publicId) => {
      try {
        const response = await api.post(`/advertising/campaigns/${campaignId}/update_images/`, {
          image_type: imageType,
          url,
          public_id: publicId,
        });
        return response.data;
      } catch (error) {
        console.error('Error updating campaign image:', error);
        throw error;
      }
    },

    /**
     * Remove an image from campaign gallery
     * @param {string} campaignId - Campaign ID
     * @param {string} publicId - Cloudinary public ID to remove
     */
    removeGalleryImage: async (campaignId, publicId) => {
      try {
        const campaign = await advertisingApi.campaigns.get(campaignId);
        const updatedGallery = (campaign.gallery_images || []).filter(
          img => img.public_id !== publicId
        );

        const response = await api.patch(`/advertising/campaigns/${campaignId}/`, {
          gallery_images: updatedGallery,
        });
        return response.data;
      } catch (error) {
        console.error('Error removing gallery image:', error);
        throw error;
      }
    },
  },

  // Analytics
  analytics: {
    /**
     * Get campaign analytics
     * @param {string} id - Campaign ID
     * @param {Object} params - Date range parameters
     */
    getCampaignAnalytics: async (id, params = {}) => {
      try {
        const response = await api.get(`/advertising/campaigns/${id}/analytics/`, { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching campaign analytics:', error);
        throw error;
      }
    },

    /**
     * Get overall advertising analytics
     */
    getOverallAnalytics: async () => {
      try {
        const response = await api.get('/advertising/analytics/');
        return response.data;
      } catch (error) {
        console.error('Error fetching overall analytics:', error);
        throw error;
      }
    },
  },

  // Helper functions
  helpers: {
    /**
     * Calculate campaign cost based on type and duration
     * @param {string} type - Campaign type
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    calculateCost: (type, startDate, endDate) => {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const dailyRates = {
        featured: 10,
        banner: 25,
        spotlight: 15,
        premium: 50,
      };
      const rate = dailyRates[type] || 10;
      return rate * days;
    },

    /**
     * Format campaign data for creation
     * @param {Object} formData - Form data from UI
     */
    formatCampaignData: (formData) => {
      return {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        start_date: formData.startDate,
        end_date: formData.endDate,
        total_budget: formData.budget,
        daily_budget: formData.dailyBudget,
        target_location: formData.targetLocation,
        target_keywords: formData.keywords || [],
        platforms: formData.platforms || ['marketplace'],
        banner_text: formData.bannerText,
        call_to_action: formData.callToAction,
        landing_url: formData.landingUrl,
        auto_publish_to_marketplace: formData.autoPublish !== false,
      };
    },

    /**
     * Validate campaign data before submission
     * @param {Object} data - Campaign data
     * @returns {Object} Validation result
     */
    validateCampaign: (data) => {
      const errors = {};

      if (!data.name) errors.name = 'Campaign name is required';
      if (!data.description) errors.description = 'Description is required';
      if (!data.type) errors.type = 'Campaign type is required';
      if (!data.start_date) errors.start_date = 'Start date is required';
      if (!data.end_date) errors.end_date = 'End date is required';
      if (!data.total_budget || data.total_budget <= 0) {
        errors.total_budget = 'Budget must be greater than 0';
      }

      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (startDate >= endDate) {
        errors.end_date = 'End date must be after start date';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    },
  },
};

export default advertisingApi;