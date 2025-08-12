import { logger } from '@/utils/logger';
import api from '@/utils/apiFetch';

class CustomerService {
  async getCustomers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.customer_type) queryParams.append('customer_type', params.customer_type);
      if (params.city) queryParams.append('city', params.city);
      if (params.state) queryParams.append('state', params.state);
      if (params.country) queryParams.append('country', params.country);
      if (params.has_purchases) queryParams.append('has_purchases', params.has_purchases);
      
      const endpoint = `/api/customers?${queryParams}`;
      const response = await api.get(endpoint);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customers:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomer(id) {
    try {
      const response = await api.get(`/api/customers/${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customer:', error);
      return { success: false, error: error.message };
    }
  }

  async createCustomer(customerData) {
    try {
      const response = await api.post('/api/customers', customerData);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const response = await api.put(`/api/customers/${id}`, customerData);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomer(id) {
    try {
      const response = await api.delete(`/api/customers/${id}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CustomerService();
