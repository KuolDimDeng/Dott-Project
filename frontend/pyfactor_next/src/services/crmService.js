import { apiService } from './apiService';
import { logger } from '@/utils/logger';

/**
 * CRM Service - Handles all API calls related to CRM functionality
 */
export const crmService = {
  /**
   * Fetch CRM dashboard data
   */
  getDashboardData: async () => {
    try {
      const [
        customersResponse, 
        leadsResponse, 
        opportunitiesResponse, 
        dealsResponse,
        upcomingActivitiesResponse,
        overdueActivitiesResponse,
        campaignsResponse
      ] = await Promise.all([
        apiService.get('/crm/dashboard/customers/'),
        apiService.get('/crm/dashboard/leads/'),
        apiService.get('/crm/dashboard/opportunities/'),
        apiService.get('/crm/dashboard/deals/'),
        apiService.get('/crm/activities/upcoming/'),
        apiService.get('/crm/activities/overdue/'),
        apiService.get('/crm/dashboard/campaigns/')
      ]);
      
      return {
        customers: customersResponse.data,
        leads: leadsResponse.data,
        opportunities: opportunitiesResponse.data,
        deals: dealsResponse.data,
        activities: {
          upcoming: upcomingActivitiesResponse.data,
          overdue: overdueActivitiesResponse.data
        },
        campaigns: campaignsResponse.data
      };
    } catch (error) {
      logger.error('Error fetching CRM dashboard data:', error);
      throw error;
    }
  },
  
  /**
   * Contacts
   */
  getContacts: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/contacts/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching contacts:', error);
      throw error;
    }
  },
  
  getContact: async (id) => {
    try {
      const response = await apiService.get(`/crm/contacts/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching contact details:', error);
      throw error;
    }
  },
  
  createContact: async (data) => {
    try {
      const response = await apiService.post('/crm/contacts/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw error;
    }
  },
  
  updateContact: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/contacts/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  },
  
  deleteContact: async (id) => {
    try {
      await apiService.delete(`/crm/contacts/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  },
  
  /**
   * Leads
   */
  getLeads: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/leads/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching leads:', error);
      throw error;
    }
  },
  
  getLead: async (id) => {
    try {
      const response = await apiService.get(`/crm/leads/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching lead details:', error);
      throw error;
    }
  },
  
  createLead: async (data) => {
    try {
      const response = await apiService.post('/crm/leads/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw error;
    }
  },
  
  updateLead: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/leads/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating lead:', error);
      throw error;
    }
  },
  
  deleteLead: async (id) => {
    try {
      await apiService.delete(`/crm/leads/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting lead:', error);
      throw error;
    }
  },
  
  convertLead: async (id) => {
    try {
      const response = await apiService.post(`/crm/leads/${id}/convert/`);
      return response.data;
    } catch (error) {
      logger.error('Error converting lead:', error);
      throw error;
    }
  },
  
  /**
   * Opportunities
   */
  getOpportunities: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/opportunities/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching opportunities:', error);
      throw error;
    }
  },
  
  getOpportunity: async (id) => {
    try {
      const response = await apiService.get(`/crm/opportunities/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching opportunity details:', error);
      throw error;
    }
  },
  
  createOpportunity: async (data) => {
    try {
      const response = await apiService.post('/crm/opportunities/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating opportunity:', error);
      throw error;
    }
  },
  
  updateOpportunity: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/opportunities/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating opportunity:', error);
      throw error;
    }
  },
  
  deleteOpportunity: async (id) => {
    try {
      await apiService.delete(`/crm/opportunities/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting opportunity:', error);
      throw error;
    }
  },
  
  /**
   * Deals
   */
  getDeals: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/deals/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching deals:', error);
      throw error;
    }
  },
  
  getDeal: async (id) => {
    try {
      const response = await apiService.get(`/crm/deals/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching deal details:', error);
      throw error;
    }
  },
  
  createDeal: async (data) => {
    try {
      const response = await apiService.post('/crm/deals/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating deal:', error);
      throw error;
    }
  },
  
  updateDeal: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/deals/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating deal:', error);
      throw error;
    }
  },
  
  deleteDeal: async (id) => {
    try {
      await apiService.delete(`/crm/deals/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting deal:', error);
      throw error;
    }
  },
  
  /**
   * Activities
   */
  getActivities: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/activities/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching activities:', error);
      throw error;
    }
  },
  
  getUpcomingActivities: async () => {
    try {
      const response = await apiService.get('/crm/activities/upcoming/');
      return response.data;
    } catch (error) {
      logger.error('Error fetching upcoming activities:', error);
      throw error;
    }
  },
  
  getOverdueActivities: async () => {
    try {
      const response = await apiService.get('/crm/activities/overdue/');
      return response.data;
    } catch (error) {
      logger.error('Error fetching overdue activities:', error);
      throw error;
    }
  },
  
  getActivity: async (id) => {
    try {
      const response = await apiService.get(`/crm/activities/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching activity details:', error);
      throw error;
    }
  },
  
  createActivity: async (data) => {
    try {
      const response = await apiService.post('/crm/activities/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  },
  
  updateActivity: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/activities/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating activity:', error);
      throw error;
    }
  },
  
  deleteActivity: async (id) => {
    try {
      await apiService.delete(`/crm/activities/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting activity:', error);
      throw error;
    }
  },
  
  /**
   * Campaigns
   */
  getCampaigns: async (params = {}) => {
    try {
      const response = await apiService.get('/crm/campaigns/', { params });
      return response.data;
    } catch (error) {
      logger.error('Error fetching campaigns:', error);
      throw error;
    }
  },
  
  getCampaign: async (id) => {
    try {
      const response = await apiService.get(`/crm/campaigns/${id}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching campaign details:', error);
      throw error;
    }
  },
  
  createCampaign: async (data) => {
    try {
      const response = await apiService.post('/crm/campaigns/', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  },
  
  updateCampaign: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/campaigns/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating campaign:', error);
      throw error;
    }
  },
  
  deleteCampaign: async (id) => {
    try {
      await apiService.delete(`/crm/campaigns/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw error;
    }
  },
  
  /**
   * Campaign Members
   */
  getCampaignMembers: async (campaignId) => {
    try {
      const response = await apiService.get(`/crm/campaigns/${campaignId}/members/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching campaign members:', error);
      throw error;
    }
  },
  
  addCampaignMember: async (data) => {
    try {
      const response = await apiService.post('/crm/campaign-members/', data);
      return response.data;
    } catch (error) {
      logger.error('Error adding campaign member:', error);
      throw error;
    }
  },
  
  updateCampaignMember: async (id, data) => {
    try {
      const response = await apiService.put(`/crm/campaign-members/${id}/`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating campaign member:', error);
      throw error;
    }
  },
  
  deleteCampaignMember: async (id) => {
    try {
      await apiService.delete(`/crm/campaign-members/${id}/`);
      return true;
    } catch (error) {
      logger.error('Error deleting campaign member:', error);
      throw error;
    }
  }
};