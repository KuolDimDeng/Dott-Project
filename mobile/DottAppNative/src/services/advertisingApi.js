import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

// Create axios instance with default config
const createApiInstance = async () => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    },
  });
};

// Create multipart instance for file uploads
const createMultipartInstance = async () => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    },
  });
};

export const advertisingApi = {
  // Get all campaigns for the current business
  getCampaigns: async (filters = {}) => {
    try {
      const api = await createApiInstance();
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/advertising/campaigns/?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return { success: false, results: [], error: error.message };
    }
  },

  // Get single campaign details
  getCampaignDetail: async (campaignId) => {
    try {
      const api = await createApiInstance();
      const response = await api.get(`/advertising/campaigns/${campaignId}/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching campaign detail:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new campaign
  createCampaign: async (campaignData) => {
    try {
      const api = await createApiInstance();
      
      // Format dates for backend
      const formattedData = {
        ...campaignData,
        start_date: campaignData.start_date.toISOString().split('T')[0],
        end_date: campaignData.end_date.toISOString().split('T')[0],
      };
      
      const response = await api.post('/advertising/campaigns/', formattedData);
      
      // If campaign created successfully, mark business as featured if it's a featured campaign
      if (response.data && campaignData.type === 'featured') {
        await this.updateBusinessFeaturedStatus(true);
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to create campaign',
        error: error.message 
      };
    }
  },

  // Update existing campaign
  updateCampaign: async (campaignId, campaignData) => {
    try {
      const api = await createApiInstance();
      
      // Format dates for backend
      const formattedData = {
        ...campaignData,
        start_date: campaignData.start_date.toISOString().split('T')[0],
        end_date: campaignData.end_date.toISOString().split('T')[0],
      };
      
      const response = await api.patch(`/advertising/campaigns/${campaignId}/`, formattedData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update campaign',
        error: error.message 
      };
    }
  },

  // Upload campaign image to Cloudinary
  uploadCampaignImage: async (formData) => {
    try {
      const api = await createMultipartInstance();
      
      // Add campaign type to help backend organize uploads
      formData.append('upload_type', 'campaign_image');
      formData.append('folder', 'campaigns');
      
      const response = await api.post('/advertising/upload-image/', formData);
      
      if (response.data.success) {
        return {
          success: true,
          url: response.data.url,
          public_id: response.data.public_id,
        };
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading campaign image:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to upload image' 
      };
    }
  },

  // Activate campaign (after payment)
  activateCampaign: async (campaignId, paymentData) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/advertising/campaigns/${campaignId}/activate/`, paymentData);
      
      // Update business featured status if it's a featured campaign
      if (response.data.type === 'featured') {
        await this.updateBusinessFeaturedStatus(true);
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error activating campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to activate campaign',
        error: error.message 
      };
    }
  },

  // Pause campaign
  pauseCampaign: async (campaignId) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/advertising/campaigns/${campaignId}/pause/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error pausing campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to pause campaign',
        error: error.message 
      };
    }
  },

  // Resume campaign
  resumeCampaign: async (campaignId) => {
    try {
      const api = await createApiInstance();
      const response = await api.post(`/advertising/campaigns/${campaignId}/resume/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error resuming campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to resume campaign',
        error: error.message 
      };
    }
  },

  // Delete campaign
  deleteCampaign: async (campaignId) => {
    try {
      const api = await createApiInstance();
      await api.delete(`/advertising/campaigns/${campaignId}/`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to delete campaign',
        error: error.message 
      };
    }
  },

  // Get campaign analytics
  getCampaignAnalytics: async (campaignId) => {
    try {
      const api = await createApiInstance();
      const response = await api.get(`/advertising/campaigns/${campaignId}/analytics/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      return { 
        success: false, 
        error: error.message,
        // Return mock data for development
        data: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          spend: 0,
        }
      };
    }
  },

  // Get overall advertising analytics
  getOverallAnalytics: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/advertising/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching overall analytics:', error);
      // Return mock data for development
      return {
        totalSpend: 0,
        totalBudget: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCTR: 0,
        averageCPC: 0,
        roi: 0,
      };
    }
  },

  // Update business featured status
  updateBusinessFeaturedStatus: async (isFeatured) => {
    try {
      const api = await createApiInstance();
      const response = await api.patch('/marketplace/business/update-featured/', {
        is_featured: isFeatured,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error updating featured status:', error);
      return { success: false, error: error.message };
    }
  },

  // Get featured placement options
  getFeaturedOptions: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/advertising/featured-options/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching featured options:', error);
      // Return default options
      return {
        success: true,
        data: [
          {
            id: 'featured_7',
            name: 'Featured for 7 Days',
            price: 50,
            duration_days: 7,
            benefits: ['Top placement in search', 'Featured badge', 'Priority support'],
          },
          {
            id: 'featured_30',
            name: 'Featured for 30 Days',
            price: 150,
            duration_days: 30,
            benefits: ['Top placement in search', 'Featured badge', 'Priority support', '20% discount'],
          },
        ],
      };
    }
  },

  // Check if business has active featured campaign
  checkFeaturedStatus: async () => {
    try {
      const api = await createApiInstance();
      const response = await api.get('/advertising/featured-status/');
      return { 
        success: true, 
        is_featured: response.data.is_featured,
        expires_at: response.data.expires_at,
      };
    } catch (error) {
      console.error('Error checking featured status:', error);
      return { success: false, is_featured: false };
    }
  },
};

export default advertisingApi;